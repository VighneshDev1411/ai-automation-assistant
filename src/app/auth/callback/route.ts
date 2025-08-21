// src/app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth callback error:', error)
      // Redirect to login with error
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
    }

    if (data.user) {
      console.log('✅ User authenticated via callback:', data.user.email)
      
      // Check if user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded')
        .eq('id', data.user.id)
        .single()

      // Redirect based on onboarding status
      if (profile?.onboarded) {
        return NextResponse.redirect(`${origin}/dashboard`)
      } else {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  // Fallback redirect
  return NextResponse.redirect(`${origin}/login`)
}

// src/app/auth/callback/page.tsx - Loading page
