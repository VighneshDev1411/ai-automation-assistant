import { createClient } from '../supabase/client'

export interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'local'
  type: 'chat' | 'completion' | 'embedding' | 'image' | 'audio'
  maxTokens: number
  inputCostPer1K: number
  outputCostPer1K: number
  capabilities: string[]
  contextWindow: number
}

export interface AIAgent {
  id: string
  name: string
  type: 'conversational' | 'analytical' | 'task' | 'custom'
  model: string
  systemPrompt: string
  promptTemplate?: string
  parameters: {
    temperature: number
    maxTokens: number
    topP: number
    frequencyPenalty: number
    presencePenalty: number
  }
  tools: AITool[]
  knowledgeBaseIds: string[]
  isActive: boolean
  usageStats: {
    totalRequests: number
    totalTokens: number
    totalCost: number
    averageLatency: number
  }
}

export interface AITool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required: string[]
  }
  handler: (params: any, context: AIExecutionContext) => Promise<any>
}

export interface AIExecutionContext {
  userId: string
  organizationId: string
  workflowId?: string
  sessionId: string
  variables: Record<string, any>
  metadata: Record<string, any>
}

export interface PromptTemplate {
  id: string
  name: string
  description: string
  template: string
  variables: {
    name: string
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    required: boolean
    description: string
    defaultValue?: any
  }[]
  category: string
  tags: string[]
}

export const AI_MODELS: Record<string, AIModel> = {
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    type: 'chat',
    maxTokens: 4096,
    inputCostPer1K: 0.01,
    outputCostPer1K: 0.03,
    capabilities: ['text', 'reasoning', 'code', 'analysis'],
    contextWindow: 128000,
  },
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    type: 'chat',
    maxTokens: 4096,
    inputCostPer1K: 0.03,
    outputCostPer1K: 0.06,
    capabilities: ['text', 'reasoning', 'code', 'analysis'],
    contextWindow: 8192,
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    type: 'chat',
    maxTokens: 4096,
    inputCostPer1K: 0.0015,
    outputCostPer1K: 0.002,
    capabilities: ['text', 'conversation', 'basic-reasoning'],
    contextWindow: 16385,
  },
  'claude-3-opus': {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    type: 'chat',
    maxTokens: 4096,
    inputCostPer1K: 0.015,
    outputCostPer1K: 0.075,
    capabilities: ['text', 'reasoning', 'analysis', 'writing'],
    contextWindow: 200000,
  },
  'claude-3-sonnet': {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    type: 'chat',
    maxTokens: 4096,
    inputCostPer1K: 0.003,
    outputCostPer1K: 0.015,
    capabilities: ['text', 'reasoning', 'analysis'],
    contextWindow: 200000,
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    type: 'chat',
    maxTokens: 4096,
    inputCostPer1K: 0.00025,
    outputCostPer1K: 0.00125,
    capabilities: ['text', 'fast-response'],
    contextWindow: 200000,
  },
}

export class AIAgentManager {
  private supabase = createClient()
  private modelClients: Map<string, any> = new Map()

  constructor() {
    this.initializeModelClients()
  }

