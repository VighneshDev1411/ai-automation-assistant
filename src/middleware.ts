import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware-helper'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match only necessary paths:
     * - Auth pages (login, register, signup)
     * - Protected routes (dashboard, workflows, ai-agents, integrations, analytics)
     * - Onboarding
     * Exclude: API routes, static files, images
     */
    '/login',
    '/register',
    '/signup',
    '/onboarding',
    '/dashboard/:path*',
    '/workflows/:path*',
    '/ai-agents/:path*',
    '/integrations/:path*',
    '/analytics/:path*',
  ],
}