import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async getAll() {
            return (await cookieStore).getAll()
          },
          async setAll(cookiesToSet) {
            try {
              for (const { name, value, options } of cookiesToSet) {
                (await cookieStore).set(name, value, options)
              }
            } catch {
              // setAll called from Server Component — safe to ignore
              // since middleware will refresh the session
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // If a specific redirect was requested, use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Check onboarding status to decide where to redirect
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarded')
          .eq('id', user.id)
          .single()

        if (profile?.onboarded) {
          return NextResponse.redirect(`${origin}/dashboard`)
        }
      }

      // New or non-onboarded user goes to onboarding
      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }

  // Auth failed — redirect to login with error
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`
  )
}
