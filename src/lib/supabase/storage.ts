// src/lib/supabase/storage.ts - UPDATED VERSION
import { createClient } from '@/lib/supabase/client'

// Use the authenticated client
const getSupabase = () => createClient()

// Storage buckets
export const STORAGE_BUCKETS = {
  DOCUMENTS: 'public-uploads',
  IMAGES: 'public-uploads',
  AVATARS: 'public-uploads',
  WORKFLOW_ASSETS: 'public-uploads',
  TEMP: 'public-uploads',
} as const

export const FILE_CONFIGS = {
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/json',
  ],
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  IMAGE_QUALITY: 0.9,
  THUMBNAIL_SIZE: { width: 200, height: 200 },
  PREVIEW_SIZE: { width: 800, height: 800 },
}

// File upload options interface
interface UploadOptions {
  bucket: keyof typeof STORAGE_BUCKETS
  folder?: string
  fileName?: string
  metadata?: Record<string, any>
  onProgress?: (progress: number) => void
}

// File upload responses interface
interface UploadResponse {
  success: boolean
  data?: {
    id: string
    path: string
    url: string
    size: number
    type: string
    metadata?: Record<string, any>
  }
  error?: string
}

// Main upload function
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<UploadResponse> {
  console.log('📤 Starting upload:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    bucket: STORAGE_BUCKETS[options.bucket]
  })

  try {
    const supabase = getSupabase()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Use the public bucket
    const bucketName = 'public-uploads'
    console.log('🪣 Using bucket:', bucketName)

    // Validate file
    validateFile(file)

    // Generate file path with user/org isolation
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileName = options.fileName || `${timestamp}_${randomId}.${fileExt}`
    
    // Create path with user isolation
    const filePath = options.folder 
      ? `${user.id}/${options.folder}/${fileName}` 
      : `${user.id}/${fileName}`
    
    console.log('📁 File path:', filePath)

    // Simulate progress
    options.onProgress?.(10)

    // Upload to Supabase Storage
    console.log('⬆️ Uploading to Supabase...')
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
        metadata: {
          ...options.metadata,
          uploadedBy: user.id,
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      })

    if (error) {
      console.error('❌ Supabase upload error:', error)
      throw new Error(`Upload failed: ${error.message}`)
    }

    console.log('✅ Upload successful:', data)
    options.onProgress?.(90)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    console.log('🔗 Public URL:', publicUrl)
    options.onProgress?.(100)

    return {
      success: true,
      data: {
        id: data.id || fileName,
        path: data.path,
        url: publicUrl,
        size: file.size,
        type: file.type,
        metadata: options.metadata,
      },
    }
  } catch (error) {
    console.error('❌ Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}

// Validate file before upload
function validateFile(file: File): void {
  // Check file size
  if (file.size > FILE_CONFIGS.MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${FILE_CONFIGS.MAX_FILE_SIZE / 1024 / 1024}MB`)
  }

  // Check file type
  const isImageType = FILE_CONFIGS.ALLOWED_IMAGE_TYPES.includes(file.type)
  const isDocumentType = FILE_CONFIGS.ALLOWED_DOCUMENT_TYPES.includes(file.type)

  if (!isImageType && !isDocumentType) {
    throw new Error(`File type ${file.type} is not allowed`)
  }

  // Additional check for images
  if (isImageType && file.size > FILE_CONFIGS.MAX_IMAGE_SIZE) {
    throw new Error(`Image size exceeds maximum allowed size of ${FILE_CONFIGS.MAX_IMAGE_SIZE / 1024 / 1024}MB`)
  }

  // Check file name
  if (file.name.length > 255) {
    throw new Error('File name is too long')
  }

  // Check for suspicious file extensions
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js']
  const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
  if (suspiciousExtensions.includes(fileExt)) {
    throw new Error('File type not allowed for security reasons')
  }
}

// Delete file function
export async function deleteFile(bucket: keyof typeof STORAGE_BUCKETS, path: string) {
  try {
    const supabase = getSupabase()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const bucketName = 'public-uploads'
    
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path])
    
    if (error) {
      throw new Error(`Delete failed: ${error.message}`)
    }

    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Delete failed'
    }
  }
}

// List files function
export async function listFiles(bucket: keyof typeof STORAGE_BUCKETS, folder?: string) {
  try {
    const supabase = getSupabase()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const bucketName = 'public-uploads'
    const path = folder ? `${user.id}/${folder}` : user.id
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })
    
    if (error) {
      throw new Error(`List failed: ${error.message}`)
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'List failed'
    }
  }
}

// Download file function
export async function downloadFile(bucket: keyof typeof STORAGE_BUCKETS, path: string) {
  try {
    const supabase = getSupabase()
    
    const bucketName = 'public-uploads'
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(path)
    
    if (error) {
      throw new Error(`Download failed: ${error.message}`)
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Download failed'
    }
  }
}