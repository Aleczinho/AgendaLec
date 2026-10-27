import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DayView } from '@/components/calendar/DayView'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { WeekView } from '@/components/calendar/WeekView'
import type { CalendarEvent } from '@/components/calendar/MonthGrid'
import { EventForm, type EventFormValues } from '@/components/events/EventForm'
import { useCalendar } from '@/app/providers/CalendarProvider'
import { combineLocalDateTime } from '@/lib/dates'
import { formatDateInput, parseDateInput } from '@/lib/dateInput'
import { isSameLocalDay, shiftMonth } from '@/lib/calendarDates'
import { getMonthGridDates } from '@/lib/calendarDates'
import { generateRoutineOccurrences, routineTimeLabel } from '@/lib/routines'
import { errorMessage as formatErrorMessage } from '@/lib/errors'
import { formatClock } from '@/lib/timeFormat'

export const CalendarPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    month,
    setMonth,
    year,
    setYear,
    selectedDay,
    setSelectedDay,
    view,
    setView,
    weekStartsOn,
    timeFormat,
    events: records,
    holidays: holidayRecords,
    isLoadingCalendarData,
    calendarDataError,
    routineDataError,
    routineRules,
    routineExceptions,
    saveEvent,
    updateEvent,
    deleteEvent,
    toggleEventStatus,
  } = useCalendar()
  const eventTime = (date: string | null) => formatClock(date, timeFormat)
  const [isCreating, setIsCreating] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [draftDate, setDraftDate] = useState(() => new Date(year, month - 1, selectedDay))
  const [errorMessage, setErrorMessage] = useState('')

  const selectedDate = new Date(year, month - 1, selectedDay)
  const events = useMemo(() => records.map(event => ({
      id: event.id,
      title: event.title,
      date: new Date(event.start_at),
      category: event.category ?? '',
      start: eventTime(event.start_at),
      end: eventTime(event.end_at),
      allDay: Boolean(event.all_day),
      color: event.color ?? undefined,
      location: event.location ?? undefined,
      status: event.status ?? 'pending',
    })), [records, timeFormat])
  const monthEvents: CalendarEvent[] = useMemo(() => records.map(event => ({
      id: event.id,
      title: event.title,
      start_at: event.start_at,
      end_at: event.end_at,
      color: event.color,
      all_day: event.all_day,
      status: event.status,
      certainty: event.certainty ?? 'confirmed',
    })), [records])
  const monthGridDates = getMonthGridDates(year, month, weekStartsOn)
  const visibleRoutineOccurrences = generateRoutineOccurrences(
    routineRules,
    routineExceptions,
    monthGridDates[0] ?? selectedDate,
    monthGridDates[monthGridDates.length - 1] ?? selectedDate,
  )
  const routineDate = (date: string, time: string | null) => new Date(`${date}T${(time ?? '00:00').slice(0, 5)}:00`)
  const monthRoutineEvents: CalendarEvent[] = visibleRoutineOccurrences
    .filter(occurrence => occurrence.status !== 'cancelled' && occurrence.status !== 'skipped')
    .map(occurrence => ({
      id: occurrence.id,
      title: occurrence.title,
      start_at: `${occurrence.date}T${(occurrence.startTime ?? occurrence.startEarliest ?? '00:00').slice(0, 5)}:00`,
      color: occurrence.status === 'possible' ? '#9a91a8' : '#6258d9',
      status: occurrence.status,
      isRoutine: true,
      scheduleType: occurrence.scheduleType,
    }))
  const viewRoutineEvents = visibleRoutineOccurrences
    .filter(occurrence => occurrence.status !== 'cancelled' && occurrence.status !== 'skipped')
    .map(occurrence => ({
      id: occurrence.id,
      title: occurrence.title,
      date: routineDate(occurrence.date, occurrence.startTime ?? occurrence.startEarliest),
      category: occurrence.category,
      start: routineTimeLabel(occurrence, timeFormat),
      end: '',
      allDay: false,
      color: occurrence.status === 'possible' ? '#9a91a8' : '#6258d9',
      status: occurrence.status,
      isRoutine: true,
      scheduleType: occurrence.scheduleType,
    }))
  const viewEvents = [...events, ...viewRoutineEvents]
  const holidays = holidayRecords.map(holiday => ({
    date: new Date(`${holiday.date}T00:00:00`),
    name: holiday.name,
  }))

  const selectDate = (date: Date) => {
    setYear(date.getFullYear())
    setMonth(date.getMonth() + 1)
    setSelectedDay(date.getDate())
  }

  const movePeriod = (amount: number) => {
    const nextDate = new Date(selectedDate)
    if (view === 'day') nextDate.setDate(nextDate.getDate() + amount)
    else if (view === 'week') nextDate.setDate(nextDate.getDate() + amount * 7)
    else {
      const next = shiftMonth(year, month, amount)
      setYear(next.year)
      setMonth(next.month)
      return
    }
    selectDate(nextDate)
  }

  const handleToday = () => selectDate(new Date())
  const openCreate = (date = selectedDate) => {
    setErrorMessage('')
    setDraftDate(date)
    setEditingEventId(null)
    setIsCreating(true)
  }

  useEffect(() => {
    if (searchParams.get('new') !== 'event') return

    const dateValue = searchParams.get('date')
    let date = selectedDate
    if (dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const [dateYear, dateMonth, dateDay] = dateValue.split('-').map(Number)
      const parsedDate = new Date(dateYear, dateMonth - 1, dateDay)
      if (
        parsedDate.getFullYear() === dateYear
        && parsedDate.getMonth() === dateMonth - 1
        && parsedDate.getDate() === dateDay
      ) date = parsedDate
    }

    setYear(date.getFullYear())
    setMonth(date.getMonth() + 1)
    setSelectedDay(date.getDate())
    setDraftDate(date)
    setEditingEventId(null)
    setErrorMessage('')
    setIsCreating(true)
    setSearchParams({}, { replace: true })
  }, [searchParams, selectedDate, setSearchParams])
  const openEdit = (event: { id: string; isRoutine?: boolean; date?: Date }) => {
    if (event.isRoutine && event.date) {
      const date = `${event.date.getFullYear()}-${String(event.date.getMonth() + 1).padStart(2, '0')}-${String(event.date.getDate()).padStart(2, '0')}`
      navigate(`/routine?date=${date}`)
      return
    }
    setErrorMessage('')
    setEditingEventId(event.id)
    setIsCreating(true)
  }

  useEffect(() => {
    if (!isCreating) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCreating(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isCreating])

  const editingRecord = records.find(event => event.id === editingEventId)

  const handleSave = async (values: EventFormValues) => {
    setErrorMessage('')
    const eventDate = parseDateInput(values.date)
    if (!eventDate) throw new Error('Informe uma data válida no formato dd/mm/aa.')
    const payload = {
      title: values.title,
      description: values.description || null,
      category: values.category,
      calendar_id: editingRecord?.calendar_id ?? null,
      start_at: combineLocalDateTime(eventDate, values.all_day ? '00:00' : values.start_time),
      end_at: values.all_day || !values.end_time ? null : combineLocalDateTime(eventDate, values.end_time),
      all_day: values.all_day,
      location: values.location || null,
      color: editingRecord?.color ?? null,
      status: editingRecord?.status ?? 'pending',
      certainty: values.certainty,
      notes: editingRecord?.notes ?? null,
      recurrence_rule: editingRecord?.recurrence_rule ?? null,
    }

    try {
      if (editingEventId) await updateEvent(editingEventId, payload)
      else await saveEvent(payload)
      setIsCreating(false)
      setEditingEventId(null)
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, 'Não foi possível salvar o compromisso.'))
      throw error
    }
  }

  const editingDate = editingRecord ? new Date(editingRecord.start_at) : null
  const initialData: EventFormValues = editingRecord && editingDate
    ? {
        title: editingRecord.title,
        description: editingRecord.description ?? '',
        date: formatDateInput(new Date(Date.UTC(editingDate.getFullYear(), editingDate.getMonth(), editingDate.getDate()))),
        start_time: eventTime(editingRecord.start_at),
        end_time: eventTime(editingRecord.end_at),
        category: editingRecord.category ?? 'outros',
        all_day: Boolean(editingRecord.all_day),
        certainty: editingRecord.certainty ?? 'confirmed',
        location: editingRecord.location ?? '',
      }
    : {
        title: '',
        description: '',
        date: formatDateInput(new Date(Date.UTC(draftDate.getFullYear(), draftDate.getMonth(), draftDate.getDate()))),
        start_time: '',
        end_time: '',
        category: 'rotina',
        all_day: false,
        certainty: 'confirmed',
        location: '',
      }

  const heading = view === 'month'
    ? new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  const handleDelete = (eventId: string) => {
    if (!window.confirm('Deseja excluir este compromisso?')) return
    void deleteEvent(eventId).catch(error => {
      setErrorMessage(formatErrorMessage(error, 'Não foi possível excluir o compromisso.'))
    })
  }

  const handleToggleComplete = (eventId: string) => {
    const record = records.find(event => event.id === eventId)
    if (!record) return
    void toggleEventStatus(eventId, record.status === 'completed' ? 'pending' : 'completed').catch(error => {
      setErrorMessage(formatErrorMessage(error, 'Não foi possível atualizar o compromisso.'))
    })
  }

  return (
    <section className="calendar-page">
      <header className="page-heading calendar-page-heading">
        <div>
          <p className="eyebrow">Sua rotina, em um só lugar</p>
          <h1>Calendário</h1>
          <p className="page-subtitle">Adicione compromissos pontuais aqui. Para afazeres que se repetem, use Rotina.</p>
        </div>
        <button type="button" className="btn btn-primary calendar-create-button" onClick={() => openCreate()} aria-label="Adicionar compromisso">
          <Plus size={18} /> <span>Adicionar compromisso</span>
        </button>
      </header>

      <section className="calendar-panel" aria-label="Calendário">
        <div className="calendar-toolbar">
          <div className="calendar-period-controls">
            <button type="button" className="icon-button" onClick={() => movePeriod(-1)} aria-label="Período anterior">
              <ChevronLeft size={19} />
            </button>
            <button type="button" className="icon-button" onClick={() => movePeriod(1)} aria-label="Próximo período">
              <ChevronRight size={19} />
            </button>
            <button type="button" className="btn btn-secondary today-button" onClick={handleToday}>Hoje</button>
            <h2 className="calendar-period-title">{heading}</h2>
          </div>
          <div className="calendar-toolbar-options">
            <div className="calendar-view-switcher" role="group" aria-label="Visualização do calendário">
              {(['month', 'week', 'day'] as const).map(option => (
                <button
                  type="button"
                  key={option}
                  className={view === option ? 'calendar-view-option is-active' : 'calendar-view-option'}
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                >
                  {option === 'month' ? 'Mês' : option === 'week' ? 'Semana' : 'Dia'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {calendarDataError && <p role="alert" className="inline-error">{calendarDataError} Atualize a página ou tente novamente.</p>}
        {routineDataError && <p role="alert" className="inline-error">{routineDataError}</p>}
        {errorMessage && <p role="alert" className="inline-error">{errorMessage}</p>}
        {isLoadingCalendarData && <p role="status" className="calendar-loading">Carregando compromissos...</p>}
        {!isLoadingCalendarData && !calendarDataError && !routineDataError && records.length === 0 && visibleRoutineOccurrences.length === 0 && (
          <div className="calendar-no-events" role="status">
            <p>Ainda não há compromissos neste período. Use “Adicionar compromisso” para criar um.</p>
          </div>
        )}

        {view === 'month' && (
          <MonthGrid
            year={year}
            month={month}
            selectedDate={selectedDate}
            events={[...monthEvents, ...monthRoutineEvents]}
            holidays={holidays}
            weekStartsOn={weekStartsOn}
            onSelectDate={selectDate}
            onSelectEvent={event => {
              if (event.isRoutine) {
                const date = event.start_at.slice(0, 10)
                navigate(`/routine?date=${date}`)
              } else openEdit(event)
            }}
            onShowDay={date => { selectDate(date); setView('day') }}
          />
        )}
        {view === 'week' && (
          <WeekView
            date={selectedDate}
            events={viewEvents}
            weekStartsOn={weekStartsOn}
            onSelectDay={date => { selectDate(date); setView('day') }}
            onCreateEvent={openCreate}
            onEdit={event => {
              if (event.isRoutine) navigate(`/routine?date=${event.date.getFullYear()}-${String(event.date.getMonth() + 1).padStart(2, '0')}-${String(event.date.getDate()).padStart(2, '0')}`)
              else openEdit(event)
            }}
          />
        )}
        {view === 'day' && (
          <DayView
            date={selectedDate}
            events={viewEvents.filter(event => isSameLocalDay(event.date, selectedDate))}
            onEdit={event => {
              if (event.isRoutine) navigate(`/routine?date=${event.date.getFullYear()}-${String(event.date.getMonth() + 1).padStart(2, '0')}-${String(event.date.getDate()).padStart(2, '0')}`)
              else openEdit(event)
            }}
            onDelete={handleDelete}
            onToggleComplete={handleToggleComplete}
            onCreateEvent={openCreate}
          />
        )}
      </section>

      {isCreating && (
        <div
          className="event-modal-backdrop"
          onMouseDown={event => { if (event.target === event.currentTarget) setIsCreating(false) }}
        >
          <section className="event-modal" role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
            <EventForm
              key={editingEventId ?? `new-${draftDate.toISOString()}`}
              initialData={initialData}
              mode={editingEventId ? 'edit' : 'create'}
              onSubmit={handleSave}
              onClose={() => { setIsCreating(false); setEditingEventId(null) }}
            />
          </section>
        </div>
      )}
    </section>
  )
}
