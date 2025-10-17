import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Lazy initialize AI clients to avoid build-time errors
let openaiClient: OpenAI | null = null
let anthropicClient: Anthropic | null = null
let googleAIClient: GoogleGenerativeAI | null = null

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    })
  }
  return openaiClient
}

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    })
  }
  return anthropicClient
}

function getGoogleAIClient() {
  if (!googleAIClient) {
    googleAIClient = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')
  }
  return googleAIClient
}

// Model configuration
const MODEL_CONFIGS = {
  'gpt-4-turbo': {
    provider: 'openai',
    costPer1kInputTokens: 0.01,
    costPer1kOutputTokens: 0.03,
  },
  'gpt-3.5-turbo': {
    provider: 'openai',
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.0015,
  },
  'claude-3-opus': {
    provider: 'anthropic',
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.075,
  },
  'claude-3-sonnet': {
    provider: 'anthropic',
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
  },
  'claude-3-haiku': {
    provider: 'anthropic',
    costPer1kInputTokens: 0.00025,
    costPer1kOutputTokens: 0.00125,
  },
  'gemini-pro': {
    provider: 'google',
    costPer1kInputTokens: 0.00025,
    costPer1kOutputTokens: 0.0005,
  },
}

type ModelId = keyof typeof MODEL_CONFIGS

interface ComparisonRequest {
  models: string[]
  prompt: string
  input?: string
  temperature?: number
  maxTokens?: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const body: ComparisonRequest = await request.json()

    // Validate request
    if (!body.models || body.models.length === 0) {
      return NextResponse.json({ error: 'No models specified' }, { status: 400 })
    }

    if (!body.prompt) {
      return NextResponse.json({ error: 'No prompt specified' }, { status: 400 })
    }

    if (body.models.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 models allowed' }, { status: 400 })
    }

    // Validate models
    for (const model of body.models) {
      if (!MODEL_CONFIGS[model as ModelId]) {
        return NextResponse.json({ error: `Unknown model: ${model}` }, { status: 400 })
      }
    }

    // Run comparisons in parallel
    const results = await Promise.all(
      body.models.map(modelId => runModelComparison(
        modelId as ModelId,
        body.prompt,
        body.input,
        body.temperature,
        body.maxTokens,
        membership.organization_id,
        user.id
      ))
    )

