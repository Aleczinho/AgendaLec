import { eachDayOfInterval, endOfWeek, format, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WeekEvent {
  id: string
  title: string
  date: Date
  start: string
  end: string
  category: string
  allDay: boolean
  color?: string
  isRoutine?: boolean
  scheduleType?: 'fixed' | 'flexible' | 'optional'
  status?: string
}

interface WeekViewProps {
  date: Date
  events: WeekEvent[]
  weekStartsOn: 0 | 1
  onSelectDay: (date: Date) => void
  onCreateEvent: (date: Date) => void
  onEdit: (event: WeekEvent) => void
}

export const WeekView = ({
  date,
  events,
  weekStartsOn,
  onSelectDay,
  onCreateEvent,
  onEdit,
}: WeekViewProps) => {
  const start = startOfWeek(date, { weekStartsOn })
  const end = endOfWeek(date, { weekStartsOn })
  const days = eachDayOfInterval({ start, end })

  return (
    <section className="week-calendar" aria-label="Visualização semanal">
      <header className="calendar-view-heading">
        <h2>{format(start, 'd MMM', { locale: ptBR })} – {format(end, 'd MMM yyyy', { locale: ptBR })}</h2>
      </header>
      <div className="week-days">
        {days.map(day => {
          const dayEvents = events.filter(event =>
            event.date.getFullYear() === day.getFullYear()
            && event.date.getMonth() === day.getMonth()
            && event.date.getDate() === day.getDate(),
          )

          return (
            <section className="week-day" key={day.toISOString()}>
              <button
                type="button"
                className="week-day-heading"
                onClick={() => onSelectDay(day)}
                aria-label={`Ver ${format(day, 'EEEE, d MMMM', { locale: ptBR })}`}
              >
                <span>{format(day, 'EEE', { locale: ptBR })}</span>
                <strong>{format(day, 'd')}</strong>
              </button>
              <div className="week-day-events">
                {dayEvents.map(event => (
                  <button
                    type="button"
                    className={`week-event${event.isRoutine ? ' week-event-routine' : ''}${event.status === 'possible' ? ' status-possible' : ''}`}
                    key={event.id}
                    onClick={() => onEdit(event)}
                    style={{ borderInlineStartColor: event.color || 'var(--color-primary)' }}
                  >
                    <strong>{event.title}</strong>
                    <span>{event.allDay ? 'Dia inteiro' : event.start}</span>
                  </button>
                ))}
                {dayEvents.length === 0 && <span className="week-empty">Sem compromissos</span>}
              </div>
              <button
                type="button"
                className="week-add-event"
                onClick={() => onCreateEvent(day)}
                aria-label={`Adicionar compromisso em ${format(day, 'd MMMM', { locale: ptBR })}`}
              >
                + Adicionar
              </button>
            </section>
          )
        })}
      </div>
    </section>
  )
}
