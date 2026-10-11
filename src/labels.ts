import type { Priority, TaskSort, TaskStatus } from './api/types'

export const STATUS_LABEL: Record<TaskStatus, string> = { todo: 'Pendiente', in_progress: 'En curso', done: 'Hecha' }
export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Baja', medium: 'Media', high: 'Alta' }
export const SORT_LABEL: Record<TaskSort, string> = {
  created: 'Más recientes',
  due_date: 'Fecha límite',
  priority: 'Prioridad',
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
