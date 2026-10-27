import { cn } from '@/lib/utils'

interface IndicatorProps {
  label: string
  value: string | number
  icon: React.ReactNode
  className?: string
  trend?: 'up' | 'down' | 'neutral'
}

export const Indicator = ({
  label,
  value,
  icon,
  className,
  trend,
}: IndicatorProps) => {
  const trendClass = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-text-secondary',
  }[trend]

  return (
    <div className={cn('p-4 rounded-lg', 'bg-surface', 'border', 'border-border', className)} aria-label={label}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-secondary">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div>
          {icon}
          <p className={trendClass} style={{ fontSize: '0.75rem' }}>{trend === 'up' ? '+12' : trend === 'down' ? '-3' : '—'}</p>
        </div>
      </div>
    </div>
  )
}