  private async initializeModelClients() {
    // Initialize OpenAI client
    if (process.env.OPENAI_API_KEY) {
      const { OpenAI } = await import('openai')
      this.modelClients.set(
        'openai',
        new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })
      )
    }

    if (process.env.ANTHROPIC_API_KEY) {
      const { Anthropic } = await import('@anthropic-ai/sdk')
      this.modelClients.set(
        'anthropic',
        new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        })
      )
    }
  }

  // Now creating crud for AI Agent

  async createAgent(
    agentData: Partial<AIAgent>,
    organizationId: string
  ): Promise<AIAgent> {
    const { data, error } = await this.supabase
      .from('ai_agents')
      .insert({
        ...agentData,
        organization_id: organizationId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create AI agent: ${error.message}`)
    return data
  }

  async getAgent(agentId: string): Promise<AIAgent | null> {
    const { data, error } = await this.supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get AI agent: ${error.message}`)
    }
    return data
  }

  async updateAgent(
    agentId: string,
    updates: Partial<AIAgent>
  ): Promise<AIAgent> {
    const { data, error } = await this.supabase
      .from('ai_agents')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId)
      .select()
      .single()
    if (error) throw new Error(`Failed to update AI agent: ${error.message}`)
    return data
  }

  async deleteAgent(agentId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('ai_agents')
      .delete()
      .eq('id', agentId)
    if (error) throw new Error(`Failed to delete AI agent: ${error.message}`)
  }

  async listAgents(organizationId: string): Promise<AIAgent[]> {
    const { data, error } = await this.supabase
      .from('ai_agents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to list AI agents: ${error.message}`)
    return data || []
  }

  async executeAgent(
    agentId: string,
    prompt: string,
    context: AIExecutionContext,
    options: {
      stream?: boolean
      tools?: string[]
      maxRetries?: number
    } = {}
  ): Promise<any> {
    const agent = await this.getAgent(agentId)
    if (!agent) throw new Error(`Agent ${agentId} not found`)
    const model = AI_MODELS[agent.model]
    if (!model) throw new Error(`Model ${agent.model} not supported`)

    const client = this.modelClients.get(model.provider)
    if (!client) throw new Error(`Client for ${model.provider} not initialized`)

    const fullPrompt = this.buildPrompt(agent, prompt, context)

    let response
    const startTime = Date.now()

    try {
      switch (model.provider) {
        case 'openai':
          response = await this.executeOpenAI(
            client,
            agent,
            fullPrompt,
            options
          )
          break
        case 'anthropic':
          response = await this.executeAnthropic(
            client,
            agent,
            fullPrompt,
            options
          )
          break
        default:
          throw new Error(`Provider ${model.provider} not implemented`)
      }

      const executionTime = Date.now() - startTime
      await this.trackUsage(agentId, response.usage, executionTime, context)
      return response
    } catch (error) {
      await this.trackError(agentId, error as Error, context)
      throw error
    }
  }
  private buildPrompt(
    agent: AIAgent,
    userPrompt: string,
    context: AIExecutionContext
  ): string {
    let prompt = agent.systemPrompt + '\n\n'

    if (agent.promptTemplate) {
      // Replace template variables
      prompt += this.interpolateTemplate(agent.promptTemplate, {
        ...context.variables,
        user_prompt: userPrompt,
        context: context.metadata,
      })
    } else {
      prompt += userPrompt
    }

    return prompt
  }

  private interpolateTemplate(
    template: string,
    variables: Record<string, any>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match
    })
  }
  private async executeOpenAI(
    client: any,
    agent: AIAgent,
    prompt: string,
    options: any
  ) {
    const messages = [{ role: 'user', content: prompt }]

    const requestConfig: {
      model: string
      messages: { role: string; content: string }[]
      temperature: number
      max_tokens: number
      top_p: number
      frequency_penalty: number
      presence_penalty: number
      stream: boolean
      tools?: any[]
    } = {
      model: agent.model,
      messages,
      temperature: agent.parameters.temperature,
      max_tokens: agent.parameters.maxTokens,
      top_p: agent.parameters.topP,
      frequency_penalty: agent.parameters.frequencyPenalty,
      presence_penalty: agent.parameters.presencePenalty,
      stream: options.stream || false,
    }

    // Add tools if specified
    if (agent.tools && agent.tools.length > 0 && options.tools) {
      requestConfig.tools = agent.tools
        .filter(tool => options.tools!.includes(tool.name))
        .map(tool => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        }))
    }

    const response = await client.chat.completions.create(requestConfig)

    return {
      content: response.choices[0].message.content,
      usage: {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      model: agent.model,
      finishReason: response.choices[0].finish_reason,
      toolCalls: response.choices[0].message.tool_calls || [],
    }
  }

  private async executeAnthropic(
    client: any,
    agent: AIAgent,
    prompt: string,
    options: any
  ) {
    const response = await client.messages.create({
      model: agent.model,
      max_tokens: agent.parameters.maxTokens,
      temperature: agent.parameters.temperature,
      top_p: agent.parameters.topP,
      messages: [{ role: 'user', content: prompt }],
      stream: options.stream || false,
    })

    return {
      content: response.content[0].text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      model: agent.model,
      finishReason: response.stop_reason,
      toolCalls: [],
    }
  }

  private async trackUsage(
    agentId: string,
    usage: any,
    executionTime: number,
    context: AIExecutionContext
  ) {
    // Update agent usage stats
    const { error } = await this.supabase.rpc('update_agent_usage', {
      agent_id: agentId,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      execution_time: executionTime,
    })

    if (error) console.error('Failed to track usage:', error)

    // Log detailed usage
    await this.supabase.from('ai_usage_logs').insert({
      agent_id: agentId,
      organization_id: context.organizationId,
      user_id: context.userId,
      workflow_id: context.workflowId,
      session_id: context.sessionId,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens,
      execution_time_ms: executionTime,
      model: usage.model,
      created_at: new Date().toISOString(),
    })
  }

  private async trackError(
    agentId: string,
    error: Error,
    context: AIExecutionContext
  ) {
    await this.supabase.from('ai_error_logs').insert({
      agent_id: agentId,
      organization_id: context.organizationId,
      user_id: context.userId,
      workflow_id: context.workflowId,
      error_message: error.message,
      error_stack: error.stack,
      created_at: new Date().toISOString(),
    })
  }

  // Cost calculation
  calculateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const model = AI_MODELS[modelId]
    if (!model) return 0

    const inputCost = (inputTokens / 1000) * model.inputCostPer1K
    const outputCost = (outputTokens / 1000) * model.outputCostPer1K
    return inputCost + outputCost
  }
  recommendModel(requirements: {
    maxCost?: number
    minQuality?: number
    capabilities?: string[]
    maxLatency?: number
  }): AIModel[] {
    return Object.values(AI_MODELS)
      .filter(model => {
        if (requirements.capabilities) {
          return requirements.capabilities.every(cap =>
            model.capabilities.includes(cap)
          )
        }
        return true
      })
      .sort((a, b) => {
        // Sort by cost-effectiveness (lower cost per token = better)
        const aCost = a.inputCostPer1K + a.outputCostPer1K
        const bCost = b.inputCostPer1K + b.outputCostPer1K
        return aCost - bCost
      })
  }
}

