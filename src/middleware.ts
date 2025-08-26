import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Public routes that don't require authentication
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/auth/callback',
    '/auth/confirm',
    '/forgot-password',
    '/reset-password',
    '/_next',
    '/favicon.ico',
    '/api/public'
  ]

  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path)
  )

  // Allow public paths
  if (isPublicPath) {
    return res
  }

  // Redirect to login if not authenticated
  if (!session) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Check if user needs onboarding
  if (session && pathname !== '/onboarding') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', session.user.id)
      .single()

    if (profile && !profile.onboarded) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}