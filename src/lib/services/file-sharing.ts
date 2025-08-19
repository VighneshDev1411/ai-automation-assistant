import { supabase } from '@/lib/supabase/storage'
import React, { useState } from 'react'

export type PermissionLevel = 'view' | 'edit' | 'admin' | 'owner'
export type ShareType = 'private' | 'public' | 'restricted' | 'password'

export interface FilePermission {
  id: string
  fileId: string
  userId?: string
  email?: string
  permissionLevel: PermissionLevel
  expiresAt?: Date
  createdAt: Date
  createdBy: string
}

export interface ShareLink {
  id: string
  fileId: string
  url: string
  shortCode: string
  shareType: ShareType
  password?: string
  expiresAt?: Date
  maxDownloads?: number
  currentDownloads: number
  createdAt: Date
  createdBy: string
  lastAccessedAt?: Date
}

export interface ShareSettings {
  allowPublicAccess: boolean
  requireAuthentication: boolean
  allowDownload: boolean
  allowPrint: boolean
  watermark: boolean
  trackAccess: boolean
  notifyOnAccess: boolean
  autoExpire: boolean
  expireDays: number
}

// File sharing and permission service

export class FileSharingService {
  private static instance: FileSharingService

  static getInstance(): FileSharingService {
    if (!FileSharingService.instance) {
      FileSharingService.instance = new FileSharingService()
    }
    return FileSharingService.instance
  }

  // Share file only with the specific users

  async shareWithUsers(
    fileId: string,
    recipients: Array<{ email: string; permission: PermissionLevel }>,
    options?: {
      message?: string
      expiresAt?: Date
      notifyRecipients?: boolean
    }
  ): Promise<{ success: boolean; permissions: FilePermission[] }> {
    try {
      const permissions: FilePermission[] = []

      for (const recipient of recipients) {
        const permission: FilePermission = {
          id: crypto.randomUUID(),
          fileId,
          email: recipient.email,
          permissionLevel: recipient.permission,
          expiresAt: options?.expiresAt,
          createdAt: new Date(),
          createdBy: 'current-user-id', // would get from auth context
        }

        // Store permission in database

        const { data, error } = await supabase
          .from('file_permissions')
          .insert(permission)
          .select()
          .single()

        if (error) throw error

        // Send notification email if it is requested

        if (options?.notifyRecipients) {
          await this.sendShareNotification(
            recipient.email,
            fileId,
            options.message
          )
        }
      }

      return { success: true, permissions }
    } catch (error) {
      console.error('Share error: ', error)
      return { success: false, permissions: [] }
    }
  }

  async createShareLink(
    fileId: string,
    settings: {
      shareType: ShareType
      password?: string
      expiresAt?: Date
      maxDownloads?: number
    }
  ): Promise<{ success: boolean; link?: ShareLink }> {
    try {
      const shortCode = this.generateShortCode()
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      const shareLink: ShareLink = {
        id: crypto.randomUUID(),
        fileId,
        url: `${baseUrl}/share/${shortCode}`,
        shortCode,
        shareType: settings.shareType,
        password: settings.password
          ? await this.hashPassword(settings.password)
          : undefined,
        expiresAt: settings.expiresAt,
        maxDownloads: settings.maxDownloads,
        currentDownloads: 0,
        createdAt: new Date(),
        createdBy: 'current-user-id',
      }

      // Store in database
      const { data, error } = await supabase
        .from('share_links')
        .insert(shareLink)
        .select()
        .single()

      if (error) throw error

      return { success: true, link: data }
    } catch (error) {
      console.error('Create share link error:', error)
      return { success: false }
    }
  }

  async getFilePermissions(fileId: string): Promise<FilePermission[]> {
    try {
      const { data, error } = await supabase
        .from('file_permissions')
        .select('*')
        .eq('fileId', fileId)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Get permissions error: ', error)
      return []
    }
  }

