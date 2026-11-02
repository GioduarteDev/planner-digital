const GLYPH_FALLBACKS = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", "Noto Sans Symbols 2", "Segoe UI", sans-serif'
export const TEXT_FONT_CATEGORIES = ['Manuscritas', 'Fofinhas', 'Elegantes', 'Simples'] as const
export const AGENDA_FONTS = [
  { id: 'caveat', name: 'Caveat', category: 'Manuscritas', family: `"Matcha Caveat", ${GLYPH_FALLBACKS}`, italic: false },
  { id: 'kalam', name: 'Kalam', category: 'Manuscritas', family: `"Matcha Kalam", ${GLYPH_FALLBACKS}`, italic: false },
  { id: 'patrick-hand', name: 'Patrick Hand', category: 'Manuscritas', family: `"Matcha Patrick Hand", ${GLYPH_FALLBACKS}`, italic: false },
  { id: 'nunito', name: 'Nunito', category: 'Fofinhas', family: `"Matcha Nunito", ${GLYPH_FALLBACKS}`, italic: true },
  { id: 'quicksand', name: 'Quicksand', category: 'Fofinhas', family: `"Matcha Quicksand", ${GLYPH_FALLBACKS}`, italic: false },
  { id: 'fraunces', name: 'Fraunces', category: 'Elegantes', family: `"Matcha Fraunces", Georgia, ${GLYPH_FALLBACKS}`, italic: true },
  { id: 'cormorant', name: 'Cormorant Garamond', category: 'Elegantes', family: `"Matcha Cormorant Garamond", Georgia, ${GLYPH_FALLBACKS}`, italic: true },
  { id: 'system', name: 'Fonte do sistema', category: 'Simples', family: `"Segoe UI", Arial, ${GLYPH_FALLBACKS}`, italic: true },
  { id: 'georgia', name: 'Georgia clássica', category: 'Simples', family: `Georgia, "Times New Roman", ${GLYPH_FALLBACKS}`, italic: true },
] as const
export type AgendaTextStyle = {
  fontFamily: string; fontSize: number; color: string; fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'; textAlign: 'left' | 'center' | 'right'; lineHeight: number
}
export const DEFAULT_WRITING_STYLE: AgendaTextStyle = {
  fontFamily: AGENDA_FONTS[0].family, fontSize: 24, color: '#403a35', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left', lineHeight: 1.5,
}
export const TEXT_STYLE_KEYS = ['fontFamily', 'fontSize', 'color', 'fontWeight', 'fontStyle', 'textAlign', 'lineHeight'] as const

// Read legacy values as they are rendered today. Reading never writes defaults.
export function readAgendaTextStyle(data: Record<string, unknown>): AgendaTextStyle {
  return {
    fontFamily: typeof data.fontFamily === 'string' ? data.fontFamily : '',
    fontSize: typeof data.fontSize === 'number' ? data.fontSize : 18,
    color: typeof data.color === 'string' ? data.color : '#403a35',
    fontWeight: data.fontWeight === 'bold' ? 'bold' : 'normal', fontStyle: data.fontStyle === 'italic' ? 'italic' : 'normal',
    textAlign: data.textAlign === 'center' ? 'center' : data.textAlign === 'right' ? 'right' : 'left',
    lineHeight: typeof data.lineHeight === 'number' ? data.lineHeight : 1.55,
  }
}

// Filter style changes without ever normalizing, trimming or replacing text.
export function agendaStyleChanges(input: Partial<AgendaTextStyle>): Partial<AgendaTextStyle> {
  const result: Partial<AgendaTextStyle> = {}
  if (typeof input.fontFamily === 'string' && input.fontFamily.length <= 600) result.fontFamily = input.fontFamily
  if (Number.isFinite(input.fontSize) && input.fontSize! >= 8 && input.fontSize! <= 144) result.fontSize = input.fontSize
  if (typeof input.color === 'string' && /^#[a-f0-9]{6}$/i.test(input.color)) result.color = input.color
  if (input.fontWeight === 'bold' || input.fontWeight === 'normal') result.fontWeight = input.fontWeight
  if (input.fontStyle === 'italic' || input.fontStyle === 'normal') result.fontStyle = input.fontStyle
  if (input.textAlign === 'left' || input.textAlign === 'center' || input.textAlign === 'right') result.textAlign = input.textAlign
  if (Number.isFinite(input.lineHeight) && input.lineHeight! >= 1 && input.lineHeight! <= 3) result.lineHeight = input.lineHeight
  return result
}

export function restoreTextStyleKeys(current: Record<string, unknown>, saved: Record<string, unknown>, keys: readonly string[]) {
  const next = { ...current }
  for (const key of keys) {
    if (Object.hasOwn(saved, key)) next[key] = saved[key]
    else delete next[key]
  }
  return next
}
