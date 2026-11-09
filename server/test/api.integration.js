import test, { describe, before } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const BASE = process.env.TEST_API_URL
const ORIGIN = process.env.TEST_ORIGIN || (BASE ? new URL(BASE).origin : undefined)
const opts = { skip: BASE ? false : 'defina TEST_API_URL para rodar' }

const call = async (path, { cookie, body, method = 'POST' } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(ORIGIN ? { origin: ORIGIN } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const setCookies = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : [])
  const cookieHeader = setCookies.map(value => value.split(';', 1)[0]).join('; ')
  let json = null
  try { json = await res.json() } catch { /* resposta sem JSON */ }
  return { status: res.status, json, cookie: cookieHeader }
}

const register = async () => {
  const email = `t-${randomUUID()}@example.com`
  const result = await call('/api/auth/sign-up/email', {
    body: { name: 'Teste', email, password: 'senha-forte-123' },
  })
  assert.equal(result.status, 200, JSON.stringify(result.json))
  assert.ok(result.cookie, 'Better Auth deve definir cookies de sessão')
  return { email, id: result.json.user.id, cookie: result.cookie }
}

describe('autenticação Better Auth (cookies HTTP-only)', opts, () => {
  test('cadastro, sessão, login e credenciais inválidas', async () => {
    const user = await register()
    const session = await call('/api/auth/get-session', { method: 'GET', cookie: user.cookie })
    assert.equal(session.json.user.email, user.email)

    const login = await call('/api/auth/sign-in/email', {
      body: { email: user.email, password: 'senha-forte-123' },
    })
    assert.equal(login.status, 200, JSON.stringify(login.json))
    assert.ok(login.cookie)

    const bad = await call('/api/auth/sign-in/email', {
      body: { email: user.email, password: 'senha-incorreta' },
    })
    assert.equal(bad.status, 401)

    const duplicate = await call('/api/auth/sign-up/email', {
      body: { name: 'Duplicado', email: user.email, password: 'senha-forte-123' },
    })
    assert.notEqual(duplicate.status, 200)
  })

  test('rotas de dados exigem sessão Better Auth', async () => {
    const denied = await call('/api/db', { body: { table: 'events', op: 'select' } })
    assert.equal(denied.status, 401)
    const user = await register()
    const allowed = await call('/api/db', {
      cookie: user.cookie,
      body: { table: 'profiles', op: 'select', filters: [{ col: 'id', op: 'eq', value: user.id }] },
    })
    assert.equal(allowed.status, 200, JSON.stringify(allowed.json))
  })
})
