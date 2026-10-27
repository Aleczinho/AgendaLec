import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface Event {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string
  category: string
  status: 'pending' | 'completed' | 'cancelled'
  calendarId?: string
  color?: string
}

interface EventListProps {
  events: Event[]
  onEdit?: (event: Event) => void
  onDelete?: (eventId: string) => void
  onToggleComplete?: (eventId: string) => void
  showStatus?: boolean
}

export const EventList = ({
  events,
  onEdit,
  onDelete,
  onToggleComplete,
  showStatus = true,
}: EventListProps) => {
  const sortedEvents = [...events].sort((a, b) => {
    return a.start.localeCompare(b.start)
  })

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide">
      {sortedEvents.length === 0 ? (
        <p className="text-secondary text-sm py-8 text-center">
          Nenhum evento
        </p>
      ) : (
        <div>
          {sortedEvents.map((event, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border border-border flex items-start gap-3 cursor-pointer hover:bg-primary/5 transition-colors"
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3B82F6' }} />

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: event.color || '#3B82F6' }} />
                  <div className="flex-1">
                    <p className="font-medium truncate">{event.title}</p>
                    {event.location && (
                      <p className="text-xs text-secondary">
                        {event.location}
                      </p>
                    )}
                  </div>
                </div>

                {showStatus && (
                  <p className="text-xs text-secondary">
                    {event.status === 'pending' ? 'Pendente' : event.status === 'completed' ? 'Concluído' : 'Cancelado'}
                  </p>
                )}
              </div>

              <div className="ml-auto text-xs text-secondary">
                {event.start}
              </div>

              {(onEdit || onDelete || onToggleComplete) && (
                <div className="ml-2 text-xs">
                  {onEdit && (
                    <button onClick={() => onEdit(event)} className="text-primary hover/underline">Editar</button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(event.id)}
                      className="text-red-600 hover/underline"
                      title="Excluir"
                    >
                      Excluir
                    </button>
                  )}
                  {onToggleComplete && event.status === 'pending' && (
                    <button
                      onClick={() => onToggleComplete(event.id)}
                      className="text-green-600 hover/underline"
                      title="Concluir"
                    >
                      Concluir
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}