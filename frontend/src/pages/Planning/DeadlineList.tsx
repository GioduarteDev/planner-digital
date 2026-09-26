import { Link } from 'react-router-dom'
import { dateLabel, remainingLabel, type Deadline, type PlanningData } from './planningModel'

export default function DeadlineList({ items, data, today, busy, onComplete }: {
  items: Deadline[]; data: PlanningData; today: string; busy?: number | null; onComplete?: (id: number) => void
}) {
  return <div className="deadline-list">{items.map(item => {
    const subject = data.subjects.find(s => s.id === item.subjectId)
    const project = data.projects.find(p => p.id === item.projectId)
    return <article className="deadline-item" data-kind={item.kind} key={item.key}>
      {item.kind === 'task' && onComplete && <input type="checkbox" checked={false} disabled={busy != null} aria-label={`Concluir ${item.title}`} onChange={() => onComplete(item.id)} />}
      <div className="deadline-content"><span className="deadline-type">{item.type} · {item.status}</span><Link className="deadline-title" to={item.href}>{item.title}</Link>
        <div className="deadline-context">{subject && <Link to={`/organization?section=academic&subject=${subject.id}`}>{subject.name}</Link>}{project && <Link to={`/organization?section=projects#project-${project.id}`}>{project.title}</Link>}</div>
      </div>
      <div className="deadline-date"><time dateTime={item.at || item.day}>{dateLabel(item.day)}{item.at ? ` · ${new Date(item.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</time><small>{item.kind === 'event' && item.status === 'Passado' ? 'Horário já passou' : remainingLabel(item.day, today)}</small></div>
    </article>
  })}</div>
}
