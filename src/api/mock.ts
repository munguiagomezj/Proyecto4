/**
 * API simulada en el navegador para el modo demo (GitHub Pages no puede ejecutar el backend).
 * Reproduce el comportamiento de la API real (api-tareas-fastapi): validación, permisos, filtros,
 * orden, paginación y estadísticas. Los datos se guardan en localStorage.
 */
import { ApiError } from './types'
import type {
  ApiClient, Page, Priority, Project, ProjectInput, Stats, Task, TaskFilters, TaskInput, TaskStatus, User,
} from './types'

interface StoredUser extends User {
  password: string // solo existe en este navegador; la API real guarda un hash bcrypt
}

interface StoredProject extends Omit<Project, 'task_count'> {
  owner_id: number
}

export interface MockDb {
  users: StoredUser[]
  projects: StoredProject[]
  tasks: Task[]
  nextId: number
}

export interface MockStorage {
  load(): MockDb | null
  save(db: MockDb): void
}

const STORAGE_KEY = 'tareas-demo:v1'

export const localStorageAdapter: MockStorage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as MockDb) : null
    } catch {
      return null
    }
  },
  save(db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      /* modo privado: los datos solo duran mientras la pestaña esté abierta */
    }
  },
}

export function memoryStorage(initial: MockDb | null = null): MockStorage {
  let db = initial ? structuredClone(initial) : null
  return { load: () => db, save: (next) => (db = structuredClone(next)) }
}

export const DEMO_USER = { email: 'demo@example.com', password: 'demo1234' }

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']
const PRIORITIES: Priority[] = ['low', 'medium', 'high']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(base: Date, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

/** Datos de ejemplo con fechas relativas a hoy, para que siempre haya tareas vencidas y próximas. */
export function seedDb(now = new Date()): MockDb {
  const ts = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString()
  const user: StoredUser = { id: 1, email: DEMO_USER.email, full_name: 'Usuario Demo', password: DEMO_USER.password, created_at: ts(30) }
  const projects: StoredProject[] = [
    { id: 2, owner_id: 1, name: 'Feria de empleo', description: 'Todo lo necesario para la feria', created_at: ts(20) },
    { id: 3, owner_id: 1, name: 'Portfolio', description: 'Proyectos para GitHub', created_at: ts(15) },
    { id: 4, owner_id: 1, name: 'Personal', description: null, created_at: ts(10) },
  ]
  const raw: [number, string, TaskStatus, Priority, number | null, string[], number, string | null][] = [
    [2, 'Actualizar el CV', 'done', 'high', -3, ['cv'], 12, 'Añadir los cuatro proyectos del portfolio'],
    [2, 'Preparar el pitch de 30 segundos', 'in_progress', 'high', 2, ['feria'], 8, null],
    [2, 'Imprimir tarjetas con QR al portfolio', 'todo', 'medium', 5, ['feria'], 6, null],
    [2, 'Lista de empresas que visitar', 'todo', 'medium', -1, ['feria', 'investigar'], 5, 'Mirar el plano de la feria'],
    [2, 'Ensayar preguntas técnicas', 'todo', 'high', 4, ['entrevista'], 3, 'Usar las guías de cada proyecto'],
    [3, 'Subir finanzas-personales', 'done', 'medium', null, ['javascript'], 11, null],
    [3, 'Subir api-tareas-fastapi', 'done', 'high', null, ['python', 'api'], 10, null],
    [3, 'Subir empleo-vivienda-espana', 'done', 'medium', null, ['python', 'datos'], 6, null],
    [3, 'Terminar tareas-react', 'in_progress', 'high', 3, ['react'], 2, 'Este mismo proyecto'],
    [3, 'Fijar los repositorios en el perfil', 'todo', 'low', 7, ['github'], 1, null],
    [4, 'Renovar el abono transporte', 'todo', 'low', -2, [], 4, null],
    [4, 'Comprar ropa para la feria', 'todo', 'medium', 6, ['feria'], 2, null],
  ]
  const tasks: Task[] = raw.map(([project_id, title, status, priority, due, tags, daysAgo, description], i) => ({
    id: 10 + i, project_id, title, description, status, priority,
    due_date: due === null ? null : addDays(now, due),
    tags, created_at: ts(daysAgo), updated_at: ts(daysAgo),
    completed_at: status === 'done' ? ts(Math.max(0, daysAgo - 2)) : null,
  }))
  return { users: [user], projects, tasks, nextId: 100 }
}

function normalizeTags(tags: string[] | undefined): string[] {
  const clean = (tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)
  for (const t of clean) if (t.length > 30) throw validation('tags', 'Cada etiqueta puede tener como máximo 30 caracteres')
  if (clean.length > 10) throw validation('tags', 'Como máximo 10 etiquetas')
  return [...new Set(clean)].sort()
}

function validation(field: string, msg: string): ApiError {
  return new ApiError(422, 'Revisa los campos marcados', { [field]: msg })
}

function requireText(value: unknown, field: string, max: number): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) throw validation(field, 'Este campo es obligatorio')
  if (text.length > max) throw validation(field, `Como máximo ${max} caracteres`)
  return text
}

