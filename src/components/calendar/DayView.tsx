import { cn } from '@/lib/utils'

interface DayEvent {
  title: string
  start: string
  end: string
  category: string
  location?: string
  allDay: boolean
}

interface DayViewProps {
  date: Date
  events: DayEvent[]
  onEdit: (event: DayEvent) => void
  onDelete: (eventId: string) => void
  onToggleComplete: (eventId: string) => void
}

export const DayView = ({
  date,
  events,
  onEdit,
  onDelete,
  onToggleComplete,
}: DayViewProps) => {
  const sortedEvents = [...events].sort((a, b) => {
    return a.start.localeCompare(b.start)
  })

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pb-3 border-b border-border">
        <h2 className="text-xl font-bold">
          {date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h2>

        <button className="p-2 rounded-md hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          +
        </button>
      </header>

      {sortedEvents.length === 0 ? (
        <p className="text-secondary text-sm py-8 text-center">
          Nenhum compromisso neste dia
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {sortedEvents.map((event, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border border-border flex flex-col gap-2 min-h-[80px]"
              style={{ backgroundColor: event.category.color }}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-white line-clamp-1 line-clamp-{event.allDay ? 2 : 3}">
                  {event.title}
                </h3>

                <small className="text-xs text-white/80">
                  {event.allDay ? 'Todo dia' : `${event.start} - ${event.end}`}
                </small>
              </div>

              <p className="text-xs text-white/70 line-clamp-1">
                {event.location || ''}
              </p>

              <div className="flex items-center gap-2 mt-auto">
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: event.category.color === 'green' ? '#10B981' : event.category.color === 'orange' ? '#F59E0B' : event.category.color === 'red' ? '#EF4444' : event.category.color === 'purple' ? '#A78BFA' : '#3B82F6' }} />

                <button
                  onClick={() => onEdit(event)}
                  className="text-xs text-white/70 hover:text-white transition-colors"
                  title="Editar"
                >
                  ✎
                </button>

                <button
                  onClick={() => onToggleComplete(event.title)}
                  className="text-xs text-green-400 hover:text-green-300 transition-colors"
                  title="Concluir"
                >
                  ✓
                </button>

                <button
                  onClick={() => onDelete(event.title)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  title="Excluir"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}