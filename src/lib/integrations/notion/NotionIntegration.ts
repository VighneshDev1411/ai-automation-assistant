import { Client } from '@notionhq/client'
import { IntegrationAction, IntegrationTrigger } from '../base-integration'

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
  private accessToken: string // Store the token separately

  constructor(credentials: NotionCredentials) {
    console.log('🔧 NotionIntegration constructor - credentials:', {
      hasAccessToken: !!credentials.access_token,
      tokenLength: credentials.access_token?.length,
      workspaceId: credentials.workspace_id
    })

    this.accessToken = credentials.access_token
    this.client = new Client({ auth: credentials.access_token })

    console.log('🔧 Notion client created:', {
      hasClient: !!this.client,
      hasDatabases: !!this.client.databases,
      databasesType: typeof this.client.databases,
      databasesMethods: this.client.databases ? Object.keys(this.client.databases) : [],
      hasAccessToken: !!this.accessToken
    })
  }

  getName(): string {
    return 'Notion'
  }

  getDescription(): string {
    return 'Query databases, create and update pages in Notion'
  }

  getActions(): IntegrationAction[] {
    return [
      {
        id: 'query_database',
        name: 'Query Database',
        description: 'Query a Notion database with filters',
        requiresAuth: true,
        inputs: [
          { id: 'databaseId', name: 'Database ID', type: 'string', required: true, description: 'Notion database ID (32 characters)' },
          { id: 'filter', name: 'Filter', type: 'object', required: false, description: 'Filter conditions' },
          { id: 'sorts', name: 'Sorts', type: 'array', required: false, description: 'Sort configuration' },
          { id: 'pageSize', name: 'Page Size', type: 'number', required: false, description: 'Number of results (default: 100)' }
        ],
        outputs: [
          { id: 'pages', name: 'Pages', type: 'array', description: 'Array of Notion pages' },
          { id: 'count', name: 'Count', type: 'number', description: 'Number of pages returned' }
        ]
      },
      {
        id: 'list_databases',
        name: 'List Databases',
        description: 'List all databases accessible to the integration',
        requiresAuth: true,
        inputs: [],
        outputs: [
          { id: 'databases', name: 'Databases', type: 'array', description: 'Array of databases' },
          { id: 'count', name: 'Count', type: 'number', description: 'Number of databases' }
        ]
      },
      {
        id: 'get_database_schema',
        name: 'Get Database Schema',
        description: 'Get schema/properties of a database',
        requiresAuth: true,
        inputs: [
          { id: 'databaseId', name: 'Database ID', type: 'string', required: true, description: 'Notion database ID' }
        ],
        outputs: [
          { id: 'schema', name: 'Schema', type: 'object', description: 'Database schema' }
        ]
      },
      {
        id: 'create_page',
        name: 'Create Page',
        description: 'Create a new page in a database',
        requiresAuth: true,
        inputs: [
          { id: 'databaseId', name: 'Database ID', type: 'string', required: true, description: 'Parent database ID' },
          { id: 'properties', name: 'Properties', type: 'object', required: true, description: 'Page properties' }
        ],
        outputs: [
          { id: 'page', name: 'Page', type: 'object', description: 'Created page' },
          { id: 'pageId', name: 'Page ID', type: 'string', description: 'ID of created page' }
        ]
      },
      {
        id: 'update_page',
        name: 'Update Page',
        description: 'Update an existing page',
        requiresAuth: true,
        inputs: [
          { id: 'pageId', name: 'Page ID', type: 'string', required: true, description: 'Page ID to update' },
          { id: 'properties', name: 'Properties', type: 'object', required: true, description: 'Updated properties' }
        ],
        outputs: [
          { id: 'page', name: 'Page', type: 'object', description: 'Updated page' }
        ]
      }
    ]
  }

  getTriggers(): IntegrationTrigger[] {
    return [
      {
        id: 'page_created',
        name: 'Page Created',
        description: 'Triggers when a new page is created in a database',
        type: 'polling',
        outputs: [
          { id: 'page', name: 'Page', type: 'object', description: 'The created page' }
        ]
      },
      {
        id: 'page_updated',
        name: 'Page Updated',
        description: 'Triggers when a page is updated',
        type: 'polling',
        outputs: [
          { id: 'page', name: 'Page', type: 'object', description: 'The updated page' }
        ]
      }
    ]
  }

  async executeAction(actionId: string, inputs: Record<string, any>): Promise<any> {
    switch (actionId) {
      case 'query_database':
        const pages = await this.queryDatabase(inputs as NotionDatabaseQueryOptions)
        return {
          pages,
          count: pages.length
        }

      case 'list_databases':
        const databases = await this.listDatabases()
        return {
          databases,
          count: databases.length
        }

      case 'get_database_schema':
        const schema = await this.getDatabaseSchema(inputs.databaseId)
        return { schema }

      case 'create_page':
        const createdPage = await this.createPage(inputs.databaseId, inputs.properties)
        return {
          page: createdPage,
          pageId: createdPage.id
        }

      case 'update_page':
        const updatedPage = await this.updatePage(inputs.pageId, inputs.properties)
        return { page: updatedPage }

      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
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

      console.log('🔍 Calling Notion API with params:', queryParams)

      // WORKAROUND: Use direct REST API call since databases.query doesn't exist in this SDK build
      // The SDK has only: retrieve, create, update - NO query method
      console.log('🔑 Access token info:', {
        hasToken: !!this.accessToken,
        tokenLength: this.accessToken?.length,
        tokenPrefix: this.accessToken?.substring(0, 10) + '...'
      })

      const response = await fetch(`https://api.notion.com/v1/databases/${options.databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          page_size: options.pageSize || 100,
          filter: options.filter,
          sorts: options.sorts
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Notion API error: ${JSON.stringify(errorData)}`)
      }

      const data = await response.json() as any

      console.log('✅ Notion API response:', { resultCount: data.results?.length || 0 })

      return (data.results || []).map((page: any) => ({
        id: page.id,
        properties: this.extractProperties(page.properties),
        created_time: page.created_time,
        last_edited_time: page.last_edited_time,
        url: page.url,
      }))
    } catch (error: any) {
      console.error('Notion API error details:', error)
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
