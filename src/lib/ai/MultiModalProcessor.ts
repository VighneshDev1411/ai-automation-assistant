// src/lib/ai/MultiModalProcessor.ts
import OpenAI from 'openai'

export interface MultiModalContent {
  id: string
  type: 'text' | 'image' | 'document' | 'mixed'
  content: string
  imageUrl?: string
  imageData?: string // base64
  metadata: {
    source: string
    processingMethod: 'ocr' | 'vision' | 'hybrid' | 'text_only'
    confidence: number
    extractedElements?: {
      text: string
      images: number
      tables: number
      charts: number
    }
  }
  processedAt: Date
}

export interface ImageAnalysisResult {
  description: string
  extractedText: string
  objects: string[]
  confidence: number
  isDocument: boolean
  hasText: boolean
}

export interface DocumentProcessingOptions {
  includeImages: boolean
  extractTables: boolean
  preserveFormatting: boolean
  useOCR: boolean
  maxImageSize: number
}

export class MultiModalProcessor {
  private openai: OpenAI
  private supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  private supportedDocumentTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key not found for multi-modal processing')
    }
    
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // Only for development
    })
  }

  /**
   * Process an image using OpenAI Vision API
   */
  async processImage(
    imageData: string | File,
    prompt: string = "Describe this image in detail, including any text you can read"
  ): Promise<ImageAnalysisResult> {
    try {
      let base64Image: string
      
      if (imageData instanceof File) {
        base64Image = await this.fileToBase64(imageData)
      } else {
        base64Image = imageData
      }

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Use GPT-4 Vision
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      })

      const description = response.choices[0]?.message?.content || ""
      
      // Extract structured information
      const extractedText = this.extractTextFromDescription(description)
      const objects = this.extractObjectsFromDescription(description)
      const isDocument = description.toLowerCase().includes('document') || 
                        description.toLowerCase().includes('text') ||
                        extractedText.length > 10
      
      return {
        description,
        extractedText,
        objects,
        confidence: 0.85, // Vision API is generally reliable
        isDocument,
        hasText: extractedText.length > 0
      }
    } catch (error) {
      console.error('Image processing error:', error)
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Process a document with multi-modal capabilities
   */
  async processDocument(
    file: File,
    options: DocumentProcessingOptions = {
      includeImages: true,
      extractTables: true,
      preserveFormatting: true,
      useOCR: false,
      maxImageSize: 1024 * 1024 * 5 // 5MB
    }
  ): Promise<MultiModalContent> {
    try {
      const fileType = file.type
      
      if (this.supportedImageTypes.includes(fileType)) {
        return await this.processImageFile(file, options)
      }
      
      if (this.supportedDocumentTypes.includes(fileType)) {
        return await this.processDocumentFile(file, options)
      }
      
      throw new Error(`Unsupported file type: ${fileType}`)
    } catch (error) {
      console.error('Document processing error:', error)
      throw error
    }
  }

  /**
   * Create multi-modal embeddings that include both text and image context
   */
  async createMultiModalEmbedding(content: MultiModalContent): Promise<number[]> {
    try {
      // Combine text content with image descriptions for richer embeddings
      let combinedText = content.content
      
      if (content.type === 'image' || content.type === 'mixed') {
        // Add image context to text for embedding
        combinedText += `\n\nImage context: ${content.metadata.extractedElements?.text || 'Visual content present'}`
      }
      
      // Use OpenAI embeddings API
      const response = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: combinedText
      })
      
      return response.data[0].embedding
    } catch (error) {
      console.error('Multi-modal embedding error:', error)
      throw error
    }
  }

  /**
   * Enhanced search that includes image content
   */
  async searchMultiModal(
    query: string,
    knowledgeBaseId: string,
    options: {
      includeImages: boolean
      includeDocuments: boolean
      topK: number
      threshold: number
    } = {
      includeImages: true,
      includeDocuments: true,
      topK: 5,
      threshold: 0.7
    }
  ): Promise<any[]> {
    // This would integrate with your existing RAG system
    // but include multi-modal content in search results
    
    try {
      // Enhanced query that considers visual context
      const enhancedQuery = options.includeImages 
        ? `${query} (including visual content and images)`
        : query
      
      // Use your existing RAG system but with multi-modal awareness
      const { createRAGSystem } = await import('./RAGSystem')
      const ragSystem = createRAGSystem()
      
      const results = await ragSystem.query(knowledgeBaseId, {
        query: enhancedQuery,
        topK: options.topK,
        threshold: options.threshold
      })
      
      return results.sources
    } catch (error) {
      console.error('Multi-modal search error:', error)
      throw error
    }
  }

  // Private helper methods
  private async processImageFile(file: File, options: DocumentProcessingOptions): Promise<MultiModalContent> {
    const analysis = await this.processImage(file)
    
    return {
      id: crypto.randomUUID(),
      type: 'image',
      content: analysis.description + (analysis.extractedText ? `\n\nExtracted text: ${analysis.extractedText}` : ''),
      imageData: await this.fileToBase64(file),
      metadata: {
        source: file.name,
        processingMethod: 'vision',
        confidence: analysis.confidence,
        extractedElements: {
          text: analysis.extractedText,
          images: 1,
          tables: 0,
          charts: analysis.objects.includes('chart') ? 1 : 0
        }
      },
      processedAt: new Date()
    }
  }

  private async processDocumentFile(file: File, options: DocumentProcessingOptions): Promise<MultiModalContent> {
    // For now, this is a simplified version
    // In production, you'd use libraries like pdf-parse, mammoth, etc.
    
    let textContent = ''
    
    if (file.type === 'application/pdf') {
      textContent = await this.extractPDFText(file)
    } else if (file.type.includes('wordprocessingml')) {
      textContent = await this.extractDocxText(file)
    }
    
    return {
      id: crypto.randomUUID(),
      type: 'document',
      content: textContent,
      metadata: {
        source: file.name,
        processingMethod: 'text_only',
        confidence: 0.9,
        extractedElements: {
          text: textContent,
          images: 0, // Would detect with proper PDF parsing
          tables: 0, // Would detect with proper parsing
          charts: 0
        }
      },
      processedAt: new Date()
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  private extractTextFromDescription(description: string): string {
    // Simple text extraction from image description
    const textRegex = /"([^"]+)"/g
    const matches = description.match(textRegex)
    return matches ? matches.join(' ').replace(/"/g, '') : ''
  }

  private extractObjectsFromDescription(description: string): string[] {
    // Simple object extraction
    const commonObjects = ['person', 'car', 'building', 'text', 'chart', 'table', 'logo', 'document']
    return commonObjects.filter(obj => 
      description.toLowerCase().includes(obj)
    )
  }

  private async extractPDFText(file: File): Promise<string> {
    // Placeholder - in production use pdf-parse or similar
    return `PDF content from ${file.name} - implement with pdf-parse library`
  }

  private async extractDocxText(file: File): Promise<string> {
    // Placeholder - in production use mammoth or similar
    return `DOCX content from ${file.name} - implement with mammoth library`
  }
}

// Export singleton instance
export const multiModalProcessor = new MultiModalProcessor()

// Export factory function
export function createMultiModalProcessor(): MultiModalProcessor {
  return new MultiModalProcessor()
}