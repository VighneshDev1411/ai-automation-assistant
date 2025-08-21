// src/lib/auth/auth-context.tsx - Updated signUp method
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

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
  signUp: (email: string, password: string, metadata?: any) => Promise<{ needsConfirmation: boolean }>
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

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in fetchProfile:', error)
      return null
    }
  }

  const fetchOrganizations = async (userId: string): Promise<OrganizationWithRole[]> => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organizations (*)
        `)
        .eq('user_id', userId)
        .not('joined_at', 'is', null)

      if (error) {
        console.error('Error fetching organizations:', error)
        return []
      }

      return data.map((item: any) => ({
        ...item.organizations,
        role: item.role,
      })) as OrganizationWithRole[]
    } catch (error) {
      console.error('Error in fetchOrganizations:', error)
      return []
    }
  }

  const createDefaultProfile = async (user: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || '',
          onboarded: false,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in createDefaultProfile:', error)
      return null
    }
  }

  const createDefaultOrganization = async (userId: string, userEmail: string) => {
    try {
      // Create organization
      const orgName = userEmail.split('@')[0] + "'s Organization"
      const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: orgSlug,
          description: 'Default organization'
        })
        .select()
        .single()

      if (orgError) {
        console.error('Error creating organization:', orgError)
        return null
      }

      // Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: userId,
          role: 'owner',
          joined_at: new Date().toISOString()
        })

      if (memberError) {
        console.error('Error adding user to organization:', memberError)
        return null
      }

      return { ...org, role: 'owner' as UserRole }
    } catch (error) {
      console.error('Error in createDefaultOrganization:', error)
      return null
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing auth...')
        
        const {
          data: { session },
          error: sessionError
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          setLoading(false)
          return
        }

        if (session?.user) {
          console.log('✅ Session found, user:', session.user.email)
          setSession(session)
          setUser(session.user)

          // Fetch or create profile
          let profileData = await fetchProfile(session.user.id)
          
          if (!profileData) {
            console.log('🆕 Creating new profile...')
            profileData = await createDefaultProfile(session.user)
          }

          // Fetch organizations
          let orgsData = await fetchOrganizations(session.user.id)
          
          // Create default organization if none exists
          if (orgsData.length === 0) {
            console.log('🏢 Creating default organization...')
            const defaultOrg = await createDefaultOrganization(session.user.id, session.user.email!)
            if (defaultOrg) {
              orgsData = [defaultOrg]
            }
          }

          setProfile(profileData)
          setOrganizations(orgsData)

          // Set current organization
          const savedOrgId = localStorage.getItem('currentOrganizationId')
          const currentOrg = orgsData.find(org => org.id === savedOrgId) || orgsData[0]
          setCurrentOrganization(currentOrg)

          console.log('✅ Auth initialization complete')
        } else {
          console.log('❌ No session found')
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.email)

      if (event === 'SIGNED_IN' && session?.user) {
        setSession(session)
        setUser(session.user)

        // Fetch or create profile
        let profileData = await fetchProfile(session.user.id)
        if (!profileData) {
          profileData = await createDefaultProfile(session.user)
        }

        // Fetch organizations
        let orgsData = await fetchOrganizations(session.user.id)
        
        // Create default organization if none exists
        if (orgsData.length === 0) {
          const defaultOrg = await createDefaultOrganization(session.user.id, session.user.email!)
          if (defaultOrg) {
            orgsData = [defaultOrg]
          }
        }

        setProfile(profileData)
        setOrganizations(orgsData)

        // Set current organization
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
        console.log('👋 User signed out')
        setUser(null)
        setSession(null)
        setProfile(null)
        setOrganizations([])
        setCurrentOrganization(null)
        localStorage.removeItem('currentOrganizationId')
        router.push('/login')
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed')
        setSession(session)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting sign in for:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Sign in error:', error)
        throw new Error(error.message)
      }

      console.log('✅ Sign in successful:', data.user?.email)
      
      // The onAuthStateChange will handle the rest
      return
    } catch (error) {
      console.error('Error in signIn:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      console.log('📝 Attempting sign up for:', email)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error('Sign up error:', error)
        throw new Error(error.message)
      }

      console.log('✅ Sign up response:', data)
      
      // Check if user was created but needs email confirmation
      if (data.user && !data.session) {
        console.log('📧 Email confirmation required')
        return { needsConfirmation: true }
      }

      // If we have a session, the user is immediately signed in
      if (data.user && data.session) {
        console.log('✅ User signed up and signed in immediately')
        return { needsConfirmation: false }
      }

      // Fallback
      return { needsConfirmation: true }
    } catch (error) {
      console.error('Error in signUp:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      console.log('👋 Signing out...')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        throw error
      }

      console.log('✅ Sign out successful')
    } catch (error) {
      console.error('Error in signOut:', error)
      throw error
    }
  }

  const signInWithProvider = async (
    provider: 'google' | 'github' | 'azure'
  ) => {
    try {
      console.log('🔐 Attempting OAuth sign in with:', provider)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error('OAuth sign in error:', error)
        throw new Error(error.message)
      }

      console.log('✅ OAuth sign in initiated')
    } catch (error) {
      console.error('Error in signInWithProvider:', error)
      throw error
    }
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