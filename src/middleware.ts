import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware-helper'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // TEMPORARILY DISABLED - Testing if middleware is causing 504 errors
    // Will re-enable once Supabase connection issues are resolved
  ],
}