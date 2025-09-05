import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"  // ✅ FIXED: Import from 'zod' not 'z'
import { ConditionalIntegration } from "@/lib/workflow-engine/integrations/ConditionalIntegration"
// import { ConditionalIntegration } from "@/lib/workflow-engine/core/ConditionalEngine"

// ✅ FIXED: Better schema that matches the expected input
const executeSchema = z.object({
  config: z.object({
    type: z.enum(['if-then-else', 'switch-case', 'loop-while', 'loop-for', 'simple-condition']).default('if-then-else'),
    condition: z.any().optional(),
    thenActions: z.array(z.any()).optional(),
    elseActions: z.array(z.any()).optional(),
    field: z.string().optional(),
    cases: z.array(z.any()).optional(),
    defaultActions: z.array(z.any()).optional(),
    actions: z.array(z.any()).optional(),
    items: z.array(z.any()).optional(),
    itemVariable: z.string().optional(),
    maxIterations: z.number().optional()
  }),
  context: z.object({
    executionId: z.string().optional(),
    workflowId: z.string().optional(),
    orgId: z.string().optional(),
    userId: z.string().optional(),
    variables: z.record(z.string(), z.any()).default({}),
    triggerData: z.any().optional(),
    currentStepIndex: z.number().default(0),
    executionStartTime: z.string().optional()
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ✅ FIXED: Proper parsing with validation
    const parsed = executeSchema.parse(body)
    const { config, context } = parsed

    // ✅ FIXED: Convert executionStartTime to Date if provided
    const executionContext = {
      ...context,
      executionStartTime: context.executionStartTime 
        ? new Date(context.executionStartTime)
        : new Date()
    }

    // ✅ FIXED: Now this method exists
    const result = await ConditionalIntegration.executeConditionalAction(
      config,
      executionContext
    )

    return NextResponse.json({
      success: true,
      result,
      message: 'Conditional action executed successfully',
      cacheStats: ConditionalIntegration.getCacheStats()
    })

  } catch (error) {
    console.error('Error executing conditional:', error)
    
    // ✅ FIXED: Use 'issues' instead of 'errors'
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
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
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// ✅ ADD: GET endpoint to get cache stats and available conditional types
export async function GET(request: NextRequest) {
  try {
    const cacheStats = ConditionalIntegration.getCacheStats()
    
    const availableTypes = [
      {
        type: 'if-then-else',
        description: 'Basic conditional branching',
        requiredFields: ['condition'],
        optionalFields: ['thenActions', 'elseActions']
      },
      {
        type: 'switch-case',
        description: 'Multiple condition branching',
        requiredFields: ['field', 'cases'],
        optionalFields: ['defaultActions']
      },
      {
        type: 'loop-while',
        description: 'Repeat actions while condition is true',
        requiredFields: ['condition', 'actions'],
        optionalFields: ['maxIterations']
      },
      {
        type: 'loop-for',
        description: 'Iterate over array items',
        requiredFields: ['items', 'actions'],
        optionalFields: ['itemVariable']
      },
      {
        type: 'simple-condition',
        description: 'Evaluate a condition and return result',
        requiredFields: ['condition'],
        optionalFields: []
      }
    ]

    return NextResponse.json({
      success: true,
      cacheStats,
      availableTypes,
      message: 'Conditional integration info retrieved successfully'
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// ✅ ADD: DELETE endpoint to clear cache
export async function DELETE(request: NextRequest) {
  try {
    ConditionalIntegration.clearCache()
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      cacheStats: ConditionalIntegration.getCacheStats()
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
