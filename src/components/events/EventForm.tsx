import { cn } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { CalendarNav } from '@/components/ui/CalendarNav'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  date: z.date(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  category: z.string(),
  calendar_id: z.string().optional(),
  location: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
  notes: z.string().optional(),
  recurrence: z.string().optional(),
  reminder: z.string().optional(),
})

type EventFormValues = z.infer<typeof eventSchema>

interface EventFormProps {
  initialData?: EventFormValues
  onSubmit: (data: EventFormValues) => void
  onClose: () => void
  mode: 'create' | 'edit'
  eventId?: string
}

export const EventForm = ({
  initialData,
  onSubmit,
  onClose,
  mode = 'create',
  eventId,
}: EventFormProps) => {
  const navigate = useNavigate()
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EventFormValues>({
    defaultValues: {
      title: '',
      description: '',
      date: new Date(),
      start_time: '',
      end_time: '',
      category: 'rotina',
      calendar_id: '',
      location: '',
      color: '#3B82F6',
      status: 'pending',
      notes: '',
      recurrence: 'none',
      reminder: '',
    },
  })

  const onSubmitHandler = handleSubmit(async (values: EventFormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit(values)
      onClose()
    } catch (error) {
      console.error('Erro ao salvar evento:', error)
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div className="max-w-2xl mx-auto">
      <CalendarNav onPrev={() => {}} onNext={() => {}} onToday={() => {}} />

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-border">
        <h2 className="text-xl font-bold mb-4">
          {mode === 'create' ? 'Novo Compromisso' : 'Editar Compromisso'}
        </h2>

        <form onSubmit={onSubmitHandler} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Título</label>
            <input
              {...register('title', { required: 'O título é obrigatório' })}
              className={cn('input', errors.title && 'border-red-500')}
              required
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Descrição</label>
            <textarea
              {...register('description', { valueAsString: true })}
              className="input input-sm"
              rows={3}
              placeholder="Descrição opcional..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Data</label>
              <input
                {...register('date', { valueAsDate: true })}
                type="date"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Horário</label>
              <div className="flex gap-2">
                <input
                  {...register('start_time', { valueAsString: true })}
                  type="time"
                  className="input input-sm flex-1"
                />
                <span className="text-sm text-secondary">a</span>
                <input
                  {...register('end_time', { valueAsString: true })}
                  type="time"
                  className="input input-sm flex-1"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Categoria</label>
            <select {...register('category', { mode: 'onChange' })} className="select select-sm">
              <option value="rotina">Rotina</option>
              <option value="escola">Escola</option>
              <option value="estagio">Estágio</option>
              <option value="deslocamento">Deslocamento</option>
              <option value="academia">Academia</option>
              <option value="igreja">Igreja</option>
              <option value="aprifixo">Aprisco</option>
              <option value="estudos">Estudos</option>
              <option value="afazeres-domesticos">Afazeres Domésticos</option>
              <option value="lazer">Lazer</option>
              <option value="saude">Saúde</option>
              <option value="feriado">Feriado</option>
              <option value="evento-especial">Evento Especial</option>
              <option value="descanso">Descanso</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Agenda</label>
            <select {...register('calendar_id', { mode: 'onChange' })} className="select select-sm">
              <option value="">Nenhuma</option>
              <option value="pessoal">Rotina Pessoal</option>
              <option value="escola">Escola e Estágio</option>
              <option value="igreja">Igreja</option>
              <option value="estudos">Estudos</option>
              <option value="academia">Academia</option>
              <option value="projetos">Projetos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Local</label>
            <input
              {...register('location', { valueAsString: true })}
              className="input"
              placeholder="Local opcional..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Cor</label>
              <select {...register('color', { mode: 'onChange' })} className="select select-sm">
                <option value="#3B82F6">Azul</option>
                <option value="#10B981">Verde</option>
                <option value="#F59E0B">Laranja</option>
                <option value="#EF4444">Vermelho</option>
                <option value="#A78BFA">Roxo</option>
                <option value="#67E8F9">Ciano</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Status</label>
              <select {...register('status', { mode: 'onChange' })} className="select select-sm">
                <option value="pending">Pendente</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Observações</label>
            <textarea
              {...register('notes', { valueAsString: true })}
              className="input input-sm"
              rows={3}
              placeholder="Observações adicionais..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Recorrência</label>
              <select {...register('recurrence', { mode: 'onChange' })} className="select select-sm">
                <option value="none">Não recorrente</option>
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Lembrete</label>
              <select {...register('reminder', { mode: 'onChange' })} className="select select-sm">
                <option value="none">Nenhum</option>
                <option value="1h">1 hora antes</option>
                <option value="1d">1 dia antes</option>
                <option value="1w">1 semana antes</option>
              </select>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-display flex flex-col gap-3">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Criar Compromisso' : 'Atualizar Compromisso'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}