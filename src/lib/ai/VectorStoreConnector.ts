import { createClient } from '@supabase/supabase-js'
import { DocumentChunk, RetrievalResult } from './RAGSystem'
import { tr } from 'zod/v4/locales'


export interface VectorStoreConfig {
  supabaseUrl: string
  supabaseKey: string
  embeddingDimension?: number
}

export class SupabaseVectorStore {
  private supabase
  private emdeddingDimension: number

  constructor(config: VectorStoreConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey)
    this.emdeddingDimension = config.embeddingDimension || 1536

    // Add document chunks with embeddings to the vecotr store
  }
  async addChunks(
    knowledgeBaseId: string,
    chunks: DocumentChunk[]
  ): Promise<void> {
    console.log(
      `Adding ${chunks.length} chunks to knowledge base: ${knowledgeBaseId}`
    )

    try {
      // First ensure the knowledge base exists
      const { data: kb, error: kbError } = await this.supabase
        .from('knowledge_bases')
        .select('id')
        .eq('id', knowledgeBaseId)
        .single()
      if (kbError || !kb) {
        throw new Error(`Knowledge base ${knowledgeBaseId} not found`)
      }

      // Prepare embedding data for insertion

      const embeddingData = chunks.map((chunk: any) => ({
        document_id: chunk.documentId,
        chunk_index: chunk.metadata.chunkIndex,
        content: chunk.content,
        embedding: `[${chunk.embedding?.join(',')}]`, // Convert array to string format
        metadata: {
          ...chunk.metadeta,
          tokens: chunk.metadeta.tokens,
          source: chunk.metadeta.source,
        },
      }))

      // Insert embeddings in batches to avoid size limits

      const batchSize = 100

      for (let i = 0; i < embeddingData.length; i += batchSize) {
        const batch = embeddingData.slice(i, i + batchSize)

        const { error } = await this.supabase.from('embeddings').insert(batch)

        if (error) {
          console.error(`Error inserting batch ${i / batchSize + 1}: `, error)
        }
      }
      console.log(`Successfully added ${chunks.length} chunks to vector store`)
    } catch (error) {
      console.error('Error adding chunks to vector store:', error)
      throw error
    }
  }

  // Perfomr similarity search using vector embeddings

  async similaritySearch(
    knowledgeBaseId: string,
    queryEmbedding: number[],
    topK: number = 5,
    threshold: number = 0.7
  ): Promise<RetrievalResult[]> {
    try {
      console.log(`Performing similarity search in KB: ${knowledgeBaseId}`)

      // Use the supabase function for vector similarity search

      const { data, error } = await this.supabase.rpc(
        'search_similar_documents',
        {
          query_embedding: `[${queryEmbedding.join(',')}]`,
          knowledge_base_id: knowledgeBaseId,
          match_count: topK,
          match_threshold: threshold,
        }
      )

      if (error) {
        console.error('Similarity search error: ', error)
        throw error
      }

      // Transform results to RetrievalResult format

      const results: RetrievalResult[] = data.map((item: any) => ({
        chunk: {
          id: `${item.document_id}_chunk_${item.chunk_index}`,
          documentId: item.document_id,
          content: item.content,
          metadeta: item.metadata || {},
          embedding: undefined, // Don't return embedding in search result
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        score: item.similarity,
        relevance: this.classifyRelevance(item.similarity),
      }))
      console.log(`Found ${results.length} similar chunks`)
      return results
    } catch (error) {
      console.error('Error in similarity search:', error)
      throw error
    }
  }

  // Remove all chunks for a specific document

  async removeDocument(
    knowledgeBaseId: string,
    documentId: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('embeddings')
        .delete()
        .eq('document_id', documentId)

      if (error) {
        console.error('Error removing document: ', error)
        throw error
      }
      console.log(`Removed all chunks ford document: ${documentId}`)
    } catch (error) {
      console.error('Error removing document from vector store:', error)
      throw error
    }
  }
  async getStats(knowledgeBaseId: string): Promise<{
    totalDocuments: number
    totalChunks: number
    averageChunkSize: number
    lastUpdated: Date
  }> {
    try {
      // Get total documents
      const { count: docCount, error: docError } = await this.supabase
        .from('documents')
        .select('id', { count: 'exact' })
        .eq('knowledge_base_id', knowledgeBaseId)

      if (docError) throw docError

      // Get total chunks and average size
      const { data: chunkStats, error: chunkError } = await this.supabase
        .from('embeddings')
        .select('content')
        .in(
          'document_id',
          (
            await this.supabase
              .from('documents')
              .select('id')
              .eq('knowledge_base_id', knowledgeBaseId)
          ).data?.map(doc => doc.id) || []
        )

      if (chunkError) throw chunkError

      const totalChunks = chunkStats?.length || 0
      const averageChunkSize =
        totalChunks > 0
          ? chunkStats.reduce((sum, chunk) => sum + chunk.content.length, 0) /
            totalChunks
          : 0

      // Get last updated
      const { data: lastUpdated, error: updateError } = await this.supabase
        .from('documents')
        .select('updated_at')
        .eq('knowledge_base_id', knowledgeBaseId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (updateError && updateError.code !== 'PGRST116') {
        throw updateError
      }

      return {
        totalDocuments: docCount || 0,
        totalChunks,
        averageChunkSize,
        lastUpdated: lastUpdated
          ? new Date(lastUpdated.updated_at)
          : new Date(),
      }
    } catch (error) {
      console.error('Error getting knowledge base stats:', error)
      throw error
    }
  }

  /**
   * Create a new knowledge base
   */
  async createKnowledgeBase(
    organizationId: string,
    name: string,
    description: string,
    settings: {
      chunkSize: number
      chunkOverlap: number
      embeddingModel: string
    }
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('knowledge_bases')
        .insert({
          organization_id: organizationId,
          name,
          description,
          embedding_model: settings.embeddingModel,
          chunk_size: settings.chunkSize,
          chunk_overlap: settings.chunkOverlap,
        })
        .select('id')
        .single()

      if (error) throw error

      console.log(`Created knowledge base: ${data.id}`)
      return data.id
    } catch (error) {
      console.error('Error creating knowledge base:', error)
      throw error
    }
  }

  /**
   * List all knowledge bases for an organization
   */
  async listKnowledgeBases(organizationId: string) {
    try {
      const { data, error } = await this.supabase
        .from('knowledge_bases')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error listing knowledge bases:', error)
      throw error
    }
  }

  /**
   * Classify relevance based on similarity score
   */
  private classifyRelevance(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.85) return 'high'
    if (score >= 0.75) return 'medium'
    return 'low'
  }
}

// Function to create a instance for vector store
export function createVectorStore(): SupabaseVectorStore {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found in environment variables')
  }

  return new SupabaseVectorStore({
    supabaseUrl,
    supabaseKey,
    embeddingDimension: 1536, // OpenAI ada-002 dimensions
  })
}
