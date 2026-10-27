import { useEffect, useState } from 'react'
import { formatDateInput, isValidDateInput, maskDateInput, parseDateInput } from '@/lib/dateInput'

type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly'

interface RecurrenceConfigProps {
  mode: 'create' | 'edit'
  initialFrequency?: RecurrenceFrequency
  onFrequencyChange: (frequency: string) => void
  onStartDateChange: (date: Date) => void
  onEndDate?: (date: Date) => void
  onExceptionAction?: (action: 'single' | 'series' | 'all') => void
}

export const RecurrenceConfig = ({
  mode,
  initialFrequency,
  onFrequencyChange,
  onStartDateChange,
  onEndDate,
  onExceptionAction,
}: RecurrenceConfigProps) => {
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    initialFrequency || 'none'
  )
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return formatDateInput(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())))
  })
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (mode === 'edit' && initialFrequency) setFrequency(initialFrequency)
  }, [initialFrequency, mode])

  const handleFrequencyChange = (value: RecurrenceFrequency) => {
    setFrequency(value)
    onFrequencyChange(value)
  }

  const handleStartDateChange = (value: string) => {
    const maskedValue = maskDateInput(value)
    setStartDate(maskedValue)
    const date = parseDateInput(maskedValue)
    if (date) onStartDateChange(date)
  }

  const handleEndDateChange = (value: string) => {
    const maskedValue = maskDateInput(value)
    setEndDate(maskedValue)
    const date = maskedValue ? parseDateInput(maskedValue) : null
    if (date && onEndDate) onEndDate(date)
  }

  return (
    <div className="p-4 rounded-lg bg-surface border border-border">
      <h3 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">
        Recorrência
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-secondary mb-1">Frequência</label>
          <select
            value={frequency}
            onChange={(e) => handleFrequencyChange(e.target.value as RecurrenceFrequency)}
            className="select select-sm w-full"
          >
            <option value="none">Não recorrente</option>
            <option value="daily">Diário</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
        </div>

        {frequency !== 'none' && (
          <>
            <div>
              <label className="block text-xs text-secondary mb-1">Data de início</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aa"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className={`input input-sm w-full${isValidDateInput(startDate) ? '' : ' border-red-500'}`}
                aria-invalid={!isValidDateInput(startDate)}
              />
              {!isValidDateInput(startDate) && <p role="alert" className="text-sm text-red-600">Use o formato dd/mm/aa.</p>}
            </div>

            {onEndDate && (
              <div>
                <label className="block text-xs text-secondary mb-1">Data final</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aa"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className={`input input-sm w-full${!endDate || isValidDateInput(endDate) ? '' : ' border-red-500'}`}
                  aria-invalid={Boolean(endDate) && !isValidDateInput(endDate)}
                />
                {endDate && !isValidDateInput(endDate) && <p role="alert" className="text-sm text-red-600">Use o formato dd/mm/aa.</p>}
              </div>
            )}
          </>
        )}

        {mode === 'edit' && frequency !== 'none' && (
          <div>
            <label className="block text-xs text-secondary mb-1">Exceção</label>
            <div className="flex gap-2">
              <button
                onClick={() => onExceptionAction?.('single')}
                className="flex-1 btn btn-ghost btn-sm text-sm text-primary hover:text-primary"
              >
                Apenas esta ocorrência
              </button>
              <button
                onClick={() => onExceptionAction?.('series')}
                className="flex-1 btn btn-ghost btn-sm text-sm text-secondary hover:text-secondary"
              >
                Esta e as seguintes
              </button>
              <button
                onClick={() => onExceptionAction?.('all')}
                className="flex-1 btn btn-ghost btn-sm text-sm text-warning hover:text-warning"
              >
                Toda a série
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}