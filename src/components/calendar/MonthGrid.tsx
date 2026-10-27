import { cn } from '@/lib/utils'
import { addDays, startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MonthGridProps {
  year: number
  month: number
  selectedDay?: number
  onDayClick: (day: number) => void
  events: Array<{ date: Date; title: string; category: string; allDay?: boolean }>
  holidays: Array<{ date: Date; name: string; scope: string }>
  showWeekNumbers?: boolean
}

export const MonthGrid = ({
  year,
  month,
  selectedDay,
  onDayClick,
  events,
  holidays,
  showWeekNumbers = false,
}: MonthGridProps) => {
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(new Date(year, month - 1)), end: endOfMonth(new Date(year, month - 1)) })
  const firstDayOfMonth = startOfMonth(new Date(year, month - 1)).getDay()

  const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: ptBR })

  // Group events by day
  const eventsByDay = new Map<number, Array<{ title: string; category: string; allDay?: boolean }>>()
  events.forEach(event => {
    const day = event.date.getDate()
    if (!eventsByDay.has(day)) {
      eventsByDay.set(day, [])
    }
    eventsByDay.get(day)!.push({
      title: event.title,
      category: event.category,
      allDay: event.allDay,
    })
  })

  // Group holidays by day
  const holidaysByDay = new Map<number, Array<{ name: string; scope: string }>>()
  holidays.forEach(holiday => {
    const day = holiday.date.getDate()
    if (!holidaysByDay.has(day)) {
      holidaysByDay.set(day, [])
    }
    holidaysByDay.get(day)!.push(holiday)
  })

  return (
    <div className="grid">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7">
        <div className="text-center text-sm font-medium text-secondary py-2">
          Dom
        </div>
        <div className="text-center text-sm font-medium text-secondary py-2">
          Seg
        </div>
        <div className="text-center text-sm font-medium text-secondary py-2">
          Ter
        </div>
        <div className="text-center text-sm font-medium text-secondary py-2">
          Qua
        </div>
        <div className="text-center text-sm font-medium text-secondary py-2">
        Qua
        </div>
        <div className="text-center text-sm font-medium text-secondary py-2">
          Sex
        </div>
        <div className="text-center text-sm font-medium text-secondary py-2">
          Sáb
        </div>
      </div>

      {/* Dias do mês */}
      <div className="grid grid-cols-7 gap-1">
        {/* Dias anteriores ao 1º dia do mês */}
        {[...Array(firstDayOfMonth).keys()].map(() => (
          <div key={i} className="h-14 w-12 border border-transparent bg-transparent" />
        ))}

        {daysInMonth.map(day => {
          const date = new Date(year, month - 1, day)
          const dayEvents = eventsByDay.get(day) || []
          const dayHolidays = holidaysByDay.get(day) || []
          const isCurrentMonth = date.getMonth() + 1 === month
          const isSelected = selectedDay === day
          const isToday = day === new Date().getDate() && month === new Date().getMonth() + 1 && year === new Date().getFullYear()
          const hasEvents = dayEvents.length > 0
          const hasHolidays = dayHolidays.length > 0

          return (
            <div
              key={day}
              className={cn(
                'h-14 w-12 rounded-md flex flex-col items-center justify-center',
                'border',
                isCurrentMonth ? 'border-border' : 'opacity-20',
                isSelected ? 'ring-2 ring-primary' : '',
                isToday ? 'ring-4 ring-primary/20' : '',
                hasEvents ? 'ring-1 ring-accent/30' : '',
                hasHolidays ? 'text-red-500' : '',
                'cursor-pointer hover:bg-primary/5 transition-colors'
              )}
              onClick={() => onDayClick(day)}
              title={isCurrentMonth ? `Dia ${day}` : ''}
            >
              <span className="text-xs font-medium">{day}</span>
              {isToday && <span className="text-xs text-primary font-bold absolute top-1 right-1">HOJE</span>}
              {isSelected && <span className="text-xs font-bold text-primary absolute top-1 left-1">SEL</span>}
              {hasEvents && (
                <div className="w-0.5 h-0.5 rounded-full bg-accent absolute bottom-1 left-1" />
              )}
              {hasHolidays && (
                <span className="text-xs text-red-500 absolute bottom-2 left-1">{dayHolidays[0]?.name?.substring(0, 3)}</span>
              )}
            </div>
          )
        })}

        {/* Dias posteriores ao último dia do mês */}
        {[...Array(42 - daysInMonth.length - firstDayOfMonth).keys()].map(() => (
          <div key={i} className="h-14 w-12 border border-transparent bg-transparent" />
        ))}
      </div>
    </div>
  )
}