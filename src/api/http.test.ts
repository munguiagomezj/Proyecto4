import { describe, expect, it, vi } from 'vitest'
import { createHttpClient, filtersToQuery } from './http'
import { ApiError } from './types'

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('cliente HTTP', () => {
  it('hace login con un formulario OAuth2 y devuelve el token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { access_token: 'abc', token_type: 'bearer' }))
    const api = createHttpClient('http://api.test/', fetchMock)
    expect(await api.login('ana@example.com', 'secreto123')).toBe('abc')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://api.test/auth/login')
    expect(String(init.body)).toBe('username=ana%40example.com&password=secreto123')
  })

  it('envía el token y los filtros en la URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { items: [], total: 0, page: 1, size: 20, pages: 0 }))
    const api = createHttpClient('http://api.test', fetchMock)
    await api.listTasks('tok', { status: 'todo', overdue: false, q: 'cv', tag: undefined })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://api.test/tasks?status=todo&overdue=false&q=cv')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tok')
  })

  it('convierte los errores 422 de FastAPI en errores por campo', async () => {
    const detail = [{ loc: ['body', 'title'], msg: 'Field required', type: 'missing' }]
    const api = createHttpClient('http://api.test', vi.fn().mockResolvedValue(jsonResponse(422, { detail })))
    const error = await api.createTask('tok', 1, { title: '' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).fields).toEqual({ title: 'Field required' })
  })

  it('usa el mensaje de la API y trata el 204 sin cuerpo', async () => {
    const api = createHttpClient(
      'http://api.test',
      vi.fn().mockResolvedValueOnce(jsonResponse(404, { detail: 'Tarea no encontrada' })).mockResolvedValueOnce(new Response(null, { status: 204 })),
    )
    await expect(api.deleteTask('tok', 9)).rejects.toThrow('Tarea no encontrada')
    await expect(api.deleteTask('tok', 9)).resolves.toBeUndefined()
  })

  it('da un mensaje claro si no hay conexión', async () => {
    const api = createHttpClient('http://api.test', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(api.me('tok')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('No se puede conectar') })
  })
})

it('filtersToQuery omite los valores vacíos', () => {
  expect(filtersToQuery({})).toBe('')
  expect(filtersToQuery({ page: 2, q: '' })).toBe('?page=2')
})
