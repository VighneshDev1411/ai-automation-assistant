// src/lib/integrations/providers/microsoft/MicrosoftIntegration.ts

import { BaseIntegration, IntegrationAction, IntegrationTrigger } from '../../base-integration'

export interface MicrosoftCredentials {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  expires_at: number
  scope: string
  id_token?: string
}

export interface MicrosoftConfig {
  clientId: string
  clientSecret: string
  tenantId: string
  redirectUri: string
  scopes: string[]
}

export interface MicrosoftUser {
  id: string
  userPrincipalName: string
  displayName: string
  givenName?: string
  surname?: string
  mail?: string
  mobilePhone?: string
  officeLocation?: string
  preferredLanguage?: string
  jobTitle?: string
  department?: string
  companyName?: string
}

export interface OutlookMessage {
  id: string
  subject: string
  bodyPreview: string
  body: {
    contentType: 'text' | 'html'
    content: string
  }
  from: {
    emailAddress: {
      name: string
      address: string
    }
  }
  toRecipients: Array<{
    emailAddress: {
      name: string
      address: string
    }
  }>
  ccRecipients?: Array<{
    emailAddress: {
      name: string
      address: string
    }
  }>
  bccRecipients?: Array<{
    emailAddress: {
      name: string
      address: string
    }
  }>
  receivedDateTime: string
  sentDateTime: string
  hasAttachments: boolean
  importance: 'low' | 'normal' | 'high'
  isRead: boolean
  isDraft: boolean
  webLink: string
  attachments?: OutlookAttachment[]
}

export interface OutlookAttachment {
  id: string
  name: string
  contentType: string
  size: number
  isInline: boolean
  contentBytes?: string
}

export interface TeamsMessage {
  id: string
  messageType: 'message' | 'chatMessage' | 'typing'
  createdDateTime: string
  lastModifiedDateTime: string
  deletedDateTime?: string
  subject?: string
  summary?: string
  body: {
    contentType: 'text' | 'html'
    content: string
  }
  from: {
    user?: {
      id: string
      displayName: string
      userIdentityType: string
    }
    application?: {
      id: string
      displayName: string
      applicationIdentityType: string
    }
  }
  attachments?: TeamsAttachment[]
  mentions?: TeamsMention[]
  reactions?: TeamsReaction[]
  replies?: TeamsMessage[]
  webUrl?: string
}

export interface TeamsAttachment {
  id: string
  contentType: string
  contentUrl?: string
  content?: any
  name?: string
  thumbnailUrl?: string
}

export interface TeamsMention {
  id: number
  mentionText: string
  mentioned: {
    user?: {
      id: string
      displayName: string
      userIdentityType: string
    }
  }
}

export interface TeamsReaction {
  reactionType: string
  createdDateTime: string
  user: {
    id: string
    displayName: string
  }
}

export interface OneDriveItem {
  id: string
  name: string
  size: number
  createdDateTime: string
  lastModifiedDateTime: string
  webUrl: string
  downloadUrl?: string
  file?: {
    mimeType: string
    hashes?: {
      sha1Hash?: string
      sha256Hash?: string
    }
  }
  folder?: {
    childCount: number
  }
  parentReference?: {
    driveId: string
    driveType: string
    id: string
    name: string
    path: string
  }
  createdBy: {
    user: {
      id: string
      displayName: string
    }
  }
  lastModifiedBy: {
    user: {
      id: string
      displayName: string
    }
  }
}

export interface CalendarEvent {
  id: string
  subject: string
  body: {
    contentType: 'text' | 'html'
    content: string
  }
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  location?: {
    displayName: string
    address?: {
      street?: string
      city?: string
      state?: string
      countryOrRegion?: string
      postalCode?: string
    }
  }
  attendees: Array<{
    emailAddress: {
      name: string
      address: string
    }
    status: {
      response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded'
      time: string
    }
    type: 'required' | 'optional' | 'resource'
  }>
  organizer: {
    emailAddress: {
      name: string
      address: string
    }
  }
  createdDateTime: string
  lastModifiedDateTime: string
  webLink: string
  isOnlineMeeting?: boolean
  onlineMeetingUrl?: string
  onlineMeetingProvider?: 'teamsForBusiness' | 'skypeForBusiness' | 'skypeForConsumer'
}

export class MicrosoftIntegration extends BaseIntegration {
  private microsoftCredentials?: MicrosoftCredentials
  private microsoftConfig: MicrosoftConfig
  private graphApiUrl = 'https://graph.microsoft.com/v1.0'
  private authUrl = 'https://login.microsoftonline.com'

