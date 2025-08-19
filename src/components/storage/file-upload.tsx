'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { uploadFile, STORAGE_BUCKETS } from '@/lib/supabase/storage'
import {
  Upload,
  File,
  FileText,
  Image,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Eye,
  Trash2,
  FolderOpen,
} from 'lucide-react'
import { fi, tr } from 'date-fns/locale'
import { progress } from 'framer-motion'
import path from 'path'

interface FileUploadProps {
  bucket?: keyof typeof STORAGE_BUCKETS
  folder?: string
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSize?: number
  onUploadComplete?: (files: UploadedFile[]) => void
  onError?: (error: string) => void
  className?: string
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  path: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

export const FileUpload = ({
  bucket = 'DOCUMENTS',
  folder = '',
  accept = '*/*',
  multiple = true,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024,
  onUploadComplete,
  onError,
  className,
}: FileUploadProps) => {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: UploadedFile[] = []
    const fileArray = Array.from(selectedFiles)

    // Validate number of files
    if (files.length + fileArray.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} files allowed`)
      return
    }

    fileArray.forEach(file => {
      if (file.size > maxSize) {
        onError?.(
          `${file.name} exceeds maximum size of ${maxSize / 1024 / 1024}MB`
        )
        return
      }

      if (accept !== '*/*') {
        const allowed = accept.split(',').map(a => a.trim())
        const isAllowed = allowed.some(a => {
          if (a.endsWith('/*')) {
            return file.type.startsWith(a.replace('/*', ''))
          }
          return file.type === a
        })
        if (!isAllowed) {
          onError?.(`${file.name} is not a supported file type`)
          return
        }
      }

      newFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: '',
        path: '',
        status: 'pending',
        progress: 0,
      })
    })
    setFiles(prev => [...prev, ...newFiles])

    // Start uploading the files

    newFiles.forEach((fileInfo, index) => {
      uploadFileToSupabase(fileArray[index], fileInfo.id)
    })
  }
  const uploadFileToSupabase = async (file: File, fileId: string) => {
    console.log('🚀 Starting upload for:', file.name)

    // Update status to uploading
    setFiles(prev =>
      prev.map(f =>
        f.id === fileId ? { ...f, status: 'uploading' as const } : f
      )
    )

    try {
      // Remove the progress interval - it might be causing issues
      // Just do a simple upload
      const result = await uploadFile(file, {
        bucket,
        folder: folder || 'uploads',
      })

      console.log('📦 Upload result:', result)

      if (result.success && result.data) {
        setFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'success' as const,
                  progress: 100,
                  url: result.data!.url,
                  path: result.data!.path,
                }
              : f
          )
        )

        console.log('✨ File upload complete!')

        // Notify parent component
        if (onUploadComplete) {
          onUploadComplete([
            {
              id: fileId,
              name: file.name,
              size: file.size,
              type: file.type,
              url: result.data.url,
              path: result.data.path,
              status: 'success',
              progress: 100,
            },
          ])
        }
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('💥 Upload failed:', error)
      setFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? {
                ...f,
                status: 'error' as const,
                progress: 0,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      )
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const retryUpload = (fileId: string) => {
    const file = files.find(f => f.id == fileId)
    if (file && fileInputRef.current?.files) {
      const fileList = Array.from(fileInputRef.current.files)
      const originalFile = fileList.find(f => f.name === file.name)
      if (originalFile) {
        uploadFileToSupabase(originalFile, fileId)
      }
    }
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [])

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <Card
        className={cn(
          'border-2 border-dashed transition-all',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center p-10">
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {isDragging ? 'Drop files here' : 'Upload Files'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Drag and drop files here, or click to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={e => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Browse Files
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Maximum file size: {maxSize / 1024 / 1024}MB •
            {multiple ? ` Maximum ${maxFiles} files` : ' Single file only'}
          </p>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <Card key={file.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* File Icon */}
                  <div className="flex-shrink-0">{getFileIcon(file.type)}</div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(file.size)}
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    {file.status === 'uploading' && (
                      <div className="mt-2">
                        <Progress value={file.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Uploading... {file.progress}%
                        </p>
                      </div>
                    )}

                    {/* Error Message */}
                    {file.status === 'error' && (
                      <p className="text-xs text-destructive mt-1">
                        {file.error}
                      </p>
                    )}

                    {/* Success Message */}
                    {file.status === 'success' && (
                      <p className="text-xs text-green-600 mt-1">
                        Upload complete
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {file.status === 'uploading' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {file.status === 'success' && (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {file.status === 'error' && (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryUpload(file.id)}
                        >
                          Retry
                        </Button>
                      </>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
