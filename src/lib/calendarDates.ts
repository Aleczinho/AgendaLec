export const getMonthGridDates = (
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 0,
) => {
  const firstDay = new Date(year, month - 1, 1)
  const leadingDays = (firstDay.getDay() - weekStartsOn + 7) % 7
  const daysInMonth = new Date(year, month, 0).getDate()
  const cellCount = Math.max(35, Math.ceil((leadingDays + daysInMonth) / 7) * 7)
  const start = new Date(year, month - 1, 1 - leadingDays)

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

export const shiftMonth = (year: number, month: number, amount: number) => {
  const date = new Date(year, month - 1 + amount, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export const isSameLocalDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate()

export const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
