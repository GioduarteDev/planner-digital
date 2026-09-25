import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { apiRequest } from '../../services/api'
import type { PlannerPage } from './editorModel'

type PageTab = { id: string; label: string; color: string; target: `page:${number}` | `section:${number}`; order: number }
type AgendaSettings = { settings: Record<string, unknown> }
type Folder = { id: number; title: string }
const COLORS = ['#FCD57D', '#E6E3F7', '#B3DFE8', '#FDD0D0', '#9CA362']

function readTabs(settings?: Record<string, unknown>): PageTab[] {
  const value = settings?.page_tabs_v1
  if (!Array.isArray(value)) return []
  return value.filter((item): item is PageTab =>
    typeof item?.id === 'string' && typeof item?.label === 'string'
    && typeof item?.color === 'string' && /^(page|section):\d+$/.test(item?.target)
    && typeof item?.order === 'number',
  ).sort((a, b) => a.order - b.order)
}

export function PageTabs({ agendaId, pages, onNavigate, left, top }: {
  agendaId: number; pages: PlannerPage[]; onNavigate: (id: number) => void
  left: number; top: number
}) {
  const [tabs, setTabs] = useState<PageTab[]>([])
  const tabsRef = useRef<PageTab[]>([])
  const writes = useRef<Promise<void>>(Promise.resolve())
  const [folders, setFolders] = useState<Folder[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiRequest<AgendaSettings>(`/agendas/${agendaId}`),
      apiRequest<Folder[]>(`/agendas/${agendaId}/folders`),
    ]).then(([agenda, sections]) => {
      if (cancelled) return
      const loaded = readTabs(agenda.settings)
      tabsRef.current = loaded
      setTabs(loaded)
      setFolders(sections)
    }).catch(caught => { if (!cancelled) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os marcadores.') })
    return () => { cancelled = true }
  }, [agendaId])

  function persist(next: PageTab[]) {
    tabsRef.current = next
    setTabs(next)
    setSaving(true)
    setError('')
    writes.current = writes.current.catch(() => undefined).then(async () => {
      const agenda = await apiRequest<AgendaSettings>(`/agendas/${agendaId}`)
      await apiRequest(`/agendas/${agendaId}`, {
        method: 'PATCH',
        body: JSON.stringify({ settings: { ...agenda.settings, page_tabs_v1: next } }),
      })
    }).then(() => { if (tabsRef.current === next) setSaving(false) }).catch(caught => {
      setSaving(false)
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar os marcadores.')
    })
  }

  function beginEdit(tab?: PageTab) {
    setEditing(tab?.id ?? null)
    setLabel(tab?.label ?? '')
    setColor(tab?.color ?? COLORS[0])
    setTarget(tab?.target ?? (pages[0] ? `page:${pages[0].id}` : ''))
    setOpen(true)
  }

  function save() {
    const trimmed = label.trim().slice(0, 18)
    if (!trimmed || !target) return
    const existing = tabsRef.current
    const next = editing
      ? existing.map(tab => tab.id === editing ? { ...tab, label: trimmed, color, target: target as PageTab['target'] } : tab)
      : [...existing, { id: crypto.randomUUID(), label: trimmed, color, target: target as PageTab['target'], order: existing.length }]
    persist(next)
    setEditing(null); setLabel(''); setOpen(false)
  }

  function navigate(tab: PageTab) {
    const [kind, rawId] = tab.target.split(':')
    const destination = kind === 'page'
      ? pages.find(page => page.id === Number(rawId))
      : pages.filter(page => page.folderId === Number(rawId)).sort((a, b) => a.position - b.position)[0]
    if (destination) onNavigate(destination.id)
    else { setOpen(true); setError('O destino deste marcador não existe mais. Edite ou exclua o marcador.') }
  }

  return <div ref={rootRef} className="page-tabs" style={{ left, top }}>
    <div className="page-tabs-stack" aria-label="Marcadores da agenda">
      {tabs.map(tab => <button type="button" className="page-tab" key={tab.id}
        style={{ backgroundColor: tab.color }} title={`Ir para ${tab.label}`} onClick={() => navigate(tab)}>
        <span>{tab.label}</span>
      </button>)}
      {tabs.length < 24 && <button className="page-tab-add" type="button" aria-label="Adicionar marcador"
        onClick={() => beginEdit()}><Plus size={16} /></button>}
      {tabs.length > 0 && <button className="page-tab-manage" type="button" aria-label="Editar marcadores"
        onClick={() => setOpen(current => !current)}><Pencil size={13} /></button>}
    </div>

    {open && <div className="page-tabs-panel" role="dialog" aria-label="Marcadores da agenda">
      <header><strong>{editing ? 'Editar marcador' : 'Novo marcador'}</strong>
        <button type="button" aria-label="Fechar marcadores" onClick={() => setOpen(false)}><X size={16} /></button></header>
      <label>Nome curto<input aria-label="Nome do marcador" maxLength={18} value={label} onChange={event => setLabel(event.target.value)} placeholder="Ex.: Estudos" /></label>
      <label>Destino<select aria-label="Destino do marcador" value={target} onChange={event => setTarget(event.target.value)}>
        <option value="" disabled>Escolha o destino</option>
        <optgroup label="Páginas">{pages.map(page => <option key={page.id} value={`page:${page.id}`}>{page.title || `Página ${page.position}`}</option>)}</optgroup>
        <optgroup label="Seções">{folders.map(folder => <option key={folder.id} value={`section:${folder.id}`}>{folder.title}</option>)}</optgroup>
      </select></label>
      <fieldset><legend>Cor</legend>{COLORS.map(value => <button key={value} type="button" className={color === value ? 'is-chosen' : ''}
        aria-label={`Cor ${value}`} aria-pressed={color === value} style={{ backgroundColor: value }} onClick={() => setColor(value)} />)}</fieldset>
      <button type="button" className="page-tab-save" disabled={!label.trim() || !target || saving} onClick={save}>{editing ? 'Salvar alterações' : 'Criar marcador'}</button>
      {error && <p role="alert">{error} <button type="button" onClick={() => persist(tabsRef.current)}>Tentar novamente</button></p>}
      {tabs.length > 0 && <ul>{tabs.map((tab, index) => <li key={tab.id}>
        <span style={{ backgroundColor: tab.color }} />{tab.label}
        <button type="button" aria-label={`Editar ${tab.label}`} onClick={() => beginEdit(tab)}><Pencil size={14} /></button>
        <button type="button" aria-label={`Subir ${tab.label}`} disabled={index === 0} onClick={() => {
          const next = [...tabsRef.current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]
          persist(next.map((item, order) => ({ ...item, order })))
        }}>↑</button>
        <button type="button" aria-label={`Descer ${tab.label}`} disabled={index === tabs.length - 1} onClick={() => {
          const next = [...tabsRef.current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]
          persist(next.map((item, order) => ({ ...item, order })))
        }}>↓</button>
        <button type="button" aria-label={`Excluir ${tab.label}`} onClick={() => persist(tabsRef.current.filter(item => item.id !== tab.id).map((item, order) => ({ ...item, order })))}><Trash2 size={14} /></button>
      </li>)}</ul>}
    </div>}
  </div>
}
