'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../supabase/client'
import type { User, Session } from '@supabase/supabase-js'

// Simplified types to avoid complex database dependencies
interface SimpleProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  job_title: string | null
  phone: string | null
  timezone: string
  onboarded: boolean
  created_at: string
  updated_at: string
}

interface SimpleOrganization {
  id: string
  name: string
  slug: string
  description: string | null
  role: string // Added role directly to avoid complex joins
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: SimpleProfile | null
  organizations: SimpleOrganization[]
  currentOrganization: SimpleOrganization | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>
  refreshProfile: () => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<SimpleProfile | null>(null)
  const [organizations, setOrganizations] = useState<SimpleOrganization[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<SimpleOrganization | null>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  const fetchProfile = async (userId: string): Promise<SimpleProfile | null> => {
    try {
      console.log('Fetching profile for user:', userId)
      
      // Direct query without RLS complications
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, job_title, phone, timezone, onboarded, created_at, updated_at')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Profile fetch error:', error.message, error.code)

        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          console.log('Creating new profile...')
          
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          
          if (currentUser) {
            const newProfile = {
              id: currentUser.id,
              email: currentUser.email || '',
              full_name: currentUser.user_metadata?.full_name || 
                        currentUser.user_metadata?.name || '',
              avatar_url: currentUser.user_metadata?.avatar_url || 
                         currentUser.user_metadata?.picture || null,
              job_title: null,
              phone: null,
              timezone: 'UTC',
              onboarded: false
            }

            const { data: createdProfile, error: createError } = await supabase
              .from('profiles')
              .insert(newProfile)
              .select()
              .single()

            if (createError) {
              console.error('Failed to create profile:', createError.message)
              return null
            }

            console.log('Profile created successfully')
            return createdProfile as SimpleProfile
          }
        }
        
        return null
      }

      console.log('Profile fetched successfully')
      return data as SimpleProfile
    } catch (error) {
      console.error('Profile fetch exception:', error)
      return null
    }
  }

  const fetchOrganizations = async (userId: string): Promise<SimpleOrganization[]> => {
    try {
      console.log('Fetching organizations for user:', userId)

      // Simplified query to avoid RLS recursion
      const { data, error } = await supabase
        .from('organization_members')
        .select('role, organization_id')
        .eq('user_id', userId)
        .not('joined_at', 'is', null)

      if (error) {
        console.error('Organization members fetch error:', error.message, error.code)
        return []
      }

      if (!data || data.length === 0) {
        console.log('No organization memberships found')
        return []
      }

      // Fetch organization details separately
      const orgIds = data.map(item => item.organization_id)
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug, description')
        .in('id', orgIds)

      if (orgsError) {
        console.error('Organizations fetch error:', orgsError.message, orgsError.code)
        return []
      }

      // Combine organization data with roles
      const result = (orgsData || []).map(org => {
        const membership = data.find(item => item.organization_id === org.id)
        return {
          ...org,
          role: membership?.role || 'member'
        } as SimpleOrganization
      })

      console.log('Organizations fetched successfully:', result.length)
      return result
    } catch (error) {
      console.error('Organizations fetch exception:', error)
      return []
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session fetch error:', sessionError.message)
          if (mounted) setLoading(false)
          return
        }

        if (initialSession?.user && mounted) {
          console.log('User found in session:', initialSession.user.email)
          setSession(initialSession)
          setUser(initialSession.user)

          // Fetch profile first
          const profileData = await fetchProfile(initialSession.user.id)
          if (!mounted) return
          setProfile(profileData)

          // Only fetch organizations if profile exists
          let orgsData: SimpleOrganization[] = []
          if (profileData) {
            orgsData = await fetchOrganizations(initialSession.user.id)
            if (!mounted) return
            setOrganizations(orgsData)

            if (orgsData.length > 0) {
              const savedOrgId = typeof window !== 'undefined' ? 
                localStorage.getItem('currentOrganizationId') : null
              const currentOrg = orgsData.find(org => org.id === savedOrgId) || orgsData[0]
              setCurrentOrganization(currentOrg)
            }
          }

          console.log('Auth initialization complete')
        } else {
          console.log('No user session found')
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('Auth state change:', event)

      if (event === 'SIGNED_IN' && session?.user) {
        setSession(session)
        setUser(session.user)

        const profileData = await fetchProfile(session.user.id)
        if (!mounted) return
        setProfile(profileData)

        let orgsData: SimpleOrganization[] = []
        if (profileData) {
          orgsData = await fetchOrganizations(session.user.id)
          if (!mounted) return
          setOrganizations(orgsData)

          if (orgsData.length > 0) {
            setCurrentOrganization(orgsData[0])
          }
        }

        // Simple redirect logic
        const path = typeof window !== 'undefined' ? window.location.pathname : ''
        
        if (!path.includes('/auth/callback') && !path.includes('/auth/confirm')) {
          if (profileData?.onboarded && orgsData.length > 0) {
            if (path === '/login' || path === '/register') {
              router.replace('/dashboard')
            }
          } else if (path !== '/onboarding') {
            router.replace('/onboarding')
          }
        }

      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        setProfile(null)
        setOrganizations([])
        setCurrentOrganization(null)
        
        if (typeof window !== 'undefined') {
          localStorage.removeItem('currentOrganizationId')
        }

        const path = typeof window !== 'undefined' ? window.location.pathname : ''
        if (path !== '/login' && path !== '/register' && path !== '/') {
          router.replace('/login')
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) throw error
      
      return {
        needsConfirmation: !data.session
      }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  const signInWithProvider = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Provider sign in error:', error)
      throw error
    }
  }

  const refreshProfile = async () => {
    if (!user) return
    
    const [profileData, orgsData] = await Promise.all([
      fetchProfile(user.id),
      fetchOrganizations(user.id)
    ])
    
    setProfile(profileData)
    setOrganizations(orgsData)
    
    if (orgsData.length > 0 && !currentOrganization) {
      setCurrentOrganization(orgsData[0])
    }
  }

  const switchOrganization = async (organizationId: string) => {
    const org = organizations.find(o => o.id === organizationId)
    if (org) {
      setCurrentOrganization(org)
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentOrganizationId', organizationId)
      }
    }
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    organizations,
    currentOrganization,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    refreshProfile,
    switchOrganization,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useUser() {
  const { user, loading } = useAuth()
  return { user, loading }
}

export function useProfile() {
  const { profile, loading } = useAuth()
  return { profile, loading }
}

export function useOrganization() {
  const { currentOrganization, organizations, switchOrganization, loading } = useAuth()
  return { currentOrganization, organizations, switchOrganization, loading }
}