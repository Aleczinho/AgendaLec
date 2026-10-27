import { cn } from '@/lib/utils'

interface Event {
  title: string
  time: string
  category: string
}

interface NextEventsProps {
  events: Event[]
  showMore?: boolean
}

export const NextEvents = ({
  events,
  showMore = false,
}: NextEventsProps) => {
  const displayEvents = showMore ? events : events.slice(0, 3)

  return (
    <div className="space-y-3 max-w-xs">
      {displayEvents.map((event, index) => (
        <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-secondary truncate">{event.title}</p>
            <p className="text-xs">{event.time}</p>
          </div>
        </div>
      ))}

      {showMore && events.length > 3 && (
        <div className="text-xs text-secondary cursor-pointer hover:text-primary">
          Ver todos {events.length - 3}+ eventos
        </div>
      )}
    </div>
  )
}