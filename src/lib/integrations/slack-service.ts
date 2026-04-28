// src/lib/integrations/slack-service.ts
/**
 * Slack Integration Service
 * Handles sending messages to Slack channels
 */

import { WebClient } from '@slack/web-api'

// Initialize Slack client
let slackClient: WebClient | null = null

function getSlackClient(): WebClient {
  if (!slackClient) {
    const token = process.env.SLACK_BOT_TOKEN

    if (!token) {
      throw new Error('SLACK_BOT_TOKEN environment variable is not set')
    }

    slackClient = new WebClient(token)
  }

  return slackClient
}

export interface SlackMessageOptions {
  channel: string
  text?: string
  blocks?: any[]
  attachments?: any[]
  threadTs?: string
  unfurlLinks?: boolean
  unfurlMedia?: boolean
}

/**
 * Send a message to a Slack channel
 */
export async function sendSlackMessage(options: SlackMessageOptions) {
  try {
    const client = getSlackClient()

    console.log(`📱 Sending Slack message to ${options.channel}`)

    const result = await client.chat.postMessage({
      channel: options.channel,
      text: options.text || 'Message from CogniFlow',
      blocks: options.blocks,
      attachments: options.attachments,
      thread_ts: options.threadTs,
      unfurl_links: options.unfurlLinks !== false,
      unfurl_media: options.unfurlMedia !== false,
    })

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`)
    }

    console.log(`✅ Slack message sent successfully`)
    console.log(`   Channel: ${options.channel}`)
    console.log(`   Timestamp: ${result.ts}`)

    return {
      success: true,
      channel: options.channel,
      timestamp: result.ts,
      messageId: result.ts,
    }
  } catch (error: any) {
    console.error('❌ Slack message failed:', error)

    // Return error details
    return {
      success: false,
      error: error.message,
      channel: options.channel,
    }
  }
}

/**
 * Format a message with Slack blocks for rich formatting
 */
export function formatSlackMessage(template: string, data: Record<string, any>): any {
  // Replace template variables
  let formatted = template
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    formatted = formatted.replace(regex, String(value))
  }

  // Parse markdown-like formatting to Slack blocks
  const blocks: any[] = []

  // Split by sections
  const sections = formatted.split('\n\n')

  for (const section of sections) {
    if (!section.trim()) continue

    // Check if it's a header (starts with **)
    if (section.startsWith('**') && section.includes('**\n')) {
      const [header, ...rest] = section.split('\n')
      const headerText = header.replace(/\*\*/g, '')

      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: headerText.substring(0, 150), // Slack header limit
        },
      })

      if (rest.length > 0) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: rest.join('\n'),
          },
        })
      }
    } else {
      // Regular section
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: section,
        },
      })
    }
  }

  return {
    blocks,
    text: formatted, // Fallback text
  }
}

/**
 * Send a formatted Slack alert
 */
export async function sendSlackAlert(
  channel: string,
  title: string,
  message: string,
  color: 'good' | 'warning' | 'danger' = 'good',
  fields?: Array<{ title: string; value: string; short?: boolean }>
) {
  return sendSlackMessage({
    channel,
    text: title,
    attachments: [
      {
        color,
        title,
        text: message,
        fields,
        footer: 'CogniFlow Automation',
        footer_icon: 'https://platform.slack-edge.com/img/default_application_icon.png',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  })
}

/**
 * Check if Slack is configured
 */
export function isSlackConfigured(): boolean {
  return !!process.env.SLACK_BOT_TOKEN
}
