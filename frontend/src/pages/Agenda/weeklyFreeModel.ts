export const WEEKLY_FREE_TEMPLATE_ID = 'weekly-free-spread'
export const WEEKLY_FREE_DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'] as const

function utcDate(key: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
  const date = new Date(`${key}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key ? date : null
}
export function localTodayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function freeWeekStart(anchor: unknown, fallback = localTodayKey()) {
  const date = typeof anchor === 'string' ? utcDate(anchor) : null
  const safe = date ?? utcDate(fallback) ?? new Date('2026-01-05T12:00:00Z')
  safe.setUTCDate(safe.getUTCDate() - ((safe.getUTCDay() + 6) % 7))
  return safe.toISOString().slice(0, 10)
}
export function freeWeekDates(start: string) {
  const monday = freeWeekStart(start)
  return WEEKLY_FREE_DAYS.map((label, index) => {
    const date = utcDate(monday)!
    date.setUTCDate(date.getUTCDate() + index)
    return { label, key: date.toISOString().slice(0, 10), day: date.getUTCDate(), month: date.getUTCMonth() + 1 }
  })
}
export function shiftFreeWeek(start: string, amount: number) {
  const date = utcDate(freeWeekStart(start))!
  date.setUTCDate(date.getUTCDate() + amount * 7)
  return date.toISOString().slice(0, 10)
}
export function freeWeekHeading(start: string) {
  const days = freeWeekDates(start)
  const first = utcDate(days[0].key)!, last = utcDate(days[6].key)!
  const month = (date: Date) => date.toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })
  const firstLabel = `${month(first)} ${first.getUTCFullYear()}`
  const sameMonth = first.getUTCMonth() === last.getUTCMonth() && first.getUTCFullYear() === last.getUTCFullYear()
  return {
    month: sameMonth ? firstLabel : `${firstLabel} / ${month(last)} ${last.getUTCFullYear()}`,
    range: `${first.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })} — ${last.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}`,
  }
}
export const freeWeekNoteKey = (date: string) => `free-week:day:${date}`
