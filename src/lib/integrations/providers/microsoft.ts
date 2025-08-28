// // src/lib/integrations/providers/microsoft.ts
// import { BaseIntegration, IntegrationConfig, IntegrationCredentials, IntegrationAction, IntegrationTrigger } from '../base-integration'

// export class MicrosoftIntegration extends BaseIntegration {
//   constructor() {
//     const config: IntegrationConfig = {
//       provider: 'microsoft',
//       name: 'Microsoft 365',
//       description: 'Integrate with Outlook, Teams, OneDrive, and Microsoft Office applications',
//       authType: 'oauth2',
//       scopes: [
//         'openid',
//         'profile',
//         'email',
//         'offline_access',
//         'https://graph.microsoft.com/Mail.ReadWrite',
//         'https://graph.microsoft.com/Mail.Send',
//         'https://graph.microsoft.com/Calendars.ReadWrite',
//         'https://graph.microsoft.com/Files.ReadWrite',
//         'https://graph.microsoft.com/User.Read',
//         'https://graph.microsoft.com/ChatMessage.Send'
//       ],
//       endpoints: {
//         auth: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
//         token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
//         refresh: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
//       },
//       rateLimit: {
//         requests: 10000,
//         per: 'hour'
//       }
//     }
    
//     super(config)
//   }

//   async authenticate(params: { code: string; redirectUri: string }): Promise<IntegrationCredentials> {
//     const clientId = process.env.MICROSOFT_CLIENT_ID!
//     const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!

//     const tokenParams = new URLSearchParams({
//       client_id: clientId,
//       scope: this.config.scopes!.join(' '),
//       code: params.code,
//       redirect_uri: params.redirectUri,
//       grant_type: 'authorization_code',
//       client_secret: clientSecret
//     })

//     const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded'
//       },
//       body: tokenParams
//     })

//     if (!response.ok) {
//       throw new Error(`Microsoft OAuth failed: ${response.statusText}`)
//     }

//     const data = await response.json()
    
//     if (data.error) {
//       throw new Error(`Microsoft OAuth error: ${data.error_description || data.error}`)
//     }
    
//     return {
//       access_token: data.access_token,
//       refresh_token: data.refresh_token,
//       expires_at: Date.now() + (data.expires_in * 1000),
//       scope: data.scope
//     }
//   }

//   async refreshToken(): Promise<IntegrationCredentials> {
//     if (!this.credentials?.refresh_token) {
//       throw new Error('No refresh token available')
//     }

//     const clientId = process.env.MICROSOFT_CLIENT_ID!
//     const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!

//     const params = new URLSearchParams({
//       client_id: clientId,
//       scope: this.config.scopes!.join(' '),
//       refresh_token: this.credentials.refresh_token,
//       grant_type: 'refresh_token',
//       client_secret: clientSecret
//     })

//     const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded'
//       },
//       body: params
//     })

//     if (!response.ok) {
//       throw new Error(`Token refresh failed: ${response.statusText}`)
//     }

//     const data = await response.json()
    
//     const newCredentials = {
//       ...this.credentials,
//       access_token: data.access_token,
//       expires_at: Date.now() + (data.expires_in * 1000)
//     }

//     if (data.refresh_token) {
//       newCredentials.refresh_token = data.refresh_token
//     }

//     await this.setCredentials(newCredentials)
//     return newCredentials
//   }

//   async validateCredentials(): Promise<boolean> {
//     if (!this.credentials?.access_token) return false

//     // Check if token is expired
//     if (this.credentials.expires_at && Date.now() >= this.credentials.expires_at) {
//       try {
//         await this.refreshToken()
//       } catch {
//         return false
//       }
//     }

//     const response = await fetch('https://graph.microsoft.com/v1.0/me', {
//       headers: {
//         'Authorization': `Bearer ${this.credentials.access_token}`
//       }
//     })

//     return response.ok
//   }

