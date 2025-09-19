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
  async createDocumentRecord(
    knowledgeBaseId: string,
    documentId: string,
    filename: string,
    metadata: any
  ): Promise<void> {
    const { error } = await this.supabase.from('documents').insert({
      id: documentId,
      knowledge_base_id: knowledgeBaseId,
      uploaded_by: '11111111-1111-1111-1111-111111111111', // Use same test UUID
      filename,
      content_type: 'text/plain',
      file_size_bytes: 0,
      processed: true,
      metadata,
    })

    if (error) {
      console.error('Error creating document record:', error)
      throw error
    }
  }
  async addChunks(
    knowledgeBaseId: string,
    chunks: DocumentChunk[]
  ): Promise<void> {
    console.log(
      `Adding ${chunks.length} chunks to knowledge base: ${knowledgeBaseId}`
    )

    try {
      // Prepare embedding data for insertion
      const embeddingData = chunks.map(chunk => ({
        document_id: chunk.documentId,
        chunk_index: chunk.metadeta.chunkIndex,
        content: chunk.content,
        embedding: chunk.embedding, // Keep as array, don't convert to string
        metadata: {
          source: chunk.metadeta.source,
          tokens: chunk.metadeta.tokens,
          chunkIndex: chunk.metadeta.chunkIndex,
        },
      }))

      // Insert embeddings in smaller batches
      const batchSize = 10 // Reduced batch size
      for (let i = 0; i < embeddingData.length; i += batchSize) {
        const batch = embeddingData.slice(i, i + batchSize)

        console.log(
          `Inserting batch ${Math.floor(i / batchSize) + 1}, items: ${batch.length}`
        )

        const { error } = await this.supabase.from('embeddings').insert(batch)

        if (error) {
          console.error(
            `Batch ${Math.floor(i / batchSize) + 1} error details:`,
            {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
            }
          )
          throw error
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
      console.log('Testing Supabase connection...')

      // Test basic connection first
      const { data: testData, error: testError } = await this.supabase
        .from('knowledge_bases')
        .select('count')
        .limit(1)

      console.log('Connection test result:', { testData, testError })

      if (testError) {
        console.error('Connection failed:', testError)
        throw new Error(`Connection failed: ${testError.message}`)
      }

      console.log('Connection OK, attempting insert...')

      const insertData = {
        // organization_id: crypto.randomUUID(),
        organization_id: '11111111-1111-1111-1111-111111111111',
        name,
        description,
        embedding_model: settings.embeddingModel,
        chunk_size: settings.chunkSize,
        chunk_overlap: settings.chunkOverlap,
      }

      console.log('Insert data:', insertData)

      const { data, error } = await this.supabase
        .from('knowledge_bases')
        .insert(insertData)
        .select('id')
        .single()

      console.log('Insert result - data:', data, 'error:', error)
      console.log('Error type:', typeof error)
      console.log('Error keys:', error ? Object.keys(error) : 'no error')

      if (error) {
        console.error('Insert error details:', JSON.stringify(error, null, 2))
        throw new Error(`Insert failed: ${JSON.stringify(error)}`)
      }

      if (!data) {
        throw new Error('No data returned from insert')
      }

      return data.id
    } catch (error) {
      console.error('Full error object:', error)
      console.error('Error stringified:', JSON.stringify(error, null, 2))
      throw error
    }
  }

  // Add this helper method to the class
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

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
