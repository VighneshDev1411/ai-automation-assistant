import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()

  try {
    // Get current session
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      // Not authenticated, go to login
      redirect('/login')
    }

    // Check if user has completed onboarding
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      // No profile or error, go to onboarding
      redirect('/onboarding')
    }

    if (!profile.onboarded) {
      // Not onboarded yet
      redirect('/onboarding')
    }

    // User is authenticated and onboarded
    redirect('/dashboard')
  } catch (error) {
    console.error('Root page error:', error)
    // On any error, redirect to login
    redirect('/login')
  }
}
