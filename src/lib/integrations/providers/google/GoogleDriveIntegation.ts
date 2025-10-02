// src/lib/integrations/providers/google/GoogleDriveIntegration.ts

import { drive_v3, google } from 'googleapis'
import { GoogleIntegration, GoogleCredentials, GoogleConfig, handleGoogleAPIError, GoogleRateLimiter } from './GoogleIntegration'
// import { IntegrationAction, IntegrationTrigger } from '../bas
import { IntegrationAction, IntegrationTrigger } from '../../base-integration'
import { Readable } from 'stream'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: number
  createdTime: Date
  modifiedTime: Date
  webViewLink: string
  webContentLink?: string
  parents?: string[]
  owners: DriveUser[]
  permissions: DrivePermission[]
  description?: string
  thumbnailLink?: string
  version?: string
}

export interface DriveUser {
  displayName: string
  emailAddress: string
  photoLink?: string
}

export interface DrivePermission {
  id: string
  type: 'user' | 'group' | 'domain' | 'anyone'
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader'
  emailAddress?: string
  domain?: string
}

export interface UploadOptions {
  name: string
  content: Buffer | Readable | string
  mimeType?: string
  parents?: string[]
  description?: string
  convertToGoogleFormat?: boolean
}

export interface SearchOptions {
  query?: string
  name?: string
  mimeType?: string
  parents?: string[]
  trashed?: boolean
  starred?: boolean
  sharedWithMe?: boolean
  createdAfter?: Date
  createdBefore?: Date
  modifiedAfter?: Date
  modifiedBefore?: Date
  maxResults?: number
}

export interface ShareOptions {
  fileId: string
  type: 'user' | 'group' | 'domain' | 'anyone'
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader'
  emailAddress?: string
  domain?: string
  sendNotificationEmail?: boolean
  emailMessage?: string
}

export class GoogleDriveIntegration extends GoogleIntegration {
  private drive: drive_v3.Drive
  private rateLimiter: GoogleRateLimiter

  constructor(config: GoogleConfig, credentials?: GoogleCredentials) {
    super(config, credentials)
    
    const auth = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    )
    
    if (credentials) {
      auth.setCredentials(credentials)
    }

