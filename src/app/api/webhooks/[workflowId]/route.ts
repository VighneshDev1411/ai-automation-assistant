// src/app/api/webhooks/[workflowId]/route.ts
/**
 * Webhook Trigger Endpoint
 * Receives HTTP requests and triggers workflow executions
 * 
 * Usage:
 *   POST /api/webhooks/{workflow-id}
 *   Headers:
 *     - x-api-key: {secret}  (if auth_type is 'api_key')
 *     - Authorization: Bearer {secret}  (if auth_type is 'bearer_token')
 *     - x-webhook-signature: {hmac}  (if auth_type is 'hmac')
 */

import { NextRequest, NextResponse } from 'next/server'
import { createWorkerClient } from '@/lib/supabase/worker-client'
import { addWorkflowExecutionJob } from '@/lib/queue/queue-manager'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30 // 30 second timeout

/**
 * POST - Trigger workflow via webhook
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  const startTime = Date.now()
  const supabase = createWorkerClient()
  
  let workflowId: string
  let organizationId: string = 'unknown'
  
  try {
    workflowId = params.workflowId
    
    console.log(`📨 Webhook received for workflow: ${workflowId}`)
    
    // Get workflow configuration
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, name, organization_id, webhook_enabled, webhook_secret, webhook_auth_type, webhook_config, nodes, edges, created_by')
      .eq('id', workflowId)
      .single()
    
    if (workflowError || !workflow) {
      console.error(`❌ Workflow not found: ${workflowId}`)
      await logWebhookRequest(supabase, {
        workflowId,
        organizationId,
        request,
        statusCode: 404,
        success: false,
        errorMessage: 'Workflow not found',
        duration: Date.now() - startTime,
      })
      
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }
    
    organizationId = workflow.organization_id
    
    // Check if webhook is enabled
    if (!workflow.webhook_enabled) {
      console.error(`❌ Webhook not enabled for workflow: ${workflow.name}`)
      await logWebhookRequest(supabase, {
        workflowId,
        organizationId,
        request,
        statusCode: 403,
        success: false,
        errorMessage: 'Webhook not enabled for this workflow',
        duration: Date.now() - startTime,
      })
      
      return NextResponse.json(
        { error: 'Webhook not enabled for this workflow' },
        { status: 403 }
      )
    }
    
    // Validate authentication
    const body = await request.text()
    const authValid = await validateWebhookAuth(request, workflow, body)
    
    if (!authValid) {
      console.error(`❌ Invalid webhook authentication for: ${workflow.name}`)
      await logWebhookRequest(supabase, {
        workflowId,
        organizationId,
        request,
        statusCode: 401,
        success: false,
        errorMessage: 'Invalid authentication',
        duration: Date.now() - startTime,
      })
      
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }
    
    // Parse request body
    let bodyData: any = {}
    try {
      bodyData = body ? JSON.parse(body) : {}
    } catch (e) {
      bodyData = { raw: body }
    }
    
    const headers = Object.fromEntries(request.headers.entries())
    const query = Object.fromEntries(request.nextUrl.searchParams.entries())
    const sourceIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    
    // Queue workflow execution
    console.log(`⚙️ Queueing workflow execution: ${workflow.name}`)

    const job = await addWorkflowExecutionJob({
      workflowId,
      organizationId: workflow.organization_id,
      userId: workflow.created_by,
      source: 'webhook',
      triggerData: {
        body: bodyData,
        headers: headers,
        query: query,
        method: request.method,
        timestamp: new Date().toISOString(),
        sourceIp: sourceIp,
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })
    
    const duration = Date.now() - startTime
    
    // Log successful webhook request
    const { data: logEntry } = await logWebhookRequest(supabase, {
      workflowId,
      organizationId,
      request,
      body: bodyData,
      query,
      headers,
      sourceIp,
      statusCode: 200,
      success: true,
      responseBody: { jobId: job.id },
      duration,
    })
    
    console.log(`✅ Webhook processed successfully (${duration}ms)`)
    
    return NextResponse.json({
      success: true,
      message: 'Workflow triggered successfully',
      workflowId,
      workflowName: workflow.name,
      jobId: job.id,
      logId: logEntry?.id,
      timestamp: new Date().toISOString(),
    }, { status: 200 })
    
  } catch (error: any) {
    console.error('❌ Webhook error:', error)
    
    const duration = Date.now() - startTime
    
    // Log error
    try {
      await logWebhookRequest(supabase, {
        workflowId: params.workflowId,
        organizationId,
        request,
        statusCode: 500,
        success: false,
        errorMessage: error.message,
        duration,
      })
    } catch (logError) {
      console.error('Failed to log webhook error:', logError)
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Test webhook endpoint (returns info about the webhook)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const supabase = createWorkerClient()
    const workflowId = params.workflowId
    
    // Get workflow info (without sensitive data)
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('id, name, webhook_enabled, webhook_auth_type')
      .eq('id', workflowId)
      .single()
    
    if (error || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      message: 'Webhook endpoint active',
      workflowId: workflow.id,
      workflowName: workflow.name,
      webhookEnabled: workflow.webhook_enabled,
      authType: workflow.webhook_auth_type,
      method: 'POST',
      timestamp: new Date().toISOString(),
      documentation: 'Send POST request with JSON body to trigger this workflow',
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Validate webhook authentication based on configured auth type
 */
