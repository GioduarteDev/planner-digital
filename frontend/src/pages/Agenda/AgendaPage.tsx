import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, File, ChevronLeft, ChevronRight, Eye, Moon, Sun } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../services/api'
import PageEditor from './PageEditor'
import { BindingRings } from './BindingRings'
import { PageTabs } from './PageTabs'
import type { PlannerPage } from './editorModel'
import './EditorWorkspace.css'
import './PlannerDetails.css'

type AgendaWorkspaceResponse = {
  settings: Record<string, unknown>
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function currentWeekStart() {
  const today = new Date()
  today.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return localDateKey(today)
}

function isMondayDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  return !Number.isNaN(date.getTime()) && localDateKey(date) === value && date.getDay() === 1
}

export default function AgendaPage() {
  const { id } = useParams()
  const [, setSearchParams] = useSearchParams()
  const agendaId = Number(id)
  const [mode, setMode] = useState<'single' | 'spread'>('single')
  const [previewMode, setPreviewMode] = useState(false)
  const [focused, setFocused] = useState<'first' | 'second'>('first')
  const [hasOpenedSpread, setHasOpenedSpread] = useState(false)
  const [zoom, setZoom] = useState('fit')
  const [compactScreen, setCompactScreen] = useState(() => window.matchMedia('(max-width: 1023px)').matches)
  const [context, setContext] = useState<{ id: number; pages: PlannerPage[] } | null>(null)
  const [firstPage, setFirstPage] = useState<number>()
  const [agendaTheme, setAgendaTheme] = useState<'light' | 'dark'>('light')
  const [weeklyStart, setWeeklyStart] = useState(currentWeekStart)
  const [settingsLoading, setSettingsLoading] = useState(() => Number.isInteger(agendaId))
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const bookRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const [decoration, setDecoration] = useState<{
    tabLeft: number; tabTop: number; ringLeft: number; ringTop: number; ringHeight: number
  } | null>(null)
  const [availableWidth, setAvailableWidth] = useState(900)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)')
    const update = () => setCompactScreen(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!Number.isInteger(agendaId)) {
      return
    }

    let cancelled = false
    apiRequest<AgendaWorkspaceResponse>(`/agendas/${agendaId}`).then(({ settings }) => {
      if (cancelled) return
      setAgendaTheme(settings.editor_theme === 'dark' ? 'dark' : 'light')
      if (isMondayDate(settings.weekly_open_journal_week)) {
        setWeeklyStart(settings.weekly_open_journal_week)
      }
    }).catch(error => {
      if (!cancelled) setSettingsError(error instanceof Error ? error.message : 'Não foi possível carregar as preferências da Agenda.')
    }).finally(() => {
      if (!cancelled) setSettingsLoading(false)
    })

    return () => { cancelled = true }
  }, [agendaId])

  const saveAgendaSetting = useCallback(async (key: 'editor_theme' | 'weekly_open_journal_week', value: string) => {
    if (settingsSaving) throw new Error('Aguarde a conclusão da gravação das preferências.')
    setSettingsSaving(true)
    setSettingsError('')
    try {
      await apiRequest<AgendaWorkspaceResponse>(`/agendas/${agendaId}`, {
        method: 'PATCH',
        body: JSON.stringify({ settings: { [key]: value } }),
      })
      if (key === 'editor_theme' && (value === 'light' || value === 'dark')) {
        setAgendaTheme(value)
      } else if (key === 'weekly_open_journal_week' && isMondayDate(value)) {
        setWeeklyStart(value)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar as preferências da Agenda.'
      setSettingsError(message)
      throw error
    } finally {
      setSettingsSaving(false)
    }
  }, [agendaId, settingsSaving])
  const changeWeeklyStart = useCallback(
    (value: string) => saveAgendaSetting('weekly_open_journal_week', value),
    [saveAgendaSetting],
  )
  useEffect(() => {
    const node = bookRef.current
    if (!node) return
    const observer = new ResizeObserver(entries => setAvailableWidth(entries[0].contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const scale = zoom === 'fit'
    ? Math.min(1, Math.max(.3, (availableWidth - 20) / (mode === 'spread' && !compactScreen ? 1784 : 886)))
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
  return <div className={`editor-workspace-v6 mode-${mode}${compactScreen ? ' is-compact' : ''}${previewMode ? ' is-preview' : ''}`} data-agenda-theme={agendaTheme} ref={workspaceRef}>
    <header className="workspace-view-controls">
      <div><span className="workspace-eyebrow">AGENDA · CADERNO DIGITAL</span><h1>Seu caderno</h1></div>
      <div className="workspace-mode-switch" role="group" aria-label="Visualização e tema da Agenda">
        <button type="button" aria-pressed={mode === 'single'} onClick={() => { setMode('single'); setFocused('first') }}><File size={16} /> Folha única</button>
        <button type="button" aria-pressed={mode === 'spread'} onClick={() => { setHasOpenedSpread(true); setMode('spread') }}><BookOpen size={16} /> Agenda aberta</button>
        <button type="button" aria-pressed={agendaTheme === 'dark'} aria-label={`Ativar tema ${agendaTheme === 'dark' ? 'claro' : 'escuro'}`} disabled={settingsLoading || settingsSaving} onClick={() => { void saveAgendaSetting('editor_theme', agendaTheme === 'dark' ? 'light' : 'dark').catch(() => undefined) }}>
          {agendaTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}{agendaTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>
      </div>
    </header>
    {previewMode && <button className="preview-exit-button" type="button" aria-label="Sair da visualização" onClick={() => setPreviewMode(false)}>
      <Eye size={16} aria-hidden="true" /> Sair da visualização
    </button>}
    {settingsError && <p className="workspace-settings-error" role="alert">{settingsError}</p>}
    <div className="workspace-book-stage">
      <button className="book-page-arrow book-page-arrow-previous" type="button" aria-label="Página anterior" disabled={index <= 0} onClick={() => navigate(-1)}><ChevronLeft size={20} aria-hidden="true" /></button>
      <div className="workspace-book" ref={bookRef}>
        <PageEditor scale={scale} initialPageId={firstPage} focused={focused === 'first'} agendaTheme={agendaTheme} weeklyStart={weeklyStart} onWeeklyWeekChange={changeWeeklyStart} previewMode={previewMode} onExitPreview={() => setPreviewMode(false)} onTogglePreview={() => setPreviewMode(current => !current)} onFocus={() => setFocused('first')} onPageChange={updateContext} onPreferredMode={nextMode => { setHasOpenedSpread(nextMode === 'spread' || hasOpenedSpread); setMode(nextMode) }} />
        {hasOpenedSpread && companion && <div className="workspace-companion" hidden={mode !== 'spread'}>
          <PageEditor scale={scale} key={companion.id} initialPageId={companion.id} focused={focused === 'second'} agendaTheme={agendaTheme} weeklyStart={weeklyStart} onWeeklyWeekChange={changeWeeklyStart}
            previewMode={previewMode} onExitPreview={() => setPreviewMode(false)} onTogglePreview={() => setPreviewMode(current => !current)}
            onFocus={() => setFocused('second')} onNavigate={navigateTo} onPageChange={updateCompanion} onPreferredMode={nextMode => { setHasOpenedSpread(nextMode === 'spread' || hasOpenedSpread); setMode(nextMode) }} />
        </div>}
        {mode === 'spread' && !companion && <div className="book-end"><BookOpen size={28} /><p>Você chegou ao fim da agenda.</p><span>Crie outra página pelo índice.</span></div>}
      </div>
      <button className="book-page-arrow book-page-arrow-next" type="button" aria-label="Próxima página" disabled={index < 0 || index >= ordered.length - 1} onClick={() => navigate(1)}><ChevronRight size={20} aria-hidden="true" /></button>
    </div>
    {mode === 'spread' && companion && decoration && <BindingRings left={decoration.ringLeft}
      top={decoration.ringTop} height={decoration.ringHeight} scale={scale} />}
    {decoration && Number.isFinite(agendaId) && <PageTabs key={previewMode ? 'preview' : 'edit'} agendaId={agendaId}
      pages={ordered} onNavigate={navigateTo} left={decoration.tabLeft} top={decoration.tabTop} previewMode={previewMode} />}
    <nav className="workspace-page-turner" aria-label="Virar páginas">
      <span>{index >= 0 ? `${index + 1}${mode === 'spread' && companion ? `–${index + 2}` : ''} / ${ordered.length}` : 'Carregando…'}</span>
      <select aria-label="Zoom do papel" value={zoom} onChange={event => setZoom(event.target.value)}>
        <option value="fit">Ajustar à tela</option><option value="0.75">75%</option>
        <option value="1">100%</option><option value="1.25">125%</option>
      </select>
    </nav>
  </div>
}
