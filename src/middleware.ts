// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

// Define protected and public routes
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

  // First, update the session
  let response = await updateSession(request)

  // Create a Supabase client to check auth status
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // We're not setting cookies in middleware check
        },
        remove(name: string, options: any) {
          // We're not removing cookies in middleware check
        },
      },
    }
  )

  // Get the user session
  const { data: { user } } = await supabase.auth.getUser()

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Add auth status to response headers for debugging
  if (user) {
    response.headers.set('x-auth-status', 'authenticated')
  }

  // Redirect logic
  if (isProtectedRoute && !user) {
    // Redirect to login if trying to access protected route without auth
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && user) {
    // Redirect to dashboard if trying to access auth routes while authenticated
    // First check if user is onboarded
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', user.id)
      .single()

    if (profile?.onboarded) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      // If not onboarded, allow access to onboarding
      if (pathname !== '/onboarding') {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (except auth-related ones)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}