import { useRef, useState } from 'react'
import { TornPaperArt } from './TornPaperArt'
import { TORN_PAPER_COLLECTIONS, TORN_PAPER_FORMATS, type TornPaperCollection, type TornPaperFormat } from './tornPaperCatalog'
import './TornPapers.css'

export function TornPapersPanel({ onInsert, onBack }: {
  onInsert: (format: TornPaperFormat, collection: TornPaperCollection) => Promise<boolean>
  onBack: () => void
}) {
  const [collectionId, setCollectionId] = useState<string>(TORN_PAPER_COLLECTIONS[0].id)
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const [status, setStatus] = useState('')
  const collection = TORN_PAPER_COLLECTIONS.find(item => item.id === collectionId) ?? TORN_PAPER_COLLECTIONS[0]
  async function insert(format: TornPaperFormat) {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setStatus('')
    try {
      const inserted = await onInsert(format, collection)
      setStatus(inserted ? `${format.name} · ${collection.name} inserido.` : 'Não foi possível inserir o papel. Tente novamente.')
    } catch {
      setStatus('Não foi possível inserir o papel. Tente novamente.')
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return <section className="torn-papers-library" aria-label="Papéis Rasgados" aria-busy={pending}>
    <button type="button" className="element-library-back" onClick={onBack}>‹ Elementos</button>
    <header><span className="torn-papers-eyebrow">RECORTES DA PAPERIE</span><h4>Papéis Rasgados</h4><p>Texturas de papel, bordas imperfeitas e pequenos achados para a sua página.</p></header>
    <label className="torn-papers-select">Sua coleção
      <select aria-label="Coleção de papéis rasgados" value={collection.id} onChange={event => setCollectionId(event.target.value)}>
        {TORN_PAPER_COLLECTIONS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
    <div className="torn-papers-gallery">
      {TORN_PAPER_FORMATS.map(format => <button type="button" key={format.id} className="torn-paper-card"
        data-torn-format={format.id} data-torn-collection={collection.id} disabled={pending}
        aria-label={`Inserir ${format.name} · ${collection.name}`} onClick={() => void insert(format)}>
        <span className="torn-paper-thumbnail"><TornPaperArt format={format} collection={collection} preview /></span>
        <span>{format.name}</span>
      </button>)}
    </div>
    <p className="torn-papers-hint">Insira um recorte e use os controles da folha para compor suas camadas.</p>
    <p className="torn-papers-status" role="status" aria-live="polite">{pending ? 'Separando seu papel…' : status}</p>
  </section>
}
