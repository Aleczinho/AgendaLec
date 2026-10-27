const pad = (value: number) => String(value).padStart(2, '0')

export const maskDateInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export const formatDateInput = (date: Date) => (
  `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${String(date.getUTCFullYear()).slice(-2)}`
)

export const parseDateInput = (value: string): Date | null => {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value.trim())
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = 2000 + Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? date
    : null
}

export const isValidDateInput = (value: string) => parseDateInput(value) !== null
