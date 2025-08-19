// src/lib/supabase/storage.ts
import { createClient } from '@supabase/supabase-js'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create client without auth persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

// Use only public bucket
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

// Simplified upload function
// src/lib/supabase/storage.ts
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<UploadResponse> {
  console.log('📤 Starting upload:', {
    fileName: file.name,
    fileSize: FILE_CONFIGS.MAX_FILE_SIZE,
    fileType: FILE_CONFIGS.ALLOWED_DOCUMENT_TYPES,
    bucket: STORAGE_BUCKETS[options.bucket]
  })

  try {
    // Use the public bucket
    const bucketName = 'public-uploads'
    console.log('🪣 Using bucket:', bucketName)

    // Generate file path
    const fileExt = file.name.split('.').pop()
    const fileName = options.fileName || `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = options.folder ? `${options.folder}/${fileName}` : fileName
    
    console.log('📁 File path:', filePath)

    // Upload to Supabase Storage
    console.log('⬆️ Uploading to Supabase...')
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Changed to true to overwrite if exists
      })

    if (error) {
      console.error('❌ Supabase upload error:', error)
      throw error
    }

    console.log('✅ Upload successful:', data)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    console.log('🔗 Public URL:', publicUrl)

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
// Other functions remain the same but use 'public-uploads' bucket
export async function deleteFile(bucket: any, path: string) {
  const { error } = await supabase.storage
    .from('public-uploads')
    .remove([path])
  
  return { success: !error, error: error?.message }
}

export async function listFiles(bucket: any, folder?: string) {
  const { data, error } = await supabase.storage
    .from('public-uploads')
    .list(folder)
  
  return {
    success: !error,
    data: data || [],
    error: error?.message
  }
}

export async function downloadFile(bucket: any, path: string) {
  const { data, error } = await supabase.storage
    .from('public-uploads')
    .download(path)
  
  return {
    success: !error,
    data,
    error: error?.message
  }
}
