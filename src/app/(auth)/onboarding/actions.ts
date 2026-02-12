'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createOrganization(data: {
  name: string
  slug: string
  description?: string | null
  userId: string
}) {
  try {
    // First verify user is authenticated with regular client
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== data.userId) {
      throw new Error('Unauthorized: User not authenticated')
    }

    console.log('User authenticated:', user.id)

    // Use service client to bypass RLS for organization creation
    // This is safe because we've already verified the user is authenticated
    const serviceSupabase = await createServiceClient()

    // Check if user already has an organization with this slug (e.g. clicked Next twice)
    const { data: existingOrg } = await serviceSupabase
      .from('organizations')
      .select('*, organization_members!inner(user_id)')
      .eq('slug', data.slug)
      .eq('organization_members.user_id', data.userId)
      .single()

    if (existingOrg) {
      console.log('Organization already exists, reusing:', existingOrg.id)
      // Mark user as onboarded
      await serviceSupabase
        .from('profiles')
        .update({ onboarded: true })
        .eq('id', data.userId)

      revalidatePath('/dashboard')
      revalidatePath('/onboarding')
      return { success: true, organization: existingOrg }
    }

    // Create organization
    const { data: org, error: orgError } = await serviceSupabase
      .from('organizations')
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description,
      })
      .select()
      .single()

    if (orgError) {
      console.error('Organization creation error:', orgError)
      throw orgError
    }

    console.log('Organization created:', org.id)

    // Add user as owner
    const { error: memberError } = await serviceSupabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: data.userId,
        role: 'owner',
        joined_at: new Date().toISOString(),
      })

    if (memberError) {
      console.error('Member creation error:', memberError)
      // Try to clean up the organization if member creation fails
      await serviceSupabase.from('organizations').delete().eq('id', org.id)
      throw memberError
    }

    console.log('User added as owner')

    revalidatePath('/dashboard')
    revalidatePath('/onboarding')

    return { success: true, organization: org }
  } catch (error: any) {
    console.error('Server action error:', error)
    return {
      success: false,
      error: {
        message: error.message || 'Failed to create organization',
        code: error.code,
        details: error.details,
      },
    }
  }
}
