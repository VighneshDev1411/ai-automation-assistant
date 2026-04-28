// src/app/api/ai/execute/route.ts
/**
 * AI Execution Endpoint
 * Handles AI model calls for workflow automation
 * Supports: OpenAI GPT-4, Anthropic Claude, Google Gemini
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds max for AI calls

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const genAI = process.env.GOOGLE_AI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  : null

interface AIExecutionRequest {
  model: string
  prompt: string
  systemPrompt?: string
  context?: any
  temperature?: number
  maxTokens?: number
  agentType?: string
  config?: any
}

/**
 * Execute AI model inference
 */
export async function POST(request: NextRequest) {
  try {
    const body: AIExecutionRequest = await request.json()
    const {
      model,
      prompt,
      systemPrompt,
      context = {},
      temperature = 0.7,
      maxTokens = 2000,
      agentType,
      config = {},
    } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    console.log(`🤖 AI Execution Request:`)
    console.log(`   Model: ${model}`)
    console.log(`   Agent Type: ${agentType || 'generic'}`)
    console.log(`   Prompt length: ${prompt.length} chars`)

    let result: any

    // Route to appropriate AI provider
    if (model.includes('gpt')) {
      result = await executeOpenAI(model, prompt, systemPrompt, temperature, maxTokens, context)
    } else if (model.includes('claude')) {
      result = await executeAnthropic(model, prompt, systemPrompt, temperature, maxTokens, context)
    } else if (model.includes('gemini')) {
      result = await executeGemini(model, prompt, systemPrompt, temperature, maxTokens, context)
    } else {
      return NextResponse.json(
        { error: `Unsupported model: ${model}` },
        { status: 400 }
      )
    }

    console.log(`✅ AI execution completed`)
    console.log(`   Tokens used: ${result.usage?.total_tokens || 'N/A'}`)

    return NextResponse.json({
      success: true,
      model,
      agentType,
      result: result.content,
      usage: result.usage,
      metadata: {
        model,
        temperature,
        maxTokens,
        executedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('❌ AI execution error:', error)

    return NextResponse.json(
      {
        error: 'AI execution failed',
        details: error.message,
        provider: error.provider || 'unknown',
      },
      { status: 500 }
    )
  }
}

/**
 * Execute OpenAI (GPT) models
 */
async function executeOpenAI(
  model: string,
  prompt: string,
  systemPrompt?: string,
  temperature = 0.7,
  maxTokens = 2000,
  context: any = {}
): Promise<any> {
  try {
    console.log(`  → Calling OpenAI ${model}...`)

    const messages: any[] = []

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      })
    }

    // Add context as system message if provided
    if (Object.keys(context).length > 0) {
      messages.push({
        role: 'system',
        content: `Context data: ${JSON.stringify(context, null, 2)}`,
      })
    }

    messages.push({
      role: 'user',
      content: prompt,
    })

    const completion = await openai.chat.completions.create({
      model: model || 'gpt-4',
      messages,
      temperature,
      max_tokens: maxTokens,
    })

    return {
      content: completion.choices[0].message.content,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens,
        completion_tokens: completion.usage?.completion_tokens,
        total_tokens: completion.usage?.total_tokens,
      },
      model: completion.model,
    }
  } catch (error: any) {
    error.provider = 'openai'
    throw error
  }
}

/**
 * Execute Anthropic (Claude) models
 */
async function executeAnthropic(
  model: string,
  prompt: string,
  systemPrompt?: string,
  temperature = 0.7,
  maxTokens = 2000,
  context: any = {}
): Promise<any> {
  try {
    console.log(`  → Calling Anthropic ${model}...`)

    let fullPrompt = prompt

    // Add context to prompt if provided
    if (Object.keys(context).length > 0) {
      fullPrompt = `Context:\n${JSON.stringify(context, null, 2)}\n\n${prompt}`
    }

    const message = await anthropic.messages.create({
      model: model || 'claude-3-sonnet-20240229',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt || 'You are a helpful AI assistant for workflow automation.',
      messages: [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
    })

    return {
      content: message.content[0].type === 'text' ? message.content[0].text : '',
      usage: {
        prompt_tokens: message.usage.input_tokens,
        completion_tokens: message.usage.output_tokens,
        total_tokens: message.usage.input_tokens + message.usage.output_tokens,
      },
      model: message.model,
    }
  } catch (error: any) {
    error.provider = 'anthropic'
    throw error
  }
}

/**
 * Execute Google (Gemini) models
 */
async function executeGemini(
  model: string,
  prompt: string,
  systemPrompt?: string,
  temperature = 0.7,
  maxTokens = 2000,
  context: any = {}
): Promise<any> {
  try {
    if (!genAI) {
      throw new Error('Google AI API key not configured')
    }

    console.log(`  → Calling Google ${model}...`)

    const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-pro' })

    let fullPrompt = prompt

    if (systemPrompt) {
      fullPrompt = `${systemPrompt}\n\n${prompt}`
    }

    if (Object.keys(context).length > 0) {
      fullPrompt = `Context:\n${JSON.stringify(context, null, 2)}\n\n${fullPrompt}`
    }

    const result = await geminiModel.generateContent(fullPrompt)
    const response = result.response
    const text = response.text()

    return {
      content: text,
      usage: {
        prompt_tokens: 0, // Gemini doesn't provide token counts
        completion_tokens: 0,
        total_tokens: 0,
      },
      model,
    }
  } catch (error: any) {
    error.provider = 'google'
    throw error
  }
}

/**
 * GET - Get supported models and configuration
 */
export async function GET() {
  return NextResponse.json({
    supportedModels: {
      openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      google: ['gemini-pro', 'gemini-pro-vision'],
    },
    configured: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      google: !!process.env.GOOGLE_AI_API_KEY,
    },
  })
}
