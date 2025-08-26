import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error_param = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  console.log('🔄 Auth callback received - Code:', !!code, 'Error:', error_param)

  // Handle OAuth errors
  if (error_param) {
    console.error('❌ OAuth error:', error_param, error_description)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error_description || error_param)}`
    )
  }

  if (!code) {
    console.error('❌ No authorization code provided')
    return NextResponse.redirect(`${origin}/login?error=No authorization code provided`)
  }

  try {
    const supabase = await createClient()
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('❌ Code exchange error:', error)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      )
    }

    if (!data.user) {
      console.error('❌ No user data received from exchange')
      return NextResponse.redirect(`${origin}/login?error=Authentication failed`)
    }

    console.log('✅ User authenticated via callback:', data.user.email)

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    // Create profile if it doesn't exist
    if (profileError?.code === 'PGRST116') {
      console.log('📝 Creating new profile for user:', data.user.email)
      
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || 
                     data.user.user_metadata?.name || 
                     data.user.user_metadata?.display_name || '',
          avatar_url: data.user.user_metadata?.avatar_url || 
                      data.user.user_metadata?.picture || '',
          onboarded: false
        })

      if (createError) {
        console.error('❌ Profile creation failed:', createError)
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent('Failed to create user profile')}`
        )
      }

      console.log('✅ Profile created, redirecting to onboarding')
      return NextResponse.redirect(`${origin}/onboarding`)
    }

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Profile fetch error:', profileError)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Failed to load user profile')}`
      )
    }

    // Check onboarding status and redirect accordingly
    if (profile?.onboarded) {
      console.log('🏠 User already onboarded, redirecting to dashboard')
      return NextResponse.redirect(`${origin}/dashboard`)
    } else {
      console.log('🎯 User needs onboarding')
      return NextResponse.redirect(`${origin}/onboarding`)
    }

  } catch (error) {
    console.error('💥 Callback processing error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorMessage)}`
    )
  }
}