    this.drive = google.drive({ version: 'v3', auth })
    this.rateLimiter = new GoogleRateLimiter(1000, 100000) // 1000 requests per 100 seconds
  }

  getName(): string {
    return 'Google Drive'
  }

  getDescription(): string {
    return 'Upload, download, and manage files in Google Drive'
  }

  getActions(): IntegrationAction[] {
    return [
      {
        id: 'upload_file',
        name: 'Upload File',
        description: 'Upload a file to Google Drive',
        requiresAuth: true,
        inputs: [
          { id: 'fileName', name: 'File Name', type: 'string', required: true, description: 'File name' },
          { id: 'content', name: 'Content', type: 'string', required: true, description: 'File content (base64 encoded)' },
          { id: 'mimeType', name: 'MIME Type', type: 'string', required: false, description: 'MIME type of the file' },
          { id: 'parentFolderId', name: 'Parent Folder ID', type: 'string', required: false, description: 'Parent folder ID' },
          { id: 'description', name: 'Description', type: 'string', required: false, description: 'File description' },
          { id: 'convertToGoogle', name: 'Convert to Google', type: 'boolean', required: false, description: 'Convert to Google format' }
        ],
        outputs: [
          { id: 'fileId', name: 'File ID', type: 'string', description: 'Uploaded file ID' },
          { id: 'fileName', name: 'File Name', type: 'string', description: 'File name' },
          { id: 'webViewLink', name: 'Web View Link', type: 'string', description: 'Link to view file' },
          { id: 'webContentLink', name: 'Web Content Link', type: 'string', description: 'Direct download link' }
        ]
      },
      {
        id: 'download_file',
        name: 'Download File',
        description: 'Download a file from Google Drive',
        requiresAuth: true,
        inputs: [
          { id: 'fileId', name: 'File ID', type: 'string', required: true, description: 'File ID to download' },
          { id: 'exportFormat', name: 'Export Format', type: 'string', required: false, description: 'Export format for Google Docs/Sheets' }
        ],
        outputs: [
          { id: 'content', name: 'Content', type: 'string', description: 'File content (base64 encoded)' },
          { id: 'fileName', name: 'File Name', type: 'string', description: 'File name' },
          { id: 'mimeType', name: 'MIME Type', type: 'string', description: 'File MIME type' },
          { id: 'size', name: 'Size', type: 'number', description: 'File size in bytes' }
        ]
      },
      {
        id: 'search_files',
        name: 'Search Files',
        description: 'Search for files in Google Drive',
        requiresAuth: true,
        inputs: [
          { id: 'query', name: 'Query', type: 'string', required: false, description: 'Search query' },
          { id: 'name', name: 'Name', type: 'string', required: false, description: 'File name filter' },
          { id: 'mimeType', name: 'MIME Type', type: 'string', required: false, description: 'MIME type filter' },
          { id: 'parentFolderId', name: 'Parent Folder ID', type: 'string', required: false, description: 'Parent folder ID' },
          { id: 'maxResults', name: 'Max Results', type: 'number', required: false, description: 'Maximum results (default: 10)' }
        ],
        outputs: [
          { id: 'files', name: 'Files', type: 'array', description: 'Array of found files' },
          { id: 'totalCount', name: 'Total Count', type: 'number', description: 'Total number of matching files' }
        ]
      },
      {
        id: 'create_folder',
        name: 'Create Folder',
        description: 'Create a new folder in Google Drive',
        requiresAuth: true,
        inputs: [
          { id: 'name', name: 'Name', type: 'string', required: true, description: 'Folder name' },
          { id: 'parentFolderId', name: 'Parent Folder ID', type: 'string', required: false, description: 'Parent folder ID' },
          { id: 'description', name: 'Description', type: 'string', required: false, description: 'Folder description' }
        ],
        outputs: [
          { id: 'folderId', name: 'Folder ID', type: 'string', description: 'Created folder ID' },
          { id: 'name', name: 'Name', type: 'string', description: 'Folder name' },
          { id: 'webViewLink', name: 'Web View Link', type: 'string', description: 'Link to view folder' }
        ]
      },
      {
        id: 'share_file',
        name: 'Share File',
        description: 'Share a file or folder with users',
        requiresAuth: true,
        inputs: [
          { id: 'fileId', name: 'File ID', type: 'string', required: true, description: 'File or folder ID' },
          { id: 'type', name: 'Type', type: 'string', required: true, description: 'user, group, domain, or anyone' },
          { id: 'role', name: 'Role', type: 'string', required: true, description: 'owner, writer, commenter, or reader' },
          { id: 'emailAddress', name: 'Email Address', type: 'string', required: false, description: 'Email address for user/group' },
          { id: 'sendNotification', name: 'Send Notification', type: 'boolean', required: false, description: 'Send notification email' },
          { id: 'message', name: 'Message', type: 'string', required: false, description: 'Custom message' }
        ],
        outputs: [
          { id: 'permissionId', name: 'Permission ID', type: 'string', description: 'Permission ID' },
          { id: 'link', name: 'Link', type: 'string', description: 'Shareable link' },
          { id: 'success', name: 'Success', type: 'boolean', description: 'Operation success status' }
        ]
      },
      {
        id: 'copy_file',
        name: 'Copy File',
        description: 'Create a copy of a file',
        requiresAuth: true,
        inputs: [
          { id: 'fileId', name: 'File ID', type: 'string', required: true, description: 'File ID to copy' },
          { id: 'name', name: 'Name', type: 'string', required: false, description: 'Name for the copy' },
          { id: 'parentFolderId', name: 'Parent Folder ID', type: 'string', required: false, description: 'Parent folder for copy' }
        ],
        outputs: [
          { id: 'fileId', name: 'File ID', type: 'string', description: 'Copied file ID' },
          { id: 'name', name: 'Name', type: 'string', description: 'Copy file name' },
          { id: 'webViewLink', name: 'Web View Link', type: 'string', description: 'Link to view copy' }
        ]
      },
      {
        id: 'move_file',
        name: 'Move File',
        description: 'Move a file to a different folder',
        requiresAuth: true,
        inputs: [
          { id: 'fileId', name: 'File ID', type: 'string', required: true, description: 'File ID to move' },
          { id: 'newParentFolderId', name: 'New Parent Folder ID', type: 'string', required: true, description: 'New parent folder ID' },
          { id: 'removeFromCurrentParents', name: 'Remove From Current Parents', type: 'boolean', required: false, description: 'Remove from current parents' }
        ],
        outputs: [
          { id: 'fileId', name: 'File ID', type: 'string', description: 'Moved file ID' },
          { id: 'success', name: 'Success', type: 'boolean', description: 'Operation success status' }
        ]
      },
      {
        id: 'delete_file',
        name: 'Delete File',
        description: 'Delete a file or folder',
        requiresAuth: true,
        inputs: [
          { id: 'fileId', name: 'File ID', type: 'string', required: true, description: 'File or folder ID to delete' },
          { id: 'permanent', name: 'Permanent', type: 'boolean', required: false, description: 'Permanently delete (skip trash)' }
        ],
        outputs: [
          { id: 'success', name: 'Success', type: 'boolean', description: 'Operation success status' },
          { id: 'fileId', name: 'File ID', type: 'string', description: 'Deleted file ID' }
        ]
      },
      {
        id: 'get_file_info',
        name: 'Get File Info',
        description: 'Get detailed information about a file',
        requiresAuth: true,
        inputs: [
          { id: 'fileId', name: 'File ID', type: 'string', required: true, description: 'File ID' }
        ],
        outputs: [
          { id: 'file', name: 'File', type: 'object', description: 'File information' },
          { id: 'permissions', name: 'Permissions', type: 'array', description: 'File permissions' },
          { id: 'owners', name: 'Owners', type: 'array', description: 'File owners' }
        ]
      }
    ]
  }

  getTriggers(): IntegrationTrigger[] {
    return [
      {
        id: 'file_uploaded',
        name: 'File Uploaded',
        description: 'Triggers when a new file is uploaded',
        type: 'webhook',
        outputs: [
          { id: 'fileId', name: 'File ID', type: 'string', description: 'Uploaded file ID' },
          { id: 'fileName', name: 'File Name', type: 'string', description: 'File name' },
          { id: 'mimeType', name: 'MIME Type', type: 'string', description: 'File MIME type' }
        ]
      },
      {
        id: 'file_updated',
        name: 'File Updated',
        description: 'Triggers when a file is modified',
        type: 'webhook',
        outputs: [
          { id: 'fileId', name: 'File ID', type: 'string', description: 'Updated file ID' },
          { id: 'fileName', name: 'File Name', type: 'string', description: 'File name' },
          { id: 'modifiedTime', name: 'Modified Time', type: 'string', description: 'Last modified time' }
        ]
      },
      {
        id: 'file_shared',
        name: 'File Shared',
        description: 'Triggers when a file is shared',
        type: 'webhook',
        outputs: [
          { id: 'fileId', name: 'File ID', type: 'string', description: 'Shared file ID' },
          { id: 'fileName', name: 'File Name', type: 'string', description: 'File name' },
          { id: 'sharedWith', name: 'Shared With', type: 'string', description: 'User/group shared with' }
        ]
      },
      {
        id: 'folder_created',
        name: 'Folder Created',
        description: 'Triggers when a new folder is created',
        type: 'webhook',
        outputs: [
          { id: 'folderId', name: 'Folder ID', type: 'string', description: 'Created folder ID' },
          { id: 'folderName', name: 'Folder Name', type: 'string', description: 'Folder name' }
        ]
      }
    ]
  }

  async executeAction(actionId: string, inputs: Record<string, any>): Promise<any> {
    await this.rateLimiter.checkRateLimit()
    
    try {
      switch (actionId) {
        case 'upload_file':
          return await this.uploadFile({
            fileName: inputs.fileName,
            content: inputs.content,
            mimeType: inputs.mimeType,
            parentFolderId: inputs.parentFolderId,
            description: inputs.description,
            convertToGoogle: inputs.convertToGoogle
          })
        case 'download_file':
          return await this.downloadFile(inputs.fileId, inputs.exportFormat)
        case 'search_files':
          return await this.searchFiles(inputs)
        case 'create_folder':
          return await this.createFolder(inputs.name, inputs.parentFolderId, inputs.description)
        case 'share_file':
          return await this.shareFile({
            fileId: inputs.fileId,
            type: inputs.type,
            role: inputs.role,
            emailAddress: inputs.emailAddress,
            sendNotificationEmail: inputs.sendNotification,
            emailMessage: inputs.message
          })
        case 'copy_file':
          return await this.copyFile(inputs.fileId, inputs.name, inputs.parentFolderId)
        case 'move_file':
          return await this.moveFile(inputs.fileId, inputs.newParentFolderId, inputs.removeFromCurrentParents)
        case 'delete_file':
          return await this.deleteFile(inputs.fileId, inputs.permanent)
        case 'get_file_info':
          return await this.getFileInfo(inputs.fileId)
        default:
          throw new Error(`Unknown action: ${actionId}`)
      }
    } catch (error) {
      handleGoogleAPIError(error)
    }
  }

  // Upload file to Drive
  async uploadFile(options: {
    fileName: string
    content: string
    mimeType?: string
    parentFolderId?: string
    description?: string
    convertToGoogle?: boolean
  }): Promise<{
    fileId: string
    fileName: string
    webViewLink: string
    webContentLink?: string
  }> {
    const content = Buffer.from(options.content, 'base64')
    const mimeType = options.mimeType || 'application/octet-stream'
    
    const fileMetadata: any = {
      name: options.fileName,
      description: options.description,
    }

    if (options.parentFolderId) {
      fileMetadata.parents = [options.parentFolderId]
    }

    const media = {
      mimeType,
      body: Readable.from(content)
    }

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id,name,webViewLink,webContentLink'
    })

    return {
      fileId: response.data.id!,
      fileName: response.data.name!,
      webViewLink: response.data.webViewLink!,
      webContentLink: response.data.webContentLink ?? undefined
    }
  }

  // Download file from Drive
  async downloadFile(fileId: string, exportFormat?: string): Promise<{
    content: string
    fileName: string
    mimeType: string
    size: number
  }> {
    // First get file metadata
    const fileInfo = await this.drive.files.get({
      fileId,
      fields: 'name,mimeType,size'
    })

    let response: any

    // Check if it's a Google Workspace file that needs export
    const googleMimeTypes = [
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation',
      'application/vnd.google-apps.drawing'
    ]

    if (googleMimeTypes.includes(fileInfo.data.mimeType!) && exportFormat) {
      response = await this.drive.files.export({
        fileId,
        mimeType: exportFormat
      }, { responseType: 'stream' })
    } else {
      response = await this.drive.files.get({
        fileId,
        alt: 'media'
      }, { responseType: 'stream' })
    }

    // Convert stream to buffer
    const chunks: Buffer[] = []
    
    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => chunks.push(chunk))
      response.data.on('end', () => {
        const content = Buffer.concat(chunks)
        resolve({
          content: content.toString('base64'),
          fileName: fileInfo.data.name!,
          mimeType: exportFormat || fileInfo.data.mimeType!,
          size: content.length
        })
      })
      response.data.on('error', reject)
    })
  }

  // Search files in Drive
  async searchFiles(options: SearchOptions): Promise<{
    files: DriveFile[]
    totalCount: number
  }> {
    const queryParts: string[] = []

    if (options.query) queryParts.push(options.query)
    if (options.name) queryParts.push(`name contains '${options.name}'`)
    if (options.mimeType) queryParts.push(`mimeType='${options.mimeType}'`)
    if (options.parents && options.parents.length > 0) {
      queryParts.push(`'${options.parents[0]}' in parents`)
    }
    if (options.trashed !== undefined) queryParts.push(`trashed=${options.trashed}`)
    if (options.starred !== undefined) queryParts.push(`starred=${options.starred}`)
    if (options.sharedWithMe !== undefined) queryParts.push(`sharedWithMe=${options.sharedWithMe}`)

    const q = queryParts.join(' and ')
    const pageSize = Math.min(options.maxResults || 10, 1000)

    const response = await this.drive.files.list({
      q,
      pageSize,
      fields: 'nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents,owners,description,thumbnailLink,version)'
    })

    const files: DriveFile[] = response.data.files?.map(file => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size ? parseInt(file.size) : undefined,
      createdTime: new Date(file.createdTime!),
      modifiedTime: new Date(file.modifiedTime!),
      webViewLink: file.webViewLink!,
      webContentLink: file.webContentLink ?? undefined,
      parents: file.parents ?? undefined,
      owners: file.owners?.map(owner => ({
        displayName: owner.displayName!,
        emailAddress: owner.emailAddress!,
        photoLink: owner.photoLink ?? undefined
      })) || [],
      permissions: [], // Would need separate call to get permissions
      description: file.description ?? undefined,
      thumbnailLink: file.thumbnailLink ?? undefined,
      version: file.version ?? undefined
    })) || []

    return {
      files,
      totalCount: files.length // For simplicity, actual implementation might use pagination
    }
  }

  // Create folder
  async createFolder(name: string, parentFolderId?: string, description?: string): Promise<{
    folderId: string
    name: string
    webViewLink: string
  }> {
    const fileMetadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      description
    }

    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId]
    }

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id,name,webViewLink'
    })

    return {
      folderId: response.data.id!,
      name: response.data.name!,
      webViewLink: response.data.webViewLink!
    }
  }

  // Share file
  async shareFile(options: ShareOptions): Promise<{
    permissionId: string
    link: string
    success: boolean
  }> {
    const permission: any = {
      type: options.type,
      role: options.role
    }

    if (options.emailAddress) {
      permission.emailAddress = options.emailAddress
    }

    if (options.domain) {
      permission.domain = options.domain
    }

    const response = await this.drive.permissions.create({
      fileId: options.fileId,
      requestBody: permission,
      sendNotificationEmail: options.sendNotificationEmail || false,
      emailMessage: options.emailMessage,
      fields: 'id'
    })

    // Get the file's web view link
    const fileInfo = await this.drive.files.get({
      fileId: options.fileId,
      fields: 'webViewLink'
    })

    return {
      permissionId: response.data.id!,
      link: fileInfo.data.webViewLink!,
      success: true
    }
  }

  // Copy file
  async copyFile(fileId: string, name?: string, parentFolderId?: string): Promise<{
    fileId: string
    name: string
    webViewLink: string
  }> {
    const fileMetadata: any = {}

    if (name) {
      fileMetadata.name = name
    }

    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId]
    }

    const response = await this.drive.files.copy({
      fileId,
      requestBody: fileMetadata,
      fields: 'id,name,webViewLink'
    })

    return {
      fileId: response.data.id!,
      name: response.data.name!,
      webViewLink: response.data.webViewLink!
    }
  }

  // Move file
  async moveFile(
    fileId: string, 
    newParentFolderId: string, 
    removeFromCurrentParents = true
  ): Promise<{
    fileId: string
    success: boolean
  }> {
    let removeParents: string | undefined

    if (removeFromCurrentParents) {
      // Get current parents
      const fileInfo = await this.drive.files.get({
        fileId,
        fields: 'parents'
      })
      removeParents = fileInfo.data.parents?.join(',')
    }

    await this.drive.files.update({
      fileId,
      addParents: newParentFolderId,
      removeParents,
      fields: 'id,parents'
    })

    return {
      fileId,
      success: true
    }
  }

  // Delete file
  async deleteFile(fileId: string, permanent = false): Promise<{
    success: boolean
    fileId: string
  }> {
    if (permanent) {
      await this.drive.files.delete({ fileId })
    } else {
      // Move to trash
      await this.drive.files.update({
        fileId,
        requestBody: { trashed: true }
      })
    }

    return {
      success: true,
      fileId
    }
  }

  // Get file information
  async getFileInfo(fileId: string): Promise<{
    file: DriveFile
    permissions: DrivePermission[]
    owners: DriveUser[]
  }> {
    const [fileResponse, permissionsResponse] = await Promise.all([
      this.drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents,owners,description,thumbnailLink,version'
      }),
      this.drive.permissions.list({
        fileId,
        fields: 'permissions(id,type,role,emailAddress,domain)'
      })
    ])

    const file = fileResponse.data
    const permissions = permissionsResponse.data.permissions || []

    return {
      file: {
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size ? parseInt(file.size) : undefined,
        createdTime: new Date(file.createdTime!),
        modifiedTime: new Date(file.modifiedTime!),
        webViewLink: file.webViewLink!,
        webContentLink: file.webContentLink ?? undefined,
        parents: file.parents ?? undefined,
        owners: file.owners?.map(owner => ({
          displayName: owner.displayName!,
          emailAddress: owner.emailAddress!,
          photoLink: owner.photoLink ?? undefined
        })) || [],
        permissions: [],
        description: file.description ?? undefined,
        thumbnailLink: file.thumbnailLink ?? undefined,
        version: file.version ?? undefined
      },
      permissions: permissions.map(permission => ({
        id: permission.id!,
        type: permission.type as any,
        role: permission.role as any,
        emailAddress: permission.emailAddress ?? undefined,
        domain: permission.domain ?? undefined
      })),
      owners: file.owners?.map(owner => ({
        displayName: owner.displayName!,
        emailAddress: owner.emailAddress!,
        photoLink: owner.photoLink ?? undefined
      })) || []
    }
  }

  // Get shared drive (Team Drive) files
  async getSharedDriveFiles(driveId: string, maxResults = 10): Promise<DriveFile[]> {
    const response = await this.drive.files.list({
      driveId,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: maxResults,
      fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents,owners,description)'
    })

    return response.data.files?.map(file => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size ? parseInt(file.size) : undefined,
      createdTime: new Date(file.createdTime!),
      modifiedTime: new Date(file.modifiedTime!),
      webViewLink: file.webViewLink!,
      webContentLink: file.webContentLink ?? undefined,
      parents: file.parents ?? undefined,
      owners: file.owners?.map(owner => ({
        displayName: owner.displayName!,
        emailAddress: owner.emailAddress!,
        photoLink: owner.photoLink ?? undefined
      })) || [],
      permissions: [],
      description: file.description ?? undefined
    })) || []
  }
}