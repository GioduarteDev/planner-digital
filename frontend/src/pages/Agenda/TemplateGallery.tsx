import { useMemo, useState } from 'react'
import { FilePlus2, LayoutTemplate } from 'lucide-react'
import { BUILT_IN_TEMPLATES, TEMPLATE_CATEGORIES, type BuiltInTemplate, type TemplateCategory } from './templateCatalog'
import { TemplateBackground } from './TemplateBackground'
import './TemplateGallery.css'

export function TemplateGallery({ busy, onApply, onCreate }: {
  busy: boolean
  onApply: (template: BuiltInTemplate) => void
  onCreate: (template: BuiltInTemplate) => void
}) {
  const [category, setCategory] = useState<'All' | TemplateCategory>('All')
  const templates = useMemo(() => category === 'All' ? BUILT_IN_TEMPLATES : BUILT_IN_TEMPLATES.filter(template => template.category === category), [category])

  return <>
    <div className="template-gallery-summary"><LayoutTemplate size={17} /><div><strong>{BUILT_IN_TEMPLATES.length} modelos de página</strong><span>Estruturas reais para escrever e criar por cima.</span></div></div>
    <div className="template-filter-row" aria-label="Filtrar templates">{TEMPLATE_CATEGORIES.map(item => <button type="button" className={category === item ? 'is-active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)} key={item}>{item === 'All' ? 'Todos' : item}</button>)}</div>
    <div className="built-in-template-grid">
      {templates.map(template => <article key={template.id} className="built-in-template" data-template-id={template.id}>
        <div className={`built-in-template-preview ${template.orientation === 'landscape' ? 'is-landscape' : ''}`} aria-hidden="true"><span className="built-in-template-preview-sheet"><TemplateBackground templateId={template.id} /></span></div>
        <span className="built-in-template-category">{template.category.toUpperCase()} · {template.orientation === 'landscape' ? 'PAISAGEM' : 'RETRATO'}</span>
        <strong>{template.name}</strong><p>{template.description}</p>
        <div className="built-in-template-actions"><button type="button" disabled={busy} onClick={() => onApply(template)}>Aplicar</button><button type="button" disabled={busy} onClick={() => onCreate(template)}><FilePlus2 size={12} /> Nova página</button></div>
      </article>)}
    </div>
  </>
}
