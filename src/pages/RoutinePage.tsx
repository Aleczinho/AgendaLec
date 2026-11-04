import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3, Copy, Pencil, Pause, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCalendar } from '@/app/providers/CalendarProvider'
import {
  dateToLocalISO,
  findRoutineConflicts,
  generateRoutineOccurrences,
  routineTimeLabel,
} from '@/lib/routines'
import type { RoutineExceptionAction, RoutineOccurrence, RoutineRule, RoutineScheduleType } from '@/lib/routines'
import { initializeRoutineForUser } from '@/services/routineService'
import { formatClock } from '@/lib/timeFormat'

const weekdays = [
  { index: 1, short: 'Seg', name: 'Segunda' },
  { index: 2, short: 'Ter', name: 'Terça' },
  { index: 3, short: 'Qua', name: 'Quarta' },
  { index: 4, short: 'Qui', name: 'Quinta' },
  { index: 5, short: 'Sex', name: 'Sexta' },
  { index: 6, short: 'Sáb', name: 'Sábado' },
  { index: 0, short: 'Dom', name: 'Domingo' },
]

const timeValue = (value: string | null | undefined) => value?.slice(0, 5) ?? ''
const messageForError = (error: unknown) =>
  error instanceof Error ? error.message : 'Não foi possível concluir a operação.'
const localDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const startOfMondayWeek = (date: Date) => {
  const start = localDate(date)
  start.setDate(start.getDate() - (start.getDay() + 6) % 7)
  return start
}
const plusDays = (date: Date, count: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + count)
  return next
}
const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) =>
  date.toLocaleDateString('pt-BR', options)

interface RuleDraft {
  title: string
  description: string
  category: string
  weekdays: number[]
  start_time: string
  end_time: string
  schedule_type: RoutineScheduleType
  recurrence_interval_weeks: number
  recurrence_anchor_date: string
  valid_from: string
}

const blankDraft = (date: string): RuleDraft => ({
  title: '',
  description: '',
  category: 'rotina',
  weekdays: [1, 2, 3, 4, 5],
  start_time: '',
  end_time: '',
  schedule_type: 'flexible',
  recurrence_interval_weeks: 1,
  recurrence_anchor_date: '',
  valid_from: date,
})

const toDraft = (rule: RoutineRule): RuleDraft => ({
  title: rule.title,
  description: rule.description ?? '',
  category: rule.category,
  weekdays: rule.weekdays,
  start_time: timeValue(rule.start_time ?? rule.start_time_earliest ?? rule.start_time_latest),
  end_time: timeValue(rule.end_time ?? rule.end_time_earliest ?? rule.end_time_latest),
  schedule_type: rule.schedule_type,
  recurrence_interval_weeks: rule.recurrence_interval_weeks,
  recurrence_anchor_date: rule.recurrence_anchor_date ?? '',
  valid_from: rule.valid_from,
})

