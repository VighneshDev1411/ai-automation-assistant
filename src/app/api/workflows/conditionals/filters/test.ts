import z from "zod"
import { NextRequest, NextResponse } from "next/server"
// Import filterEngine from its module
import { FilterEngine } from "@/lib/workflow-engine/advanced/FilterEngine"

// Define or import filterSchema
const filterSchema = z.object({
  filters: z.array(z.any()),
  context: z.object({
    executionStartTime: z.string(),
    // Add other context fields as needed
  }),
  options: z.optional(z.any())
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filters, context, options } = filterSchema.parse(body)

    // Convert context
    const executionContext = {
      ...context,
      executionStartTime: new Date(context.executionStartTime)
    }

    // Create filter group
    const filterGroup = {
      id: 'test_filter_group',
      name: 'Test Filter Group',
      operator: 'and' as const,
      filters,
      enabled: true
    }

    // Test filters
    const result = await FilterEngine.evaluateFilterGroup(
      filterGroup,
      executionContext,
      options || {}
    )

    return NextResponse.json({
      success: true,
      result,
      message: `Evaluated ${filters.length} filters`
    })

  } catch (error) {
    console.error('Error testing filters:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
