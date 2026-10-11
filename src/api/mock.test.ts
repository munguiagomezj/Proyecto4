import { beforeEach, describe, expect, it } from 'vitest'
import { createMockClient, DEMO_USER, memoryStorage, seedDb } from './mock'
import { ApiError } from './types'
import type { ApiClient } from './types'

const NOW = new Date('2026-10-11T12:00:00Z')
let api: ApiClient
let token: string

beforeEach(async () => {
  api = createMockClient({ storage: memoryStorage(), now: () => NOW })
  token = await api.login(DEMO_USER.email, DEMO_USER.password)
})

async function expectApiError(promise: Promise<unknown>, status: number) {
  const error = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(ApiError)
  expect((error as ApiError).status).toBe(status)
  return error as ApiError
}

describe('autenticación', () => {
  it('registra, normaliza el email y valida los campos', async () => {
    const user = await api.register({ email: 'Ana@Example.com', full_name: ' Ana ', password: 'secreto123' })
    expect(user).toMatchObject({ email: 'ana@example.com', full_name: 'Ana' })
    expect(user).not.toHaveProperty('password')
    const err = await expectApiError(api.register({ email: 'x', full_name: 'X', password: 'secreto123' }), 422)
    expect(err.fields.email).toBeDefined()
    await expectApiError(api.register({ email: 'ana@example.com', full_name: 'A', password: 'secreto123' }), 409)
  })

  it('da el mismo error si el email no existe o la contraseña falla', async () => {
    const a = await expectApiError(api.login(DEMO_USER.email, 'mala'), 401)
    const b = await expectApiError(api.login('nadie@example.com', 'mala'), 401)
    expect(a.message).toBe(b.message)
  })

  it('rechaza tokens inválidos', async () => {
    await expectApiError(api.me('demo-token-999'), 401)
    await expectApiError(api.listProjects('basura'), 401)
  })
})

describe('proyectos y permisos', () => {
  it('cada usuario solo ve lo suyo y lo ajeno da 404', async () => {
    await api.register({ email: 'luis@example.com', full_name: 'Luis', password: 'secreto123' })
    const otro = await api.login('luis@example.com', 'secreto123')
    expect(await api.listProjects(otro)).toEqual([])
    const [ajeno] = await api.listProjects(token)
    await expectApiError(api.listTasks(otro, { project_id: ajeno.id }), 404)
    await expectApiError(api.deleteProject(otro, ajeno.id), 404)
    const { items } = await api.listTasks(token, {})
    await expectApiError(api.updateTask(otro, items[0].id, { title: 'x' }), 404)
  })

  it('borrar un proyecto borra sus tareas', async () => {
    const [project] = await api.listProjects(token)
    const before = (await api.listTasks(token, {})).total
    await api.deleteProject(token, project.id)
    expect((await api.listTasks(token, {})).total).toBe(before - project.task_count)
  })
})

describe('tareas', () => {
  it('crea con valores por defecto y etiquetas normalizadas', async () => {
    const [project] = await api.listProjects(token)
    const task = await api.createTask(token, project.id, { title: '  Nueva  ', tags: ['Web', 'web', ' api '] })
    expect(task).toMatchObject({ title: 'Nueva', status: 'todo', priority: 'medium', tags: ['api', 'web'], completed_at: null })
    await expectApiError(api.createTask(token, project.id, { title: '   ' }), 422)
  })

  it('rellena y borra completed_at según el estado', async () => {
    const { items } = await api.listTasks(token, { status: 'todo' })
    const done = await api.updateTask(token, items[0].id, { status: 'done' })
    expect(done.completed_at).toBe(NOW.toISOString())
    const reopened = await api.updateTask(token, items[0].id, { status: 'todo' })
    expect(reopened.completed_at).toBeNull()
  })

  it('filtra por estado, etiqueta, texto y vencidas', async () => {
    const all = (await api.listTasks(token, { size: 100 })).items
    const titles = async (f: object) => (await api.listTasks(token, { size: 100, ...f })).items.map((t) => t.title).sort()
    expect(await titles({ status: 'done' })).toEqual(all.filter((t) => t.status === 'done').map((t) => t.title).sort())
    expect(await titles({ tag: 'FERIA' })).toContain('Preparar el pitch de 30 segundos')
    expect(await titles({ q: 'plano' })).toEqual(['Lista de empresas que visitar']) // busca también en la descripción
    const overdue = await titles({ overdue: true })
    expect(overdue).toEqual(['Lista de empresas que visitar', 'Renovar el abono transporte'])
    expect((await api.listTasks(token, { overdue: false })).total).toBe(all.length - overdue.length)
  })

  it('ordena por prioridad y por fecha límite con las vacías al final', async () => {
    const byPriority = (await api.listTasks(token, { sort: 'priority', size: 100 })).items.map((t) => t.priority)
    expect(byPriority).toEqual([...byPriority].sort((a, b) => ['high', 'medium', 'low'].indexOf(a) - ['high', 'medium', 'low'].indexOf(b)))
    const byDue = (await api.listTasks(token, { sort: 'due_date', size: 100 })).items.map((t) => t.due_date)
    const firstNull = byDue.indexOf(null)
    expect(byDue.slice(firstNull).every((d) => d === null)).toBe(true)
    expect(byDue.slice(0, firstNull)).toEqual([...byDue.slice(0, firstNull)].sort())
  })

  it('pagina y valida el tamaño de página', async () => {
    const page = await api.listTasks(token, { size: 5, page: 3 })
    expect(page).toMatchObject({ total: 12, pages: 3, page: 3 })
    expect(page.items).toHaveLength(2)
    await expectApiError(api.listTasks(token, { size: 500 }), 422)
  })

  it('calcula las estadísticas', async () => {
    const stats = await api.stats(token)
    expect(stats.total).toBe(12)
    expect(stats.by_status).toEqual({ todo: 6, in_progress: 2, done: 4 })
    expect(stats.overdue).toBe(2)
    expect(stats.completed_last_7_days).toBe(1)
  })
})

it('los datos persisten en el almacenamiento entre instancias', async () => {
  const storage = memoryStorage(seedDb(NOW))
  const a = createMockClient({ storage, now: () => NOW })
  const t = await a.login(DEMO_USER.email, DEMO_USER.password)
  await a.createProject(t, { name: 'Persistente' })
  const b = createMockClient({ storage, now: () => NOW })
  expect((await b.listProjects(t)).map((p) => p.name)).toContain('Persistente')
})
