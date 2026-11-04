// Teste de integração. Exige a API rodando contra um banco DE TESTE:
//   TEST_API_URL=http://localhost:3001 npm test
// (sem TEST_API_URL os testes são ignorados). Cria usuários aleatórios.
import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const BASE = process.env.TEST_API_URL
const opts = { skip: BASE ? false : 'defina TEST_API_URL para rodar' }

const call = async (path, { token, body, method = 'POST' } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: res.status, json: await res.json() }
}
const db = (token, body) => call('/api/db', { token, body })

const register = async () => {
  const email = `t-${randomUUID()}@example.com`
  const { status, json } = await call('/api/auth/register', { body: { email, password: 'senha-forte-123' } })
  assert.equal(status, 201)
  return { email, token: json.token, id: json.user.id }
}

describe('autenticação', opts, () => {
  test('cadastro, login duplicado e credenciais inválidas', async () => {
    const user = await register()
    const dup = await call('/api/auth/register', { body: { email: user.email.toUpperCase(), password: 'senha-forte-123' } })
    assert.equal(dup.status, 409)
    const ok = await call('/api/auth/login', { body: { email: user.email, password: 'senha-forte-123' } })
    assert.equal(ok.status, 200)
    const bad = await call('/api/auth/login', { body: { email: user.email, password: 'errada-errada' } })
    assert.equal(bad.status, 401)
    const weak = await call('/api/auth/register', { body: { email: 'x@y.com', password: '123' } })
    assert.equal(weak.status, 400)
    const me = await call('/api/auth/me', { token: ok.json.token, method: 'GET' })
    assert.equal(me.json.user.email, user.email)
  })

  test('rotas de dados exigem token', async () => {
    assert.equal((await db(undefined, { table: 'events', op: 'select' })).status, 401)
    assert.equal((await db('lixo', { table: 'events', op: 'select' })).status, 401)
  })
})

