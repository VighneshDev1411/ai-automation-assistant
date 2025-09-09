import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/ai-agents/[id]/toggle - Toggle agent active status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Fix: Await the params since they're now a Promise in Next.js 15
    const { id } = await params
    
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Get current agent status
    const { data: currentAgent, error: fetchError } = await supabase
      .from('ai_agents')
      .select('is_active, name')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 })
    }

    // Toggle status
    const newStatus = !currentAgent.is_active
    
    const { data: updatedAgent, error } = await supabase
      .from('ai_agents')
      .update({ 
        is_active: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update agent status' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedAgent,
      message: `Agent "${currentAgent.name}" ${newStatus ? 'activated' : 'deactivated'} successfully`
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}