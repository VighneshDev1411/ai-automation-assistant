// src/lib/email/email-service.ts
/**
 * Email Service - Main email sending interface
 * Supports multiple providers: SendGrid, SMTP, Mailgun, AWS SES
 */

import { SendGridProvider } from './providers/sendgrid'
import { SMTPProvider } from './providers/smtp'
import { createClient } from '@/lib/supabase/server'

export interface EmailOptions {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  subject: string
  text?: string
  html: string
  templateId?: string
  templateVars?: Record<string, any>
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
  metadata?: Record<string, any>
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  provider?: string
}

export interface EmailProvider {
  send(options: EmailOptions): Promise<EmailResult>
  test(): Promise<boolean>
}

/**
 * Get the configured email provider
 */
function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || 'sendgrid'

  switch (provider.toLowerCase()) {
    case 'sendgrid':
      return new SendGridProvider({
        apiKey: process.env.SENDGRID_API_KEY!,
        fromEmail: process.env.EMAIL_FROM_ADDRESS!,
        fromName: process.env.EMAIL_FROM_NAME || 'CogniFlow',
      })

    case 'smtp':
      return new SMTPProvider({
        host: process.env.SMTP_HOST!,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER!,
        password: process.env.SMTP_PASSWORD!,
        fromEmail: process.env.EMAIL_FROM_ADDRESS!,
        fromName: process.env.EMAIL_FROM_NAME || 'CogniFlow',
      })

    default:
      throw new Error(`Unsupported email provider: ${provider}`)
  }
}

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    // Validate required fields
    if (!options.to) {
      throw new Error('Email recipient (to) is required')
    }
    if (!options.subject) {
      throw new Error('Email subject is required')
    }
    if (!options.html && !options.text) {
      throw new Error('Email must have either HTML or text content')
    }

    // Get provider and send email
    const provider = getEmailProvider()
    const result = await provider.send(options)

    // Log to database if successful
    if (result.success) {
      await logEmailSend(options, result)
    }

    return result
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send email and add to queue (for async processing)
 */
export async function queueEmail(
  options: EmailOptions,
  priority: number = 0
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    // We'll implement the queue in the next step
    // For now, send directly
    const result = await sendEmail(options)
    
    return {
      success: result.success,
      jobId: result.messageId,
      error: result.error,
    }
  } catch (error) {
    console.error('Error queueing email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<{
  success: boolean
  provider: string
  error?: string
}> {
  try {
    const providerName = process.env.EMAIL_PROVIDER || 'sendgrid'
    const provider = getEmailProvider()
    
    const isConfigured = await provider.test()
    
    return {
      success: isConfigured,
      provider: providerName,
      error: isConfigured ? undefined : 'Provider configuration test failed',
    }
  } catch (error) {
    console.error('Error testing email configuration:', error)
    return {
      success: false,
      provider: process.env.EMAIL_PROVIDER || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Log email send to database
 */
async function logEmailSend(
  options: EmailOptions,
  result: EmailResult
): Promise<void> {
  try {
    const supabase = await createClient()

    const toEmails = Array.isArray(options.to) ? options.to : [options.to]
    const ccEmails = options.cc
      ? Array.isArray(options.cc)
        ? options.cc
        : [options.cc]
      : undefined
    const bccEmails = options.bcc
      ? Array.isArray(options.bcc)
        ? options.bcc
        : [options.bcc]
      : undefined

    const { error } = await supabase.from('email_logs').insert({
      from_email: process.env.EMAIL_FROM_ADDRESS!,
      to_emails: toEmails,
      cc_emails: ccEmails,
      bcc_emails: bccEmails,
      reply_to: options.replyTo,
      subject: options.subject,
      body_text: options.text,
      body_html: options.html,
      template_id: options.templateId,
      template_vars: options.templateVars || {},
      status: result.success ? 'sent' : 'failed',
      sent_at: result.success ? new Date().toISOString() : null,
      error_message: result.error,
      provider: result.provider || process.env.EMAIL_PROVIDER,
      provider_message_id: result.messageId,
      metadata: options.metadata || {},
    })

    if (error) {
      console.error('Error logging email:', error)
    }
  } catch (error) {
    console.error('Error logging email to database:', error)
  }
}

/**
 * Get email statistics for an organization
 */
export async function getEmailStats(
  organizationId: string,
  days: number = 30
): Promise<{
  totalSent: number
  totalDelivered: number
  totalFailed: number
  totalBounced: number
  deliveryRate: number
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_email_stats', {
      org_id: organizationId,
      days,
    })

    if (error) throw error

    return {
      totalSent: parseInt(data[0]?.total_sent || '0'),
      totalDelivered: parseInt(data[0]?.total_delivered || '0'),
      totalFailed: parseInt(data[0]?.total_failed || '0'),
      totalBounced: parseInt(data[0]?.total_bounced || '0'),
      deliveryRate: parseFloat(data[0]?.delivery_rate || '0'),
    }
  } catch (error) {
    console.error('Error getting email stats:', error)
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalBounced: 0,
      deliveryRate: 0,
    }
  }
}
