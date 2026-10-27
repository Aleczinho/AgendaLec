import { createContext, useContext, useState, useEffect } from 'react'

import { supabase, getSession, getUser } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface CalendarContextValue {
  month: number
  year: number
  setMonth: (month: number) => void
  setYear: (year: number) => void
  selectedDay: number
  setSelectedDay: (day: number) => void
  view: 'month' | 'week' | 'day'
  setView: (view: 'month' | 'week' | 'day') => void
  events: any[]
  setEvents: (events: any[]) => void
  calendars: any[]
  setCalendars: (calendars: any[]) => void
  holidays: any[]
  setHolidays: (holidays: any[]) => void
  user: User | null
  loadEvents: () => Promise<void>
  loadCalendars: () => Promise<void>
  loadHolidays: () => Promise<void>
  saveEvent: (eventData: any) => Promise<any | null>
  updateEvent: (eventId: string, eventData: any) => Promise<any | null>
  deleteEvent: (eventId: string) => Promise<void>
  toggleEventStatus: (eventId: string, status: string) => Promise<any | null>
}

const CalendarContext = createContext<CalendarContextValue | undefined>(undefined)

export const useCalendar = () => {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider')
  }
  return context
}

export const CalendarProvider = ({
  children,
}: { children: React.ReactNode }) => {
  const [month, setMonth] = useState(1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedDay, setSelectedDay] = useState(1)
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [events, setEvents] = useState<any[]>([])
  const [calendars, setCalendars] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [user, setUser] = useState<User | null>(null)

  // Carrega dados do usuário e do banco ao montar
  useEffect(() => {
    const init = async () => {
      // Primeiro, verificar se há sessão ativa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        // Usuário não autenticado, definir estado silenciosamente sem erro no console
        setUser(null)
        return
      }

      // Se há sessão ativa, buscar dados do usuário
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        console.error('Auth error:', error)
        setUser(null)
        return
      }

      const authenticatedUser = data?.user

      if (authenticatedUser) {
        setUser(authenticatedUser)

        // Carregar calendários do usuário
        const loadCalendars = async () => {
          const { data, error } = await supabase
            .from('calendars')
            .select('*')
            .eq('user_id', authenticatedUser.id)

          if (data) setCalendars(data)
          if (error) console.error('Calendars error:', error)
        }

        // Carregar eventos
        const loadEventsFromSupabase = async () => {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('user_id', authenticatedUser.id)

          if (data) setEvents(data)
          if (error) console.error('Events error:', error)
        }

        // Carregar feriados
        const loadHolidaysFromSupabase = async () => {
          const today = new Date()
          const currentYear = today.getFullYear()

          const { data, error } = await supabase
            .from('holiday_dates')
            .select('*')
            .eq('year', currentYear)

          if (data) {
            setHolidays(data)
          }
          if (error) console.error('Holidays error:', error)
        }

        await loadCalendars()
        await loadEventsFromSupabase()
        await loadHolidaysFromSupabase()
      } else {
        // Usuário não logado, limpar estado
        setUser(null)
        setEvents([])
        setCalendars([])
        setHolidays([])
      }
    }

    init()
  }, [])

  // Carregar eventos quando o mês/ano mudar
  useEffect(() => {
    const loadEventsForPeriod = async () => {
      if (!user) return

      const startOfPeriod = new Date(year, month - 1, 1)
      const endOfPeriod = new Date(year, month, 0)

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_at', startOfPeriod.toISOString())
        .lte('end_at', endOfPeriod.toISOString())
        .eq('user_id', user.id)

      if (data) setEvents(data)
      if (error) console.error('Load events error:', error)
    }

    loadEventsForPeriod()
  }, [year, month])

  // Salvar novo evento
  const saveEvent = async (eventData: any) => {
    if (!user) return null

    const { data, error } = await supabase
      .from('events')
      .insert({
        user_id: user.id,
        calendar_id: eventData.calendar_id,
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        start_at: eventData.start_at,
        end_at: eventData.end_at,
        all_day: eventData.all_day,
        location: eventData.location,
        color: eventData.color,
        status: eventData.status,
        notes: eventData.notes,
        recurrence_rule: eventData.recurrence_rule,
      })
      .select()

    if (error) {
      console.error('Save event error:', error)
      return null
    }
    else if (data) {
      setEvents(prev => [...prev, data[0]])
      return data[0]
    }

    return null
  }

  // Atualizar evento
  const updateEvent = async (eventId: string, eventData: any) => {
    if (!user) return null

    const { data, error } = await supabase
      .from('events')
      .update({
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        start_at: eventData.start_at,
        end_at: eventData.end_at,
        all_day: eventData.all_day,
        location: eventData.location,
        color: eventData.color,
        status: eventData.status,
        notes: eventData.notes,
        recurrence_rule: eventData.recurrence_rule,
      })
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select()

    if (error) console.error('Update event error:', error)
    else if (data) setEvents(prev => prev.map(e => e.id === eventId ? data[0] : e))

    return data?.[0] || null
  }

  // Excluir evento
  const deleteEvent = async (eventId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id)

    if (error) console.error('Delete event error:', error)
    else setEvents(prev => prev.filter(e => e.id !== eventId))
  }

  // Alterar status (concluir/cancelar)
  const toggleEventStatus = async (eventId: string, status: string) => {
    if (!user) return null

    const { data, error } = await supabase
      .from('events')
      .update({ status })
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select()

    if (error) console.error('Toggle status error:', error)
    else setEvents(prev => prev.map(e => e.id === eventId ? data[0] : e))

    return data?.[0] || null
  }

  const contextValue = {
    month,
    year,
    setMonth,
    setYear,
    selectedDay,
    setSelectedDay,
    view,
    setView,
    events,
    setEvents,
    calendars,
    setCalendars,
    holidays,
    setHolidays,
    user,
    loadEvents: async () => {
      if (!user) return
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
      if (data) setEvents(data)
      if (error) console.error('Load events error:', error)
    },
    loadCalendars: async () => {
      if (!user) return
      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', user.id)
      if (data) setCalendars(data)
      if (error) console.error('Load calendars error:', error)
    },
    loadHolidays: async () => {
      if (!user) return
      const today = new Date()
      const currentYear = today.getFullYear()
      const { data, error } = await supabase
        .from('holiday_dates')
        .select('*')
        .eq('year', currentYear)
      if (data) setHolidays(data)
      if (error) console.error('Load holidays error:', error)
    },
    saveEvent,
    updateEvent,
    deleteEvent,
    toggleEventStatus,
  }

  return (
    <CalendarContext.Provider value={contextValue}>
      {children}
    </CalendarContext.Provider>
  )
}