import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'

interface Calendar {
  id: string
  name: string
  description: string
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CalendarsPageProps {
  userId: string
}

export const CalendarsPage = ({ userId }: CalendarsPageProps) => {
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null)

  // Load calendars from Supabase
  useEffect(() => {
    // Mock data for now
    setCalendars([
      {
        id: '1',
        name: 'Rotina Pessoal',
        description: 'Minhas atividades diárias',
        color: '#3B82F6',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Escola e Estágio',
        description: 'Compromissos acadêmicos',
        color: '#10B981',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
  }, [userId])

  const handleCreate = async (data: {
    name: string
    description: string
    color: string
  }) => {
    setIsCreating(false)
    // Logic to create calendar would go here
    console.log('Calendar created:', data)
    setCalendars(prev => [...prev, {
      id: String(Date.now()),
      name: data.name,
      description: data.description,
      color: data.color,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }])
  }

  const handleToggle = (calendarId: string) => {
    setCalendars(prev =>
      prev.map(cal =>
        cal.id === calendarId
          ? { ...cal, is_active: !cal.is_active }
          : cal
      )
    )
  }

  const handleEdit = (calendar: Calendar) => {
    setEditingCalendar(calendar)
  }

  const handleDelete = async (calendarId: string) => {
    // Logic to delete calendar would go here
    setCalendars(prev => prev.filter(cal => cal.id !== calendarId))
  }

  return (
    <section className="p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Minhas Agendas</h1>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="btn btn-primary"
        >
          + Criar Nova Agenda
        </button>
      </header>

      {isCreating && (
        <div className="max-w-lg mx-auto space-y-4">
          <h2 className="text-xl font-bold">Criar Nova Agenda</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              // Handle form submission
              setIsCreating(false)
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Nome</label>
                <Input placeholder="Ex: Rotina Pessoal" />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Cor</label>
                <Select
                  options={[
                    { value: '#3B82F6', label: 'Azul' },
                    { value: '#10B981', label: 'Verde' },
                    { value: '#F59E0B', label: 'Laranja' },
                    { value: '#EF4444', label: 'Vermelho' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Descrição</label>
              <Input placeholder="Descrição opcional..." rows={2} />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                Criar Agenda
              </button>
              <button type="button" onClick={() => setIsCreating(false)} className="btn btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {calendars.map(calendar => (
          <Card
            key={calendar.id}
            className="p-4 hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full`}
                style={{ backgroundColor: calendar.color }}
              />

              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{calendar.name}</h3>
                <p className="text-sm text-secondary line-clamp-1">
                  {calendar.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(calendar.id)}
                  className="p-1 rounded-md hover:bg-primary/10 transition-colors"
                  title={calendar.is_active ? 'Desativar' : 'Ativar'}
                >
                  {calendar.is_active ? ✕ : ✓}
                </button>

                <button
                  onClick={() => handleEdit(calendar)}
                  className="text-primary hover/underline text-sm"
                  title="Editar"
                >
                  Editar
                </button>

                <button
                  onClick={() => handleDelete(calendar.id)}
                  className="text-red-600 hover/underline text-sm"
                  title="Excluir"
                >
                  Excluir
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editingCalendar && (
        <div className="max-w-md mx-auto p-4 rounded-lg bg-surface border border-border">
          <h2 className="text-lg font-bold mb-4">Editar Agenda</h2>

          <form>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Nome</label>
                <Input value={editingCalendar.name} />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Cor</label>
                <Select
                  options={[
                    { value: '#3B82F6', label: 'Azul' },
                    { value: '#10B981', label: 'Verde' },
                    { value: '#F59E0B', label: 'Laranja' },
                    { value: '#EF4444', label: 'Vermelho' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Descrição</label>
              <Input value={editingCalendar.description} rows={2} />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">Salvar Alterações</button>
              <button type="button" onClick={() => setEditingCalendar(null)} className="btn btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}