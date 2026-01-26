// src/lib/email/providers/smtp.ts
/**
 * SMTP Email Provider (works with any SMTP server)
 */

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import type { EmailProvider, EmailOptions, EmailResult } from '../email-service'

export interface SMTPConfig {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromEmail: string
  fromName: string
}

export class SMTPProvider implements EmailProvider {
  private config: SMTPConfig
  private transporter: Transporter

  constructor(config: SMTPConfig) {
    this.config = config
    this.transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure, // true for 465, false for other ports
      auth: {
        user: config.user,
        pass: config.password,
      },
    })
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc.join(', ')
            : options.cc
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc.join(', ')
            : options.bcc
          : undefined,
        replyTo: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      })

      return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp',
      }
    } catch (error: any) {
      console.error('SMTP error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send email via SMTP',
        provider: 'smtp',
      }
    }
  }

  async test(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('SMTP test failed:', error)
      return false
    }
  }
}
