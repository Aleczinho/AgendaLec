// Tabelas que o front pode consultar e as colunas permitidas em cada uma (com o tipo de cada
// coluna, usado para converter texto <-> Date). Nomes de tabela/coluna NUNCA vêm direto do
// cliente para o Prisma: só entram se estiverem nesta lista, e o nome da tabela é também o nome
// do model no schema.prisma.
//
// owner: coluna que identifica o dono da linha. A API força essa coluna em todas as operações
// — é o que substitui o RLS do Supabase.
// readGlobal: linhas com owner NULL são legíveis por todos (feriados globais).
//
// Tipos: uuid | text | bool | int | int[] | date | time | timestamp | json

const table = (owner, types, extra = {}) => ({ owner, types, columns: new Set(Object.keys(types)), ...extra })

const stamps = { created_at: 'timestamp', updated_at: 'timestamp' }

export const TABLES = {
  profiles: table('id', {
    id: 'uuid', display_name: 'text', timezone: 'text', preferences: 'json', ...stamps,
  }),

  calendars: table('user_id', {
    id: 'uuid', user_id: 'uuid', name: 'text', description: 'text', color: 'text', is_active: 'bool', ...stamps,
  }),

  events: table('user_id', {
    id: 'uuid', user_id: 'uuid', calendar_id: 'uuid', title: 'text', description: 'text', category: 'text',
    start_at: 'timestamp', end_at: 'timestamp', all_day: 'bool', location: 'text', color: 'text',
    status: 'text', notes: 'text', recurrence_rule: 'text', certainty: 'text', ...stamps,
  }),

  holiday_dates: table('user_id', {
    id: 'uuid', user_id: 'uuid', date: 'date', name: 'text', scope: 'text', municipality: 'text',
    state: 'text', source_url: 'text', verification_status: 'text', seed_key: 'text', ...stamps,
  }, { readGlobal: true }),

  routine_rules: table('user_id', {
    id: 'uuid', user_id: 'uuid', seed_key: 'text', title: 'text', description: 'text', category: 'text',
    calendar_id: 'uuid', weekdays: 'int[]', start_time: 'time', end_time: 'time',
    start_time_earliest: 'time', start_time_latest: 'time', end_time_earliest: 'time', end_time_latest: 'time',
    schedule_type: 'text', is_approximate: 'bool', recurrence_interval_weeks: 'int',
    recurrence_anchor_date: 'date', first_confirmed_on: 'date', confirmation_required: 'bool',
    valid_from: 'date', valid_until: 'date', timezone: 'text', is_active: 'bool', ...stamps,
  }),

  routine_exceptions: table('user_id', {
    id: 'uuid', routine_rule_id: 'uuid', user_id: 'uuid', occurrence_date: 'date', action: 'text',
    overridden_title: 'text', overridden_start_time: 'time', overridden_end_time: 'time', notes: 'text', ...stamps,
  }),
}
