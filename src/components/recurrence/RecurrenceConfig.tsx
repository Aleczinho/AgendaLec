import { cn } from '@/lib/utils'
import { useState } from 'react'

interface RecurrenceConfigProps {
  mode: 'create' | 'edit'
  initialFrequency?: string
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
  const [frequency, setFrequency] = useState<'none' | 'daily' | 'weekly' | 'monthly'>(
    initialFrequency || 'none'
  )
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date | null>(null)

  // Calculate end date for weekly recurrence (3 months by default)
  const calculateDefaultEndDate = () => {
    const defaultEnd = new Date()
    defaultEnd.setMonth(defaultEnd.getMonth() + 3)
    return defaultEnd
  }

  if (mode === 'edit' && initialFrequency) {
    setFrequency(initialFrequency)
  }

  const handleFrequencyChange = (value: string) => {
    setFrequency(value as any)
    onFrequencyChange(value)
  }

  const handleStartDateChange = (date: Date) => {
    setStartDate(date)
    onStartDateChange(date)
  }

  const handleEndDateChange = (date: Date) => {
    setEndDate(date)
    if (onEndDate) onEndDate(date)
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
            onChange={(e) => handleFrequencyChange(e.target.value)}
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
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => handleStartDateChange(new Date(e.target.value))}
                className="input input-sm w-full"
              />
            </div>

            {onEndDate && (
              <div>
                <label className="block text-xs text-secondary mb-1">Data final</label>
                <input
                  type="date"
                  value={endDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => handleEndDateChange(new Date(e.target.value))}
                  className="input input-sm w-full"
                />
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