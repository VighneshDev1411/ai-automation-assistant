// src/lib/auth/auth-context.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Organization = Database['public']['Tables']['organizations']['Row']
type UserRole = Database['public']['Enums']['user_role']

interface OrganizationWithRole extends Organization {
  role: UserRole
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  organizations: OrganizationWithRole[]
  currentOrganization: OrganizationWithRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: any) => Promise<void>
  signOut: () => Promise<void>
  signInWithProvider: (provider: 'google' | 'github' | 'azure') => Promise<void>
  refreshProfile: () => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationWithRole | null>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // PGRST116: No rows found
        if ((error as any).code === 'PGRST116') {
          const { data: userData } = await supabase.auth.getUser()
          const currentUser = userData.user
          if (currentUser) {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: currentUser.email!,
                full_name: currentUser.user_metadata?.full_name || '',
                avatar_url: currentUser.user_metadata?.avatar_url || '',
                onboarded: false
              })
              .select()
              .single()
            if (createError) return null
            return newProfile
          }
        }
        return null
      }
      return data
    } catch {
      return null
    }
  }

  const fetchOrganizations = async (userId: string): Promise<OrganizationWithRole[]> => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          joined_at,
          organizations (*)
        `)
        .eq('user_id', userId)
        .not('joined_at', 'is', null)

      if (error || !data || data.length === 0) return []

      const orgsWithRole = data.map((item: any) => ({
        ...item.organizations,
        role: item.role,
        joined_at: item.joined_at
      })) as OrganizationWithRole[]

      return orgsWithRole
    } catch {
      return []
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        if (session?.user) {
          setSession(session)
          setUser(session.user)

          // ✅ Keep loading=true until we attempt to fetch profile/orgs
          const profileData = await fetchProfile(session.user.id)
          if (!mounted) return
          setProfile(profileData)

          if (profileData) {
            const orgsData = await fetchOrganizations(session.user.id)
            if (!mounted) return
            setOrganizations(orgsData)

            if (orgsData.length > 0) {
              const savedOrgId = typeof window !== 'undefined' ? localStorage.getItem('currentOrganizationId') : null
              const currentOrg = orgsData.find(org => org.id === savedOrgId) || orgsData[0]
              setCurrentOrganization(currentOrg)
            }
          }
        }
      } catch (e) {
        // noop
      } finally {
        if (mounted) setLoading(false) // ✅ only after initialization attempts
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' && session?.user) {
        setSession(session)
        setUser(session.user)

        const profileData = await fetchProfile(session.user.id)
        if (!mounted) return
        setProfile(profileData)

        let orgsData: OrganizationWithRole[] = []
        if (profileData) {
          orgsData = await fetchOrganizations(session.user.id)
          if (!mounted) return
          setOrganizations(orgsData)

          if (orgsData.length > 0) {
            const currentOrg = orgsData[0]
            setCurrentOrganization(currentOrg)
            if (typeof window !== 'undefined') {
              localStorage.setItem('currentOrganizationId', currentOrg.id)
            }
          }
        }

        // ✅ Guard redirects to avoid fighting the onboarding page
        const path = typeof window !== 'undefined' ? window.location.pathname : ''
        if (!path.includes('/auth/callback') && !path.startsWith('/onboarding')) {
          if (profileData?.onboarded && orgsData.length > 0) {
            router.replace('/dashboard')
          } else {
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
        if (!path.includes('/login')) {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const signInWithProvider = async (provider: 'google' | 'github' | 'azure') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentOrganizationId', orgsData[0].id)
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
      router.refresh()
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
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

// Convenience hooks
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

export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  return { user, loading }
}
