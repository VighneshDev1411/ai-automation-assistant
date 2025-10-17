import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export interface GmailCredentials {
  access_token: string
  refresh_token: string
  expiry_date?: number
  scope?: string
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  body: string
  cc?: string | string[]
  bcc?: string | string[]
  isHtml?: boolean
}

export interface GmailMessage {
  id: string
  threadId: string
  labelIds?: string[]
  snippet: string
  payload?: any
  sizeEstimate: number
  historyId: string
  internalDate: string
}

export class GmailIntegration {
  private gmail: any
  private auth: OAuth2Client

  constructor(credentials: GmailCredentials) {
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    this.auth.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry_date,
    })

    this.gmail = google.gmail({ version: 'v1', auth: this.auth })
  }

  /**
   * Send an email via Gmail
   */
  async sendEmail(options: SendEmailOptions): Promise<any> {
    try {
      const {to, subject, body, cc, bcc, isHtml = true} = options

      // Build email headers
      const headers = [
        `To: ${Array.isArray(to) ? to.join(', ') : to}`,
        `Subject: ${subject}`,
      ]

      if (cc) {
        headers.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`)
      }

      if (bcc) {
        headers.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`)
      }

      // Add content type
      if (isHtml) {
        headers.push('Content-Type: text/html; charset=utf-8')
      } else {
        headers.push('Content-Type: text/plain; charset=utf-8')
      }

      headers.push('MIME-Version: 1.0')

      // Build complete message
      const message = headers.join('\r\n') + '\r\n\r\n' + body

      // Encode message in base64url format
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      // Send email
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      })

      return {
        id: response.data.id,
        threadId: response.data.threadId,
        labelIds: response.data.labelIds,
      }
    } catch (error: any) {
      // Handle token refresh if needed
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        throw new Error('Gmail authentication expired. Please reconnect your Gmail account.')
      }
      throw new Error(`Failed to send email: ${error.message}`)
    }
  }

  /**
   * Get user's email address
   */
  async getProfile() {
    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me',
      })

      return {
        emailAddress: response.data.emailAddress,
        messagesTotal: response.data.messagesTotal,
        threadsTotal: response.data.threadsTotal,
        historyId: response.data.historyId,
      }
    } catch (error: any) {
      throw new Error(`Failed to get Gmail profile: ${error.message}`)
    }
  }

  /**
   * List messages with optional query
   */
  async listMessages(query?: string, maxResults: number = 10): Promise<GmailMessage[]> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      })

      if (!response.data.messages) {
        return []
      }

      // Get full message details
      const messages = await Promise.all(
        response.data.messages.map(async (msg: any) => {
          const fullMsg = await this.gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full',
          })
          return fullMsg.data
        })
      )

      return messages
    } catch (error: any) {
      throw new Error(`Failed to list messages: ${error.message}`)
    }
  }

  /**
   * Get a specific message by ID
   */
  async getMessage(messageId: string): Promise<GmailMessage> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      })

      return response.data
    } catch (error: any) {
      throw new Error(`Failed to get message: ${error.message}`)
    }
  }

  /**
   * Get list of labels
   */
  async listLabels() {
    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me',
      })

      return response.data.labels || []
    } catch (error: any) {
      throw new Error(`Failed to list labels: ${error.message}`)
    }
  }

  /**
   * Create a draft email
   */
  async createDraft(options: SendEmailOptions) {
    try {
      const {to, subject, body, cc, bcc, isHtml = true} = options

      // Build email headers (same as sendEmail)
      const headers = [
        `To: ${Array.isArray(to) ? to.join(', ') : to}`,
        `Subject: ${subject}`,
      ]

      if (cc) {
        headers.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`)
      }

      if (bcc) {
        headers.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`)
      }

      if (isHtml) {
        headers.push('Content-Type: text/html; charset=utf-8')
      } else {
        headers.push('Content-Type: text/plain; charset=utf-8')
      }

      headers.push('MIME-Version: 1.0')

      const message = headers.join('\r\n') + '\r\n\r\n' + body

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      const response = await this.gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedMessage,
          },
        },
      })

      return response.data
    } catch (error: any) {
      throw new Error(`Failed to create draft: ${error.message}`)
    }
  }

  /**
   * Test connection to Gmail
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getProfile()
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Refresh access token if needed
   */
  async refreshAccessToken(): Promise<string> {
    try {
      const {credentials} = await this.auth.refreshAccessToken()
      if (credentials.access_token) {
        return credentials.access_token
      }
      throw new Error('No access token returned')
    } catch (error: any) {
      throw new Error(`Failed to refresh token: ${error.message}`)
    }
  }
}

export default GmailIntegration
