import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DEMO_MODE } from '../api'
import { useCreateTask, useDeleteTask, useProjects, useTasks, useUpdateTask } from '../api/queries'
import type { Task, TaskFilters } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { FiltersBar } from '../components/FiltersBar'
import { Sidebar } from '../components/Sidebar'
import { StatsBar } from '../components/StatsBar'
import { TaskDialog } from '../components/TaskDialog'
import { TaskItem } from '../components/TaskItem'
import { ThemeToggle } from '../components/ThemeToggle'
import { filtersFromParams, filtersToParams } from '../filters'

const PAGE_SIZE = 10

export function DashboardPage() {
  const { user, logout } = useAuth()
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])
  const setFilters = useCallback((next: TaskFilters) => setParams(filtersToParams(next)), [setParams])

  const { data: projects = [] } = useProjects()
  const tasks = useTasks({ ...filters, size: PAGE_SIZE })
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const [dialog, setDialog] = useState<{ open: boolean; task?: Task }>({ open: false })

  const projectById = new Map(projects.map((p) => [p.id, p]))
  const current = filters.project_id ? projectById.get(filters.project_id) : undefined
  const page = tasks.data

  return (
    <div className="layout">
      <header className="topbar">
        <span className="brand">✅ Tareas</span>
        {DEMO_MODE && <span className="badge demo" title="Los datos se guardan solo en este navegador">Modo demo</span>}
        <span className="spacer" />
        <span className="muted user">{user?.full_name}</span>
        <ThemeToggle />
        <button type="button" className="btn ghost small" onClick={logout}>Salir</button>
      </header>

      <Sidebar selected={filters.project_id} onSelect={(id) => setFilters({ ...filters, project_id: id, page: undefined })} />

      <main className="content">
        <StatsBar />
        <div className="content-head">
          <h1>{current ? current.name : 'Todas las tareas'}</h1>
          <button type="button" className="btn primary" onClick={() => setDialog({ open: true })} disabled={!projects.length}>
            + Nueva tarea
          </button>
        </div>
        {current?.description && <p className="muted">{current.description}</p>}
        <FiltersBar filters={filters} onChange={setFilters} />

        {tasks.isError && <p className="form-error" role="alert">No se pudieron cargar las tareas: {tasks.error.message}</p>}
        {tasks.isPending && <p className="muted">Cargando tareas…</p>}
        {page && page.items.length === 0 && (
          <p className="empty">{projects.length ? 'No hay tareas con estos filtros.' : 'Crea un proyecto en la barra lateral para empezar.'}</p>
        )}
        {page && page.items.length > 0 && (
          <ul className={`tasks ${tasks.isPlaceholderData ? 'stale' : ''}`} aria-label="Tareas" aria-busy={tasks.isFetching}>
            {page.items.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                project={filters.project_id ? undefined : projectById.get(task.project_id)}
                onStatus={(status) => updateTask.mutate({ id: task.id, data: { status } })}
                onEdit={() => setDialog({ open: true, task })}
                onDelete={() => confirm(`¿Borrar la tarea «${task.title}»?`) && deleteTask.mutate(task.id)}
                onTag={(tag) => setFilters({ ...filters, tag, page: undefined })}
              />
            ))}
          </ul>
        )}
        {page && page.pages > 1 && (
          <nav className="pagination" aria-label="Paginación">
            <button type="button" className="btn ghost small" disabled={page.page <= 1} onClick={() => setFilters({ ...filters, page: page.page - 1 })}>← Anterior</button>
            <span className="muted">Página {page.page} de {page.pages} · {page.total} tareas</span>
            <button type="button" className="btn ghost small" disabled={page.page >= page.pages} onClick={() => setFilters({ ...filters, page: page.page + 1 })}>Siguiente →</button>
          </nav>
        )}
      </main>

      <TaskDialog
        open={dialog.open}
        task={dialog.task}
        projects={projects}
        defaultProjectId={filters.project_id}
        onClose={() => setDialog({ open: false })}
        onSubmit={(projectId, data) =>
          dialog.task ? updateTask.mutateAsync({ id: dialog.task.id, data }) : createTask.mutateAsync({ projectId, data })
        }
      />
    </div>
  )
}
