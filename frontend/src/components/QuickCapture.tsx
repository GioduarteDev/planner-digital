import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import ReceiptPaper from './ReceiptPaper'
import { apiRequest } from '../services/api'
import './QuickCapture.css'

export type CaptureSubject = { id: number; name: string; color: string }
export type InboxItem = {
  id: number; text: string; note: string; subject_id: number | null
  optional_date: string | null; optional_time: string | null
  status: 'new' | 'processed'; created_at: string
  converted_type: string | null; converted_id: number | null
}

export function CaptureForm({ item, onSaved, onCancel }: {
  item?: InboxItem; onSaved: (item: InboxItem) => void; onCancel?: () => void
}) {
  const [text, setText] = useState(item?.text ?? '')
  const [date, setDate] = useState(item?.optional_date ?? '')
  const [time, setTime] = useState(item?.optional_time?.slice(0, 5) ?? '')
  const [subject, setSubject] = useState(String(item?.subject_id ?? ''))
  const [note, setNote] = useState(item?.note ?? '')
  const [subjects, setSubjects] = useState<CaptureSubject[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  useEffect(() => { let active = true; apiRequest<CaptureSubject[]>('/subjects').then(data => { if (active) setSubjects(data) }).catch(() => { if (active) setError('Não foi possível carregar as matérias. Você ainda pode capturar apenas o texto.') }); return () => { active = false } }, [])
  async function save(event: FormEvent) {
    event.preventDefault()
    if (pending.current || !text.trim()) return
    pending.current = true; setSaving(true); setError('')
    try {
      const result = await apiRequest<InboxItem>(item ? `/inbox/${item.id}` : '/inbox', {
        method: item ? 'PATCH' : 'POST',
        body: JSON.stringify({ text: text.trim(), optional_date: date || null, optional_time: time || null, optional_subject_id: subject ? Number(subject) : null, note }),
      })
      onSaved(result)
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') }
    finally { pending.current = false; setSaving(false) }
  }
  return <ReceiptPaper className="receipt-paper--capture" label={item ? 'Atualização de entrada' : 'Captura rápida'}>
    <form className="capture-form" onSubmit={save}>
      <label>O que você quer guardar?<textarea autoFocus required maxLength={300} rows={3} value={text} placeholder="Uma ideia, uma entrega, algo para lembrar…" onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }} /></label>
      <details open={item ? true : undefined}><summary>Data, matéria e observação (opcional)</summary><div className="capture-fields">
        <label>Data<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label>Horário<input type="time" value={time} onChange={e => setTime(e.target.value)} /></label>
        <label>Matéria<select value={subject} onChange={e => setSubject(e.target.value)}><option value="">Sem matéria</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Observação<textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /></label>
      </div></details>
      {error && <p role="alert">{error}</p>}
      <div className="capture-actions"><button type="submit" disabled={saving || !text.trim()}>{saving ? 'Salvando…' : 'Salvar'}</button>{onCancel && <button type="button" onClick={onCancel} disabled={saving}>Cancelar</button>}</div>
      <small>Enter salva · Shift+Enter quebra a linha</small>
    </form>
  </ReceiptPaper>
}

export default function QuickCapture() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  function close() { dialog.current?.close(); setOpen(false) }
  return <>
    <button type="button" className="quick-capture-button" onClick={() => { setOpen(true); dialog.current?.showModal(); setMessage('') }}>＋ Capturar</button>
    <span className="capture-toast" role="status">{message}</span>
    <dialog ref={dialog} className="capture-dialog" onCancel={close} onClose={() => setOpen(false)}>
      <div className="capture-heading"><h2>Captura rápida</h2><button type="button" aria-label="Fechar captura" onClick={close}>×</button></div>
      {open && <CaptureForm onCancel={close} onSaved={() => { close(); setMessage('Salvo na Inbox.'); window.dispatchEvent(new Event('inbox-updated')) }} />}
      <Link to="/inbox" onClick={close}>Abrir Inbox</Link>
    </dialog>
  </>
}
