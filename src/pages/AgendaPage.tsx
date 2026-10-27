import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { CalendarNav } from '@/components/ui/CalendarNav'

interface AgendaPageProps {
  calendarId?: string
}

export const AgendaPage = () => {
  const { calendarId } = useParams()
  const navigate = useNavigate()
  const [month, setMonth] = useState(1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [events, setEvents] = useState([])
  const [selectedDay, setSelectedDay] = useState(1)

  useEffect(() => {
    // Load events for the selected calendar
    const loadEvents = async () => {
      // Mock data
      setEvents([
        { id: '1', title: 'Aula de Português', start: '07:00', end: '11:50', category: 'escola', location: 'Escola', calendarId: '2' },
        { id: '2', title: 'Workout', start: '18:15', end: '19:45', category: 'academia', location: 'Academy', calendarId: '1' },
      ])
    }
    loadEvents()
  }, [calendarId])

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
    // Navigate to specific day agenda
    navigate(`/agenda/${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`)
  }

  return (
    <section className="min-h-screen bg-bg dark:bg-gray-900">
      <header className="border-b border-border bg-surface dark:bg-gray-800 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <X className="h-5 w-5 opacity-50 cursor-pointer" />
            <h1 className="text-xl font-bold">Agenda</h1>
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

      <main className="p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Monthly Calendar */}
          <div>
            <h2 className="text-font-medium text-secondary uppercase tracking-wider mb-3">Calendário</h2>
            <p className="text-secondary text-sm">Navegue pelos meses para ver seus compromissos</p>
          </div>

          {/* Agenda Diária */}
          <div>
            <h2 className="text-font-medium text-secondary uppercase tracking-wider mb-3">
              {selectedDay}
              de {new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' })}
            </h2>

            <div className="space-y-4">
              <CalendarNav
                onPrev={handlePrevMonth}
                onNext={handleNextMonth}
                onToday={handleToday}
              />

              {events
                .filter((event: any) => {
                  const eventDate = new Date(event.start.replace(':', ':')).getDate()
                  return eventDate === selectedDay
                })
                .map((event: any, index: number) => (
                  <Card
                    key={index}
                    className="p-3 rounded-lg border border-border flex items-start gap-3"
                    style={{ backgroundColor: event.color || '#F5F7FB' }}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-secondary truncate">{event.title}</p>
                      <p className="text-xs text-secondary">
                        {event.start} - {event.end}
                      </p>
                      {event.location && (
                        <p className="text-xs text-secondary">
                          {event.location}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}

              {events.length === 0 && (
                <p className="text-secondary text-sm text-center py-8">
                  Nenhum compromisso neste dia
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-font-medium text-secondary uppercase tracking-wider mb-3">Atalhos</h2>
            <div className="space-y-2">
              <Button variant="secondary" size="sm">Novo Compromisso</Button>
              <Button variant="secondary" size="sm">Importar CSV</Button>
              <Button variant="secondary" size="sm">Exportar .ics</Button>
            </div>
          </div>
        </div>
      </main>
    </section>
  )
}