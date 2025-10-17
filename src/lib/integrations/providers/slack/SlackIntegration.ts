// src/lib/integrations/providers/slack/SlackIntegration.ts

import { BaseIntegration, IntegrationAction, IntegrationTrigger } from '../../base-integration'

export interface SlackCredentials {
  access_token: string
  refresh_token?: string
  team_id: string
  team_name: string
  user_id: string
  scope: string
  bot_user_id?: string
  app_id?: string
  expires_at?: number
}

export interface SlackConfig {
  clientId: string
  clientSecret: string
  signingSecret: string
  redirectUri: string
  scopes: string[]
}

export interface SlackMessage {
  ts: string // timestamp
  user: string
  text: string
  channel: string
  thread_ts?: string
  attachments?: SlackAttachment[]
  blocks?: SlackBlock[]
  reactions?: SlackReaction[]
  replies?: SlackMessage[]
  permalink: string
  edited?: {
    user: string
    ts: string
  }
}

export interface SlackChannel {
  id: string
  name: string
  is_channel: boolean
  is_group: boolean
  is_im: boolean
  is_mpim: boolean
  is_private: boolean
  is_archived: boolean
  is_general: boolean
  is_shared: boolean
  is_org_shared: boolean
  is_member: boolean
  is_pending_ext_shared: boolean
  num_members?: number
  topic?: {
    value: string
    creator: string
    last_set: number
  }
  purpose?: {
    value: string
    creator: string
    last_set: number
  }
  created: number
  creator: string
}

export interface SlackUser {
  id: string
  name: string
  real_name: string
  email?: string
  profile: {
    display_name: string
    real_name: string
    email?: string
    image_24?: string
    image_32?: string
    image_48?: string
    image_72?: string
    image_192?: string
    image_512?: string
    status_text?: string
    status_emoji?: string
    title?: string
  }
  is_bot: boolean
  is_admin?: boolean
  is_owner?: boolean
  is_primary_owner?: boolean
  is_restricted?: boolean
  is_ultra_restricted?: boolean
  deleted: boolean
  tz?: string
  tz_label?: string
  tz_offset?: number
}

export interface SlackAttachment {
  fallback?: string
  color?: string
  pretext?: string
  author_name?: string
  author_link?: string
  author_icon?: string
  title?: string
  title_link?: string
  text?: string
  fields?: Array<{
    title: string
    value: string
    short?: boolean
  }>
  image_url?: string
  thumb_url?: string
  footer?: string
  footer_icon?: string
  ts?: number
  actions?: SlackAction[]
}

export interface SlackBlock {
  type: string
  block_id?: string
  elements?: any[]
  text?: any
  fields?: any[]
  accessory?: any
}

export interface SlackAction {
  name: string
  text: string
  type: string
  value?: string
  url?: string
  style?: 'default' | 'primary' | 'danger'
  confirm?: {
    title: string
    text: string
    ok_text?: string
    dismiss_text?: string
  }
}

export interface SlackReaction {
  name: string
  count: number
  users: string[]
}

export interface SendMessageOptions {
  channel: string
  text?: string
  attachments?: SlackAttachment[]
  blocks?: SlackBlock[]
  thread_ts?: string
  reply_broadcast?: boolean
  username?: string
  icon_emoji?: string
  icon_url?: string
  link_names?: boolean
  unfurl_links?: boolean
  unfurl_media?: boolean
  parse?: 'full' | 'none'
  as_user?: boolean
}

export interface FileUploadOptions {
  channels?: string[]
  content?: string
  file?: Buffer
  filename?: string
  filetype?: string
  initial_comment?: string
  thread_ts?: string
  title?: string
}

export class SlackIntegration extends BaseIntegration {
  private slackCredentials?: SlackCredentials
  private slackConfig: SlackConfig
  private baseUrl = 'https://slack.com/api'

  constructor(config: SlackConfig, credentials?: SlackCredentials) {
    super({
      id: 'slack',
      name: 'Slack',
      description: 'Send messages, manage channels, and interact with Slack workspace',
      icon: '💬',
      category: 'communication',
      authType: 'oauth2',
      scopes: config.scopes,
      endpoints: {
        auth: 'https://slack.com/oauth/v2/authorize',
        token: 'https://slack.com/api/oauth.v2.access',
        api: 'https://slack.com/api'
      },
      rateLimit: {
        requests: 1,
        per: 'second'
      },
      actions: [],
      triggers: []
    })
    this.slackConfig = config
    if (credentials) {
      this.slackCredentials = credentials
      this.setCredentials(credentials)
    }
  }

