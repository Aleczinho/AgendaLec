// Tabelas que o front pode consultar e as colunas permitidas em cada uma.
// Nomes de tabela/coluna NUNCA vêm direto do cliente para o SQL: só entram
// se estiverem nesta lista (valores sempre vão como parâmetros $n).
//
// owner: coluna que identifica o dono da linha. A API força essa coluna em
// todas as operações — é o que substitui o RLS do Supabase.
// readGlobal: linhas com owner NULL são legíveis por todos (feriados globais).

const table = (owner, columns, extra = {}) => ({ owner, columns: new Set(columns), json: new Set(), ...extra })

export const TABLES = {
  profiles: table('id', [
    'id', 'display_name', 'timezone', 'preferences', 'created_at', 'updated_at',
  ], { json: new Set(['preferences']) }),

  calendars: table('user_id', [
    'id', 'user_id', 'name', 'description', 'color', 'is_active', 'created_at', 'updated_at',
  ]),

  events: table('user_id', [
    'id', 'user_id', 'calendar_id', 'title', 'description', 'category', 'start_at', 'end_at',
    'all_day', 'location', 'color', 'status', 'notes', 'recurrence_rule', 'certainty',
    'created_at', 'updated_at',
  ]),

  holiday_dates: table('user_id', [
    'id', 'user_id', 'date', 'name', 'scope', 'municipality', 'state', 'source_url',
    'verification_status', 'seed_key', 'created_at', 'updated_at',
  ], { readGlobal: true }),

  routine_rules: table('user_id', [
    'id', 'user_id', 'seed_key', 'title', 'description', 'category', 'calendar_id', 'weekdays',
    'start_time', 'end_time', 'start_time_earliest', 'start_time_latest', 'end_time_earliest',
    'end_time_latest', 'schedule_type', 'is_approximate', 'recurrence_interval_weeks',
    'recurrence_anchor_date', 'first_confirmed_on', 'confirmation_required', 'valid_from',
    'valid_until', 'timezone', 'is_active', 'created_at', 'updated_at',
  ]),

  routine_exceptions: table('user_id', [
    'id', 'routine_rule_id', 'user_id', 'occurrence_date', 'action', 'overridden_title',
    'overridden_start_time', 'overridden_end_time', 'notes', 'created_at', 'updated_at',
  ]),
}

// Funções SQL expostas. `args` define a ordem e o cast dos parâmetros (o id do
// usuário autenticado é sempre o primeiro argumento e nunca vem do cliente).
export const RPCS = {
  copy_routine_weekday: {
    args: [['source_weekday', 'smallint'], ['target_weekday', 'smallint']],
  },
  confirm_routine_occurrence: {
    args: [['target_rule_id', 'uuid'], ['confirmed_date', 'date']],
  },
}
