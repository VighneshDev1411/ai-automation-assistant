import * as z from 'zod'

export const createKnowledgeBaseSchema = z.object({
  name: z.string()
    .min(2, 'Knowledge base name must be at least 2 characters')
    .max(100, 'Knowledge base name must be less than 100 characters'),
  description: z.string().max(500).optional(),
  embedding_model: z.enum(['text-embedding-ada-002', 'text-embedding-3-small', 'text-embedding-3-large']).default('text-embedding-ada-002'),
  chunk_size: z.number().min(100).max(4000).default(1000),
  chunk_overlap: z.number().min(0).max(500).default(200),
})

export const uploadDocumentSchema = z.object({
  knowledge_base_id: z.string().uuid('Invalid knowledge base ID'),
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) => ['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type),
      'Only PDF, TXT, MD, and DOCX files are supported'
    ),
})

export const searchDocumentsSchema = z.object({
  knowledge_base_id: z.string().uuid('Invalid knowledge base ID'),
  query: z.string().min(1, 'Query is required'),
  match_count: z.number().min(1).max(20).default(5),
  match_threshold: z.number().min(0).max(1).default(0.7),
})