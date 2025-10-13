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

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    // Increment template usage count
    const { data, error } = await supabase.rpc('increment_template_usage', {
      template_id: templateId
    })

    if (error) {
      // If function doesn't exist, just log it for now
      console.log('Template usage tracking not configured in database')
      return NextResponse.json({ success: true, tracked: false })
    }

    // Track user's template usage
    await supabase
      .from('template_usage')
      .insert({
        template_id: templateId,
        user_id: user.id,
        used_at: new Date().toISOString()
      })

    return NextResponse.json({ success: true, tracked: true })

  } catch (error: any) {
    console.error('Error tracking template usage:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to track usage' },
      { status: 500 }
    )
  }
}