import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ConditionalIntegration } from '@/lib/workflow-engine/integrations/ConditionalIntegration'
// import { AdvancedConditionalEngine } from '@/lib/workflow-engine/advanced/AdvancedConditionalEngine'
import { AdvancedConditionalEngine } from '@/lib/workflow-engine/advanced/AdvancedConditionEngine'
import { FilterEngine } from '@/lib/workflow-engine/advanced/FilterEngine'

// Validation schemas
const testConditionSchema = z.object({
  conditions: z.array(z.object({
    id: z.string(),
    type: z.enum(['simple', 'complex', 'filter', 'custom']),
    field: z.string().optional(),
    operator: z.string(),
    value: z.any(),
    conditions: z.array(z.any()).optional(),
    metadata: z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      priority: z.number().optional(),
      tags: z.array(z.string()).optional()
    }).optional()
  })),
  context: z.object({
    executionId: z.string(),
    workflowId: z.string(),
    orgId: z.string(),
    userId: z.string(),
    triggerData: z.record(z.any()),
    variables: z.record(z.any()),
    currentStepIndex: z.number(),
    executionStartTime: z.string()
  }),
  options: z.object({
    useCache: z.boolean().optional(),
    timeout: z.number().optional(),
    debugMode: z.boolean().optional()
  }).optional()
})

const createConditionalConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  conditions: z.array(z.any()).min(1),
  filters: z.array(z.any()).optional(),
  onTrue: z.object({
    actionIds: z.array(z.string()),
    continueWorkflow: z.boolean(),
    setVariables: z.record(z.any()).optional(),
    metadata: z.object({
      description: z.string().optional(),
      tags: z.array(z.string()).optional()
    }).optional()
  }),
  onFalse: z.object({
    actionIds: z.array(z.string()),
    continueWorkflow: z.boolean(),
    setVariables: z.record(z.any()).optional()
  }).optional(),
  onError: z.object({
    actionIds: z.array(z.string()),
    continueWorkflow: z.boolean(),
    setVariables: z.record(z.any()).optional()
  }).optional(),
  options: z.object({
    evaluationMode: z.enum(['all', 'any', 'sequential']),
    stopOnFirstFailure: z.boolean(),
    timeout: z.number().min(1000).max(60000),
    cacheResults: z.boolean(),
    logLevel: z.enum(['none', 'basic', 'detailed'])
  })
})

// Initialize engines
const conditionalEngine = new AdvancedConditionalEngine()
const filterEngine = new FilterEngine()
const conditionalIntegration = new ConditionalIntegration()

// POST /api/workflows/conditionals/test
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conditions, context, options } = testConditionSchema.parse(body)

    // Convert context string dates to Date objects
    const executionContext = {
      ...context,
      executionStartTime: new Date(context.executionStartTime)
    }

    // Test all conditions
    const results = []
    for (const condition of conditions) {
      const result = await conditionalEngine.evaluateCondition(
        condition,
        executionContext,
        options || {}
      )
      results.push(result)
    }

    // Calculate overall statistics
    const stats = {
      totalConditions: results.length,
      passedConditions: results.filter(r => r.success && r.result).length,
      failedConditions: results.filter(r => !r.success || !r.result).length,
      averageExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0) / results.length,
      totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0)
    }

    return NextResponse.json({
      success: true,
      results,
      stats,
      message: `Evaluated ${results.length} conditions`
    })

  } catch (error) {
    console.error('Error testing conditions:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
