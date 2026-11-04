import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// O módulo lê VITE_API_URL ao ser carregado, então é importado dinamicamente.
const loadApi = async (apiUrl = '/api') => {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', apiUrl)
  return import('./api')
}

describe('db query builder (payload enviado à API)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: [], count: 0, error: null }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body as string)

  it('monta filtros, or, ordenação e a rota /api/db', async () => {
    const { db } = await loadApi('/api/')
    const start = '2026-10-25T03:00:00.000Z'
    await db.from('events').select('*').eq('user_id', 'u1').lt('start_at', start)
      .or(`end_at.is.null,end_at.gte.${start}`).order('start_at')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/db')
    expect(sentBody()).toMatchObject({
      table: 'events',
      op: 'select',
      columns: '*',
      filters: [
        { col: 'user_id', op: 'eq', value: 'u1' },
        { col: 'start_at', op: 'lt', value: start },
      ],
      or: [[
        { col: 'end_at', op: 'is', value: null },
        { col: 'end_at', op: 'gte', value: start },
      ]],
      order: [{ col: 'start_at', ascending: true }],
    })
  })

  it('insert(...).select().single() pede as linhas de volta', async () => {
    const { db } = await loadApi()
    await db.from('events').insert({ title: 'x' }).select().single()
    expect(sentBody()).toMatchObject({ op: 'insert', values: { title: 'x' }, returning: true, single: 'single' })
  })

  it('upsert, delete com contagem e maybeSingle', async () => {
    const { db } = await loadApi()
    await db.from('profiles').upsert({ id: '1' }, { onConflict: 'id' })
    expect(sentBody()).toMatchObject({ op: 'upsert', onConflict: 'id', ignoreDuplicates: false })
    fetchMock.mockClear()
    await db.from('events').delete({ count: 'exact' }).eq('user_id', 'u')
    expect(sentBody()).toMatchObject({ op: 'delete', count: 'exact' })
    fetchMock.mockClear()
    await db.from('profiles').select('preferences').eq('id', 'u').maybeSingle()
    expect(sentBody()).toMatchObject({ op: 'select', columns: 'preferences', single: 'maybe' })
  })

  it('rejeita expressão .or inválida', async () => {
    const { db } = await loadApi()
    expect(() => db.from('events').or('semponto')).toThrow()
    expect(() => db.from('events').or('a.xx.1')).toThrow()
  })

  it('converte erro da API em { data: null, error } e erro de rede em mensagem legível', async () => {
    const { db } = await loadApi()
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'boom', code: '23505' } }), { status: 400 }))
    const failed = await db.from('events').select()
    expect(failed.data).toBeNull()
    expect(failed.error).toMatchObject({ message: 'boom', code: '23505', status: 400 })

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const offline = await db.from('events').select()
    expect(offline.error?.message).toMatch(/servidor/)
  })

  it('401 derruba a sessão guardada', async () => {
    const { db, auth } = await loadApi()
    const listener = vi.fn()
    auth.onChange(listener)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'expirou' } }), { status: 401 }))
    const result = await db.from('events').select()
    expect(result.error?.code).toBe('invalid_token')
    expect(listener).toHaveBeenCalledWith(null)
  })
})

// Teste ponta a ponta contra a API real (veja server/README). Ignorado sem TEST_API_URL.
describe.skipIf(!process.env.TEST_API_URL)('cliente contra a API real', () => {
  it('login, gravação, leitura com as mesmas consultas do app e logout', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_URL', `${process.env.TEST_API_URL}/api`)
    const { db, auth } = await import('./api')
    const email = `e2e-${Date.now()}@example.com`
    const session = await auth.signUp(email, 'senha-forte-123')
    expect(session.user.email).toBe(email)

    const saved = await db.from('events')
      .insert({ id: crypto.randomUUID(), title: 'Reunião', start_at: '2026-11-10T13:00:00.000Z', user_id: session.user.id })
      .select().single()
    expect(saved.error).toBeNull()

    const start = new Date(2026, 10, -6).toISOString()
    const end = new Date(2026, 11, 15).toISOString()
    const list = await db.from('events').select('*').eq('user_id', session.user.id)
      .lt('start_at', end).or(`end_at.is.null,end_at.gte.${start}`).order('start_at')
    expect(list.error).toBeNull()
    expect(list.data.map((row: { title: string }) => row.title)).toEqual(['Reunião'])

    const pref = await db.from('profiles').upsert({ id: session.user.id, preferences: { theme: 'escuro' } }, { onConflict: 'id' })
    expect(pref.error).toBeNull()
    const read = await db.from('profiles').select('preferences').eq('id', session.user.id).maybeSingle()
    expect(read.data.preferences.theme).toBe('escuro')

    expect(await auth.restoreSession()).not.toBeNull()
    auth.signOut()
    expect(auth.getSession()).toBeNull()
    const denied = await db.from('events').select()
    expect(denied.error?.status).toBe(401)
    vi.unstubAllEnvs()
  })
})
