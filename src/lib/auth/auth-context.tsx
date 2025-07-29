'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { supabase } from '../supabase/supabase-test'

type Profile = Database['public']['Tables']['profiles']['Row']
type Organization = Database['public']['Tables']['organizations']['Row']
type UserRole = Database['public']['Enums']['user_role']

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

interface OrganizationWithRole extends Organization {
  role: UserRole
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([])
  const [currentOrganization, setCurrentOrganization] =
    useState<OrganizationWithRole | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile: ', error)
      return null
    }

    return data
  }

  const fetchOrganizations = async (userId: string) => {
    const { data, error } = await supabase
      .from('organization_members')
      .select(
        `
          role,
          organizations (*)
        `
      )
      .eq('user_id', userId)
      .not('joined_at', 'is', null)

    if (error) {
      console.error('Error fetching organizations:', error)
      return []
    }

    // Fetching only the organizations
    return data.map((item: any) => ({
      ...item.organizations,
      role: item.role,
    })) as OrganizationWithRole[]
  }

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setSession(session)
          setUser(session.user)

          const [orgsData, profileData] = await Promise.all([
            fetchOrganizations(session.user.id),
            fetchProfile(session.user.id),
          ])

          setProfile(profileData)
          setOrganizations(orgsData)

          const savedOrgId = localStorage.getItem('currentOrganizationId')
          const currentOrg =
            orgsData.find(org => org.id === savedOrgId) || orgsData[0]
          setCurrentOrganization(currentOrg)
        }
      } catch (error) {
        console.error('Error initializing auth', error)
      } finally {
        setLoading(false)
      }
    }
    initializeAuth()

    // Listen for auth changes

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setSession(session)
        setUser(session.user)

        const [profileData, orgsData] = await Promise.all([
          fetchProfile(session.user.id),
          fetchOrganizations(session.user.id),
        ])

        setProfile(profileData)
        setOrganizations(orgsData)

        const currentOrg = orgsData[0]
        setCurrentOrganization(currentOrg)

        // Only redirect if we're not already on the callback route
        if (!window.location.pathname.includes('/auth/callback')) {
          if (profileData?.onboarded) {
            router.push('/dashboard')
          } else {
            router.push('/onboarding')
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        setProfile(null)
        setOrganizations([])
        setCurrentOrganization(null)
        router.push('/login')
      }
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

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
  }

  const signOut = async () => {
    //     const response = await supabase.auth.signOut()
    //     const error = response.error
    // Equivalent to above
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const signInWithProvider = async (
    provider: 'google' | 'github' | 'azure'
  ) => {
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

    const profileData = await fetchProfile(user.id)
    setProfile(profileData)
  }

  const switchOrganization = async (organizationId: string) => {
    const org = organizations.find(o => o.id === organizationId)
    if (org) {
      setCurrentOrganization(org)
      localStorage.setItem('currentOrganizationId', organizationId)
      router.refresh()
    }
  }

  const value = {
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

// Custom hooks for specific auth states
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

export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  return { user, loading }
}
