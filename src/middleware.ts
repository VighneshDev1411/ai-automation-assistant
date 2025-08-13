// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

const protectedRoutes = [
  '/dashboard',
  '/workflows',
  '/integrations',
  '/ai-agents',
  '/settings',
  '/profile',
]

const authRoutes = ['/login', '/register', '/forgot-password']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always start with updating the Supabase session (sets/refreshes cookies)
  let response = await updateSession(request)

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  // ✅ First, check if there's a valid session
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user || null

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Debug header
  response.headers.set('x-auth-status', user ? 'authenticated' : 'unauthenticated')

  // 1️⃣ If visiting a protected route without being logged in → send to login
  if (isProtectedRoute && !user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  // 2️⃣ If visiting an auth route (login/register) while logged in → route to dashboard/onboarding
  if (isAuthRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', user.id)
      .single()

    if (profile?.onboarded) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else if (pathname !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // 3️⃣ Default → allow request
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
