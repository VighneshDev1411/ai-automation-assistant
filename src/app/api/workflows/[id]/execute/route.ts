// src/app/api/workflows/[id]/execute/route.ts
/**
 * Manual Workflow Execution Endpoint
 * Allows users to manually trigger workflow execution
 * 
 * Usage:
 *   POST /api/workflows/{workflow-id}/execute
 *   Body: { input: { key: "value" } }  // Optional input data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addWorkflowExecutionJob } from '@/lib/queue/queue-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST - Manually execute a workflow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const workflowId = params.id
    
    console.log(`🎯 Manual execution request for workflow: ${workflowId}`)
    console.log(`   User: ${user.email}`)
    
    // Get workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, name, organization_id, status, nodes, edges, created_by')
      .eq('id', workflowId)
      .single()
    
    if (workflowError || !workflow) {
      console.error(`❌ Workflow not found: ${workflowId}`)
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }
    
    // Check if user has access to this workflow's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', workflow.organization_id)
      .single()
    
    if (!membership) {
      console.error(`❌ User ${user.email} does not have access to workflow ${workflow.name}`)
      return NextResponse.json(
        { error: 'You do not have access to this workflow' },
        { status: 403 }
      )
    }
    
    // Check workflow status
    if (workflow.status === 'archived') {
      return NextResponse.json(
        { error: 'Cannot execute archived workflow' },
        { status: 400 }
      )
    }
    
    // Parse input data from request
    const body = await request.json().catch(() => ({}))
    const inputData = body.input || body.data || {}
    
    console.log(`⚙️ Queueing manual execution for: ${workflow.name}`)
    if (Object.keys(inputData).length > 0) {
      console.log(`   Input data keys: ${Object.keys(inputData).join(', ')}`)
    }

    // Queue workflow execution
    const job = await addWorkflowExecutionJob({
      workflowId,
      organizationId: workflow.organization_id,
      userId: user.id,
      source: 'manual',
      triggerData: {
        ...inputData,
        triggeredBy: user.id,
        triggeredByEmail: user.email,
        triggeredAt: new Date().toISOString(),
        manual: true,
        source: 'api',
      },
    })
    
    console.log(`✅ Manual execution queued successfully`)
    console.log(`   Job ID: ${job.id}`)
    console.log(`   Workflow: ${workflow.name}`)
    
    return NextResponse.json({
      success: true,
      message: 'Workflow execution started',
      workflowId,
      workflowName: workflow.name,
      jobId: job.id,
      triggeredBy: user.email,
      timestamp: new Date().toISOString(),
      status: 'queued',
    }, { status: 200 })
    
  } catch (error: any) {
    console.error('❌ Manual execution error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to execute workflow', 
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Get execution history for a workflow
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const workflowId = params.id
    
    // Get recent executions
    const { data: executions, error } = await supabase
      .from('workflow_executions')
      .select('id, workflow_id, status, trigger_type, started_at, completed_at, error_message')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false })
      .limit(10)
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch executions', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      workflowId,
      executions: executions || [],
      count: executions?.length || 0,
    })
    
  } catch (error: any) {
    console.error('Failed to fetch executions:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
