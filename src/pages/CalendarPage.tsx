import { useState, useEffect } from 'react'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { DayView } from '@/components/calendar/DayView'
import { WeekView } from '@/components/calendar/WeekView'
import { CalendarNav } from '@/components/ui/CalendarNav'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { eventSchema } from '@/components/events/EventForm'

interface CalendarPageProps {
  initialMonth?: number
  initialYear?: number
}

export const CalendarPage = ({
  initialMonth = new Date().getMonth() + 1,
  initialYear = new Date().getFullYear(),
}: CalendarPageProps) => {
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [selectedDay, setSelectedDay] = useState(1)
  const [events, setEvents] = useState<Array<{ id: string; title: string; date: Date; category: string; allDay?: boolean }>>([])
  const [holidays, setHolidays] = useState<Array<{ id: string; date: Date; name: string; scope: string }>>([])
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()

  // Load events and holidays when month/year changes
  useEffect(() => {
    // Fetch events from Supabase would go here
    // For now, using mock data
    const mockEvents = [
      { id: '1', title: 'Aula de Português', date: new Date(year, month - 1, 15), category: 'estudo' },
      { id: '2', title: 'Workout', date: new Date(year, month - 1, 20), category: 'academia' },
    ]
    setEvents(mockEvents)
  }, [month, year])

  useEffect(() => {
    // Fetch holidays
    const mockHolidays = [
      { id: '1', date: new Date(year, 0, 1), name: 'Confraternização Universal', scope: 'nacional' },
      { id: '2', date: new Date(year, 9, 7), name: 'Independência do Brasil', scope: 'nacional' },
    ]
    setHolidays(mockHolidays)
  }, [month, year])

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1)
      setMonth(12)
    } else {
      setMonth(month - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1)
      setMonth(1)
    } else {
      setMonth(month + 1)
    }
  }

  const handleToday = () => {
    setMonth(new Date().getMonth() + 1)
    setYear(new Date().getFullYear())
    setSelectedDay(new Date().getDate())
  }

  const onDayClick = (day: number) => {
    setSelectedDay(day)
    navigate(`/agenda/${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`)
  }

  const onCreateEvent = async (data: any) => {
    setIsCreating(false)
    // Logic to create event would go here
    console.log('Event created:', data)
  }

  return (
    <section className="min-h-screen bg-bg dark:bg-gray-900">
      <header className="border-b border-border bg-surface dark:bg-gray-800 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <X className="h-5 w-5 opacity-50 cursor-pointer" />
            <h1 className="text-xl font-bold">Calendário</h1>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="p-2 rounded-md hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.293 8.293a1 1 0 001.414 1.414L10 10.414l1.707 1.707a1 1 0 101.414-1.414L11.414 10l1.707-1.707a1 1 0 00-1.414-1.414L10 8.586 8.293 6.887a1 1 0 00-1.414 1.414l-2 2z" clipRule="evenodd" />
              </svg>
            </button>

            <button onClick={handleNextMonth} className="p-2 rounded-md hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a8 8 0 000 16 8 8 0 000-16zm3.794 5.306a1 1 0 010 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L13.707 7H10v1.793l1.107-1.107a1 1 0 011.414 1.414l2-2zM7 10a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>

            <button onClick={handleToday} className="p-2 rounded-md hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
              Hoje
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Monthly Calendar */}
          <div>
            <h2 className="text-font-medium text-secondary uppercase tracking-wider mb-3">Calendário Mensal</h2>
            <MonthGrid
              year={year}
              month={month}
              selectedDay={selectedDay}
              onDayClick={onDayClick}
              events={events}
              holidays={holidays}
            />
          </div>

          {/* Day View */}
          <div>
            <h2 className="text-font-medium text-secondary uppercase tracking-wider mb-3">
              {selectedDay}
              {view === 'day' ? ` de ${new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' })}` : ''}
            </h2>
            <DayView
              date={new Date(year, month - 1, selectedDay)}
              events={events.filter(e => e.date.getDate() === selectedDay)}
              onEdit={event => console.log('Editar:', event)}
              onDelete={eventId => console.log('Excluir:', eventId)}
              onToggleComplete={eventId => console.log('Concluir:', eventId)}
            />
          </div>

          {/* Week View */}
          <div>
            <h2 className="text-font-medium text-secondary uppercase tracking-wider mb-3">Semana</h2>
            <WeekView
              year={year}
              month={month}
              day={selectedDay}
              events={events}
              onEdit={event => console.log('Editar:', event)}
              onDelete={eventId => console.log('Excluir:', eventId)}
            />
          </div>
        </div>
      </main>

      {/* Event Creation Form */}
      <div className="mt-6 pt-6 border-t border-border">
        <CalendarNav onPrev={() => {}} onNext={() => {}} onToday={() => {}} />
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="btn btn-primary mb-3"
        >
          {isCreating ? 'Fechar formulário' : 'Adicionar compromisso'}
        </button>

        {isCreating && (
          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-bold mb-4">Novo Compromisso</h3>
            <p className="text-secondary mb-4">
              Selecione um dia no calendário para adicionar um compromisso
            </p>
            <button onClick={() => setIsCreating(false)} className="btn btn-secondary">Cancelar</button>
          </div>
        )}
      </div>
    </section>
  )
}