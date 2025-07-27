'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestSupabasePage() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from('users').select('count').limit(1)
        
        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "table not found" which is expected at this point
          throw error
        }
        
        setConnected(true)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    testConnection()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Testing Supabase connection...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Supabase Connection Test
        </h1>
        
        {connected ? (
          <div className="text-center">
            <div className="text-6xl text-green-500 mb-4">✅</div>
            <h2 className="text-xl font-semibold text-green-700 mb-2">
              Connected Successfully!
            </h2>
            <p className="text-gray-600">
              Supabase is properly configured and ready to use.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl text-red-500 mb-4">❌</div>
            <h2 className="text-xl font-semibold text-red-700 mb-2">
              Connection Failed
            </h2>
            <p className="text-gray-600 mb-4">
              {error || 'Unable to connect to Supabase'}
            </p>
            <details className="text-left bg-gray-50 p-4 rounded text-sm">
              <summary className="cursor-pointer font-medium">
                Debug Information
              </summary>
              <div className="mt-2">
                <p><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
                <p><strong>Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Present' : '❌ Missing'}</p>
                <p><strong>Error:</strong> {error}</p>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}