import { useRef, useState } from 'react'
import { ScrapbookArt } from './ScrapbookArt'
import { SCRAPBOOK_MATERIALS, SCRAPBOOK_PALETTES, type ScrapbookMaterial, type ScrapbookPalette } from './scrapbookCatalog'
import './Scrapbook.css'

export function ScrapbookPanel({ onInsert, onBack }: {
  onInsert: (material: ScrapbookMaterial, palette: ScrapbookPalette) => Promise<boolean>
  onBack: () => void
}) {
  const [paletteId, setPaletteId] = useState<string>('cream')
  const [category, setCategory] = useState('Todos')
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState('')
  const busy = useRef(false)
  const palette = SCRAPBOOK_PALETTES.find(item => item.id === paletteId) ?? SCRAPBOOK_PALETTES[0]
  const materials = SCRAPBOOK_MATERIALS.filter(item => category === 'Todos' || item.category === category)
  async function insert(material: ScrapbookMaterial) {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setStatus('')
    try {
      const ok = await onInsert(material, palette)
      setStatus(ok ? `${material.name} inserido.` : 'Não foi possível inserir o recorte. Tente novamente.')
    } catch { setStatus('Não foi possível inserir o recorte. Tente novamente.') }
    finally { busy.current = false; setPending(false) }
  }
  return <section className="scrapbook-library" aria-label="Recortes & Colagens" aria-busy={pending}>
    <button type="button" className="element-library-back" onClick={onBack}>‹ Elementos</button>
    <header><small>ACHADOS DA PAPERIE</small><h4>Recortes &amp; Colagens</h4><p>Pequenas memórias em papel, metal e transparências.</p></header>
    <label>Paleta do recorte<select aria-label="Paleta dos recortes" value={palette.id} onChange={event => setPaletteId(event.target.value)}>
      {SCRAPBOOK_PALETTES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    <div className="scrapbook-filters" role="group" aria-label="Categorias de recortes">
      {['Todos', 'Molduras', 'Papéis', 'Detalhes'].map(name => <button type="button" key={name} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}
    </div>
    <div className="scrapbook-gallery">{materials.map(material => <button type="button" key={material.id} className="scrapbook-card"
      data-scrapbook-insert={material.id} disabled={pending} aria-label={`Inserir ${material.name} · ${palette.name}`} onClick={() => void insert(material)}>
      <span className="scrapbook-thumbnail"><ScrapbookArt material={material} palette={palette} preview /></span><span>{material.name}</span>
    </button>)}</div>
    <p className="scrapbook-hint">Para emoldurar, insira sua imagem em Fotos e ajuste a moldura por cima. Foto e moldura são peças independentes; o arquivo original é preservado. O centro aberto permite selecionar a foto.</p>
    <p role="status" aria-live="polite" className="scrapbook-status">{pending ? 'Separando seu recorte…' : status}</p>
  </section>
}
