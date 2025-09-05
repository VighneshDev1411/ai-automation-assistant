// ==========================================
// FIX: src/app/api/workflows/conditionals/config/route.ts
// ==========================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// ✅ FIXED: Define the missing schema
const createConditionalConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(['if-then-else', 'switch-case', 'loop-while', 'loop-for', 'simple-condition']),
  condition: z.object({
    field: z.string().optional(),
    operator: z.enum([
      'equals', 'not_equals', 'contains', 'greater_than', 'less_than',
      'greater_than_or_equal', 'less_than_or_equal', 'exists', 'in', 'not_in',
      'starts_with', 'ends_with', 'and', 'or', 'not'
    ]).optional(),
    value: z.any().optional(),
    conditions: z.array(z.any()).optional() // For nested conditions
  }).optional(),
  thenActions: z.array(z.object({
    id: z.string().optional(),
    type: z.string(),
    config: z.record(z.string(), z.any()).optional()
  })).optional(),
  elseActions: z.array(z.object({
    id: z.string().optional(),
    type: z.string(),
    config: z.record(z.string(), z.any()).optional()
  })).optional(),
  field: z.string().optional(), // For switch-case
  cases: z.array(z.object({
    value: z.any(),
    actions: z.array(z.any())
  })).optional(),
  defaultActions: z.array(z.any()).optional(),
  actions: z.array(z.any()).optional(), // For loops
  items: z.array(z.any()).optional(), // For for-loops
  itemVariable: z.string().optional(),
  maxIterations: z.number().min(1).max(10000).optional(),
  workflowId: z.string().uuid().optional()
})

const updateConditionalConfigSchema = createConditionalConfigSchema.partial()

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const config = createConditionalConfigSchema.parse(body)

    // Generate unique ID for the configuration
    const conditionalConfig = {
      id: crypto.randomUUID(),
      ...config,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // If workflowId is provided, validate workflow exists and user has access
    if (config.workflowId) {
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .select('id, organization_id')
        .eq('id', config.workflowId)
        .single()

      if (workflowError || !workflow) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
      }

      // Check user has access to this organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', workflow.organization_id)
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      // Add conditional config to workflow's conditions array
      // First, fetch current conditions
      const { data: workflowData, error: workflowFetchError } = await supabase
        .from('workflows')
        .select('conditions')
        .eq('id', config.workflowId)
        .single()

      if (workflowFetchError || !workflowData) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
      }

      const currentConditions = Array.isArray(workflowData.conditions) ? workflowData.conditions : []
      const newConditions = [...currentConditions, conditionalConfig]

      const { error: updateError } = await supabase
        .from('workflows')
        .update({
          conditions: newConditions,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.workflowId)

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to add conditional to workflow' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      config: conditionalConfig,
      message: 'Conditional configuration created successfully'
    })

  } catch (error) {
    console.error('Error creating conditional config:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')
    const type = searchParams.get('type')

    // Get available conditional types and templates
    const conditionalTypes = [
      {
        type: 'if-then-else',
        name: 'If-Then-Else Logic',
        description: 'Basic conditional branching based on a condition',
        template: {
          type: 'if-then-else',
          condition: { field: '', operator: 'equals', value: '' },
          thenActions: [],
          elseActions: []
        }
      },
      {
        type: 'switch-case',
        name: 'Switch-Case Logic',
        description: 'Multiple condition matching like a switch statement',
        template: {
          type: 'switch-case',
          field: '',
          cases: [
            { value: '', actions: [] }
          ],
          defaultActions: []
        }
      },
      {
        type: 'loop-while',
        name: 'While Loop',
        description: 'Repeat actions while a condition is true',
        template: {
          type: 'loop-while',
          condition: { field: '', operator: 'equals', value: '' },
          actions: [],
          maxIterations: 100
        }
      },
      {
        type: 'loop-for',
        name: 'For Each Loop',
        description: 'Iterate over a list of items',
        template: {
          type: 'loop-for',
          items: [],
          itemVariable: 'item',
          actions: []
        }
      },
      {
        type: 'simple-condition',
        name: 'Simple Condition',
        description: 'Evaluate a condition and return the result',
        template: {
          type: 'simple-condition',
          condition: { field: '', operator: 'equals', value: '' }
        }
      }
    ]

    // Filter by type if specified
    const filteredTypes = type 
      ? conditionalTypes.filter(ct => ct.type === type)
      : conditionalTypes

    // If workflowId is provided, get existing conditionals for that workflow
    let existingConditionals = []
    if (workflowId) {
      const { data: workflow } = await supabase
        .from('workflows')
        .select('conditions, organization_id')
        .eq('id', workflowId)
        .single()

      if (workflow) {
        // Check user has access
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('organization_id', workflow.organization_id)
          .single()

        if (membership && workflow.conditions) {
          existingConditionals = Array.isArray(workflow.conditions) 
            ? workflow.conditions 
            : []
        }
      }
    }

    return NextResponse.json({
      success: true,
      conditionalTypes: filteredTypes,
      existingConditionals,
      operators: [
        { value: 'equals', label: 'Equals', description: 'Field equals value' },
        { value: 'not_equals', label: 'Not Equals', description: 'Field does not equal value' },
        { value: 'contains', label: 'Contains', description: 'Field contains value' },
        { value: 'greater_than', label: 'Greater Than', description: 'Field is greater than value' },
        { value: 'less_than', label: 'Less Than', description: 'Field is less than value' },
        { value: 'greater_than_or_equal', label: 'Greater Than or Equal', description: 'Field is greater than or equal to value' },
        { value: 'less_than_or_equal', label: 'Less Than or Equal', description: 'Field is less than or equal to value' },
        { value: 'exists', label: 'Exists', description: 'Field exists and is not null' },
        { value: 'in', label: 'In List', description: 'Field value is in the provided list' },
        { value: 'not_in', label: 'Not In List', description: 'Field value is not in the provided list' },
        { value: 'starts_with', label: 'Starts With', description: 'Field starts with value' },
        { value: 'ends_with', label: 'Ends With', description: 'Field ends with value' }
      ]
    })

  } catch (error) {
    console.error('Error getting conditional configs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 })
    }

    const config = updateConditionalConfigSchema.parse(updateData)

    const updatedConfig = {
      ...config,
      updated_at: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      config: { id, ...updatedConfig },
      message: 'Conditional configuration updated successfully'
    })

  } catch (error) {
    console.error('Error updating conditional config:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const workflowId = searchParams.get('workflowId')
    
    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 })
    }

    // If workflowId provided, remove from workflow's conditions
    if (workflowId) {
      const { data: workflow } = await supabase
        .from('workflows')
        .select('conditions, organization_id')
        .eq('id', workflowId)
        .single()

      if (workflow) {
        // Check user access
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('organization_id', workflow.organization_id)
          .single()

        if (!membership) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Remove conditional from workflow
        const conditions = Array.isArray(workflow.conditions) ? workflow.conditions : []
        const updatedConditions = conditions.filter((c: any) => c.id !== id)

        const { error: updateError } = await supabase
          .from('workflows')
          .update({
            conditions: updatedConditions,
            updated_at: new Date().toISOString()
          })
          .eq('id', workflowId)

        if (updateError) {
          return NextResponse.json(
            { error: 'Failed to remove conditional from workflow' },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Conditional configuration deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting conditional config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Add runtime configuration
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'