'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Bot } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [status, setStatus] = useState('checking')
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const supabase = createClient()
        
        // Get current session directly from Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        setDebugInfo(`Session: ${!!session}, Error: ${!!sessionError}`)
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setStatus('redirecting')
          router.push('/login')
          return
        }

        if (!session?.user) {
          console.log('No session found, redirecting to login')
          setStatus('redirecting')
          router.push('/login')
          return
        }

        console.log('User found:', session.user.email)
        
        // Check if user has profile and organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarded, organization_id')
          .eq('id', session.user.id)
          .single()

        setDebugInfo(prev => prev + ` | Profile: ${!!profile}, Onboarded: ${profile?.onboarded}`)

        if (!profile || !profile.onboarded) {
          console.log('User needs onboarding')
          setStatus('redirecting')
          router.push('/onboarding')
          return
        }

        console.log('User fully set up, going to dashboard')
        setStatus('redirecting')
        router.push('/dashboard')
        
      } catch (error) {
        console.error('Auth check error:', error)
        setDebugInfo(`Error: ${error}`)
        setStatus('redirecting')
        router.push('/login')
      }
    }

    checkAuthAndRedirect()
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