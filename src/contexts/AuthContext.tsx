import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/apiClient'
import type { UserRole } from '../types'

// Custom types since we use our own backend
interface User {
  id: string
  email?: string
  [key: string]: any
}

interface Session {
  access_token: string
  user: User
}

interface Profile {
  id: string
  full_name: string
  role: UserRole | null
  avatar_url: string | null
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    // Listen for auth changes FIRST (prevents missing events)
    const {
      data: { subscription },
    } = api.auth.onAuthStateChange((_event, session) => {
      if (!active) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        setTimeout(() => {
          if (active) void fetchProfile(session.user.id)
        }, 0)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    // THEN check for existing session
    api.auth.getSession().then(({ data: { session } }) => {
      if (!active) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        setTimeout(() => {
          if (active) void fetchProfile(session.user.id)
        }, 0)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId: string) {
    const { data, error } = await api
      .from('profiles')
      .select('id, full_name, role, avatar_url')
      .eq('id', userId)  // Use 'id' which is the PRIMARY KEY that references auth_users(id)
      .maybeSingle()

    if (error) {
      // Keep this silent in production; profile might not exist yet.
      console.error('Profile fetch error:', error)
      setProfile(null)
      setLoading(false)
      return
    }

    setProfile((data as Profile) ?? null)
    setLoading(false)
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await api.auth.signInWithPassword({ email, password })
    
    if (!error && data?.session) {
      const sessionData = data.session as Session
      setSession(sessionData)
      setUser(sessionData.user)
      if (sessionData.user) {
        await fetchProfile(sessionData.user.id)
      }
    }
    
    return { error: error as Error | null }
  }

  async function signUp(email: string, password: string, fullName: string, role: UserRole) {
    const { data, error } = await api.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    })

    if (!error && data?.user) {
      // Create profile
      await api.from('profiles').upsert({
        id: data.user.id,
        user_id: data.user.id,
        full_name: fullName,
        role: role,
      })
      
      // If we got a session, set it
      if (data.session) {
        const sessionData = data.session as Session
        setSession(sessionData)
        setUser(sessionData.user)
        await fetchProfile(sessionData.user.id)
      }
    }

    return { error: error as Error | null }
  }

  async function signOut() {
    await api.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
