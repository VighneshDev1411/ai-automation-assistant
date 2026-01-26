// src/app/api/email/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/email-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { to, subject, html, text, templateId, variables, workflowId } = body

    // Validate required fields
    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      )
    }

    if (!html && !text) {
      return NextResponse.json(
        { error: 'Either html or text content is required' },
        { status: 400 }
      )
    }

    let finalHtml = html
    let finalText = text

    // If template ID is provided, fetch and render template
    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', membership.organization_id)
        .single()

      if (templateError || !template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      // Replace variables in template (simple replacement for now)
      finalHtml = template.html_content
      finalText = template.text_content || ''

      if (variables) {
        Object.keys(variables).forEach((key) => {
          const value = variables[key]
          finalHtml = finalHtml.replace(new RegExp(`{{${key}}}`, 'g'), value)
          finalText = finalText.replace(new RegExp(`{{${key}}}`, 'g'), value)
        })
      }
    }

    // Send email
    const result = await sendEmail({
      to: typeof to === 'string' ? to : to.email,
      subject,
      html: finalHtml,
      text: finalText,
      templateId,
      templateVars: variables,
    })

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email')
    }

    const messageId = result.messageId

    // Log to database
    const { data: logEntry, error: logError } = await supabase
      .from('email_logs')
      .insert({
        organization_id: membership.organization_id,
        workflow_id: workflowId || null,
        template_id: templateId || null,
        recipient_email: typeof to === 'string' ? to : to.email,
        subject,
        status: 'sent',
        provider_message_id: messageId,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (logError) {
      console.error('Failed to log email:', logError)
    }

    return NextResponse.json({
      success: true,
      messageId,
      logId: logEntry?.id,
      provider: process.env.EMAIL_PROVIDER,
    })
  } catch (error: any) {
    console.error('Email send error:', error)
    
    // Try to log error to database
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single()

        if (membership) {
          await supabase.from('email_logs').insert({
            organization_id: membership.organization_id,
            recipient_email: 'unknown',
            subject: 'Failed to send',
            status: 'failed',
            error_details: {
              message: error.message,
              stack: error.stack,
            },
          })
        }
      }
    } catch (logError) {
      console.error('Failed to log email error:', logError)
    }

    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
