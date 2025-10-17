import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { email, role, organizationId } = await request.json()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has permission to invite (admin or owner)
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    let invitedUserId: string

    if (existingProfile) {
      // User exists, check if already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', existingProfile.id)
        .maybeSingle()

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 400 }
        )
      }

      invitedUserId = existingProfile.id
    } else {
      // User doesn't exist - send them a signup invitation email
      // Using Supabase's built-in invite functionality
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          organization_id: organizationId,
          invited_role: role,
          invited_by: user.id
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?org=${organizationId}`
      })

      if (inviteError) {
        console.error('Error sending invite:', inviteError)
        return NextResponse.json({ error: inviteError.message }, { status: 500 })
      }

      if (!inviteData?.user?.id) {
        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
      }

      invitedUserId = inviteData.user.id
    }

    // Add to organization_members table
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: invitedUserId,
        role: role,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        joined_at: existingProfile ? new Date().toISOString() : null // Auto-join if user already exists
      })

    if (memberError) {
      console.error('Error adding member:', memberError)
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: existingProfile
        ? 'User added to organization'
        : 'Invitation email sent successfully',
      userExists: !!existingProfile
    })
  } catch (error: any) {
    console.error('Error in invite route:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
