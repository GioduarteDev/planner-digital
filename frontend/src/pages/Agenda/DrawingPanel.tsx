import type { DrawingTool } from './editorModel'
import { PEN_COLORS, HIGHLIGHTER_PRESETS } from './editorCatalog'
import type { Stabilization } from './drawingProcessing'
import './DrawingPanel.css'

const instruments = [
  { tool: 'pencil', label: 'Lápis', width: 2, opacity: 0.7 },
  { tool: 'fineliner', label: 'Caneta fina', width: 3, opacity: 1 },
  { tool: 'fountain', label: 'Tinteiro', width: 5, opacity: 0.96 },
  { tool: 'brush', label: 'Brush Pen', width: 8, opacity: 0.92 },
  { tool: 'highlighter', label: 'Marca-texto', width: 18, opacity: 0.42 },
  { tool: 'eraser', label: 'Borracha', width: 24, opacity: 1 },
] as const

function InstrumentArt({ tool }: { tool: DrawingTool }) {
  return <svg viewBox="0 0 80 60" aria-hidden="true" className={`ink-instrument ink-${tool}`}>
    <g transform="rotate(33 40 30)" stroke="var(--editor-ink)" strokeWidth="1.2" strokeLinejoin="round">
      {tool === 'eraser' ? <><rect x="26" y="9" width="28" height="43" rx="7" fill="var(--ballet-slipper)" /><path d="M26 25h28v20q0 7-7 7H33q-7 0-7-7Z" fill="var(--latte)" /><path d="M30 30h20M30 34h20" opacity=".25" /></>
        : <><rect x="33" y="4" width="14" height="35" rx="3" fill={tool === 'pencil' ? 'var(--butter-yellow)' : tool === 'highlighter' ? 'var(--matcha)' : tool === 'fountain' ? 'var(--wisteria)' : 'var(--attic-window)'} />
          <path d="M37 8v26" stroke="var(--editor-surface)" opacity=".7" strokeWidth="2" />
          {tool === 'fountain' ? <><path d="m33 39 7 16 7-16-7-4Z" fill="var(--butter-yellow)" /><path d="M40 42v13" /><circle cx="40" cy="42" r="1.5" /></>
            : tool === 'highlighter' ? <><path d="M33 39h14v7l-14 6Z" fill="var(--butter-yellow)" /><path d="m33 49 14-6v3l-14 6Z" fill="var(--editor-ink)" /></>
              : <><path d="m33 39 7 16 7-16Z" fill="var(--latte)" /><path d="m38 50 2 5 2-5Z" fill="var(--editor-ink)" /></>}
          <path d="M33 12h14M33 36h14" opacity=".4" />{tool !== 'pencil' && <path d="M47 7h4v18" fill="none" />}</>}
    </g>
  </svg>
}

export function DrawingPanel({ tool, color, width, opacity, stabilization, holdShapes, onTool, onColor, onWidth, onOpacity, onStabilization, onHoldShapes, children }: {
  tool: DrawingTool | null; color: string; width: number; opacity: number; stabilization: Stabilization; holdShapes: boolean
  onTool: (tool: DrawingTool, width: number, opacity: number) => void
  onColor: (color: string) => void; onWidth: (width: number) => void; onOpacity: (opacity: number) => void
  onStabilization: (level: Stabilization) => void; onHoldShapes: (value: boolean) => void; children: React.ReactNode
}) {
  const erasing = tool === 'eraser'
  const widths = erasing ? [10, 24, 38, 54] : tool === 'highlighter' ? [8, 14, 18, 24] : [2, 3, 5, 8]
  return <div className="drawing-panel tool-panel-stack">
    <p className="drawing-intro">Um pequeno ateliê para suas ideias.</p>
    <div className="drawing-instruments" role="group" aria-label="Instrumentos de desenho">
      {instruments.map(item => <button type="button" key={item.tool} aria-pressed={tool === item.tool} onClick={() => onTool(item.tool, item.width, item.opacity)}>
        <InstrumentArt tool={item.tool} /><span>{item.label}</span>
      </button>)}
    </div>
    {erasing ? <p className="tool-helper-note">A borracha remove o traço inteiro que você tocar, incluindo marca-texto.</p> : <>
      <fieldset><legend>Cores</legend><div className="drawing-swatches">
        {(tool === 'highlighter' ? HIGHLIGHTER_PRESETS : PEN_COLORS).map(value => <button type="button" key={value} style={{ backgroundColor: value }} aria-label={`Cor ${value}`} aria-pressed={color === value} onClick={() => onColor(value)} />)}
      </div><label className="drawing-custom-color">Cor personalizada <span>{color}<input type="color" aria-label="Cor personalizada" value={color} onChange={event => onColor(event.target.value)} /></span></label></fieldset>
    </>}
    <fieldset><legend>{erasing ? 'Tamanho da borracha' : 'Espessura'} · {width}px</legend><div className="drawing-widths" role="group" aria-label="Espessura">
      {widths.map(value => <button type="button" key={value} aria-label={`${value}px`} aria-pressed={width === value} onClick={() => onWidth(value)}><svg viewBox="0 0 60 32" aria-hidden="true"><path d="M9 23Q23 8 32 16T51 11" fill="none" stroke={erasing ? 'currentColor' : color} strokeWidth={erasing ? value / 3 : value} strokeLinecap="round" opacity={erasing ? 1 : opacity} /></svg></button>)}
    </div></fieldset>
    {!erasing && <>
      <fieldset><legend>Estabilização</legend><div className="drawing-levels" role="group" aria-label="Estabilização">{(['Sem', 'Leve', 'Média', 'Forte'] as const).map((label, i) => <button type="button" key={label} aria-label={i === 0 ? 'Sem estabilização' : label} aria-pressed={stabilization === i} onClick={() => onStabilization(i as Stabilization)}>{label}</button>)}</div></fieldset>
      <label className="drawing-hold"><input type="checkbox" checked={holdShapes} onChange={event => onHoldShapes(event.target.checked)} /><span>Segurar para ajustar formas<small>Segure por um instante ao terminar uma linha, elipse ou retângulo.</small></span></label>
      <label className="tool-field"><span>Opacidade · {Math.round(opacity * 100)}%</span><input type="range" min={0.15} max={1} step={0.05} value={opacity} onChange={event => onOpacity(Number(event.target.value))} /></label>
    </>}
    {children}
  </div>
}
