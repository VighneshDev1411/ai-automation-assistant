import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import z from "zod"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const config = createConditionalConfigSchema.parse(body)

    // Generate unique ID for the configuration
    const conditionalConfig = {
      id: `conditional_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'conditional' as const,
      createdAt: new Date().toISOString(),
      ...config
    }

    // Validate the configuration
    try {
      // This would validate against your actual validation logic
      // For now, we'll do basic validation
      if (conditionalConfig.conditions.length === 0) {
        throw new Error('At least one condition is required')
      }

      return NextResponse.json({
        success: true,
        config: conditionalConfig,
        message: 'Conditional configuration created successfully'
      })

    } catch (validationError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Configuration validation failed',
          details: validationError instanceof Error ? validationError.message : 'Unknown validation error'
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error creating conditional config:', error)
    
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
