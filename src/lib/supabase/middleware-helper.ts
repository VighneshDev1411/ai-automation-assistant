import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/register',
    '/signup',
    '/forgot-password',
    '/verify-email',
    '/auth/callback',
    '/',
    '/api/cron/execute-schedules', // Allow cron endpoint without auth
  ]

  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname === route ||
    request.nextUrl.pathname.startsWith('/auth/') ||
    request.nextUrl.pathname.startsWith('/api/cron/')
  )

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Skip auth check for public routes
  let user = null
  let error = null

  if (!isPublicRoute) {
    // Only check auth for protected routes
    const result = await supabase.auth.getUser()
    user = result.data.user
    error = result.error

    // Handle authentication errors on protected routes
    if (error) {
      console.error('Auth error in middleware:', error)

      // Clear invalid session and redirect to login
      const clearResponse = NextResponse.redirect(new URL('/login', request.url))
      clearResponse.cookies.delete('sb-access-token')
      clearResponse.cookies.delete('sb-refresh-token')
      return clearResponse
    }
  }

  // Protect dashboard routes
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                          request.nextUrl.pathname.startsWith('/workflows') ||
                          request.nextUrl.pathname.startsWith('/ai-agents') ||
                          request.nextUrl.pathname.startsWith('/integrations') ||
                          request.nextUrl.pathname.startsWith('/analytics')

  if (isDashboardRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  const isAuthRoute = request.nextUrl.pathname === '/login' ||
                     request.nextUrl.pathname === '/signup' ||
                     request.nextUrl.pathname === '/auth/callback'

  if (isAuthRoute && user && request.nextUrl.pathname !== '/auth/callback') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}