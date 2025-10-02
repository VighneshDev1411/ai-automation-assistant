import { NextRequest, NextResponse } from 'next/server'
import { testSlackIntegration } from '@/lib/demo/slackDemo'

export async function POST(request: NextRequest) {
  try {
    const { message, channel } = await request.json()
    
    const result = await testSlackIntegration()
    
    return NextResponse.json({
      success: true,
      message: 'Slack message sent successfully!',
      data: result
    })
  } catch (error) {
    console.error('Slack demo error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }, { status: 500 })
  }
}