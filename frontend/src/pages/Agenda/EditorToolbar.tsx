import type { ReactNode } from 'react'
import { Ellipsis, Eye, FileText, Highlighter, Image, LayoutTemplate, ListChecks, PenTool, Shapes, Sticker, Type, X } from 'lucide-react'
import type { EditorTool } from './editorModel'

const tools = [
  ['text', 'Texto', Type], ['pen', 'Canetas', PenTool],
  ['highlighter', 'Marca-texto', Highlighter], ['stickers', 'Stickers', Sticker],
  ['elements', 'Elementos', Shapes], ['photos', 'Fotos', Image],
  ['paper', 'Papel', FileText], ['tasks', 'Tarefas', ListChecks],
  ['templates', 'Templates', LayoutTemplate], ['more', 'Mais', Ellipsis],
] as const

export function EditorToolbar({ activeTool, title, onToggle, onClose, onTogglePreview, children }: {
  activeTool: EditorTool; title: string
  onToggle: (tool: Exclude<EditorTool, null>) => void
  onTogglePreview: () => void
  onClose: () => void; children: ReactNode
}) {
  return <>
    <nav className="editor-tool-rail" aria-label="Ferramentas da página">
      <button type="button" className="tool-rail-button tool-preview-button" aria-label="Visualizar agenda"
        title="Visualizar" data-label="Visualizar" data-tool="preview" onClick={onTogglePreview}>
        <Eye size={19} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {tools.map(([tool, label, Icon]) => <button key={tool} type="button"
        className={`tool-rail-button ${activeTool === tool ? 'active' : ''}`}
        aria-label={label} aria-expanded={activeTool === tool} title={label} data-label={label} data-tool={tool}
        onClick={() => onToggle(tool)}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></button>)}
    </nav>
    {activeTool && <aside className="editor-tool-drawer" aria-label={title}>
      <div className="tool-drawer-header">
        <div><span className="drawer-kicker">Papelaria</span><h3>{title}</h3></div>
        <button className="drawer-close-button" type="button" aria-label="Fechar ferramenta" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="tool-drawer-content">{children}</div>
    </aside>}
  </>
}
