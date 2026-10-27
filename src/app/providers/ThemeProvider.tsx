import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '@/lib/supabase'

type Theme = 'claro' | 'escuro' | 'automatico'
export type AccentPalette = 'violeta' | 'azul' | 'verde' | 'rosa' | 'laranja'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  accentPalette: AccentPalette
  setAccentPalette: (palette: AccentPalette) => void
  prefersDark: boolean
  savedTheme: Theme | null
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const isTheme = (value: unknown): value is Theme =>
  value === 'claro' || value === 'escuro' || value === 'automatico'
const isAccentPalette = (value: unknown): value is AccentPalette =>
  value === 'violeta' || value === 'azul' || value === 'verde' || value === 'rosa' || value === 'laranja'

const storedTheme = (): Theme | null => {
  const value = localStorage.getItem('agendalec_theme')
  return isTheme(value) ? value : null
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('automatico')
  const [accentPalette, setAccentPalette] = useState<AccentPalette>('violeta')
  const [prefersDark, setPrefersDark] = useState(false)
  const [savedTheme, setSavedTheme] = useState<Theme | null>(null)
  const [hasLoadedTheme, setHasLoadedTheme] = useState(false)

  useEffect(() => {
    let active = true
    const loadTheme = async () => {
      try {
        if (!supabaseConfigured) {
          const selectedTheme = storedTheme() ?? 'automatico'
          const selectedPalette = localStorage.getItem('agendalec_palette')
          if (active) {
            setTheme(selectedTheme)
            if (isAccentPalette(selectedPalette)) setAccentPalette(selectedPalette)
            setSavedTheme(selectedTheme)
          }
          return
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (session?.user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', session.user.id)
            .maybeSingle()
          if (error) throw error

          const preferenceTheme = data?.preferences?.theme
          const selectedTheme = isTheme(preferenceTheme) ? preferenceTheme : storedTheme() ?? 'automatico'
          const preferencePalette = data?.preferences?.accentPalette
          const storedPalette = localStorage.getItem('agendalec_palette')
          if (active) {
            setTheme(selectedTheme)
            if (isAccentPalette(preferencePalette)) setAccentPalette(preferencePalette)
            else if (isAccentPalette(storedPalette)) setAccentPalette(storedPalette)
            setSavedTheme(selectedTheme)
          }
        } else {
          const selectedTheme = storedTheme() ?? 'automatico'
          const selectedPalette = localStorage.getItem('agendalec_palette')
          if (active) {
            setTheme(selectedTheme)
            if (isAccentPalette(selectedPalette)) setAccentPalette(selectedPalette)
            setSavedTheme(selectedTheme)
          }
        }
      } catch (error) {
        console.error('Unable to load the theme preference:', error)
        const selectedTheme = storedTheme() ?? 'automatico'
        const selectedPalette = localStorage.getItem('agendalec_palette')
        if (active) {
          setTheme(selectedTheme)
          if (isAccentPalette(selectedPalette)) setAccentPalette(selectedPalette)
          setSavedTheme(selectedTheme)
        }
      } finally {
        if (active) setHasLoadedTheme(true)
      }
    }

    void loadTheme()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setPrefersDark(mediaQuery.matches)
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches)
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const useDark = theme === 'escuro' || (theme === 'automatico' && prefersDark)
    root.classList.toggle('dark', useDark)
    root.classList.toggle('light', !useDark)
  }, [prefersDark, theme])

  useEffect(() => {
    document.documentElement.dataset.palette = accentPalette
  }, [accentPalette])

  useEffect(() => {
    if (!hasLoadedTheme) return
    localStorage.setItem('agendalec_theme', theme)
    localStorage.setItem('agendalec_palette', accentPalette)
    setSavedTheme(theme)
  }, [accentPalette, hasLoadedTheme, theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentPalette, setAccentPalette, prefersDark, savedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