export interface MockOptions {
  storage?: MockStorage
  delayMs?: number
  now?: () => Date
}

export function createMockClient({ storage = localStorageAdapter, delayMs = 0, now = () => new Date() }: MockOptions = {}): ApiClient {
  let db: MockDb = storage.load() ?? seedDb(now())
  storage.save(db)

  // Simula la latencia de red y copia los datos para que nadie modifique el "servidor" por referencia.
  async function respond<T>(fn: () => T): Promise<T> {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs))
    const result = fn()
    storage.save(db)
    return result === undefined ? result : structuredClone(result)
  }

  function userFrom(token: string): StoredUser {
    const id = Number(token.replace('demo-token-', ''))
    const user = db.users.find((u) => u.id === id)
    if (!token.startsWith('demo-token-') || !user) throw new ApiError(401, 'Credenciales no válidas o caducadas')
    return user
  }

  function ownProject(user: User, id: number): StoredProject {
    const project = db.projects.find((p) => p.id === id && p.owner_id === user.id)
    if (!project) throw new ApiError(404, 'Proyecto no encontrado')
    return project
  }

  function ownTask(user: User, id: number): Task {
    const task = db.tasks.find((t) => t.id === id)
    if (!task || !db.projects.some((p) => p.id === task.project_id && p.owner_id === user.id)) {
      throw new ApiError(404, 'Tarea no encontrada')
    }
    return task
  }

  const withCount = (p: StoredProject): Project => {
    const { owner_id: _owner, ...rest } = p
    return { ...rest, task_count: db.tasks.filter((t) => t.project_id === p.id).length }
  }

  const publicUser = ({ password: _pw, ...user }: StoredUser): User => user
  const today = () => isoDate(now())
  const isOverdue = (t: Task) => t.due_date !== null && t.due_date < today() && t.status !== 'done'

  function syncCompleted(task: Task) {
    if (task.status === 'done' && !task.completed_at) task.completed_at = now().toISOString()
    if (task.status !== 'done') task.completed_at = null
  }

  function checkEnums(data: Partial<TaskInput>) {
    if (data.status !== undefined && !STATUSES.includes(data.status)) throw validation('status', 'Estado no válido')
    if (data.priority !== undefined && !PRIORITIES.includes(data.priority)) throw validation('priority', 'Prioridad no válida')
  }

  return {
    register: (data) =>
      respond(() => {
        const email = data.email.trim().toLowerCase()
        if (!EMAIL_RE.test(email)) throw validation('email', 'El email no es válido')
        const full_name = requireText(data.full_name, 'full_name', 100)
        if (data.password.length < 8) throw validation('password', 'Mínimo 8 caracteres')
        if (data.password.length > 72) throw validation('password', 'Máximo 72 caracteres')
        if (db.users.some((u) => u.email === email)) throw new ApiError(409, 'Ese email ya está registrado')
        const user: StoredUser = { id: db.nextId++, email, full_name, password: data.password, created_at: now().toISOString() }
        db.users.push(user)
        return publicUser(user)
      }),

    login: (email, password) =>
      respond(() => {
        const user = db.users.find((u) => u.email === email.trim().toLowerCase())
        // Mismo mensaje si el email no existe o la contraseña falla, igual que la API real.
        if (!user || user.password !== password) throw new ApiError(401, 'Email o contraseña incorrectos')
        return `demo-token-${user.id}`
      }),

    me: (token) => respond(() => publicUser(userFrom(token))),

    listProjects: (token) =>
      respond(() => {
        const user = userFrom(token)
        return db.projects
          .filter((p) => p.owner_id === user.id)
          .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
          .map(withCount)
      }),

    createProject: (token, data: ProjectInput) =>
      respond(() => {
        const user = userFrom(token)
        const project: StoredProject = {
          id: db.nextId++, owner_id: user.id, name: requireText(data.name, 'name', 100),
          description: data.description?.trim() || null, created_at: now().toISOString(),
        }
        db.projects.push(project)
        return withCount(project)
      }),

    updateProject: (token, id, data) =>
      respond(() => {
        const project = ownProject(userFrom(token), id)
        if (data.name !== undefined && data.name !== null) project.name = requireText(data.name, 'name', 100)
        if (data.description !== undefined) project.description = data.description?.trim() || null
        return withCount(project)
      }),

    deleteProject: (token, id) =>
      respond(() => {
        const project = ownProject(userFrom(token), id)
        db.projects = db.projects.filter((p) => p.id !== project.id)
        db.tasks = db.tasks.filter((t) => t.project_id !== project.id)
      }),

    listTasks: (token, filters: TaskFilters) =>
      respond((): Page<Task> => {
        const user = userFrom(token)
        if (filters.project_id !== undefined) ownProject(user, filters.project_id)
        const size = filters.size ?? 20
        const page = filters.page ?? 1
        if (size < 1 || size > 100) throw validation('size', 'Entre 1 y 100')
        if (page < 1) throw validation('page', 'Mínimo 1')
        const mine = new Set(db.projects.filter((p) => p.owner_id === user.id).map((p) => p.id))
        const q = filters.q?.trim().toLowerCase()
        const tag = filters.tag?.trim().toLowerCase()
        const items = db.tasks.filter(
          (t) =>
            mine.has(t.project_id) &&
            (filters.project_id === undefined || t.project_id === filters.project_id) &&
            (!filters.status || t.status === filters.status) &&
            (!filters.priority || t.priority === filters.priority) &&
            (!tag || t.tags.includes(tag)) &&
            (filters.overdue === undefined || isOverdue(t) === filters.overdue) &&
            (!q || t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q)),
        )
        const sort = filters.sort ?? 'created'
        items.sort((a, b) => {
          if (sort === 'due_date') {
            if (a.due_date === b.due_date) return a.id - b.id
            if (a.due_date === null) return 1
            if (b.due_date === null) return -1
            return a.due_date.localeCompare(b.due_date)
          }
          if (sort === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.id - b.id
          return b.created_at.localeCompare(a.created_at) || b.id - a.id
        })
        const total = items.length
        return { items: items.slice((page - 1) * size, page * size), total, page, size, pages: Math.ceil(total / size) }
      }),

    createTask: (token, projectId, data) =>
      respond(() => {
        const user = userFrom(token)
        const project = ownProject(user, projectId)
        checkEnums(data)
        const stamp = now().toISOString()
        const task: Task = {
          id: db.nextId++, project_id: project.id, title: requireText(data.title, 'title', 200),
          description: data.description?.trim() || null, status: data.status ?? 'todo',
          priority: data.priority ?? 'medium', due_date: data.due_date || null, tags: normalizeTags(data.tags),
          created_at: stamp, updated_at: stamp, completed_at: null,
        }
        syncCompleted(task)
        db.tasks.push(task)
        return task
      }),

    updateTask: (token, id, data) =>
      respond(() => {
        const task = ownTask(userFrom(token), id)
        checkEnums(data)
        if ('title' in data) task.title = requireText(data.title, 'title', 200)
        if ('description' in data) task.description = data.description?.trim() || null
        if (data.status !== undefined) task.status = data.status
        if (data.priority !== undefined) task.priority = data.priority
        if ('due_date' in data) task.due_date = data.due_date || null
        if (data.tags !== undefined) task.tags = normalizeTags(data.tags)
        task.updated_at = now().toISOString()
        syncCompleted(task)
        return task
      }),

    deleteTask: (token, id) =>
      respond(() => {
        const task = ownTask(userFrom(token), id)
        db.tasks = db.tasks.filter((t) => t.id !== task.id)
      }),

    stats: (token) =>
      respond((): Stats => {
        const user = userFrom(token)
        const mine = new Set(db.projects.filter((p) => p.owner_id === user.id).map((p) => p.id))
        const tasks = db.tasks.filter((t) => mine.has(t.project_id))
        const weekAgo = now().getTime() - 7 * 86_400_000
        const count = <K extends string>(keys: K[], pick: (t: Task) => K) =>
          Object.fromEntries(keys.map((k) => [k, tasks.filter((t) => pick(t) === k).length])) as Record<K, number>
        return {
          total: tasks.length,
          by_status: count(STATUSES, (t) => t.status),
          by_priority: count(PRIORITIES, (t) => t.priority),
          overdue: tasks.filter(isOverdue).length,
          completed_last_7_days: tasks.filter((t) => t.completed_at && Date.parse(t.completed_at) >= weekAgo).length,
        }
      }),
  }
}
