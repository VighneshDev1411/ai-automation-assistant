// src/lib/integrations/providers/google/GmailIntegration.ts

import { gmail_v1, google } from 'googleapis'
import { GoogleIntegration, GoogleCredentials, GoogleConfig, handleGoogleAPIError, GoogleRateLimiter } from './GoogleIntegration'
import { IntegrationAction, IntegrationTrigger } from '../../base-integration'

export interface EmailMessage {
  id: string
  threadId: string
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  htmlBody?: string
  attachments?: EmailAttachment[]
  labels: string[]
  isRead: boolean
  isStarred: boolean
  receivedAt: Date
  sentAt?: Date
}

export interface EmailAttachment {
  filename: string
  mimeType: string
  size: number
  attachmentId: string
  data?: string // base64 encoded
}

export interface SendEmailOptions {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  body: string
  isHtml?: boolean
  attachments?: {
    filename: string
    content: string | Buffer
    mimeType?: string
  }[]
  replyToMessageId?: string
}

export interface EmailSearchOptions {
  query?: string
  from?: string
  to?: string
  subject?: string
  hasAttachment?: boolean
  isUnread?: boolean
  isStarred?: boolean
  inFolder?: string
  after?: Date
  before?: Date
  maxResults?: number
}

export class GmailIntegration extends GoogleIntegration {
  private gmail: gmail_v1.Gmail
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

