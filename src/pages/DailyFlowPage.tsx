import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, Check, Circle, Clock3,
  Focus, Pause, Plus, Sparkles, Zap,
} from 'lucide-react'
import { useCalendar } from '@/app/providers/CalendarProvider'
import { useAuth } from '@/app/providers/AuthProvider'
import { dateToLocalISO, generateRoutineOccurrences, routineTimeLabel } from '@/lib/routines'
import type { RoutineOccurrence } from '@/lib/routines'
import { formatTimeValue } from '@/lib/timeFormat'

type EffortLevel = 'mental' | 'physical' | 'light'
type FlowTask = {
  key: string
  id: string
  title: string
  category: string
  startTime: string | null
  endTime: string | null
  startMinutes: number | null
  endMinutes: number | null
  allDay: boolean
  completed: boolean
  color: string
  routine?: RoutineOccurrence
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

const timeToMinutes = (value: string | null | undefined) => {
  if (!value) return null
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number)
  return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : null
}

const minutesToTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

const shiftDate = (date: Date, amount: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

const localDayBounds = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  return { start, end }
}

const effortLabel: Record<EffortLevel, string> = {
  mental: 'Mental',
  physical: 'Físico',
  light: 'Leve',
}

export const DailyFlowPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    events, routineRules, routineExceptions, timeFormat, isLoadingCalendarData,
    calendarDataError, routineDataError, setMonth, setYear, toggleEventStatus,
    saveRoutineException,
  } = useCalendar()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [now, setNow] = useState(() => new Date())
  const [completedRoutines, setCompletedRoutines] = useState<string[]>([])
  const [effortByTask, setEffortByTask] = useState<Record<string, EffortLevel>>({})
  const [focusTask, setFocusTask] = useState<string | null>(null)
  const [busyTask, setBusyTask] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const dayKey = dateToLocalISO(selectedDate)
  const completionStorageKey = `agendalec:flow:done:${user?.id ?? 'guest'}:${dayKey}`
  const effortStorageKey = `agendalec:flow:effort:${user?.id ?? 'guest'}:${dayKey}`

  useEffect(() => {
    setMonth(selectedDate.getMonth() + 1)
    setYear(selectedDate.getFullYear())
  }, [selectedDate, setMonth, setYear])

  useEffect(() => {
    setCompletedRoutines(readJson<string[]>(completionStorageKey, []))
    setEffortByTask(readJson<Record<string, EffortLevel>>(effortStorageKey, {}))
    setFocusTask(null)
  }, [completionStorageKey, effortStorageKey])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const occurrences = useMemo(() => {
    const { start, end } = localDayBounds(selectedDate)
    return generateRoutineOccurrences(routineRules, routineExceptions, start, end)
      .filter(item => item.status !== 'cancelled' && item.status !== 'skipped')
  }, [routineExceptions, routineRules, selectedDate])

  const tasks = useMemo<FlowTask[]>(() => {
    const { start: dayStart, end: dayEnd } = localDayBounds(selectedDate)
    const eventTasks: FlowTask[] = events.flatMap(event => {
      const start = new Date(event.start_at)
      const end = event.end_at ? new Date(event.end_at) : null
      if (start >= dayEnd || (end && end < dayStart)) return []
      const startsToday = start >= dayStart && start < dayEnd
      const startTime = event.all_day ? null : startsToday
        ? `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
        : '00:00'
      const endsToday = end && end >= dayStart && end < dayEnd
      const endTime = event.all_day ? null : endsToday
        ? `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
        : end && end >= dayEnd ? '23:59' : null
      return [{
        key: `event:${event.id}`,
        id: event.id,
        title: event.title,
        category: event.category ?? 'Compromisso',
        startTime,
        endTime,
        startMinutes: event.all_day ? null : timeToMinutes(startTime),
        endMinutes: event.all_day ? null : timeToMinutes(endTime),
        allDay: Boolean(event.all_day),
        completed: event.status === 'completed',
        color: event.color || 'var(--color-primary)',
      }]
    })
    const routineTasks: FlowTask[] = occurrences.map(item => {
      const startTime = item.startTime ?? item.startEarliest ?? item.startLatest
      const endTime = item.endTime ?? item.endLatest ?? item.endEarliest
      return {
        key: `routine:${item.id}`,
        id: item.id,
        title: item.title,
        category: item.category || 'Rotina',
        startTime,
        endTime,
        startMinutes: timeToMinutes(startTime),
        endMinutes: timeToMinutes(endTime),
        allDay: false,
        completed: completedRoutines.includes(item.id),
        color: item.status === 'possible' ? 'var(--color-text-muted)' : 'var(--color-primary)',
        routine: item,
      }
    })
    return [...eventTasks, ...routineTasks].sort((left, right) => (
      (left.startMinutes ?? -1) - (right.startMinutes ?? -1) || left.title.localeCompare(right.title)
    ))
  }, [completedRoutines, events, occurrences, selectedDate])

  const isToday = dayKey === dateToLocalISO(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const activeTask = isToday ? tasks.find(task => !task.completed
    && task.startMinutes !== null
    && task.startMinutes <= nowMinutes
    && (task.endMinutes ?? task.startMinutes + 60) > nowMinutes) : undefined
  const nowMarkerIndex = activeTask
    ? tasks.indexOf(activeTask)
    : isToday ? tasks.findIndex(task => task.startMinutes !== null && task.startMinutes > nowMinutes) : -1
  const doneCount = tasks.filter(task => task.completed).length
  const progress = tasks.length ? Math.round(doneCount / tasks.length * 100) : 0
  const pendingCount = tasks.length - doneCount
  const flexTasks = tasks.filter(task => task.routine?.scheduleType === 'flexible'
    && task.startMinutes === null && !task.completed)
  const occupied = tasks.filter(task => task.startMinutes !== null && task.endMinutes !== null)
  const freeSlots = useMemo(() => {
    const slots: Array<{ start: number; end: number }> = []
    for (let start = 8 * 60; start + 30 <= 20 * 60; start += 15) {
      const end = start + 30
      const overlaps = occupied.some(task => start < (task.endMinutes as number) && end > (task.startMinutes as number))
      if (!overlaps) {
        slots.push({ start, end })
        start += 15
      }
    }
    return slots.slice(0, flexTasks.length)
  }, [flexTasks.length, occupied])

  const conflicts = useMemo(() => {
    const timed = tasks.filter(task => !task.completed && task.startMinutes !== null && task.endMinutes !== null)
    const found: Array<[FlowTask, FlowTask]> = []
    for (let left = 0; left < timed.length; left += 1) {
      for (let right = left + 1; right < timed.length; right += 1) {
        const first = timed[left]
        const second = timed[right]
        if ((first.startMinutes as number) < (second.endMinutes as number)
          && (second.startMinutes as number) < (first.endMinutes as number)) found.push([first, second])
      }
    }
    return found
  }, [tasks])

  const intenseSequence = useMemo(() => {
    const scheduled = tasks.filter(task => !task.completed && task.startMinutes !== null && task.endMinutes !== null)
    let run: FlowTask[] = []
    for (const task of scheduled) {
      const level = effortByTask[task.key]
      if (level === 'mental' || level === 'physical') {
        const previous = run[run.length - 1]
        if (previous && task.startMinutes! - previous.endMinutes! > 15) run = []
        run.push(task)
        if (run.length >= 3) return run
      } else run = []
    }
    return []
  }, [effortByTask, tasks])

  const energyPoints = useMemo(() => {
    const activeTasks = tasks.filter(task => task.startMinutes !== null && !task.completed)
    if (!activeTasks.length) return []
    let energy = 100
    return activeTasks.map(task => {
      const effort = effortByTask[task.key]
      energy = Math.max(18, energy - (effort === 'mental' || effort === 'physical' ? 19 : effort === 'light' ? 8 : 0))
      return { task, energy }
    })
  }, [effortByTask, tasks])

  const toggleComplete = async (task: FlowTask) => {
    setActionError('')
    setBusyTask(task.key)
    try {
      if (task.routine) {
        const next = task.completed
          ? completedRoutines.filter(id => id !== task.id)
          : [...completedRoutines, task.id]
        setCompletedRoutines(next)
        localStorage.setItem(completionStorageKey, JSON.stringify(next))
      } else {
        await toggleEventStatus(task.id, task.completed ? 'pending' : 'completed')
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível atualizar esta atividade.')
    } finally {
      setBusyTask(null)
    }
  }

  const saveEffort = (taskKey: string, effort: EffortLevel | '') => {
    const next = { ...effortByTask }
    if (effort) next[taskKey] = effort
    else delete next[taskKey]
    setEffortByTask(next)
    localStorage.setItem(effortStorageKey, JSON.stringify(next))
  }

  const placeFlexTask = async (task: FlowTask, slot: { start: number; end: number }) => {
    if (!task.routine) return
    setActionError('')
    setBusyTask(task.key)
    try {
      await saveRoutineException({
        routine_rule_id: task.routine.ruleId,
        occurrence_date: dayKey,
        action: 'modified',
        overridden_title: null,
        overridden_start_time: minutesToTime(slot.start),
        overridden_end_time: minutesToTime(slot.end),
        notes: 'Horário sugerido pelo Flow do Dia.',
      })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível encaixar esta atividade.')
    } finally {
      setBusyTask(null)
    }
  }

  const changeDay = (amount: number) => setSelectedDate(current => shiftDate(current, amount))
  const dateLabel = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const totalEnergyPoints = energyPoints.map((point, index) => `${index * (100 / Math.max(1, energyPoints.length - 1))},${100 - point.energy}`).join(' ')

  return (
    <section className="flow-page">
      <header className="page-heading flow-heading">
        <div>
          <p className="eyebrow">Sua rotina em movimento</p>
          <h1>Flow do dia</h1>
          <p className="page-subtitle">Um passo de cada vez. Seu dia ganha ritmo quando você enxerga o próximo passo.</p>
        </div>
        <div className="flow-date-controls" aria-label="Escolher dia">
          <button type="button" className="icon-button" aria-label="Dia anterior" onClick={() => changeDay(-1)}><ArrowLeft size={18} /></button>
          <span>{dateLabel}</span>
          <button type="button" className="icon-button" aria-label="Próximo dia" onClick={() => changeDay(1)}><ArrowRight size={18} /></button>
          {!isToday && <button type="button" className="btn btn-secondary" onClick={() => setSelectedDate(new Date())}>Hoje</button>}
        </div>
      </header>

      {calendarDataError && <p role="alert" className="inline-error">{calendarDataError}</p>}
      {routineDataError && <p role="alert" className="inline-error">{routineDataError}</p>}
      {actionError && <p role="alert" className="inline-error">{actionError}</p>}

      <section className="flow-progress-panel" aria-label="Progresso do dia">
        <div className="flow-progress-copy">
          <div><span>Ritmo de hoje</span><strong>{progress}%</strong></div>
          <p>{doneCount} de {tasks.length} atividades concluídas <span aria-hidden="true">·</span> {pendingCount} restantes</p>
        </div>
        <div className="flow-progress-track" role="progressbar" aria-label="Progresso do dia" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="flow-progress-footer"><span>{isToday ? `Agora · ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Visão do dia'}</span><span>{tasks.length} atividades no plano</span></div>
      </section>

      <div className="flow-layout">
        <section className="flow-timeline-panel" aria-label="Linha do tempo do dia">
          <header className="flow-panel-heading">
            <div><h2>Linha do tempo</h2><p>O seu dia, em etapas claras</p></div>
            <Link className="btn btn-secondary flow-add-button" to={`/calendar?new=event&date=${dayKey}`}><Plus size={16} /> Adicionar</Link>
          </header>

          {isLoadingCalendarData && <p role="status" className="calendar-loading">Carregando seu dia...</p>}
          {!isLoadingCalendarData && tasks.length === 0 && (
            <div className="flow-empty"><span><Sparkles size={22} /></span><h3>Seu dia está aberto</h3><p>Escolha uma atividade na sua rotina ou crie um compromisso para começar.</p><Link className="btn btn-primary" to={`/calendar?new=event&date=${dayKey}`}>Planejar o dia</Link></div>
          )}

          <div className={`flow-task-list${focusTask ? ' is-focus-mode' : ''}`}>
            {focusTask && <button className="flow-focus-exit" type="button" onClick={() => setFocusTask(null)}>Sair do foco <ArrowRight size={15} /></button>}
            {tasks.map((task, index) => {
              if (focusTask && task.key !== focusTask) return null
              const previousTimedTask = [...tasks.slice(0, index)].reverse().find(item => item.endMinutes !== null)
              const gap = previousTimedTask && task.startMinutes !== null && previousTimedTask.endMinutes !== null
                ? task.startMinutes - previousTimedTask.endMinutes : 0
              const isCurrent = activeTask?.key === task.key
              const isFocused = focusTask === task.key
              const timeText = task.allDay ? 'Dia inteiro' : task.startTime
                ? task.endTime ? `${formatTimeValue(task.startTime, timeFormat)} – ${formatTimeValue(task.endTime, timeFormat)}` : formatTimeValue(task.startTime, timeFormat)
                : task.routine ? routineTimeLabel(task.routine, timeFormat) : 'Sem horário definido'
              const flexSlotIndex = flexTasks.findIndex(item => item.key === task.key)
              const slot = flexSlotIndex >= 0 ? freeSlots[flexSlotIndex] : undefined
              const remainingMinutes = isCurrent && task.endMinutes !== null
                ? Math.max(0, task.endMinutes - nowMinutes)
                : isCurrent ? Math.max(0, (task.startMinutes ?? nowMinutes) + 60 - nowMinutes) : null
              return (
                <div className="flow-timeline-entry" key={task.key}>
                  {index === nowMarkerIndex && isToday && !focusTask && <div className="flow-now-marker"><span>AGORA</span><i /></div>}
                  {!focusTask && gap >= 15 && gap <= 120 && <div className="flow-gap"><Pause size={13} /><span>{gap} min de intervalo livre</span></div>}
                  <article
                    className={`flow-task-card${task.completed ? ' is-complete' : ''}${isCurrent ? ' is-current' : ''}${task.routine?.status === 'possible' ? ' is-possible' : ''}${isFocused ? ' is-focused' : ''}${slot ? ' is-draggable' : ''}`}
                    style={{ '--task-color': task.color } as React.CSSProperties}
                    draggable={Boolean(slot)}
                    onDragStart={event => {
                      if (slot) event.dataTransfer.setData('text/plain', task.key)
                    }}
                  >
                    <div className="flow-task-rail"><span className="flow-task-dot">{task.completed ? <Check size={13} /> : <Circle size={11} />}</span></div>
                    <div className="flow-task-body">
                      <div className="flow-task-meta"><span>{timeText}</span>{isCurrent && <b><i /> Em andamento{remainingMinutes !== null ? ` · ${remainingMinutes} min restantes` : ''}</b>}{task.routine?.status === 'possible' && <b className="flow-possible-tag">A confirmar</b>}</div>
                      <h3>{task.title}</h3>
                      <p>{task.category}{task.routine ? ` · ${task.routine.scheduleType === 'fixed' ? 'Rotina fixa' : task.routine.scheduleType === 'flexible' ? 'Flexível' : 'Opcional'}` : ' · Compromisso'}</p>
                      <div className="flow-task-actions">
                        <button type="button" className={`flow-complete-button${task.completed ? ' is-done' : ''}`} disabled={busyTask === task.key} onClick={() => void toggleComplete(task)}>
                          {task.completed ? <Check size={15} /> : <Circle size={15} />}{task.completed ? 'Concluída' : 'Concluir'}
                        </button>
                        {isToday && !task.completed && <button type="button" className="flow-action-link" onClick={() => setFocusTask(task.key)}><Focus size={15} /> Foco</button>}
                        {task.routine && <button type="button" className="flow-action-link" onClick={() => navigate(`/routine?date=${dayKey}`)}>Abrir rotina</button>}
                      </div>
                      <label className="flow-effort-control">Esforço
                        <select value={effortByTask[task.key] ?? ''} onChange={event => saveEffort(task.key, event.target.value as EffortLevel | '')}>
                          <option value="">Definir</option><option value="mental">Mental</option><option value="physical">Físico</option><option value="light">Leve</option>
                        </select>
                      </label>
                      {slot && task.routine && <div
                        className="flow-flex-suggestion"
                        onDragOver={event => event.preventDefault()}
                        onDrop={event => {
                          event.preventDefault()
                          const draggedKey = event.dataTransfer.getData('text/plain')
                          const draggedTask = flexTasks.find(item => item.key === draggedKey)
                          if (draggedTask) void placeFlexTask(draggedTask, slot)
                        }}
                      ><Sparkles size={15} /><span>Janela livre às {formatTimeValue(minutesToTime(slot.start), timeFormat)} · arraste uma flexível ou</span><button type="button" disabled={busyTask === task.key} onClick={() => void placeFlexTask(task, slot)}>Encaixar</button></div>}
                    </div>
                  </article>
                </div>
              )
            })}
            {isToday && nowMarkerIndex === -1 && tasks.length > 0 && !focusTask && <div className="flow-now-marker is-end"><span>AGORA · {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><i /></div>}
          </div>
        </section>

        <aside className="flow-insights" aria-label="Resumo da rotina">
          <section className="flow-insight-card flow-next-card">
            <header><span><Clock3 size={16} /> Próxima etapa</span><span className="flow-live-dot" /></header>
            {activeTask
              ? <><p className="flow-next-label">Em andamento</p><h3>{activeTask.title}</h3><button type="button" onClick={() => setFocusTask(activeTask.key)}>Abrir modo foco <Focus size={15} /></button></>
              : tasks.find(task => !task.completed && task.startMinutes !== null && (!isToday || task.startMinutes > nowMinutes))
                ? <><p className="flow-next-label">A seguir</p><h3>{tasks.find(task => !task.completed && task.startMinutes !== null && (!isToday || task.startMinutes > nowMinutes))?.title}</h3><p className="flow-next-time">{formatTimeValue(tasks.find(task => !task.completed && task.startMinutes !== null && (!isToday || task.startMinutes > nowMinutes))!.startTime!, timeFormat)}</p></>
                : <><p className="flow-next-label">Sem pressa</p><h3>Você está em dia</h3><p className="flow-next-time">Aproveite uma janela livre.</p></>}
          </section>

          <section className="flow-insight-card">
            <header><span><Activity size={16} /> Energia da rotina</span><span className="flow-card-caption">Estimativa</span></header>
            {energyPoints.length > 1 ? <svg className="flow-energy-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Estimativa de energia ao longo das atividades"><defs><linearGradient id="flow-energy-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity=".34" /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" /></linearGradient></defs><polygon points={`0,100 ${totalEnergyPoints} 100,100`} fill="url(#flow-energy-fill)" /><polyline points={totalEnergyPoints} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg> : <p className="flow-insight-note">Classifique o esforço das atividades para visualizar a curva estimada.</p>}
            <div className="flow-chart-labels"><span>Início</span><span>Fim do dia</span></div>
            {intenseSequence.length >= 3 && <div className="flow-rest-suggestion"><Pause size={15} /><p><strong>Abra espaço para respirar.</strong> Três atividades de alto esforço estão próximas. Uma pausa de 15 min depois de “{intenseSequence[2].title}” pode ajudar.</p></div>}
          </section>

          <section className={`flow-insight-card${conflicts.length ? ' has-alert' : ''}`}>
            <header><span><AlertTriangle size={16} /> Saúde da rotina</span><span className="flow-card-caption">Hoje</span></header>
            {conflicts.length ? <ul className="flow-conflict-list">{conflicts.map(([first, second]) => <li key={`${first.key}-${second.key}`}><strong>Conflito de horário</strong><span>{first.title} se sobrepõe a {second.title}.</span></li>)}</ul> : <p className="flow-insight-note">Nenhuma sobreposição identificada no seu plano.</p>}
            {flexTasks.length > 0 && <p className="flow-flex-count"><Zap size={14} /> {flexTasks.length} atividade{flexTasks.length > 1 ? 's flexíveis' : ' flexível'} {freeSlots.length ? 'com janela sugerida' : 'sem janela livre de 30 min'}</p>}
          </section>
        </aside>
      </div>
    </section>
  )
}
