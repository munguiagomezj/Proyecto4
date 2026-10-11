import { useEffect, useState } from 'react'
import type { TaskFilters } from '../api/types'
import { PRIORITY_LABEL, SORT_LABEL, STATUS_LABEL } from '../labels'

interface Props {
  filters: TaskFilters
  onChange(next: TaskFilters): void
}

export function FiltersBar({ filters, onChange }: Props) {
  // La búsqueda espera a que el usuario deje de escribir (300 ms) para no lanzar una petición por tecla.
  const [q, setQ] = useState(filters.q ?? '')
  // Si la búsqueda cambia desde fuera (p. ej. «Limpiar filtros»), se actualiza el campo durante el render.
  const [prevQ, setPrevQ] = useState(filters.q)
  if (filters.q !== prevQ) {
    setPrevQ(filters.q)
    setQ(filters.q ?? '')
  }
  useEffect(() => {
    if ((filters.q ?? '') === q.trim()) return
    const id = setTimeout(() => onChange({ ...filters, q: q.trim() || undefined, page: undefined }), 300)
    return () => clearTimeout(id)
  }, [q, filters, onChange])

  const set = (patch: Partial<TaskFilters>) => onChange({ ...filters, ...patch, page: undefined })
  const active = Boolean(filters.status || filters.priority || filters.tag || filters.overdue !== undefined || filters.q)

  return (
    <div className="filters" role="search">
      <input
        type="search"
        placeholder="Buscar tareas…"
        aria-label="Buscar en título y descripción"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select aria-label="Estado" value={filters.status ?? ''} onChange={(e) => set({ status: (e.target.value || undefined) as TaskFilters['status'] })}>
        <option value="">Todos los estados</option>
        {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <select aria-label="Prioridad" value={filters.priority ?? ''} onChange={(e) => set({ priority: (e.target.value || undefined) as TaskFilters['priority'] })}>
        <option value="">Todas las prioridades</option>
        {Object.entries(PRIORITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <select aria-label="Ordenar por" value={filters.sort ?? 'created'} onChange={(e) => set({ sort: e.target.value as TaskFilters['sort'] })}>
        {Object.entries(SORT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <label className="check">
        <input type="checkbox" checked={filters.overdue === true} onChange={(e) => set({ overdue: e.target.checked || undefined })} />
        Solo vencidas
      </label>
      {filters.tag && (
        <button type="button" className="chip active" onClick={() => set({ tag: undefined })} aria-label={`Quitar filtro de etiqueta ${filters.tag}`}>
          #{filters.tag} ✕
        </button>
      )}
      {active && (
        <button type="button" className="btn ghost small" onClick={() => onChange({ project_id: filters.project_id, sort: filters.sort })}>
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
