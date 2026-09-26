import { useState } from 'react'
import { apiRequest } from '../../services/api'
import DeadlineList from './DeadlineList'
import { deadlineGroup, deadlines, GROUPS, localDate } from './planningModel'
import usePlanningData from './usePlanningData'
import './Planning.css'

export default function DeadlinesPage() {
  const { data, loading, error, now, reload } = usePlanningData()
  const [busy, setBusy] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  async function complete(id: number) {
    if (busy !== null) return
    setBusy(id); setActionError(''); setMessage('')
    try { await apiRequest(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ done: true }) }); await reload(); setMessage('Tarefa concluída e atualizada no planner.') }
    catch (err) { setActionError(err instanceof Error ? err.message : 'Não foi possível concluir a tarefa.') }
    finally { setBusy(null) }
  }
  const today = localDate(now)
  const items = data ? deadlines(data, now) : []
  return <section className="planning-page deadlines-page"><header className="planning-heading"><div><span>UM DIA DE CADA VEZ</span><h1>Central de Prazos</h1><p>Saiba o que precisa da sua atenção, em ordem de chegada.</p></div><button onClick={() => void reload()}>Atualizar</button></header>
    {loading && <p role="status">Carregando prazos…</p>}{(error || actionError) && <p role="alert">{error || actionError}</p>}<p role="status">{message}</p>
    {data && <><div className="planning-stats">{GROUPS.map(group => <a href={`#group-${GROUPS.indexOf(group)}`} key={group}><strong>{items.filter(i => deadlineGroup(i.day, today) === group).length}</strong><span>{group}</span></a>)}</div>
      {!items.length && <div className="planning-empty"><h2>Nenhum prazo por aqui</h2><p>Adicione uma data às tarefas e aos projetos, ou crie um evento no Calendário.</p></div>}
      {!!items.length && !items.some(i => i.day <= today) && <p className="planning-notice">Tudo em dia. Seus próximos compromissos estão abaixo.</p>}
      {GROUPS.map((group, index) => { const entries = items.filter(i => deadlineGroup(i.day, today) === group); return entries.length ? <section id={`group-${index}`} className={`deadline-group ${index === 0 ? 'is-overdue' : ''}`} key={group}><h2>{group} <span>{entries.length}</span></h2><DeadlineList items={entries} data={data} today={today} busy={busy} onComplete={id => void complete(id)} /></section> : null })}
    </>}
  </section>
}

