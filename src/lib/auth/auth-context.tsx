'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '../supabase/client'
import type { User, Session } from '@supabase/supabase-js'

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
  role: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: SimpleProfile | null
  organizations: SimpleOrganization[]
  currentOrganization: SimpleOrganization | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    metadata?: any
  ) => Promise<{ needsConfirmation: boolean }>
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
  const [currentOrganization, setCurrentOrganization] =
    useState<SimpleOrganization | null>(null)
  const [loading, setLoading] = useState(true)

  const mountedRef = useRef(true)
  const supabase = createClient()

  const fetchProfile = async (
    userId: string,
    retries = 2
  ): Promise<SimpleProfile | null> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            'id, email, full_name, avatar_url, job_title, phone, timezone, onboarded, created_at, updated_at'
          )
          .eq('id', userId)
          .single()

        if (error) {
          // If profile doesn't exist, create it
          if (error.code === 'PGRST116') {
            const {
              data: { user: currentUser },
            } = await supabase.auth.getUser()

            if (currentUser) {
              const newProfile = {
                id: currentUser.id,
                email: currentUser.email || '',
                full_name:
                  currentUser.user_metadata?.full_name ||
                  currentUser.user_metadata?.name ||
                  currentUser.user_metadata?.display_name ||
                  '',
                avatar_url:
                  currentUser.user_metadata?.avatar_url ||
                  currentUser.user_metadata?.picture ||
                  null,
                job_title: null,
                phone: null,
                timezone: 'UTC',
                onboarded: false,
              }

              const { data: createdProfile, error: createError } =
                await supabase
                  .from('profiles')
                  .insert(newProfile)
                  .select()
                  .single()

              if (createError) {
                if (attempt < retries) {
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  continue
                }
                return null
              }

              return createdProfile as SimpleProfile
            }
          }

          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }

          return null
        }

        return data as SimpleProfile
      } catch (error) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          continue
        }
        return null
      }
    }

    return null
  }

  const fetchOrganizations = async (
    userId: string,
    retries = 2
  ): Promise<SimpleOrganization[]> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data: memberships, error: membershipError } = await supabase
          .from('organization_members')
          .select('role, organization_id, joined_at')
          .eq('user_id', userId)

        if (membershipError) {
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          return []
        }

        if (!memberships || memberships.length === 0) {
          return []
        }

        const joinedMemberships = memberships.filter(
          (m: any) => m.joined_at !== null
        )

        if (joinedMemberships.length === 0) {
          return []
        }

        const orgIds = joinedMemberships.map(item => item.organization_id)
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name, slug, description')
          .in('id', orgIds)

        if (orgsError) {
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          return []
        }

        const result = (orgsData || []).map(org => {
          const membership = joinedMemberships.find(
            item => item.organization_id === org.id
          )
          return {
            ...org,
            role: membership?.role || 'member',
          } as SimpleOrganization
        })

        return result
      } catch (error) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          continue
        }
        return []
      }
    }

    return []
  }

  const loadUserData = async (currentUser: User) => {
    if (!mountedRef.current) return

    try {
      const profileData = await fetchProfile(currentUser.id)

      if (!mountedRef.current) return
      setProfile(profileData)

      let orgsData: SimpleOrganization[] = []
      if (profileData) {
        orgsData = await fetchOrganizations(currentUser.id)

        if (!mountedRef.current) return
        setOrganizations(orgsData)

        if (orgsData.length > 0) {
          const savedOrgId =
            typeof window !== 'undefined'
              ? localStorage.getItem('currentOrganizationId')
              : null
          const currentOrg =
            orgsData.find(org => org.id === savedOrgId) || orgsData[0]
          setCurrentOrganization(currentOrg)

          if (typeof window !== 'undefined') {
            localStorage.setItem('currentOrganizationId', currentOrg.id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  useEffect(() => {
    mountedRef.current = true

    const initAuth = async () => {
      try {
        // Set a timeout to prevent hanging forever
        const timeoutId = setTimeout(() => {
          console.warn('[AUTH] Initialization timeout, forcing loading=false')
          if (mountedRef.current) {
            setLoading(false)
          }
        }, 8000) // 8 second timeout

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mountedRef.current) {
          clearTimeout(timeoutId)
          return
        }

        if (session?.user) {
          setUser(session.user)
          setSession(session)
          await loadUserData(session.user)
        }

        clearTimeout(timeoutId)
      } catch (error) {
        console.error('Auth init error:', error)
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        setSession(session)
        await loadUserData(session.user)
        if (mountedRef.current) setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        setProfile(null)
        setOrganizations([])
        setCurrentOrganization(null)
        if (mountedRef.current) setLoading(false)

        if (typeof window !== 'undefined') {
          localStorage.removeItem('currentOrganizationId')
        }
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session)
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    // onAuthStateChange will handle setting user/session/profile
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
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
      needsConfirmation: !data.session,
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const signInWithProvider = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
  }

  const refreshProfile = async () => {
    if (!user || !mountedRef.current) return
    setLoading(true)
    try {
      await loadUserData(user)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
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
  const { currentOrganization, organizations, switchOrganization, loading } =
    useAuth()
  return { currentOrganization, organizations, switchOrganization, loading }
}
