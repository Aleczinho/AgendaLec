import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { assertSupabaseConfigured, supabase, supabaseConfigured } from '@/lib/supabase'

interface AuthContextValue {
  isAuthenticated: boolean
  user: User | null
  displayName: string | null
  email: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signUp: (email: string, password: string) => Promise<boolean>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error
        if (active) setUser(data.session?.user ?? null)
      })
      .catch(error => {
        console.error('Unable to restore the authentication session:', error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setDisplayName(null)
      return
    }

    let active = true
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .maybeSingle()
        if (error) throw error
        if (active) {
          setDisplayName(data?.display_name ?? user.email?.split('@')[0] ?? null)
        }
      } catch (error) {
        console.error('Unable to load the user profile:', error)
        if (active) setDisplayName(user.email?.split('@')[0] ?? null)
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [user])

  const login = async (email: string, password: string) => {
    assertSupabaseConfigured()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    assertSupabaseConfigured()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string) => {
    assertSupabaseConfigured()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (data.session) setUser(data.session.user)
      return data.session !== null
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    assertSupabaseConfigured()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: user !== null,
        user,
        displayName,
        email: user?.email ?? null,
        loading,
        login,
        logout,
        signUp,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
