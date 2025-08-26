// src/lib/integrations/providers/slack.ts
import { BaseIntegration, IntegrationConfig, IntegrationCredentials, IntegrationAction, IntegrationTrigger } from '../base-integration'

export class SlackIntegration extends BaseIntegration {
  constructor() {
    const config: IntegrationConfig = {
      provider: 'slack',
      name: 'Slack',
      description: 'Send messages, create channels, and manage Slack workspace',
      authType: 'oauth2',
      scopes: [
        'channels:read',
        'channels:write',
        'chat:write',
        'chat:write.public',
        'users:read',
        'users:read.email',
        'files:write',
        'reactions:write'
      ],
      endpoints: {
        auth: 'https://slack.com/oauth/v2/authorize',
        token: 'https://slack.com/api/oauth.v2.access',
        revoke: 'https://slack.com/api/auth.revoke'
      },
      rateLimit: {
        requests: 50,
        per: 'minute'
      }
    }
    
    super(config)
  }

  async authenticate(params: { code: string; redirectUri: string }): Promise<IntegrationCredentials> {
    const clientId = process.env.SLACK_CLIENT_ID!
    const clientSecret = process.env.SLACK_CLIENT_SECRET!

    const tokenParams = new URLSearchParams({
      code: params.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: params.redirectUri
    })

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams
    })

    if (!response.ok) {
      throw new Error(`Slack OAuth failed: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`)
    }
    
    return {
      access_token: data.access_token,
      scope: data.scope,
      // Store additional Slack-specific data
      client_id: clientId,
      team_id: data.team?.id,
      team_name: data.team?.name,
      bot_user_id: data.bot_user_id
    }
  }

  async refreshToken(): Promise<IntegrationCredentials> {
    // Slack tokens don't expire, so return existing credentials
    if (!this.credentials) {
      throw new Error('No credentials available')
    }
    return this.credentials
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.credentials?.access_token) return false

    const response = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) return false

    const data = await response.json()
    return data.ok === true
  }

  getActions(): IntegrationAction[] {
    return [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message to a Slack channel or user',
        inputs: {
          channel: { type: 'string', required: true, description: 'Channel ID or name (e.g., #general, @username)' },
          text: { type: 'string', required: true, description: 'Message text' },
          blocks: { type: 'array', required: false, description: 'Rich message blocks (JSON)' },
          thread_ts: { type: 'string', required: false, description: 'Thread timestamp for replies' }
        },
        outputs: {
          message_ts: { type: 'string', description: 'Message timestamp' },
          channel_id: { type: 'string', description: 'Channel ID where message was sent' }
        }
      },
      {
        id: 'create_channel',
        name: 'Create Channel',
        description: 'Create a new Slack channel',
        inputs: {
          name: { type: 'string', required: true, description: 'Channel name (without #)' },
          is_private: { type: 'boolean', required: false, description: 'Create as private channel' },
          topic: { type: 'string', required: false, description: 'Channel topic' },
          purpose: { type: 'string', required: false, description: 'Channel purpose' }
        },
        outputs: {
          channel_id: { type: 'string', description: 'Created channel ID' },
          channel_name: { type: 'string', description: 'Created channel name' }
        }
      },
      {
        id: 'invite_to_channel',
        name: 'Invite Users to Channel',
        description: 'Invite users to a Slack channel',
        inputs: {
          channel: { type: 'string', required: true, description: 'Channel ID' },
          users: { type: 'array', required: true, description: 'Array of user IDs' }
        },
        outputs: {
          invited_users: { type: 'array', description: 'List of successfully invited users' }
        }
      },
      {
        id: 'upload_file',
        name: 'Upload File',
        description: 'Upload a file to Slack',
        inputs: {
          channels: { type: 'string', required: true, description: 'Comma-separated channel IDs' },
          file_content: { type: 'string', required: true, description: 'File content (base64 encoded)' },
          filename: { type: 'string', required: true, description: 'File name' },
          title: { type: 'string', required: false, description: 'File title' },
          initial_comment: { type: 'string', required: false, description: 'Initial comment' }
        },
        outputs: {
          file_id: { type: 'string', description: 'Uploaded file ID' },
          file_url: { type: 'string', description: 'File URL' }
        }
      },
      {
        id: 'add_reaction',
        name: 'Add Reaction',
        description: 'Add a reaction emoji to a message',
        inputs: {
          channel: { type: 'string', required: true, description: 'Channel ID' },
          timestamp: { type: 'string', required: true, description: 'Message timestamp' },
          name: { type: 'string', required: true, description: 'Emoji name (without colons)' }
        },
        outputs: {
          success: { type: 'boolean', description: 'Whether reaction was added successfully' }
        }
      },
      {
        id: 'set_channel_topic',
        name: 'Set Channel Topic',
        description: 'Set the topic for a Slack channel',
        inputs: {
          channel: { type: 'string', required: true, description: 'Channel ID' },
          topic: { type: 'string', required: true, description: 'New channel topic' }
        },
        outputs: {
          topic: { type: 'string', description: 'Updated channel topic' }
        }
      }
    ]
  }

  getTriggers(): IntegrationTrigger[] {
    return [
      {
        id: 'new_message',
        name: 'New Message',
        description: 'Triggers when a new message is posted in monitored channels',
        webhook: true
      },
      {
        id: 'mention',
        name: 'Bot Mentioned',
        description: 'Triggers when the bot is mentioned in a message',
        webhook: true
      },
      {
        id: 'reaction_added',
        name: 'Reaction Added',
        description: 'Triggers when a reaction is added to a message',
        webhook: true
      },
      {
        id: 'user_joined',
        name: 'User Joined Channel',
        description: 'Triggers when a user joins a channel',
        webhook: true
      },
      {
        id: 'file_shared',
        name: 'File Shared',
        description: 'Triggers when a file is shared in a channel',
        webhook: true
      }
    ]
  }

  async executeAction(actionId: string, inputs: Record<string, any>): Promise<any> {
    if (!this.credentials?.access_token) {
      throw new Error('Integration not authenticated')
    }

    switch (actionId) {
      case 'send_message':
        return this.sendMessage(inputs)
      case 'create_channel':
        return this.createChannel(inputs)
      case 'invite_to_channel':
        return this.inviteToChannel(inputs)
      case 'upload_file':
        return this.uploadFile(inputs)
      case 'add_reaction':
        return this.addReaction(inputs)
      case 'set_channel_topic':
        return this.setChannelTopic(inputs)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  private async sendMessage(inputs: {
    channel: string
    text: string
    blocks?: any[]
    thread_ts?: string
  }): Promise<any> {
    const payload: any = {
      channel: inputs.channel,
      text: inputs.text
    }

    if (inputs.blocks) {
      payload.blocks = inputs.blocks
    }

    if (inputs.thread_ts) {
      payload.thread_ts = inputs.thread_ts
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials!.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`)
    }

    return {
      message_ts: data.ts,
      channel_id: data.channel
    }
  }

  private async createChannel(inputs: {
    name: string
    is_private?: boolean
    topic?: string
    purpose?: string
  }): Promise<any> {
    const method = inputs.is_private ? 'groups.create' : 'channels.create'
    
    const payload: any = {
      name: inputs.name
    }

    const response = await fetch(`https://slack.com/api/conversations.create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials!.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: inputs.name,
        is_private: inputs.is_private || false
      })
    })

    const data = await response.json()
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`)
    }

    const channel = data.channel

    // Set topic and purpose if provided
    if (inputs.topic) {
      await this.setChannelTopic({ channel: channel.id, topic: inputs.topic })
    }

    if (inputs.purpose) {
      await fetch('https://slack.com/api/conversations.setPurpose', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials!.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: channel.id,
          purpose: inputs.purpose
        })
      })
    }

    return {
      channel_id: channel.id,
      channel_name: channel.name
    }
  }

  private async inviteToChannel(inputs: {
    channel: string
    users: string[]
  }): Promise<any> {
    const response = await fetch('https://slack.com/api/conversations.invite', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials!.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: inputs.channel,
        users: inputs.users.join(',')
      })
    })

    const data = await response.json()
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`)
    }

    return {
      invited_users: inputs.users
    }
  }

  private async uploadFile(inputs: {
    channels: string
    file_content: string
    filename: string
    title?: string
    initial_comment?: string
  }): Promise<any> {
    // Decode base64 file content
    const fileBuffer = Buffer.from(inputs.file_content, 'base64')

    const formData = new FormData()
    formData.append('channels', inputs.channels)
    formData.append('file', new Blob([fileBuffer]), inputs.filename)
    
    if (inputs.title) {
      formData.append('title', inputs.title)
    }
    
    if (inputs.initial_comment) {
      formData.append('initial_comment', inputs.initial_comment)
    }

    const response = await fetch('https://slack.com/api/files.upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials!.access_token}`
      },
      body: formData
    })

    const data = await response.json()
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`)
    }

    return {
      file_id: data.file.id,
      file_url: data.file.url_private
    }
  }

  private async addReaction(inputs: {
    channel: string
    timestamp: string
    name: string
  }): Promise<any> {
    const response = await fetch('https://slack.com/api/reactions.add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials!.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: inputs.channel,
        timestamp: inputs.timestamp,
        name: inputs.name
      })
    })

    const data = await response.json()
    
    return {
      success: data.ok
    }
  }

  private async setChannelTopic(inputs: {
    channel: string
    topic: string
  }): Promise<any> {
    const response = await fetch('https://slack.com/api/conversations.setTopic', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials!.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: inputs.channel,
        topic: inputs.topic
      })
    })

    const data = await response.json()
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`)
    }

    return {
      topic: data.topic
    }
  }
}