    return NextResponse.json({ 
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('Comparison API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function runModelComparison(
  modelId: ModelId,
  prompt: string,
  input?: string,
  temperature: number = 0.7,
  maxTokens: number = 1000,
  organizationId?: string,
  userId?: string
) {
  const config = MODEL_CONFIGS[modelId]
  const startTime = Date.now()

  try {
    let response: any
    let tokensUsed = { input: 0, output: 0, total: 0 }

    // Combine prompt and input
    const fullPrompt = input ? `${prompt}\n\nInput: ${input}` : prompt

    // Call appropriate API based on provider
    switch (config.provider) {
      case 'openai':
        response = await callOpenAI(modelId, fullPrompt, temperature, maxTokens)
        tokensUsed = response.tokensUsed
        break

      case 'anthropic':
        response = await callAnthropic(modelId, fullPrompt, temperature, maxTokens)
        tokensUsed = response.tokensUsed
        break

      case 'google':
        response = await callGoogle(modelId, fullPrompt, temperature, maxTokens)
        tokensUsed = response.tokensUsed
        break

      default:
        throw new Error(`Unknown provider: ${config.provider}`)
    }

    const duration = Date.now() - startTime

    // Calculate cost
    const cost = (
      (tokensUsed.input / 1000) * config.costPer1kInputTokens +
      (tokensUsed.output / 1000) * config.costPer1kOutputTokens
    )

    // Calculate quality scores (simple heuristics for now)
    const qualityScore = calculateQualityScore(response.content, prompt)
    const relevanceScore = calculateRelevanceScore(response.content, prompt)
    const coherenceScore = calculateCoherenceScore(response.content)

    // Save to database
    if (organizationId && userId) {
      const supabase = await createClient()
      await supabase.from('ai_model_comparisons').insert({
        organization_id: organizationId,
        user_id: userId,
        test_prompt: prompt,
        test_input: input,
        model: modelId,
        model_provider: config.provider,
        response_content: response.content,
        duration,
        tokens_used: tokensUsed.total,
        cost,
        quality_score: qualityScore,
        relevance_score: relevanceScore,
        coherence_score: coherenceScore,
        status: 'success',
      })
    }

    return {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      model: modelId,
      prompt,
      response: response.content,
      metrics: {
        duration,
        tokensUsed: tokensUsed.total,
        cost,
        quality: qualityScore,
        relevance: relevanceScore,
        coherence: coherenceScore,
      },
      status: 'success',
    }

  } catch (error: any) {
    const duration = Date.now() - startTime

    // Log error to database
    if (organizationId && userId) {
      const supabase = await createClient()
      await supabase.from('ai_model_comparisons').insert({
        organization_id: organizationId,
        user_id: userId,
        test_prompt: prompt,
        test_input: input,
        model: modelId,
        model_provider: config.provider,
        duration,
        status: 'error',
        error_message: error.message,
      })
    }

    return {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      model: modelId,
      prompt,
      response: '',
      metrics: {
        duration,
        tokensUsed: 0,
        cost: 0,
        quality: 0,
        relevance: 0,
        coherence: 0,
      },
      status: 'error',
      error: error.message,
    }
  }
}

// OpenAI API call
async function callOpenAI(model: string, prompt: string, temperature: number, maxTokens: number) {
  const openai = getOpenAIClient()
  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature,
    max_tokens: maxTokens,
  })

  return {
    content: completion.choices[0]?.message?.content || '',
    tokensUsed: {
      input: completion.usage?.prompt_tokens || 0,
      output: completion.usage?.completion_tokens || 0,
      total: completion.usage?.total_tokens || 0,
    },
  }
}

// Anthropic API call
async function callAnthropic(model: string, prompt: string, temperature: number, maxTokens: number) {
  const anthropic = getAnthropicClient()
  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  const textContent = content.type === 'text' ? content.text : ''

  return {
    content: textContent,
    tokensUsed: {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
      total: message.usage.input_tokens + message.usage.output_tokens,
    },
  }
}

// Google Gemini API call
async function callGoogle(model: string, prompt: string, temperature: number, maxTokens: number) {
  const googleAI = getGoogleAIClient()
  const genModel = googleAI.getGenerativeModel({ model: 'gemini-pro' })

  const result = await genModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  })

  const response = result.response
  const text = response.text()

  // Google doesn't always provide token counts, estimate them
  const estimatedInputTokens = Math.ceil(prompt.length / 4)
  const estimatedOutputTokens = Math.ceil(text.length / 4)

  return {
    content: text,
    tokensUsed: {
      input: estimatedInputTokens,
      output: estimatedOutputTokens,
      total: estimatedInputTokens + estimatedOutputTokens,
    },
  }
}

// Simple quality scoring heuristics
function calculateQualityScore(response: string, prompt: string): number {
  if (!response || response.length === 0) return 0

  let score = 50 // Base score

  // Length appropriateness (not too short, not too long)
  const idealLength = Math.max(prompt.length * 2, 200)
  const lengthRatio = response.length / idealLength
  if (lengthRatio >= 0.5 && lengthRatio <= 2) {
    score += 20
  } else if (lengthRatio >= 0.3 && lengthRatio <= 3) {
    score += 10
  }

  // Sentence structure (has proper sentences)
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length >= 2) {
    score += 15
  }

  // No repetition (basic check)
  const words = response.toLowerCase().split(/\s+/)
  const uniqueWords = new Set(words)
  const uniqueRatio = uniqueWords.size / words.length
  if (uniqueRatio > 0.5) {
    score += 15
  }

  return Math.min(100, Math.max(0, score))
}

function calculateRelevanceScore(response: string, prompt: string): number {
  if (!response || response.length === 0) return 0

  let score = 50

  // Check for keywords from prompt in response
  const promptWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const responseWords = response.toLowerCase().split(/\s+/)
  
  let matchCount = 0
  for (const word of promptWords) {
    if (responseWords.includes(word)) {
      matchCount++
    }
  }

  const matchRatio = promptWords.length > 0 ? matchCount / promptWords.length : 0
  score += matchRatio * 50

  return Math.min(100, Math.max(0, score))
}

function calculateCoherenceScore(response: string): number {
  if (!response || response.length === 0) return 0

  let score = 50

  // Has proper structure
  const hasParagraphs = response.includes('\n\n')
  if (hasParagraphs) score += 15

  // Has punctuation
  const punctuationCount = (response.match(/[.!?,;:]/g) || []).length
  if (punctuationCount > 2) score += 15

  // Reasonable sentence length
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const avgSentenceLength = sentences.length > 0 
    ? response.length / sentences.length 
    : 0
  
  if (avgSentenceLength > 20 && avgSentenceLength < 200) {
    score += 20
  }

  return Math.min(100, Math.max(0, score))
}