async function validateWebhookAuth(
  request: NextRequest,
  workflow: any,
  body: string
): Promise<boolean> {
  const authType = workflow.webhook_auth_type || 'none'
  
  try {
    switch (authType) {
      case 'none':
        return true
      
      case 'api_key': {
        const apiKey = request.headers.get('x-api-key')
        const isValid = apiKey === workflow.webhook_secret
        console.log(`🔐 API Key validation: ${isValid ? 'PASS' : 'FAIL'}`)
        return isValid
      }
      
      case 'bearer_token': {
        const auth = request.headers.get('authorization')
        const token = auth?.replace('Bearer ', '')
        const isValid = token === workflow.webhook_secret
        console.log(`🔐 Bearer Token validation: ${isValid ? 'PASS' : 'FAIL'}`)
        return isValid
      }
      
      case 'hmac': {
        const signature = request.headers.get('x-webhook-signature')
        if (!signature || !workflow.webhook_secret) {
          console.log(`🔐 HMAC validation: FAIL (missing signature or secret)`)
          return false
        }
        
        const expectedSignature = crypto
          .createHmac('sha256', workflow.webhook_secret)
          .update(body)
          .digest('hex')
        
        const isValid = signature === expectedSignature
        console.log(`🔐 HMAC validation: ${isValid ? 'PASS' : 'FAIL'}`)
        return isValid
      }
      
      default:
        console.log(`🔐 Unknown auth type: ${authType}`)
        return false
    }
  } catch (error) {
    console.error('❌ Auth validation error:', error)
    return false
  }
}

/**
 * Log webhook request to database
 */
async function logWebhookRequest(
  supabase: any,
  options: {
    workflowId: string
    organizationId: string
    request: NextRequest
    body?: any
    query?: any
    headers?: any
    sourceIp?: string
    statusCode: number
    success: boolean
    responseBody?: any
    errorMessage?: string
    duration: number
  }
) {
  try {
    const logData = {
      workflow_id: options.workflowId,
      organization_id: options.organizationId,
      method: options.request.method,
      headers: options.headers || {},
      query_params: options.query || {},
      body: options.body || {},
      source_ip: options.sourceIp || 'unknown',
      user_agent: options.request.headers.get('user-agent') || 'unknown',
      status_code: options.statusCode,
      response_body: options.responseBody || {},
      success: options.success,
      error_message: options.errorMessage || null,
      duration_ms: options.duration,
    }
    
    const { data, error } = await supabase
      .from('webhook_logs')
      .insert(logData)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to log webhook request:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
    
  } catch (error) {
    console.error('Failed to log webhook request:', error)
    return { data: null, error }
  }
}
