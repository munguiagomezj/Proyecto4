import type { Priority, TaskFilters, TaskSort, TaskStatus } from './api/types'

const STATUSES = ['todo', 'in_progress', 'done']
const PRIORITIES = ['low', 'medium', 'high']
const SORTS = ['created', 'due_date', 'priority']

/** Lee los filtros de la URL (?status=todo&page=2…). Ignora valores no válidos. */
export function filtersFromParams(params: URLSearchParams): TaskFilters {
  const f: TaskFilters = {}
  const project = Number(params.get('project'))
  if (Number.isInteger(project) && project > 0) f.project_id = project
  const status = params.get('status')
  if (status && STATUSES.includes(status)) f.status = status as TaskStatus
  const priority = params.get('priority')
  if (priority && PRIORITIES.includes(priority)) f.priority = priority as Priority
  const tag = params.get('tag')?.trim()
  if (tag) f.tag = tag
  const overdue = params.get('overdue')
  if (overdue === 'true' || overdue === 'false') f.overdue = overdue === 'true'
  const q = params.get('q')?.trim()
  if (q) f.q = q
  const sort = params.get('sort')
  if (sort && SORTS.includes(sort)) f.sort = sort as TaskSort
  const page = Number(params.get('page'))
  if (Number.isInteger(page) && page > 1) f.page = page
  return f
}

/** Inverso de filtersFromParams: así los filtros se pueden compartir con un enlace. */
export function filtersToParams(f: TaskFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (f.project_id) params.set('project', String(f.project_id))
  if (f.status) params.set('status', f.status)
  if (f.priority) params.set('priority', f.priority)
  if (f.tag) params.set('tag', f.tag)
  if (f.overdue !== undefined) params.set('overdue', String(f.overdue))
  if (f.q) params.set('q', f.q)
  if (f.sort && f.sort !== 'created') params.set('sort', f.sort)
  if (f.page && f.page > 1) params.set('page', String(f.page))
  return params
}
