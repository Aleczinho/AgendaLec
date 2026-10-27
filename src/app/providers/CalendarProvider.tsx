import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { RoutineException, RoutineRule } from '@/lib/routines'
import { errorMessage, routineSchemaErrorMessage } from '@/lib/errors'
import { initializeHolidaysForUser } from '@/services/routineService'
import type { TimeFormat } from '@/lib/timeFormat'

type CalendarView = 'month' | 'week' | 'day'
type SavedCalendarView = 'mensal' | 'semanal' | 'diaria'

type EventRecord = Record<string, any>
type HolidayRecord = Record<string, any>

interface CalendarContextValue {
  month: number
  year: number
  setMonth: (month: number) => void
  setYear: (year: number) => void
  selectedDay: number
  setSelectedDay: (day: number) => void
  view: CalendarView
  setView: (view: CalendarView) => void
  setDefaultCalendarView: (view: SavedCalendarView) => void
  timeFormat: TimeFormat
  setTimeFormat: (format: TimeFormat) => void
  weekStartsOn: 0 | 1
  setWeekStartsOn: (day: 0 | 1) => void
  events: EventRecord[]
  setEvents: (events: EventRecord[]) => void
  holidays: HolidayRecord[]
  setHolidays: (holidays: HolidayRecord[]) => void
  isLoadingCalendarData: boolean
  calendarDataError: string
  routineDataError: string
  routineRules: RoutineRule[]
  routineExceptions: RoutineException[]
  loadRoutineRules: () => Promise<void>
  saveRoutineRule: (rule: Partial<RoutineRule>) => Promise<RoutineRule>
  updateRoutineRule: (ruleId: string, updates: Partial<RoutineRule>) => Promise<void>
  deleteRoutineRule: (ruleId: string) => Promise<void>
  saveRoutineException: (exception: Omit<RoutineException, 'user_id'>) => Promise<void>
  deleteRoutineException: (ruleId: string, date: string) => Promise<void>
  copyRoutineWeekday: (sourceWeekday: number, targetWeekday: number) => Promise<void>
  confirmRoutineOccurrence: (ruleId: string, date: string) => Promise<void>
  user: User | null
  loadEvents: () => Promise<void>
  loadHolidays: () => Promise<void>
  saveEvent: (eventData: EventRecord) => Promise<EventRecord>
  updateEvent: (eventId: string, eventData: EventRecord) => Promise<EventRecord>
  deleteEvent: (eventId: string) => Promise<void>
  toggleEventStatus: (eventId: string, status: string) => Promise<EventRecord>
}

const CalendarContext = createContext<CalendarContextValue | undefined>(undefined)

export const useCalendar = () => {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider')
  }
  return context
}

