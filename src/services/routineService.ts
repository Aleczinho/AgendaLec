import { supabase } from '@/lib/supabase'
import { initialNovemberHolidays, initialRoutineRules } from '@/lib/routineSeed'

export const initializeHolidaysForUser = async (userId: string) => {
  const holidays = initialNovemberHolidays.map(holiday => ({
    id: crypto.randomUUID(),
    ...holiday,
    user_id: userId,
    scope: 'nacional',
    verification_status: 'verified',
  }))
  const { error } = await supabase
    .from('holiday_dates')
    .upsert(holidays, { onConflict: 'user_id,seed_key', ignoreDuplicates: true })
  if (error) throw error

  return holidays.length
}

export const initializeRoutineForUser = async (userId: string) => {
  const keys = initialRoutineRules.map(rule => rule.seed_key).filter((key): key is string => key !== null)
  const { data: existingRules, error: existingError } = await supabase
    .from('routine_rules')
    .select('seed_key')
    .eq('user_id', userId)
    .in('seed_key', keys)
  if (existingError) throw existingError

  const existingKeys = new Set((existingRules ?? []).map(rule => rule.seed_key))
  const missingRules = initialRoutineRules
    .filter(rule => rule.seed_key && !existingKeys.has(rule.seed_key))
    .map(rule => ({ ...rule, user_id: userId }))

  if (missingRules.length > 0) {
    const { error } = await supabase
      .from('routine_rules')
      .upsert(missingRules, { onConflict: 'user_id,seed_key', ignoreDuplicates: true })
    if (error) throw error
  }

  const holidayCount = await initializeHolidaysForUser(userId)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) throw profileError

  const preferences = (profile?.preferences ?? {}) as Record<string, unknown>
  const nextPreferences = {
    ...preferences,
    calendarReferenceMonth: preferences.calendarReferenceMonth ?? 11,
    calendarReferenceYear: preferences.calendarReferenceYear ?? 2026,
    calendarReferenceDay: preferences.calendarReferenceDay ?? 1,
  }
  const { error: preferenceError } = await supabase
    .from('profiles')
    .upsert({ id: userId, preferences: nextPreferences }, { onConflict: 'id' })
  if (preferenceError) throw preferenceError

  return { insertedRules: missingRules.length, holidays: holidayCount }
}
