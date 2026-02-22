'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Bot } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [status, setStatus] = useState('checking')
  const [debugInfo, setDebugInfo] = useState('')
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    // Set a timeout to show debug info if taking too long
    const debugTimeout = setTimeout(() => {
      setShowDebug(true)
    }, 3000)

    const checkAuthAndRedirect = async () => {
      try {
        console.log('[HOME] Starting auth check...')
        const supabase = createClient()

        // Get current session directly from Supabase
        console.log('[HOME] Getting session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        console.log('[HOME] Session result:', { hasSession: !!session, error: sessionError })
        setDebugInfo(`Session: ${!!session}, Error: ${sessionError?.message || 'none'}`)

        if (sessionError) {
          console.error('[HOME] Session error:', sessionError)
          setStatus('redirecting')
          router.push('/login')
          return
        }

        if (!session?.user) {
          console.log('[HOME] No session found, redirecting to login')
          setStatus('redirecting')
          router.push('/login')
          return
        }

        console.log('[HOME] User found:', session.user.email)

        // Check if user has completed onboarding
        console.log('[HOME] Checking profile...')
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarded')
          .eq('id', session.user.id)
          .single()

        console.log('[HOME] Profile result:', { profile, error: profileError })
        setDebugInfo(prev => prev + ` | Profile: ${!!profile}, Onboarded: ${profile?.onboarded}, Error: ${profileError?.message || 'none'}`)

        if (profileError) {
          console.error('[HOME] Profile query error:', profileError)
          // If profile doesn't exist, redirect to onboarding
          setStatus('redirecting')
          router.push('/onboarding')
          return
        }

        if (!profile || !profile.onboarded) {
          console.log('[HOME] User needs onboarding')
          setStatus('redirecting')
          router.push('/onboarding')
          return
        }

        console.log('[HOME] User fully set up, going to dashboard')
        setStatus('redirecting')
        router.push('/dashboard')

      } catch (error: any) {
        console.error('[HOME] Auth check error:', error)
        setDebugInfo(`Error: ${error?.message || String(error)}`)
        setStatus('redirecting')
        router.push('/login')
      }
    }

    checkAuthAndRedirect().finally(() => {
      clearTimeout(debugTimeout)
    })

    return () => {
      clearTimeout(debugTimeout)
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
          <Bot className="h-8 w-8 text-white" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">CogniFlow</h1>
          <p className="text-muted-foreground">
            {status === 'checking' ? 'Checking your authentication...' : 'Redirecting...'}
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Please wait...
          </span>
        </div>

        {/* Debug info */}
        {showDebug && debugInfo && (
          <div className="mt-4 p-3 bg-muted rounded text-xs font-mono text-left max-w-md overflow-auto">
            <p className="font-bold mb-1">Debug Info:</p>
            <p className="text-muted-foreground">{debugInfo}</p>
          </div>
        )}

        {/* Manual navigation if stuck */}
        <div className="mt-8 space-y-2">
          <p className="text-xs text-muted-foreground">Taking too long?</p>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Go to Login
            </button>
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-xs border border-border rounded hover:bg-accent transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}