const RoutinePage = () => {
  const navigate = useNavigate()
  const {
    month,
    setMonth,
    year,
    setYear,
    selectedDay,
    setSelectedDay,
    user,
    events,
    holidays,
    routineRules,
    routineExceptions,
    timeFormat,
    isLoadingCalendarData,
    calendarDataError,
    routineDataError,
    saveRoutineRule,
    updateRoutineRule,
    deleteRoutineRule,
    saveRoutineException,
    deleteRoutineException,
    copyRoutineWeekday,
    confirmRoutineOccurrence,
    loadRoutineRules,
    loadHolidays,
  } = useCalendar()
  const [searchParams] = useSearchParams()
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [editingRule, setEditingRule] = useState<RoutineRule | null>(null)
  const [editingOccurrence, setEditingOccurrence] = useState<RoutineOccurrence | null>(null)
  const [draft, setDraft] = useState<RuleDraft>(() => blankDraft('2026-11-01'))
  const [isSeeding, setIsSeeding] = useState(false)
  const [pageError, setPageError] = useState('')
  const [notice, setNotice] = useState('')
  const [copySource, setCopySource] = useState(1)
  const [copyTarget, setCopyTarget] = useState(2)

  useEffect(() => {
    const dateParam = searchParams.get('date')
    if (!dateParam) return
    const parsedDate = new Date(`${dateParam}T00:00:00`)
    if (Number.isNaN(parsedDate.getTime())) return
    setYear(parsedDate.getFullYear())
    setMonth(parsedDate.getMonth() + 1)
    setSelectedDay(parsedDate.getDate())
  }, [searchParams, setMonth, setSelectedDay, setYear])

  const selectedDate = new Date(year, month - 1, selectedDay)
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)
  const occurrences = useMemo(
    () => generateRoutineOccurrences(routineRules, routineExceptions, monthStart, monthEnd),
    [monthEnd.getTime(), monthStart.getTime(), routineExceptions, routineRules],
  )
  const weekStart = startOfMondayWeek(selectedDate)
  const weekEnd = plusDays(weekStart, 6)
  const weekDays = Array.from({ length: 7 }, (_, index) => plusDays(weekStart, index))
  const weeklyOccurrences = useMemo(
    () => generateRoutineOccurrences(routineRules, routineExceptions, weekStart, weekEnd),
    [routineExceptions, routineRules, weekEnd.getTime(), weekStart.getTime()],
  )
  const dayOccurrences = occurrences.filter(occurrence => occurrence.date === dateToLocalISO(selectedDate))
  const dayEvents = events.filter(event => {
    const eventDate = new Date(event.start_at)
    return eventDate.getFullYear() === year
      && eventDate.getMonth() === month - 1
      && eventDate.getDate() === selectedDay
  })
  const dayHolidays = holidays.filter(holiday => holiday.date === dateToLocalISO(selectedDate))
  const dayConflicts = findRoutineConflicts(dayOccurrences)
  const nextOccurrence = occurrences.find(occurrence =>
    occurrence.date >= dateToLocalISO(new Date())
    && occurrence.status !== 'cancelled'
    && occurrence.status !== 'skipped'
    && occurrence.status !== 'possible',
  )
  const fixedCount = occurrences.filter(item => item.scheduleType === 'fixed' && item.status !== 'cancelled' && item.status !== 'skipped').length
  const flexibleCount = occurrences.filter(item => item.scheduleType === 'flexible' && item.status !== 'cancelled' && item.status !== 'skipped').length
  const selectedDateLabel = formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const selectDate = (date: Date) => {
    setYear(date.getFullYear())
    setMonth(date.getMonth() + 1)
    setSelectedDay(date.getDate())
  }

  const changeMonth = (amount: number) => {
    const next = new Date(year, month - 1 + amount, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth() + 1)
    setSelectedDay(1)
  }

  const changeWeek = (amount: number) => selectDate(plusDays(selectedDate, amount * 7))

  const beginNewRule = () => {
    setEditingRule(null)
    setDraft(blankDraft(dateToLocalISO(selectedDate)))
    setShowRuleForm(true)
  }

  const beginEditRule = (rule: RoutineRule) => {
    setEditingRule(rule)
    setDraft(toDraft(rule))
    setShowRuleForm(true)
  }

  const handleSaveRule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPageError('')
    const recurrenceAnchor = draft.recurrence_anchor_date || draft.valid_from
    if (!draft.title.trim() || draft.weekdays.length === 0) {
      setPageError('Informe o nome da atividade e pelo menos um dia da semana.')
      return
    }
    const values = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      category: draft.category,
      weekdays: draft.weekdays,
      start_time: draft.start_time || null,
      end_time: draft.end_time || null,
      start_time_earliest: null,
      start_time_latest: null,
      end_time_earliest: null,
      end_time_latest: null,
      schedule_type: draft.schedule_type,
      is_approximate: false,
      recurrence_interval_weeks: draft.recurrence_interval_weeks,
      recurrence_anchor_date: recurrenceAnchor || null,
      first_confirmed_on: editingRule?.first_confirmed_on
        ?? (editingRule?.confirmation_required
          ? null
          : draft.recurrence_interval_weeks > 1 ? recurrenceAnchor : null),
      confirmation_required: editingRule?.confirmation_required ?? false,
      valid_from: draft.valid_from,
      valid_until: null,
      timezone: 'America/Fortaleza',
      is_active: true,
    }

    try {
      if (editingRule) await updateRoutineRule(editingRule.id, values)
      else await saveRoutineRule({ ...values, calendar_id: null, seed_key: null })
      setShowRuleForm(false)
      setEditingRule(null)
      setNotice('Regra da rotina salva.')
    } catch (error) {
      console.error('Unable to save routine rule:', error)
      setPageError(messageForError(error))
    }
  }

  const handleSeed = async () => {
    if (!user || !window.confirm('Adicionar à sua conta as regras editáveis de rotina e os três feriados nacionais de novembro de 2026? Nada será gravado antes desta confirmação.')) return
    setIsSeeding(true)
    setPageError('')
    setNotice('')
    try {
      const result = await initializeRoutineForUser(user.id)
      setYear(2026)
      setMonth(11)
      setSelectedDay(1)
      await Promise.all([loadRoutineRules(), loadHolidays()])
      setNotice(result.insertedRules === 0
        ? 'A configuração inicial já existe; suas alterações foram preservadas.'
        : 'Rotina de novembro de 2026 e feriados adicionados à sua conta.')
    } catch (error) {
      console.error('Unable to initialize the personal routine:', error)
      setPageError(`Não foi possível iniciar a rotina. Verifique se as migrations do banco foram aplicadas (a API faz isso ao iniciar). ${messageForError(error)}`)
    } finally {
      setIsSeeding(false)
    }
  }

  const handlePauseRule = async (rule: RoutineRule) => {
    try {
      await updateRoutineRule(rule.id, { is_active: !rule.is_active })
    } catch (error) {
      console.error('Unable to change routine state:', error)
      setPageError(messageForError(error))
    }
  }

  const handleDeleteRule = async (rule: RoutineRule) => {
    if (!window.confirm(`Excluir a regra “${rule.title}” e suas exceções? Os eventos específicos não serão removidos.`)) return
    try {
      await deleteRoutineRule(rule.id)
    } catch (error) {
      console.error('Unable to delete routine rule:', error)
      setPageError(messageForError(error))
    }
  }

  const saveException = async (
    occurrence: RoutineOccurrence,
    action: RoutineExceptionAction,
    overrides: { title?: string; start?: string; end?: string; notes?: string } = {},
  ) => {
    try {
      await saveRoutineException({
        routine_rule_id: occurrence.ruleId,
        occurrence_date: occurrence.date,
        action,
        overridden_title: overrides.title || null,
        overridden_start_time: overrides.start || null,
        overridden_end_time: overrides.end || null,
        notes: overrides.notes || null,
      })
      setNotice(action === 'cancelled'
        ? 'Atividade cancelada somente nesta data.'
        : action === 'confirmed'
          ? 'Ocorrência confirmada.'
          : 'Exceção salva para esta data.')
      setEditingOccurrence(null)
    } catch (error) {
      console.error('Unable to save a routine exception:', error)
      setPageError(messageForError(error))
    }
  }

  const restoreOccurrence = async (occurrence: RoutineOccurrence) => {
    try {
      await deleteRoutineException(occurrence.ruleId, occurrence.date)
      setNotice('Ocorrência restaurada à regra habitual.')
    } catch (error) {
      console.error('Unable to restore routine occurrence:', error)
      setPageError(messageForError(error))
    }
  }

  const confirmAprisco = async (occurrence: RoutineOccurrence) => {
    try {
      await confirmRoutineOccurrence(occurrence.ruleId, occurrence.date)
      setNotice('Aprisco confirmado nesta data e configurado a cada duas semanas a partir dela.')
    } catch (error) {
      console.error('Unable to confirm the Aprisco occurrence:', error)
      setPageError(messageForError(error))
    }
  }

  const markApriscoNotHappening = (occurrence: RoutineOccurrence) =>
    saveException(occurrence, 'skipped', { notes: 'Não haverá Aprisco nesta data.' })

  const applyCopy = async () => {
    if (copySource === copyTarget) {
      setPageError('Escolha dias diferentes para copiar a rotina.')
      return
    }
    const sourceRules = routineRules.filter(rule => rule.is_active && rule.weekdays.includes(copySource))
    if (sourceRules.length === 0) {
      setPageError('Não há atividades ativas no dia de origem.')
      return
    }
    const targetRules = routineRules.filter(rule => rule.is_active && rule.weekdays.includes(copyTarget))
    const targetName = weekdays.find(day => day.index === copyTarget)?.name
    if (!window.confirm(targetRules.length > 0
      ? `O dia ${targetName} já possui regras. Substituir a configuração desse dia copiando as regras de ${weekdays.find(day => day.index === copySource)?.name}?`
      : `Copiar as regras de ${weekdays.find(day => day.index === copySource)?.name} para ${targetName}?`)) return

    try {
      await copyRoutineWeekday(copySource, copyTarget)
      setNotice('Configuração copiada para o dia escolhido.')
    } catch (error) {
      console.error('Unable to copy the routine day:', error)
      setPageError(messageForError(error))
    }
  }

  const changeDraftDays = (day: number) => {
    setDraft(current => ({
      ...current,
      weekdays: current.weekdays.includes(day)
        ? current.weekdays.filter(value => value !== day)
        : [...current.weekdays, day].sort((a, b) => a - b),
    }))
  }

  const rulesNeedSetup = routineRules.length === 0 && !isLoadingCalendarData && !routineDataError
  const monthEventDays = new Set(events
    .filter(event => {
      const eventDate = new Date(event.start_at)
      return eventDate.getFullYear() === year
        && eventDate.getMonth() === month - 1
        && event.certainty !== 'possible'
    })
    .map(event => event.start_at.slice(0, 10)))
  const confirmedSpecialDays = monthEventDays.size
  const hasAfternoonCommitment = dayOccurrences.some(item => {
    if (item.status === 'cancelled' || item.status === 'skipped') return false
    const start = item.startTime ?? item.startEarliest ?? item.startLatest
    const end = item.endTime ?? item.endLatest ?? item.endEarliest
    return Boolean(start && start.slice(0, 5) >= '15:00' || end && end.slice(0, 5) > '15:00')
  }) || dayEvents.some(event => {
    if (event.all_day) return true
    const start = new Date(event.start_at)
    const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
    const end = event.end_at ? new Date(event.end_at) : null
    const endTime = end && `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
    return startTime >= '15:00' || !endTime || endTime > '15:00'
  })

  return (
    <section className="routine-page">
      <header className="page-heading routine-heading">
        <div>
          <p className="eyebrow">Uma semana que funciona para você</p>
          <h1>Minha rotina</h1>
          <p className="page-subtitle">Cadastre aqui os afazeres e atividades que se repetem. Compromissos pontuais ficam no Calendário.</p>
        </div>
        <div className="routine-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`/calendar?new=event&date=${dateToLocalISO(selectedDate)}`)}
          >
            <Plus size={16} /> Adicionar compromisso
          </button>
          <button type="button" className="btn btn-primary" onClick={beginNewRule}>
            <Plus size={16} /> Novo afazer recorrente
          </button>
        </div>
      </header>

      <div className="routine-period-bar">
        <div className="routine-month-controls">
          <button type="button" className="icon-button" onClick={() => changeMonth(-1)} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
          <h2>{formatDate(monthStart, { month: 'long', year: 'numeric' })}</h2>
          <button type="button" className="icon-button" onClick={() => changeMonth(1)} aria-label="Próximo mês"><ChevronRight size={18} /></button>
          <button type="button" className="btn btn-secondary" onClick={() => selectDate(new Date())}>Hoje</button>
        </div>
        <div className="routine-week-controls">
          <button type="button" className="icon-button" onClick={() => changeWeek(-1)} aria-label="Semana anterior"><ChevronLeft size={18} /></button>
          <span>{formatDate(weekStart, { day: 'numeric', month: 'short' })} – {formatDate(weekEnd, { day: 'numeric', month: 'short' })}</span>
          <button type="button" className="icon-button" onClick={() => changeWeek(1)} aria-label="Próxima semana"><ChevronRight size={18} /></button>
        </div>
      </div>

      {calendarDataError && <p role="alert" className="inline-error">{calendarDataError}</p>}
      {routineDataError && <p role="alert" className="inline-error">{routineDataError}</p>}
      {pageError && <p role="alert" className="inline-error">{pageError}</p>}
      {notice && <p role="status" className="routine-notice">{notice}</p>}
      {isLoadingCalendarData && <p role="status" className="calendar-loading">Carregando rotina...</p>}

      {rulesNeedSetup && (
        <section className="routine-setup-card">
          <div>
            <p className="eyebrow">Configuração inicial</p>
            <h2>Novembro de 2026, sem compromissos inventados</h2>
            <p>Adiciona regras habituais editáveis e feriados nacionais somente depois da sua confirmação. O Aprisco fica pendente e os horários variáveis permanecem aproximados.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => void handleSeed()} disabled={isSeeding || !user}>
            {isSeeding ? 'Preparando...' : 'Configurar novembro de 2026'}
          </button>
        </section>
      )}

      <section className="routine-stats" aria-label="Resumo da rotina">
        <article className="routine-stat"><span>Regras habituais</span><strong>{routineRules.length}</strong></article>
        <article className="routine-stat"><span>Ocorrências previstas</span><strong>{occurrences.filter(item => item.status !== 'cancelled' && item.status !== 'skipped').length}</strong></article>
        <article className="routine-stat"><span>Atividades fixas</span><strong>{fixedCount}</strong></article>
        <article className="routine-stat"><span>Atividades flexíveis</span><strong>{flexibleCount}</strong></article>
        <article className="routine-stat routine-next-stat">
          <span>Próximo compromisso</span>
          <strong>{nextOccurrence ? nextOccurrence.title : 'Sem dados'}</strong>
          {nextOccurrence && <small>{routineTimeLabel(nextOccurrence, timeFormat)} · {formatDate(new Date(`${nextOccurrence.date}T00:00:00`), { day: 'numeric', month: 'short' })}</small>}
        </article>
        <article className="routine-stat"><span>Dias com eventos especiais</span><strong>{confirmedSpecialDays}</strong></article>
      </section>

      <section className="routine-week-panel">
        <header className="routine-section-header">
          <div><h2>Visão semanal</h2><p>Segunda a domingo · escolha um dia para ver os detalhes.</p></div>
          <button type="button" className="btn btn-secondary" onClick={() => document.getElementById('routine-day-details')?.scrollIntoView({ behavior: 'smooth' })}>Ver dia selecionado</button>
        </header>
        <div className="routine-week-grid">
          {weekDays.map(date => {
            const isoDate = dateToLocalISO(date)
            const dayItems = weeklyOccurrences.filter(item => item.date === isoDate)
            const active = isoDate === dateToLocalISO(selectedDate)
            return (
              <button
                type="button"
                key={isoDate}
                className={`routine-week-day${active ? ' is-selected' : ''}`}
                onClick={() => selectDate(date)}
                aria-pressed={active}
              >
                <span className="routine-week-day-name">{formatDate(date, { weekday: 'short' })}</span>
                <strong className="routine-week-day-number">{date.getDate()}</strong>
                <span className="routine-week-day-items">
                  {dayItems.length === 0 ? 'Sem atividades' : dayItems.slice(0, 3).map(item => (
                    <span className={`routine-week-item type-${item.scheduleType} status-${item.status}`} key={item.id}>
                      {routineTimeLabel(item, timeFormat)} · {item.title}
                    </span>
                  ))}
                  {dayItems.length > 3 && <small>+{dayItems.length - 3} atividades</small>}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="routine-detail-layout" id="routine-day-details">
        <section className="routine-day-panel">
          <header className="routine-section-header">
            <div><p className="eyebrow">Ocorrências do dia</p><h2>{selectedDateLabel}</h2></div>
          </header>
          {dayHolidays.map(holiday => (
            <div className="routine-holiday-alert" key={holiday.id}>
              <strong>Feriado nacional · {holiday.name}</strong>
              <p>Confira se escola e estágio funcionarão normalmente. A rotina não foi cancelada automaticamente.</p>
              <div>
                <button type="button" onClick={() => {
                  const fixed = dayOccurrences.filter(item => item.scheduleType === 'fixed')
                  void Promise.all(fixed.map(item => saveException(item, 'kept', { notes: 'Rotina mantida no feriado.' })))
                }}>Manter rotina</button>
                <button type="button" onClick={() => {
                  const fixed = dayOccurrences.filter(item => item.scheduleType === 'fixed')
                  void Promise.all(fixed.map(item => saveException(item, 'cancelled', { notes: 'Cancelada nesta data por decisão do usuário.' })))
                }}>Cancelar atividades fixas hoje</button>
              </div>
            </div>
          ))}
          {dayOccurrences.length === 0 && dayEvents.length === 0 && dayHolidays.length === 0 && (
            <div className="routine-empty">Nenhuma ocorrência prevista. O período permanece livre; você pode adicionar algo específico se quiser.</div>
          )}
          {dayOccurrences.length > 0 && (
            <div className="routine-timeline">
              <h3>Rotina habitual</h3>
              {dayOccurrences.filter(item => item.status !== 'possible').map(item => (
                <article className={`routine-timeline-item status-${item.status}`} key={item.id}>
                  <div className="routine-timeline-time"><Clock3 size={14} />{routineTimeLabel(item, timeFormat)}</div>
                  <div className="routine-timeline-content">
                    <div className="routine-item-title">
                      <strong>{item.title}</strong>
                      <span className={`routine-type-tag type-${item.scheduleType}`}>
                        {item.scheduleType === 'fixed' ? 'Fixa' : item.scheduleType === 'flexible' ? 'Flexível' : 'Opcional'}
                      </span>
                      {item.isApproximate && <span className="routine-approximate-tag">Aproximado</span>}
                    </div>
                    <p>{item.category}{item.description ? ` · ${item.description}` : ''}</p>
                    {item.status === 'cancelled' && <small>Cancelada somente nesta data</small>}
                    {item.status === 'skipped' && <small>Não haverá nesta data</small>}
                    {item.status === 'modified' && <small>Horário alterado somente nesta data</small>}
                    <div className="routine-occurrence-actions">
                      <button type="button" onClick={() => setEditingOccurrence(item)}><Pencil size={13} /> Ajustar hoje</button>
                      {item.status !== 'cancelled' && <button type="button" onClick={() => void saveException(item, 'cancelled')}><Pause size={13} /> Cancelar hoje</button>}
                      {item.exception && <button type="button" onClick={() => void restoreOccurrence(item)}><RotateCcw size={13} /> Restaurar habitual</button>}
                    </div>
                  </div>
                </article>
              ))}
              {dayOccurrences.filter(item => item.status === 'possible').map(item => (
                <article className="routine-possibility" key={item.id}>
                  <div><strong>Pode haver Aprisco hoje</strong><p>Confirme a data ou mantenha a noite livre. Essa possibilidade não bloqueia a agenda.</p></div>
                  <div className="routine-occurrence-actions">
                    <button type="button" onClick={() => void confirmAprisco(item)}>Confirmar Aprisco</button>
                    <button type="button" onClick={() => void markApriscoNotHappening(item)}>Não haverá</button>
                    {item.exception && <button type="button" onClick={() => void restoreOccurrence(item)}>Deixar pendente</button>}
                  </div>
                </article>
              ))}
            </div>
          )}
          {dayEvents.length > 0 && (
            <div className="routine-timeline">
              <h3>Compromissos específicos</h3>
              {dayEvents.map(event => (
                <article className={`routine-timeline-item certainty-${event.certainty ?? 'confirmed'}`} key={event.id}>
                  <div className="routine-timeline-time">
                    {event.all_day ? 'Dia inteiro' : formatClock(event.start_at, timeFormat)}
                  </div>
                  <div className="routine-timeline-content">
                    <div className="routine-item-title"><strong>{event.title}</strong><span className="routine-type-tag type-specific">{event.certainty === 'possible' ? 'Possível' : event.certainty === 'planned' ? 'Previsto' : 'Confirmado'}</span></div>
                    <p>{event.category ?? 'Evento específico'}{event.description ? ` · ${event.description}` : ''}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
          {dayConflicts.map(({ first, second }) => (
            <div className="routine-conflict" key={`${first.id}:${second.id}`}>
              <strong>Possível conflito</strong>
              <p>O horário previsto de {first.title} pode coincidir com {second.title}.</p>
              <div>
                <button type="button" onClick={() => beginEditRule(routineRules.find(rule => rule.id === first.ruleId)!)}>Ajustar {first.title}</button>
                <button type="button" onClick={() => beginEditRule(routineRules.find(rule => rule.id === second.ruleId)!)}>Ajustar {second.title}</button>
                <button type="button" onClick={() => setNotice('Aviso mantido para esta data; você pode resolver depois.')}>Resolver depois</button>
              </div>
            </div>
          ))}
          {selectedDate.getDay() === 6 && !hasAfternoonCommitment && (
            <div className="routine-free-window">Depois das 15h, há uma janela disponível para descanso ou passeio. Isso não cria um compromisso.</div>
          )}
        </section>

        <aside className="routine-situations-panel">
          <header className="routine-section-header"><div><h2>Situações da rotina</h2><p>Somente avisos justificados pelos seus dados.</p></div></header>
          {dayConflicts.length === 0 && dayOccurrences.every(item => item.status !== 'possible') && dayHolidays.length === 0
            ? <p className="routine-empty">Nenhuma situação requer atenção neste dia.</p>
            : <div className="routine-situation-list">
                {dayConflicts.map(({ first, second }) => <p className="routine-situation conflict" key={`${first.id}-${second.id}`}>Possível conflito: {first.title} pode coincidir com {second.title}.</p>)}
                {dayOccurrences.filter(item => item.status === 'possible').map(item => <p className="routine-situation possible" key={item.id}>Aprisco possível — a data ainda aguarda confirmação.</p>)}
                {dayHolidays.map(item => <p className="routine-situation holiday" key={item.id}>Feriado nacional: {item.name}. Confira os horários de escola e estágio.</p>)}
              </div>}
        </aside>
      </div>

      <section className="routine-rules-panel" id="routine-rules">
        <header className="routine-section-header">
          <div><h2>Afazeres e atividades habituais</h2><p>Pausar ou editar uma atividade não apaga seus compromissos pontuais.</p></div>
        </header>
        {routineRules.length === 0
          ? <p className="routine-empty">As regras aparecem aqui após você configurar a rotina inicial ou adicionar uma atividade.</p>
          : <div className="routine-rules-list">
              {routineRules.map(rule => (
                <article className={`routine-rule-card${rule.is_active ? '' : ' is-paused'}`} key={rule.id}>
                  <div className="routine-rule-main">
                    <strong>{rule.title}</strong>
                    <span>{rule.category} · {rule.weekdays.map(day => weekdays.find(item => item.index === day)?.short).filter(Boolean).join(', ')}</span>
                  </div>
                  <span className={`routine-type-tag type-${rule.schedule_type}`}>{rule.schedule_type === 'fixed' ? 'Fixa' : rule.schedule_type === 'flexible' ? 'Flexível' : 'Opcional'}</span>
                  <span className="routine-rule-time">
                    {[rule.start_time ?? rule.start_time_earliest, rule.end_time ?? rule.end_time_earliest].filter(Boolean).map(timeValue).join(' – ') || 'Sem horário definido'}
                  </span>
                  <div className="routine-rule-actions">
                    <button type="button" aria-label={rule.is_active ? `Pausar ${rule.title}` : `Ativar ${rule.title}`} onClick={() => void handlePauseRule(rule)}>{rule.is_active ? <Pause size={15} /> : <Play size={15} />}</button>
                    <button type="button" aria-label={`Editar ${rule.title}`} onClick={() => beginEditRule(rule)}><Pencil size={15} /></button>
                    <button type="button" aria-label={`Excluir ${rule.title}`} onClick={() => void handleDeleteRule(rule)}><Trash2 size={15} /></button>
                  </div>
                </article>
              ))}
            </div>}
      </section>

      <section className="routine-copy-panel">
        <div><h2><Copy size={17} /> Copiar configuração entre dias</h2><p>A configuração copiada se torna uma regra separada para o dia de destino.</p></div>
        <label>De <select value={copySource} onChange={event => setCopySource(Number(event.target.value))}>{weekdays.map(day => <option value={day.index} key={day.index}>{day.name}</option>)}</select></label>
        <label>Para <select value={copyTarget} onChange={event => setCopyTarget(Number(event.target.value))}>{weekdays.map(day => <option value={day.index} key={day.index}>{day.name}</option>)}</select></label>
        <button type="button" className="btn btn-secondary" onClick={() => void applyCopy()}>Copiar…</button>
      </section>

      {showRuleForm && (
        <div className="event-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowRuleForm(false) }}>
          <section className="event-modal routine-modal" role="dialog" aria-modal="true" aria-labelledby="routine-form-title">
            <form className="routine-form" onSubmit={event => void handleSaveRule(event)}>
              <h2 id="routine-form-title">{editingRule ? 'Editar regra habitual' : 'Adicionar atividade habitual'}</h2>
              <p>Alterar uma regra aplica a mudança a todas as próximas ocorrências; para um único dia, use “Ajustar hoje”.</p>
              <label>Nome<input required value={draft.title} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))} /></label>
              <label>Descrição<textarea value={draft.description} onChange={event => setDraft(value => ({ ...value, description: event.target.value }))} /></label>
              <div className="routine-form-grid">
                <label>Categoria<select value={draft.category} onChange={event => setDraft(value => ({ ...value, category: event.target.value }))}>
                  {['rotina', 'escola', 'estagio', 'deslocamento', 'academia', 'igreja', 'afazeres-domesticos', 'estudos', 'lazer', 'saude', 'feriado', 'evento-especial', 'descanso', 'outros'].map(category => <option key={category} value={category}>{category}</option>)}
                </select></label>
                <label>Tipo<select value={draft.schedule_type} onChange={event => setDraft(value => ({ ...value, schedule_type: event.target.value as RoutineScheduleType }))}>
                  <option value="fixed">Fixa</option><option value="flexible">Flexível</option><option value="optional">Opcional</option>
                </select></label>
              </div>
              <fieldset className="routine-weekday-picker"><legend>Dias da semana</legend>{weekdays.map(day => <label key={day.index}><input type="checkbox" checked={draft.weekdays.includes(day.index)} onChange={() => changeDraftDays(day.index)} />{day.short}</label>)}</fieldset>
              <div className="routine-form-grid">
                <label>Início (opcional)<input type="time" value={draft.start_time} onChange={event => setDraft(value => ({ ...value, start_time: event.target.value }))} /></label>
                <label>Término (opcional)<input type="time" value={draft.end_time} onChange={event => setDraft(value => ({ ...value, end_time: event.target.value }))} /></label>
              </div>
              <div className="routine-form-grid">
                <label>Repetição<select value={draft.recurrence_interval_weeks} onChange={event => setDraft(value => ({ ...value, recurrence_interval_weeks: Number(event.target.value) }))}>
                  <option value={1}>Toda semana</option>
                  <option value={2}>A cada duas semanas</option>
                </select></label>
              </div>
              <div className="event-form-actions">
                {editingRule && <button type="button" className="btn btn-danger" onClick={() => { void handleDeleteRule(editingRule); setShowRuleForm(false) }}>Excluir regra</button>}
                <button type="button" className="btn btn-secondary" onClick={() => setShowRuleForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar regra</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {editingOccurrence && (
        <OccurrenceDialog
          occurrence={editingOccurrence}
          onClose={() => setEditingOccurrence(null)}
          onSave={(action, values) => void saveException(editingOccurrence, action, values)}
          onCancel={() => void saveException(editingOccurrence, 'cancelled')}
        />
      )}

    </section>
  )
}

const OccurrenceDialog = ({
  occurrence,
  onClose,
  onSave,
  onCancel,
}: {
  occurrence: RoutineOccurrence
  onClose: () => void
  onSave: (action: RoutineExceptionAction, values: { title?: string; start?: string; end?: string }) => void
  onCancel: () => void
}) => {
  const [title, setTitle] = useState(occurrence.title)
  const [start, setStart] = useState(occurrence.startTime ?? occurrence.startEarliest ?? '')
  const [end, setEnd] = useState(occurrence.endTime ?? occurrence.endEarliest ?? '')

  return (
    <div className="event-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="event-modal routine-modal" role="dialog" aria-modal="true" aria-labelledby="occurrence-title">
        <form className="routine-form" onSubmit={event => { event.preventDefault(); onSave('modified', { title, start, end }) }}>
          <h2 id="occurrence-title">Ajustar somente {occurrence.date}</h2>
          <p>A regra habitual não será alterada.</p>
          <label>Atividade<input value={title} onChange={event => setTitle(event.target.value)} required /></label>
          <div className="routine-form-grid">
            <label>Início<input type="time" value={start} onChange={event => setStart(event.target.value)} /></label>
            <label>Término<input type="time" value={end} onChange={event => setEnd(event.target.value)} /></label>
          </div>
          <div className="event-form-actions">
            <button type="button" className="btn btn-danger" onClick={onCancel}>Cancelar hoje</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Voltar</button>
            <button type="submit" className="btn btn-primary">Salvar ocorrência</button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default RoutinePage
