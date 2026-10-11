import { useState } from 'react'
import type { FormEvent } from 'react'
import { useCreateProject, useDeleteProject, useProjects } from '../api/queries'
import { ApiError } from '../api/types'

interface Props {
  selected?: number
  onSelect(projectId?: number): void
}

export function Sidebar({ selected, onSelect }: Props) {
  const { data: projects = [], isPending } = useProjects()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const [name, setName] = useState('')
  const total = projects.reduce((sum, p) => sum + p.task_count, 0)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    const project = await createProject.mutateAsync({ name })
    setName('')
    onSelect(project.id)
  }

  async function handleDelete(id: number, projectName: string) {
    if (!confirm(`¿Borrar el proyecto «${projectName}» y todas sus tareas?`)) return
    await deleteProject.mutateAsync(id)
    if (selected === id) onSelect(undefined)
  }

  const nameError = createProject.error instanceof ApiError ? createProject.error.fields.name ?? createProject.error.message : null

  return (
    <nav className="sidebar" aria-label="Proyectos">
      <h2>Proyectos</h2>
      <ul>
        <li>
          <button type="button" className={`project ${selected ? '' : 'selected'}`} aria-current={!selected ? 'page' : undefined} onClick={() => onSelect(undefined)}>
            <span>Todas las tareas</span><span className="count">{total}</span>
          </button>
        </li>
        {isPending && <li className="muted">Cargando…</li>}
        {projects.map((p) => (
          <li key={p.id} className="project-row">
            <button type="button" className={`project ${selected === p.id ? 'selected' : ''}`} aria-current={selected === p.id ? 'page' : undefined} onClick={() => onSelect(p.id)}>
              <span>{p.name}</span><span className="count">{p.task_count}</span>
            </button>
            <button type="button" className="btn icon small delete-project" onClick={() => handleDelete(p.id, p.name)} aria-label={`Borrar proyecto ${p.name}`}>✕</button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleCreate} className="new-project">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nuevo proyecto" aria-label="Nombre del nuevo proyecto" maxLength={100} />
        <button type="submit" className="btn small" disabled={createProject.isPending}>Añadir</button>
      </form>
      {nameError && <p className="field-error" role="alert">{nameError}</p>}
    </nav>
  )
}
