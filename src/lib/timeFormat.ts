export type TimeFormat = '24h' | '12h'

export const formatClock = (date: string | null | undefined, timeFormat: TimeFormat = '24h') => {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  })
}

export const formatTimeValue = (value: string, timeFormat: TimeFormat = '24h') => {
  const [hoursText, minutes] = value.slice(0, 5).split(':')
  const hours = Number(hoursText)
  if (timeFormat === '24h' || !Number.isInteger(hours) || hours < 0 || hours > 23 || !minutes) {
    return value.slice(0, 5)
  }
  const suffix = hours < 12 ? 'AM' : 'PM'
  return `${String(hours % 12 || 12).padStart(2, '0')}:${minutes} ${suffix}`
}
