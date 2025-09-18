// src/lib/ai/RAGSystem.ts - UPDATED VERSION
import OpenAI from 'openai'
import { SupabaseVectorStore, createVectorStore } from './VectorStoreConnector'
import { OpenAIEmbeddingService, createEmbeddingService } from './EmbeddingService'
import { th } from 'date-fns/locale'

export interface DocumentChunk {
  id: string
  documentId: string
  content: string
  metadeta: {
    page?: number
    section?: string
    title?: string
    source: string
    chunkIndex: number
    tokens: number
    startChar?: number
    endChar?: number
  }
  embedding?: number[]
  createdAt: Date
  updatedAt: Date
}

export interface RetrievalResult {
  chunk: DocumentChunk
  score: number
  relevance: 'high' | 'medium' | 'low'
}

export interface RAGQuery {
  query: string
  topK: number
  threshold?: number
  filters?: {
    documentIds?: string[]
    sources?: string[]
    dateRange?: {
      start: Date
      end: Date
    }
  }
  includeMetadata?: boolean
}

export interface RAGResponse {
  query: string
  answer: string
  sources: RetrievalResult[]
  confidence: number
  processingTime: number
  tokensUsed: number
  metadata: {
    model: string
    retrievalMethod: string
    chunksRetrieved: number
  }
}

