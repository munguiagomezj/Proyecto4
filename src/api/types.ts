// Tipos que reflejan los esquemas de la API de Tareas (Proyecto 2).

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type Priority = 'low' | 'medium' | 'high'
export type TaskSort = 'created' | 'due_date' | 'priority'

export interface User {
  id: number
  email: string
  full_name: string
  created_at: string
}

export interface Project {
  id: number
  name: string
  description: string | null
  created_at: string
  task_count: number
}

export interface Task {
  id: number
  project_id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  tags: string[]
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface Stats {
  total: number
  by_status: Record<TaskStatus, number>
  by_priority: Record<Priority, number>
  overdue: number
  completed_last_7_days: number
}

export interface TaskFilters {
  project_id?: number
  status?: TaskStatus
  priority?: Priority
  tag?: string
  overdue?: boolean
  q?: string
  sort?: TaskSort
  page?: number
  size?: number
}

export interface UserCreate {
  email: string
  full_name: string
  password: string
}

export interface ProjectInput {
  name: string
  description?: string | null
}

export interface TaskInput {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: Priority
  due_date?: string | null
  tags?: string[]
}

/** Todas las operaciones de la API. La implementan el cliente HTTP real y el simulado. */
export interface ApiClient {
  register(data: UserCreate): Promise<User>
  login(email: string, password: string): Promise<string>
  me(token: string): Promise<User>
  listProjects(token: string): Promise<Project[]>
  createProject(token: string, data: ProjectInput): Promise<Project>
  updateProject(token: string, id: number, data: Partial<ProjectInput>): Promise<Project>
  deleteProject(token: string, id: number): Promise<void>
  listTasks(token: string, filters: TaskFilters): Promise<Page<Task>>
  createTask(token: string, projectId: number, data: TaskInput): Promise<Task>
  updateTask(token: string, id: number, data: Partial<TaskInput>): Promise<Task>
  deleteTask(token: string, id: number): Promise<void>
  stats(token: string): Promise<Stats>
}

/** Error de la API con su código HTTP y un mensaje listo para mostrar. */
export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}
