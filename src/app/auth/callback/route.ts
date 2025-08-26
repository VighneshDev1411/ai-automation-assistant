// src/app/auth/callback/route.ts - EMERGENCY FIX
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  console.log('🔄 Auth callback received, code:', !!code)

  if (code) {
    const supabase = await createClient()
    
    try {
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ Exchange code error:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
      }

      console.log('✅ User authenticated via callback:', data.user?.email)

      // Check if profile exists, if not create it
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('📝 Creating profile for new user...')
        
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
            avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || '',
            onboarded: false
          })

        if (createError) {
          console.error('❌ Profile creation error:', createError)
        } else {
          console.log('✅ Profile created successfully')
        }

        // Redirect to onboarding for new users
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      // Check if user is onboarded
      if (profile && profile.onboarded) {
        console.log('🏠 User onboarded, redirecting to dashboard')
        return NextResponse.redirect(`${origin}/dashboard`)
      } else {
        console.log('🎯 User needs onboarding')
        return NextResponse.redirect(`${origin}/onboarding`)
      }

    } catch (error) {
      console.error('💥 Callback processing error:', error)
      return NextResponse.redirect(`${origin}/login?error=callback_processing_error`)
    }
  }

  console.log('❌ No code provided in callback')
  return NextResponse.redirect(`${origin}/login?error=no_auth_code`)
}