// src/lib/utils/image-optimization.ts

interface ImageDimensions {
  width: number
  height: number
}

interface OptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  maintainAspectRatio?: boolean
}

/**
 * Optimize and resize an image file
 */
export async function optimizeImage(
  file: File,
  options: OptimizationOptions = {}
): Promise<{ file: File; dimensions: ImageDimensions }> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.9,
    format = 'jpeg',
    maintainAspectRatio = true,
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    img.onload = () => {
      let { width, height } = img

      // Calculate new dimensions
      if (maintainAspectRatio) {
        const aspectRatio = width / height

        if (width > maxWidth) {
          width = maxWidth
          height = width / aspectRatio
        }

        if (height > maxHeight) {
          height = maxHeight
          width = height * aspectRatio
        }
      } else {
        width = Math.min(width, maxWidth)
        height = Math.min(height, maxHeight)
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Failed to optimize image'))
            return
          }

          const optimizedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, `.${format}`),
            { type: `image/${format}` }
          )

          resolve({
            file: optimizedFile,
            dimensions: { width, height },
          })
        },
        `image/${format}`,
        quality
      )
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    // Read the file
    const reader = new FileReader()
    reader.onload = e => {
      img.src = e.target?.result as string
    }
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Generate a thumbnail from an image file
 */
export async function generateThumbnail(
  file: File,
  size: ImageDimensions = { width: 200, height: 200 }
): Promise<File> {
  const { file: thumbnail } = await optimizeImage(file, {
    maxWidth: size.width,
    maxHeight: size.height,
    quality: 0.8,
    format: 'jpeg',
  })

  return thumbnail
}

/**
 * Extract image metadata
 */
export async function getImageMetadata(file: File): Promise<{
  dimensions: ImageDimensions
  size: number
  type: string
  name: string
}> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      resolve({
        dimensions: {
          width: img.width,
          height: img.height,
        },
        size: file.size,
        type: file.type,
        name: file.name,
      })
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    const reader = new FileReader()
    reader.onload = e => {
      img.src = e.target?.result as string
    }
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Convert image to base64
 */
export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Create image preview URL
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Revoke image preview URL to free memory
 */
export function revokeImagePreview(url: string): void {
  URL.revokeObjectURL(url)
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Validate image dimensions
 */
export async function validateImageDimensions(
  file: File,
  minWidth?: number,
  minHeight?: number,
  maxWidth?: number,
  maxHeight?: number
): Promise<{ valid: boolean; message?: string }> {
  try {
    const { dimensions } = await getImageMetadata(file)

    if (minWidth && dimensions.width < minWidth) {
      return {
        valid: false,
        message: `Image width must be at least ${minWidth}px`,
      }
    }

    if (minHeight && dimensions.height < minHeight) {
      return {
        valid: false,
        message: `Image height must be at least ${minHeight}px`,
      }
    }

    if (maxWidth && dimensions.width > maxWidth) {
      return {
        valid: false,
        message: `Image width must not exceed ${maxWidth}px`,
      }
    }

    if (maxHeight && dimensions.height > maxHeight) {
      return {
        valid: false,
        message: `Image height must not exceed ${maxHeight}px`,
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      message: 'Failed to validate image',
    }
  }
}

/**
 * Batch optimize multiple images
 */
export async function batchOptimizeImages(
  files: File[],
  options: OptimizationOptions = {},
  onProgress?: (progress: number) => void
): Promise<Array<{ file: File; dimensions: ImageDimensions }>> {
  const results: Array<{ file: File; dimensions: ImageDimensions }> = []
  const total = files.length

  for (let i = 0; i < total; i++) {
    const file = files[i]

    if (isImageFile(file)) {
      try {
        const result = await optimizeImage(file, options)
        results.push(result)
      } catch (error) {
        console.error(`Failed to optimize ${file.name}:`, error)
        // Add original file if optimization fails
        results.push({
          file,
          dimensions: { width: 0, height: 0 },
        })
      }
    } else {
      // Non-image files are added as-is
      results.push({
        file,
        dimensions: { width: 0, height: 0 },
      })
    }

    // Report progress
    if (onProgress) {
      onProgress(((i + 1) / total) * 100)
    }
  }

  return results
}
