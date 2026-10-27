import { Link } from 'react-router-dom'
import { CalendarDays, CircleAlert } from 'lucide-react'
import { useCalendar } from '@/app/providers/CalendarProvider'
import { findRoutineConflicts, generateRoutineOccurrences, routineTimeLabel } from '@/lib/routines'
import { formatClock } from '@/lib/timeFormat'

const DashboardPage = () => {
  const { events, routineRules, routineExceptions, timeFormat, isLoadingCalendarData, calendarDataError, routineDataError } = useCalendar()
  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  const routineOccurrences = generateRoutineOccurrences(routineRules, routineExceptions, today, end)
  const actualEvents = events.filter(event => {
    const date = new Date(event.start_at)
    const eventEnd = event.end_at ? new Date(event.end_at) : null
    return (date >= today && date <= end || eventEnd && eventEnd >= today && date <= end)
      && event.status !== 'cancelled'
  })
  const upcoming = [
    ...routineOccurrences
      .filter(item => item.status !== 'possible' && item.status !== 'cancelled' && item.status !== 'skipped')
      .map(item => ({ key: item.id, title: item.title, date: item.date, time: routineTimeLabel(item, timeFormat), type: 'Rotina' })),
    ...actualEvents.map(event => ({
      key: event.id,
      title: event.title,
      date: event.start_at.slice(0, 10),
      time: event.all_day ? 'Dia inteiro' : formatClock(event.start_at, timeFormat),
      type: event.certainty === 'possible' ? 'Possível' : event.certainty === 'planned' ? 'Previsto' : 'Confirmado',
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 8)
  const conflicts = findRoutineConflicts(routineOccurrences)
  const possibleItems = routineOccurrences.filter(item => item.status === 'possible')

  return (
    <section className="dashboard-page">
      <header className="page-heading">
        <div><p className="eyebrow">Seu planejamento</p><h1>Visão geral</h1><p className="page-subtitle">Acompanhe seus próximos compromissos e situações importantes.</p></div>
      </header>
      {calendarDataError && <p role="alert" className="inline-error">{calendarDataError}</p>}
      {routineDataError && <p role="alert" className="inline-error">{routineDataError}</p>}
      {isLoadingCalendarData && <p role="status" className="calendar-loading">Carregando seus compromissos...</p>}
      <div className="dashboard-panels">
        <section className="dashboard-panel">
          <header><h2><CalendarDays size={17} /> Próximos compromissos</h2><Link to="/calendar">Abrir calendário</Link></header>
          {upcoming.length === 0
            ? <p className="routine-empty">Nenhum compromisso para os próximos dias.</p>
            : <ul className="dashboard-upcoming">{upcoming.map(item => (
                <li key={item.key}><span>{new Date(`${item.date}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span><strong>{item.title}</strong><small>{item.time} · {item.type}</small></li>
              ))}</ul>}
        </section>
        <section className="dashboard-panel">
          <header><h2><CircleAlert size={17} /> Situações da rotina</h2><Link to="/routine">Ver rotina</Link></header>
          {[...conflicts.map(({ first, second }) => `Possível conflito: ${first.title} pode coincidir com ${second.title}.`), ...possibleItems.map(item => `${item.title}: data pendente de confirmação.`)].length === 0
            ? <p className="routine-empty">Nenhuma situação requer atenção nesta semana.</p>
            : <ul className="dashboard-situations">
                {conflicts.map(({ first, second }) => <li key={`${first.id}-${second.id}`}>Possível conflito: {first.title} pode coincidir com {second.title}.</li>)}
                {possibleItems.map(item => <li key={item.id}>{item.title}: data pendente de confirmação.</li>)}
              </ul>}
        </section>
      </div>
    </section>
  )
}

export { DashboardPage }
