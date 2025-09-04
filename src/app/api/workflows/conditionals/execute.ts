import { NextRequest, NextResponse } from "next/server"
import z from "zod"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { config, context } = executeSchema.parse(body)

    // Convert context
    const executionContext = {
      ...context,
      executionStartTime: new Date(context.executionStartTime)
    }

    // Execute conditional action
    const result = await conditionalIntegration.executeConditionalAction(
      config,
      executionContext
    )

    return NextResponse.json({
      success: true,
      result,
      message: 'Conditional action executed successfully'
    })

  } catch (error) {
    console.error('Error executing conditional:', error)
    
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
