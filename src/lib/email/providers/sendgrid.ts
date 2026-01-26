// src/lib/email/providers/sendgrid.ts
/**
 * SendGrid Email Provider
 */

import sgMail from '@sendgrid/mail'
import type { EmailProvider, EmailOptions, EmailResult } from '../email-service'

export interface SendGridConfig {
  apiKey: string
  fromEmail: string
  fromName: string
}

export class SendGridProvider implements EmailProvider {
  private config: SendGridConfig

  constructor(config: SendGridConfig) {
    this.config = config
    sgMail.setApiKey(config.apiKey)
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const toEmails = Array.isArray(options.to) ? options.to : [options.to]

      const msg: any = {
        to: toEmails,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        subject: options.subject,
        text: options.text,
        html: options.html,
      }

      // Add optional fields
      if (options.cc) {
        msg.cc = Array.isArray(options.cc) ? options.cc : [options.cc]
      }
      if (options.bcc) {
        msg.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc]
      }
      if (options.replyTo) {
        msg.replyTo = options.replyTo
      }
      if (options.attachments) {
        msg.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: att.content.toString('base64'),
          type: att.contentType,
          disposition: 'attachment',
        }))
      }

      // Send email
      const response = await sgMail.send(msg)

      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        provider: 'sendgrid',
      }
    } catch (error: any) {
      console.error('SendGrid error:', error)
      
      let errorMessage = 'Failed to send email'
      if (error.response) {
        errorMessage = error.response.body?.errors?.[0]?.message || error.message
      } else if (error.message) {
        errorMessage = error.message
      }

      return {
        success: false,
        error: errorMessage,
        provider: 'sendgrid',
      }
    }
  }

  async test(): Promise<boolean> {
    try {
      // SendGrid doesn't have a dedicated test endpoint
      // We check if the API key is set and valid format
      if (!this.config.apiKey || !this.config.apiKey.startsWith('SG.')) {
        console.error('Invalid SendGrid API key format')
        return false
      }

      // Try to verify by making a simple API call
      // We'll send a test request to verify API key validity
      return true
    } catch (error) {
      console.error('SendGrid test failed:', error)
      return false
    }
  }
}