  getName(): string {
    return 'Slack'
  }

  getDescription(): string {
    return 'Send messages, manage channels, and interact with Slack workspace'
  }

  getIcon(): string {
    return '💬'
  }

  // Generate OAuth URL for Slack authorization
  getAuthUrl(state?: string): string {
    const scopes = [
      'channels:read',
      'channels:write', 
      'chat:write',
      'chat:write.public',
      'files:write',
      'groups:read',
      'im:read',
      'im:write',
      'mpim:read',
      'mpim:write',
      'reactions:read',
      'reactions:write',
      'users:read',
      'users:read.email',
      'team:read',
      'incoming-webhook'
    ].join(',')

    const params = new URLSearchParams({
      client_id: this.slackConfig.clientId,
      scope: scopes,
      redirect_uri: this.slackConfig.redirectUri,
      response_type: 'code'
    })

    if (state) {
      params.append('state', state)
    }

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`
  }

  // Exchange authorization code for access token
  async exchangeCodeForTokens(code: string): Promise<SlackCredentials> {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.slackConfig.clientId,
        client_secret: this.slackConfig.clientSecret,
        code,
        redirect_uri: this.slackConfig.redirectUri
      })
    })

    const data = await response.json()

    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`)
    }

    const credentials: SlackCredentials = {
      access_token: data.access_token,
      team_id: data.team.id,
      team_name: data.team.name,
      user_id: data.authed_user.id,
      scope: data.scope,
      bot_user_id: data.bot_user_id,
      app_id: data.app_id
    }

    this.slackCredentials = credentials
    this.setCredentials(credentials)
    return credentials
  }

  // BaseIntegration abstract methods
  async authenticate(params: { code: string }): Promise<SlackCredentials> {
    return this.exchangeCodeForTokens(params.code)
  }

  async refreshToken(): Promise<SlackCredentials> {
    // Slack tokens don't expire, so just return current credentials
    if (!this.slackCredentials) {
      throw new Error('No credentials to refresh')
    }
    return this.slackCredentials
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.makeSlackRequest('auth.test')
      return true
    } catch (error) {
      return false
    }
  }

  // Make authenticated request to Slack API
  async makeSlackRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.slackCredentials?.access_token) {
      throw new Error('Slack integration not authenticated')
    }

    const url = `${this.baseUrl}/${endpoint}`
    const headers = {
      'Authorization': `Bearer ${this.slackCredentials.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (!response.ok) {
      throw new Error(`Slack API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`)
    }

    return data
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.makeSlackRequest('auth.test')
      return true
    } catch (error) {
      console.error('Slack connection test failed:', error)
      return false
    }
  }

  getActions(): IntegrationAction[] {
    return [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message to a Slack channel or user',
        requiresAuth: true,
        inputs: [
          { id: 'channel', name: 'Channel', type: 'string', required: true, description: 'Channel name (#general) or user ID' },
          { id: 'text', name: 'Text', type: 'string', required: true, description: 'Message text' },
          { id: 'thread_ts', name: 'Thread Timestamp', type: 'string', required: false, description: 'Reply to thread timestamp' },
          { id: 'username', name: 'Username', type: 'string', required: false, description: 'Custom username for message' },
          { id: 'icon_emoji', name: 'Icon Emoji', type: 'string', required: false, description: 'Custom emoji icon' },
          { id: 'attachments', name: 'Attachments', type: 'array', required: false, description: 'Message attachments' },
          { id: 'blocks', name: 'Blocks', type: 'array', required: false, description: 'Block Kit UI elements' }
        ],
        outputs: [
          { id: 'ts', name: 'Timestamp', type: 'string', description: 'Message timestamp' },
          { id: 'channel', name: 'Channel', type: 'string', description: 'Channel ID where message was sent' },
          { id: 'permalink', name: 'Permalink', type: 'string', description: 'Permalink to the message' }
        ]
      },
      {
        id: 'send_dm',
        name: 'Send Direct Message',
        description: 'Send a direct message to a user',
        requiresAuth: true,
        inputs: [
          { id: 'user', name: 'User', type: 'string', required: true, description: 'User ID or email' },
          { id: 'text', name: 'Text', type: 'string', required: true, description: 'Message text' },
          { id: 'attachments', name: 'Attachments', type: 'array', required: false, description: 'Message attachments' }
        ],
        outputs: [
          { id: 'ts', name: 'Timestamp', type: 'string', description: 'Message timestamp' },
          { id: 'channel', name: 'Channel', type: 'string', description: 'DM channel ID' }
        ]
      },
      {
        id: 'upload_file',
        name: 'Upload File',
        description: 'Upload a file to Slack',
        requiresAuth: true,
        inputs: [
          { id: 'channels', name: 'Channels', type: 'array', required: true, description: 'Channels to share file in' },
          { id: 'content', name: 'Content', type: 'string', required: false, description: 'File content (base64)' },
          { id: 'filename', name: 'Filename', type: 'string', required: true, description: 'File name' },
          { id: 'title', name: 'Title', type: 'string', required: false, description: 'File title' },
          { id: 'initial_comment', name: 'Initial Comment', type: 'string', required: false, description: 'Initial comment' },
          { id: 'filetype', name: 'Filetype', type: 'string', required: false, description: 'File type' }
        ],
        outputs: [
          { id: 'file_id', name: 'File ID', type: 'string', description: 'Uploaded file ID' },
          { id: 'permalink', name: 'Permalink', type: 'string', description: 'Permalink to file' },
          { id: 'url_private', name: 'Private URL', type: 'string', description: 'Private download URL' }
        ]
      },
      {
        id: 'create_channel',
        name: 'Create Channel',
        description: 'Create a new Slack channel',
        requiresAuth: true,
        inputs: [
          { id: 'name', name: 'Name', type: 'string', required: true, description: 'Channel name (without #)' },
          { id: 'is_private', name: 'Is Private', type: 'boolean', required: false, description: 'Create private channel' },
          { id: 'purpose', name: 'Purpose', type: 'string', required: false, description: 'Channel purpose' },
          { id: 'topic', name: 'Topic', type: 'string', required: false, description: 'Channel topic' }
        ],
        outputs: [
          { id: 'channel_id', name: 'Channel ID', type: 'string', description: 'Created channel ID' },
          { id: 'channel_name', name: 'Channel Name', type: 'string', description: 'Channel name' },
          { id: 'is_private', name: 'Is Private', type: 'boolean', description: 'Whether channel is private' }
        ]
      },
      {
        id: 'invite_to_channel',
        name: 'Invite to Channel',
        description: 'Invite users to a channel',
        requiresAuth: true,
        inputs: [
          { id: 'channel', name: 'Channel', type: 'string', required: true, description: 'Channel ID or name' },
          { id: 'users', name: 'Users', type: 'array', required: true, description: 'User IDs to invite' }
        ],
        outputs: [
          { id: 'channel', name: 'Channel', type: 'string', description: 'Channel ID' },
          { id: 'invited_users', name: 'Invited Users', type: 'array', description: 'Successfully invited users' }
        ]
      },
      {
        id: 'get_user_info',
        name: 'Get User Info',
        description: 'Get information about a Slack user',
        requiresAuth: true,
        inputs: [
          { id: 'user', name: 'User', type: 'string', required: true, description: 'User ID or email' }
        ],
        outputs: [
          { id: 'user', name: 'User', type: 'object', description: 'User information' },
          { id: 'is_bot', name: 'Is Bot', type: 'boolean', description: 'Whether user is a bot' },
          { id: 'real_name', name: 'Real Name', type: 'string', description: 'User real name' },
          { id: 'email', name: 'Email', type: 'string', description: 'User email' }
        ]
      },
      {
        id: 'list_channels',
        name: 'List Channels',
        description: 'Get list of channels in workspace',
        requiresAuth: true,
        inputs: [
          { id: 'exclude_archived', name: 'Exclude Archived', type: 'boolean', required: false, description: 'Exclude archived channels' },
          { id: 'types', name: 'Types', type: 'string', required: false, description: 'Channel types (public_channel,private_channel,mpim,im)' }
        ],
        outputs: [
          { id: 'channels', name: 'Channels', type: 'array', description: 'List of channels' },
          { id: 'total_count', name: 'Total Count', type: 'number', description: 'Total number of channels' }
        ]
      },
      {
        id: 'add_reaction',
        name: 'Add Reaction',
        description: 'Add emoji reaction to a message',
        requiresAuth: true,
        inputs: [
          { id: 'channel', name: 'Channel', type: 'string', required: true, description: 'Channel ID' },
          { id: 'timestamp', name: 'Timestamp', type: 'string', required: true, description: 'Message timestamp' },
          { id: 'name', name: 'Emoji Name', type: 'string', required: true, description: 'Emoji name (without colons)' }
        ],
        outputs: [
          { id: 'success', name: 'Success', type: 'boolean', description: 'Whether reaction was added' }
        ]
      },
      {
        id: 'set_channel_topic',
        name: 'Set Channel Topic',
        description: 'Set or update channel topic',
        requiresAuth: true,
        inputs: [
          { id: 'channel', name: 'Channel', type: 'string', required: true, description: 'Channel ID or name' },
          { id: 'topic', name: 'Topic', type: 'string', required: true, description: 'New channel topic' }
        ],
        outputs: [
          { id: 'topic', name: 'Topic', type: 'string', description: 'Updated topic' },
          { id: 'channel', name: 'Channel', type: 'string', description: 'Channel ID' }
        ]
      },
      {
        id: 'get_channel_history',
        name: 'Get Channel History',
        description: 'Fetch message history from a Slack channel',
        requiresAuth: true,
        inputs: [
          { id: 'channel', name: 'Channel', type: 'string', required: true, description: 'Channel name (#general) or ID' },
          { id: 'limit', name: 'Limit', type: 'number', required: false, description: 'Number of messages to fetch (default: 100)' },
          { id: 'oldest', name: 'Oldest', type: 'string', required: false, description: 'Start timestamp (UNIX timestamp)' },
          { id: 'latest', name: 'Latest', type: 'string', required: false, description: 'End timestamp (UNIX timestamp)' }
        ],
        outputs: [
          { id: 'messages', name: 'Messages', type: 'array', description: 'Array of messages' },
          { id: 'count', name: 'Count', type: 'number', description: 'Number of messages fetched' },
          { id: 'has_more', name: 'Has More', type: 'boolean', description: 'Whether more messages are available' }
        ]
      }
    ]
  }

  getTriggers(): IntegrationTrigger[] {
    return [
      {
        id: 'message_posted',
        name: 'Message Posted',
        description: 'Triggers when a message is posted to a channel',
        type: 'webhook',
        outputs: [
          { id: 'channel', name: 'Channel', type: 'string', description: 'Channel ID where message was posted' },
          { id: 'user', name: 'User', type: 'string', description: 'User ID who posted the message' },
          { id: 'text', name: 'Text', type: 'string', description: 'Message text' },
          { id: 'ts', name: 'Timestamp', type: 'string', description: 'Message timestamp' },
          { id: 'thread_ts', name: 'Thread Timestamp', type: 'string', description: 'Thread timestamp if in thread' }
        ]
      },
      {
        id: 'mention_received',
        name: 'Bot Mentioned',
        description: 'Triggers when bot is mentioned in a message',
        type: 'webhook',
        outputs: [
          { id: 'channel', name: 'Channel', type: 'string', description: 'Channel ID where bot was mentioned' },
          { id: 'user', name: 'User', type: 'string', description: 'User ID who mentioned the bot' },
          { id: 'text', name: 'Text', type: 'string', description: 'Message text' },
          { id: 'ts', name: 'Timestamp', type: 'string', description: 'Message timestamp' }
        ]
      },
      {
        id: 'reaction_added',
        name: 'Reaction Added',
        description: 'Triggers when emoji reaction is added to message',
        type: 'webhook',
        outputs: [
          { id: 'reaction', name: 'Reaction', type: 'string', description: 'Emoji name' },
          { id: 'user', name: 'User', type: 'string', description: 'User ID who added the reaction' },
          { id: 'item_user', name: 'Item User', type: 'string', description: 'User ID who posted the original message' },
          { id: 'channel', name: 'Channel', type: 'string', description: 'Channel ID' },
          { id: 'ts', name: 'Timestamp', type: 'string', description: 'Message timestamp' }
        ]
      },
      {
        id: 'channel_created',
        name: 'Channel Created',
        description: 'Triggers when new channel is created',
        type: 'webhook',
        outputs: [
          { id: 'channel_id', name: 'Channel ID', type: 'string', description: 'Created channel ID' },
          { id: 'channel_name', name: 'Channel Name', type: 'string', description: 'Channel name' },
          { id: 'creator', name: 'Creator', type: 'string', description: 'User ID who created the channel' },
          { id: 'is_private', name: 'Is Private', type: 'boolean', description: 'Whether channel is private' }
        ]
      },
      {
        id: 'user_joined',
        name: 'User Joined',
        description: 'Triggers when user joins workspace',
        type: 'webhook',
        outputs: [
          { id: 'user_id', name: 'User ID', type: 'string', description: 'User ID who joined' },
          { id: 'user_name', name: 'User Name', type: 'string', description: 'Username' },
          { id: 'real_name', name: 'Real Name', type: 'string', description: 'User real name' },
          { id: 'email', name: 'Email', type: 'string', description: 'User email' }
        ]
      },
      {
        id: 'file_shared',
        name: 'File Shared',
        description: 'Triggers when file is shared in channel',
        type: 'webhook',
        outputs: [
          { id: 'file_id', name: 'File ID', type: 'string', description: 'Shared file ID' },
          { id: 'filename', name: 'Filename', type: 'string', description: 'File name' },
          { id: 'user', name: 'User', type: 'string', description: 'User ID who shared the file' },
          { id: 'channel', name: 'Channel', type: 'string', description: 'Channel ID where file was shared' },
          { id: 'url_private', name: 'Private URL', type: 'string', description: 'Private download URL' }
        ]
      }
    ]
  }

  async executeAction(actionId: string, inputs: Record<string, any>): Promise<any> {
    switch (actionId) {
      case 'send_message':
        return await this.sendMessage(inputs.channel, inputs.text, inputs)
      case 'send_dm':
        return await this.sendDirectMessage(inputs.user, inputs.text, inputs)
      case 'upload_file':
        return await this.uploadFile(inputs)
      case 'create_channel':
        return await this.createChannel(inputs.name, inputs)
      case 'invite_to_channel':
        return await this.inviteToChannel(inputs.channel, inputs.users)
      case 'get_user_info':
        return await this.getUserInfo(inputs.user)
      case 'list_channels':
        return await this.listChannels(inputs)
      case 'add_reaction':
        return await this.addReaction(inputs.channel, inputs.timestamp, inputs.name)
      case 'set_channel_topic':
        return await this.setChannelTopic(inputs.channel, inputs.topic)
      case 'get_channel_history':
        return await this.getChannelHistory(inputs.channel, inputs)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  // Send message to channel
  public async sendMessage(channel: string, text: string, options: any = {}): Promise<any> {
    const body: any = {
      channel,
      text,
    }

    if (options.thread_ts) body.thread_ts = options.thread_ts
    if (options.username) body.username = options.username
    if (options.icon_emoji) body.icon_emoji = options.icon_emoji
    if (options.attachments) body.attachments = options.attachments
    if (options.blocks) body.blocks = options.blocks

    const response = await this.makeSlackRequest('chat.postMessage', {
      method: 'POST',
      body: JSON.stringify(body)
    })

    return {
      ts: response.ts,
      channel: response.channel,
      permalink: `https://${this.slackCredentials?.team_name}.slack.com/archives/${response.channel}/p${response.ts.replace('.', '')}`
    }
  }

  // Send direct message to user
  private async sendDirectMessage(user: string, text: string, options: any = {}): Promise<any> {
    // First, open a DM channel with the user
    const dmResponse = await this.makeSlackRequest('conversations.open', {
      method: 'POST',
      body: JSON.stringify({ users: user })
    })

    const channel = dmResponse.channel.id

    // Now send the message
    const body: any = {
      channel,
      text,
    }

    if (options.attachments) body.attachments = options.attachments

    const response = await this.makeSlackRequest('chat.postMessage', {
      method: 'POST',
      body: JSON.stringify(body)
    })

    return {
      ts: response.ts,
      channel: response.channel
    }
  }

  // Upload file to Slack
  private async uploadFile(options: FileUploadOptions): Promise<any> {
    const formData = new FormData()

    if (options.channels) {
      formData.append('channels', options.channels.join(','))
    }
    if (options.content) {
      formData.append('content', options.content)
    }
    if (options.file) {
      formData.append('file', new Blob([new Uint8Array(options.file)]))
    }
    if (options.filename) {
      formData.append('filename', options.filename)
    }
    if (options.filetype) {
      formData.append('filetype', options.filetype)
    }
    if (options.initial_comment) {
      formData.append('initial_comment', options.initial_comment)
    }
    if (options.title) {
      formData.append('title', options.title)
    }

    const response = await fetch(`${this.baseUrl}/files.upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.slackCredentials?.access_token}`
      },
      body: formData
    })

    const data = await response.json()

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`)
    }

    return {
      file_id: data.file.id,
      permalink: data.file.permalink,
      url_private: data.file.url_private
    }
  }

  // Create a new channel
  private async createChannel(name: string, options: any = {}): Promise<any> {
    const body: any = {
      name: name.replace(/^#/, '') // Remove # if present
    }

    if (options.is_private !== undefined) {
      body.is_private = options.is_private
    }

    const endpoint = options.is_private ? 'conversations.create' : 'conversations.create'
    const response = await this.makeSlackRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    })

    // Set purpose and topic if provided
    if (options.purpose) {
      await this.makeSlackRequest('conversations.setPurpose', {
        method: 'POST',
        body: JSON.stringify({
          channel: response.channel.id,
          purpose: options.purpose
        })
      })
    }

    if (options.topic) {
      await this.makeSlackRequest('conversations.setTopic', {
        method: 'POST',
        body: JSON.stringify({
          channel: response.channel.id,
          topic: options.topic
        })
      })
    }

    return {
      channel_id: response.channel.id,
      channel_name: response.channel.name,
      is_private: response.channel.is_private || false
    }
  }

  // Invite users to a channel
  private async inviteToChannel(channel: string, users: string[]): Promise<any> {
    const response = await this.makeSlackRequest('conversations.invite', {
      method: 'POST',
      body: JSON.stringify({
        channel,
        users: users.join(',')
      })
    })

    return {
      channel: response.channel.id,
      invited_users: users
    }
  }

  // Get user information
  private async getUserInfo(user: string): Promise<any> {
    const response = await this.makeSlackRequest(`users.info?user=${user}`)

    const userData = response.user

    return {
      user: userData,
      is_bot: userData.is_bot,
      real_name: userData.real_name,
      email: userData.profile.email
    }
  }

  // List channels
  private async listChannels(options: any = {}): Promise<any> {
    const params = new URLSearchParams()

    if (options.exclude_archived !== undefined) {
      params.append('exclude_archived', String(options.exclude_archived))
    }

    if (options.types) {
      params.append('types', options.types)
    } else {
      params.append('types', 'public_channel,private_channel')
    }

    const response = await this.makeSlackRequest(`conversations.list?${params.toString()}`)

    return {
      channels: response.channels,
      total_count: response.channels.length
    }
  }

  // Add reaction to message
  private async addReaction(channel: string, timestamp: string, name: string): Promise<any> {
    await this.makeSlackRequest('reactions.add', {
      method: 'POST',
      body: JSON.stringify({
        channel,
        timestamp,
        name: name.replace(/:/g, '') // Remove colons if present
      })
    })

    return {
      success: true
    }
  }

  // Set channel topic
  private async setChannelTopic(channel: string, topic: string): Promise<any> {
    const response = await this.makeSlackRequest('conversations.setTopic', {
      method: 'POST',
      body: JSON.stringify({
        channel,
        topic
      })
    })

    return {
      topic: response.topic,
      channel: response.channel
    }
  }

  // Get channel history
  private async getChannelHistory(channel: string, options: any = {}): Promise<any> {
    const params = new URLSearchParams()

    // Add channel parameter
    params.append('channel', channel)

    // Add optional parameters
    if (options.limit) {
      params.append('limit', String(options.limit))
    } else {
      params.append('limit', '100') // Default to 100 messages
    }

    if (options.oldest) {
      params.append('oldest', options.oldest)
    }

    if (options.latest) {
      params.append('latest', options.latest)
    }

    const response = await this.makeSlackRequest(`conversations.history?${params.toString()}`)

    return {
      messages: response.messages || [],
      count: response.messages?.length || 0,
      has_more: response.has_more || false
    }
  }


}