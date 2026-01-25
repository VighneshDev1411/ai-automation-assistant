// src/lib/supabase/worker-client.ts
/**
 * Supabase client for worker processes
 * Does not use Next.js cookies - uses service role key directly
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create Supabase client for worker processes
 * Uses service role key to bypass RLS
 */
export function createWorkerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for worker client')
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
