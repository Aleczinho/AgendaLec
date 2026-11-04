import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '@/lib/api'
import type { User } from '@/lib/api'

interface AuthContextValue {
  isAuthenticated: boolean
  user: User | null
  displayName: string | null
  email: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signUp: (email: string, password: string) => Promise<boolean>
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
  // A sessão guardada no navegador vale de imediato; o servidor a confirma logo em seguida.
  const [user, setUser] = useState<User | null>(() => auth.getSession()?.user ?? null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const unsubscribe = auth.onChange(session => {
      if (active) setUser(session?.user ?? null)
    })

    auth.restoreSession()
      .then(session => {
        if (active) setUser(session?.user ?? null)
      })
      .catch(error => {
        // Servidor fora do ar: mantém a sessão local; as chamadas seguintes mostram o erro.
        console.error('Unable to restore the authentication session:', error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      unsubscribe()
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
        const { data, error } = await db
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
    setLoading(true)
    try {
      const session = await auth.signIn(email, password)
      setUser(session.user)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    auth.signOut()
    setUser(null)
  }

  const signUp = async (email: string, password: string) => {
    setLoading(true)
    try {
      const session = await auth.signUp(email, password)
      setUser(session.user)
      return true
    } finally {
      setLoading(false)
    }
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
