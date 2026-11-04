import { createContext, useContext, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { db } from '@/lib/api'
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

const throwAuthError = (error: unknown): never => {
  const details = error && typeof error === 'object' ? error as {
    message?: unknown
    status?: unknown
    code?: unknown
  } : {}
  const failure = new Error(typeof details.message === 'string' ? details.message : 'Não foi possível concluir a autenticação.')
  Object.assign(failure, {
    status: typeof details.status === 'number' ? details.status : undefined,
    code: typeof details.code === 'string' ? details.code : undefined,
  })
  throw failure
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const sessionState = authClient.useSession()
  const authUser = sessionState.data?.user
  const user: User | null = authUser
    ? { id: authUser.id, email: authUser.email, name: authUser.name }
    : null

  const [displayName, setDisplayName] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const loading = sessionState.isPending || actionLoading

  // Remove o token legado em texto acessível ao JavaScript; as sessões agora são cookies HTTP-only.
  useEffect(() => {
    try { localStorage.removeItem('agendalec_session') } catch { /* armazenamento indisponível */ }
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
        if (error) throw new Error(error.message)
        if (active) setDisplayName(data?.display_name ?? user.name ?? user.email.split('@')[0])
      } catch (error) {
        console.error('Unable to load the user profile:', error)
        if (active) setDisplayName(user.name ?? user.email.split('@')[0])
      }
    }

    void loadProfile()
    return () => { active = false }
  }, [user?.id, user?.email, user?.name])

  const login = async (email: string, password: string) => {
    setActionLoading(true)
    try {
      const result = await authClient.signIn.email({ email: email.trim().toLowerCase(), password })
      if (result.error) throwAuthError(result.error)
    } finally {
      setActionLoading(false)
    }
  }

  const logout = async () => {
    const result = await authClient.signOut()
    if (result.error) throwAuthError(result.error)
  }

  const signUp = async (email: string, password: string) => {
    setActionLoading(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const result = await authClient.signUp.email({
        email: normalizedEmail,
        password,
        name: normalizedEmail.split('@')[0],
      })
      if (result.error) throwAuthError(result.error)
      return true
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated: user !== null,
      user,
      displayName,
      email: user?.email ?? null,
      loading,
      login,
      logout,
      signUp,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
