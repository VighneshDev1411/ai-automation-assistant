// src/lib/ai/DocumentProcessor.ts
import mammoth from 'mammoth'
// import * as pdfjsLib from 'pdfjs-dist'

export interface ProcessedDocument {
  content: string
  metadata: {
    title: string
    source: string
    pageCount?: number
    wordCount: number
    fileType: string
    extractedAt: Date
  }
}

export interface ProcessingOptions {
  extractImages?: boolean
  preserveFormatting?: boolean
  maxPages?: number
}

export class DocumentProcessor {
  constructor() {
    // Configure PDF.js worker
    // if (typeof window !== 'undefined') {
    //   pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
    // }
  }

  /**
   * Process a file and extract text content
   */
  async processFile(
    file: File,
    options: ProcessingOptions = {}
  ): Promise<ProcessedDocument> {
    const fileType = this.getFileType(file.name)

    console.log(`Processing ${fileType} file: ${file.name}`)

    switch (fileType) {
      case 'pdf':
        return await this.processPDF(file, options)
      case 'docx':
        return await this.processDOCX(file, options)
      case 'txt':
        return await this.processText(file)
      case 'md':
        return await this.processMarkdown(file)
      default:
        throw new Error(`Unsupported file type: ${fileType}`)
    }
  }

  /**
   * Process PDF files
   */
  private async processPDF(
    file: File,
    options: ProcessingOptions
  ): Promise<ProcessedDocument> {
    if (typeof window === 'undefined') {
      throw new Error('PDF processing is only available in the browser')
    }

    try {
      // Dynamic import PDF.js only when needed
      const pdfjsLib = await import('pdfjs-dist')

      // Configure worker
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
      }

      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument(arrayBuffer)
      const pdf = await loadingTask.promise

      const maxPages = options.maxPages || pdf.numPages
      const pagesToProcess = Math.min(maxPages, pdf.numPages)

      let fullText = ''

      for (let i = 1; i <= pagesToProcess; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()

        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')

        fullText += `\n\n--- Page ${i} ---\n${pageText}`
      }

      return {
        content: fullText.trim(),
        metadata: {
          title: this.extractTitle(file.name),
          source: file.name,
          pageCount: pdf.numPages,
          wordCount: this.countWords(fullText),
          fileType: 'pdf',
          extractedAt: new Date(),
        },
      }
    } catch (error) {
      console.error('Error processing PDF:', error)
      throw new Error(
        `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Process DOCX files
   */
  private async processDOCX(
    file: File,
    options: ProcessingOptions
  ): Promise<ProcessedDocument> {
    try {
      const arrayBuffer = await file.arrayBuffer()

      const result = await mammoth.extractRawText({
        arrayBuffer,
      })

      if (result.messages.length > 0) {
        console.warn('DOCX processing warnings:', result.messages)
      }

      return {
        content: result.value,
        metadata: {
          title: this.extractTitle(file.name),
          source: file.name,
          wordCount: this.countWords(result.value),
          fileType: 'docx',
          extractedAt: new Date(),
        },
      }
    } catch (error) {
      console.error('Error processing DOCX:', error)
      throw new Error(
        `Failed to process DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Process plain text files
   */
  private async processText(file: File): Promise<ProcessedDocument> {
    try {
      const text = await file.text()

      return {
        content: text,
        metadata: {
          title: this.extractTitle(file.name),
          source: file.name,
          wordCount: this.countWords(text),
          fileType: 'txt',
          extractedAt: new Date(),
        },
      }
    } catch (error) {
      console.error('Error processing text file:', error)
      throw new Error(
        `Failed to process text file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Process Markdown files
   */
  private async processMarkdown(file: File): Promise<ProcessedDocument> {
    try {
      const text = await file.text()

      // Remove markdown formatting for better text extraction
      const cleanText = this.stripMarkdown(text)

      return {
        content: cleanText,
        metadata: {
          title:
            this.extractTitleFromMarkdown(text) || this.extractTitle(file.name),
          source: file.name,
          wordCount: this.countWords(cleanText),
          fileType: 'md',
          extractedAt: new Date(),
        },
      }
    } catch (error) {
      console.error('Error processing markdown file:', error)
      throw new Error(
        `Failed to process markdown file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Process multiple files in batch
   */
  async processFiles(
    files: File[],
    options: ProcessingOptions = {}
  ): Promise<ProcessedDocument[]> {
    console.log(`Processing ${files.length} files`)

    const results = await Promise.allSettled(
      files.map(file => this.processFile(file, options))
    )

    const processed: ProcessedDocument[] = []
    const errors: string[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        processed.push(result.value)
      } else {
        errors.push(`${files[index].name}: ${result.reason.message}`)
      }
    })

    if (errors.length > 0) {
      console.warn('Some files failed to process:', errors)
    }

    return processed
  }

  /**
   * Validate file before processing
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024 // 50MB
    const allowedTypes = ['pdf', 'docx', 'txt', 'md']

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (50MB)`,
      }
    }

    const fileType = this.getFileType(file.name)
    if (!allowedTypes.includes(fileType)) {
      return {
        valid: false,
        error: `File type '${fileType}' is not supported. Allowed types: ${allowedTypes.join(', ')}`,
      }
    }

    return { valid: true }
  }

  // Helper methods

  private getFileType(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop() || ''

    switch (extension) {
      case 'pdf':
        return 'pdf'
      case 'docx':
      case 'doc':
        return 'docx'
      case 'txt':
        return 'txt'
      case 'md':
      case 'markdown':
        return 'md'
      default:
        return 'unknown'
    }
  }

  private extractTitle(filename: string): string {
    // Remove extension and clean up filename
    return filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  private extractTitleFromMarkdown(content: string): string | null {
    // Look for the first H1 heading
    const h1Match = content.match(/^#\s+(.+)$/m)
    if (h1Match) {
      return h1Match[1].trim()
    }

    // Look for title in frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/)
    if (frontmatterMatch) {
      const titleMatch = frontmatterMatch[1].match(/title:\s*(.+)$/m)
      if (titleMatch) {
        return titleMatch[1].trim().replace(/['"]/g, '')
      }
    }

    return null
  }

  private stripMarkdown(text: string): string {
    return (
      text
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        // Remove headers
        .replace(/^#{1,6}\s+/gm, '')
        // Remove bold/italic
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        // Remove links
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove images
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        // Remove horizontal rules
        .replace(/^---+$/gm, '')
        // Remove list markers
        .replace(/^[\s]*[-*+]\s+/gm, '')
        .replace(/^[\s]*\d+\.\s+/gm, '')
        // Clean up extra whitespace
        .replace(/\n\s*\n/g, '\n\n')
        .trim()
    )
  }

  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length
  }
}

// Export singleton instance
// export const documentProcessor = new DocumentProcessor()
export const documentProcessor = new DocumentProcessor()

// Also export the class for direct instantiation
// export { DocumentProcessor }