export const DEFAULT_AI_TOOLS: AITool[] = [
  {
    name: 'get_current_time',
    description: 'Get the current date and time',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone (optional, defaults to UTC)',
        },
      },
      required: [],
    },
    handler: async params => {
      const timezone = params.timezone || 'UTC'
      return new Date().toLocaleString('en-US', { timeZone: timezone })
    },
  },
  {
    name: 'search_knowledge_base',
    description: 'Search the organization knowledge base',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return (default: 5)',
        },
      },
      required: ['query'],
    },
    handler: async (params, context) => {
      // This would integrate with your vector search
      return `Searched for: ${params.query} (mock result)`
    },
  },
  {
    name: 'execute_workflow',
    description: 'Execute another workflow',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'ID of the workflow to execute',
        },
        input_data: {
          type: 'object',
          description: 'Data to pass to the workflow',
        },
      },
      required: ['workflow_id'],
    },
    handler: async (params, context) => {
      // This would integrate with your workflow engine
      return `Executed workflow ${params.workflow_id} with data: ${JSON.stringify(params.input_data)}`
    },
  },
  {
    name: 'send_notification',
    description: 'Send a notification to users',
    parameters: {
      type: 'object',
      properties: {
        recipients: {
          type: 'array',
          items: { type: 'string' },
          description: 'User IDs or email addresses',
        },
        message: {
          type: 'string',
          description: 'Notification message',
        },
        channel: {
          type: 'string',
          enum: ['email', 'slack', 'webhook'],
          description: 'Notification channel',
        },
      },
      required: ['recipients', 'message', 'channel'],
    },
    handler: async (params, context) => {
      // This would integrate with your notification system
      return `Sent ${params.channel} notification to ${params.recipients.length} recipients`
    },
  },
]

