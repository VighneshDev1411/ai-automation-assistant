import OpenAI from 'openai'
import {
  FunctionCallingSystem,
  ToolDefinition,
  ToolExecutionContext,
} from './FunctionCallingSystem'
import { error } from 'console'

export interface AgentConfig {
  name: string
  description: string
  model: string
  systemPrompt: string
  temperature?: number
  maxTokens?: number
  availableTools: string[]
}

export interface AgentResponse {
  message: string
  toolCalls?: Array<{
    toolName: string
    parameters: Record<string, any>
    result: any
  }>
  tokensUsed: number
  processingTime: number
}

export class AgentWithTools {
  private openai: OpenAI
  private functionSystem: FunctionCallingSystem
  private config: AgentConfig

  constructor(config: AgentConfig, functionSystem: FunctionCallingSystem) {
    this.config = config
    this.functionSystem = functionSystem

    const apiKey =
      process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY

    if (!apiKey) {
      throw new Error('OpenAI API key not found')
    }

    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    })
  }

  // Process a message and execute tools if needed

  // Process a message and execute tools if needed
  async processMessage(
    message: string,
    context: ToolExecutionContext
  ): Promise<AgentResponse> {
    const startTime = Date.now()

    try {
      // Get available tools for this agent
      const availableTools = this.getAgentTools()

      // Prepare OpenAI function definitions
      const functions = availableTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: this.convertParametersToOpenAI(tool.parameters),
          required: Object.entries(tool.parameters)
            .filter(([_, param]) => (param as any).required)
            .map(([name, _]) => name),
        },
      }))

      // Make initial request to OpenAI
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.config.systemPrompt,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        functions: functions.length > 0 ? functions : undefined,
        function_call: functions.length > 0 ? 'auto' : undefined,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000,
      })

      const assistantMessage = response.choices[0]?.message
      if (!assistantMessage) {
        throw new Error('No response from OpenAI')
      }

      let finalMessage = assistantMessage.content || ''
      const toolCalls: Array<{
        toolName: string
        parameters: Record<string, any>
        result: any
      }> = []

      // Handle function calls
      if (assistantMessage.function_call) {
        const functionCall = assistantMessage.function_call
        const toolName = functionCall.name
        const parameters = JSON.parse(functionCall.arguments || '{}')

        console.log(`Agent calling tool: ${toolName}`)

        // Execute the function
        const result = await this.functionSystem.executeFunction(
          toolName,
          parameters,
          context
        )

        toolCalls.push({
          toolName,
          parameters,
          result: result.result,
        })

        // Get final response with function result - FIXED
        const followupResponse = await this.openai.chat.completions.create({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: this.config.systemPrompt,
            },
            {
              role: 'user',
              content: message,
            },
            {
              role: 'assistant',
              content: assistantMessage.content || '', // FIX: Handle null content
              function_call: assistantMessage.function_call,
            },
            {
              role: 'function',
              name: toolName,
              content: JSON.stringify(result.result),
            },
          ],
          temperature: this.config.temperature || 0.7,
          max_tokens: this.config.maxTokens || 1500, // FIX: Increase token limit
        })

        finalMessage =
          followupResponse.choices[0]?.message?.content ||
          `I used the ${toolName} tool and found: ${JSON.stringify(result.result).substring(0, 500)}`
      }

      const processingTime = Date.now() - startTime
      const tokensUsed = response.usage?.total_tokens || 0

      return {
        message: finalMessage,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        tokensUsed,
        processingTime,
      }
    } catch (error) {
      console.error('Agent processing error:', error)
      const processingTime = Date.now() - startTime

      return {
        message: `I encountered an error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tokensUsed: 0,
        processingTime,
      }
    }
  }
  private getAgentTools(): ToolDefinition[] {
    const allTools = this.functionSystem.getAvailableTools()
    return allTools.filter(tool =>
      this.config.availableTools.includes(tool.name)
    )
  }

  /**
   * Convert our parameter format to OpenAI function format
   */
  private convertParametersToOpenAI(
    parameters: Record<string, any>
  ): Record<string, any> {
    const converted: Record<string, any> = {}

    for (const [name, param] of Object.entries(parameters)) {
      converted[name] = {
        type: param.type,
        description: param.description,
      }

      if (param.enum) {
        converted[name].enum = param.enum
      }

      if (param.properties) {
        converted[name].properties = this.convertParametersToOpenAI(
          param.properties
        )
      }
    }

    return converted
  }

  /**
   * Update agent configuration
   */
  updateConfig(newConfig: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config }
  }
}

// Predefined agent configurations
export const AGENT_PRESETS: Record<
  string,
  Omit<AgentConfig, 'availableTools'>
> = {
  assistant: {
    name: 'General Assistant',
    description: 'A helpful assistant that can perform various tasks',
    model: 'gpt-3.5-turbo',
    systemPrompt:
      'You are a helpful assistant. Use the available tools when needed to complete tasks efficiently.',
    temperature: 0.7,
    maxTokens: 1000,
  },

  dataAnalyst: {
    name: 'Data Analyst',
    description: 'Specialized in data analysis and formatting',
    model: 'gpt-4',
    systemPrompt:
      'You are a data analyst. Help users analyze, format, and search through data using the available tools.',
    temperature: 0.3,
    maxTokens: 1500,
  },

  automationBot: {
    name: 'Automation Bot',
    description: 'Handles automated tasks and communications',
    model: 'gpt-3.5-turbo',
    systemPrompt:
      'You are an automation bot. Execute tasks efficiently and communicate results clearly.',
    temperature: 0.5,
    maxTokens: 800,
  },
}
