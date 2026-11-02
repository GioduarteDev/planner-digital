import type { ReactNode } from 'react'
import { Eraser, Ellipsis, Eye, FileText, Flower2, Highlighter, Image, LayoutTemplate, ListChecks, MousePointer2, PenTool, Pin, Redo2, Shapes, Sparkles, Sticker, RectangleHorizontal as Tape, Type, Undo2, X } from 'lucide-react'
import type { EditorTool } from './editorModel'

const tools = [
  ['text', 'Texto', Type], ['pen', 'Desenhar', PenTool],
  ['highlighter', 'Marca-texto', Highlighter], ['stickers', 'Stickers', Sticker],
  ['elements', 'Elementos', Shapes], ['symbols', 'Símbolos & Charminhos', Sparkles],
  ['washi', 'Washi tapes', Tape], ['habits', 'Hábitos', Flower2], ['photos', 'Fotos', Image],
  ['paper', 'Papel', FileText], ['tasks', 'Tarefas', ListChecks],
  ['templates', 'Templates', LayoutTemplate], ['more', 'Mais', Ellipsis],
] as const

export function EditorToolbar({ activeTool, title, onToggle, onClose, onTogglePreview, drawingPinned, onToggleDrawingPin, drawingMode, selectionActive, onSelect, onEraser, canUndo, canRedo, onUndo, onRedo, children }: {
  activeTool: EditorTool; title: string
  onToggle: (tool: Exclude<EditorTool, null>) => void
  onTogglePreview: () => void
  onClose: () => void; children: ReactNode
  drawingPinned?: boolean; onToggleDrawingPin?: () => void
  drawingMode?: string | null; selectionActive: boolean; onSelect: () => void; onEraser: () => void
  canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void
}) {
  return <>
    <nav className="editor-tool-rail" aria-label="Ferramentas da página">
      <button type="button" className={`tool-rail-button ${selectionActive ? 'active' : ''}`} aria-label="Selecionar"
        aria-pressed={selectionActive} title="Selecionar" data-label="Selecionar" data-tool="select" onClick={onSelect}>
        <MousePointer2 size={19} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <button type="button" className="tool-rail-button tool-preview-button" aria-label="Visualizar agenda"
        title="Visualizar" data-label="Visualizar" data-tool="preview" onClick={onTogglePreview}>
        <Eye size={19} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {tools.map(([tool, label, Icon]) => {
        const active = tool === 'pen' ? activeTool === 'pen' && drawingMode !== 'eraser'
          : activeTool === tool
        return <button key={tool} type="button"
          className={`tool-rail-button ${active ? 'active' : ''}`}
          aria-label={label} aria-expanded={activeTool === tool} aria-pressed={active} title={label} data-label={label} data-tool={tool}
          onClick={() => onToggle(tool)}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></button>
      })}
      <button type="button" className={`tool-rail-button ${drawingMode === 'eraser' ? 'active' : ''}`} aria-label="Borracha"
        aria-expanded={activeTool === 'pen' && drawingMode === 'eraser'} aria-pressed={drawingMode === 'eraser'}
        title="Borracha" data-label="Borracha" data-tool="eraser" onClick={onEraser}>
        <Eraser size={19} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <span className="tool-rail-divider" aria-hidden="true" />
      <button type="button" className="tool-rail-button" title="Desfazer" aria-label="Desfazer" disabled={!canUndo} onClick={onUndo}>
        <Undo2 size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <button type="button" className="tool-rail-button" title="Refazer" aria-label="Refazer" disabled={!canRedo} onClick={onRedo}>
        <Redo2 size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </nav>
    {activeTool && <aside className={`editor-tool-drawer ${activeTool === 'pen' ? 'drawing-tool-drawer' : ''}`} aria-label={title}>
      <div className="tool-drawer-header">
        <div><span className="drawer-kicker">Papelaria</span><h3>{title}</h3></div>
        {activeTool === 'pen' && <button type="button" className="drawer-close-button drawing-pin" aria-label={drawingPinned ? 'Desafixar painel' : 'Fixar painel'} aria-pressed={!!drawingPinned} onClick={onToggleDrawingPin}><Pin size={16} /></button>}
        <button className="drawer-close-button" type="button" aria-label="Fechar ferramenta" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="tool-drawer-content">{children}</div>
    </aside>}
  </>
}
