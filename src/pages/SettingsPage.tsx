import { useEffect, useState } from 'react'
import { useTheme, type AccentPalette } from '@/app/providers/ThemeProvider'
import { useCalendar } from '@/app/providers/CalendarProvider'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'

interface SettingsPageProps {
  userId: string
}

type Theme = 'claro' | 'escuro' | 'automatico'
type Preferences = {
  firstDayOfWeek?: 'domingo' | 'segunda'
  timeFormat?: '24h' | '12h'
  calendarView?: 'mensal' | 'semanal' | 'diaria'
  accentPalette?: AccentPalette
  theme?: Theme
  [key: string]: unknown
}

export const SettingsPage = ({ userId }: SettingsPageProps) => {
  const { theme, setTheme, accentPalette, setAccentPalette } = useTheme()
  const {
    setWeekStartsOn,
    setTimeFormat: setCalendarTimeFormat,
    setDefaultCalendarView: applyDefaultCalendarView,
  } = useCalendar()
  const [selectedTheme, setSelectedTheme] = useState<Theme>(theme)
  const [selectedPalette, setSelectedPalette] = useState<AccentPalette>(accentPalette)
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<'domingo' | 'segunda'>('segunda')
  const [timeFormat, setTimeFormat] = useState<'24h' | '12h'>('24h')
  const [calendarView, setCalendarView] = useState<'mensal' | 'semanal' | 'diaria'>('mensal')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    const loadSettings = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      if (!active || !data) return

      const preferences = (data.preferences ?? {}) as Preferences
      if (preferences.theme && ['claro', 'escuro', 'automatico'].includes(preferences.theme)) {
        setSelectedTheme(preferences.theme)
      }
      if (preferences.accentPalette && ['violeta', 'azul', 'verde', 'rosa', 'laranja'].includes(preferences.accentPalette)) {
        setSelectedPalette(preferences.accentPalette)
      }
      if (preferences.firstDayOfWeek) {
        setFirstDayOfWeek(preferences.firstDayOfWeek)
      }
      if (preferences.timeFormat === '12h' || preferences.timeFormat === '24h') setTimeFormat(preferences.timeFormat)
      if (preferences.calendarView) setCalendarView(preferences.calendarView)
    }

    void loadSettings().catch(error => {
      console.error('Unable to load preferences:', error)
      if (active) setErrorMessage('Não foi possível carregar as configurações.')
    })
    return () => { active = false }
  }, [userId])

  const handleSave = async () => {
    setIsLoading(true)
    setErrorMessage('')
    setMessage('')

    try {
      const { data: profile, error: readError } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .maybeSingle()
      if (readError) throw readError

      const preferences = {
        ...((profile?.preferences ?? {}) as Preferences),
        theme: selectedTheme,
        accentPalette: selectedPalette,
        firstDayOfWeek,
        timeFormat,
        calendarView,
      }
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, preferences }, { onConflict: 'id' })
      if (error) throw error

      setTheme(selectedTheme)
      setAccentPalette(selectedPalette)
      setWeekStartsOn(firstDayOfWeek === 'segunda' ? 1 : 0)
      setCalendarTimeFormat(timeFormat)
      applyDefaultCalendarView(calendarView)
      setMessage('Preferências salvas.')
    } catch (error) {
      console.error('Unable to save preferences:', error)
      setErrorMessage('Não foi possível salvar as configurações.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="settings-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Personalize seu espaço</p>
          <h1>Configurações</h1>
        </div>
      </header>

      {errorMessage && <p role="alert" className="mb-4 text-sm text-red-600">{errorMessage}</p>}
      {message && <p role="status" className="mb-4 text-sm text-green-700">{message}</p>}

      <div className="settings-layout">
        <Card className="space-y-4 p-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-secondary">Aparência e calendário</h2>
          <label className="block text-sm text-secondary">
            Tema
            <select className="select select-sm mt-1 w-full" value={selectedTheme} onChange={event => setSelectedTheme(event.target.value as Theme)}>
              <option value="automatico">Automático</option>
              <option value="claro">Claro</option>
              <option value="escuro">Escuro</option>
            </select>
          </label>
          <label className="block text-sm text-secondary">
            Cor principal
            <select className="select select-sm mt-1 w-full" value={selectedPalette} onChange={event => setSelectedPalette(event.target.value as AccentPalette)}>
              <option value="violeta">Violeta</option>
              <option value="azul">Azul</option>
              <option value="verde">Verde</option>
              <option value="rosa">Rosa</option>
              <option value="laranja">Laranja</option>
            </select>
          </label>
          <label className="block text-sm text-secondary">
            Formato de horário
            <select className="select select-sm mt-1 w-full" value={timeFormat} onChange={event => setTimeFormat(event.target.value as '24h' | '12h')}>
              <option value="24h">24 horas</option>
              <option value="12h">12 horas</option>
            </select>
          </label>
          <label className="block text-sm text-secondary">
            Primeiro dia da semana
            <select className="select select-sm mt-1 w-full" value={firstDayOfWeek} onChange={event => setFirstDayOfWeek(event.target.value as 'domingo' | 'segunda')}>
              <option value="domingo">Domingo</option>
              <option value="segunda">Segunda-feira</option>
            </select>
          </label>
          <label className="block text-sm text-secondary">
            Visualização padrão
            <select className="select select-sm mt-1 w-full" value={calendarView} onChange={event => setCalendarView(event.target.value as 'mensal' | 'semanal' | 'diaria')}>
              <option value="mensal">Mensal</option>
              <option value="semanal">Semanal</option>
              <option value="diaria">Diária</option>
            </select>
          </label>
        </Card>

      </div>

      <button onClick={() => void handleSave()} className="btn btn-primary mt-8 w-full" disabled={isLoading}>
        {isLoading ? 'Salvando...' : 'Salvar Preferências'}
      </button>
    </section>
  )
}
