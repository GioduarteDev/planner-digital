import { useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { AGENDA_FONTS, type AgendaTextStyle } from './agendaTypography'
import { plainTextFromRichHtml, sanitizeRichTextHtml, createInlineCheckboxHtml } from './richTextDocument'

type InlineCommand = 'bold' | 'italic' | 'underline' | 'strikeThrough'
type RichEditorProps = {
  html: string
  editing: boolean
  locked: boolean
  style: AgendaTextStyle
  onChange: (html: string, text: string) => void
  onBlur: (html: string, text: string) => void
  onActivate: () => void
}

export function CanvasRichTextEditor({ html, editing, locked, style, onChange, onBlur, onActivate }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef<Range | null>(null)
  const [pressed, setPressed] = useState<Record<InlineCommand, boolean>>({
    bold: false, italic: false, underline: false, strikeThrough: false,
  })

  useLayoutEffect(() => {
    const editor = editorRef.current
    if (!editor || editor.contains(document.activeElement)) return
    const safeHtml = sanitizeRichTextHtml(html)
    if (editor.innerHTML !== safeHtml) editor.innerHTML = safeHtml
  }, [html])

  useLayoutEffect(() => {
    const editor = editorRef.current
    if (!editing || !editor || editor.contains(document.activeElement)) return
    const target = editor.querySelector<HTMLElement>('[contenteditable="true"], li:last-child') ?? editor
    target.focus()
    const range = document.createRange()
    range.selectNodeContents(target)
    range.collapse(false)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    selectionRef.current = range.cloneRange()
  }, [editing])

  function rememberSelection() {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    if (editor.contains(range.commonAncestorContainer)) selectionRef.current = range.cloneRange()
    setPressed({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
    })
  }

  function restoreSelection() {
    const editor = editorRef.current
    if (!editor) return false
    editor.focus()
    const selection = window.getSelection()
    const range = selectionRef.current
    if (!selection || !range || !editor.contains(range.commonAncestorContainer)) return false
    selection.removeAllRanges()
    selection.addRange(range)
    return true
  }

  function persistCurrent() {
    const editor = editorRef.current
    if (!editor) return
    const safeHtml = sanitizeRichTextHtml(editor.innerHTML)
    onChange(safeHtml, plainTextFromRichHtml(safeHtml))
    rememberSelection()
  }

  function runCommand(command: InlineCommand) {
    if (locked || !restoreSelection()) return
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    if (range.collapsed) {
      document.execCommand(command)
      persistCurrent()
      return
    }

    const tags: Record<InlineCommand, string> = {
      bold: 'b', italic: 'i', underline: 'u', strikeThrough: 's',
    }
    const tag = tags[command]
    const startElement = range.startContainer instanceof HTMLElement
      ? range.startContainer
      : range.startContainer.parentElement
    const existing = startElement?.closest(tag)
    let nextRange: Range
    if (existing && editor.contains(existing) && existing.contains(range.endContainer)) {
      nextRange = range.cloneRange()
      const contents = Array.from(existing.childNodes)
      existing.replaceWith(...contents)
    } else {
      const wrapper = document.createElement(tag)
      wrapper.append(range.extractContents())
      range.insertNode(wrapper)
      nextRange = document.createRange()
      nextRange.selectNodeContents(wrapper)
    }
    selection.removeAllRanges()
    selection.addRange(nextRange)
    persistCurrent()
  }

  function applyStyle(property: 'fontFamily' | 'fontSize' | 'color', value: string) {
    if (locked || !restoreSelection()) return
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    const wasCollapsed = range.collapsed
    const span = document.createElement('span')
    if (property === 'fontFamily' && AGENDA_FONTS.some(font => font.family === value)) span.style.fontFamily = value
    if (property === 'fontSize' && Number(value) >= 8 && Number(value) <= 144) span.style.fontSize = `${Number(value)}px`
    if (property === 'color' && /^#[a-f\d]{6}$/i.test(value)) span.style.color = value
    const extracted = range.extractContents()
    span.append(extracted)
    range.insertNode(span)
    const nextRange = document.createRange()
    if (wasCollapsed) {
      nextRange.selectNodeContents(span)
      nextRange.collapse(false)
    } else {
      nextRange.selectNodeContents(span)
    }
    selection.removeAllRanges()
    selection.addRange(nextRange)
    selectionRef.current = nextRange.cloneRange()
    persistCurrent()
  }

  function insertCheckbox() {
    if (locked || !restoreSelection()) return
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    range.deleteContents()
    const wrapper = document.createElement('span')
    wrapper.innerHTML = createInlineCheckboxHtml()
    const checkbox = wrapper.firstElementChild
    if (!checkbox) return
    range.insertNode(checkbox)
    const textTarget = checkbox.querySelector<HTMLElement>('[contenteditable="true"]')
    if (textTarget) {
      const nextRange = document.createRange()
      nextRange.selectNodeContents(textTarget)
      nextRange.collapse(false)
      selection.removeAllRanges()
      selection.addRange(nextRange)
    }
    persistCurrent()
  }

  function insertList() {
    if (locked || !restoreSelection()) return
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    if (range.startContainer.parentElement?.closest('li')) return
    range.deleteContents()

    const trailingRange = range.cloneRange()
    trailingRange.selectNodeContents(editor)
    trailingRange.setStart(range.startContainer, range.startOffset)
    const trailingContent = trailingRange.extractContents()
    const list = document.createElement('ul')
    const item = document.createElement('li')
    list.append(item)
    editor.append(list, trailingContent)

    const nextRange = document.createRange()
    nextRange.setStart(item, 0)
    nextRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(nextRange)
    persistCurrent()
  }

  function handleInput() {
    persistCurrent()
  }

  function persistCheckbox(target: EventTarget | null) {
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return
    target.toggleAttribute('checked', target.checked)
    persistCurrent()
  }

  function handleEditorClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLInputElement && event.target.type === 'checkbox') {
      persistCheckbox(event.target)
      return
    }
    rememberSelection()
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const editor = editorRef.current
    const nextTarget = event.relatedTarget
    if (editor && nextTarget instanceof Node && editor.parentElement?.contains(nextTarget)) return
    const safeHtml = sanitizeRichTextHtml(editor?.innerHTML ?? '')
    onBlur(safeHtml, plainTextFromRichHtml(safeHtml))
  }

  function keepEditorFocus(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation()
    if (event.key === 'Escape') event.currentTarget.blur()
    if (event.key !== 'Enter' && event.key !== 'Backspace') return

    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    const startNode = range.startContainer instanceof HTMLElement
      ? range.startContainer
      : range.startContainer.parentElement
    const listItem = startNode?.closest('li')
    if (!listItem || !editor.contains(listItem)) return

    if (event.key === 'Backspace' && listItem.textContent?.trim() === '' && !listItem.querySelector('input')) {
      const list = listItem.parentElement
      const items = list ? Array.from(list.children).filter((child): child is HTMLLIElement => child instanceof HTMLLIElement) : []
      if (items.length <= 1) return
      event.preventDefault()
      const previous = listItem.previousElementSibling ?? listItem.nextElementSibling
      listItem.remove()
      if (previous instanceof HTMLLIElement) {
        previous.focus()
        const nextRange = document.createRange()
        nextRange.selectNodeContents(previous)
        nextRange.collapse(false)
        selection.removeAllRanges()
        selection.addRange(nextRange)
      }
      persistCurrent()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (!range.collapsed) range.deleteContents()
      const caret = window.getSelection()?.getRangeAt(0) ?? range
      const remaining = caret.cloneRange()
      remaining.setEnd(listItem, listItem.childNodes.length)
      const trailingContent = remaining.extractContents()
      const nextItem = document.createElement('li')
      nextItem.append(trailingContent)
      if (nextItem.textContent?.trim() === '' && !nextItem.querySelector('input')) nextItem.innerHTML = '<br>'
      listItem.parentElement?.insertBefore(nextItem, listItem.nextSibling)
      const nextRange = document.createRange()
      nextRange.selectNodeContents(nextItem)
      nextRange.collapse(true)
      selection.removeAllRanges()
      selection.addRange(nextRange)
      persistCurrent()
    }
  }

  const editorStyle: CSSProperties = {
    color: style.color,
    fontSize: `${style.fontSize}px`,
    fontFamily: style.fontFamily || undefined,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textAlign: style.textAlign,
    lineHeight: style.lineHeight,
  }

  return <div className="canvas-rich-editor">
    {editing && <div className="canvas-rich-toolbar" role="toolbar" aria-label="Formatação do texto" contentEditable={false}
      onMouseDown={event => {
        if ((event.target as Element).closest('button')) {
          event.preventDefault()
          rememberSelection()
        } else rememberSelection()
      }}>
      <label className="canvas-rich-font-label">Fonte
        <select aria-label="Fonte do trecho" disabled={locked} defaultValue="" value="" onChange={event => {
          if (event.target.value) applyStyle('fontFamily', event.target.value)
          event.target.value = ''
        }}>
          <option value="">Fonte</option>
          {AGENDA_FONTS.map(font => <option value={font.family} key={font.id}>{font.name}</option>)}
        </select>
      </label>
      <label className="canvas-rich-size-label">Tamanho
        <input aria-label="Tamanho do trecho" type="number" min="8" max="144" defaultValue={style.fontSize} disabled={locked}
          onKeyDown={event => { if (event.key === 'Enter') { applyStyle('fontSize', event.currentTarget.value); event.currentTarget.blur() } }}
          onBlur={event => {
            const size = Number(event.currentTarget.value)
            if (size >= 8 && size <= 144) applyStyle('fontSize', String(size))
          }} />
      </label>
      <label className="canvas-rich-color-label">Cor
        <input aria-label="Cor do trecho" type="color" value={style.color} disabled={locked} onChange={event => applyStyle('color', event.target.value)} />
      </label>
      <button type="button" aria-label="Checkbox" title="Inserir checkbox" disabled={locked} onMouseDown={keepEditorFocus} onClick={insertCheckbox}>☑</button>
      <button type="button" aria-label="Lista" title="Inserir lista" disabled={locked} onMouseDown={keepEditorFocus} onClick={insertList}>•</button>
      {([
        ['bold', 'Negrito', 'B'],
        ['italic', 'Itálico', 'I'],
        ['underline', 'Sublinhado', 'U'],
        ['strikeThrough', 'Tachado', 'S'],
      ] as const).map(([command, label, icon]) => <button key={command} type="button" aria-label={label} title={label}
        aria-pressed={pressed[command]} disabled={locked} onMouseDown={keepEditorFocus} onClick={() => runCommand(command)}><span className={`canvas-rich-${command}`}>{icon}</span></button>)}
    </div>}
    <div ref={editorRef} className="canvas-inline-text canvas-rich-text" role="textbox" aria-label="Texto da página" aria-multiline="true"
      contentEditable={!locked} suppressContentEditableWarning style={editorStyle}
      data-placeholder="Escreva aqui..."
      onFocus={onActivate} onInput={handleInput} onClick={handleEditorClick}
      onKeyUp={rememberSelection} onMouseUp={rememberSelection} onBlur={handleBlur} onKeyDown={handleKeyDown}
      onPointerDown={event => event.stopPropagation()} />
  </div>
}