export const CalendarProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  const [month, setMonth] = useState(11)
  const [year, setYear] = useState(2026)
  const [selectedDay, setSelectedDay] = useState(1)
  const [view, setView] = useState<CalendarView>('month')
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('24h')
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(1)
  const [events, setEvents] = useState<EventRecord[]>([])
  const [holidays, setHolidays] = useState<HolidayRecord[]>([])
  const [isLoadingCalendarData, setIsLoadingCalendarData] = useState(false)
  const [calendarDataError, setCalendarDataError] = useState('')
  const [routineDataError, setRoutineDataError] = useState('')
  const [routineRules, setRoutineRules] = useState<RoutineRule[]>([])
  const [routineExceptions, setRoutineExceptions] = useState<RoutineException[]>([])
  const [periodReadyForUser, setPeriodReadyForUser] = useState<string | null>(null)

  const setDefaultCalendarView = useCallback((savedView: SavedCalendarView) => {
    const calendarView = savedView === 'semanal' ? 'week' : savedView === 'diaria' ? 'day' : 'month'
    setView(calendarView)
  }, [])

  useEffect(() => {
    if (!user) {
      setPeriodReadyForUser(null)
      return
    }

    let active = true
    setPeriodReadyForUser(null)
    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .maybeSingle()
      if (error) throw error
      if (!active) return
      const preferences = (data?.preferences ?? {}) as Record<string, unknown>
      const savedMonth = Number(preferences.calendarReferenceMonth)
      const savedYear = Number(preferences.calendarReferenceYear)
      const savedDay = Number(preferences.calendarReferenceDay)
      if (Number.isInteger(savedMonth) && savedMonth >= 1 && savedMonth <= 12
        && Number.isInteger(savedYear) && savedYear >= 1900 && savedYear <= 9999) {
        setMonth(savedMonth)
        setYear(savedYear)
        setSelectedDay(Number.isInteger(savedDay) && savedDay >= 1 && savedDay <= 31
          ? Math.min(savedDay, new Date(savedYear, savedMonth, 0).getDate())
          : 1)
      }
      const firstDay = preferences.firstDayOfWeek
      if (firstDay === 'domingo' || firstDay === 'segunda') {
        setWeekStartsOn(firstDay === 'segunda' ? 1 : 0)
      }
      if (preferences.timeFormat === '12h' || preferences.timeFormat === '24h') {
        setTimeFormat(preferences.timeFormat)
      }
      if (preferences.calendarView === 'mensal' || preferences.calendarView === 'semanal' || preferences.calendarView === 'diaria') {
        setDefaultCalendarView(preferences.calendarView)
      }
      setPeriodReadyForUser(user.id)
    })()
      .catch(error => {
        console.error('Unable to load the calendar reference period:', error)
        if (active) setPeriodReadyForUser(user.id)
      })

    return () => { active = false }
  }, [setDefaultCalendarView, user])

  useEffect(() => {
    if (!user || periodReadyForUser !== user.id) return
    const timeout = window.setTimeout(() => {
      void (async () => {
        const { data: profile, error: readError } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('id', user.id)
          .maybeSingle()
        if (readError) throw readError
        const preferences = (profile?.preferences ?? {}) as Record<string, unknown>
        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          preferences: {
            ...preferences,
            calendarReferenceMonth: month,
            calendarReferenceYear: year,
            calendarReferenceDay: selectedDay,
          },
        }, { onConflict: 'id' })
        if (error) throw error
      })().catch(error => console.error('Unable to save the calendar reference period:', error))
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [month, periodReadyForUser, selectedDay, user, year])

  const loadEvents = useCallback(async () => {
    if (!user) {
      setEvents([])
      return
    }

    const periodStart = new Date(year, month - 1, -6)
    const periodEnd = new Date(year, month, 15)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .lt('start_at', periodEnd.toISOString())
      .or(`end_at.is.null,end_at.gte.${periodStart.toISOString()}`)
      .order('start_at')

    if (error) throw error
    setEvents(data ?? [])
  }, [month, user, year])

  const loadHolidays = useCallback(async () => {
    if (!user) {
      setHolidays([])
      return
    }

    await initializeHolidaysForUser(user.id)

    const yearStart = `${year}-01-01`
    const nextYearStart = `${year + 1}-01-01`
    const { data, error } = await supabase
      .from('holiday_dates')
      .select('*')
      .gte('date', yearStart)
      .lt('date', nextYearStart)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('date')

    if (error) throw error
    setHolidays(data ?? [])
  }, [user, year])

  const loadRoutineRules = useCallback(async () => {
    if (!user) {
      setRoutineRules([])
      setRoutineExceptions([])
      return
    }

    const periodStart = new Date(year, month - 1, -6)
    const periodEnd = new Date(year, month, 15)
    const periodStartDate = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}-${String(periodStart.getDate()).padStart(2, '0')}`
    const periodEndDate = `${periodEnd.getFullYear()}-${String(periodEnd.getMonth() + 1).padStart(2, '0')}-${String(periodEnd.getDate()).padStart(2, '0')}`

    const [rulesResult, exceptionsResult] = await Promise.all([
      supabase.from('routine_rules').select('*').eq('user_id', user.id).order('title'),
      supabase
        .from('routine_exceptions')
        .select('*')
        .eq('user_id', user.id)
        .gte('occurrence_date', periodStartDate)
        .lte('occurrence_date', periodEndDate),
    ])
    if (rulesResult.error) throw rulesResult.error
    if (exceptionsResult.error) throw exceptionsResult.error
    setRoutineRules(rulesResult.data ?? [])
    setRoutineExceptions(exceptionsResult.data ?? [])
  }, [month, user, year])

  useEffect(() => {
    if (!user) {
      setEvents([])
      setHolidays([])
      setRoutineRules([])
      setRoutineExceptions([])
      setRoutineDataError('')
      setIsLoadingCalendarData(false)
      setCalendarDataError('')
      return
    }

    let active = true
    setIsLoadingCalendarData(true)
    setCalendarDataError('')
    setRoutineDataError('')
    void Promise.allSettled([loadEvents(), loadHolidays(), loadRoutineRules()])
      .then(results => {
        if (!active) return
        const calendarFailure = results.slice(0, 2).find(result => result.status === 'rejected')
        const routineFailure = results[2]
        if (calendarFailure?.status === 'rejected') {
          console.error('Unable to load calendar data:', calendarFailure.reason)
          setCalendarDataError(errorMessage(calendarFailure.reason, 'Não foi possível carregar os dados do calendário.'))
        }
        if (routineFailure.status === 'rejected') {
          console.error('Unable to load routine data:', routineFailure.reason)
          setRoutineRules([])
          setRoutineExceptions([])
          setRoutineDataError(routineSchemaErrorMessage(routineFailure.reason))
        }
      })
      .finally(() => {
        if (active) setIsLoadingCalendarData(false)
      })
    return () => { active = false }
  }, [user, loadEvents, loadHolidays, loadRoutineRules])

  const saveEvent = async (eventData: EventRecord) => {
    if (!user) throw new Error('É necessário entrar para salvar um compromisso.')

    const { data, error } = await supabase
      .from('events')
      .insert({ ...eventData, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    setEvents(previous => [...previous, data])
    return data
  }

  const updateEvent = async (eventId: string, eventData: EventRecord) => {
    if (!user) throw new Error('É necessário entrar para atualizar um compromisso.')

    const { data, error } = await supabase
      .from('events')
      .update(eventData)
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    setEvents(previous => previous.map(event => event.id === eventId ? data : event))
    return data
  }

  const deleteEvent = async (eventId: string) => {
    if (!user) throw new Error('É necessário entrar para excluir um compromisso.')

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id)

    if (error) throw error
    setEvents(previous => previous.filter(event => event.id !== eventId))
  }

  const toggleEventStatus = async (eventId: string, status: string) => {
    if (!user) throw new Error('É necessário entrar para alterar o compromisso.')
    return updateEvent(eventId, { status })
  }

  const saveRoutineRule = async (rule: Partial<RoutineRule>) => {
    if (!user) throw new Error('É necessário entrar para salvar a rotina.')
    const { data, error } = await supabase
      .from('routine_rules')
      .insert({ ...rule, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    setRoutineRules(previous => [...previous, data])
    return data
  }

  const updateRoutineRule = async (ruleId: string, updates: Partial<RoutineRule>) => {
    if (!user) throw new Error('É necessário entrar para atualizar a rotina.')
    const { data, error } = await supabase
      .from('routine_rules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', ruleId)
      .eq('user_id', user.id)
      .select()
      .single()
    if (error) throw error
    setRoutineRules(previous => previous.map(rule => rule.id === ruleId ? data : rule))
  }

  const deleteRoutineRule = async (ruleId: string) => {
    if (!user) throw new Error('É necessário entrar para excluir uma regra de rotina.')
    const { error } = await supabase.from('routine_rules').delete().eq('id', ruleId).eq('user_id', user.id)
    if (error) throw error
    setRoutineRules(previous => previous.filter(rule => rule.id !== ruleId))
    setRoutineExceptions(previous => previous.filter(exception => exception.routine_rule_id !== ruleId))
  }

  const saveRoutineException = async (exception: Omit<RoutineException, 'user_id'>) => {
    if (!user) throw new Error('É necessário entrar para alterar uma ocorrência.')
    const values = { ...exception, user_id: user.id, updated_at: new Date().toISOString() }
    const { data, error } = await supabase
      .from('routine_exceptions')
      .upsert(values, { onConflict: 'routine_rule_id,occurrence_date' })
      .select()
      .single()
    if (error) throw error
    setRoutineExceptions(previous => [
      ...previous.filter(item => !(item.routine_rule_id === data.routine_rule_id && item.occurrence_date === data.occurrence_date)),
      data,
    ])
  }

  const deleteRoutineException = async (ruleId: string, date: string) => {
    if (!user) throw new Error('É necessário entrar para restaurar a ocorrência.')
    const { error } = await supabase
      .from('routine_exceptions')
      .delete()
      .eq('routine_rule_id', ruleId)
      .eq('user_id', user.id)
      .eq('occurrence_date', date)
    if (error) throw error
    setRoutineExceptions(previous => previous.filter(item =>
      item.routine_rule_id !== ruleId || item.occurrence_date !== date,
    ))
  }

  const copyRoutineWeekday = async (sourceWeekday: number, targetWeekday: number) => {
    if (!user) throw new Error('É necessário entrar para copiar a rotina.')
    const { error } = await supabase.rpc('copy_routine_weekday', {
      source_weekday: sourceWeekday,
      target_weekday: targetWeekday,
    })
    if (error) throw error
    await loadRoutineRules()
  }

  const confirmRoutineOccurrence = async (ruleId: string, date: string) => {
    if (!user) throw new Error('É necessário entrar para confirmar uma ocorrência.')
    const { error } = await supabase.rpc('confirm_routine_occurrence', {
      target_rule_id: ruleId,
      confirmed_date: date,
    })
    if (error) throw error
    await loadRoutineRules()
  }

  return (
    <CalendarContext.Provider
      value={{
        month,
        year,
        setMonth,
        setYear,
        selectedDay,
        setSelectedDay,
        view,
        setView,
        setDefaultCalendarView,
        timeFormat,
        setTimeFormat,
        weekStartsOn,
        setWeekStartsOn,
        events,
        setEvents,
        holidays,
        setHolidays,
        isLoadingCalendarData,
        calendarDataError,
        routineDataError,
        routineRules,
        routineExceptions,
        loadRoutineRules,
        saveRoutineRule,
        updateRoutineRule,
        deleteRoutineRule,
        saveRoutineException,
        deleteRoutineException,
        copyRoutineWeekday,
        confirmRoutineOccurrence,
        user,
        loadEvents,
        loadHolidays,
        saveEvent,
        updateEvent,
        deleteEvent,
        toggleEventStatus,
      }}
    >
      {children}
    </CalendarContext.Provider>
  )
}
