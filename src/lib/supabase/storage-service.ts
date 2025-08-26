// src/lib/supabase/storage-service.ts
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

export class StorageService {
  private supabase = createClient()
  
  // Define storage buckets with proper security
  private static readonly BUCKETS = {
    PUBLIC_UPLOADS: 'public-uploads',
    PRIVATE_DOCUMENTS: 'private-documents', 
    WORKFLOW_ASSETS: 'workflow-assets',
    USER_AVATARS: 'avatars',
    TEMPORARY: 'temporary'
  } as const

  private static readonly FILE_CONFIGS = {
    ALLOWED_IMAGE_TYPES: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
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
      'application/zip'
    ],
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  }

  /**
   * Upload file to specific bucket with organization isolation
   */
  async uploadFile(
    file: File,
    options: {
      bucket: keyof typeof StorageService.BUCKETS
      organizationId: string
      userId: string
      folder?: string
      isPublic?: boolean
      metadata?: Record<string, any>
    }
  ): Promise<{
    success: boolean
    data?: {
      path: string
      url: string
      size: number
      type: string
    }
    error?: string
  }> {
    try {
      // Validate file
      this.validateFile(file)

      // Create secure path with organization isolation
      const bucketName = StorageService.BUCKETS[options.bucket]
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 15)
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      
      const securePath = [
        options.organizationId, // Organization isolation
        options.folder || 'general',
        `${timestamp}_${randomId}.${fileExt}`
      ].join('/')

      // Upload file
      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .upload(securePath, file, {
          cacheControl: '3600',
          upsert: false, // Don't overwrite existing files
          metadata: {
            ...options.metadata,
            uploadedBy: options.userId,
            organizationId: options.organizationId,
            originalName: file.name,
            uploadedAt: new Date().toISOString()
          }
        })

      if (error) {
        console.error('Storage upload error:', error)
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get URL (public or signed)
      let url: string
      if (options.isPublic && bucketName === StorageService.BUCKETS.PUBLIC_UPLOADS) {
        const { data: { publicUrl } } = this.supabase.storage
          .from(bucketName)
          .getPublicUrl(securePath)
        url = publicUrl
      } else {
        const { data: signedUrlData, error: urlError } = await this.supabase.storage
          .from(bucketName)
          .createSignedUrl(securePath, 3600) // 1 hour expiry
        
        if (urlError) throw urlError
        url = signedUrlData.signedUrl
      }

      // Store file metadata in database
      await this.createFileRecord({
        path: securePath,
        bucket: bucketName,
        organizationId: options.organizationId,
        uploadedBy: options.userId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        isPublic: options.isPublic || false,
        metadata: options.metadata
      })

      return {
        success: true,
        data: {
          path: securePath,
          url,
          size: file.size,
          type: file.type
        }
      }

    } catch (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  /**
   * Get signed URL for private files
   */
  async getSignedUrl(
    path: string,
    bucket: keyof typeof StorageService.BUCKETS,
    expiresIn: number = 3600
  ): Promise<{ url: string | null; error?: string }> {
    try {
      const bucketName = StorageService.BUCKETS[bucket]
      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .createSignedUrl(path, expiresIn)

      if (error) throw error

      return { url: data.signedUrl }
    } catch (error) {
      return {
        url: null,
        error: error instanceof Error ? error.message : 'Failed to get signed URL'
      }
    }
  }

  /**
   * Delete file from storage and database
   */
  async deleteFile(
    path: string,
    bucket: keyof typeof StorageService.BUCKETS
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const bucketName = StorageService.BUCKETS[bucket]

      // Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from(bucketName)
        .remove([path])

      if (storageError) throw storageError

      // Delete database record
      const { error: dbError } = await this.supabase
        .from('file_records')
        .delete()
        .eq('path', path)
        .eq('bucket', bucketName)

      if (dbError) {
        console.warn('Failed to delete file record from database:', dbError)
        // Don't fail the entire operation for DB record deletion
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      }
    }
  }

  /**
   * List files for an organization
   */
  async listFiles(
    organizationId: string,
    bucket: keyof typeof StorageService.BUCKETS,
    folder?: string
  ): Promise<{
    files: Array<{
      name: string
      path: string
      size: number
      created_at: string
      metadata?: any
    }>
    error?: string
  }> {
    try {
      const bucketName = StorageService.BUCKETS[bucket]
      const prefix = folder ? `${organizationId}/${folder}/` : `${organizationId}/`

      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .list(organizationId, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) throw error

      return {
        files: data.map(file => ({
          name: file.name,
          path: `${organizationId}/${file.name}`,
          size: file.metadata?.size || 0,
          created_at: file.created_at,
          metadata: file.metadata
        }))
      }
    } catch (error) {
      return {
        files: [],
        error: error instanceof Error ? error.message : 'Failed to list files'
      }
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): void {
    // Check file size
    if (file.size > StorageService.FILE_CONFIGS.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${StorageService.FILE_CONFIGS.MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    // Check file type
    const isImageType = StorageService.FILE_CONFIGS.ALLOWED_IMAGE_TYPES.includes(file.type)
    const isDocumentType = StorageService.FILE_CONFIGS.ALLOWED_DOCUMENT_TYPES.includes(file.type)

    if (!isImageType && !isDocumentType) {
      throw new Error(`File type ${file.type} is not allowed`)
    }

    // Additional check for images
    if (isImageType && file.size > StorageService.FILE_CONFIGS.MAX_IMAGE_SIZE) {
      throw new Error(`Image size exceeds maximum allowed size of ${StorageService.FILE_CONFIGS.MAX_IMAGE_SIZE / 1024 / 1024}MB`)
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

  /**
   * Create file record in database for tracking
   */
  private async createFileRecord(data: {
    path: string
    bucket: string
    organizationId: string
    uploadedBy: string
    fileName: string
    fileSize: number
    mimeType: string
    isPublic: boolean
    metadata?: Record<string, any>
  }): Promise<void> {
    // This would require a file_records table in your schema
    // Add this table to your next migration
    const { error } = await this.supabase
      .from('file_records')
      .insert({
        path: data.path,
        bucket: data.bucket,
        organization_id: data.organizationId,
        uploaded_by: data.uploadedBy,
        file_name: data.fileName,
        file_size: data.fileSize,
        mime_type: data.mimeType,
        is_public: data.isPublic,
        metadata: data.metadata || {}
      })

    if (error) {
      console.warn('Failed to create file record:', error)
      // Don't fail upload for this, just log the warning
    }
  }
}