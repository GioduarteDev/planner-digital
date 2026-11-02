import { useRef, useState } from 'react'
import { WASHI_OPTIONS } from './editorCatalog'
import { LegacyWashi } from './LegacyWashi'
import { WashiArt } from './WashiArt'
import { WASHI_CATALOG, WASHI_CATEGORIES, WASHI_EDGES, WASHI_PALETTES, WASHI_WIDTHS, type WashiDesign, type WashiEdge } from './washiCatalog'

export type WashiInsertOptions = { edge: WashiEdge; height: number; paper: string; opacity: number }
export function WashiPanel({ onInsert, onLegacyInsert, onBack }: {
  onInsert: (design: WashiDesign, options: WashiInsertOptions) => Promise<boolean>
  onLegacyInsert: (id: string) => Promise<void>
  onBack: () => void
}) {
  const [category, setCategory] = useState('all')
  const [edge, setEdge] = useState<WashiEdge | 'original'>('original')
  const [height, setHeight] = useState<number>(54)
  const [paperId, setPaperId] = useState('original')
  const [opacity, setOpacity] = useState(.9)
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const [status, setStatus] = useState('')
  const visible = WASHI_CATALOG.filter(item => category === 'all' || item.category === category)
  const showLegacy = category === 'all' || category === 'legacy'
  const options = (design: WashiDesign): WashiInsertOptions => ({
    edge: edge === 'original' ? design.edge : edge, height, opacity,
    paper: WASHI_PALETTES.find(item => item.id === paperId)?.paper ?? design.paper,
  })
  async function insert(design: WashiDesign) {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setStatus('')
    try {
      const created = await onInsert(design, options(design))
      setStatus(created ? `${design.name} inserida.` : 'Não foi possível inserir a fita. Tente novamente.')
    } catch {
      setStatus('Não foi possível inserir a fita. Tente novamente.')
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return <section className="washi-library" aria-label="Coleção de washi tapes" aria-busy={pending}>
    <button type="button" className="element-library-back" onClick={onBack}>‹ Elementos</button>
    <header><span className="washi-eyebrow">PEQUENOS ROLOS, MUITAS HISTÓRIAS</span><h4>Washi tapes</h4><p>Uma gaveta de fitas para colar lembranças e emoldurar seus dias.</p></header>
    <nav className="washi-categories" aria-label="Categorias de washi">
      {[{ id: 'all', name: 'Todas' }, ...WASHI_CATEGORIES, { id: 'legacy', name: 'Originais' }].map(item => <button type="button" key={item.id}
        data-washi-category={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.name}</button>)}
    </nav>
    {category !== 'legacy' && <fieldset className="washi-options"><legend>Do seu jeito</legend>
      <label>Acabamento<select aria-label="Acabamento da washi" value={edge} onChange={event => setEdge(event.target.value as WashiEdge | 'original')}>
        <option value="original">Da coleção</option>{WASHI_EDGES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label>Largura<select aria-label="Largura da washi" value={height} onChange={event => setHeight(Number(event.target.value))}>
        {WASHI_WIDTHS.map(item => <option key={item.height} value={item.height}>{item.name}</option>)}
      </select></label>
      <label>Cor do papel<select aria-label="Cor do papel da washi" value={paperId} onChange={event => setPaperId(event.target.value)}>
        <option value="original">Da coleção</option>{WASHI_PALETTES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label>Transparência · {Math.round((1 - opacity) * 100)}%<input aria-label="Transparência da washi" type="range" min="0" max="80" step="5" value={Math.round((1 - opacity) * 100)} onChange={event => setOpacity(1 - Number(event.target.value) / 100)} /></label>
    </fieldset>}
    {visible.length > 0 && <>
      <p className="washi-count">{visible.length} fitas da Paperie</p>
      <div className="washi-gallery element-library-grid">
        {visible.map(design => <button type="button" className="washi-card" key={design.id} data-washi-id={design.id}
          aria-label={`Inserir ${design.name}`} disabled={pending} onClick={() => void insert(design)}>
          <span className="washi-tray"><WashiArt design={design} {...options(design)} preview /></span><span>{design.name}</span>
        </button>)}
      </div>
    </>}
    {showLegacy && <>
      <div className="washi-original-heading"><h5>As originais</h5><p>Suas {WASHI_OPTIONS.length} fitas de sempre, com os acabamentos e cores originais.</p></div>
      <div className="washi-gallery element-library-grid color-element-grid">
        {WASHI_OPTIONS.map(([id, color, name]) => <button type="button" className="washi-card" data-legacy-washi={id} key={id}
          aria-label={`Inserir washi original ${name}`} disabled={pending} onClick={() => void onLegacyInsert(id)}>
          <span className="washi-tray"><span className="washi-legacy-thumbnail"><LegacyWashi pattern={id} color={color} /></span></span><span>{name}</span>
        </button>)}
      </div>
    </>}
    <p className="washi-status" role="status" aria-live="polite">{pending ? 'Preparando sua fita…' : status}</p>
  </section>
}
