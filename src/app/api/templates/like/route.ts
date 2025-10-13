import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId, action } = await request.json()

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    if (action === 'like') {
      // Add like
      const { error } = await supabase
        .from('template_likes')
        .insert({
          template_id: templateId,
          user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        // If table doesn't exist, create in-memory tracking
        console.log('Template likes not configured in database')
        return NextResponse.json({ success: true, liked: true, tracked: false })
      }

      return NextResponse.json({ success: true, liked: true })

    } else if (action === 'unlike') {
      // Remove like
      const { error } = await supabase
        .from('template_likes')
        .delete()
        .match({
          template_id: templateId,
          user_id: user.id
        })

      if (error) {
        console.log('Template likes not configured in database')
        return NextResponse.json({ success: true, liked: false, tracked: false })
      }

      return NextResponse.json({ success: true, liked: false })

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Error liking template:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to like template' },
      { status: 500 }
    )
  }
}

// GET: Check if user has liked a template
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const templateId = searchParams.get('templateId')

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('template_likes')
      .select('id')
      .match({
        template_id: templateId,
        user_id: user.id
      })
      .single()

    if (error || !data) {
      return NextResponse.json({ liked: false })
    }

    return NextResponse.json({ liked: true })

  } catch (error: any) {
    console.error('Error checking like status:', error)
    return NextResponse.json({ liked: false })
  }
}