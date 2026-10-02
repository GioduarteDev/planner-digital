import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CaptureForm, type CaptureSubject, type InboxItem } from '../../components/QuickCapture'
import ReceiptPaper from '../../components/ReceiptPaper'
import { apiRequest } from '../../services/api'

const targets = { task: 'Tarefa', event: 'Evento', study: 'Estudo', project: 'Projeto', note: 'Nota' }
type Target = keyof typeof targets
const destinations: Record<string, string> = { task: '/tasks', event: '/calendar', study: '/studies', project: '/organization' }

function Conversion({ item, onSaved, onCancel }: { item: InboxItem; onSaved: (item: InboxItem) => void; onCancel: () => void }) {
  const [target, setTarget] = useState<Target>('task')
  const [date, setDate] = useState(item.optional_date ?? '')
  const [duration, setDuration] = useState('')
  const [subject, setSubject] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [error, setError] = useState('')
  async function convert(e: FormEvent) {
    e.preventDefault(); if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    try {
      const startsAt = date ? new Date(`${date}T${item.optional_time || '00:00'}`).toISOString() : null
      const result = await apiRequest<InboxItem>(`/inbox/${item.id}/convert`, { method: 'POST', body: JSON.stringify({ target, timezone_offset_minutes: startsAt ? new Date(startsAt).getTimezoneOffset() : new Date().getTimezoneOffset(), date: date || null, starts_at: target === 'event' || (target === 'task' && item.optional_time) ? startsAt : null, duration_minutes: target === 'study' ? Number(duration) : null, subject: target === 'study' && !item.subject_id ? subject : null }) })
      onSaved(result)
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha na conversão. Tente novamente.') }
    finally { pending.current = false; setBusy(false) }
  }
  return <form className="inbox-convert" onSubmit={convert}>
    <label>Organizar como<select value={target} onChange={e => setTarget(e.target.value as Target)}>{Object.entries(targets).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    {(target === 'event' || target === 'study') && !item.optional_date && <label>Data<input type="date" required value={date} onChange={e => setDate(e.target.value)} /></label>}
    {target === 'event' && !item.optional_time && <small>Será criado um evento de dia inteiro.</small>}
    {target === 'study' && <><label>Duração em minutos<input type="number" min={1} max={1440} required value={duration} onChange={e => setDuration(e.target.value)} /></label>{!item.subject_id && <label>Matéria do estudo<input required maxLength={100} value={subject} onChange={e => setSubject(e.target.value)} /></label>}</>}
    {error && <p role="alert">{error}</p>}
    <div className="capture-actions"><button disabled={busy}>{busy ? 'Convertendo…' : 'Confirmar conversão'}</button><button type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div>
  </form>
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [subjects, setSubjects] = useState<CaptureSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [converting, setConverting] = useState<number | null>(null)
  const [filter, setFilter] = useState('new')
  const load = useCallback(async () => { try { const [a, b] = await Promise.all([apiRequest<InboxItem[]>('/inbox'), apiRequest<CaptureSubject[]>('/subjects')]); setItems(a); setSubjects(b); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao carregar Inbox.') } finally { setLoading(false) } }, [])
  useEffect(() => { void Promise.resolve().then(load); const refresh = () => { void load() }; window.addEventListener('inbox-updated', refresh); return () => window.removeEventListener('inbox-updated', refresh) }, [load])
  function updated(item: InboxItem) { setItems(current => current.map(i => i.id === item.id ? item : i)); setEditing(null); setConverting(null); setMessage(item.converted_type ? 'Conversão concluída. O registro já está disponível no planner.' : 'Item atualizado.'); if (item.converted_type) setFilter('all') }
  async function remove(item: InboxItem) { if (!window.confirm(`Excluir “${item.text}” da Inbox? As entidades convertidas serão mantidas.`)) return; try { await apiRequest(`/inbox/${item.id}`, { method: 'DELETE' }); setItems(current => current.filter(i => i.id !== item.id)); setMessage('Item excluído.') } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao excluir.') } }
  return <section className="inbox-page"><header><h1>Inbox</h1><p>Capture agora. Organize quando puder.</p></header>
    <details><summary>Nova captura</summary><CaptureForm key={items.length} onSaved={item => { setItems(current => [item, ...current]); setMessage('Salvo na Inbox.'); setFilter('new') }} /></details>
    <div className="capture-actions"><label>Mostrar <select value={filter} onChange={e => setFilter(e.target.value)}><option value="new">Novos</option><option value="processed">Processados</option><option value="all">Todos</option></select></label><button onClick={() => void load()}>Atualizar</button></div>
    {loading && <p role="status">Carregando Inbox…</p>}{error && <p role="alert">{error}</p>}<p role="status">{message}</p>
    {!loading && !error && !items.filter(i => filter === 'all' || i.status === filter).length && <p>Nenhum item aqui. Use ＋ Capturar para guardar sua próxima ideia.</p>}
    <div className="inbox-list">{items.filter(i => filter === 'all' || i.status === filter).map(item => <ReceiptPaper className="receipt-paper--inbox-entry" label="Registro da Inbox" key={item.id}><article className={`inbox-card ${item.status}`}>
      <span className="inbox-status">{item.status === 'new' ? 'Novo' : 'Processado'}{item.converted_type ? ` · ${targets[item.converted_type as Target]}` : ''}</span>
      {editing === item.id ? <CaptureForm item={item} onSaved={updated} onCancel={() => setEditing(null)} /> : <><h2>{item.text}</h2><div className="inbox-meta"><span>Criado em {new Date(item.created_at).toLocaleString('pt-BR')}</span>{item.optional_date && <span>{new Date(`${item.optional_date}T00:00:00`).toLocaleDateString('pt-BR')}</span>}{item.optional_time && <span>{item.optional_time.slice(0, 5)}</span>}{item.subject_id && <span>{subjects.find(s => s.id === item.subject_id)?.name ?? 'Matéria'}</span>}</div>{item.note && <p>{item.note}</p>}
      <div className="capture-actions"><button onClick={() => { setEditing(item.id); setConverting(null) }}>Editar</button><button onClick={() => void remove(item)}>Excluir</button>{!item.converted_type && <button onClick={() => setConverting(item.id)}>Organizar</button>}{item.converted_type && destinations[item.converted_type] && <Link to={destinations[item.converted_type]}>Abrir {targets[item.converted_type as Target]}</Link>}</div></>}
      {converting === item.id && <Conversion item={item} onSaved={updated} onCancel={() => setConverting(null)} />}
    </article></ReceiptPaper>)}</div>
  </section>
}
