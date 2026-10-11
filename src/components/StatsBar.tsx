import { useStats } from '../api/queries'

export function StatsBar() {
  const { data } = useStats()
  if (!data) return <div className="stats skeleton" aria-hidden="true" />
  const pct = data.total ? Math.round((data.by_status.done / data.total) * 100) : 0
  return (
    <section className="stats" aria-label="Resumen de tus tareas">
      <div className="stat">
        <span className="stat-label">Completadas</span>
        <span className="stat-value">{pct} %</span>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Tareas completadas">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="stat">
        <span className="stat-label">Pendientes</span>
        <span className="stat-value">{data.by_status.todo + data.by_status.in_progress}</span>
        <span className="stat-detail">{data.by_status.in_progress} en curso</span>
      </div>
      <div className="stat">
        <span className="stat-label">Vencidas</span>
        <span className={`stat-value ${data.overdue ? 'overdue' : ''}`}>{data.overdue}</span>
        <span className="stat-detail">{data.by_priority.high} de prioridad alta en total</span>
      </div>
      <div className="stat">
        <span className="stat-label">Hechas esta semana</span>
        <span className="stat-value">{data.completed_last_7_days}</span>
        <span className="stat-detail">de {data.total} tareas</span>
      </div>
    </section>
  )
}