//   getActions(): IntegrationAction[] {
//     return [
//       {
//         id: 'send_email',
//         name: 'Send Email',
//         description: 'Send an email via Outlook',
//         inputs: {
//           to: { type: 'array', required: true, description: 'Recipient email addresses' },
//           subject: { type: 'string', required: true, description: 'Email subject' },
//           body: { type: 'string', required: true, description: 'Email body (HTML supported)' },
//           cc: { type: 'array', required: false, description: 'CC recipients' },
//           bcc: { type: 'array', required: false, description: 'BCC recipients' },
//           importance: { type: 'string', required: false, description: 'low, normal, high' }
//         },
//         outputs: {
//           message_id: { type: 'string', description: 'Sent message ID' },
//           conversation_id: { type: 'string', description: 'Conversation ID' }
//         }
//       },
//       {
//         id: 'create_calendar_event',
//         name: 'Create Calendar Event',
//         description: 'Create a new event in Outlook Calendar',
//         inputs: {
//           subject: { type: 'string', required: true, description: 'Event subject' },
//           start: { type: 'string', required: true, description: 'Start time (ISO 8601)' },
//           end: { type: 'string', required: true, description: 'End time (ISO 8601)' },
//           body: { type: 'string', required: false, description: 'Event description' },
//           attendees: { type: 'array', required: false, description: 'Attendee email addresses' },
//           location: { type: 'string', required: false, description: 'Event location' }
//         },
//         outputs: {
//           event_id: { type: 'string', description: 'Created event ID' },
//           web_link: { type: 'string', description: 'Event web link' }
//         }
//       },
//       {
//         id: 'upload_to_onedrive',
//         name: 'Upload to OneDrive',
//         description: 'Upload a file to OneDrive',
//         inputs: {
//           file_content: { type: 'string', required: true, description: 'File content (base64)' },
//           file_name: { type: 'string', required: true, description: 'File name' },
//           folder_path: { type: 'string', required: false, description: 'Folder path (default: root)' }
//         },
//         outputs: {
//           file_id: { type: 'string', description: 'OneDrive file ID' },
//           download_url: { type: 'string', description: 'File download URL' },
//           web_url: { type: 'string', description: 'File web URL' }
//         }
//       },
//       {
//         id: 'send_teams_message',
//         name: 'Send Teams Message',
//         description: 'Send a message to Microsoft Teams channel',
//         inputs: {
//           team_id: { type: 'string', required: true, description: 'Teams team ID' },
//           channel_id: { type: 'string', required: true, description: 'Teams channel ID' },
//           message: { type: 'string', required: true, description: 'Message content' },
//           message_type: { type: 'string', required: false, description: 'html or text' }
//         },
//         outputs: {
//           message_id: { type: 'string', description: 'Sent message ID' }
//         }
//       },
//       {
//         id: 'create_sharepoint_list_item',
//         name: 'Create SharePoint List Item',
//         description: 'Create a new item in a SharePoint list',
//         inputs: {
//           site_id: { type: 'string', required: true, description: 'SharePoint site ID' },
//           list_id: { type: 'string', required: true, description: 'SharePoint list ID' },
//           fields: { type: 'object', required: true, description: 'Item field values' }
//         },
//         outputs: {
//           item_id: { type: 'string', description: 'Created item ID' },
//           web_url: { type: 'string', description: 'Item web URL' }
//         }
//       }
//     ]
//   }

//   getTriggers(): IntegrationTrigger[] {
//     return [
//       {
//         id: 'new_email',
//         name: 'New Email Received',
//         description: 'Triggers when a new email is received',
//         polling: {
//           interval: 300000, // 5 minutes
//           endpoint: '/me/mailFolders/Inbox/messages'
//         }
//       },
//       {
//         id: 'calendar_event_created',
//         name: 'Calendar Event Created',
//         description: 'Triggers when a new calendar event is created',
//         polling: {
//           interval: 600000, // 10 minutes
//           endpoint: '/me/events'
//         }
//       },
//       {
//         id: 'file_uploaded',
//         name: 'File Uploaded to OneDrive',
//         description: 'Triggers when a file is uploaded to OneDrive',
//         polling: {
//           interval: 600000, // 10 minutes
//           endpoint: '/me/drive/root/children'
//         }
//       },
//       {
//         id: 'teams_message',
//         name: 'Teams Message Received',
//         description: 'Triggers when a message is received in Teams',
//         webhook: true
//       }
//     ]
//   }

//   async executeAction(actionId: string, inputs: Record<string, any>): Promise<any> {
//     if (!this.credentials?.access_token) {
//       throw new Error('Integration not authenticated')
//     }

//     // Ensure token is valid
//     await this.validateCredentials()

//     switch (actionId) {
//       case 'send_email':
//         return this.sendEmail(inputs)
//       case 'create_calendar_event':
//         return this.createCalendarEvent(inputs)
//       case 'upload_to_onedrive':
//         return this.uploadToOneDrive(inputs)
//       case 'send_teams_message':
//         return this.sendTeamsMessage(inputs)
//       case 'create_sharepoint_list_item':
//         return this.createSharePointListItem(inputs)
//       default:
//         throw new Error(`Unknown action: ${actionId}`)
//     }
//   }

