import { Client } from '@notionhq/client'

export interface NotionCredentials {
  access_token: string
  workspace_id?: string
  workspace_name?: string
  bot_id?: string
}

export interface NotionDatabaseQueryOptions {
  databaseId: string
  filter?: any
  sorts?: any[]
  pageSize?: number
}

export interface NotionPage {
  id: string
  properties: any
  created_time: string
  last_edited_time: string
  url: string
}

export class NotionIntegration {
  private client: Client

  constructor(credentials: NotionCredentials) {
    this.client = new Client({ auth: credentials.access_token })
  }

  /**
   * Query a Notion database with filters
   */
  async queryDatabase(options: NotionDatabaseQueryOptions): Promise<NotionPage[]> {
    try {
      const queryParams: any = {
        database_id: options.databaseId,
        page_size: options.pageSize || 100,
      }

      if (options.filter) {
        queryParams.filter = options.filter
      }

      if (options.sorts) {
        queryParams.sorts = options.sorts
      }

      const response: any = await (this.client.databases as any).query(queryParams)

      return response.results.map((page: any) => ({
        id: page.id,
        properties: this.extractProperties(page.properties),
        created_time: page.created_time,
        last_edited_time: page.last_edited_time,
        url: page.url,
      }))
    } catch (error: any) {
      throw new Error(`Failed to query Notion database: ${error.message}`)
    }
  }

  /**
   * List all databases accessible to the integration
   */
  async listDatabases() {
    try {
      const response: any = await this.client.search({
        filter: {
          property: 'object',
          value: 'database' as any,
        },
        page_size: 100,
      })

      return response.results.map((db: any) => ({
        id: db.id,
        title: this.extractTitle(db.title),
        url: db.url,
        created_time: db.created_time,
        last_edited_time: db.last_edited_time,
      }))
    } catch (error: any) {
      throw new Error(`Failed to list Notion databases: ${error.message}`)
    }
  }

  /**
   * Get database schema/properties
   */
  async getDatabaseSchema(databaseId: string) {
    try {
      const response: any = await this.client.databases.retrieve({
        database_id: databaseId,
      })

      return {
        id: response.id,
        title: this.extractTitle(response.title),
        properties: response.properties,
      }
    } catch (error: any) {
      throw new Error(`Failed to get database schema: ${error.message}`)
    }
  }

  /**
   * Create a new page in a database
   */
  async createPage(databaseId: string, properties: any) {
    try {
      const response = await this.client.pages.create({
        parent: { database_id: databaseId },
        properties,
      })

      return response
    } catch (error: any) {
      throw new Error(`Failed to create Notion page: ${error.message}`)
    }
  }

  /**
   * Update an existing page
   */
  async updatePage(pageId: string, properties: any) {
    try {
      const response = await this.client.pages.update({
        page_id: pageId,
        properties,
      })

      return response
    } catch (error: any) {
      throw new Error(`Failed to update Notion page: ${error.message}`)
    }
  }

  /**
   * Extract readable text from Notion title array
   */
  private extractTitle(titleArray: any[]): string {
    if (!titleArray || !Array.isArray(titleArray)) return 'Untitled'
    return titleArray.map((t: any) => t.plain_text).join('')
  }

  /**
   * Extract properties from Notion page to readable format
   */
  private extractProperties(properties: any): Record<string, any> {
    const extracted: Record<string, any> = {}

    for (const [key, value] of Object.entries(properties)) {
      const prop = value as any

      switch (prop.type) {
        case 'title':
          extracted[key] = prop.title.map((t: any) => t.plain_text).join('')
          break
        case 'rich_text':
          extracted[key] = prop.rich_text.map((t: any) => t.plain_text).join('')
          break
        case 'number':
          extracted[key] = prop.number
          break
        case 'select':
          extracted[key] = prop.select?.name || null
          break
        case 'multi_select':
          extracted[key] = prop.multi_select?.map((s: any) => s.name) || []
          break
        case 'date':
          extracted[key] = prop.date?.start || null
          break
        case 'checkbox':
          extracted[key] = prop.checkbox
          break
        case 'url':
          extracted[key] = prop.url
          break
        case 'email':
          extracted[key] = prop.email
          break
        case 'phone_number':
          extracted[key] = prop.phone_number
          break
        case 'status':
          extracted[key] = prop.status?.name || null
          break
        case 'people':
          extracted[key] = prop.people?.map((p: any) => p.name || p.id) || []
          break
        default:
          extracted[key] = prop[prop.type]
      }
    }

    return extracted
  }

  /**
   * Test connection to Notion
   */
  async testConnection(): Promise<boolean> {
    try {
      await (this.client.users as any).me({})
      return true
    } catch (error) {
      return false
    }
  }
}

export default NotionIntegration
