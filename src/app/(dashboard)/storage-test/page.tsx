// src/app/(dashboard)/storage-test/page.tsx - SIMPLIFIED VERSION
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileUpload } from '@/components/storage/file-upload'
import { useAuth } from '@/lib/auth/auth-context'
import { Badge } from '@/components/ui/badge'
import { Upload, CheckCircle, AlertCircle, User, Building } from 'lucide-react'

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

export default function StorageTestPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [authTestResult, setAuthTestResult] = useState<string>('')
  const { user, currentOrganization, signIn, signOut } = useAuth()

  const handleFileUpload = (files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files])
    console.log('Files uploaded:', files)
  }

  const handleError = (error: string) => {
    console.error('Upload error:', error)
  }

  const testAuth = async () => {
    try {
      setAuthTestResult('Testing...')
      
      if (!user) {
        setAuthTestResult('❌ No user found - please sign in')
        return
      }

      if (!currentOrganization) {
        setAuthTestResult('❌ No organization found - please select/create one')
        return
      }

      setAuthTestResult('✅ Authentication working! User: ' + user.email + ', Org: ' + currentOrganization.name)
    } catch (error) {
      setAuthTestResult('❌ Auth test failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const testEmailAuth = async () => {
    try {
      setAuthTestResult('Testing email authentication...')
      
      // Test with a demo account - replace with your test credentials
      await signIn('test@example.com', 'testpassword123')
      setAuthTestResult('✅ Email auth successful!')
    } catch (error) {
      setAuthTestResult('❌ Email auth failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Storage & Auth Test</h1>
        <p className="text-muted-foreground mt-2">
          Test file upload functionality and authentication
        </p>
      </div>

      {/* Auth Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">User Status</p>
                <p className="text-lg font-bold">{user ? '✅ Signed In' : '❌ Not Signed In'}</p>
                {user && <p className="text-xs text-muted-foreground">{user.email}</p>}
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Organization</p>
                <p className="text-lg font-bold">{currentOrganization ? '✅ Selected' : '❌ None'}</p>
                {currentOrganization && <p className="text-xs text-muted-foreground">{currentOrganization.name}</p>}
              </div>
              <Building className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Storage</p>
                <p className="text-lg font-bold">{user && currentOrganization ? '✅ Ready' : '❌ Not Ready'}</p>
              </div>
              <Upload className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auth Test Section */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
          <CardDescription>Test your authentication setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testAuth} variant="outline">
              Test Current Auth
            </Button>
            <Button onClick={testEmailAuth} variant="outline">
              Test Email Auth
            </Button>
            {user && (
              <Button onClick={() => signOut()} variant="destructive">
                Sign Out
              </Button>
            )}
          </div>
          
          {authTestResult && (
            <Alert>
              <AlertDescription>{authTestResult}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* File Upload Test */}
      {user && currentOrganization ? (
        <Card>
          <CardHeader>
            <CardTitle>File Upload Test</CardTitle>
            <CardDescription>Test drag-and-drop upload with progress tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              bucket="DOCUMENTS"
              folder="test-uploads"
              maxFiles={5}
              onUploadComplete={handleFileUpload}
              onError={handleError}
            />

            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-4">Upload Results ({uploadedFiles.length})</h4>
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div>
                          {file.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : file.status === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Upload className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)} • {file.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          file.status === 'success' ? 'default' :
                          file.status === 'error' ? 'destructive' : 'secondary'
                        }>
                          {file.status}
                        </Badge>
                        {file.status === 'success' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(file.url, '_blank')}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in and ensure you have an organization selected to test file uploads.
            {!user && " You need to sign in first."}
            {user && !currentOrganization && " You need to create or join an organization."}
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <strong>User ID:</strong> {user?.id || 'Not signed in'}
            </div>
            <div>
              <strong>User Email:</strong> {user?.email || 'Not signed in'}
            </div>
            <div>
              <strong>Organization ID:</strong> {currentOrganization?.id || 'None selected'}
            </div>
            <div>
              <strong>Organization Name:</strong> {currentOrganization?.name || 'None selected'}
            </div>
            <div>
              <strong>Total Uploaded Files:</strong> {uploadedFiles.length}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}