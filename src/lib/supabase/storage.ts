import { createClient } from '@supabase/supabase-js'
import { error } from 'console'
import { da, tr } from 'date-fns/locale'
import { P } from 'node_modules/framer-motion/dist/types.d-Cjd591yU'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { success } from 'zod'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const STORAGE_BUCKETS = {
  DOCUMENTS: 'documents',
  IMAGES: 'images',
  AVATARS: 'avatars',
  WORKFLOW_ASSESTS: 'workflow-assets',
  TEMP: 'temp-uploads',
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

export const uploadFile = async (
  file: File,
  options: UploadOptions
): Promise<UploadResponse> => {
  try {
    if (file.size > FILE_CONFIGS.MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum of ${FILE_CONFIGS.MAX_FILE_SIZE / 1024 / 1024}MB`
      )
    }
    const isImage = FILE_CONFIGS.ALLOWED_IMAGE_TYPES.includes(file.type)
    const isDocument = FILE_CONFIGS.ALLOWED_DOCUMENT_TYPES.includes(file.type)

    if (!isImage && !isDocument) {
      throw new Error('File type not supported')
    }

    // Generate the file path now..

    const fileExt = file.name.split('.').pop()
    const fileName = options.fileName || `${uuidv4()}.${fileExt}`
    const filePath = options.folder ? `${options.folder}/${fileName}` : fileName

    // Now upload it to the supabase storage

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS[options.bucket])
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (error) throw error

    // Now getting the public url

    const {
      data: { publicUrl },
    } = supabase.storage
      .from(STORAGE_BUCKETS[options.bucket])
      .getPublicUrl(filePath)

    return {
      success: true,
      data: {
        id: data.id,
        path: data.path,
        url: publicUrl,
        size: file.size,
        type: file.type,
        metadata: options.metadata,
      },
    }
  } catch (error) {
    console.error('Upload error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }

  // Now if we want to delete it from the subabase
}

export const deleteFile = async (
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .remove([path])

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Delete error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    }
  }
}

// Listing files present in the bucket/folder

export const listFiles = async (
  bucket: keyof typeof STORAGE_BUCKETS,
  folder?: string,
  options?: {
    limit?: number
    offset?: number
    sortBy?: 'name' | 'created_at' | 'updated_at'
  }
) => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .list(folder, {
        limit: options?.limit || 100,
        offset: options?.offset || 0,
        sortBy: {
          column: options?.sortBy || 'created_at',
          order: 'desc',
        },
      })

    if (error) return error

    return {
      success: true,
      data: data || [],
    }
  } catch (error) {
    console.error('List files error:', error)
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Failed to list files',
    }
  }
}

// Now we will get the signed URL for temporary access

// 1 hour by default -- 3600
export const getSignedUrl = async (
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string,
  expiresIn = 3600
) => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .createSignedUrl(path, expiresIn)

    if (error) throw error
    return {
      success: true,
      url: data.signedUrl,
    }
  } catch (error) {
    console.error('Signed URL error: ', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create signed URL',
    }
  }
}

// Now lets download a file

export const downloadFile = async (
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string
) => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .download(path)

    if (error) throw error

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Download error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed',
    }
  }
}

// Moving or renaming a file

export const moveFile = async (
  bucket: keyof typeof STORAGE_BUCKETS,
  fromPath: string,
  toPath: string
) => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .move(fromPath, toPath)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Move error: ', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Move failed',
    }
  }
}

// Now copying a file

export const copyFile = async (
  bucket: keyof typeof STORAGE_BUCKETS,
  fromPath: string,
  toPath: string
) => {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .copy(fromPath, toPath)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Copy error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Copy Failed',
    }
  }
}
