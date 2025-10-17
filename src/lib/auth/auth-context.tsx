'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
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
  const [dataLoaded, setDataLoaded] = useState(false)

  // Add timeout ref to prevent infinite loading
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initializationAttemptedRef = useRef(false)
  const mountedRef = useRef(true)

  const router = useRouter()
  const supabase = createClient()

  // Force loading to false after timeout
  const setLoadingWithTimeout = (isLoading: boolean) => {
    if (!mountedRef.current) return

    setLoading(isLoading)

    if (isLoading) {
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }

      // Set timeout to force loading to false after 5 seconds
      loadingTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.warn('Loading timeout reached - forcing loading to false')
          setLoading(false)
        }
      }, 5000)
    } else {
      // Clear timeout when loading is done
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
    }
  }

  const fetchProfile = async (
    userId: string,
    retries = 2
  ): Promise<SimpleProfile | null> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `Fetching profile (attempt ${attempt}/${retries}) for user:`,
          userId
        )

        const { data, error } = await supabase
          .from('profiles')
          .select(
            'id, email, full_name, avatar_url, job_title, phone, timezone, onboarded, created_at, updated_at'
          )
          .eq('id', userId)
          .single()

        if (error) {
          console.error('Profile fetch error:', error.message, error.code)

          // If profile doesn't exist, create it
          if (error.code === 'PGRST116') {
            console.log('Profile not found, creating new profile...')

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
                console.error('Failed to create profile:', createError.message)
                if (attempt < retries) {
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  continue
                }
                return null
              }

              console.log('Profile created successfully')
              return createdProfile as SimpleProfile
            }
          }

          // Retry on other errors
          if (attempt < retries) {
            console.log(`Retrying profile fetch in ${1000}ms...`)
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }

          return null
        }

        console.log('Profile fetched successfully:', data.email)
        return data as SimpleProfile
      } catch (error) {
        console.error(`Profile fetch attempt ${attempt} failed:`, error)
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
        console.log(
          `Fetching organizations (attempt ${attempt}/${retries}) for user:`,
          userId
        )

        // First get organization memberships
        const { data: memberships, error: membershipError } = await supabase
          .from('organization_members')
          .select('role, organization_id, joined_at')
          .eq('user_id', userId)

        if (membershipError) {
          console.error(
            'Organization memberships error:',
            membershipError.message
          )
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          return []
        }

        if (!memberships || memberships.length === 0) {
          console.log('No organization memberships found')
          return []
        }

        // Filter only joined memberships (client-side filtering)
        const joinedMemberships = memberships.filter((m: any) => m.joined_at !== null)

        if (joinedMemberships.length === 0) {
          console.log('No joined organization memberships found')
          return []
        }

        // Get organization details
        const orgIds = joinedMemberships.map(item => item.organization_id)
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name, slug, description')
          .in('id', orgIds)

        if (orgsError) {
          console.error('Organizations error:', orgsError.message)
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          return []
        }

        // Combine data
        const result = (orgsData || []).map(org => {
          const membership = joinedMemberships.find(
            item => item.organization_id === org.id
          )
          return {
            ...org,
            role: membership?.role || 'member',
          } as SimpleOrganization
        })

        console.log(
          `Organizations fetched successfully: ${result.length} found`
        )
        return result
      } catch (error) {
        console.error(`Organizations fetch attempt ${attempt} failed:`, error)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          continue
        }
        return []
      }
    }

    return []
  }

  // Enhanced data loading with better error handling
  const loadUserData = async (user: User, skipIfLoaded = false) => {
    if (skipIfLoaded && dataLoaded) {
      console.log('Data already loaded, skipping...')
      return
    }

    if (!mountedRef.current) return

    try {
      console.log('Loading user data for:', user.email)

      // Load profile
      const profileData = await fetchProfile(user.id)

      if (mountedRef.current) {
        setProfile(profileData)
      }

      // Only load organizations if profile exists
      let orgsData: SimpleOrganization[] = []
      if (profileData && mountedRef.current) {
        orgsData = await fetchOrganizations(user.id)

        if (mountedRef.current) {
          setOrganizations(orgsData)

          // Set current organization
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
      }

      if (mountedRef.current) {
        setDataLoaded(true)
        setLoading(false)
        console.log('User data loaded successfully')
      }

      // Handle redirects after data is loaded
      const path = typeof window !== 'undefined' ? window.location.pathname : ''

      if (!path.includes('/auth/callback') && !path.includes('/auth/confirm')) {
        if (profileData?.onboarded && orgsData.length > 0) {
          if (path === '/login' || path === '/register' || path === '/') {
            router.replace('/dashboard')
          }
        } else if (path !== '/onboarding') {
          router.replace('/onboarding')
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  // useEffect(() => {
  //   mountedRef.current = true

  //   const initializeAuth = async () => {
  //     // Prevent multiple initialization attempts
  //     if (initializationAttemptedRef.current) {
  //       console.log('Auth initialization already attempted, skipping...')
  //       return
  //     }

  //     initializationAttemptedRef.current = true

  //     try {
  //       console.log('Initializing auth...')
  //       setLoadingWithTimeout(true)

  //       const {
  //         data: { session: initialSession },
  //         error: sessionError,
  //       } = await supabase.auth.getSession()

  //       if (sessionError) {
  //         console.error('Session fetch error:', sessionError.message)
  //         if (mountedRef.current) setLoadingWithTimeout(false)
  //         return
  //       }

  //       if (initialSession?.user && mountedRef.current) {
  //         console.log(
  //           'Initial session found for:',
  //           initialSession.user.email
  //         )
  //         setSession(initialSession)
  //         setUser(initialSession.user)

  //         // Load user data
  //         await loadUserData(initialSession.user)

  //         // Force loading to false after successful data load
  //         setTimeout(() => {
  //           if (mountedRef.current) {
  //             setLoadingWithTimeout(false)
  //           }
  //         }, 1000)
  //       } else {
  //         console.log('No initial session found')
  //         if (mountedRef.current) setLoadingWithTimeout(false)
  //       }
  //     } catch (error) {
  //       console.error('Auth initialization error:', error)
  //       if (mountedRef.current) setLoadingWithTimeout(false)
  //     } finally {
  //       if (mountedRef.current) {
  //         console.log('Auth initialization complete')
  //         // Backup timeout to ensure loading is always false
  //         setTimeout(() => {
  //           if (mountedRef.current) {
  //             setLoadingWithTimeout(false)
  //           }
  //         }, 3000)
  //       }
  //     }
  //   }

  //   // Add delay for page refresh scenarios
  //   const initWithDelay = async () => {
  //     await new Promise(resolve => setTimeout(resolve, 100))
  //     await initializeAuth()
  //   }

  //   initWithDelay()

  //   const {
  //     data: { subscription },
  //   } = supabase.auth.onAuthStateChange(async (event, session) => {
  //     if (!mountedRef.current) return

  //     console.log('Auth state change:', event, session?.user?.email)

  //     if (event === 'SIGNED_IN' && session?.user) {
  //       setSession(session)
  //       setUser(session.user)
  //       setDataLoaded(false) // Reset data loaded flag

  //       // Load user data for new session
  //       await loadUserData(session.user)
  //       setLoadingWithTimeout(false) // Ensure loading is false after sign in
  //     } else if (event === 'SIGNED_OUT') {
  //       setUser(null)
  //       setSession(null)
  //       setProfile(null)
  //       setOrganizations([])
  //       setCurrentOrganization(null)
  //       setDataLoaded(false)
  //       setLoadingWithTimeout(false) // Ensure loading is false after sign out

  //       if (typeof window !== 'undefined') {
  //         localStorage.removeItem('currentOrganizationId')
  //       }

  //       const path =
  //         typeof window !== 'undefined' ? window.location.pathname : ''
  //       if (path !== '/login' && path !== '/register' && path !== '/') {
  //         router.replace('/login')
  //       }
  //     } else if (event === 'TOKEN_REFRESHED') {
  //       console.log('Token refreshed successfully')
  //       setLoadingWithTimeout(false) // Ensure loading is false after token refresh
  //     }
  //   })

  //   // Cleanup timeout on unmount
  //   return () => {
  //     mountedRef.current = false
  //     subscription.unsubscribe()
  //     if (loadingTimeoutRef.current) {
  //       clearTimeout(loadingTimeoutRef.current)
  //     }
  //   }
  // }, [router, supabase])

  // Replace your entire useEffect in auth-context.tsx with this:
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            setSession(session)
            // Don't block UI - load data in background
            loadUserData(session.user)
          }
          // Always set loading to false after getting session
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth init error:', error)
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        setSession(session)
        loadUserData(session.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        setProfile(null)
        setOrganizations([])
        setCurrentOrganization(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoadingWithTimeout(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error) {
      setLoadingWithTimeout(false)
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      setLoadingWithTimeout(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      if (data.session) {
        setLoadingWithTimeout(false)
      }

      return {
        needsConfirmation: !data.session,
      }
    } catch (error) {
      setLoadingWithTimeout(false)
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
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Provider sign in error:', error)
      throw error
    }
  }

  const refreshProfile = async () => {
    if (!user || !mountedRef.current) return

    console.log('Manually refreshing profile...')
    setLoadingWithTimeout(true)
    setDataLoaded(false)
    try {
      await loadUserData(user)
    } finally {
      if (mountedRef.current) {
        setLoadingWithTimeout(false)
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
