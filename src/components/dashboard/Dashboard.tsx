import { cn } from '@/lib/utils'
import { Indicator } from '@/components/dashboard/Indicators'
import { NextEvents } from '@/components/dashboard/NextEvents'
import { CalendarNav } from '@/components/ui/CalendarNav'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface DashboardProps {
  month: number
  year: number
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  totalEvents: number
  completedEvents: number
  pendingEvents: number
  upcomingEvents: Array<{ title: string; time: string; category: string }>
}

export const Dashboard = ({
  month,
  year,
  onPrevMonth,
  onNextMonth,
  onToday,
  totalEvents,
  completedEvents,
  pendingEvents,
  upcomingEvents,
}: DashboardProps) => {
  return (
    <section className="p-6">
      <header className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <X className="h-5 w-5 opacity-50 cursor-pointer" />
          <h1 className="text-3xl font-bold">Painel</h1>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={onPrevMonth} className="p-2 rounded-md hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div>
            <p className="text-lg font-medium">{new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' })} {year}</p>
            <p className="text-sm text-secondary">{new Date(year, month - 1).toLocaleDateString('pt-BR', { day: 'numeric' })}</p>
          </div>

          <button onClick={onNextMonth} className="p-2 rounded-md hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <ChevronRight className="h-4 w-4" />
          </button>

          <button onClick={onToday} className="p-2 rounded-md hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
            Hoje
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Indicadores principais */}
        <div>
          <Indicator
            label="Compromissos Totais"
            value={totalEvents.toString()}
            icon={<span className="text-primary" /> }
            trend={totalEvents > 0 ? 'up' : 'neutral'}
          />
        </div>

        <div>
          <Indicator
            label="Concluídos"
            value={completedEvents.toString()}
            icon={<span className="text-green-500" /> }
            trend={completedEvents > 0 ? 'up' : 'neutral'}
          />
        </div>

        <div>
          <Indicator
            label="Pendentes"
            value={pendingEvents.toString()}
            icon={<span className="text-orange-500" /> }
            trend={pendingEvents > 0 ? 'up' : 'neutral'}
          />
        </div>

        {/* Próximos eventos */}
        <div>
          <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Próximos compromissos</h2>
          <NextEvents events={upcomingEvents} />
        </div>

        {/* Visão resumida da semana */}
        <div>
          <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Semana atual</h2>
          <p className="text-sm text-muted">Mostrando resumo dos próximos 7 dias</p>
        </div>
      </div>

      {/* Calendário compacto */}
      <div className="mt-6 pt-6 border-t border-border">
        <CalendarNav onPrev={onPrevMonth} onNext={onNextMonth} onToday={onToday} />
        <p className="text-sm text-muted mt-2">Calendário mensal compacto</p>
      </div>
    </section>
  )
}