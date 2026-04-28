// src/lib/email/providers/resend.ts
/**
 * Resend Email Provider
 * Modern email API for sending transactional emails
 */

import { Resend } from 'resend'
import { EmailOptions, EmailResult, EmailProvider } from '../email-service'

export interface ResendConfig {
  apiKey: string
  fromEmail: string
  fromName?: string
}

export class ResendProvider implements EmailProvider {
  private client: Resend
  private config: ResendConfig

  constructor(config: ResendConfig) {
    this.config = config
    this.client = new Resend(config.apiKey)
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      console.log(`📧 Sending email via Resend to ${options.to}`)

      const from = this.config.fromName
        ? `${this.config.fromName} <${this.config.fromEmail}>`
        : this.config.fromEmail

      // Prepare email data
      const emailData: any = {
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
      }

      // Add optional fields
      if (options.text) {
        emailData.text = options.text
      }

      if (options.cc) {
        emailData.cc = Array.isArray(options.cc) ? options.cc : [options.cc]
      }

      if (options.bcc) {
        emailData.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc]
      }

      if (options.replyTo) {
        emailData.reply_to = options.replyTo
      }

      if (options.attachments && options.attachments.length > 0) {
        emailData.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
        }))
      }

      // Add tags for tracking
      if (options.metadata) {
        emailData.tags = Object.entries(options.metadata).map(([key, value]) => ({
          name: key,
          value: String(value),
        }))
      }

      // Send email
      const result = await this.client.emails.send(emailData)

      if (!result.data) {
        throw new Error('No data returned from Resend')
      }

      console.log(`✅ Email sent successfully via Resend`)
      console.log(`   Message ID: ${result.data.id}`)

      return {
        success: true,
        messageId: result.data.id,
        provider: 'resend',
      }
    } catch (error: any) {
      console.error('❌ Resend email failed:', error)

      return {
        success: false,
        error: error.message || 'Failed to send email via Resend',
        provider: 'resend',
      }
    }
  }

  async test(): Promise<boolean> {
    try {
      // Try to get API key info from Resend
      // Resend doesn't have a test endpoint, so we just check if the API key is set
      return !!this.config.apiKey && this.config.apiKey.startsWith('re_')
    } catch {
      return false
    }
  }
}