    this.gmail = google.gmail({ version: 'v1', auth })
    this.rateLimiter = new GoogleRateLimiter(250, 60000) // 250 requests per minute
  }

  getName(): string {
    return 'Gmail'
  }

  getDescription(): string {
    return 'Send, receive, and manage Gmail emails'
  }

  getActions(): IntegrationAction[] {
    return [
      {
        id: 'send_email',
        name: 'Send Email',
        description: 'Send an email via Gmail',
        requiresAuth: true,
        inputs: [
          { id: 'to', name: 'To', type: 'string', required: true, description: 'Recipient email addresses (comma separated)' },
          { id: 'subject', name: 'Subject', type: 'string', required: true, description: 'Email subject' },
          { id: 'body', name: 'Body', type: 'string', required: true, description: 'Email content' },
          { id: 'cc', name: 'CC', type: 'string', required: false, description: 'CC recipients (comma separated)' },
          { id: 'bcc', name: 'BCC', type: 'string', required: false, description: 'BCC recipients (comma separated)' },
          { id: 'isHtml', name: 'Is HTML', type: 'boolean', required: false, description: 'Send as HTML email' },
          { id: 'attachments', name: 'Attachments', type: 'array', required: false, description: 'File attachments' }
        ],
        outputs: [
          { id: 'messageId', name: 'Message ID', type: 'string', description: 'Sent message ID' },
          { id: 'threadId', name: 'Thread ID', type: 'string', description: 'Email thread ID' },
          { id: 'sentAt', name: 'Sent At', type: 'string', description: 'Timestamp when email was sent' }
        ]
      },
      {
        id: 'search_emails',
        name: 'Search Emails',
        description: 'Search for emails in Gmail',
        requiresAuth: true,
        inputs: [
          { id: 'query', name: 'Query', type: 'string', required: false, description: 'Gmail search query' },
          { id: 'from', name: 'From', type: 'string', required: false, description: 'Filter by sender' },
          { id: 'subject', name: 'Subject', type: 'string', required: false, description: 'Filter by subject' },
          { id: 'isUnread', name: 'Is Unread', type: 'boolean', required: false, description: 'Only unread emails' },
          { id: 'maxResults', name: 'Max Results', type: 'number', required: false, description: 'Maximum number of results (default: 10)' }
        ],
        outputs: [
          { id: 'emails', name: 'Emails', type: 'array', description: 'Array of found emails' },
          { id: 'totalCount', name: 'Total Count', type: 'number', description: 'Total number of matching emails' }
        ]
      },
      {
        id: 'get_email',
        name: 'Get Email',
        description: 'Get a specific email by ID',
        requiresAuth: true,
        inputs: [
          { id: 'messageId', name: 'Message ID', type: 'string', required: true, description: 'Gmail message ID' },
          { id: 'includeAttachments', name: 'Include Attachments', type: 'boolean', required: false, description: 'Include attachment data' }
        ],
        outputs: [
          { id: 'email', name: 'Email', type: 'object', description: 'Email details' },
          { id: 'attachments', name: 'Attachments', type: 'array', description: 'Email attachments' }
        ]
      },
      {
        id: 'mark_as_read',
        name: 'Mark as Read',
        description: 'Mark emails as read',
        requiresAuth: true,
        inputs: [
          { id: 'messageIds', name: 'Message IDs', type: 'array', required: true, description: 'Array of message IDs' }
        ],
        outputs: [
          { id: 'success', name: 'Success', type: 'boolean', description: 'Operation success status' },
          { id: 'updatedCount', name: 'Updated Count', type: 'number', description: 'Number of emails updated' }
        ]
      },
      {
        id: 'add_label',
        name: 'Add Label',
        description: 'Add labels to emails',
        requiresAuth: true,
        inputs: [
          { id: 'messageIds', name: 'Message IDs', type: 'array', required: true, description: 'Array of message IDs' },
          { id: 'labels', name: 'Labels', type: 'array', required: true, description: 'Labels to add' }
        ],
        outputs: [
          { id: 'success', name: 'Success', type: 'boolean', description: 'Operation success status' },
          { id: 'updatedCount', name: 'Updated Count', type: 'number', description: 'Number of emails updated' }
        ]
      },
      {
        id: 'reply_to_email',
        name: 'Reply to Email',
        description: 'Reply to an existing email',
        requiresAuth: true,
        inputs: [
          { id: 'messageId', name: 'Message ID', type: 'string', required: true, description: 'Original message ID' },
          { id: 'body', name: 'Body', type: 'string', required: true, description: 'Reply content' },
          { id: 'isHtml', name: 'Is HTML', type: 'boolean', required: false, description: 'Send as HTML' },
          { id: 'replyAll', name: 'Reply All', type: 'boolean', required: false, description: 'Reply to all recipients' }
        ],
        outputs: [
          { id: 'messageId', name: 'Message ID', type: 'string', description: 'Reply message ID' },
          { id: 'threadId', name: 'Thread ID', type: 'string', description: 'Email thread ID' }
        ]
      }
    ]
  }

  getTriggers(): IntegrationTrigger[] {
    return [
      {
        id: 'new_email',
        name: 'New Email Received',
        description: 'Triggers when a new email is received',
        type: 'webhook',
        outputs: [
          { id: 'email', name: 'Email', type: 'object', description: 'The received email' }
        ]
      },
      {
        id: 'email_labeled',
        name: 'Email Labeled',
        description: 'Triggers when an email receives a specific label',
        type: 'webhook',
        outputs: [
          { id: 'email', name: 'Email', type: 'object', description: 'The labeled email' },
          { id: 'label', name: 'Label', type: 'string', description: 'The label that was added' }
        ]
      },
      {
        id: 'email_starred',
        name: 'Email Starred',
        description: 'Triggers when an email is starred',
        type: 'webhook',
        outputs: [
          { id: 'email', name: 'Email', type: 'object', description: 'The starred email' }
        ]
      }
    ]
  }

  async executeAction(actionId: string, inputs: Record<string, any>): Promise<any> {
    await this.rateLimiter.checkRateLimit()
    
    try {
      switch (actionId) {
        case 'send_email':
          return await this.sendEmail(inputs as SendEmailOptions)
        case 'search_emails':
          return await this.searchEmails(inputs as EmailSearchOptions)
        case 'get_email':
          return await this.getEmail(inputs.messageId, inputs.includeAttachments)
        case 'mark_as_read':
          return await this.markAsRead(inputs.messageIds)
        case 'add_label':
          return await this.addLabels(inputs.messageIds, inputs.labels)
        case 'reply_to_email':
          return await this.replyToEmail(inputs.messageId, inputs.body, inputs.isHtml, inputs.replyAll)
        default:
          throw new Error(`Unknown action: ${actionId}`)
      }
    } catch (error) {
      handleGoogleAPIError(error)
    }
  }

  // Send email
  async sendEmail(options: SendEmailOptions): Promise<{
    messageId: string
    threadId: string
    sentAt: string
  }> {
    const email = this.buildEmailMessage(options)
    
    const response = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: email
      }
    })

    return {
      messageId: response.data.id!,
      threadId: response.data.threadId!,
      sentAt: new Date().toISOString()
    }
  }

  // Search emails
  async searchEmails(options: EmailSearchOptions): Promise<{
    emails: EmailMessage[]
    totalCount: number
  }> {
    const query = this.buildSearchQuery(options)
    const maxResults = options.maxResults || 10

    const response = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults
    })

    const messageIds = response.data.messages?.map(msg => msg.id!) || []
    const emails: EmailMessage[] = []

    // Fetch details for each message
    for (const messageId of messageIds) {
      try {
        const email = await this.getEmail(messageId)
        emails.push(email.email)
      } catch (error) {
        console.error(`Failed to fetch email ${messageId}:`, error)
      }
    }

    return {
      emails,
      totalCount: response.data.resultSizeEstimate || emails.length
    }
  }

  // Get specific email
  async getEmail(messageId: string, includeAttachments = false): Promise<{
    email: EmailMessage
    attachments: EmailAttachment[]
  }> {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    })

    const message = response.data
    const headers = message.payload?.headers || []
    
    // Extract email details
    const email: EmailMessage = {
      id: message.id!,
      threadId: message.threadId!,
      from: this.getHeaderValue(headers, 'From') || '',
      to: this.getHeaderValue(headers, 'To')?.split(',').map(s => s.trim()) || [],
      cc: this.getHeaderValue(headers, 'Cc')?.split(',').map(s => s.trim()) || undefined,
      bcc: this.getHeaderValue(headers, 'Bcc')?.split(',').map(s => s.trim()) || undefined,
      subject: this.getHeaderValue(headers, 'Subject') || '',
      body: this.extractTextBody(message.payload) || '',
      htmlBody: this.extractHtmlBody(message.payload) ?? undefined,
      labels: message.labelIds || [],
      isRead: !message.labelIds?.includes('UNREAD'),
      isStarred: message.labelIds?.includes('STARRED') || false,
      receivedAt: new Date(parseInt(message.internalDate!) || Date.now()),
      attachments: []
    }

    // Extract attachments
    const attachments: EmailAttachment[] = []
    if (includeAttachments) {
      const attachmentParts = this.findAttachments(message.payload)
      
      for (const part of attachmentParts) {
        if (part.body?.attachmentId) {
          try {
            const attachment = await this.gmail.users.messages.attachments.get({
              userId: 'me',
              messageId: messageId,
              id: part.body.attachmentId
            })

            attachments.push({
              filename: part.filename || 'attachment',
              mimeType: part.mimeType || 'application/octet-stream',
              size: part.body.size || 0,
              attachmentId: part.body.attachmentId,
              data: attachment.data.data ?? undefined
            })
          } catch (error) {
            console.error(`Failed to fetch attachment:`, error)
          }
        }
      }
    }

    email.attachments = attachments
    return { email, attachments }
  }

  // Mark emails as read
  async markAsRead(messageIds: string[]): Promise<{
    success: boolean
    updatedCount: number
  }> {
    try {
      await this.gmail.users.messages.batchModify({
        userId: 'me',
        requestBody: {
          ids: messageIds,
          removeLabelIds: ['UNREAD']
        }
      })

      return {
        success: true,
        updatedCount: messageIds.length
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
      return {
        success: false,
        updatedCount: 0
      }
    }
  }

  // Add labels to emails
  async addLabels(messageIds: string[], labels: string[]): Promise<{
    success: boolean
    updatedCount: number
  }> {
    try {
      // First, get existing labels to find label IDs
      const labelsResponse = await this.gmail.users.labels.list({
        userId: 'me'
      })

      const labelMap = new Map()
      labelsResponse.data.labels?.forEach(label => {
        labelMap.set(label.name?.toLowerCase(), label.id)
      })

      const labelIds = labels
        .map(label => labelMap.get(label.toLowerCase()))
        .filter(Boolean)

      if (labelIds.length === 0) {
        throw new Error('No valid labels found')
      }

      await this.gmail.users.messages.batchModify({
        userId: 'me',
        requestBody: {
          ids: messageIds,
          addLabelIds: labelIds
        }
      })

      return {
        success: true,
        updatedCount: messageIds.length
      }
    } catch (error) {
      console.error('Failed to add labels:', error)
      return {
        success: false,
        updatedCount: 0
      }
    }
  }

  // Reply to email
  async replyToEmail(
    messageId: string, 
    body: string, 
    isHtml = false, 
    replyAll = false
  ): Promise<{
    messageId: string
    threadId: string
  }> {
    // Get original message to extract reply details
    const originalMessage = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    })

    const headers = originalMessage.data.payload?.headers || []
    const subject = this.getHeaderValue(headers, 'Subject') || ''
    const from = this.getHeaderValue(headers, 'From') || ''
    const to = replyAll ? this.getHeaderValue(headers, 'To') : from
    const cc = replyAll ? this.getHeaderValue(headers, 'Cc') : undefined

    const replySubject = subject.startsWith('Re: ') ? subject : `Re: ${subject}`
    
    const replyOptions: SendEmailOptions = {
      to: to!,
      cc: cc ? [cc] : undefined,
      subject: replySubject,
      body,
      isHtml,
      replyToMessageId: messageId
    }

    const result = await this.sendEmail(replyOptions)
    
    return {
      messageId: result.messageId,
      threadId: result.threadId
    }
  }

  // Helper methods
  private buildEmailMessage(options: SendEmailOptions): string {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const toAddresses = Array.isArray(options.to) ? options.to.join(', ') : options.to
    const ccAddresses = options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : ''
    const bccAddresses = options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : ''

    let email = [
      'MIME-Version: 1.0',
      `To: ${toAddresses}`,
      ccAddresses ? `Cc: ${ccAddresses}` : '',
      bccAddresses ? `Bcc: ${bccAddresses}` : '',
      `Subject: ${options.subject}`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: ${options.isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
      'Content-Transfer-Encoding: 7bit',
      '',
      options.body,
      ''
    ].filter(Boolean).join('\r\n')

    // Add attachments if any
    if (options.attachments && options.attachments.length > 0) {
      for (const attachment of options.attachments) {
        const content = Buffer.isBuffer(attachment.content) 
          ? attachment.content.toString('base64')
          : Buffer.from(attachment.content).toString('base64')

        email += [
          `--${boundary}`,
          `Content-Type: ${attachment.mimeType || 'application/octet-stream'}`,
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          'Content-Transfer-Encoding: base64',
          '',
          content,
          ''
        ].join('\r\n')
      }
    }

    email += `--${boundary}--`

    return Buffer.from(email).toString('base64url')
  }

  private buildSearchQuery(options: EmailSearchOptions): string {
    const queryParts: string[] = []

    if (options.query) queryParts.push(options.query)
    if (options.from) queryParts.push(`from:${options.from}`)
    if (options.to) queryParts.push(`to:${options.to}`)
    if (options.subject) queryParts.push(`subject:${options.subject}`)
    if (options.hasAttachment) queryParts.push('has:attachment')
    if (options.isUnread) queryParts.push('is:unread')
    if (options.isStarred) queryParts.push('is:starred')
    if (options.inFolder) queryParts.push(`in:${options.inFolder}`)
    if (options.after) queryParts.push(`after:${options.after.toISOString().split('T')[0]}`)
    if (options.before) queryParts.push(`before:${options.before.toISOString().split('T')[0]}`)

    return queryParts.join(' ')
  }

  private getHeaderValue(headers: any[], name: string): string | undefined {
    const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase())
    return header?.value
  }

  private extractTextBody(payload: any): string | null {
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8')
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        const body = this.extractTextBody(part)
        if (body) return body
      }
    }

    return null
  }

  private extractHtmlBody(payload: any): string | null {
    if (payload.mimeType === 'text/html' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8')
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        const body = this.extractHtmlBody(part)
        if (body) return body
      }
    }

    return null
  }

  private findAttachments(payload: any): any[] {
    const attachments: any[] = []

    if (payload.filename && payload.body?.attachmentId) {
      attachments.push(payload)
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        attachments.push(...this.findAttachments(part))
      }
    }

    return attachments
  }
}