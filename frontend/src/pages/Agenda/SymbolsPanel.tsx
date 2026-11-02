import { useEffect, useRef, useState } from 'react'
import { Copy, Eye, Heart, X } from 'lucide-react'
import { PaperieSymbol } from './PaperieSymbol'
import './SymbolsPanel.css'
import {
  filterSymbolsByCategory,
  getSymbolCardLayout,
  searchSymbols,
  SYMBOL_CATEGORIES,
  SYMBOL_CATALOG,
  type SymbolCategoryFilter,
  type SymbolDefinition,
} from './symbolCatalog'

export type SymbolInsertMode = 'text' | 'decorative'

export function SymbolsPanel({ onInsert, favoriteIds, favoritesReady, favoritesSaving, favoritesError, onToggleFavorite, onBack }: {
  onInsert: (symbol: SymbolDefinition, mode: SymbolInsertMode) => Promise<boolean>
  favoriteIds: readonly string[]
  favoritesReady: boolean
  favoritesSaving: boolean
  favoritesError: string
  onToggleFavorite: (symbolId: string) => void
  onBack: () => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<SymbolCategoryFilter>('all')
  const [mode, setMode] = useState<SymbolInsertMode>('decorative')
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null)
  const [pendingSymbolId, setPendingSymbolId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [preview, setPreview] = useState<SymbolDefinition | null>(null)
  const [manualCopy, setManualCopy] = useState<string | null>(null)
  const manualCopyRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (manualCopy !== null) manualCopyRef.current?.focus() }, [manualCopy])
  const previewRef = useRef<HTMLElement>(null)
  useEffect(() => { if (preview) previewRef.current?.focus() }, [preview])
  const inserting = useRef(false)
  const previewTrigger = useRef<HTMLButtonElement | null>(null)
  const favoriteIdSet = new Set(favoriteIds)

  const categorySymbols = filterSymbolsByCategory(
    SYMBOL_CATALOG,
    category,
    favoriteIds,
  )
  const visibleSymbols = searchSymbols(query, categorySymbols)
  const categories: { id: SymbolCategoryFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    ...SYMBOL_CATEGORIES,
  ]

  async function insertSymbol(symbol: SymbolDefinition) {
    if (inserting.current) return
    inserting.current = true
    setPendingSymbolId(symbol.id)
    setStatus('')
    try {
      const inserted = await onInsert(symbol, mode)
      if (inserted) {
        setSelectedSymbolId(symbol.id)
        setStatus(`“${symbol.name}” inserido como ${mode === 'text' ? 'texto' : 'decorativo'}.`)
      } else {
        setStatus('Não foi possível inserir este símbolo. Verifique o aviso do editor.')
      }
    } catch {
      setStatus('Não foi possível inserir este detalhe. Tente novamente.')
    } finally {
      inserting.current = false
      setPendingSymbolId(null)
    }
  }

  async function copySymbol(symbol: SymbolDefinition) {
    setManualCopy(null)
    try {
      await navigator.clipboard.writeText(symbol.value)
      setStatus(`“${symbol.name}” copiado.`)
    } catch {
      setManualCopy(symbol.value)
      setStatus('Selecione e copie o detalhe no campo abaixo com Ctrl+C ou ⌘C.')
    }
  }

  function closePreview() {
    setPreview(null)
    previewTrigger.current?.focus()
  }

  return (
    <section className="symbol-library" aria-label="Símbolos & Charminhos">
      <button
        type="button"
        className="element-library-back"
        onClick={onBack}
      >
        ‹ Elementos
      </button>

      <header className="symbol-library-heading">
        <span aria-hidden="true">✧</span>
        <div>
          <h4>Símbolos &amp; Charminhos</h4>
          <p>Pequenos detalhes para deixar sua página com a sua cara.</p>
        </div>
      </header>

      <div className="symbol-insert-mode" role="group" aria-label="Modo de inserção">
        <button
          type="button"
          data-symbol-mode="text"
          aria-pressed={mode === 'text'}
          onClick={() => setMode('text')}
        >
          Texto
        </button>
        <button
          type="button"
          data-symbol-mode="decorative"
          aria-pressed={mode === 'decorative'}
          onClick={() => setMode('decorative')}
        >
          Decorativo
        </button>
      </div>
      <p className="symbol-mode-hint">
        {mode === 'text'
          ? 'Será criado um novo elemento de texto editável.'
          : 'Será criado um carimbo decorativo que você pode mover e redimensionar.'}
      </p>

      <label className="symbol-search">
        <span>Buscar na coleção</span>
        <input
          type="search"
          aria-label="Buscar símbolos"
          placeholder="Nome ou palavra-chave"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </label>

      <nav className="symbol-category-list" aria-label="Categorias de símbolos">
        {categories.map(item => (
          <button
            key={item.id}
            type="button"
            data-symbol-category={item.id}
            className={category === item.id ? 'is-active' : ''}
            aria-pressed={category === item.id}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="symbol-gallery-heading">
        <span>{category === 'favorites' ? 'Seus favoritos' : 'A coleção'}</span>
        <small>{visibleSymbols.length} {visibleSymbols.length === 1 ? 'detalhe' : 'detalhes'}</small>
      </div>

      {preview && <section ref={previewRef} tabIndex={-1} id="symbol-detail-preview" className="symbol-detail-preview" aria-label={`Prévia de ${preview.name}`}>
        <div className="symbol-preview-heading"><strong>{preview.name}</strong><button type="button" aria-label="Fechar prévia" onClick={closePreview}><X size={15} /></button></div>
        <div className="symbol-preview-art"><PaperieSymbol value={preview.value} name={preview.name} color="var(--paperie-matcha)" className="symbol-preview-glyph" /></div>
        <div className="symbol-preview-actions"><button type="button" disabled={pendingSymbolId !== null} onClick={() => void insertSymbol(preview)}>Inserir como {mode === 'text' ? 'texto' : 'decorativo'}</button><button type="button" onClick={() => void copySymbol(preview)}><Copy size={13} aria-hidden="true" /> Copiar</button></div>
      </section>}
      {manualCopy !== null && <label className="symbol-manual-copy">Copiar manualmente<textarea ref={manualCopyRef} aria-label="Símbolo para copiar" readOnly value={manualCopy} onFocus={event => event.currentTarget.select()} /></label>}

      {visibleSymbols.length > 0 ? (
        <div className="symbol-gallery" aria-label="Símbolos disponíveis">
          {visibleSymbols.map(symbol => {
            const layout = getSymbolCardLayout(symbol)
            const isFavorite = favoriteIdSet.has(symbol.id)
            const isSelected = selectedSymbolId === symbol.id
            return (
              <article
                key={symbol.id}
                className={`symbol-card symbol-card-${layout}${isSelected ? ' is-selected' : ''}`}
                data-symbol-id={symbol.id}
                data-symbol-layout={layout}
              >
                <button
                  type="button"
                  className="symbol-card-insert"
                  aria-label={`Inserir ${symbol.name} como ${mode === 'text' ? 'texto' : 'decorativo'}`}
                  aria-pressed={isSelected}
                  disabled={pendingSymbolId !== null}
                  onClick={() => void insertSymbol(symbol)}
                >
                  <span className="symbol-card-value">
                    <PaperieSymbol value={symbol.value} name={symbol.name} color="var(--paperie-matcha)" className="symbol-preview-glyph" />
                  </span>
                  <span className="symbol-card-name">{symbol.name}</span>
                </button>

                <button
                  type="button"
                  className={`symbol-favorite-button${isFavorite ? ' is-favorite' : ''}`}
                  aria-label={`${isFavorite ? 'Remover' : 'Adicionar'} ${symbol.name} ${isFavorite ? 'dos' : 'aos'} favoritos`}
                  aria-pressed={isFavorite}
                  disabled={!favoritesReady}
                  onClick={() => onToggleFavorite(symbol.id)}
                >
                  <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
                </button>
                <div className="symbol-card-actions">
                  <button type="button" aria-label={`Prévia de ${symbol.name}`} aria-expanded={preview?.id === symbol.id} aria-controls="symbol-detail-preview" onClick={event => { previewTrigger.current = event.currentTarget; setPreview(symbol) }}><Eye size={13} aria-hidden="true" /></button>
                  <button type="button" aria-label={`Copiar ${symbol.name}`} onClick={() => void copySymbol(symbol)}><Copy size={13} aria-hidden="true" /></button>
                </div>
                {pendingSymbolId === symbol.id && <span className="symbol-card-pending" aria-hidden="true">…</span>}
              </article>
            )
          })}
        </div>
      ) : (
        <p className="symbol-empty-state">
          {category === 'favorites' && favoriteIds.length === 0
            ? 'Toque no coração de um detalhe para guardá-lo aqui.'
            : 'Nenhum detalhe encontrado. Experimente outra busca ou categoria.'}
        </p>
      )}
      {favoritesError && <p role="alert" className="symbol-favorites-error">{favoritesError}</p>}
      <p className="symbol-favorites-status" role="status" aria-live="polite">
        {!favoritesReady ? 'Favoritos indisponíveis até carregar as preferências.' : favoritesSaving ? 'Salvando favoritos…' : favoritesError ? 'Favoritos não salvos.' : 'Favoritos salvos.'}
      </p>
      <p className="symbol-insert-status" role="status" aria-live="polite">{status}</p>
    </section>
  )
}
