// Funções de rotina que antes eram funções PL/pgSQL chamadas via /api/rpc/:nome
// (copy_routine_weekday e confirm_routine_occurrence). Agora rodam aqui, com o Prisma Client,
// dentro da transação aberta por quem chama. O id do usuário vem sempre do token.
import { ApiError } from './errors.js'
import { toDb } from './values.js'

const raise = message => new ApiError(message, { code: 'P0001' })

const COPY_FIELDS = [
  'title', 'description', 'category', 'calendar_id', 'start_time', 'end_time',
  'start_time_earliest', 'start_time_latest', 'end_time_earliest', 'end_time_latest',
  'schedule_type', 'is_approximate', 'recurrence_interval_weeks', 'recurrence_anchor_date',
  'first_confirmed_on', 'confirmation_required', 'valid_from', 'valid_until', 'timezone',
]

/** Copia a rotina de um dia da semana para outro (substitui a regra do dia de destino). */
const copyRoutineWeekday = async (tx, userId, { source_weekday: source, target_weekday: target }) => {
  if (source < 0 || source > 6 || target < 0 || target > 6) throw raise('Weekdays must be between 0 and 6')
  if (source === target) throw raise('Source and target weekdays must differ')

  const targetRules = await tx.routine_rules.findMany({
    where: { user_id: userId, is_active: true, weekdays: { has: target } },
  })
  for (const rule of targetRules) {
    const exceptions = await tx.routine_exceptions.findMany({
      where: { routine_rule_id: rule.id, user_id: userId },
      select: { id: true, occurrence_date: true },
    })
    const stale = exceptions.filter(item => item.occurrence_date.getUTCDay() === target).map(item => item.id)
    if (stale.length > 0) await tx.routine_exceptions.deleteMany({ where: { id: { in: stale }, user_id: userId } })

    const remaining = rule.weekdays.filter(day => day !== target)
    await tx.routine_rules.updateMany({
      where: { id: rule.id, user_id: userId },
      data: remaining.length === 0
        ? { is_active: false, updated_at: new Date() }
        : { weekdays: { set: remaining }, updated_at: new Date() },
    })
  }

  const sourceRules = await tx.routine_rules.findMany({
    where: { user_id: userId, is_active: true, weekdays: { has: source } },
  })
  if (sourceRules.length > 0) {
    await tx.routine_rules.createMany({
      data: sourceRules.map(rule => ({
        user_id: userId,
        ...Object.fromEntries(COPY_FIELDS.map(field => [field, rule[field]])),
        weekdays: [target],
        is_active: true,
      })),
    })
  }
}

/** Confirma uma ocorrência pendente e passa a regra para repetição quinzenal. */
const confirmRoutineOccurrence = async (tx, userId, { target_rule_id: ruleId, confirmed_date: confirmedDate }) => {
  const { count } = await tx.routine_rules.updateMany({
    where: { id: ruleId, user_id: userId, is_active: true, confirmation_required: true },
    data: {
      first_confirmed_on: confirmedDate,
      recurrence_anchor_date: confirmedDate,
      recurrence_interval_weeks: 2,
      confirmation_required: false,
      updated_at: new Date(),
    },
  })
  if (count === 0) throw raise('Routine rule not found or confirmation is no longer pending')

  await tx.routine_exceptions.upsert({
    where: { routine_rule_id_occurrence_date: { routine_rule_id: ruleId, occurrence_date: confirmedDate } },
    create: {
      routine_rule_id: ruleId,
      user_id: userId,
      occurrence_date: confirmedDate,
      action: 'confirmed',
      overridden_title: 'Aprisco',
      notes: 'Confirmado pelo usuário.',
    },
    update: {
      action: 'confirmed',
      overridden_title: 'Aprisco',
      overridden_start_time: null,
      overridden_end_time: null,
      notes: 'Confirmado pelo usuário.',
      updated_at: new Date(),
    },
  })
}

// Funções expostas em /api/rpc/:nome. `args` define a ordem e o tipo dos parâmetros.
export const RPCS = {
  copy_routine_weekday: {
    args: [['source_weekday', 'smallint'], ['target_weekday', 'smallint']],
    run: copyRoutineWeekday,
  },
  confirm_routine_occurrence: {
    args: [['target_rule_id', 'uuid'], ['confirmed_date', 'date']],
    run: confirmRoutineOccurrence,
  },
}

/** Valida e converte um argumento recebido do cliente. */
export const coerceArg = (type, value, name) => {
  if (type === 'smallint') {
    const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
    if (!Number.isInteger(number) || number < -32768 || number > 32767) {
      throw new ApiError(`Valor inválido para ${name}.`, { code: '22P02' })
    }
    return number
  }
  return toDb(type, value)
}
