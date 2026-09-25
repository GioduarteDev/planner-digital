import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, File, ChevronLeft, ChevronRight } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import PageEditor from './PageEditor'
import { BindingRings } from './BindingRings'
import { PageTabs } from './PageTabs'
import type { PlannerPage } from './editorModel'
import './EditorWorkspace.css'
import './PlannerDetails.css'

export default function AgendaPage() {
  const { id } = useParams()
  const [, setSearchParams] = useSearchParams()
  const agendaId = Number(id)
  const [mode, setMode] = useState<'single' | 'spread'>('single')
  const [focused, setFocused] = useState<'first' | 'second'>('first')
  const [hasOpenedSpread, setHasOpenedSpread] = useState(false)
  const [zoom, setZoom] = useState('fit')
  const [context, setContext] = useState<{ id: number; pages: PlannerPage[] } | null>(null)
  const [firstPage, setFirstPage] = useState<number>()
  const bookRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const [decoration, setDecoration] = useState<{
    tabLeft: number; tabTop: number; ringLeft: number; ringTop: number; ringHeight: number
  } | null>(null)
  const [availableWidth, setAvailableWidth] = useState(900)
  useEffect(() => {
    const node = bookRef.current
    if (!node) return
    const observer = new ResizeObserver(entries => setAvailableWidth(entries[0].contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const scale = zoom === 'fit'
    ? Math.min(1, Math.max(.3, (availableWidth - 20) / (mode === 'spread' ? 1784 : 886)))
    : Number(zoom)
  const updateContext = useCallback((id: number, pages: PlannerPage[]) => {
    setContext({ id, pages })
    setFirstPage(id)
    setSearchParams(current => {
      if (current.get('page') === String(id)) return current
      const next = new URLSearchParams(current)
      next.set('page', String(id))
      return next
    }, { replace: true })
  }, [setSearchParams])
  const ordered = [...(context?.pages ?? [])].sort((a, b) => a.position - b.position || a.id - b.id)
  const index = ordered.findIndex(page => page.id === context?.id)
  const companion = ordered[index + 1]
  useEffect(() => {
    const book = bookRef.current
    const workspace = workspaceRef.current
    if (!book || !workspace) return
    const first = book.querySelector<HTMLElement>(':scope > .agenda-workspace .planner-sheet')
    if (!first) return
    const measure = () => {
      const second = book.querySelector<HTMLElement>('.workspace-companion .planner-sheet')
      const base = workspace.getBoundingClientRect()
      const left = first.getBoundingClientRect()
      const right = mode === 'spread' ? second?.getBoundingClientRect() : null
      setDecoration({
        tabLeft: (right ?? left).right - base.left + 2,
        tabTop: (right ?? left).top - base.top + 44,
        ringLeft: right ? (left.right + right.left) / 2 - base.left : 0,
        ringTop: left.top - base.top + 34,
        ringHeight: right ? Math.max(0, Math.min(left.height, right.height) - 70) : 0,
      })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(book)
    observer.observe(first)
    let observedSecond: HTMLElement | null = null
    const childObserver = new MutationObserver(() => {
      const second = book.querySelector<HTMLElement>('.workspace-companion .planner-sheet')
      if (second && second !== observedSecond) {
        if (observedSecond) observer.unobserve(observedSecond)
        observer.observe(second)
        observedSecond = second
        measure()
      }
    })
    childObserver.observe(book, { childList: true, subtree: true })
    const initialSecond = book.querySelector<HTMLElement>('.workspace-companion .planner-sheet')
    if (initialSecond) { observer.observe(initialSecond); observedSecond = initialSecond }
    book.addEventListener('scroll', measure)
    window.addEventListener('resize', measure)
    measure()
    return () => {
      observer.disconnect()
      childObserver.disconnect()
      book.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [context?.id, companion?.id, mode, scale])
  const navigateTo = useCallback((id: number) => { setFocused('first'); setFirstPage(id) }, [])
  const updateCompanion = useCallback((id: number) => {
    if (companion && id !== companion.id) navigateTo(id)
  }, [companion, navigateTo])
  const navigate = (offset: number) => {
    const page = ordered[index + offset]
    if (page) { setFocused('first'); setFirstPage(page.id) }
  }
  return <div className={`editor-workspace-v6 mode-${mode}`} ref={workspaceRef}>
    <header className="workspace-view-controls">
      <div><span className="workspace-eyebrow">Seu espaço de criação</span><h1>Uma página de cada vez.</h1></div>
      <div className="workspace-mode-switch" role="group" aria-label="Modo de visualização">
        <button type="button" aria-pressed={mode === 'single'} onClick={() => { setMode('single'); setFocused('first') }}><File size={16} /> Folha única</button>
        <button type="button" aria-pressed={mode === 'spread'} onClick={() => { setHasOpenedSpread(true); setMode('spread') }}><BookOpen size={16} /> Agenda aberta</button>
      </div>
    </header>
    <div className="workspace-book" ref={bookRef}>
      <PageEditor scale={scale} initialPageId={firstPage} focused={focused === 'first'} onFocus={() => setFocused('first')} onPageChange={updateContext} onPreferredMode={nextMode => { setHasOpenedSpread(nextMode === 'spread' || hasOpenedSpread); setMode(nextMode) }} />
      {hasOpenedSpread && companion && <div className="workspace-companion" hidden={mode !== 'spread'}>
        <PageEditor scale={scale} key={companion.id} initialPageId={companion.id} focused={focused === 'second'}
          onFocus={() => setFocused('second')} onNavigate={navigateTo} onPageChange={updateCompanion} onPreferredMode={nextMode => { setHasOpenedSpread(nextMode === 'spread' || hasOpenedSpread); setMode(nextMode) }} />
      </div>}
      {mode === 'spread' && !companion && <div className="book-end"><BookOpen size={28} /><p>Você chegou ao fim da agenda.</p><span>Crie outra página pelo índice.</span></div>}
    </div>
    {mode === 'spread' && companion && decoration && <BindingRings left={decoration.ringLeft}
      top={decoration.ringTop} height={decoration.ringHeight} scale={scale} />}
    {decoration && Number.isFinite(agendaId) && <PageTabs agendaId={agendaId}
      pages={ordered} onNavigate={navigateTo} left={decoration.tabLeft} top={decoration.tabTop} />}
    <nav className="workspace-page-turner" aria-label="Virar páginas">
      <button type="button" aria-label="Página anterior" disabled={index <= 0} onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
      <span>{index >= 0 ? `${index + 1}${mode === 'spread' && companion ? `–${index + 2}` : ''} / ${ordered.length}` : 'Carregando…'}</span>
      <button type="button" aria-label="Próxima página" disabled={index < 0 || index >= ordered.length - 1} onClick={() => navigate(1)}><ChevronRight size={18} /></button>
      <select aria-label="Zoom do papel" value={zoom} onChange={event => setZoom(event.target.value)}>
        <option value="fit">Ajustar à tela</option><option value="0.75">75%</option>
        <option value="1">100%</option><option value="1.25">125%</option>
      </select>
    </nav>
  </div>
}
