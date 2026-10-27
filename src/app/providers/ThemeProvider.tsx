import { createContext, useContext, useState, useEffect } from 'react'

// Inicializa o cliente Supabase (será undefined se vars não existirem)
let supabase: any = null

try {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

  if (url && key) {
    supabase = createClient(url, key)
  } else {
    console.warn('Variáveis de ambiente do Supabase não configuradas')
  }
} catch (e) {
  console.warn('Supabase not configured, using client-side only')
}

interface ThemeContextValue {
  theme: 'claro' | 'escuro' | 'automatico'
  setTheme: (theme: 'claro' | 'escuro' | 'automatico') => void
  prefersDark: boolean
  savedTheme: 'claro' | 'escuro' | 'automatico' | null
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({
  children,
}: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<'claro' | 'escuro' | 'automatico'>('automatico')
  let [prefersDark, setPrefersDark] = useState(false)
  const [savedTheme, setSavedTheme] = useState<'claro' | 'escuro' | 'automatico' | null>(null)

  // Verificar preferência salva no Supabase ou localStorage
  useEffect(() => {
    const loadSavedTheme = async () => {
      if (!supabase) {
        // Fallback para localStorage se Supabase não configurado
        const stored = localStorage.getItem('agendalec_theme')
        if (stored) {
          setSavedTheme(stored as any)
          setTheme(stored as any)
        }
        return
      }

      try {
        // Tentar obter usuário atual
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          // Sem usuário logado, usar localStorage
          const stored = localStorage.getItem('agendalec_theme')
          if (stored) {
            setSavedTheme(stored as any)
            setTheme(stored as any)
          }
          return
        }

        // Buscar preferência no banco do usuário
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('id', user.id)
          .single()

        if (profile && profile.preferences?.theme) {
          setSavedTheme(profile.preferences.theme as any)
          setTheme(profile.preferences.theme as any)
        } else {
          // Definir tema padrão e salvar
          const defaultTheme: 'claro' | 'escuro' | 'automatico' = 'automatico'
          setTheme(defaultTheme)
          setSavedTheme(defaultTheme)
          
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              preferences: { theme: defaultTheme },
            }, { onConflict: 'id' })
        }
      } catch (err) {
        console.error('Error loading theme:', err)
        // Fallback para localStorage
        const stored = localStorage.getItem('agendalec_theme')
        if (stored) {
          setSavedTheme(stored as any)
          setTheme(stored as any)
        }
      }
    }

    loadSavedTheme()
  }, [])

  // Aplicar tema e salvar preferência
  useEffect(() => {
    const root = document.documentElement

    const applyTheme = () => {
      if (theme === 'automatico') {
        root.classList.remove('light', 'dark')
        if (prefersDark) {
          root.classList.add('dark')
        } else {
          root.classList.add('light')
        }
      } else if (theme === 'claro') {
        root.classList.remove('dark', 'light')
        root.classList.add('light')
      } else if (theme === 'escuro') {
        root.classList.remove('light', 'dark')
        root.classList.add('dark')
      }
    }

    applyTheme()

    // Atualizar quando mudar
    const listener = () => {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      applyTheme()
    }

    const resizeListener = () => applyTheme()

    window.addEventListener('resize', resizeListener)
    window.addEventListener('orientationchange', resizeListener)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', listener)

    // Salvar no Supabase se houver usuário
    const saveThemePreference = async () => {
      if (!supabase) return
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              preferences: { theme },
            }, { onConflict: 'id' })
        }
      } catch (err) {
        console.error('Error saving theme:', err)
      }
    }

    saveThemePreference()

    return () => {
      window.removeEventListener('resize', resizeListener)
      window.removeEventListener('orientationchange', resizeListener)
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', listener)
    }
  }, [theme, prefersDark])

  // Observer para mudanças de esquema de cor do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setPrefersDark(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersDark(e.matches)
      if (theme === 'automatico') {
        const root = document.documentElement
        if (e.matches) {
          root.classList.add('dark')
          root.classList.remove('light')
        } else {
          root.classList.remove('dark')
          root.classList.add('light')
        }
      }
    }

    mediaQuery.addEventListener?.('change', handleChange)

    return () => {
      mediaQuery.removeEventListener?.('change', handleChange)
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, prefersDark, savedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}