  constructor(config: MicrosoftConfig, credentials?: MicrosoftCredentials) {
    super({
      id: 'microsoft',
      name: 'Microsoft 365',
      description: 'Connect to Outlook, Teams, OneDrive, and SharePoint',
      icon: '🏢',
      category: 'productivity',
      authType: 'oauth2',
      scopes: config.scopes,
      endpoints: {
        auth: `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`,
        token: `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
        api: 'https://graph.microsoft.com/v1.0'
      },
      rateLimit: {
        requests: 10000,
        per: 'hour'
      },
      actions: [],
      triggers: []
    })
    
    this.microsoftConfig = config
    if (credentials) {
      this.microsoftCredentials = credentials
      this.setCredentials(credentials)
    }
  }

  getName(): string {
    return 'Microsoft 365'
  }

  getDescription(): string {
    return 'Connect to Outlook, Teams, OneDrive, and SharePoint'
  }

  getIcon(): string {
    return '🏢'
  }

  // Generate OAuth URL for Microsoft authorization
  getAuthUrl(state?: string): string {
    const scopes = [
      'openid',
      'profile',
      'email',
      'offline_access',
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/Files.ReadWrite.All',
      'https://graph.microsoft.com/Sites.ReadWrite.All',
      'https://graph.microsoft.com/ChannelMessage.Send',
      'https://graph.microsoft.com/Chat.ReadWrite',
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/Directory.Read.All'
    ].join(' ')

    const params = new URLSearchParams({
      client_id: this.microsoftConfig.clientId,
      response_type: 'code',
      redirect_uri: this.microsoftConfig.redirectUri,
      scope: scopes,
      response_mode: 'query'
    })

    if (state) {
      params.append('state', state)
    }

    return `${this.authUrl}/${this.microsoftConfig.tenantId}/oauth2/v2.0/authorize?${params.toString()}`
  }

  // Exchange authorization code for access token
  async exchangeCodeForTokens(code: string): Promise<MicrosoftCredentials> {
    const tokenEndpoint = `${this.authUrl}/${this.microsoftConfig.tenantId}/oauth2/v2.0/token`
    
    const body = new URLSearchParams({
      client_id: this.microsoftConfig.clientId,
      client_secret: this.microsoftConfig.clientSecret,
      code,
      redirect_uri: this.microsoftConfig.redirectUri,
      grant_type: 'authorization_code'
    })

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Microsoft OAuth error: ${error}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`Microsoft OAuth error: ${data.error_description}`)
    }

    const credentials: MicrosoftCredentials = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000),
      scope: data.scope,
      id_token: data.id_token
    }

    this.microsoftCredentials = credentials
    this.setCredentials(credentials)
    return credentials
  }

  // BaseIntegration abstract methods
  async authenticate(params: { code: string }): Promise<MicrosoftCredentials> {
    return this.exchangeCodeForTokens(params.code)
  }

  async refreshToken(): Promise<MicrosoftCredentials> {
    if (!this.microsoftCredentials?.refresh_token) {
      throw new Error('No refresh token available')
    }

    const tokenEndpoint = `${this.authUrl}/${this.microsoftConfig.tenantId}/oauth2/v2.0/token`
    
    const body = new URLSearchParams({
      client_id: this.microsoftConfig.clientId,
      client_secret: this.microsoftConfig.clientSecret,
      refresh_token: this.microsoftCredentials.refresh_token,
      grant_type: 'refresh_token'
    })

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Microsoft token refresh error: ${error}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`Microsoft token refresh error: ${data.error_description}`)
    }

    const credentials: MicrosoftCredentials = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || this.microsoftCredentials.refresh_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000),
      scope: data.scope
    }

    this.microsoftCredentials = credentials
    this.setCredentials(credentials)
    return credentials
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.getCurrentUser()
      return true
    } catch (error) {
      return false
    }
  }

  // Make authenticated request to Microsoft Graph API
  async makeGraphRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.microsoftCredentials?.access_token) {
      throw new Error('Microsoft integration not authenticated')
    }

    // Check if token is expired and refresh if needed
    if (Date.now() >= this.microsoftCredentials.expires_at) {
      await this.refreshToken()
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.graphApiUrl}/${endpoint}`
    
    const headers = {
      'Authorization': `Bearer ${this.microsoftCredentials.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Microsoft Graph API request failed: ${response.status} ${errorText}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }

    return await response.text()
  }

  // Get current user information
  async getCurrentUser(): Promise<MicrosoftUser> {
    const response = await this.makeGraphRequest('me')
    
    return {
      id: response.id,
      userPrincipalName: response.userPrincipalName,
      displayName: response.displayName,
      givenName: response.givenName,
      surname: response.surname,
      mail: response.mail,
      mobilePhone: response.mobilePhone,
      officeLocation: response.officeLocation,
      preferredLanguage: response.preferredLanguage,
      jobTitle: response.jobTitle,
      department: response.department,
      companyName: response.companyName
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getCurrentUser()
      return true
    } catch (error) {
      console.error('Microsoft connection test failed:', error)
      return false
    }
  }

  getActions(): IntegrationAction[] {
    return [
      // Outlook Email Actions
      {
        id: 'send_email',
        name: 'Send Email',
        description: 'Send an email via Outlook',
        requiresAuth: true,
        inputs: [
          { id: 'to', name: 'To', type: 'string', required: true, description: 'Recipient email addresses (comma separated)' },
          { id: 'subject', name: 'Subject', type: 'string', required: true, description: 'Email subject' },
          { id: 'body', name: 'Body', type: 'string', required: true, description: 'Email content' },
          { id: 'cc', name: 'CC', type: 'string', required: false, description: 'CC recipients (comma separated)' },
          { id: 'bcc', name: 'BCC', type: 'string', required: false, description: 'BCC recipients (comma separated)' },
          { id: 'isHtml', name: 'Is HTML', type: 'boolean', required: false, description: 'Send as HTML email' },
          { id: 'importance', name: 'Importance', type: 'string', required: false, description: 'low, normal, or high' },
          { id: 'attachments', name: 'Attachments', type: 'array', required: false, description: 'File attachments' }
        ],
        outputs: [
          { id: 'messageId', name: 'Message ID', type: 'string', description: 'Sent message ID' },
          { id: 'webLink', name: 'Web Link', type: 'string', description: 'Link to view email' },
          { id: 'sentDateTime', name: 'Sent Date Time', type: 'string', description: 'When email was sent' }
        ]
      },
      {
        id: 'search_emails',
        name: 'Search Emails',
        description: 'Search for emails in Outlook',
        requiresAuth: true,
        inputs: [
          { id: 'query', name: 'Query', type: 'string', required: false, description: 'Search query' },
          { id: 'folder', name: 'Folder', type: 'string', required: false, description: 'Mail folder (inbox, sent, drafts)' },
          { id: 'from', name: 'From', type: 'string', required: false, description: 'Filter by sender' },
          { id: 'subject', name: 'Subject', type: 'string', required: false, description: 'Filter by subject' },
          { id: 'isUnread', name: 'Is Unread', type: 'boolean', required: false, description: 'Only unread emails' },
          { id: 'maxResults', name: 'Max Results', type: 'number', required: false, description: 'Maximum results (default: 10)' }
        ],
        outputs: [
          { id: 'emails', name: 'Emails', type: 'array', description: 'Found emails' },
          { id: 'totalCount', name: 'Total Count', type: 'number', description: 'Total matching emails' }
        ]
      },

      // Calendar Actions
      {
        id: 'create_event',
        name: 'Create Calendar Event',
        description: 'Create a new calendar event',
        requiresAuth: true,
        inputs: [
          { id: 'subject', name: 'Subject', type: 'string', required: true, description: 'Event subject' },
          { id: 'body', name: 'Body', type: 'string', required: false, description: 'Event description' },
          { id: 'startDateTime', name: 'Start Date Time', type: 'string', required: true, description: 'Start date/time (ISO format)' },
          { id: 'endDateTime', name: 'End Date Time', type: 'string', required: true, description: 'End date/time (ISO format)' },
          { id: 'timeZone', name: 'Time Zone', type: 'string', required: false, description: 'Time zone' },
          { id: 'location', name: 'Location', type: 'string', required: false, description: 'Event location' },
          { id: 'attendees', name: 'Attendees', type: 'array', required: false, description: 'Attendee email addresses' },
          { id: 'isOnlineMeeting', name: 'Is Online Meeting', type: 'boolean', required: false, description: 'Create Teams meeting' }
        ],
        outputs: [
          { id: 'eventId', name: 'Event ID', type: 'string', description: 'Created event ID' },
          { id: 'webLink', name: 'Web Link', type: 'string', description: 'Link to view event' },
          { id: 'onlineMeetingUrl', name: 'Online Meeting URL', type: 'string', description: 'Teams meeting URL' }
        ]
      },

      // OneDrive Actions
      {
        id: 'upload_file',
        name: 'Upload File to OneDrive',
        description: 'Upload a file to OneDrive',
        requiresAuth: true,
        inputs: [
          { id: 'fileName', name: 'File Name', type: 'string', required: true, description: 'File name' },
          { id: 'content', name: 'Content', type: 'string', required: true, description: 'File content (base64)' },
          { id: 'folderPath', name: 'Folder Path', type: 'string', required: false, description: 'Folder path (default: root)' },
          { id: 'conflictBehavior', name: 'Conflict Behavior', type: 'string', required: false, description: 'rename, replace, or fail' }
        ],
        outputs: [
          { id: 'fileId', name: 'File ID', type: 'string', description: 'Uploaded file ID' },
          { id: 'fileName', name: 'File Name', type: 'string', description: 'File name' },
          { id: 'webUrl', name: 'Web URL', type: 'string', description: 'Link to view file' },
          { id: 'downloadUrl', name: 'Download URL', type: 'string', description: 'Direct download link' }
        ]
      },

      // Teams Actions
      {
        id: 'send_teams_message',
        name: 'Send Teams Message',
        description: 'Send a message to Microsoft Teams channel',
        requiresAuth: true,
        inputs: [
          { id: 'teamId', name: 'Team ID', type: 'string', required: true, description: 'Microsoft Teams team ID' },
          { id: 'channelId', name: 'Channel ID', type: 'string', required: true, description: 'Teams channel ID' },
          { id: 'message', name: 'Message', type: 'string', required: true, description: 'Message content' },
          { id: 'messageType', name: 'Message Type', type: 'string', required: false, description: 'text or html' }
        ],
        outputs: [
          { id: 'messageId', name: 'Message ID', type: 'string', description: 'Sent message ID' },
          { id: 'webUrl', name: 'Web URL', type: 'string', description: 'Link to view message' },
          { id: 'createdDateTime', name: 'Created Date Time', type: 'string', description: 'When message was created' }
        ]
      }
    ]
  }

  getTriggers(): IntegrationTrigger[] {
    return [
      {
        id: 'email_received',
        name: 'Email Received',
        description: 'Triggers when a new email is received',
        type: 'webhook',
        outputs: [
          { id: 'messageId', name: 'Message ID', type: 'string', description: 'Email message ID' },
          { id: 'subject', name: 'Subject', type: 'string', description: 'Email subject' },
          { id: 'from', name: 'From', type: 'string', description: 'Sender email address' },
          { id: 'body', name: 'Body', type: 'string', description: 'Email body content' },
          { id: 'receivedDateTime', name: 'Received Date Time', type: 'string', description: 'When email was received' }
        ]
      },
      {
        id: 'calendar_event_created',
        name: 'Calendar Event Created',
        description: 'Triggers when a new calendar event is created',
        type: 'webhook',
        outputs: [
          { id: 'eventId', name: 'Event ID', type: 'string', description: 'Calendar event ID' },
          { id: 'subject', name: 'Subject', type: 'string', description: 'Event subject' },
          { id: 'organizer', name: 'Organizer', type: 'string', description: 'Event organizer email' },
          { id: 'startDateTime', name: 'Start Date Time', type: 'string', description: 'Event start time' },
          { id: 'endDateTime', name: 'End Date Time', type: 'string', description: 'Event end time' }
        ]
      },
      {
        id: 'file_uploaded',
        name: 'File Uploaded to OneDrive',
        description: 'Triggers when a file is uploaded to OneDrive',
        type: 'webhook',
        outputs: [
          { id: 'fileId', name: 'File ID', type: 'string', description: 'Uploaded file ID' },
          { id: 'fileName', name: 'File Name', type: 'string', description: 'File name' },
          { id: 'fileSize', name: 'File Size', type: 'number', description: 'File size in bytes' },
          { id: 'createdBy', name: 'Created By', type: 'string', description: 'User who uploaded the file' },
          { id: 'webUrl', name: 'Web URL', type: 'string', description: 'Link to view file' }
        ]
      },
      {
        id: 'teams_message_posted',
        name: 'Teams Message Posted',
        description: 'Triggers when a message is posted in Teams',
        type: 'webhook',
        outputs: [
          { id: 'messageId', name: 'Message ID', type: 'string', description: 'Teams message ID' },
          { id: 'teamId', name: 'Team ID', type: 'string', description: 'Team ID' },
          { id: 'channelId', name: 'Channel ID', type: 'string', description: 'Channel ID' },
          { id: 'message', name: 'Message', type: 'string', description: 'Message content' },
          { id: 'from', name: 'From', type: 'string', description: 'Message sender' },
          { id: 'createdDateTime', name: 'Created Date Time', type: 'string', description: 'When message was posted' }
        ]
      }
    ]
  }

  // Add these methods to the MicrosoftIntegration class in MicrosoftIntegration.ts

  async executeAction(actionId: string, inputs: Record<string, any>): Promise<any> {
    switch (actionId) {
      // Outlook Email Actions
      case 'send_email':
        return await this.sendEmail({
          to: inputs.to,
          subject: inputs.subject,
          body: inputs.body,
          cc: inputs.cc,
          bcc: inputs.bcc,
          isHtml: inputs.isHtml,
          importance: inputs.importance,
          attachments: inputs.attachments
        })
      case 'search_emails':
        return await this.searchEmails(inputs)
      case 'get_email':
        return await this.getEmail(inputs.messageId, inputs.includeAttachments)
      case 'reply_to_email':
        return await this.replyToEmail(inputs.messageId, inputs.body, inputs.replyAll)

      // Calendar Actions
      case 'create_event':
        return await this.createCalendarEvent({
          subject: inputs.subject,
          body: inputs.body,
          startDateTime: inputs.startDateTime,
          endDateTime: inputs.endDateTime,
          timeZone: inputs.timeZone,
          location: inputs.location,
          attendees: inputs.attendees,
          isOnlineMeeting: inputs.isOnlineMeeting
        })
      case 'update_event':
        return await this.updateCalendarEvent(inputs.eventId, {
          subject: inputs.subject,
          body: inputs.body,
          startDateTime: inputs.startDateTime,
          endDateTime: inputs.endDateTime,
          location: inputs.location
        })
      case 'delete_event':
        return await this.deleteCalendarEvent(inputs.eventId)
      case 'get_events':
        return await this.getCalendarEvents(inputs)

      // OneDrive Actions
      case 'upload_file':
        return await this.uploadFileToOneDrive({
          fileName: inputs.fileName,
          content: inputs.content,
          folderPath: inputs.folderPath,
          conflictBehavior: inputs.conflictBehavior
        })
      case 'download_file':
        return await this.downloadFileFromOneDrive(inputs.fileId)
      case 'search_files':
        return await this.searchOneDriveFiles(inputs.query, inputs.maxResults)
      case 'create_folder':
        return await this.createOneDriveFolder(inputs.name, inputs.parentPath)

      // Teams Actions
      case 'send_teams_message':
        return await this.sendTeamsMessage(inputs.teamId, inputs.channelId, inputs.message, inputs.messageType)
      case 'get_teams':
        return await this.getUserTeams()
      case 'get_team_channels':
        return await this.getTeamChannels(inputs.teamId)

      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  // ==================== OUTLOOK EMAIL METHODS ====================

  // Send email via Outlook
  async sendEmail(options: {
    to: string
    subject: string
    body: string
    cc?: string
    bcc?: string
    isHtml?: boolean
    importance?: 'low' | 'normal' | 'high'
    attachments?: Array<{
      name: string
      contentBytes: string
      contentType: string
    }>
  }): Promise<{
    messageId: string
    webLink: string
    sentDateTime: string
  }> {
    const toRecipients = options.to.split(',').map(email => ({
      emailAddress: {
        address: email.trim()
      }
    }))

    const ccRecipients = options.cc ? options.cc.split(',').map(email => ({
      emailAddress: {
        address: email.trim()
      }
    })) : []

    const bccRecipients = options.bcc ? options.bcc.split(',').map(email => ({
      emailAddress: {
        address: email.trim()
      }
    })) : []

    const message: any = {
      subject: options.subject,
      body: {
        contentType: options.isHtml ? 'html' : 'text',
        content: options.body
      },
      toRecipients,
      importance: options.importance || 'normal'
    }

    if (ccRecipients.length > 0) {
      message.ccRecipients = ccRecipients
    }

    if (bccRecipients.length > 0) {
      message.bccRecipients = bccRecipients
    }

    // Add attachments if provided
    if (options.attachments && options.attachments.length > 0) {
      message.attachments = options.attachments.map(attachment => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.name,
        contentBytes: attachment.contentBytes,
        contentType: attachment.contentType
      }))
    }

    const response = await this.makeGraphRequest('me/sendMail', {
      method: 'POST',
      body: JSON.stringify({
        message,
        saveToSentItems: true
      })
    })

    // Get the sent message from sent items
    const sentMessages = await this.makeGraphRequest('me/mailFolders/sentitems/messages?$top=1&$orderby=sentDateTime desc')
    const sentMessage = sentMessages.value[0]

    return {
      messageId: sentMessage.id,
      webLink: sentMessage.webLink,
      sentDateTime: sentMessage.sentDateTime
    }
  }

  // Search emails in Outlook
  async searchEmails(options: {
    query?: string
    folder?: string
    from?: string
    subject?: string
    isUnread?: boolean
    maxResults?: number
  }): Promise<{
    emails: OutlookMessage[]
    totalCount: number
  }> {
    let endpoint = 'me/messages'
    
    // Use specific folder if provided
    if (options.folder) {
      const folderMap: Record<string, string> = {
        'inbox': 'inbox',
        'sent': 'sentitems',
        'drafts': 'drafts',
        'deleted': 'deleteditems'
      }
      
      const folderId = folderMap[options.folder.toLowerCase()] || options.folder
      endpoint = `me/mailFolders/${folderId}/messages`
    }

    // Build filter query
    const filters: string[] = []
    
    if (options.from) {
      filters.push(`from/emailAddress/address eq '${options.from}'`)
    }
    
    if (options.subject) {
      filters.push(`contains(subject,'${options.subject}')`)
    }
    
    if (options.isUnread !== undefined) {
      filters.push(`isRead eq ${!options.isUnread}`)
    }

    // Build search query
    let queryParams = `$top=${options.maxResults || 10}&$orderby=receivedDateTime desc`
    
    if (filters.length > 0) {
      queryParams += `&$filter=${filters.join(' and ')}`
    }
    
    if (options.query) {
      queryParams += `&$search="${options.query}"`
    }

    const response = await this.makeGraphRequest(`${endpoint}?${queryParams}`)

    const emails: OutlookMessage[] = response.value.map((msg: any) => ({
      id: msg.id,
      subject: msg.subject,
      bodyPreview: msg.bodyPreview,
      body: msg.body,
      from: msg.from,
      toRecipients: msg.toRecipients,
      ccRecipients: msg.ccRecipients,
      bccRecipients: msg.bccRecipients,
      receivedDateTime: msg.receivedDateTime,
      sentDateTime: msg.sentDateTime,
      hasAttachments: msg.hasAttachments,
      importance: msg.importance,
      isRead: msg.isRead,
      isDraft: msg.isDraft,
      webLink: msg.webLink
    }))

    return {
      emails,
      totalCount: response['@odata.count'] || emails.length
    }
  }

  // Get specific email
  async getEmail(messageId: string, includeAttachments = false): Promise<{
    email: OutlookMessage
    attachments: OutlookAttachment[]
  }> {
    const response = await this.makeGraphRequest(`me/messages/${messageId}`)
    
    const email: OutlookMessage = {
      id: response.id,
      subject: response.subject,
      bodyPreview: response.bodyPreview,
      body: response.body,
      from: response.from,
      toRecipients: response.toRecipients,
      ccRecipients: response.ccRecipients,
      bccRecipients: response.bccRecipients,
      receivedDateTime: response.receivedDateTime,
      sentDateTime: response.sentDateTime,
      hasAttachments: response.hasAttachments,
      importance: response.importance,
      isRead: response.isRead,
      isDraft: response.isDraft,
      webLink: response.webLink
    }

    let attachments: OutlookAttachment[] = []

    if (includeAttachments && response.hasAttachments) {
      const attachmentsResponse = await this.makeGraphRequest(`me/messages/${messageId}/attachments`)
      
      attachments = attachmentsResponse.value.map((att: any) => ({
        id: att.id,
        name: att.name,
        contentType: att.contentType,
        size: att.size,
        isInline: att.isInline,
        contentBytes: att.contentBytes
      }))
    }

    return { email, attachments }
  }

  // Reply to email
  async replyToEmail(messageId: string, body: string, replyAll = false): Promise<{
    messageId: string
    sentDateTime: string
  }> {
    const endpoint = replyAll ? `me/messages/${messageId}/replyAll` : `me/messages/${messageId}/reply`
    
    const response = await this.makeGraphRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        comment: body
      })
    })

    return {
      messageId: response.id || messageId,
      sentDateTime: new Date().toISOString()
    }
  }

  // ==================== CALENDAR METHODS ====================

  // Create calendar event
  async createCalendarEvent(options: {
    subject: string
    body?: string
    startDateTime: string
    endDateTime: string
    timeZone?: string
    location?: string
    attendees?: string[]
    isOnlineMeeting?: boolean
  }): Promise<{
    eventId: string
    webLink: string
    onlineMeetingUrl?: string
  }> {
    const timeZone = options.timeZone || 'UTC'
    
    const event: any = {
      subject: options.subject,
      body: {
        contentType: 'html',
        content: options.body || ''
      },
      start: {
        dateTime: options.startDateTime,
        timeZone
      },
      end: {
        dateTime: options.endDateTime,
        timeZone
      }
    }

    if (options.location) {
      event.location = {
        displayName: options.location
      }
    }

    if (options.attendees && options.attendees.length > 0) {
      event.attendees = options.attendees.map(email => ({
        emailAddress: {
          address: email.trim(),
          name: email.trim()
        },
        type: 'required'
      }))
    }

    if (options.isOnlineMeeting) {
      event.isOnlineMeeting = true
      event.onlineMeetingProvider = 'teamsForBusiness'
    }

    const response = await this.makeGraphRequest('me/events', {
      method: 'POST',
      body: JSON.stringify(event)
    })

    return {
      eventId: response.id,
      webLink: response.webLink,
      onlineMeetingUrl: response.onlineMeeting?.joinUrl
    }
  }

  // Update calendar event
  async updateCalendarEvent(eventId: string, updates: {
    subject?: string
    body?: string
    startDateTime?: string
    endDateTime?: string
    location?: string
  }): Promise<{
    eventId: string
    webLink: string
    lastModifiedDateTime: string
  }> {
    const updateData: any = {}

    if (updates.subject) updateData.subject = updates.subject
    if (updates.body) {
      updateData.body = {
        contentType: 'html',
        content: updates.body
      }
    }
    if (updates.startDateTime) {
      updateData.start = {
        dateTime: updates.startDateTime,
        timeZone: 'UTC'
      }
    }
    if (updates.endDateTime) {
      updateData.end = {
        dateTime: updates.endDateTime,
        timeZone: 'UTC'
      }
    }
    if (updates.location) {
      updateData.location = {
        displayName: updates.location
      }
    }

    const response = await this.makeGraphRequest(`me/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    })

    return {
      eventId: response.id,
      webLink: response.webLink,
      lastModifiedDateTime: response.lastModifiedDateTime
    }
  }

  // Delete calendar event
  async deleteCalendarEvent(eventId: string): Promise<{
    success: boolean
    eventId: string
  }> {
    try {
      await this.makeGraphRequest(`me/events/${eventId}`, {
        method: 'DELETE'
      })

      return {
        success: true,
        eventId
      }
    } catch (error) {
      console.error('Failed to delete calendar event:', error)
      return {
        success: false,
        eventId
      }
    }
  }

  // Get calendar events
  async getCalendarEvents(options: {
    startTime?: string
    endTime?: string
    maxResults?: number
  } = {}): Promise<{
    events: CalendarEvent[]
    totalCount: number
  }> {
    let queryParams = `$top=${options.maxResults || 50}&$orderby=start/dateTime`

    if (options.startTime && options.endTime) {
      queryParams += `&$filter=start/dateTime ge '${options.startTime}' and end/dateTime le '${options.endTime}'`
    }

    const response = await this.makeGraphRequest(`me/events?${queryParams}`)

    const events: CalendarEvent[] = response.value.map((event: any) => ({
      id: event.id,
      subject: event.subject,
      body: event.body,
      start: event.start,
      end: event.end,
      location: event.location,
      attendees: event.attendees || [],
      organizer: event.organizer,
      createdDateTime: event.createdDateTime,
      lastModifiedDateTime: event.lastModifiedDateTime,
      webLink: event.webLink,
      isOnlineMeeting: event.isOnlineMeeting,
      onlineMeetingUrl: event.onlineMeeting?.joinUrl,
      onlineMeetingProvider: event.onlineMeetingProvider
    }))

    return {
      events,
      totalCount: events.length
    }
  }

  // ==================== ONEDRIVE METHODS ====================

  // Upload file to OneDrive
  async uploadFileToOneDrive(options: {
    fileName: string
    content: string
    folderPath?: string
    conflictBehavior?: 'rename' | 'replace' | 'fail'
  }): Promise<{
    fileId: string
    fileName: string
    webUrl: string
    downloadUrl: string
  }> {
    const content = Buffer.from(options.content, 'base64')
    const folderPath = options.folderPath || ''
    const conflictBehavior = options.conflictBehavior || 'rename'
    
    // Construct the upload path
    const uploadPath = folderPath 
      ? `me/drive/root:/${folderPath}/${options.fileName}:/content`
      : `me/drive/root:/${options.fileName}:/content`

    const response = await this.makeGraphRequest(uploadPath, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${this.microsoftCredentials?.access_token}`
      },
      body: content
    })

    return {
      fileId: response.id,
      fileName: response.name,
      webUrl: response.webUrl,
      downloadUrl: response['@microsoft.graph.downloadUrl']
    }
  }

  // Download file from OneDrive
  async downloadFileFromOneDrive(fileId: string): Promise<{
    fileName: string
    content: string
    mimeType: string
    size: number
  }> {
    // Get file metadata first
    const fileInfo = await this.makeGraphRequest(`me/drive/items/${fileId}`)
    
    // Get download URL
    const downloadResponse = await this.makeGraphRequest(`me/drive/items/${fileId}/content`, {
      method: 'GET'
    })

    // Convert response to base64
    const arrayBuffer = await downloadResponse.arrayBuffer()
    const content = Buffer.from(arrayBuffer).toString('base64')

    return {
      fileName: fileInfo.name,
      content,
      mimeType: fileInfo.file?.mimeType || 'application/octet-stream',
      size: fileInfo.size
    }
  }

  // Search files in OneDrive
  async searchOneDriveFiles(query: string, maxResults = 20): Promise<{
    files: OneDriveItem[]
    totalCount: number
  }> {
    const response = await this.makeGraphRequest(`me/drive/root/search(q='${query}')?$top=${maxResults}`)

    const files: OneDriveItem[] = response.value.map((item: any) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      createdDateTime: item.createdDateTime,
      lastModifiedDateTime: item.lastModifiedDateTime,
      webUrl: item.webUrl,
      downloadUrl: item['@microsoft.graph.downloadUrl'],
      file: item.file,
      folder: item.folder,
      parentReference: item.parentReference,
      createdBy: item.createdBy,
      lastModifiedBy: item.lastModifiedBy
    }))

    return {
      files,
      totalCount: files.length
    }
  }

  // Create folder in OneDrive
  async createOneDriveFolder(name: string, parentPath = ''): Promise<{
    folderId: string
    folderName: string
    webUrl: string
  }> {
    const parentEndpoint = parentPath 
      ? `me/drive/root:/${parentPath}:/children`
      : 'me/drive/root/children'

    const folderData = {
      name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename'
    }

    const response = await this.makeGraphRequest(parentEndpoint, {
      method: 'POST',
      body: JSON.stringify(folderData)
    })

    return {
      folderId: response.id,
      folderName: response.name,
      webUrl: response.webUrl
    }
  }

  // ==================== TEAMS METHODS ====================

  // Send message to Teams channel
  async sendTeamsMessage(
    teamId: string, 
    channelId: string, 
    message: string, 
    messageType: 'text' | 'html' = 'text'
  ): Promise<{
    messageId: string
    webUrl?: string
    createdDateTime: string
  }> {
    const messageData = {
      body: {
        contentType: messageType,
        content: message
      }
    }

    const response = await this.makeGraphRequest(`teams/${teamId}/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData)
    })

    return {
      messageId: response.id,
      webUrl: response.webUrl,
      createdDateTime: response.createdDateTime
    }
  }

