// src/lib/ai/tools/BuiltInTools.ts
import { ToolDefinition } from '../FunctionCallingSystem'
import { MULTIMODAL_TOOLS } from './MultiModalTools'
import { RAG_TOOLS } from './RAGTools'
import { WORKFLOW_TOOLS } from './WorkflowTools'

/**
 * Collection of built-in tools for common operations
 */

// Utility Tools
export const getCurrentTime: ToolDefinition = {
  name: 'get_current_time',
  description: 'Get the current date and time in ISO format',
  parameters: {
    timezone: {
      name: 'timezone',
      type: 'string',
      description: 'Timezone (e.g., UTC, America/New_York)',
      required: false,
    },
  },
  category: 'utility',
  enabled: true,
  handler: async params => {
    const timezone = params.timezone || 'UTC'
    const now = new Date()

    if (timezone === 'UTC') {
      return {
        timestamp: now.toISOString(),
        timezone: 'UTC',
        formatted: now.toUTCString(),
      }
    }

    try {
      return {
        timestamp: now.toISOString(),
        timezone,
        formatted: now.toLocaleString('en-US', { timeZone: timezone }),
      }
    } catch (error) {
      throw new Error(`Invalid timezone: ${timezone}`)
    }
  },
}

export const generateUUID: ToolDefinition = {
  name: 'generate_uuid',
  description: 'Generate a random UUID',
  parameters: {},
  category: 'utility',
  enabled: true,
  handler: async () => {
    return {
      uuid: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
  },
}

export const calculateMath: ToolDefinition = {
  name: 'calculate_math',
  description: 'Perform mathematical calculations',
  parameters: {
    expression: {
      name: 'expression',
      type: 'string',
      description:
        'Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)")',
      required: true,
    },
  },
  category: 'utility',
  enabled: true,
  handler: async params => {
    const { expression } = params

    try {
      // Simple expression evaluator (be careful in production)
      const result = Function(`"use strict"; return (${expression})`)()

      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Result is not a valid number')
      }

      return {
        expression,
        result,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      throw new Error(`Invalid mathematical expression: ${expression}`)
    }
  },
}

// Data Tools
export const formatData: ToolDefinition = {
  name: 'format_data',
  description: 'Format data into different formats (JSON, CSV, etc.)',
  parameters: {
    data: {
      name: 'data',
      type: 'array',
      description:
        'Data to format (array of objects for CSV/table, any data for JSON)',
      required: true,
    },
    format: {
      name: 'format',
      type: 'string',
      description: 'Output format',
      required: true,
      enum: ['json', 'csv', 'table'],
    },
  },
  category: 'data',
  enabled: true,
  handler: async params => {
    const { data, format } = params

    switch (format) {
      case 'json':
        return {
          formatted: JSON.stringify(data, null, 2),
          format: 'json',
        }

      case 'csv':
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0])
          const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => row[h]).join(',')),
          ].join('\n')

          return {
            formatted: csv,
            format: 'csv',
          }
        }
        throw new Error('CSV format requires an array of objects')

      case 'table':
        if (Array.isArray(data)) {
          return {
            formatted: data,
            format: 'table',
            headers: data.length > 0 ? Object.keys(data[0]) : [],
          }
        }
        throw new Error('Table format requires an array of objects')

      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  },
}

export const searchArray: ToolDefinition = {
  name: 'search_array',
  description: 'Search through an array of objects',
  parameters: {
    data: {
      name: 'data',
      type: 'array',
      description: 'Array of objects to search',
      required: true,
    },
    field: {
      name: 'field',
      type: 'string',
      description: 'Field to search in',
      required: true,
    },
    query: {
      name: 'query',
      type: 'string',
      description: 'Search query',
      required: true,
    },
    caseSensitive: {
      name: 'caseSensitive',
      type: 'boolean',
      description: 'Whether search should be case sensitive',
      required: false,
    },
  },
  category: 'data',
  enabled: true,
  handler: async params => {
    const { data, field, query, caseSensitive = false } = params

    if (!Array.isArray(data)) {
      throw new Error('Data must be an array')
    }

    const searchQuery = caseSensitive ? query : query.toLowerCase()

    const results = data.filter(item => {
      const fieldValue = item[field]
      if (fieldValue === undefined || fieldValue === null) {
        return false
      }

      const searchValue = caseSensitive
        ? String(fieldValue)
        : String(fieldValue).toLowerCase()

      return searchValue.includes(searchQuery)
    })

    return {
      results,
      count: results.length,
      query,
      field,
      caseSensitive,
    }
  },
}

// Communication Tools
export const sendEmail: ToolDefinition = {
  name: 'send_email',
  description: 'Send an email (mock implementation for demo)',
  parameters: {
    to: {
      name: 'to',
      type: 'string',
      description: 'Recipient email address',
      required: true,
    },
    subject: {
      name: 'subject',
      type: 'string',
      description: 'Email subject',
      required: true,
    },
    body: {
      name: 'body',
      type: 'string',
      description: 'Email body content',
      required: true,
    },
  },
  category: 'communication',
  enabled: true,
  timeout: 10000,
  handler: async params => {
    const { to, subject, body } = params

    // Mock email sending - in production, integrate with email service
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log(`Mock Email Sent:
To: ${to}
Subject: ${subject}
Body: ${body}`)

    return {
      success: true,
      messageId: crypto.randomUUID(),
      to,
      subject,
      sentAt: new Date().toISOString(),
    }
  },
}

export const makeHttpRequest: ToolDefinition = {
  name: 'make_http_request',
  description: 'Make an HTTP request to an external API',
  parameters: {
    url: {
      name: 'url',
      type: 'string',
      description: 'URL to make request to',
      required: true,
    },
    method: {
      name: 'method',
      type: 'string',
      description: 'HTTP method',
      required: false,
      enum: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    headers: {
      name: 'headers',
      type: 'object',
      description: 'Request headers',
      required: false,
    },
    body: {
      name: 'body',
      type: 'object',
      description: 'Request body (for POST/PUT)',
      required: false,
    },
  },
  category: 'communication',
  enabled: true,
  timeout: 15000,
  handler: async params => {
    const { url, method = 'GET', headers = {}, body } = params

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      const responseData = await response.text()
      let parsedData

      try {
        parsedData = JSON.parse(responseData)
      } catch {
        parsedData = responseData
      }

      return {
        status: response.status,
        statusText: response.statusText,
        data: parsedData,
        headers: Object.fromEntries(response.headers.entries()),
      }
    } catch (error) {
      throw new Error(
        `HTTP request failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  },
}

// Export all built-in tools - EXPLICIT EXPORT
export const BUILT_IN_TOOLS: ToolDefinition[] = [
  // Utility tools
  getCurrentTime,
  generateUUID,
  calculateMath,

  // Data tools
  formatData,
  searchArray,

  // Communication tools
  sendEmail,
  makeHttpRequest,

  // RAG tools
  ...RAG_TOOLS,

  // Workflow tools
  ...WORKFLOW_TOOLS,

  ...MULTIMODAL_TOOLS
]

// Debug: Log the tools being exported
console.log('BUILT_IN_TOOLS count:', BUILT_IN_TOOLS.length)
console.log(
  'Tool names:',
  BUILT_IN_TOOLS.map(t => t.name)
)