export interface KnowledgeBase {
  id: string
  name: string
  description: string
  organizationId: string
  settings: {
    chunkSize: number
    chunkOverlap: number
    embeddingModel: string
    retrievalMethod: 'similarity' | 'mmr' | 'hybrid'
  }
  statistics: {
    totalDocuments: number
    totalChunks: number
    lastUpdated: Date
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class RAGSystem {
  private vectorStore: SupabaseVectorStore
  private embeddingService: OpenAIEmbeddingService
  private openai: OpenAI
  private chunkSize: number
  private chunkOverlap: number

  constructor(config?: {
    chunkSize?: number
    chunkOverlap?: number
  }) {
    this.vectorStore = createVectorStore()
    this.embeddingService = createEmbeddingService()
    this.chunkSize = config?.chunkSize || 1000
    this.chunkOverlap = config?.chunkOverlap || 200

    // Initialize OpenAI for answer generation
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key not found')
    }
    this.openai = new OpenAI({ apiKey })
  }

  /**
   * Add documents to the knowledge base with full processing pipeline
   */
  async addDocuments(
    knowledgeBaseId: string,
    documents: Array<{
      id: string
      content: string
      metadata: Record<string, any>
    }>
  ): Promise<void> {
    console.log(`Adding ${documents.length} documents to knowledge base: ${knowledgeBaseId}`)
    
    for (const doc of documents) {
      try {
        // Step 1: Chunk the document
        const chunks = await this.chunkDocument(doc.content, doc.metadata)
        console.log(`Document ${doc.id} split into ${chunks.length} chunks`)

        // Step 2: Generate embeddings for each chunk
        const chunksWithEmbeddings = await Promise.all(
          chunks.map(async (chunk, index) => {
            const embedding = await this.embeddingService.generateEmbedding(chunk.content)

            const documentChunk: DocumentChunk = {
              id: `${doc.id}_chunk_${index}`,
              documentId: doc.id,
              content: chunk.content,
              metadeta: {
                ...chunk.metadata,
                chunkIndex: index,
                tokens: this.embeddingService.estimateTokens(chunk.content),
                source: doc.metadata.source || doc.id
              },
              embedding,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            return documentChunk
          })
        )

        // Step 3: Store in vector database
        await this.vectorStore.addChunks(knowledgeBaseId, chunksWithEmbeddings)
        console.log(`Successfully processed document ${doc.id}: ${chunksWithEmbeddings.length} chunks`)
        
      } catch (error) {
        console.error(`Error processing document ${doc.id}:`, error)
        throw error
      }
    }
  }

  /**
   * Query the knowledge base using RAG
   */
  async query(
    knowledgeBaseId: string,
    ragQuery: RAGQuery,
    agentModel: string = 'gpt-4-turbo-preview'
  ): Promise<RAGResponse> {
    const startTime = Date.now()
    console.log(`RAG query "${ragQuery.query}" in KB: ${knowledgeBaseId}`)

    try {
      // Step 1: Retrieve relevant chunks
      const retrievalResults = await this.retrieveRelevantChunks(
        knowledgeBaseId,
        ragQuery
      )

      if (retrievalResults.length === 0) {
        return {
          query: ragQuery.query,
          answer: "I couldn't find relevant information in the knowledge base to answer your question.",
          sources: [],
          confidence: 0,
          processingTime: Date.now() - startTime,
          tokensUsed: 0,
          metadata: {
            model: agentModel,
            retrievalMethod: 'similarity',
            chunksRetrieved: 0,
          },
        }
      }

      // Step 2: Generate answer using retrieved context
      const answer = await this.generateAnswer(
        ragQuery.query,
        retrievalResults,
        agentModel
      )

      const processingTime = Date.now() - startTime
      console.log(`RAG query completed in ${processingTime}ms`)

      return {
        query: ragQuery.query,
        answer: answer.content,
        sources: retrievalResults,
        confidence: answer.confidence,
        processingTime,
        tokensUsed: answer.tokensUsed,
        metadata: {
          model: agentModel,
          retrievalMethod: ragQuery.filters ? 'hybrid' : 'similarity',
          chunksRetrieved: retrievalResults.length,
        },
      }
    } catch (error) {
      console.error(`RAG query failed:`, error)
      throw new Error(
        `RAG query failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Update existing document
   */
  async updateDocument(
    knowledgeBaseId: string,
    documentId: string,
    newContent: string,
    metadata: Record<string, any>
  ): Promise<void> {
    console.log(`Updating document: ${documentId}`)

    // Remove old chunks
    await this.vectorStore.removeDocument(knowledgeBaseId, documentId)

    // Add new chunks
    await this.addDocuments(knowledgeBaseId, [
      {
        id: documentId,
        content: newContent,
        metadata,
      },
    ])

    console.log(`Document updated: ${documentId}`)
  }

  /**
   * Remove document from knowledge base
   */
  async removeDocument(
    knowledgeBaseId: string,
    documentId: string
  ): Promise<void> {
    console.log(`Removing document: ${documentId}`)
    await this.vectorStore.removeDocument(knowledgeBaseId, documentId)
    console.log(`Document removed: ${documentId}`)
  }

  /**
   * Get knowledge base statistics
   */
  async getKnowledgeBaseStats(knowledgeBaseId: string) {
    return await this.vectorStore.getStats(knowledgeBaseId)
  }

  /**
   * Perform similarity search
   */
  async similaritySearch(
    knowledgeBaseId: string,
    query: string,
    topK: number = 5,
    threshold: number = 0.7
  ): Promise<RetrievalResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query)
    return await this.vectorStore.similaritySearch(
      knowledgeBaseId,
      queryEmbedding,
      topK,
      threshold
    )
  }

  /**
   * Create new knowledge base
   */
  async createKnowledgeBase(
    organizationId: string,
    name: string,
    description: string,
    settings?: {
      chunkSize?: number
      chunkOverlap?: number
      embeddingModel?: string
    }
  ): Promise<string> {
    return await this.vectorStore.createKnowledgeBase(
      organizationId,
      name,
      description,
      {
        chunkSize: settings?.chunkSize || this.chunkSize,
        chunkOverlap: settings?.chunkOverlap || this.chunkOverlap,
        embeddingModel: settings?.embeddingModel || 'text-embedding-ada-002'
      }
    )
  }

  // Private methods

  private async chunkDocument(
    content: string,
    metadata: Record<string, any>
  ): Promise<Array<{ content: string; metadata: Record<string, any> }>> {
    const chunks: Array<{ content: string; metadata: Record<string, any> }> = []
    const paragraphs = content
      .split(/\n\s*\n/)
      .filter((p: any) => p.trim().length > 0)

    let currentChunk = ''
    let chunkIndex = 0

    for (const paragraph of paragraphs) {
      if (
        currentChunk.length + paragraph.length > this.chunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            ...metadata,
            chunkIndex,
            startChar: chunks.length === 0 ? 0 : chunks[chunks.length - 1].metadata.endChar - this.chunkOverlap,
            endChar: currentChunk.length
          },
        })

        const overlapText = this.getOverlapText(currentChunk, this.chunkOverlap)
        currentChunk = overlapText + paragraph
        chunkIndex++
      } else {
        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          ...metadata,
          chunkIndex,
          startChar: chunks.length === 0 ? 0 : chunks[chunks.length - 1].metadata.endChar - this.chunkOverlap,
          endChar: content.length,
        },
      })
    }

    return chunks
  }

  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) return text
    const overlapText = text.slice(-overlapSize)
    const lastSentence = overlapText.lastIndexOf('. ')
    if (lastSentence > overlapSize * 0.5) {
      return overlapText.slice(lastSentence + 2)
    }
    return overlapText
  }

  private async retrieveRelevantChunks(
    knowledgeBaseId: string,
    ragQuery: RAGQuery
  ): Promise<RetrievalResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(ragQuery.query)

    let results = await this.vectorStore.similaritySearch(
      knowledgeBaseId,
      queryEmbedding,
      ragQuery.topK,
      ragQuery.threshold || 0.7
    )

    if (ragQuery.filters) {
      results = this.applyFilters(results, ragQuery.filters)
    }

    return results
  }

  private applyFilters(
    results: RetrievalResult[],
    filters: NonNullable<RAGQuery['filters']>
  ): RetrievalResult[] {
    return results.filter(result => {
      if (filters.documentIds && filters.documentIds.length > 0) {
        if (!filters.documentIds.includes(result.chunk.documentId)) {
          return false
        }
      }

      if (filters.sources && filters.sources.length > 0) {
        if (!filters.sources.includes(result.chunk.metadeta.source)) {
          return false
        }
      }

      return true
    })
  }

  private async generateAnswer(
    query: string,
    retrievalResults: RetrievalResult[],
    model: string
  ): Promise<{
    content: string
    confidence: number
    tokensUsed: number
  }> {
    const context = retrievalResults
      .map(result => `Source: ${result.chunk.metadeta.source}\nContent: ${result.chunk.content}`)
      .join('\n\n---\n\n')

    const prompt = `Based on the following context, please answer the question. If the context doesn't contain enough information to answer the question, please say so.

Context:
${context}

Question: ${query}

Answer:`

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that answers questions based on provided context. Be accurate and cite your sources when possible.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })

      const answer = response.choices[0]?.message?.content || 'No answer generated'
      const tokensUsed = response.usage?.total_tokens || 0

      // Calculate confidence based on retrieval scores
      const avgScore = retrievalResults.reduce((sum, r) => sum + r.score, 0) / retrievalResults.length
      const confidence = Math.min(avgScore * 100, 95) // Cap at 95%

      return {
        content: answer,
        confidence,
        tokensUsed
      }
    } catch (error) {
      console.error('Error generating answer:', error)
      throw error
    }
  }
}



// Export factory function
export function createRAGSystem(config?: {
  chunkSize?: number
  chunkOverlap?: number
}): RAGSystem {
  return new RAGSystem(config)
}