  // Get user's teams
  async getUserTeams(): Promise<{
    teams: Array<{
      id: string
      displayName: string
      description?: string
      webUrl: string
    }>
    totalCount: number
  }> {
    const response = await this.makeGraphRequest('me/joinedTeams')

    const teams = response.value.map((team: any) => ({
      id: team.id,
      displayName: team.displayName,
      description: team.description,
      webUrl: team.webUrl
    }))

    return {
      teams,
      totalCount: teams.length
    }
  }

  // Get channels in a team
  async getTeamChannels(teamId: string): Promise<{
    channels: Array<{
      id: string
      displayName: string
      description?: string
      webUrl: string
      membershipType: string
    }>
    totalCount: number
  }> {
    const response = await this.makeGraphRequest(`teams/${teamId}/channels`)

    const channels = response.value.map((channel: any) => ({
      id: channel.id,
      displayName: channel.displayName,
      description: channel.description,
      webUrl: channel.webUrl,
      membershipType: channel.membershipType
    }))

    return {
      channels,
      totalCount: channels.length
    }
  }

  // ==================== SHAREPOINT METHODS ====================

  // Get SharePoint sites
  async getSharePointSites(): Promise<{
    sites: Array<{
      id: string
      displayName: string
      webUrl: string
      description?: string
    }>
    totalCount: number
  }> {
    const response = await this.makeGraphRequest('sites?search=*')

    const sites = response.value.map((site: any) => ({
      id: site.id,
      displayName: site.displayName,
      webUrl: site.webUrl,
      description: site.description
    }))

    return {
      sites,
      totalCount: sites.length
    }
  }

