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

  it('envia cookies de sessão nas consultas e converte 401 sem token local', async () => {
    const { db } = await loadApi()
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'expirou' } }), { status: 401 }))
    const result = await db.from('events').select()
    expect(result.error?.code).toBe('unauthenticated')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include' })
  })
})

