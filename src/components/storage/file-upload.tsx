// src/components/storage/file-upload.tsx
'use client'

import React, { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth/auth-context'
import { uploadFile, STORAGE_BUCKETS, deleteFile } from '@/lib/supabase/storage'
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
import { toast } from '@/components/ui/use-toast'

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
  maxSize = 50 * 1024 * 1024, // 50MB
  onUploadComplete,
  onError,
  className,
}: FileUploadProps) => {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, currentOrganization } = useAuth()

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || !user || !currentOrganization) {
      onError?.('User not authenticated or no organization selected')
      return
    }

    const newFiles: UploadedFile[] = []
    const fileArray = Array.from(selectedFiles)

    // Validate number of files
    if (files.length + fileArray.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Create initial file objects
    fileArray.forEach(file => {
      if (file.size > maxSize) {
        onError?.(
          `${file.name} exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`
        )
        return
      }

      if (accept !== '*/*') {
        const allowed = accept.split(',').map(a => a.trim())
        const isAllowed = allowed.some(a => {
          if (a.endsWith('/*')) {
            return file.type.startsWith(a.replace('/*', ''))
          }
          return file.type === a || `.${file.name.split('.').pop()}` === a
        })
        if (!isAllowed) {
          onError?.(`${file.name} file type not allowed`)
          return
        }
      }

      const fileObj: UploadedFile = {
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: '',
        path: '',
        status: 'pending',
        progress: 0,
      }

      newFiles.push(fileObj)
    })

    // Add files to state
    setFiles(prev => [...prev, ...newFiles])

    // Upload each file
    for (let i = 0; i < newFiles.length; i++) {
      const fileObj = newFiles[i]
      const originalFile = fileArray[i]
      
      try {
        // Update status to uploading
        setFiles(prev => 
          prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, status: 'uploading' as const, progress: 10 }
              : f
          )
        )

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setFiles(prev => 
            prev.map(f => 
              f.id === fileObj.id && f.progress < 90
                ? { ...f, progress: f.progress + 10 }
                : f
            )
          )
        }, 200)

        // Upload file
        const result = await uploadFile(originalFile, {
          bucket,
          folder,
          onProgress: (progress) => {
            setFiles(prev => 
              prev.map(f => 
                f.id === fileObj.id 
                  ? { ...f, progress: Math.round(progress) }
                  : f
              )
            )
          }
        })

        clearInterval(progressInterval)

        if (result.success && result.data) {
          // Update with success
          setFiles(prev => 
            prev.map(f => 
              f.id === fileObj.id 
                ? { 
                    ...f, 
                    status: 'success' as const, 
                    progress: 100,
                    url: result.data!.url,
                    path: result.data!.path
                  }
                : f
            )
          )

          toast({
            title: "Upload successful",
            description: `${fileObj.name} uploaded successfully`,
          })
        } else {
          throw new Error(result.error || 'Upload failed')
        }

      } catch (error) {
        setFiles(prev => 
          prev.map(f => 
            f.id === fileObj.id 
              ? { 
                  ...f, 
                  status: 'error' as const, 
                  error: error instanceof Error ? error.message : 'Upload failed'
                }
              : f
          )
        )

        toast({
          title: "Upload failed",
          description: `Failed to upload ${fileObj.name}`,
          variant: "destructive",
        })
      }
    }

    // Call completion callback with successful files
    const successfulFiles = newFiles.filter(f => f.status === 'success')
    if (successfulFiles.length > 0) {
      onUploadComplete?.(successfulFiles)
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

  const removeFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (file && file.path && file.status === 'success') {
      try {
        await deleteFile(bucket, file.path)
        toast({
          title: "File deleted",
          description: `${file.name} was deleted successfully`,
        })
      } catch (error) {
        toast({
          title: "Delete failed",
          description: `Failed to delete ${file.name}`,
          variant: "destructive",
        })
        return
      }
    }
    
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />
    if (type.includes('text') || type.includes('document')) return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'uploading': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!user || !currentOrganization) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please sign in and select an organization to upload files.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          'hover:bg-muted/50'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          
          <div>
            <p className="text-lg font-medium">
              {isDragging ? 'Drop files here' : 'Upload files'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Drag and drop files here, or click to browse
            </p>
          </div>
          
          <div className="flex items-center justify-center">
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={files.some(f => f.status === 'uploading')}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Max {maxFiles} files, {Math.round(maxSize / 1024 / 1024)}MB each
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Files ({files.length})</h4>
          
          {files.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className={getStatusColor(file.status)}>
                    {file.status === 'uploading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : file.status === 'success' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : file.status === 'error' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      getFileIcon(file.type)
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                      {file.error && ` • ${file.error}`}
                    </p>
                  </div>
                  
                  <Badge variant={
                    file.status === 'success' ? 'default' :
                    file.status === 'error' ? 'destructive' :
                    file.status === 'uploading' ? 'secondary' : 'outline'
                  }>
                    {file.status}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {file.status === 'success' && file.url && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = file.url
                          a.download = file.name
                          a.click()
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {file.status === 'uploading' && (
                <div className="mt-2">
                  <Progress value={file.progress} className="h-1" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}