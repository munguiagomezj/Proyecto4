import { ApiError } from './types'
import type { ApiClient, Page, Project, Stats, Task, TaskFilters, User } from './types'

interface ValidationIssue {
  loc: (string | number)[]
  msg: string
}

/** Convierte la respuesta de error de FastAPI ({detail: ...}) en un ApiError. */
export async function toApiError(response: Response): Promise<ApiError> {
  let detail: unknown
  try {
    detail = (await response.json()).detail
  } catch {
    return new ApiError(response.status, `Error ${response.status}`)
  }
  if (Array.isArray(detail)) {
    // 422: FastAPI devuelve una lista de errores de validación, uno por campo.
    const fields: Record<string, string> = {}
    for (const issue of detail as ValidationIssue[]) {
      fields[String(issue.loc.at(-1))] = issue.msg
    }
    return new ApiError(response.status, 'Revisa los campos marcados', fields)
  }
  return new ApiError(response.status, typeof detail === 'string' ? detail : `Error ${response.status}`)
}

export function filtersToQuery(filters: TaskFilters): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

/** Cliente de la API real por HTTP. */
export function createHttpClient(baseUrl: string, fetchImpl: typeof fetch = fetch.bind(globalThis)): ApiClient {
  const base = baseUrl.replace(/\/$/, '')

  async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
    const headers = new Headers(init.headers)
    if (init.token) headers.set('Authorization', `Bearer ${init.token}`)
    if (init.body && !(init.body instanceof URLSearchParams)) headers.set('Content-Type', 'application/json')
    let response: Response
    try {
      response = await fetchImpl(base + path, { ...init, headers })
    } catch {
      throw new ApiError(0, 'No se puede conectar con la API. ¿Está arrancada?')
    }
    if (!response.ok) throw await toApiError(response)
    return (response.status === 204 ? undefined : await response.json()) as T
  }

  const json = (body: unknown) => JSON.stringify(body)

  return {
    register: (data) => request<User>('/auth/register', { method: 'POST', body: json(data) }),
    async login(email, password) {
      // Estándar OAuth2: formulario con "username" y "password".
      const body = new URLSearchParams({ username: email, password })
      const res = await request<{ access_token: string }>('/auth/login', { method: 'POST', body })
      return res.access_token
    },
    me: (token) => request<User>('/users/me', { token }),
    listProjects: (token) => request<Project[]>('/projects', { token }),
    createProject: (token, data) => request<Project>('/projects', { method: 'POST', body: json(data), token }),
    updateProject: (token, id, data) =>
      request<Project>(`/projects/${id}`, { method: 'PATCH', body: json(data), token }),
    deleteProject: (token, id) => request<void>(`/projects/${id}`, { method: 'DELETE', token }),
    listTasks: (token, filters) => request<Page<Task>>(`/tasks${filtersToQuery(filters)}`, { token }),
    createTask: (token, projectId, data) =>
      request<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body: json(data), token }),
    updateTask: (token, id, data) => request<Task>(`/tasks/${id}`, { method: 'PATCH', body: json(data), token }),
    deleteTask: (token, id) => request<void>(`/tasks/${id}`, { method: 'DELETE', token }),
    stats: (token) => request<Stats>('/stats', { token }),
  }
}
