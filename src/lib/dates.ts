export const combineLocalDateTime = (date: Date, time = '00:00') => {
  const [year, month, day] = date.toISOString().slice(0, 10).split('-').map(Number)
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString()
}