  async updatePermission(
    permissionId: string,
    updates: Partial<FilePermission>
  ): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('file_permissions')
        .update(updates)
        .eq('id', permissionId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Update permission error:', error)
      return { success: false }
    }
  }

  async revokeAccess(permissionId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('file_permissions')
        .delete()
        .eq('id', permissionId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Revoke access error:', error)
      return { success: false }
    }
  }

  async checkPermission(
    fileId: string,
    userId: string
  ): Promise<PermissionLevel | null> {
    try {
      const { data, error } = await supabase
        .from('file_permissions')
        .select('permissionLevel')
        .eq('fileId', fileId)
        .eq('userId', userId)
        .single()

      if (error) return null
      return data?.permissionLevel || null
    } catch (error) {
      console.error('Check permission error:', error)
      return null
    }
  }

  /**
   * Validate share link access
   */
  async validateShareLink(
    shortCode: string,
    password?: string
  ): Promise<{ valid: boolean; fileId?: string }> {
    try {
      const { data, error } = await supabase
        .from('share_links')
        .select('*')
        .eq('shortCode', shortCode)
        .single()

      if (error || !data) return { valid: false }

      // Check expiration
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        return { valid: false }
      }

      // Check download limit
      if (data.maxDownloads && data.currentDownloads >= data.maxDownloads) {
        return { valid: false }
      }

      // Check password
      if (data.password && password) {
        const isValid = await this.verifyPassword(password, data.password)
        if (!isValid) return { valid: false }
      }

      // Update access stats
      await supabase
        .from('share_links')
        .update({
          currentDownloads: data.currentDownloads + 1,
          lastAccessedAt: new Date(),
        })
        .eq('id', data.id)

      return { valid: true, fileId: data.fileId }
    } catch (error) {
      console.error('Validate share link error:', error)
      return { valid: false }
    }
  }

  /**
   * Get share statistics
   */
  async getShareStats(fileId: string): Promise<{
    totalShares: number
    activeLinks: number
    totalDownloads: number
    uniqueUsers: number
  }> {
    try {
      // Get permission count
      const { count: permissionCount } = await supabase
        .from('file_permissions')
        .select('*', { count: 'exact', head: true })
        .eq('fileId', fileId)

      // Get share links stats
      const { data: links } = await supabase
        .from('share_links')
        .select('currentDownloads')
        .eq('fileId', fileId)

      const activeLinks =
        links?.filter(l => {
          // Check if link is still active
          return true // Add expiration logic
        }).length || 0

      const totalDownloads =
        links?.reduce((sum, l) => sum + l.currentDownloads, 0) || 0

      return {
        totalShares: permissionCount || 0,
        activeLinks,
        totalDownloads,
        uniqueUsers: permissionCount || 0,
      }
    } catch (error) {
      console.error('Get share stats error:', error)
      return {
        totalShares: 0,
        activeLinks: 0,
        totalDownloads: 0,
        uniqueUsers: 0,
      }
    }
  }

  /**
   * Helper methods
   */
  private generateShortCode(length = 8): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    const passwordHash = await this.hashPassword(password)
    return passwordHash === hash
  }

  private async sendShareNotification(
    email: string,
    fileId: string,
    message?: string
  ): Promise<void> {
    // Implement email notification
    // This would integrate with your email service
    console.log(`Sending share notification to ${email} for file ${fileId}`)
  }
}

/**
 * Permission Guard Hook for React
 */
export function useFilePermission(fileId: string) {
  const [permission, setPermission] = useState<PermissionLevel | null>(null)
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    const checkPermission = async () => {
      const service = FileSharingService.getInstance()
      const userId = 'current-user-id' // Get from auth context
      const perm = await service.checkPermission(fileId, userId)
      setPermission(perm)
      setLoading(false)
    }

    checkPermission()
  }, [fileId])

  return {
    permission,
    loading,
    canView: permission !== null,
    canEdit:
      permission === 'edit' || permission === 'admin' || permission === 'owner',
    canAdmin: permission === 'admin' || permission === 'owner',
    isOwner: permission === 'owner',
  }
}
