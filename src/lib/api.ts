// Cliente da API do AgendaLec. O navegador autentica por cookie HTTP-only do Better Auth.
// As consultas de dados continuam usando o contrato já existente da API.

export interface User {
  id: string
  email: string
  name?: string | null
}

export interface ApiError {
  message: string
  code?: string
  status?: number
}

export interface DbResult<T = any> {
  data: T
  error: ApiError | null
  count: number | null
}

/** URL base da API. Padrão `/api` (mesma origem, via proxy do nginx/Vite). */
export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

export const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar ao servidor da AgendaLec. Verifique se a API está em execução.'

const parseJson = async (response: Response) => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const request = async (path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers)
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    })
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE)
  }
  const json = await parseJson(response)
  return { response, json }
}

// ---------------------------------------------------------------- consultas

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'is'
interface Filter { col: string; op: FilterOperator; value: unknown }

const OPERATORS = new Set<string>(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is'])

const parseOrValue = (op: FilterOperator, raw: string): unknown => {
  if (op === 'is') return raw === 'null' ? null : raw === 'true' ? true : raw === 'false' ? false : raw
  return raw
}

/** Converte "col.op.valor,col2.op.valor" (sintaxe do .or) em filtros estruturados. */
const parseOr = (expression: string): Filter[] => expression.split(',').map(part => {
  const first = part.indexOf('.')
  const second = part.indexOf('.', first + 1)
  const col = part.slice(0, first)
  const op = part.slice(first + 1, second)
  if (first < 1 || second < 0 || !OPERATORS.has(op)) throw new Error(`Filtro .or inválido: ${part}`)
  return { col, op: op as FilterOperator, value: parseOrValue(op as FilterOperator, part.slice(second + 1)) }
})

type Operation = 'select' | 'insert' | 'upsert' | 'update' | 'delete'

export class QueryBuilder implements PromiseLike<DbResult> {
  private body: Record<string, unknown>
  private filters: Filter[] = []
  private orGroups: Filter[][] = []
  private orderBy: { col: string; ascending: boolean }[] = []

  constructor(table: string) {
    this.body = { table, op: 'select' as Operation }
  }

  private mutation(op: Operation, values?: unknown) {
    this.body.op = op
    if (values !== undefined) this.body.values = values
    return this
  }

  /** Sem mutação antes: lê linhas. Depois de insert/update/upsert/delete: devolve as linhas afetadas. */
  select(columns = '*', options?: { count?: 'exact' }) {
    if (this.body.op !== 'select') this.body.returning = true
    this.body.columns = columns
    if (options?.count) this.body.count = options.count
    return this
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) { return this.mutation('insert', values) }

  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options: { onConflict?: string; ignoreDuplicates?: boolean } = {},
  ) {
    this.body.onConflict = options.onConflict
    this.body.ignoreDuplicates = options.ignoreDuplicates ?? false
    return this.mutation('upsert', values)
  }

  update(values: Record<string, unknown>) { return this.mutation('update', values) }

  delete(options?: { count?: 'exact' }) {
    if (options?.count) this.body.count = options.count
    return this.mutation('delete')
  }

  private where(col: string, op: FilterOperator, value: unknown) {
    this.filters.push({ col, op, value })
    return this
  }

  eq(col: string, value: unknown) { return this.where(col, 'eq', value) }
  neq(col: string, value: unknown) { return this.where(col, 'neq', value) }
  gt(col: string, value: unknown) { return this.where(col, 'gt', value) }
  gte(col: string, value: unknown) { return this.where(col, 'gte', value) }
  lt(col: string, value: unknown) { return this.where(col, 'lt', value) }
  lte(col: string, value: unknown) { return this.where(col, 'lte', value) }
  in(col: string, values: unknown[]) { return this.where(col, 'in', values) }
  is(col: string, value: null | boolean) { return this.where(col, 'is', value) }

  or(expression: string) {
    this.orGroups.push(parseOr(expression))
    return this
  }

  order(col: string, options: { ascending?: boolean } = {}) {
    this.orderBy.push({ col, ascending: options.ascending ?? true })
    return this
  }

  limit(count: number) {
    this.body.limit = count
    return this
  }

  single() {
    this.body.single = 'single'
    return this
  }

  maybeSingle() {
    this.body.single = 'maybe'
    return this
  }

  private async execute(): Promise<DbResult> {
    const payload = { ...this.body, filters: this.filters, or: this.orGroups, order: this.orderBy }
    let result: Awaited<ReturnType<typeof request>>
    try {
      result = await request('/db', { method: 'POST', body: JSON.stringify(payload) })
    } catch (error) {
      const message = error instanceof Error ? error.message : NETWORK_ERROR_MESSAGE
      return { data: null, count: null, error: { message } }
    }
    return toDbResult(result.response, result.json)
  }

  then<TResult1 = DbResult, TResult2 = never>(
    onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }
}

const toDbResult = (response: Response, json: any): DbResult => {
  if (response.status === 401) {
    return { data: null, count: null, error: { message: json?.error?.message ?? 'Sessão expirada. Entre novamente.', code: 'unauthenticated', status: 401 } }
  }
  if (!response.ok || json?.error) {
    return {
      data: null,
      count: null,
      error: { message: json?.error?.message ?? 'Erro ao acessar o servidor.', code: json?.error?.code, status: response.status },
    }
  }
  return { data: json?.data ?? null, count: json?.count ?? null, error: null }
}

export const db = {
  from: (table: string) => new QueryBuilder(table),

  /** Chama uma função do banco exposta pela API (ex.: copy_routine_weekday). */
  async rpc(name: string, args: Record<string, unknown> = {}): Promise<DbResult> {
    try {
      const { response, json } = await request(`/rpc/${encodeURIComponent(name)}`, {
        method: 'POST',
        body: JSON.stringify({ args }),
      })
      return toDbResult(response, json)
    } catch (error) {
      return { data: null, count: null, error: { message: error instanceof Error ? error.message : NETWORK_ERROR_MESSAGE } }
    }
  },
}
