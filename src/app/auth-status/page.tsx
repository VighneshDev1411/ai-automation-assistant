// src/app/auth-check-simple/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SimpleAuthCheckPage() {
  const [status, setStatus] = useState<any>({
    loading: true,
    error: null,
    user: null,
    session: null,
    envVars: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      setStatus((prev:any) => ({ ...prev, loading: true }))
      
      // Check if we can create a client
      const supabase = createClient()
      
      // Try to get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setStatus({
          loading: false,
          error: `Session Error: ${sessionError.message}`,
          user: null,
          session: null,
          envVars: status.envVars
        })
        return
      }

      // Try to get user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError && userError.message !== 'Auth session missing!') {
        setStatus({
          loading: false,
          error: `User Error: ${userError.message}`,
          user: null,
          session: session,
          envVars: status.envVars
        })
        return
      }

      setStatus({
        loading: false,
        error: null,
        user: user,
        session: session,
        envVars: status.envVars
      })

    } catch (error: any) {
      setStatus({
        loading: false,
        error: `Catch Error: ${error.message}`,
        user: null,
        session: null,
        envVars: status.envVars
      })
    }
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (status.loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Simple Auth Check</h1>
        <p>Loading... (If this doesn't complete in 5 seconds, there's an issue)</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Simple Auth Check</h1>
      
      <div className="space-y-4">
        {/* Environment Variables */}
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Environment Variables</h2>
          <p>SUPABASE_URL: {status.envVars.url ? '✅ Set' : '❌ Missing'}</p>
          <p>SUPABASE_ANON_KEY: {status.envVars.anonKey ? '✅ Set' : '❌ Missing'}</p>
        </div>

        {/* Error */}
        {status.error && (
          <div className="p-4 border border-red-500 rounded bg-red-50">
            <h2 className="font-semibold mb-2 text-red-700">Error</h2>
            <p className="text-red-600">{status.error}</p>
          </div>
        )}

        {/* User Status */}
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">User Status</h2>
          {status.user ? (
            <div>
              <p className="text-green-600">✅ Logged In</p>
              <p className="text-sm mt-2">Email: {status.user.email}</p>
              <p className="text-sm">ID: {status.user.id}</p>
            </div>
          ) : (
            <p className="text-red-600">❌ Not Logged In</p>
          )}
        </div>

        {/* Session Status */}
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Session Status</h2>
          {status.session ? (
            <div>
              <p className="text-green-600">✅ Active Session</p>
              <p className="text-sm mt-2">Provider: {status.session.user?.app_metadata?.provider || 'email'}</p>
            </div>
          ) : (
            <p className="text-yellow-600">⚠️ No Active Session</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={checkAuth}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
          
          {status.user ? (
            <button
              onClick={signOut}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          ) : (
            <a
              href="/login"
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 inline-block"
            >
              Go to Login
            </a>
          )}
        </div>

        {/* Debug Info */}
        <details className="p-4 border rounded">
          <summary className="cursor-pointer font-semibold">Debug Info</summary>
          <pre className="mt-2 text-xs overflow-auto">
            {JSON.stringify({
              ...status,
              supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40) + '...',
            }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}