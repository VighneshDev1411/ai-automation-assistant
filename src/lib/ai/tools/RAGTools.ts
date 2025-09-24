// src/lib/ai/tools/RAGTools.ts
import { ToolDefinition } from '../FunctionCallingSystem'
import { createRAGSystem } from '../RAGSystem'
import { createVectorStore } from '../VectorStoreConnector'

/**
 * RAG Tools - Integration between Function Calling and RAG System
 */

export const searchKnowledgeBase: ToolDefinition = {
  name: 'search_knowledge_base',
  description: 'Search through knowledge bases using RAG. If no knowledge_base_id provided, uses the first available knowledge base.',
  parameters: {
    query: {
      name: 'query',
      type: 'string',
      description: 'Search query or question',
      required: true
    },
    knowledge_base_id: {
      name: 'knowledge_base_id',
      type: 'string',
      description: 'ID of the knowledge base to search (optional - will auto-detect if not provided)',
      required: false
    },
    top_k: {
      name: 'top_k',
      type: 'number',
      description: 'Number of relevant chunks to retrieve (default: 5)',
      required: false
    },
    threshold: {
      name: 'threshold',
      type: 'number',
      description: 'Similarity threshold (0-1, default: 0.7)',
      required: false
    }
  },
  category: 'data',
  enabled: true,
  timeout: 15000,
  handler: async (params) => {
    const { query, knowledge_base_id, top_k = 5, threshold = 0.7 } = params
    
    try {
      let kbId = knowledge_base_id
      
      // If no KB ID provided, find the first available one
      if (!kbId) {
        const vectorStore = createVectorStore()
        const kbs = await vectorStore.listKnowledgeBases('default-org')
        
        if (!kbs || kbs.length === 0) {
          return {
            success: false,
            error: 'No knowledge bases found',
            message: 'Please create a knowledge base and upload some documents first.',
            available_knowledge_bases: []
          }
        }
        
        kbId = kbs[0].id
        console.log(`Auto-selected knowledge base: ${kbId} from org: default-org`)
      }
      
      const ragSystem = createRAGSystem()
      const result = await ragSystem.query(kbId, {
        query,
        topK: top_k,
        threshold
      })
      
      return {
        success: true,
        knowledge_base_id: kbId,
        answer: result.answer,
        sources: result.sources.map(source => ({
          content: source.chunk.content.substring(0, 300) + '...',
          score: source.score,
          relevance: source.relevance,
          source: source.chunk.metadeta.source
        })),
        confidence: result.confidence,
        chunks_retrieved: result.sources.length,
        processing_time: result.processingTime
      }
    } catch (error) {
      console.error('Knowledge base search error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Search failed. This might mean no documents are uploaded to the knowledge base.',
        query: query
      }
    }
  }
}

