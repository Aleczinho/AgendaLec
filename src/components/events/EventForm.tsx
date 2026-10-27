import { cn } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { errorMessage } from '@/lib/errors'
import { formatDateInput, isValidDateInput, maskDateInput } from '@/lib/dateInput'

export const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  date: z.string().refine(isValidDateInput, 'Informe uma data válida no formato dd/mm/aa'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  category: z.string(),
  all_day: z.boolean().default(false),
  certainty: z.enum(['confirmed', 'planned', 'possible']).default('confirmed'),
  location: z.string().optional(),
})

export type EventFormValues = z.infer<typeof eventSchema>

interface EventFormProps {
  initialData?: EventFormValues
  onSubmit: (data: EventFormValues) => void | Promise<void>
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EventFormValues>({
    defaultValues: {
      title: '',
      description: '',
      date: formatDateInput(new Date()),
      start_time: '',
      end_time: '',
      category: 'rotina',
      all_day: false,
      certainty: 'confirmed',
      location: '',
    },
  })
  const dateField = register('date', {
    required: 'A data é obrigatória',
    validate: value => isValidDateInput(value) || 'Informe uma data válida no formato dd/mm/aa',
  })

  useEffect(() => {
    if (initialData) reset(initialData)
  }, [initialData, reset])

  const onSubmitHandler = handleSubmit(async (values: EventFormValues) => {
    setIsSubmitting(true)
    setSubmitError('')
    try {
      if (!values.all_day && values.start_time && values.end_time && values.end_time <= values.start_time) {
        setSubmitError('O horário final deve ser posterior ao horário inicial.')
        return
      }
      await onSubmit(values)
      onClose()
    } catch (error) {
      setSubmitError(errorMessage(error, 'Não foi possível salvar o compromisso.'))
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div className="event-form">
      <div className="event-form-card">
        <h2 id="event-modal-title" className="event-form-title">
          {mode === 'create' ? 'Adicionar compromisso' : 'Editar compromisso'}
        </h2>
        <p className="event-form-hint">Este compromisso acontece uma vez. Para afazeres que se repetem, use Rotina.</p>

        <form onSubmit={onSubmitHandler}>
          <div className="form-field">
            <label className="block text-sm font-medium text-secondary mb-1">Título</label>
            <input
              {...register('title', { required: 'O título é obrigatório' })}
              className={cn('input', errors.title && 'border-red-500')}
              required
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div className="event-form-grid">
            <div className="form-field">
              <label className="block text-sm font-medium text-secondary mb-1">Data</label>
              <input
                {...dateField}
                onChange={event => {
                  event.target.value = maskDateInput(event.target.value)
                  void dateField.onChange(event)
                }}
                className={cn('input', errors.date && 'border-red-500')}
                inputMode="numeric"
                placeholder="dd/mm/aa"
                aria-describedby={errors.date ? 'event-date-error' : undefined}
                required
              />
              {errors.date && <p id="event-date-error" className="text-sm text-red-600">{errors.date.message}</p>}
            </div>
            <label className="form-checkbox">
              <input type="checkbox" {...register('all_day')} />
              Dia inteiro
            </label>
          </div>

          <div className="form-field">
            <label className="block text-sm font-medium text-secondary mb-1">Horário (opcional)</label>
            <div className="flex gap-2">
              <input
                {...register('start_time')}
                type="time"
                className="input input-sm flex-1"
                aria-label="Horário de início"
              />
              <span className="text-sm text-secondary">a</span>
              <input
                {...register('end_time')}
                type="time"
                className="input input-sm flex-1"
                aria-label="Horário de término"
              />
            </div>
          </div>

          <div className="event-form-grid">
            <div className="form-field">
              <label className="block text-sm font-medium text-secondary mb-1">Categoria</label>
              <select {...register('category')} className="select select-sm">
                <option value="rotina">Rotina</option>
                <option value="escola">Escola</option>
                <option value="estagio">Estágio</option>
                <option value="deslocamento">Deslocamento</option>
                <option value="academia">Academia</option>
                <option value="igreja">Igreja</option>
                <option value="aprifixo">Aprisco</option>
                <option value="estudos">Estudos</option>
                <option value="afazeres-domesticos">Afazeres domésticos</option>
                <option value="lazer">Lazer</option>
                <option value="saude">Saúde</option>
                <option value="feriado">Feriado</option>
                <option value="evento-especial">Evento especial</option>
                <option value="descanso">Descanso</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div className="form-field">
              <label className="block text-sm font-medium text-secondary mb-1">Confirmação</label>
              <select {...register('certainty')} className="select select-sm">
                <option value="confirmed">Confirmado</option>
                <option value="planned">Previsto</option>
                <option value="possible">Possibilidade</option>
              </select>
            </div>
          </div>

          <details className="event-optional-fields">
            <summary>Mais detalhes (opcional)</summary>
            <div className="event-optional-fields-content">
              <div className="form-field">
                <label className="block text-sm font-medium text-secondary mb-1">Descrição</label>
                <textarea
                  {...register('description')}
                  className="input input-sm"
                  rows={2}
                  placeholder="Informações adicionais..."
                />
              </div>
              <div className="form-field">
                <label className="block text-sm font-medium text-secondary mb-1">Local</label>
                <input {...register('location')} className="input" placeholder="Local opcional..." />
              </div>
            </div>
          </details>

          <div className="event-form-actions">
            {submitError && <p role="alert" className="text-sm text-red-600">{submitError}</p>}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Criar Compromisso' : 'Atualizar Compromisso'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}