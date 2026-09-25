import { useMemo, useState } from 'react'
import type { ReusableSticker } from './stickerTypes'

export default function StickerPicker({
  stickers,
  loading,
  selectedId,
  onSelect,
}: {
  stickers: ReusableSticker[]
  loading?: boolean
  selectedId?: number | null
  onSelect?: (sticker: ReusableSticker) => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const categories = useMemo(
    () => ['Todas', ...Array.from(new Set(stickers.map(sticker => sticker.category))).sort(),],
    [stickers],
  )
  const visible = stickers.filter(sticker => {
    const matchesCategory = category === 'Todas' || sticker.category === category
    const normalized = query.trim().toLocaleLowerCase('pt-BR')
    return matchesCategory && (!normalized || `${sticker.name} ${sticker.category}`.toLocaleLowerCase('pt-BR').includes(normalized))
  })

  return <div className="sticker-picker" aria-label="Biblioteca de stickers">
    <div className="sticker-picker-tools">
      <label>
        <span>Buscar stickers</span>
        <input type="search" value={query} placeholder="Ex.: flores" onChange={event => setQuery(event.target.value)} />
      </label>
      <label>
        <span>Categoria</span>
        <select value={category} onChange={event => setCategory(event.target.value)}>
          {categories.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </div>
    {loading && <p className="sticker-picker-state">Carregando sua coleção...</p>}
    {!loading && stickers.length === 0 && <p className="sticker-picker-state">Nenhum sticker salvo ainda. Adicione um sticker pelo Editor para reutilizá-lo aqui.</p>}
    {!loading && stickers.length > 0 && visible.length === 0 && <p className="sticker-picker-state">Nenhum sticker combina com essa busca.</p>}
    <div className="sticker-picker-grid">
      {visible.map(sticker => <button
        type="button"
        key={sticker.id}
        className={sticker.id === selectedId ? 'sticker-picker-item is-selected' : 'sticker-picker-item'}
        aria-pressed={sticker.id === selectedId}
        title={`${sticker.name} · ${sticker.category}`}
        onClick={() => onSelect?.(sticker)}
      >
        <span className="sticker-picker-image"><img src={sticker.imageUrl} alt="" /></span>
        <strong>{sticker.name}</strong>
        <small>{sticker.category}</small>
        {sticker.id === selectedId && <i aria-hidden="true">Selecionado</i>}
      </button>)}
    </div>
  </div>
}
