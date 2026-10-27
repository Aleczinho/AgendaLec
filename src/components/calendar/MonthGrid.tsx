import { getMonthGridDates, isSameLocalDay } from '@/lib/calendarDates'

export interface CalendarEvent {
  id: string
  title: string
  start_at: string
  end_at?: string | null
  color?: string | null
  all_day?: boolean
  status?: string
  isRoutine?: boolean
  scheduleType?: 'fixed' | 'flexible' | 'optional'
  certainty?: 'confirmed' | 'planned' | 'possible'
}

interface MonthGridProps {
  year: number
  month: number
  selectedDate: Date
  events: CalendarEvent[]
  holidays?: Array<{ date: Date; name: string }>
  weekStartsOn?: 0 | 1
  onSelectDate: (date: Date) => void
  onSelectEvent: (event: CalendarEvent) => void
  onShowDay: (date: Date) => void
}

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const today = new Date()

export const MonthGrid = ({
  year,
  month,
  selectedDate,
  events,
  holidays = [],
  weekStartsOn = 0,
  onSelectDate,
  onSelectEvent,
  onShowDay,
}: MonthGridProps) => {
  const dates = getMonthGridDates(year, month, weekStartsOn)
  const days = [...weekdays.slice(weekStartsOn), ...weekdays.slice(0, weekStartsOn)]

  return (
    <div className="month-calendar" role="grid" aria-label="Calendário mensal">
      <div className="month-weekdays" role="row">
        {days.map((day, index) => (
          <div className="month-weekday" role="columnheader" key={`${day}-${index}`}>
            {day}
          </div>
        ))}
      </div>
      <div className="month-days">
        {dates.map(date => {
          const dateEvents = events.filter(event => isSameLocalDay(new Date(event.start_at), date))
          const dateHolidays = holidays.filter(holiday => isSameLocalDay(holiday.date, date))
          const isCurrentMonth = date.getMonth() === month - 1
          const isToday = isSameLocalDay(today, date)
          const isSelected = isSameLocalDay(selectedDate, date)
          const visibleEvents = dateEvents.slice(0, 2)

          return (
            <section
              className={[
                'month-day',
                !isCurrentMonth && 'month-day-outside',
                isToday && 'month-day-today',
                isSelected && 'month-day-selected',
              ].filter(Boolean).join(' ')}
              role="gridcell"
              aria-label={date.toLocaleDateString('pt-BR', { dateStyle: 'full' })}
              key={date.toISOString()}
            >
              <button
                type="button"
                className="month-day-number"
                aria-label={`Selecionar ${date.toLocaleDateString('pt-BR', { dateStyle: 'full' })}`}
                aria-pressed={isSelected}
                onClick={() => onSelectDate(date)}
              >
                {date.getDate()}
              </button>
              <div className="month-day-events">
                {dateHolidays.map((holiday, index) => (
                  <span className="month-holiday" key={`${holiday.name}-${index}`} title={holiday.name}>
                    {holiday.name}
                  </span>
                ))}
                {visibleEvents.map(event => (
                  <button
                    type="button"
                    className={[
                      'month-event',
                      event.isRoutine && 'month-event-routine',
                      !event.isRoutine && event.certainty === 'possible' && 'month-event-possible',
                    ].filter(Boolean).join(' ')}
                    key={event.id}
                    title={event.title}
                    onClick={() => onSelectEvent(event)}
                    style={{ borderInlineStartColor: event.color || 'var(--color-primary)' }}
                  >
                    {event.title}
                  </button>
                ))}
                {dateEvents.length > visibleEvents.length && (
                  <button
                    type="button"
                    className="month-more-events"
                    onClick={() => onShowDay(date)}
                    aria-label={`Ver mais ${dateEvents.length - visibleEvents.length} compromissos`}
                  >
                    +{dateEvents.length - visibleEvents.length} mais
                  </button>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
