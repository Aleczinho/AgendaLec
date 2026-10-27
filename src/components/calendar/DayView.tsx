import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, MapPin, Pencil, Trash2 } from 'lucide-react'

interface DayEvent {
  id: string
  title: string
  date: Date
  start: string
  end: string
  category: string
  location?: string
  allDay: boolean
  color?: string
  status?: string
  isRoutine?: boolean
  scheduleType?: 'fixed' | 'flexible' | 'optional'
}

interface DayViewProps {
  date: Date
  events: DayEvent[]
  onEdit: (event: DayEvent) => void
  onDelete: (eventId: string) => void
  onToggleComplete: (eventId: string) => void
  onCreateEvent: (date: Date) => void
}

export const DayView = ({
  date,
  events,
  onEdit,
  onDelete,
  onToggleComplete,
  onCreateEvent,
}: DayViewProps) => {
  const sortedEvents = [...events].sort((a, b) => a.start.localeCompare(b.start))

  return (
    <section className="day-calendar" aria-label="Visualização diária">
      <header className="calendar-view-heading">
        <h2>{format(date, 'EEEE, d MMMM yyyy', { locale: ptBR })}</h2>
        <button type="button" className="btn btn-primary" onClick={() => onCreateEvent(date)}>
          Adicionar compromisso
        </button>
      </header>

      {sortedEvents.length === 0 ? (
        <div className="calendar-empty">
          <p>Nenhum compromisso neste dia.</p>
          <button type="button" className="btn btn-secondary" onClick={() => onCreateEvent(date)}>
            Criar primeiro compromisso
          </button>
        </div>
      ) : (
        <div className="day-event-list">
          {sortedEvents.map(event => (
            <article className={`day-event${event.isRoutine ? ' day-event-routine' : ''}`} key={event.id}>
              <span className="day-event-color" style={{ backgroundColor: event.color || 'var(--color-primary)' }} />
              <div className="day-event-time">{event.allDay ? 'Dia inteiro' : `${event.start}${event.end ? ` – ${event.end}` : ''}`}</div>
              <div className="day-event-content">
                <h3>{event.title}</h3>
                {event.category && <p>{event.category}{event.isRoutine && event.scheduleType ? ` · ${event.scheduleType === 'fixed' ? 'Rotina fixa' : event.scheduleType === 'flexible' ? 'Rotina flexível' : 'Rotina opcional'}` : ''}</p>}
                {event.location && <p className="day-event-location"><MapPin size={14} />{event.location}</p>}
              </div>
              <div className="day-event-actions">
                {event.isRoutine ? (
                  <button type="button" onClick={() => onEdit(event)} aria-label={`Editar ${event.title} na rotina`} title="Editar na rotina">
                    <Pencil size={16} />
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => onEdit(event)} aria-label={`Editar ${event.title}`} title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleComplete(event.id)}
                      aria-label={event.status === 'completed' ? `Reabrir ${event.title}` : `Concluir ${event.title}`}
                      title={event.status === 'completed' ? 'Reabrir' : 'Concluir'}
                    >
                      <Check size={17} />
                    </button>
                    <button type="button" onClick={() => onDelete(event.id)} aria-label={`Excluir ${event.title}`} title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
