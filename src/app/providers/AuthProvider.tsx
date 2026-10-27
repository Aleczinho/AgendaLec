import { createContext, useContext, useState, useEffect } from 'react'
import { createClient, User } from '@supabase/supabase-js'

// Cria cliente Supabase usando variáveis de ambiente
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

interface AuthContextValue {
  isAuthenticated: boolean
  user: User | null
  displayName: string | null
  email: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
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

export const AuthProvider = ({
  children,
}: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Verifica estado de auth ao montar
  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) console.error('Error getting session:', error)
      setIsAuthenticated(!!data.session)
      
      if (data.session?.user) {
        const user = data.session.user as User
        setUser(user)
        setEmail(user.email)
        // Buscar perfil do usuário
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setDisplayName(profile.display_name)
        }
      }
      setLoading(false)
    }

    getSession()

    // Ouvinte para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setIsAuthenticated(!!session)
        if (session?.user) {
          const user = session.user as User
          setUser(user)
          setEmail(user.email)
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single()
          
          if (profile) {
            setDisplayName(profile.display_name)
          }
        } else {
          setUser(null)
          setDisplayName(null)
          setEmail(null)
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Login error:', error.message)
      throw error
    }

    if (data.session?.user) {
      const user = data.session.user as User
      setUser(user)
      setEmail(user.email)
      setIsAuthenticated(true)
      
      // Criar ou atualizar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: user.email?.split('@')[0] || 'Usuário',
        }, { onConflict: 'id' })

      if (profileError) console.error('Profile error:', profileError)
    }

    setLoading(false)
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Logout error:', error.message)

    setIsAuthenticated(false)
    setUser(null)
    setDisplayName(null)
    setEmail(null)
  }

  const signUp = async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error('Signup error:', error.message)
      throw error
    }

    if (data.user) {
      const user = data.user as User
      setUser(user)
      setEmail(user.email)
      setIsAuthenticated(true)
      
      // Criar perfil inicial
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: user.email?.split('@')[0] || 'Usuário',
        }, { onConflict: 'id' })

      if (profileError) console.error('Profile error:', profileError)
    }

    setLoading(false)
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) console.error('Reset password error:', error.message)
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, displayName, email, loading, login, logout, signUp, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}