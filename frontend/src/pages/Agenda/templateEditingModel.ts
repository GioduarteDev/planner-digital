import { createContext } from 'react'
import type { CanvasElementFromApi } from './editorModel'

/** Read old overlay fields in-place without deleting user content or rewriting a page on load. */
export function legacyTemplateFields(base: CanvasElementFromApi, elements: CanvasElementFromApi[]) {
  const aliases: Record<string, string> = { projectIdea: 'project-idea', actionPlan: 'action-plan', monthGoals: 'month-goals', weekFocus: 'focus', weeklyTitle: 'title', weekTitle: 'title', date: 'templateDate' }
  const data: Record<string, unknown> = {}
  for (const element of elements) {
    if (element.data.templateField !== true || element.data.templateId !== base.data.templateId) continue
    const key = String(element.data.fieldKey ?? '')
    if (typeof element.data.text === 'string' && element.data.text) data[aliases[key] ?? key] = element.data.text
  }
  return { ...data, ...base.data }
}

type TemplateEditing = {
  data: Record<string, unknown>
  update: (key: string, value: unknown) => void
  duplicate?: (title: string, text: string) => void
}
export const TemplateEditingContext = createContext<TemplateEditing | null>(null)

export const templateFieldKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-')

export function calendarDays(year: number, month: number, mondayFirst = true) {
  const offset = (new Date(year, month, 1).getDay() + (mondayFirst ? 6 : 0)) % 7
  const total = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: 42 }, (_, i) => i >= offset && i < offset + total ? i - offset + 1 : null)
}

export function templateDate(data: Record<string, unknown>, fallback = new Date()) {
  const anchor = typeof data.templateDate === 'string' ? new Date(`${data.templateDate}T12:00:00`) : fallback
  const safe = Number.isNaN(anchor.getTime()) ? fallback : anchor
  const monthText = typeof data.month === 'string' ? data.month.trim().toLowerCase() : ''
  let month = -1
  for (let i = 0; i < 12; i++) {
    if (['pt-BR', 'en-US'].some(locale => new Date(2026, i, 1).toLocaleDateString(locale, { month: 'long' }).toLowerCase() === monthText)) month = i
  }
  if (/^(0?[1-9]|1[0-2])$/.test(monthText)) month = Number(monthText) - 1
  const year = typeof data.year === 'string' && /^\d{4}$/.test(data.year) && Number(data.year) >= 1000 ? Number(data.year) : safe.getFullYear()
  return new Date(year, month >= 0 ? month : safe.getMonth(), month >= 0 ? 1 : safe.getDate(), 12)
}
