import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../services/api'
import DeadlineList from './DeadlineList'
import { addDays, dateLabel, deadlines, isoWeek, localDate, mondayOf, weeklySummary, type PlanningData } from './planningModel'
import usePlanningData from './usePlanningData'
import './Planning.css'

type Review = { week_start: string; priorities: string[]; reflection: string; goal: string; updated_at: string | null }
type Completion = { id: number; completion_date: string }

function Week({ start, setStart, data, now, reload }: {
  start: string; setStart: (day: string) => void; data: PlanningData; now: Date; reload: () => Promise<void>
}) {
  const [review, setReview] = useState<Review | null>(null)
  const [habits, setHabits] = useState<Completion[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const end = addDays(start, 6)
  const nextStart = addDays(start, 7)
  const nextEnd = addDays(start, 13)
  useEffect(() => {
    let active = true
    Promise.all([apiRequest<Review>(`/weekly-reviews/${start}`), apiRequest<Completion[]>(`/habit-completions?start=${start}&end=${end}`)])
      .then(([saved, completions]) => { if (active) { setReview(saved); setHabits(completions); setError('') } })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Não foi possível carregar esta semana.') })
    return () => { active = false }
  }, [start, end, attempt])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  async function save(): Promise<boolean> {
    if (!review || saving) return false
    setSaving(true); setError(''); setMessage('')
    try {
      const saved = await apiRequest<Review>(`/weekly-reviews/${start}`, { method: 'PUT', body: JSON.stringify({ priorities: review.priorities, reflection: review.reflection, goal: review.goal }) })
      setReview(saved); setDirty(false); setMessage('Revisão salva.'); return true
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar. Seu texto continua aqui.'); return false }
    finally { setSaving(false) }
  }
  async function navigate(day: string) { if (saving) return; if (dirty && !await save()) return; setStart(day) }
  function edit(patch: Partial<Review>) { if (!review) return; setReview({ ...review, ...patch }); setDirty(true); setMessage('Alterações ainda não salvas.') }
  async function submit(e: FormEvent) { e.preventDefault(); await save() }
  const summary = weeklySummary(data, start, now)
  const next = deadlines(data, now, true).filter(item => item.day >= nextStart && item.day <= nextEnd)
  const occurred = summary.events.filter(e => new Date(e.ends_at || e.starts_at).getTime() < now.getTime()).length
  return <>
    <nav className="weekly-navigation" aria-label="Navegação de semanas"><button disabled={saving} onClick={() => void navigate(addDays(start, -7))}>← Semana anterior</button><button disabled={saving} onClick={() => void navigate(mondayOf(localDate(now)))}>Semana atual</button><strong>{dateLabel(start)} — {dateLabel(end)} · {isoWeek(start)}</strong><button disabled={saving} onClick={() => void navigate(nextStart)}>Próxima semana →</button></nav>
    {error && <p role="alert">{error}{!review && <button onClick={() => setAttempt(a => a + 1)}>Tentar novamente</button>}</p>}
    <div className="planning-stats"><div><strong>{summary.completed.length}</strong><span>Tarefas concluídas</span></div><div><strong>{summary.pending.length}</strong><span>Tarefas pendentes</span></div><div><strong>{summary.events.length}</strong><span>Eventos · {occurred} passados / {summary.events.length - occurred} agendados</span></div><div><strong>{summary.minutes}</strong><span>Minutos de estudo</span></div><div><strong>{summary.subjects.length}</strong><span>Matérias estudadas</span></div><div><strong>{summary.projects.length}</strong><span>Projetos com atividade</span></div><div><strong>{review ? habits.length : '…'}</strong><span>Hábitos concluídos</span></div></div>
    {summary.legacyCompleted.length > 0 && <p className="weekly-muted">{summary.legacyCompleted.length} tarefa(s) antiga(s) com prazo nesta semana já estão concluídas, mas não possuem data de conclusão e não entram no total de conclusões da semana.</p>}
    <div className="weekly-grid"><div><section className="weekly-card"><h2>O que aconteceu</h2>{!summary.completed.length && !summary.events.length && !summary.studies.length && <p className="weekly-muted">Nenhuma tarefa concluída, evento ou estudo registrado nesta semana.</p>}
      <ul>{summary.completed.map(t => <li key={`t${t.id}`}>✓ <Link to={`/tasks#task-${t.id}`}>{t.text}</Link></li>)}{summary.events.map(e => <li key={`e${e.id}`}><Link to={`/calendar?date=${localDate(new Date(e.starts_at))}`}>{e.title}</Link> · {new Date(e.starts_at).toLocaleString('pt-BR')}</li>)}{summary.studies.map(s => <li key={`s${s.id}`}><Link to="/studies">{s.topic || s.subject}</Link> · {s.duration_minutes} min · {dateLabel(s.study_date)}</li>)}</ul>
      {!!summary.projects.length && <><h3>Projetos com atividade</h3><ul>{summary.projects.map(p => <li key={p.id}><Link to={`/organization?section=projects#project-${p.id}`}>{p.title}</Link></li>)}</ul><p className="weekly-muted">Considera alterações do projeto e registros vinculados na semana.</p></>}
    </section><section className="weekly-card"><h2>Ficou para depois</h2>{!summary.deferred.length ? <p className="weekly-muted">Nenhuma tarefa desta semana com prazo passado e ainda aberta.</p> : <ul>{summary.deferred.map(t => <li key={t.id}><Link to={`/tasks#task-${t.id}`}>{t.text}</Link> · {t.due_date ? dateLabel(t.due_date) : 'Prazo com horário'}</li>)}</ul>}</section>
      <section className="weekly-card"><h2>Matérias que receberam atenção</h2>{!summary.subjects.length && <p className="weekly-muted">Registre um estudo para acompanhar sua dedicação.</p>}{summary.subjects.map(s => <div className="weekly-study-row" key={s.id ?? s.name}>{s.id ? <Link to={`/organization?section=academic&subject=${s.id}`}>{s.name}</Link> : <span>{s.name}</span>}<strong>{s.minutes} min</strong><progress value={s.minutes} max={summary.minutes || 1} aria-label={`Tempo dedicado a ${s.name}`} /></div>)}</section>
      <section className="weekly-card"><h2>Próxima semana</h2><p className="weekly-muted">{dateLabel(nextStart)} — {dateLabel(nextEnd)}</p>{next.length ? <DeadlineList items={next} data={data} today={localDate(now)} /> : <p>Nenhum prazo ou evento previsto. Um espaço para planejar com calma.</p>}</section>
    </div><aside><section className="weekly-card"><h2>Revisar e planejar</h2><p className="weekly-muted">Prioridades para {dateLabel(nextStart)} — {dateLabel(nextEnd)}. Esta revisão fica guardada em {isoWeek(start)}.</p>
      {!review ? !error && <p role="status">Carregando sua revisão…</p> : <form className="weekly-form" onSubmit={submit}>
        {review.priorities.map((priority, index) => <label key={index}>Prioridade {index + 1}<input disabled={saving} maxLength={300} value={priority} onChange={e => edit({ priorities: review.priorities.map((p, i) => i === index ? e.target.value : p) })} /></label>)}
        <label>Reflexão da semana<textarea disabled={saving} rows={5} maxLength={5000} value={review.reflection} placeholder="O que funcionou? O que você quer ajustar?" onChange={e => edit({ reflection: e.target.value })} /></label>
        <label>Pequeno objetivo da semana<input disabled={saving} maxLength={500} value={review.goal} onChange={e => edit({ goal: e.target.value })} /></label>
        <button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar revisão'}</button>
        <p className="weekly-save-state" role="status">{message || (review.updated_at ? `Salva em ${new Date(review.updated_at).toLocaleString('pt-BR')}` : 'Sua revisão ainda está em branco.')}</p>
        <small className="weekly-muted">Ao trocar de semana pelos botões acima, suas alterações também são salvas.</small>
      </form>}
    </section><button disabled={saving} onClick={() => { void reload(); if (!dirty) setAttempt(a => a + 1) }}>Atualizar indicadores</button></aside></div>
  </>
}

export default function WeeklyReviewPage() {
  const { data, now, error, loading, reload } = usePlanningData()
  const [start, setStart] = useState(() => mondayOf(localDate(new Date())))
  return <section className="planning-page weekly-page"><header className="planning-heading"><div><span>PAUSAR, PERCEBER, PLANEJAR</span><h1>Revisão Semanal</h1><p>Uma semana de cada vez, com espaço para o que importa.</p></div><Link to="/deadlines">Ver todos os prazos</Link></header>
    {loading && <p role="status">Carregando sua semana…</p>}{error && <p role="alert">{error}<button onClick={() => void reload()}>Tentar novamente</button></p>}
    {data && <Week key={start} start={start} setStart={setStart} data={data} now={now} reload={reload} />}
  </section>
}