  // ==================== UTILITY METHODS ====================

  // Get user profile photo
  async getUserPhoto(userId = 'me'): Promise<{
    photoData: string
    contentType: string
  }> {
    try {
      const photoResponse = await this.makeGraphRequest(`${userId}/photo/$value`, {
        headers: {
          'Authorization': `Bearer ${this.microsoftCredentials?.access_token}`
        }
      })

      const arrayBuffer = await photoResponse.arrayBuffer()
      const photoData = Buffer.from(arrayBuffer).toString('base64')

      // Get photo metadata
      const photoMetadata = await this.makeGraphRequest(`${userId}/photo`)

      return {
        photoData,
        contentType: photoMetadata['@odata.mediaContentType'] || 'image/jpeg'
      }
    } catch (error) {
      throw new Error('Unable to retrieve user photo')
    }
  }

  // Set user presence (if needed)
  async setUserPresence(availability: 'Available' | 'Busy' | 'Away' | 'BeRightBack' | 'DoNotDisturb' | 'Offline'): Promise<{
    success: boolean
  }> {
    try {
      await this.makeGraphRequest('me/presence/setPresence', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: `workflow-${Date.now()}`,
          availability,
          activity: availability
        })
      })

      return { success: true }
    } catch (error) {
      console.error('Failed to set presence:', error)
      return { success: false }
    }
  }

  // Create webhook subscription (for triggers)
  async createWebhookSubscription(resource: string, changeType: string, notificationUrl: string): Promise<{
    subscriptionId: string
    expirationDateTime: string
  }> {
    const subscription = {
      changeType,
      notificationUrl,
      resource,
      expirationDateTime: new Date(Date.now() + 4230 * 60 * 1000).toISOString(), // ~3 days
      clientState: `workflow-${Date.now()}`
    }

    const response = await this.makeGraphRequest('subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscription)
    })

    return {
      subscriptionId: response.id,
      expirationDateTime: response.expirationDateTime
    }
  }

} // End of MicrosoftIntegration clas
