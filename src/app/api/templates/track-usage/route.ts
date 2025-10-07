import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId } = await request.json()

    // Here you would track template usage in your database
    // For now, we'll just return success
    
    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to track usage' },
      { status: 500 }
    )
  }
}