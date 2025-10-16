// src/lib/ai/EmbeddingService.ts
import OpenAI from 'openai'


export interface EmbeddingConfig {
  apiKey: string
  model?: string
  maxTokens?: number
}

export class OpenAIEmbeddingService {
  private openai: OpenAI
  private model: string
  private maxTokens: number

  constructor(config: EmbeddingConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true
    })
    this.model = config.model || 'text-embedding-ada-002'
    this.maxTokens = config.maxTokens || 8191 // Ada-002 token limit
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Truncate text if it exceeds token limit
      const truncatedText = this.truncateText(text, this.maxTokens)

      console.log(`Generating embedding for text: ${truncatedText.slice(0, 100)}...`)

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: truncatedText
      })

      if (!response.data || response.data.length === 0) {
        throw new Error('No embedding data received from OpenAI')
      }

      const embedding = response.data[0].embedding
      console.log(`Generated embedding with ${embedding.length} dimensions`)

      return embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw error
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // Truncate all texts
      const truncatedTexts = texts.map(text => 
        this.truncateText(text, this.maxTokens)
      )

      console.log(`Generating embeddings for ${texts.length} texts`)

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: truncatedTexts
      })

      if (!response.data || response.data.length !== texts.length) {
        throw new Error('Mismatch between input and output embedding count')
      }

      const embeddings = response.data.map(item => item.embedding)
      console.log(`Generated ${embeddings.length} embeddings`)

      return embeddings
    } catch (error) {
      console.error('Error generating batch embeddings:', error)
      throw error
    }
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4)
  }

  /**
   * Truncate text to fit within token limits
   */
  private truncateText(text: string, maxTokens: number): string {
    const estimatedTokens = this.estimateTokens(text)
    
    if (estimatedTokens <= maxTokens) {
      return text
    }

    // Truncate to approximate character count, leaving some buffer
    const maxChars = Math.floor(maxTokens * 3.5) // Conservative estimate
    let truncated = text.slice(0, maxChars)

    // Try to truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ')
    if (lastSpace > maxChars * 0.9) {
      truncated = truncated.slice(0, lastSpace)
    }

    console.log(`Truncated text from ${text.length} to ${truncated.length} characters`)
    return truncated
  }

  /**
   * Get embedding model information
   */
  getModelInfo(): {
    model: string
    dimensions: number
    maxTokens: number
  } {
    return {
      model: this.model,
      dimensions: 1536, // Ada-002 dimensions
      maxTokens: this.maxTokens
    }
  }
}

// Factory function to create embedding service
export function createEmbeddingService(): OpenAIEmbeddingService {
  // Check both server-side and client-side environment variables
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OpenAI API key not found in environment variables')
  }

  return new OpenAIEmbeddingService({
    apiKey,
    model: 'text-embedding-ada-002',
    maxTokens: 8191
  })
}
// Alternative embedding services for future expansion
export class AnthropicEmbeddingService {
  // Placeholder for when Anthropic releases embedding models
  constructor(config: { apiKey: string }) {
    throw new Error('Anthropic embedding service not yet available')
  }
}

export class LocalEmbeddingService {
  // Placeholder for local embedding models (like sentence-transformers)
  constructor(config: { modelPath: string }) {
    throw new Error('Local embedding service not yet implemented')
  }
}