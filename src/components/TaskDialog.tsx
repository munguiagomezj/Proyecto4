import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/types'
import type { Priority, Project, Task, TaskInput, TaskStatus } from '../api/types'
import { PRIORITY_LABEL, STATUS_LABEL } from '../labels'
import { Field } from './Field'

interface Props {
  open: boolean
  task?: Task
  projects: Project[]
  defaultProjectId?: number
  onClose(): void
  onSubmit(projectId: number, data: TaskInput): Promise<unknown>
}

export function TaskDialog({ open, task, projects, defaultProjectId, onClose, onSubmit }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setError(null)
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const data: TaskInput = {
      title: String(form.get('title') ?? ''),
      description: String(form.get('description') ?? '') || null,
      status: form.get('status') as TaskStatus,
      priority: form.get('priority') as Priority,
      due_date: String(form.get('due_date') ?? '') || null,
      tags: String(form.get('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    }
    setSaving(true)
    try {
      await onSubmit(Number(form.get('project')), data)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Error inesperado'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="task-dialog-title">
      {open && (
        <form onSubmit={handleSubmit} noValidate key={task?.id ?? 'new'}>
          <h2 id="task-dialog-title">{task ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <Field label="Título" error={error?.fields.title}>
            <input name="title" defaultValue={task?.title} maxLength={200} autoFocus />
          </Field>
          <Field label="Descripción">
            <textarea name="description" rows={3} defaultValue={task?.description ?? ''} />
          </Field>
          <div className="row">
            <label>
              Proyecto
              <select name="project" defaultValue={task?.project_id ?? defaultProjectId ?? projects[0]?.id} disabled={!!task}>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {task && <input type="hidden" name="project" value={task.project_id} />}
            </label>
            <label>
              Fecha límite
              <input type="date" name="due_date" defaultValue={task?.due_date ?? ''} />
            </label>
          </div>
          <div className="row">
            <label>
              Estado
              <select name="status" defaultValue={task?.status ?? 'todo'}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label>
              Prioridad
              <select name="priority" defaultValue={task?.priority ?? 'medium'}>
                {Object.entries(PRIORITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <Field label="Etiquetas" error={error?.fields.tags} hint="Separadas por comas">
            <input name="tags" defaultValue={task?.tags.join(', ')} placeholder="feria, cv" />
          </Field>
          {error && !Object.keys(error.fields).length && <p className="form-error" role="alert">{error.message}</p>}
          <div className="dialog-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}
    </dialog>
  )
}