//   private async makeGraphRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
//     const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
//       ...options,
//       headers: {
//         'Authorization': `Bearer ${this.credentials!.access_token}`,
//         'Content-Type': 'application/json',
//         ...options.headers
//       }
//     })

//     if (!response.ok) {
//       const error = await response.json().catch(() => ({}))
//       throw this.handleApiError({ response: { status: response.status }, ...error })
//     }

//     return response.json()
//   }

//   private async sendEmail(inputs: {
//     to: string[]
//     subject: string
//     body: string
//     cc?: string[]
//     bcc?: string[]
//     importance?: string
//   }): Promise<any> {
//     const message = {
//       subject: inputs.subject,
//       importance: inputs.importance || 'normal',
//       body: {
//         contentType: 'HTML',
//         content: inputs.body
//       },
//       toRecipients: inputs.to.map(email => ({
//         emailAddress: { address: email }
//       })),
//       ccRecipients: inputs.cc?.map(email => ({
//         emailAddress: { address: email }
//       })) || [],
//       bccRecipients: inputs.bcc?.map(email => ({
//         emailAddress: { address: email }
//       })) || []
//     }

//     const data = await this.makeGraphRequest('/me/sendMail', {
//       method: 'POST',
//       body: JSON.stringify({ message })
//     })

//     return {
//       message_id: data.id || 'sent',
//       conversation_id: data.conversationId
//     }
//   }

//   private async createCalendarEvent(inputs: {
//     subject: string
//     start: string
//     end: string
//     body?: string
//     attendees?: string[]
//     location?: string
//   }): Promise<any> {
//     const event = {
//       subject: inputs.subject,
//       body: {
//         contentType: 'HTML',
//         content: inputs.body || ''
//       },
//       start: {
//         dateTime: inputs.start,
//         timeZone: 'UTC'
//       },
//       end: {
//         dateTime: inputs.end,
//         timeZone: 'UTC'
//       },
//       location: inputs.location ? {
//         displayName: inputs.location
//       } : undefined,
//       attendees: inputs.attendees?.map(email => ({
//         emailAddress: {
//           address: email,
//           name: email
//         },
//         type: 'required'
//       })) || []
//     }

//     const data = await this.makeGraphRequest('/me/events', {
//       method: 'POST',
//       body: JSON.stringify(event)
//     })

//     return {
//       event_id: data.id,
//       web_link: data.webLink
//     }
//   }

//   private async uploadToOneDrive(inputs: {
//     file_content: string
//     file_name: string
//     folder_path?: string
//   }): Promise<any> {
//     // Decode base64 content
//     const fileBuffer = Buffer.from(inputs.file_content, 'base64')
    
//     // Construct upload path
//     const uploadPath = inputs.folder_path 
//       ? `/me/drive/root:/${inputs.folder_path}/${inputs.file_name}:/content`
//       : `/me/drive/root:/${inputs.file_name}:/content`

//     const response = await fetch(`https://graph.microsoft.com/v1.0${uploadPath}`, {
//       method: 'PUT',
//       headers: {
//         'Authorization': `Bearer ${this.credentials!.access_token}`,
//         'Content-Type': 'application/octet-stream'
//       },
//       body: fileBuffer
//     })

//     if (!response.ok) {
//       const error = await response.json().catch(() => ({}))
//       throw this.handleApiError({ response: { status: response.status }, ...error })
//     }

//     const data = await response.json()

//     return {
//       file_id: data.id,
//       download_url: data['@microsoft.graph.downloadUrl'],
//       web_url: data.webUrl
//     }
//   }

//   private async sendTeamsMessage(inputs: {
//     team_id: string
//     channel_id: string
//     message: string
//     message_type?: string
//   }): Promise<any> {
//     const messageBody = {
//       body: {
//         contentType: inputs.message_type || 'text',
//         content: inputs.message
//       }
//     }

//     const data = await this.makeGraphRequest(
//       `/teams/${inputs.team_id}/channels/${inputs.channel_id}/messages`,
//       {
//         method: 'POST',
//         body: JSON.stringify(messageBody)
//       }
//     )

//     return {
//       message_id: data.id
//     }
//   }

//   private async createSharePointListItem(inputs: {
//     site_id: string
//     list_id: string
//     fields: Record<string, any>
//   }): Promise<any> {
//     const data = await this.makeGraphRequest(
//       `/sites/${inputs.site_id}/lists/${inputs.list_id}/items`,
//       {
//         method: 'POST',
//         body: JSON.stringify({
//           fields: inputs.fields
//         })
//       }
//     )

//     return {
//       item_id: data.id,
//       web_url: data.webUrl
//     }
//   }
// }