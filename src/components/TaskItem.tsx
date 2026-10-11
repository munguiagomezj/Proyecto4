import type { Project, Task, TaskStatus } from '../api/types'
import { formatDate, PRIORITY_LABEL, STATUS_LABEL, todayIso } from '../labels'

interface Props {
  task: Task
  project?: Project
  onStatus(status: TaskStatus): void
  onEdit(): void
  onDelete(): void
  onTag(tag: string): void
}

export function TaskItem({ task, project, onStatus, onEdit, onDelete, onTag }: Props) {
  const done = task.status === 'done'
  const overdue = !done && task.due_date !== null && task.due_date < todayIso()
  return (
    <li className={`task ${done ? 'done' : ''}`}>
      <input
        type="checkbox"
        className="task-check"
        checked={done}
        onChange={() => onStatus(done ? 'todo' : 'done')}
        aria-label={done ? `Marcar «${task.title}» como pendiente` : `Marcar «${task.title}» como hecha`}
      />
      <div className="task-body">
        <div className="task-title-row">
          <button type="button" className="task-title" onClick={onEdit}>{task.title}</button>
          <span className={`badge priority-${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
        </div>
        {task.description && <p className="task-desc">{task.description}</p>}
        <div className="task-meta">
          {project && <span className="muted">{project.name}</span>}
          {task.due_date && (
            <span className={overdue ? 'overdue' : 'muted'}>
              {overdue ? '⚠ Vencida · ' : '📅 '}{formatDate(task.due_date)}
            </span>
          )}
          {task.tags.map((tag) => (
            <button key={tag} type="button" className="chip" onClick={() => onTag(tag)} aria-label={`Filtrar por etiqueta ${tag}`}>
              #{tag}
            </button>
          ))}
        </div>
      </div>
      <div className="task-actions">
        <select aria-label={`Estado de «${task.title}»`} value={task.status} onChange={(e) => onStatus(e.target.value as TaskStatus)}>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="button" className="btn icon" onClick={onEdit} aria-label={`Editar «${task.title}»`}>✏️</button>
        <button type="button" className="btn icon" onClick={onDelete} aria-label={`Borrar «${task.title}»`}>🗑️</button>
      </div>
    </li>
  )
}
