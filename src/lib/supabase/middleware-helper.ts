import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const pathname = request.nextUrl.pathname

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Always refresh the session (keeps cookies alive)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  // Protected dashboard routes
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/workflows') ||
    pathname.startsWith('/ai-agents') ||
    pathname.startsWith('/integrations') ||
    pathname.startsWith('/analytics')

  // Auth pages where logged-in users should be redirected away
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/signup'

  // If user has an auth error or no user on protected routes, redirect to login
  if (isProtectedRoute && (error || !user)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && user && !error) {
    // Check onboarding status to redirect to the right place
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', user.id)
      .single()

    if (profile?.onboarded) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // Onboarding page: must be authenticated
  if (pathname === '/onboarding' && (error || !user)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
