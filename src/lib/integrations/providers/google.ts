import { BaseIntegration, IntegrationConfig, IntegrationCredentials, IntegrationAction, IntegrationTrigger } from '../base-integration'

export class GoogleIntegration extends BaseIntegration {
  constructor() {
    const config: IntegrationConfig = {
      provider: 'google',
      name: 'Google Workspace',
      description: 'Integrate with Gmail, Google Sheets, Google Drive, and Google Calendar',
      authType: 'oauth2',
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      endpoints: {
        auth: 'https://accounts.google.com/o/oauth2/v2/auth',
        token: 'https://oauth2.googleapis.com/token',
        refresh: 'https://oauth2.googleapis.com/token',
        revoke: 'https://oauth2.googleapis.com/revoke'
      },
      rateLimit: {
        requests: 100,
        per: 'minute'
      }
    }
    
    super(config)
  }

  async authenticate(params: { code: string; redirectUri: string }): Promise<IntegrationCredentials> {
    const clientId = process.env.GOOGLE_CLIENT_ID!
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!

    const tokenParams = new URLSearchParams({
      code: params.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code'
    })

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams
    })

    if (!response.ok) {
      throw new Error(`Google OAuth failed: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
      scope: data.scope
    }
  }

  async refreshToken(): Promise<IntegrationCredentials> {
    if (!this.credentials?.refresh_token) {
      throw new Error('No refresh token available')
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!

    const params = new URLSearchParams({
      refresh_token: this.credentials.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token'
    })

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    const data = await response.json()
    
    const newCredentials = {
      ...this.credentials,
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in * 1000)
    }

    if (data.refresh_token) {
      newCredentials.refresh_token = data.refresh_token
    }

    await this.setCredentials(newCredentials)
    return newCredentials
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.credentials?.access_token) return false

    // Check if token is expired
    if (this.credentials.expires_at && Date.now() >= this.credentials.expires_at) {
      try {
        await this.refreshToken()
      } catch {
        return false
      }
    }

    // Test the token with a simple API call
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${this.credentials.access_token}`
      }
    })

    return response.ok
  }

  getActions(): IntegrationAction[] {
    return [
      {
        id: 'send_email',
        name: 'Send Email',
        description: 'Send an email via Gmail',
        inputs: {
          to: { type: 'string', required: true, description: 'Recipient email address' },
          subject: { type: 'string', required: true, description: 'Email subject' },
          body: { type: 'string', required: true, description: 'Email body (HTML supported)' },
          cc: { type: 'string', required: false, description: 'CC recipients (comma-separated)' },
          bcc: { type: 'string', required: false, description: 'BCC recipients (comma-separated)' }
        },
        outputs: {
          message_id: { type: 'string', description: 'Gmail message ID' },
          thread_id: { type: 'string', description: 'Gmail thread ID' }
        }
      },
      {
        id: 'create_sheet',
        name: 'Create Google Sheet',
        description: 'Create a new Google Sheets document',
        inputs: {
          title: { type: 'string', required: true, description: 'Sheet title' },
          headers: { type: 'array', required: false, description: 'Column headers' }
        },
        outputs: {
          spreadsheet_id: { type: 'string', description: 'Google Sheets ID' },
          spreadsheet_url: { type: 'string', description: 'URL to the sheet' }
        }
      },
      {
        id: 'append_sheet_row',
        name: 'Append Row to Sheet',
        description: 'Add a new row to an existing Google Sheet',
        inputs: {
          spreadsheet_id: { type: 'string', required: true, description: 'Google Sheets ID' },
          range: { type: 'string', required: true, description: 'Sheet range (e.g., "Sheet1!A:Z")' },
          values: { type: 'array', required: true, description: 'Row values' }
        },
        outputs: {
          updated_range: { type: 'string', description: 'The range that was updated' },
          updated_rows: { type: 'number', description: 'Number of rows updated' }
        }
      },
      {
        id: 'create_calendar_event',
        name: 'Create Calendar Event',
        description: 'Create a new event in Google Calendar',
        inputs: {
          summary: { type: 'string', required: true, description: 'Event title' },
          start_time: { type: 'string', required: true, description: 'Start time (ISO 8601)' },
          end_time: { type: 'string', required: true, description: 'End time (ISO 8601)' },
          description: { type: 'string', required: false, description: 'Event description' },
          attendees: { type: 'array', required: false, description: 'Attendee email addresses' }
        },
        outputs: {
          event_id: { type: 'string', description: 'Calendar event ID' },
          event_url: { type: 'string', description: 'URL to the event' }
        }
      },
      {
        id: 'upload_to_drive',
        name: 'Upload File to Drive',
        description: 'Upload a file to Google Drive',
        inputs: {
          file_content: { type: 'string', required: true, description: 'File content (base64 for binary)' },
          file_name: { type: 'string', required: true, description: 'File name' },
          folder_id: { type: 'string', required: false, description: 'Google Drive folder ID' }
        },
        outputs: {
          file_id: { type: 'string', description: 'Google Drive file ID' },
          file_url: { type: 'string', description: 'Shareable URL to the file' }
        }
      }
    ]
  }

  getTriggers(): IntegrationTrigger[] {
    return [
      {
        id: 'new_email',
        name: 'New Email Received',
        description: 'Triggers when a new email is received in Gmail',
        polling: {
          interval: 300000, // 5 minutes
          endpoint: '/gmail/messages'
        }
      },
      {
        id: 'sheet_updated',
        name: 'Google Sheet Updated',
        description: 'Triggers when a Google Sheet is modified',
        polling: {
          interval: 600000, // 10 minutes
          endpoint: '/sheets/changes'
        }
      },
      {
        id: 'calendar_event_created',
        name: 'Calendar Event Created',
        description: 'Triggers when a new calendar event is created',
        polling: {
          interval: 300000, // 5 minutes
          endpoint: '/calendar/events'
        }
      },
      {
        id: 'drive_file_added',
        name: 'File Added to Drive',
        description: 'Triggers when a new file is added to Google Drive',
        polling: {
          interval: 600000, // 10 minutes
          endpoint: '/drive/changes'
        }
      }
    ]
  }

  async executeAction(actionId: string, inputs: Record<string, any>): Promise<any> {
    if (!this.credentials?.access_token) {
      throw new Error('Integration not authenticated')
    }

    // Ensure token is valid
    await this.validateCredentials()

    switch (actionId) {
      case 'send_email':
        return this.sendEmail(inputs)
      case 'create_sheet':
        return this.createSheet(inputs)
      case 'append_sheet_row':
        return this.appendSheetRow(inputs)
      case 'create_calendar_event':
        return this.createCalendarEvent(inputs)
      case 'upload_to_drive':
        return this.uploadToDrive(inputs)
      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }

  private async sendEmail(inputs: {
    to: string
    subject: string
    body: string
    cc?: string
    bcc?: string
  }): Promise<any> {
    // Create email message in RFC 2822 format
    let message = `To: ${inputs.to}\n`
    message += `Subject: ${inputs.subject}\n`
    if (inputs.cc) message += `Cc: ${inputs.cc}\n`
    if (inputs.bcc) message += `Bcc: ${inputs.bcc}\n`
    message += `Content-Type: text/html; charset=utf-8\n\n`
    message += inputs.body

    // Base64 encode the message
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials!.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw this.handleApiError(error)
    }

    return response.json()
  }

  private async createSheet(inputs: {
    title: string
    headers?: string[]
  }): Promise<any> {
    const requestBody: any = {
      properties: {
        title: inputs.title
      }
    }

    if (inputs.headers) {
      requestBody.sheets = [{
        data: [{
          rowData: [{
            values: inputs.headers.map(header => ({
              userEnteredValue: { stringValue: header }
            }))
          }]
        }]
      }]
    }

    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials!.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.json()
      throw this.handleApiError(error)
    }

    const data = await response.json()
    return {
      spreadsheet_id: data.spreadsheetId,
      spreadsheet_url: data.spreadsheetUrl
    }
  }

  private async appendSheetRow(inputs: {
    spreadsheet_id: string
    range: string
    values: any[]
  }): Promise<any> {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${inputs.spreadsheet_id}/values/${inputs.range}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials!.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [inputs.values]
        })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw this.handleApiError(error)
    }

    return response.json()
  }

  private async createCalendarEvent(inputs: {
    summary: string
    start_time: string
    end_time: string
    description?: string
    attendees?: string[]
  }): Promise<any> {
    const eventData: any = {
      summary: inputs.summary,
      start: {
        dateTime: inputs.start_time,
        timeZone: 'UTC'
      },
      end: {
        dateTime: inputs.end_time,
        timeZone: 'UTC'
      }
    }

    if (inputs.description) {
      eventData.description = inputs.description
    }

    if (inputs.attendees) {
      eventData.attendees = inputs.attendees.map(email => ({ email }))
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials!.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw this.handleApiError(error)
    }

    const data = await response.json()
    return {
      event_id: data.id,
      event_url: data.htmlLink
    }
  }

  private async uploadToDrive(inputs: {
    file_content: string
    file_name: string
    folder_id?: string
  }): Promise<any> {
    const metadata: any = {
      name: inputs.file_name
    }

    if (inputs.folder_id) {
      metadata.parents = [inputs.folder_id]
    }

    // Create multipart upload
    const boundary = '-------314159265358979323846'
    const delimiter = "\r\n--" + boundary + "\r\n"
    const close_delim = "\r\n--" + boundary + "--"

    let body = delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) + delimiter +
      'Content-Type: application/octet-stream\r\n\r\n' +
      inputs.file_content +
      close_delim

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials!.access_token}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`
      },
      body
    })

    if (!response.ok) {
      const error = await response.json()
      throw this.handleApiError(error)
    }

    const data = await response.json()
    return {
      file_id: data.id,
      file_url: `https://drive.google.com/file/d/${data.id}/view`
    }
  }
}