describe('dados', opts, () => {
  let a, b
  before(async () => { a = await register(); b = await register() })

  test('insert + select single devolvem a linha; user_id é forçado', async () => {
    const id = randomUUID()
    const res = await db(a.token, {
      table: 'events', op: 'insert', returning: true, single: 'single',
      values: { id, user_id: b.id, title: 'Culto', start_at: '2026-11-08T22:00:00.000Z' },
    })
    assert.equal(res.status, 200)
    assert.equal(res.json.data.user_id, a.id, 'não pode criar no nome de outro usuário')
    assert.equal(res.json.data.start_at, '2026-11-08T22:00:00.000Z')
    assert.equal(res.json.data.certainty, 'confirmed')
  })

  test('usuário B não enxerga, edita nem apaga dados do A', async () => {
    const id = randomUUID()
    await db(a.token, { table: 'events', op: 'insert', values: { id, title: 'Privado', start_at: '2026-11-09T10:00:00Z' } })
    const list = await db(b.token, { table: 'events', op: 'select', filters: [{ col: 'id', op: 'eq', value: id }] })
    assert.deepEqual(list.json.data, [])
    const upd = await db(b.token, {
      table: 'events', op: 'update', values: { title: 'hack' }, returning: true,
      filters: [{ col: 'id', op: 'eq', value: id }],
    })
    assert.deepEqual(upd.json.data, [])
    const del = await db(b.token, { table: 'events', op: 'delete', count: 'exact', filters: [{ col: 'id', op: 'eq', value: id }] })
    assert.equal(del.json.count, 0)
    // upsert com o mesmo id não pode sobrescrever a linha do outro usuário
    await db(b.token, { table: 'events', op: 'upsert', onConflict: 'id', values: { id, title: 'hack', start_at: '2026-11-09T10:00:00Z' } })
    const still = await db(a.token, { table: 'events', op: 'select', filters: [{ col: 'id', op: 'eq', value: id }] })
    assert.equal(still.json.data[0].title, 'Privado')
    assert.equal(still.json.data[0].user_id, a.id)
  })

  test('filtros, or, ordenação e single (PGRST116)', async () => {
    const mk = (title, start, end) => ({ id: randomUUID(), title, start_at: start, end_at: end })
    await db(b.token, { table: 'events', op: 'insert', values: [
      mk('c', '2026-12-03T10:00:00Z', null),
      mk('a', '2026-12-01T10:00:00Z', '2026-12-01T11:00:00Z'),
      mk('b', '2026-12-02T10:00:00Z', '2026-11-01T11:00:00Z'),
    ] })
    const res = await db(b.token, {
      table: 'events', op: 'select', columns: '*',
      filters: [{ col: 'start_at', op: 'lt', value: '2026-12-31T00:00:00Z' }],
      or: [[{ col: 'end_at', op: 'is', value: null }, { col: 'end_at', op: 'gte', value: '2026-12-01T00:00:00Z' }]],
      order: [{ col: 'start_at', ascending: true }],
    })
    assert.deepEqual(res.json.data.map(row => row.title), ['a', 'c'])
    const maybe = await db(b.token, { table: 'events', op: 'select', single: 'maybe', filters: [{ col: 'title', op: 'eq', value: 'nao-existe' }] })
    assert.equal(maybe.json.data, null)
    const single = await db(b.token, { table: 'events', op: 'select', single: 'single', filters: [{ col: 'title', op: 'eq', value: 'nao-existe' }] })
    assert.equal(single.status, 406)
    assert.equal(single.json.error.code, 'PGRST116')
  })

  test('profiles: upsert de preferências (jsonb) e leitura', async () => {
    const save = await db(a.token, { table: 'profiles', op: 'upsert', onConflict: 'id', values: { id: a.id, preferences: { theme: 'escuro', n: [1, 2] } } })
    assert.equal(save.status, 200)
    const read = await db(a.token, { table: 'profiles', op: 'select', columns: 'preferences', single: 'maybe', filters: [{ col: 'id', op: 'eq', value: a.id }] })
    assert.deepEqual(read.json.data.preferences, { theme: 'escuro', n: [1, 2] })
  })

  test('holiday_dates: upsert por seed_key, DATE como texto, feriados globais visíveis', async () => {
    const row = { id: randomUUID(), date: '2026-11-15', name: 'Proclamação', seed_key: 'pr-2026', scope: 'nacional' }
    await db(a.token, { table: 'holiday_dates', op: 'upsert', onConflict: 'user_id,seed_key', ignoreDuplicates: true, values: [row] })
    await db(a.token, { table: 'holiday_dates', op: 'upsert', onConflict: 'user_id,seed_key', ignoreDuplicates: true, values: [{ ...row, id: randomUUID() }] })
    const res = await db(a.token, { table: 'holiday_dates', op: 'select', filters: [{ col: 'date', op: 'gte', value: '2026-01-01' }, { col: 'date', op: 'lt', value: '2027-01-01' }] })
    const mine = res.json.data.filter(item => item.seed_key === 'pr-2026')
    assert.equal(mine.length, 1)
    assert.equal(mine[0].date, '2026-11-15')
  })

  test('rotina: regras com array, exceções, RPCs', async () => {
    const rule = await db(a.token, {
      table: 'routine_rules', op: 'insert', returning: true, single: 'single',
      values: { title: 'Culto', weekdays: [0, 3], schedule_type: 'fixed', valid_from: '2026-01-01', start_time: '19:30', confirmation_required: true },
    })
    assert.equal(rule.status, 200, JSON.stringify(rule.json))
    assert.deepEqual(rule.json.data.weekdays, [0, 3])
    assert.equal(rule.json.data.start_time, '19:30:00')

    const copy = await call('/api/rpc/copy_routine_weekday', { token: a.token, body: { args: { source_weekday: 3, target_weekday: 5 } } })
    assert.equal(copy.status, 200, JSON.stringify(copy.json))
    const rules = await db(a.token, { table: 'routine_rules', op: 'select', filters: [{ col: 'is_active', op: 'eq', value: true }] })
    assert.ok(rules.json.data.some(item => item.weekdays.length === 1 && item.weekdays[0] === 5))

    const confirm = await call('/api/rpc/confirm_routine_occurrence', {
      token: a.token, body: { args: { target_rule_id: rule.json.data.id, confirmed_date: '2026-11-04' } },
    })
    assert.equal(confirm.status, 200, JSON.stringify(confirm.json))
    const ex = await db(a.token, { table: 'routine_exceptions', op: 'select', filters: [{ col: 'routine_rule_id', op: 'eq', value: rule.json.data.id }] })
    assert.equal(ex.json.data[0].occurrence_date, '2026-11-04')
    assert.equal(ex.json.data[0].action, 'confirmed')

    // outro usuário não consegue confirmar a regra do A
    const foreign = await call('/api/rpc/confirm_routine_occurrence', {
      token: b.token, body: { args: { target_rule_id: rule.json.data.id, confirmed_date: '2026-11-04' } },
    })
    assert.equal(foreign.status, 400)

    const upsertEx = await db(a.token, {
      table: 'routine_exceptions', op: 'upsert', onConflict: 'routine_rule_id,occurrence_date', returning: true, single: 'single',
      values: { routine_rule_id: rule.json.data.id, occurrence_date: '2026-11-04', action: 'cancelled' },
    })
    assert.equal(upsertEx.json.data.action, 'cancelled')

    // apagar a regra remove as exceções (cascade) e delete retorna contagem
    const del = await db(a.token, { table: 'routine_rules', op: 'delete', count: 'exact', filters: [{ col: 'id', op: 'eq', value: rule.json.data.id }] })
    assert.equal(del.json.count, 1)
  })

  test('entradas maliciosas são rejeitadas', async () => {
    assert.equal((await db(a.token, { table: 'users', op: 'select' })).status, 400)
    assert.equal((await db(a.token, { table: 'events', op: 'select', columns: 'password_hash' })).status, 400)
    assert.equal((await db(a.token, { table: 'events', op: 'select', filters: [{ col: 'title"; DROP TABLE events;--', op: 'eq', value: 1 }] })).status, 400)
    assert.equal((await db(a.token, { table: 'events', op: 'select', filters: [{ col: 'title', op: 'OR 1=1', value: 1 }] })).status, 400)
    assert.equal((await db(a.token, { table: 'events', op: 'select', order: [{ col: 'title; DROP TABLE events' }] })).status, 400)
    assert.equal((await call('/api/rpc/pg_sleep', { token: a.token, body: { args: {} } })).status, 404)
    // valor com SQL vai como parâmetro, vira texto comum
    const res = await db(a.token, { table: 'events', op: 'select', filters: [{ col: 'title', op: 'eq', value: "x' OR '1'='1" }] })
    assert.deepEqual(res.json.data, [])
  })
})
