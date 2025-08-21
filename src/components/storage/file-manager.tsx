'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { FileUpload } from './file-upload'
import {
  listFiles,
  deleteFile,
  downloadFile,
  STORAGE_BUCKETS,
} from '@/lib/supabase/storage'
import {
  Grid,
  List,
  Search,
  Filter,
  Upload,
  Download,
  Trash2,
  Share2,
  Eye,
  MoreVertical,
  Folder,
  File,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  Copy,
  Move,
  Info,
  Lock,
  Unlock,
  Users,
  Clock,
  SortAsc,
  SortDesc,
  LayoutGrid,
  LayoutList,
  X,
} from 'lucide-react'
import { file } from 'zod'

interface FileItem {
  id: string
  name: string
  path: string
  size: number
  type: string
  lastModified: Date
  url?: string
  thumbnail?: string
  shared?: boolean
  permissions?: 'view' | 'edit' | 'admin'
  owner?: string
  tags?: string[]
}

interface FileManagerProps {
  bucket?: keyof typeof STORAGE_BUCKETS
  initialView?: 'grid' | 'list'
  showUpload?: boolean
  showSearch?: boolean
  showFilters?: boolean
  onFileSelect?: (file: FileItem) => void
  className?: string
}

export const FileManager = ({
  bucket = 'DOCUMENTS',
  initialView = 'grid',
  showUpload = true,
  showSearch = true,
  showFilters = true,
  onFileSelect,
  className,
}: FileManagerProps) => {
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialView)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterType, setFilterType] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareFile, setShareFile] = useState<FileItem | null>(null)

  // Loading the files on mount

  useEffect(() => {
    loadFiles()
  }, [bucket])

  const loadFiles = async () => {
    setIsLoading(true)
    const result = await listFiles(bucket)

    if (result.success && result.data) {
      // Transforming our supabase file data to our fileitem format

      const transformedFiles: FileItem[] = result.data.map((file: any) => ({
        id: file.id || file.name,
        name: file.name,
        path: file.name,
        size: file.metadata?.size || 0,
        type: file.metadata?.mimetype || 'application/octet-stream',
        lastModified: new Date(file.updated_at || file.created_at),
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKETS[bucket]}/${file.name}`,
        shared: false,
        permissions: 'admin' as const,
        owner: 'You',
      }))
      setFiles(transformedFiles)
    }
    setIsLoading(false)
  }

  const handleDelete = async (fileId: string) => {
  const file = files.find(f => f.id === fileId)
  if (!file) return

  console.log('Deleting file:', file.path)
  
  // Use the correct path - just the filename, not the full URL
  const filePath = file.path || file.name
  
  const result = await deleteFile(bucket, filePath)
  
  if (result.success) {
    // Remove from local state
    setFiles(prev => prev.filter(f => f.id !== fileId))
    setSelectedFiles(prev => prev.filter(id => id !== fileId))
    console.log('File deleted and removed from UI')
  } else {
    console.error('Failed to delete:', result.error)
    alert(`Failed to delete: ${result.error}`)
  }
}

  const handleDownload = async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    const result = await downloadFile(bucket, file.path)
    if (result.success && result.data) {
      // Creating a download link
      const url = URL.createObjectURL(result.data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handlePreview = (file: FileItem) => {
    setPreviewFile(file)
    setShowPreviewDialog(true)
  }

  const handleShare = (file: FileItem) => {
    setShareFile(file)
    setShowShareDialog(true)
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const selectAllFiles = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(filteredFiles.map(f => f.id))
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5" />
    if (type.startsWith('video/')) return <Film className="h-5 w-5" />
    if (type.startsWith('audio/')) return <Music className="h-5 w-5" />
    if (type.includes('pdf')) return <FileText className="h-5 w-5" />
    if (type.includes('zip') || type.includes('rar'))
      return <Archive className="h-5 w-5" />
    return <File className="h-5 w-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  // Filtering and sorting of files
  const filteredFiles = files
    .filter(file => {
      const matchesSearch = file.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesType = filterType === 'all' || file.type.includes(filterType)
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison = a.lastModified.getTime() - b.lastModified.getTime()
          break
        case 'size':
          comparison = a.size - b.size
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>File Manager</CardTitle>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>

              {showUpload && (
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {showSearch && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}

            {showFilters && (
              <>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Files</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="pdf">PDFs</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Selection controls */}
          {selectedFiles.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg mb-4">
              <span className="text-sm font-medium">
                {selectedFiles.length} file(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedFiles([])}>
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedFiles.forEach(handleDownload)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    selectedFiles.forEach(handleDelete)
                    setSelectedFiles([])
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* File Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredFiles.map(file => (
                <Card
                  key={file.id}
                  className={cn(
                    'cursor-pointer hover:shadow-lg transition-all',
                    selectedFiles.includes(file.id) && 'ring-2 ring-primary'
                  )}
                  onClick={() => onFileSelect?.(file)}
                >
                  <CardContent className="p-4">
                    {/* Checkbox */}
                    <div className="flex items-start justify-between mb-3">
                      <Checkbox
                        checked={selectedFiles.includes(file.id)}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePreview(file)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(file.id)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShare(file)}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(file.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* File Preview */}
                    <div className="flex flex-col items-center">
                      <div className="text-muted-foreground mb-3">
                        {getFileIcon(file.type)}
                      </div>
                      <p className="text-sm font-medium truncate w-full text-center">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {/* List Header */}
              <div className="flex items-center p-2 border-b">
                <Checkbox
                  checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                  onCheckedChange={selectAllFiles}
                  className="mr-4"
                />
                <div className="flex-1 grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                  <div className="col-span-5">Name</div>
                  <div className="col-span-2">Size</div>
                  <div className="col-span-3">Modified</div>
                  <div className="col-span-2">Actions</div>
                </div>
              </div>

              {/* List Items */}
              {filteredFiles.map(file => (
                <div
                  key={file.id}
                  className={cn(
                    'flex items-center p-2 rounded-lg hover:bg-muted/50 cursor-pointer',
                    selectedFiles.includes(file.id) && 'bg-muted'
                  )}
                  onClick={() => onFileSelect?.(file)}
                >
                  <Checkbox
                    checked={selectedFiles.includes(file.id)}
                    onCheckedChange={() => toggleFileSelection(file.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mr-4"
                  />
                  <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-5 flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <span className="truncate">{file.name}</span>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </div>
                    <div className="col-span-3 text-sm text-muted-foreground">
                      {formatDate(file.lastModified)}
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreview(file)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(file.id)
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(file.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Drag and drop files or click to browse
            </DialogDescription>
          </DialogHeader>
          <FileUpload
            bucket={bucket}
            onUploadComplete={() => {
              setShowUploadDialog(false)
              loadFiles()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
            <DialogDescription>
              {previewFile && (
                <div className="flex items-center gap-4 text-sm">
                  <span>{formatFileSize(previewFile.size)}</span>
                  <span>•</span>
                  <span>{formatDate(previewFile.lastModified)}</span>
                  <span>•</span>
                  <span>{previewFile.type}</span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {previewFile?.type.startsWith('image/') && (
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-w-full h-auto rounded-lg"
              />
            )}
            {previewFile?.type === 'application/pdf' && (
              <iframe
                src={previewFile.url}
                className="w-full h-[60vh] rounded-lg border"
                title={previewFile.name}
              />
            )}
            {previewFile?.type.startsWith('text/') && (
              <div className="bg-muted p-4 rounded-lg max-h-[60vh] overflow-auto">
                <pre className="text-sm">{/* Text content would be loaded here */}</pre>
              </div>
            )}
            {previewFile?.type.startsWith('video/') && (
              <video
                src={previewFile.url}
                controls
                className="max-w-full h-auto rounded-lg"
              />
            )}
            {previewFile?.type.startsWith('audio/') && (
              <audio
                src={previewFile.url}
                controls
                className="w-full"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button onClick={() => previewFile && handleDownload(previewFile.id)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share File</DialogTitle>
            <DialogDescription>
              Share "{shareFile?.name}" with others
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Share with</label>
              <Input placeholder="Enter email addresses..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Permissions</label>
              <Select defaultValue="view">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Can view</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                  <SelectItem value="admin">Full access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message (optional)</label>
              <Input placeholder="Add a message..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
            <Button>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

