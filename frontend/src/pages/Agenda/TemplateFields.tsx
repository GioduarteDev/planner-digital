import { useContext, useState, type ReactNode } from 'react'
import { Copy, MoreHorizontal, Trash2 } from 'lucide-react'

import { TemplateEditingContext } from './templateEditingModel'
import { templateFieldKey } from './templateEditingModel'

export function TemplateField({ field, value = '', placeholder = '', multiline = false, type = 'text', label }: {
  field: string; value?: string; placeholder?: string; multiline?: boolean; type?: 'text' | 'date'; label?: string
}) {
  const editing = useContext(TemplateEditingContext)
  if (!editing) return <span>{value || placeholder}</span>
  const current = typeof editing.data[field] === 'string' ? editing.data[field] as string : value
  const props = {
    'data-template-field': field, 'aria-label': label ?? field, className: 'template-inline-field',
    value: current, placeholder,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => editing.update(field, event.target.value),
    onPointerDown: (event: React.PointerEvent) => event.stopPropagation(),
    onClick: (event: React.MouseEvent) => event.stopPropagation(),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      event.stopPropagation()
      if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing)) {
        event.preventDefault(); event.currentTarget.blur()
      }
    },
  }
  return multiline ? <textarea {...props} /> : <input {...props} type={type} />
}



export function EditableTemplateBox({ title, className = '', children }: { title: string; className?: string; children?: ReactNode }) {
  const editing = useContext(TemplateEditingContext)
  const [selected, setSelected] = useState(false)
  const key = templateFieldKey(title)
  const hidden = Array.isArray(editing?.data.hiddenBlocks) ? editing.data.hiddenBlocks as string[] : []
  const optional = /notes|goals?|quote|priorit|reflection|habit|checklist|motivation|focus/i.test(title)
  if (editing && hidden.includes(key)) return <div className={`tpl-box tpl-removed-block ${className}`} data-removed-block={key} />
  return <section className={`tpl-box ${className}`} data-template-block={key}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSelected(false) }}>
    <b><TemplateField field={`heading:${key}`} value={title} label={`Título ${title}`} /></b>
    {!(editing && /habit/i.test(title)) && children}
    {editing && <div className="tpl-box-writing">{/habit/i.test(title)
      ? <div className="tpl-inline-habits">{[0, 1, 2, 3].map(row => <label key={row}><TemplateField field={`habit:${row}`} placeholder={`Hábito ${row + 1}`} label={`Hábito ${row + 1}`} />{[0, 1, 2, 3, 4, 5, 6].map(day => <input key={day} type="checkbox" aria-label={`Hábito ${row + 1}, dia ${day + 1}`} checked={editing.data[`habit:${row}:${day}`] === true} onChange={event => editing.update(`habit:${row}:${day}`, event.target.checked)} onClick={event => event.stopPropagation()} />)}</label>)}</div>
      : <TemplateField field={key} multiline placeholder={/idea/i.test(title) ? 'Escreva uma ideia…' : /goal/i.test(title) ? 'Defina sua meta…' : /priorit/i.test(title) ? 'Defina suas prioridades…' : 'Adicione uma nota…'} label={title} />}</div>}
    {editing && optional && <div className="tpl-block-actions" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
      <button type="button" aria-label={`Opções ${title}`} aria-expanded={selected} onClick={() => setSelected(!selected)}><MoreHorizontal size={14} /></button>
      {selected && <><button type="button" aria-label={`Duplicar ${title}`} onClick={() => { editing.duplicate?.(String(editing.data[`heading:${key}`] ?? title), String(editing.data[key] ?? '')); setSelected(false) }}><Copy size={13} /></button><button type="button" aria-label={`Remover ${title}`} onClick={() => editing.update('hiddenBlocks', [...hidden, key])}><Trash2 size={13} /></button></>}
    </div>}
  </section>
}

