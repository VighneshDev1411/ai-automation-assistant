// src/app/api/email/test/route.ts
/**
 * Email Test API
 * Send test emails to verify configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, testEmailConfiguration } from '@/lib/email/email-service'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, subject, message } = body

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email (to) is required' },
        { status: 400 }
      )
    }

    // Build test email HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🎉 Email Test Successful!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">${subject || 'Test Email from CogniFlow'}</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                ${message || 'Congratulations! Your email service is configured correctly and working perfectly. You can now send emails from your workflows!'}
              </p>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px; color: #333333; font-size: 18px;">✅ What This Means:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #666666;">
                  <li style="margin-bottom: 8px;">Email provider is configured correctly</li>
                  <li style="margin-bottom: 8px;">SMTP connection is working</li>
                  <li style="margin-bottom: 8px;">Template rendering is functional</li>
                  <li style="margin-bottom: 8px;">Ready to send emails from workflows!</li>
                </ul>
              </div>
              <p style="margin: 20px 0 0; font-size: 14px; color: #6c757d;">
                <strong>Sent at:</strong> ${new Date().toLocaleString()}<br>
                <strong>Provider:</strong> ${process.env.EMAIL_PROVIDER || 'Unknown'}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 14px; color: #6c757d;">
                This is a test email from CogniFlow<br>
                Phase 1.1.2 - HTML Email Support
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    const text = `
Test Email from CogniFlow

${subject || 'Test Email'}

${message || 'Congratulations! Your email service is configured correctly and working perfectly.'}

Sent at: ${new Date().toLocaleString()}
Provider: ${process.env.EMAIL_PROVIDER || 'Unknown'}

This is a test email from CogniFlow - Phase 1.1.2
    `

    // Send the email
    const result = await sendEmail({
      to,
      subject: subject || '🎉 Test Email from CogniFlow',
      html,
      text,
      metadata: {
        type: 'test',
        sentBy: user.id,
        timestamp: new Date().toISOString(),
      },
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!',
        messageId: result.messageId,
        provider: result.provider,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send test email',
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test email configuration
    const configTest = await testEmailConfiguration()

    return NextResponse.json({
      configured: configTest.success,
      provider: configTest.provider,
      error: configTest.error,
      settings: {
        provider: process.env.EMAIL_PROVIDER,
        fromEmail: process.env.EMAIL_FROM_ADDRESS,
        fromName: process.env.EMAIL_FROM_NAME,
        hasApiKey: !!process.env.SENDGRID_API_KEY,
      },
    })
  } catch (error: any) {
    console.error('Error testing email configuration:', error)
    return NextResponse.json(
      {
        configured: false,
        error: error.message || 'Failed to test configuration',
      },
      { status: 500 }
    )
  }
}
