import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarNavProps {
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  disabled?: boolean
}

export const CalendarNav = ({
  onPrev,
  onNext,
  onToday,
  disabled = false,
}: CalendarNavProps) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        onClick={onPrev}
        disabled={disabled || !onPrev}
        className={cn(
          'p-2 rounded-md hover:bg-primary/10 hover:text-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <X className="h-5 w-5 opacity-50" />

      <button
        onClick={onToday}
        className={cn(
          'p-2 rounded-md hover:bg-accent/10 hover:text-accent',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'
        )}
      >
        Hoje
      </button>

      <button
        onClick={onNext}
        disabled={disabled || !onNext}
        className={cn(
          'p-2 rounded-md hover:bg-primary/10 hover:text-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}