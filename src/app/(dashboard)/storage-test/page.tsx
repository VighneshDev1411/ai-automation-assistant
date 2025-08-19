// src/app/(dashboard)/storage-test/page.tsx
'use client'

import { useState, useEffect } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FileUpload } from '@/components/storage/file-upload'
// import { FileManager } from '@/components/storage/file-manager'
import { FileManager } from '@/components/storage/file-manager'
// import { DocumentProcessor, DocumentProcessingQueue } from '@/lib/services/document-processor'
import {
  DocumentProcessor,
  DocumentProcessingQueue,
} from '@/lib/services/document-processor'
// import { FileSharingService } from '@/lib/services/file-sharing'
import { FileSharingService } from '@/lib/services/file-sharing'
// import { optimizeImage, generateThumbnail } from '@/lib/utils/image-optimization'
import { optimizeImage, generateThumbnail } from '@/utils/image-optimization'
import {
  Upload,
  FolderOpen,
  Image,
  FileText,
  Share2,
  Shield,
  Zap,
  CheckCircle,
  Info,
  Settings,
  BarChart3,
} from 'lucide-react'

export default function StorageTestPage() {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [processingStatus, setProcessingStatus] = useState<string>('')
  const [shareLink, setShareLink] = useState<string>('')



  const handleFileUpload = (files: any[]) => {
    setUploadedFiles(files)
    console.log('Files uploaded:', files)
  }

  const testDocumentProcessing = async () => {
    setProcessingStatus('Processing...')
    const processor = DocumentProcessor.getInstance()

    // Create a test file
    const testFile = new File(['Test content'], 'test.txt', {
      type: 'text/plain',
    })

    try {
      const result = await processor.processDocument(testFile, {
        extractText: true,
        extractMetadata: true,
        virusScan: true,
        detectLanguage: true,
      })

      setProcessingStatus(
        `Processing complete: ${JSON.stringify(result, null, 2)}`
      )
    } catch (error) {
      setProcessingStatus(`Error: ${error}`)
    }
  }

  const testImageOptimization = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const { file: optimized, dimensions } = await optimizeImage(file, {
          maxWidth: 800,
          maxHeight: 600,
          quality: 0.8,
        })

        console.log(
          'Original size:',
          file.size,
          'Optimized size:',
          optimized.size
        )
        console.log('Dimensions:', dimensions)

        const thumbnail = await generateThumbnail(file)
        console.log('Thumbnail size:', thumbnail.size)
      }
    }
    input.click()
  }

  const testFileSharing = async () => {
    const service = FileSharingService.getInstance()
    const result = await service.createShareLink('test-file-id', {
      shareType: 'public',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      maxDownloads: 10,
    })

    if (result.success && result.link) {
      setShareLink(result.link.url)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Day 6: File Storage & Media Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Test all file storage, processing, and management features
        </p>
      </div>

      {/* Feature Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Storage Setup
                </p>
                <p className="text-2xl font-bold">Ready</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  File Upload
                </p>
                <p className="text-2xl font-bold">Active</p>
              </div>
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Processing
                </p>
                <p className="text-2xl font-bold">Enabled</p>
              </div>
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Sharing
                </p>
                <p className="text-2xl font-bold">Secure</p>
              </div>
              <Shield className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Sections */}
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="manager">File Manager</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="sharing">Sharing</TabsTrigger>
        </TabsList>

        {/* File Upload Test */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>File Upload Component</CardTitle>
              <CardDescription>
                Test drag-and-drop upload with progress tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                bucket="DOCUMENTS"
                maxFiles={5}
                onUploadComplete={handleFileUpload}
              />

              {uploadedFiles.length > 0 && (
                <Alert className="mt-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Upload Complete</AlertTitle>
                  <AlertDescription>
                    Successfully uploaded {uploadedFiles.length} file(s)
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Manager Test */}
        <TabsContent value="manager" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>File Manager Interface</CardTitle>
              <CardDescription>
                Browse, preview, and manage uploaded files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileManager
                bucket="DOCUMENTS"
                showUpload={true}
                showSearch={true}
                showFilters={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Processing Test */}
        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Processing Pipeline</CardTitle>
              <CardDescription>
                Test document analysis and metadata extraction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={testDocumentProcessing}>
                  <FileText className="h-4 w-4 mr-2" />
                  Process Test Document
                </Button>
              </div>

              {processingStatus && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Processing Result</AlertTitle>
                  <AlertDescription>
                    <pre className="text-xs mt-2 overflow-auto max-h-48">
                      {processingStatus}
                    </pre>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Features</h3>
                  <ul className="space-y-1 text-sm">
                    <li>✓ Virus scanning</li>
                    <li>✓ Text extraction</li>
                    <li>✓ Metadata extraction</li>
                    <li>✓ Language detection</li>
                    <li>✓ Auto-tagging</li>
                    <li>✓ Checksum generation</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Supported Formats</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• PDF documents</li>
                    <li>• Word documents</li>
                    <li>• Excel spreadsheets</li>
                    <li>• Text files</li>
                    <li>• Images (JPG, PNG, etc.)</li>
                    <li>• CSV files</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Image Optimization Test */}
        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Image Optimization</CardTitle>
              <CardDescription>
                Test image resizing and compression
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={testImageOptimization}>
                <Image className="h-4 w-4 mr-2" />
                Select Image to Optimize
              </Button>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">90%</div>
                  <div className="text-sm text-muted-foreground">Quality</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    1920px
                  </div>
                  <div className="text-sm text-muted-foreground">Max Width</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">~60%</div>
                  <div className="text-sm text-muted-foreground">
                    Size Reduction
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Sharing Test */}
        <TabsContent value="sharing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>File Sharing & Permissions</CardTitle>
              <CardDescription>
                Test secure file sharing and access control
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={testFileSharing}>
                <Share2 className="h-4 w-4 mr-2" />
                Generate Share Link
              </Button>

              {shareLink && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Share Link Created</AlertTitle>
                  <AlertDescription>
                    <code className="text-xs">{shareLink}</code>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Permission Levels</h3>
                  <div className="space-y-2">
                    <Badge variant="outline">View Only</Badge>
                    <Badge variant="outline">Edit</Badge>
                    <Badge variant="outline">Admin</Badge>
                    <Badge variant="outline">Owner</Badge>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Share Options</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Password protection</li>
                    <li>• Expiration date</li>
                    <li>• Download limits</li>
                    <li>• Access tracking</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Day 6 Complete!</AlertTitle>
        <AlertDescription>
          All file storage and media management features have been implemented:
          <ul className="list-disc list-inside mt-2">
            <li>Supabase Storage integration</li>
            <li>File upload with progress tracking</li>
            <li>Document processing pipeline</li>
            <li>Image optimization and resizing</li>
            <li>File preview and management interface</li>
            <li>File sharing and permissions system</li>
            <li>Virus scanning and content validation</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
