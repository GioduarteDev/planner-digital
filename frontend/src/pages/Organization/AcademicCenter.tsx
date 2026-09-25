import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../services/api'
import './AcademicCenter.css'

type Subject = { id: number; name: string; color: string; professor?: string | null; semester?: string | null }
type Task = { id: number; subject_id: number | null; project_id: number | null; text: string; done: boolean; due_date: string | null; priority: string }
type Event = { id: number; subject_id: number | null; title: string; starts_at: string; all_day: boolean; reminder_minutes: number | null }
type Project = { id: number; subject_id: number | null; title: string; due_date: string | null; status: string }
type Study = { id: number; subject_id: number | null; subject: string; topic: string; study_date: string; duration_minutes: number }
type Data = { subjects: Subject[]; tasks: Task[]; events: Event[]; projects: Project[]; studies: Study[] }
type Kind = 'tasks' | 'events' | 'projects' | 'studies'
const names: Record<Kind, string> = { tasks: 'Tarefa', events: 'Evento / prova', projects: 'Projeto', studies: 'Estudo' }
const dateLabel = (date: string | null) => date ? new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR') : 'Sem prazo'
const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
function urgency(day: string) {
  const today = localDay(new Date())
  const days = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000)
  return days < 0 ? 'Atrasados' : days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : days <= 7 ? 'Próximos 7 dias' : 'Depois'
}
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}min`

function AddRecord({ subject, onSaved }: { subject: Subject; onSaved: () => void }) {
  const [kind, setKind] = useState<Kind>('tasks')
  const [text, setText] = useState('')
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')
  const [minutes, setMinutes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(e: FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('')
    const common = { subject_id: subject.id }
    const body = kind === 'tasks' ? { ...common, text, due_date: day || null } : kind === 'projects' ? { ...common, title: text, due_date: day || null } : kind === 'events' ? { ...common, title: text, starts_at: new Date(`${day}T${time || '00:00'}`).toISOString(), all_day: !time } : { ...common, subject: subject.name, topic: text, study_date: day, duration_minutes: Number(minutes) }
    try { await apiRequest(`/${kind}`, { method: 'POST', body: JSON.stringify(body) }); setText(''); setDay(''); setTime(''); setMinutes(''); onSaved() } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível criar o registro.') } finally { setBusy(false) }
  }
  return <details className="academic-add"><summary>＋ Adicionar à matéria</summary><form className="capture-form" onSubmit={save}>
    <label>Tipo<select value={kind} onChange={e => setKind(e.target.value as Kind)}>{Object.entries(names).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
    <label>{kind === 'studies' ? 'Tópico' : 'Título'}<input required value={text} maxLength={kind === 'projects' ? 160 : kind === 'tasks' ? 300 : 200} onChange={e => setText(e.target.value)} /></label>
    <label>Data<input type="date" required={kind === 'events' || kind === 'studies'} value={day} onChange={e => setDay(e.target.value)} /></label>
    {kind === 'events' && <label>Horário (opcional)<input type="time" value={time} onChange={e => setTime(e.target.value)} /></label>}
    {kind === 'studies' && <label>Duração em minutos<input type="number" required min={1} max={1440} value={minutes} onChange={e => setMinutes(e.target.value)} /></label>}
    {error && <p role="alert">{error}</p>}<button disabled={busy}>{busy ? 'Salvando…' : 'Criar registro'}</button>
  </form></details>
}

export default function AcademicCenter() {
  const [now, setNow] = useState(() => Date.now())
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [semester, setSemester] = useState('all')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const load = useCallback(async () => {
    try { const [subjects, tasks, events, projects, studies] = await Promise.all([apiRequest<Subject[]>('/subjects'), apiRequest<Task[]>('/tasks'), apiRequest<Event[]>('/events'), apiRequest<Project[]>('/projects'), apiRequest<Study[]>('/studies')]); setData({ subjects, tasks, events, projects, studies }); setNow(Date.now()); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao carregar a Central Acadêmica.') }
  }, [])
  useEffect(() => { void Promise.resolve().then(load); const refresh = () => { void load() }; window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh) }, [load, revision])
  async function patch(path: string, body: object) { setBusy(true); setError(''); try { await apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) }); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao atualizar.') } finally { setBusy(false) } }
  if (!data) return <div className="academic-center">{error ? <p role="alert">{error}<button onClick={() => void load()}>Tentar novamente</button></p> : <p role="status">Carregando matérias e compromissos…</p>}</div>
  const subjects = data.subjects.filter(s => semester === 'all' || (s.semester || '') === semester)
  const subject = subjects.find(s => s.id === selected)
  const scope = (id: number | null) => id !== null && subjects.some(s => s.id === id) && (!subject || id === subject.id)
  const tasks = data.tasks.filter(t => scope(t.subject_id))
  const events = data.events.filter(e => scope(e.subject_id)).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const projects = data.projects.filter(p => scope(p.subject_id))
  const studies = data.studies.filter(s => scope(s.subject_id))
  const timeline = [
    ...tasks.filter(t => t.due_date && !t.done).map(t => ({ key: `t${t.id}`, title: t.text, day: t.due_date!, type: 'Entrega', subject: t.subject_id, link: '/tasks' })),
    ...events.map(e => ({ key: `e${e.id}`, title: e.title, day: localDay(new Date(e.starts_at)), type: 'Evento / prova', subject: e.subject_id, link: '/calendar' })),
    ...projects.filter(p => p.due_date && p.status === 'active').map(p => ({ key: `p${p.id}`, title: p.title, day: p.due_date!, type: 'Prazo de projeto', subject: p.subject_id, link: '/organization' })),
  ].sort((a, b) => a.day.localeCompare(b.day) || a.key.localeCompare(b.key))
  const nextEvent = events.find(e => new Date(e.starts_at).getTime() >= now)
  const nextDeadline = timeline.find(e => e.type !== 'Evento / prova')
  return <div className="academic-center">
    <header className="academic-heading"><div><span>SEU SEMESTRE</span><h2>Central Acadêmica</h2><p>Matérias, entregas e tempo para aprender.</p></div><label>Semestre / período<select value={semester} onChange={e => { setSemester(e.target.value); setSelected(null) }}><option value="all">Todos os períodos</option>{Array.from(new Set(data.subjects.map(s => s.semester || ''))).map(s => <option key={s} value={s}>{s || 'Sem período informado'}</option>)}</select></label><button onClick={() => void load()}>Atualizar</button></header>
    {error && <p role="alert">{error}</p>}
    {!data.subjects.length && <div className="academic-empty">Comece criando uma matéria na aba Matérias. Depois adicione ou vincule suas tarefas, eventos, projetos e estudos.</div>}
    {!!data.subjects.length && !subjects.length && <p>Nenhuma matéria neste período.</p>}
    <div className="academic-subjects">{subjects.map(s => {
      const st = data.tasks.filter(t => t.subject_id === s.id)
      const se = data.events.filter(e => e.subject_id === s.id && new Date(e.starts_at).getTime() >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0]
      const sp = data.projects.filter(p => p.subject_id === s.id)
      const deadlines = [...st.filter(t => !t.done && t.due_date).map(t => t.due_date!), ...sp.filter(p => p.status === 'active' && p.due_date).map(p => p.due_date!)].sort()
      return <button className={`academic-subject ${selected === s.id ? 'selected' : ''}`} style={{ borderTopColor: s.color }} key={s.id} onClick={() => setSelected(selected === s.id ? null : s.id)} aria-pressed={selected === s.id}>
        <h3>{s.name}</h3><p>{s.professor || 'Professor não informado'} · {s.semester || 'Período não informado'}</p><div>{st.filter(t => !t.done).length} pendentes · {st.filter(t => t.done).length} concluídas</div><div>{sp.filter(p => p.status === 'active').length} projetos ativos · {duration(data.studies.filter(x => x.subject_id === s.id).reduce((sum, x) => sum + x.duration_minutes, 0))} estudados</div><small>Próximo evento: {se ? `${se.title} · ${new Date(se.starts_at).toLocaleString('pt-BR')}` : 'Nenhum'}</small><small>Próximo prazo: {dateLabel(deadlines[0] ?? null)}</small>
      </button>
    })}</div>
    {subject && <section className="academic-detail"><div className="academic-heading"><h2>{subject.name}</h2><button onClick={() => setSelected(null)}>Ver todo o semestre</button></div>
      <div className="academic-summary"><span>{tasks.filter(t => t.done).length} concluídas</span><span>{tasks.filter(t => !t.done).length} restantes</span><span>{duration(studies.reduce((sum, s) => sum + s.duration_minutes, 0))} estudados</span><span>{projects.filter(p => p.status === 'active').length} projetos ativos</span></div>
      <p>Próximo compromisso: {nextEvent ? `${nextEvent.title} · ${new Date(nextEvent.starts_at).toLocaleString('pt-BR')}` : 'Nenhum'}</p><p>Próximo prazo: {nextDeadline ? `${nextDeadline.title} · ${dateLabel(nextDeadline.day)}` : 'Nenhum'}</p>
      <AddRecord key={subject.id} subject={subject} onSaved={() => setRevision(r => r + 1)} />
      <div className="academic-sections"><section><h3>Próximas entregas</h3>{!tasks.length && <p>Sem tarefas. Adicione uma entrega ou vincule uma tarefa existente abaixo.</p>}{[...tasks].sort((a, b) => Number(a.done) - Number(b.done) || (a.due_date || '9999').localeCompare(b.due_date || '9999')).map(t => <div className="academic-row" key={t.id}><label><input type="checkbox" checked={t.done} disabled={busy} onChange={() => void patch(`/tasks/${t.id}`, { done: !t.done })} /> {t.text}</label><small>{dateLabel(t.due_date)} · {t.done ? 'Concluída' : 'Pendente'} · Prioridade {({ high: 'alta', medium: 'média', low: 'baixa' })[t.priority] || t.priority}</small></div>)}<Link to="/tasks">Abrir Tarefas</Link></section>
      <section><h3>Provas e eventos</h3>{!events.length && <p>Sem eventos. Adicione sua próxima prova.</p>}{events.map(e => <div className="academic-row" key={e.id}><strong>{e.title}</strong><small>{e.all_day ? dateLabel(localDay(new Date(e.starts_at))) : new Date(e.starts_at).toLocaleString('pt-BR')}{e.all_day ? ' · Dia inteiro' : ''}</small><small>{e.reminder_minutes !== null ? `Lembrete: ${e.reminder_minutes} min antes` : 'Sem lembrete'}</small></div>)}<Link to="/calendar">Abrir Calendário</Link></section>
      <section><h3>Projetos</h3>{!projects.length && <p>Sem projetos. Adicione um projeto para esta matéria.</p>}{projects.map(p => { const related = data.tasks.filter(t => t.project_id === p.id); const done = related.filter(t => t.done).length; return <div className="academic-row" key={p.id}><strong>{p.title}</strong><small>{dateLabel(p.due_date)} · {({ active: 'Ativo', completed: 'Concluído', archived: 'Arquivado' })[p.status] || p.status}</small><progress value={done} max={related.length || 1} aria-label={`Progresso de ${p.title}`} /><small>{done}/{related.length} tarefas concluídas</small>{related.map(t => <small key={t.id}>{t.done ? '✓' : '○'} {t.text}</small>)}</div> })}</section>
      <section><h3>Estudos</h3>{!studies.length && <p>Sem estudos registrados. Registre sua primeira sessão.</p>}{studies.map(s => <div className="academic-row" key={s.id}><strong>{s.topic || subject.name}</strong><small>{dateLabel(s.study_date)} · {duration(s.duration_minutes)}</small></div>)}<p>Total: {duration(studies.reduce((sum, s) => sum + s.duration_minutes, 0))}</p><Link to="/studies">Abrir Estudos</Link></section></div>
      <details className="academic-link"><summary>Vincular ou mover registros existentes</summary><p>A alteração mantém o mesmo registro em todas as áreas do planner.</p>{(['tasks', 'events', 'projects', 'studies'] as Kind[]).map(kind => <section key={kind}><h4>{names[kind]}</h4>{!data[kind].length && <p>Nenhum registro disponível.</p>}{data[kind].map(record => <label className="academic-association" key={record.id}><span>{'text' in record ? record.text : 'title' in record ? record.title : record.topic || record.subject}</span><select aria-label={`Matéria de ${'text' in record ? record.text : 'title' in record ? record.title : record.topic}`} value={record.subject_id ?? ''} disabled={busy} onChange={e => void patch(`/${kind}/${record.id}`, { subject_id: e.target.value ? Number(e.target.value) : null })}><option value="">Sem matéria</option>{data.subjects.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>)}</section>)}</details>
    </section>}
    <section className="academic-timeline"><h2>Visão cronológica {subject ? `· ${subject.name}` : 'do semestre'}</h2>{!timeline.length && <p>Nenhum prazo ou evento. Vincule registros a uma matéria e informe suas datas.</p>}{['Atrasados', 'Hoje', 'Amanhã', 'Próximos 7 dias', 'Depois'].map(group => { const entries = timeline.filter(e => urgency(e.day) === group); return entries.length ? <section key={group} className={group === 'Atrasados' ? 'overdue' : ''}><h3>{group}</h3>{entries.map(e => <Link className="academic-timeline-row" to={e.link} key={e.key}><time>{dateLabel(e.day)}</time><span><strong>{e.title}</strong><small>{e.type} · {data.subjects.find(s => s.id === e.subject)?.name}</small></span></Link>)}</section> : null })}</section>
  </div>
}