// Prompt Templates
export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'data-analyst',
    name: 'Data Analysis Assistant',
    description: 'Analyze data and provide insights',
    template: `You are a data analysis expert. Analyze the following data and provide insights:

Data: {{data}}
Analysis Type: {{analysis_type}}
Focus Areas: {{focus_areas}}

Please provide:
1. Key insights and patterns
2. Statistical summary
3. Recommendations for action
4. Any data quality issues you notice

Format your response in a clear, structured manner.`,
    variables: [
      {
        name: 'data',
        type: 'object',
        required: true,
        description: 'Data to analyze',
      },
      {
        name: 'analysis_type',
        type: 'string',
        required: false,
        description: 'Type of analysis needed',
      },
      {
        name: 'focus_areas',
        type: 'array',
        required: false,
        description: 'Specific areas to focus on',
      },
    ],
    category: 'Analytics',
    tags: ['data', 'analysis', 'insights'],
  },
  {
    id: 'content-generator',
    name: 'Content Generation Assistant',
    description: 'Generate various types of content',
    template: `You are a content creation expert. Create {{content_type}} content based on the following requirements:

Topic: {{topic}}
Target Audience: {{audience}}
Tone: {{tone}}
Length: {{length}}
Key Points: {{key_points}}

Additional Requirements: {{requirements}}

Please create engaging, well-structured content that meets these specifications.`,
    variables: [
      {
        name: 'content_type',
        type: 'string',
        required: true,
        description: 'Type of content (blog post, email, etc.)',
      },
      {
        name: 'topic',
        type: 'string',
        required: true,
        description: 'Main topic or subject',
      },
      {
        name: 'audience',
        type: 'string',
        required: true,
        description: 'Target audience description',
      },
      {
        name: 'tone',
        type: 'string',
        required: false,
        description: 'Desired tone (professional, casual, etc.)',
      },
      {
        name: 'length',
        type: 'string',
        required: false,
        description: 'Desired length or word count',
      },
      {
        name: 'key_points',
        type: 'array',
        required: false,
        description: 'Key points to include',
      },
      {
        name: 'requirements',
        type: 'string',
        required: false,
        description: 'Additional requirements',
      },
    ],
    category: 'Content',
    tags: ['content', 'writing', 'marketing'],
  },
  {
    id: 'customer-support',
    name: 'Customer Support Assistant',
    description: 'Handle customer support inquiries',
    template: `You are a helpful customer support representative. Please assist the customer with their inquiry:

Customer Message: {{customer_message}}
Customer Information: {{customer_info}}
Previous Interactions: {{previous_interactions}}
Product/Service Context: {{product_context}}

Please provide a helpful, empathetic, and professional response. If you cannot resolve the issue, suggest appropriate next steps or escalation paths.`,
    variables: [
      {
        name: 'customer_message',
        type: 'string',
        required: true,
        description: 'Customer inquiry or message',
      },
      {
        name: 'customer_info',
        type: 'object',
        required: false,
        description: 'Customer account information',
      },
      {
        name: 'previous_interactions',
        type: 'array',
        required: false,
        description: 'Previous support interactions',
      },
      {
        name: 'product_context',
        type: 'string',
        required: false,
        description: 'Relevant product or service information',
      },
    ],
    category: 'Support',
    tags: ['customer-service', 'support', 'help'],
  },
]
