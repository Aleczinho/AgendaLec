import { cn } from '@/lib/utils'
import { format, startOfWeek, endOfWeek, eachDayOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WeekEvent {
  title: string
  start: string
  end: string
  category: string
  allDay: boolean
}

interface WeekViewProps {
  year: number
  month: number
  day: number
  events: WeekEvent[]
  onEdit: (event: WeekEvent) => void
  onDelete: (eventId: string) => void
}

export const WeekView = ({
  year,
  month,
  day,
  events,
  onEdit,
  onDelete,
}: WeekViewProps) => {
  const start = startOfWeek(new Date(year, month - 1, day), { weekStartsOn: 1, locale: ptBR })
  const end = endOfWeek(start, { weekStartsOn: 1, locale: ptBR })
  const days = eachDayOfWeek(start, end, { weekStartsOn: 1, locale: ptBR })

  const dayEvents = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start)
      return eventDate >= start && eventDate <= end
    })
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pb-3 border-b border-border">
        <h2 className="text-xl font-bold">
          {format(start, 'PPpp', { locale: ptBR })} - {format(end, 'PPpp', { locale: ptBR })}
        </h2>

        <button className="p-2 rounded-md hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          +
        </button>
      </header>

      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const dayNum = day.getDate()
          const dayEventList = dayEvents(day)
          const hasEvents = dayEventList.length > 0

          return (
            <div
              key={dayNum}
              className={cn(
                'h-24 w-12 rounded-md flex flex-col items-center justify-center border',
                'border-border',
                'bg-primary/5',
                hasEvents ? 'ring-1 ring-accent/30' : '',
                'cursor-pointer hover:bg-primary/10 transition-colors'
              )}
            >
              <span className="text-xs font-medium">{dayNum}</span>
              {hasEvents && (
                <div className="w-0.5 h-0.5 rounded-full bg-accent absolute bottom-1 left-1" />
              )}
            </div>
          )
        })}
      </div>

      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Eventos da semana</h3>
          <div className="space-y-2">
            {events.slice(0, 10).map((event, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded-lg bg-secondary/5"
                style={{ backgroundColor: event.category.color }}
              >
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: event.category.color === 'green' ? '#10B981' : event.category.color === 'orange' ? '#F59E0B' : event.category.color === 'red' ? '#EF4444' : event.category.color === 'purple' ? '#A78BFA' : '#3B82F6' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-secondary truncate">
                    {event.title}
                  </p>
                  <p className="text-xs text-secondary">
                    {event.allDay ? 'Todo dia' : `${event.start} - ${event.end}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}