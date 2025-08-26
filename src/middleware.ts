// middleware.ts (optional)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow these
  const publicPaths = [
    '/login',
    '/auth/callback',
    '/onboarding',
    '/_next',
    '/favicon.ico',
    '/api/public',
  ]
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Example cookie/session check (adjust to your auth cookie name / logic)
  const hasSession = req.cookies.get('sb:token') || req.cookies.get('supabase-auth-token')

  if (!hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
