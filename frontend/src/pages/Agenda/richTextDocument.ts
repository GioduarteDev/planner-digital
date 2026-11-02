import { AGENDA_FONTS } from './agendaTypography'

const allowedTags = new Set([
  'B', 'BR', 'DIV', 'EM', 'I', 'LI', 'OL', 'P', 'S', 'SPAN', 'STRIKE', 'STRONG', 'U', 'UL',
])
const discardedTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'])
const allowedFontFamilies = new Set<string>(AGENDA_FONTS.map(font => font.family))

function safeSpanStyle(source: HTMLElement, target: HTMLElement) {
  const color = source.style.color
  if (/^#[a-f\d]{6}$/i.test(color)) target.style.color = color
  else {
    const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(color)
    if (rgb) {
      const channels = rgb.slice(1).map(Number)
      if (channels.every(channel => channel <= 255)) {
        target.style.color = `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`
      }
    }
  }

  const fontSize = source.style.fontSize
  const parsedSize = /^(\d+(?:\.\d+)?)px$/.exec(fontSize)
  if (parsedSize) {
    const size = Number(parsedSize[1])
    if (size >= 8 && size <= 144) target.style.fontSize = `${size}px`
  }

  const fontFamily = source.style.fontFamily
  if (allowedFontFamilies.has(fontFamily)) target.style.fontFamily = fontFamily
}

function copySafeNodes(source: Node, target: Node) {
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(child.textContent ?? ''))
      continue
    }

    if (!(child instanceof HTMLElement)) continue
    const tag = child.tagName
    if (discardedTags.has(tag)) continue

    if (tag === 'INPUT') {
      if (!(child instanceof HTMLInputElement) || child.type !== 'checkbox') continue
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = child.checked || child.hasAttribute('checked')
      if (checkbox.checked) checkbox.setAttribute('checked', '')
      target.appendChild(checkbox)
      continue
    }

    if (!allowedTags.has(tag)) {
      copySafeNodes(child, target)
      continue
    }

    const safeElement = document.createElement(tag.toLowerCase())
    if (tag === 'SPAN') {
      if (child.getAttribute('contenteditable') === 'true' || child.getAttribute('contenteditable') === 'false') {
        safeElement.setAttribute('contenteditable', child.getAttribute('contenteditable')!)
      }
      if (child.getAttribute('data-matcha-checkbox') === 'true') {
        safeElement.setAttribute('data-matcha-checkbox', 'true')
      }
      if (child.getAttribute('data-placeholder') === 'Tarefa...') {
        safeElement.setAttribute('data-placeholder', 'Tarefa...')
      }
      safeSpanStyle(child, safeElement)
    }
    copySafeNodes(child, safeElement)
    target.appendChild(safeElement)
  }
}

export function sanitizeRichTextHtml(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const safeRoot = document.createElement('div')
  copySafeNodes(parsed.body, safeRoot)
  return safeRoot.innerHTML
}

export function plainTextFromRichHtml(html: string) {
  const parsed = new DOMParser().parseFromString(sanitizeRichTextHtml(html), 'text/html')
  parsed.querySelectorAll('input[type="checkbox"]').forEach(input => input.remove())
  const collectText = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (!(node instanceof HTMLElement)) return ''
    if (node.tagName === 'BR') return '\n'
    const content = Array.from(node.childNodes, collectText).join('')
    return ['DIV', 'LI', 'P'].includes(node.tagName) ? `${content}\n` : content
  }
  return collectText(parsed.body).replace(/\n+$/, '')
}

export function escapeRichText(text: string) {
  return text.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!).replace(/\r?\n/g, '<br>')
}

export function createInlineCheckboxHtml() {
  return '<span data-matcha-checkbox="true" contenteditable="false"><input type="checkbox"><span contenteditable="true" data-placeholder="Tarefa..."></span></span>'
}

export function createInlineListHtml() {
  return '<ul><li><br></li></ul>'
}