export const addDocumentToKB: ToolDefinition = {
  name: 'add_document_to_kb',
  description: 'Add a document to a knowledge base for future retrieval',
  parameters: {
    knowledge_base_id: {
      name: 'knowledge_base_id',
      type: 'string',
      description: 'ID of the knowledge base (optional - will use first available if not provided)',
      required: false
    },
    document_id: {
      name: 'document_id',
      type: 'string',
      description: 'Unique identifier for the document',
      required: true
    },
    content: {
      name: 'content',
      type: 'string',
      description: 'Document content to add',
      required: true
    },
    metadata: {
      name: 'metadata',
      type: 'object',
      description: 'Additional metadata for the document',
      required: false
    }
  },
  category: 'data',
  enabled: true,
  timeout: 30000,
  handler: async (params) => {
    const { knowledge_base_id, document_id, content, metadata = {} } = params
    
    try {
      let kbId = knowledge_base_id
      
      // If no KB ID provided, find the first available one
      if (!kbId) {
        const vectorStore = createVectorStore()
        const kbs = await vectorStore.listKnowledgeBases('default-org')
        
        if (!kbs || kbs.length === 0) {
          return {
            success: false,
            error: 'No knowledge bases found',
            message: 'Please create a knowledge base first.'
          }
        }
        
        kbId = kbs[0].id
      }
      
      const ragSystem = createRAGSystem()
      
      await ragSystem.addDocuments(kbId, [{
        id: document_id,
        content,
        metadata: {
          source: metadata.source || document_id,
          addedBy: 'ai-agent',
          addedAt: new Date().toISOString(),
          ...metadata
        }
      }])
      
      return {
        success: true,
        document_id,
        knowledge_base_id: kbId,
        message: `Document successfully added to knowledge base`,
        chunks_created: Math.ceil(content.length / 1000), // Estimate
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to add document: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

export const getKnowledgeBaseStats: ToolDefinition = {
  name: 'get_kb_stats',
  description: 'Get statistics and information about a knowledge base',
  parameters: {
    knowledge_base_id: {
      name: 'knowledge_base_id',
      type: 'string',
      description: 'ID of the knowledge base (optional - will use first available if not provided)',
      required: false
    }
  },
  category: 'data',
  enabled: true,
  timeout: 10000,
  handler: async (params) => {
    const { knowledge_base_id } = params
    
    try {
      let kbId = knowledge_base_id
      
      // If no KB ID provided, find the first available one
      if (!kbId) {
        const vectorStore = createVectorStore()
        const kbs = await vectorStore.listKnowledgeBases('default-org')
        
        if (!kbs || kbs.length === 0) {
          return {
            success: false,
            error: 'No knowledge bases found',
            available_knowledge_bases: []
          }
        }
        
        kbId = kbs[0].id
      }
      
      const ragSystem = createRAGSystem()
      const vectorStore = createVectorStore()
      
      const stats = await ragSystem.getKnowledgeBaseStats(kbId)
      
      return {
        success: true,
        knowledge_base_id: kbId,
        statistics: {
          total_documents: stats.totalDocuments,
          total_chunks: stats.totalChunks,
          average_chunk_size: Math.round(stats.averageChunkSize),
          last_updated: stats.lastUpdated
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get KB stats: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

// export const listKnowledgeBaseContent: ToolDefinition = {
//   name: 'list_kb_content',
//   description: 'List documents and sample content in the knowledge base',
//   parameters: {
//     knowledge_base_id: {
//       name: 'knowledge_base_id',
//       type: 'string',
//       description: 'ID of the knowledge base (optional)',
//       required: false
//     }
//   },
//   category: 'data',
//   enabled: true,
//   handler: async (params) => {
//     try {
//       const vectorStore = createVectorStore()
//       let kbId = params.knowledge_base_id
      
//       if (!kbId) {
//         const kbs = await vectorStore.listKnowledgeBases('default-org')
//         if (kbs && kbs.length > 0) {
//           kbId = kbs[0].id
//         } else {
//           return { 
//             success: false,
//             error: 'No knowledge bases found' 
//           }
//         }
//       }
      
//       // Get some sample chunks to see what content exists
//       const { data, error } = await vectorStore.supabase
//         .from('embeddings')
//         .select('content, metadata')
//         .in('document_id', 
//           (await vectorStore.supabase
//             .from('documents')
//             .select('id')
//             .eq('knowledge_base_id', kbId)
//           ).data?.map(doc => doc.id) || []
//         )
//         .limit(5)
      
//       if (error) throw error
      
//       return {
//         success: true,
//         knowledge_base_id: kbId,
//         sample_content: data?.map(item => ({
//           content_preview: item.content.substring(0, 200) + '...',
//           source: item.metadata?.source || 'Unknown'
//         })) || [],
//         total_chunks_sampled: data?.length || 0
//       }
//     } catch (error) {
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : String(error)
//       }
//     }
//   }
// }

// Export all RAG tools
export const RAG_TOOLS: ToolDefinition[] = [
  searchKnowledgeBase,
  addDocumentToKB,
  getKnowledgeBaseStats,
//   listKnowledgeBaseContent
]