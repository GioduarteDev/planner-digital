import { useState } from 'react'
import { AGENDA_FONTS, TEXT_FONT_CATEGORIES, type AgendaTextStyle } from './agendaTypography'
import './AgendaTypography.css'

export function AgendaTextControls({ style, hasTarget, locked, richText, onChange, onNewText, onResume, onEnableRichText }: {
  style: AgendaTextStyle; hasTarget: boolean; locked: boolean; richText: boolean
  onChange: (patch: Partial<AgendaTextStyle>) => void; onNewText: () => void; onResume: () => void; onEnableRichText: () => void
}) {
  const [category, setCategory] = useState<string>('Todas')
  const [sizeDraft, setSizeDraft] = useState<string | null>(null)
  const knownFont = AGENDA_FONTS.find(font => font.family === style.fontFamily)
  return <section className="agenda-text-controls" aria-label="Estilo da escrita">
    <header><span className="agenda-writing-eyebrow">ESCRITA DA PAPERIE</span><h4>Palavras com a sua cara</h4>
      <p>{hasTarget ? 'Alterando somente o texto selecionado.' : 'Escolha o estilo e clique na folha para escrever.'}</p></header>
    <div className="agenda-writing-target">
      {hasTarget ? <><button type="button" aria-label="Voltar a escrever" onClick={onResume}>Voltar a escrever</button><button type="button" onClick={onNewText}>Estilo para novos textos</button></> : <span>Para editar um texto existente, clique nele e abra Texto.</span>}
    </div>
    {hasTarget && !richText && <button type="button" className="agenda-enable-rich-text" disabled={locked} onClick={onEnableRichText}>Ativar edição rica neste texto</button>}
    {locked && <p role="status">Desbloqueie este texto para alterar seu estilo.</p>}
    <fieldset disabled={locked} className="agenda-writing-fieldset"><legend>Família da fonte</legend>
      <nav className="agenda-font-categories" aria-label="Categorias de fontes">
        {['Todas', ...TEXT_FONT_CATEGORIES].map(item => <button type="button" data-font-category={item} key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
      </nav>
      {!knownFont && <p className="agenda-current-font">Fonte atual preservada{style.fontFamily ? `: ${style.fontFamily.split(',')[0].replaceAll('"', '')}` : ' · herdada da página'}.</p>}
      <div className="agenda-font-gallery">
        {AGENDA_FONTS.filter(font => category === 'Todas' || font.category === category).map(font => <button type="button" data-font-id={font.id} className="agenda-font-card" key={font.id}
          aria-label={`Usar fonte ${font.name}`} aria-pressed={font.family === style.fontFamily} onClick={() => onChange({ fontFamily: font.family })}>
          <span className="agenda-font-name">{font.name}</span><span className="agenda-font-sample" style={{ fontFamily: font.family }}>Dias de chá &amp; sonhos</span>
        </button>)}
      </div>
    </fieldset>
    <fieldset className="agenda-writing-fieldset agenda-writing-properties" disabled={locked}><legend>Detalhes da escrita</legend>
      <label>Tamanho<input type="number" aria-label="Tamanho da fonte" min="8" max="144" step="1" value={sizeDraft ?? style.fontSize}
        onChange={event => { setSizeDraft(event.target.value); if (event.target.value) onChange({ fontSize: Number(event.target.value) }) }} onBlur={() => setSizeDraft(null)} /></label>
      <label>Cor<input type="color" aria-label="Cor do texto" value={/^#[a-f0-9]{6}$/i.test(style.color) ? style.color : '#403a35'} onChange={event => onChange({ color: event.target.value })} /></label>
      <div className="agenda-writing-buttons" role="group" aria-label="Ênfase">
        <button type="button" aria-label="Negrito" aria-pressed={style.fontWeight === 'bold'} onClick={() => onChange({ fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold' })}><b>B</b></button>
        <button type="button" aria-label="Itálico" aria-pressed={style.fontStyle === 'italic'} onClick={() => onChange({ fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' })}><i>I</i></button>
      </div>
      <label>Entrelinhas<select aria-label="Espaçamento entre linhas" value={style.lineHeight} onChange={event => onChange({ lineHeight: Number(event.target.value) })}>
        {[...new Set([1, 1.25, 1.5, 1.55, 1.75, 2, 2.5, 3, style.lineHeight])].sort((a, b) => a - b).map(value => <option key={value} value={value}>{value.toLocaleString('pt-BR')}</option>)}
      </select></label>
      <div className="agenda-writing-buttons agenda-writing-align" role="group" aria-label="Alinhamento">
        {([['left', 'À esquerda'], ['center', 'Centralizado'], ['right', 'À direita']] as const).map(([value, label]) => <button type="button" key={value} aria-label={label} aria-pressed={style.textAlign === value} onClick={() => onChange({ textAlign: value })}>{label}</button>)}
      </div>
    </fieldset>
    <div className="agenda-writing-preview" aria-label="Prévia da escrita" style={{ ...style, fontFamily: style.fontFamily || undefined }}>Meu pequeno dia{ '\n' }Ação, carinho e café ♡ 🍵</div>
  </section>
}
