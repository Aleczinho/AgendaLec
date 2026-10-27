import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'

interface SettingsPageProps {
  userId: string
}

export const SettingsPage = ({ userId }: SettingsPageProps) => {
  const [timezone, setTimezone] = useState('America/Fortaleza')
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<'domingo' | 'segunda'>('segunda')
  const [theme, setTheme] = useState<'claro' | 'escuro' | 'automatico'>('automatico')
  const [timeFormat, setTimeFormat] = useState<'24h' | '12h'>('24h')
  const [calendarView, setCalendarView] = useState<'mensal' | 'semanal' | 'diaria'>('mensal')
  const [defaultCalendar, setDefaultCalendar] = useState<string | null>(null)

  // Load preferences from Supabase
  useEffect(() => {
    // Mock data
    setTimezone('America/Fortaleza')
    setFirstDayOfWeek('segunda')
    setTheme('automatico')
    setTimeFormat('24h')
    setCalendarView('mensal')
  }, [userId])

  const handleSave = () => {
    // Save preferences to Supabase
    console.log('Preferences saved:', {
      timezone,
      firstDayOfWeek,
      theme,
      timeFormat,
      calendarView,
      defaultCalendar,
    })
  }

  const timezoneOptions = [
    { value: 'America/Fortaleza', label: 'Fortaleza (UTC-3)' },
    { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-3)' },
    { value: 'America/Recife', label: 'Recife (UTC-3)' },
    { value: 'America/Natal', label: 'Natal (UTC-3)' },
    { value: 'America/Belem', label: 'Belém (UTC-3)' },
  ]

  const firstDayOptions = [
    { value: 'domingo', label: 'Domingo' },
    { value: 'segunda', label: 'Segunda-feira' },
  ]

  const timeFormatOptions = [
    { value: '24h', label: '24 horas' },
    { value: '12h', label: '12 horas' },
  ]

  const calendarViewOptions = [
    { value: 'mensal', label: 'Mensal' },
    { value: 'semanal', label: 'Semanal' },
    { value: 'diaria', label: 'Diária' },
  ]

  return (
    <section className="p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Configurações</h1>

        <button onClick={() => window.history.back()} className="p-2 rounded-md hover:bg-gray-100 hover:text-gray-800 transition-colors">
          ← Voltar
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Tema */}
        <Card>
          <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Aparência</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-secondary mb-1">Tema</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="select select-sm w-full"
              >
                <option value="automatico">Automático</option>
                <option value="claro">Claro</option>
                <option value="escuro">Escuro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-secondary mb-1">Fuso Horário</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="select select-sm w-full"
              >
                {timezoneOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-secondary mb-1">Formato de Horário</label>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as any)}
                className="select select-sm w-full"
              >
                <option value="24h">24 horas</option>
                <option value="12h">12 horas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-secondary mb-1">Primeiro Dia da Semana</label>
              <select
                value={firstDayOfWeek}
                onChange={(e) => setFirstDayOfWeek(e.target.value as any)}
                className="select select-sm w-full"
              >
                <option value="domingo">Domingo</option>
                <option value="segunda">Segunda-feira</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-secondary mb-1">Visualização Padrão do Calendário</label>
              <select
                value={calendarView}
                onChange={(e) => setCalendarView(e.target.value as any)}
                className="select select-sm w-full"
              >
                <option value="mensal">Mensal</option>
                <option value="semanal">Semanal</option>
                <option value="diaria">Diária</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Agenda Padrão */}
        <Card>
          <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Agenda Padrão</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-secondary mb-1">Agenda Padrão</label>
              <select
                value={defaultCalendar || ''}
                onChange={(e) => setDefaultCalendar(e.target.value || null)}
                className="select select-sm w-full"
              >
                <option value="">Nenhuma</option>
                <option value="1">Rotina Pessoal</option>
                <option value="2">Escola e Estágio</option>
                <option value="3">Igreja</option>
                <option value="4">Estudos</option>
                <option value="5">Academia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-secondary mb-1">Exportar Dados</label>
              <p className="text-xs text-secondary mb-2">
                Selecione abaixo para exportar seus dados:
              </p>

              <div className="flex gap-2">
                <button className="flex-1 btn btn-ghost btn-sm text-sm text-primary hover:text-primary">
                  CSV
                </button>
                <button className="flex-1 btn btn-ghost btn-sm text-sm text-secondary hover:text-secondary">
                  .ics
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-8 pt-8 border-t border-border">
        <button
          onClick={handleSave}
          className="btn btn-primary w-full"
        >
          Salvar Preferências
        </button>
      </div>
    </section>
  )
}