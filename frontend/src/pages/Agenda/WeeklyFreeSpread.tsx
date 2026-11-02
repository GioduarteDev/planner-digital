import { useContext, useId, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TemplateEditingContext } from './templateEditingModel'
import { freeWeekDates, freeWeekHeading, freeWeekNoteKey, freeWeekStart, shiftFreeWeek } from './weeklyFreeModel'
import './WeeklyFreeSpread.css'

export function WeeklyFreeSpread({ spreadSide, anchor, weekStart, onWeeklyWeekChange }: {
  spreadSide?: 'left' | 'right'; anchor?: unknown; weekStart?: string
  onWeeklyWeekChange?: (value: string) => Promise<void>
}) {
  const editing = useContext(TemplateEditingContext)
  const instanceId = useId()
  const start = freeWeekStart(weekStart ?? anchor)
  const dates = freeWeekDates(start)
  const heading = freeWeekHeading(start)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const [error, setError] = useState('')
  async function changeWeek(amount: number) {
    if (!onWeeklyWeekChange || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try { await onWeeklyWeekChange(shiftFreeWeek(start, amount)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível mudar de semana. Tente novamente.') }
    finally { inFlight.current = false; setBusy(false) }
  }
  return <div className={`weekly-free-spread${spreadSide ? ` is-${spreadSide}` : ' is-preview'}`} data-week-start={start}>
    {spreadSide !== 'right' && <section className="weekly-free-page weekly-free-planning" aria-label="Planejamento semanal por datas">
      <header className="weekly-free-heading">
        <span className="weekly-free-eyebrow">MATCHA · UMA SEMANA DE POSSIBILIDADES</span>
        <h3>{heading.month}</h3>
        <div className="weekly-free-navigation">
          <button type="button" aria-label="Semana anterior do modelo livre" disabled={!editing || !onWeeklyWeekChange || busy} onClick={() => void changeWeek(-1)}><ChevronLeft size={16} aria-hidden="true" /></button>
          <time dateTime={start}>{heading.range}</time>
          <button type="button" aria-label="Próxima semana do modelo livre" disabled={!editing || !onWeeklyWeekChange || busy} onClick={() => void changeWeek(1)}><ChevronRight size={16} aria-hidden="true" /></button>
        </div>
        {error && <p className="weekly-free-error" role="alert">{error}</p>}
      </header>
      <div className="weekly-free-days">
        {dates.map(date => <article className="weekly-free-day" data-week-date={date.key} key={date.key}>
          <label htmlFor={editing ? `free-week-${instanceId}-${date.key}` : undefined}><time dateTime={date.key}>{String(date.day).padStart(2, '0')}<small>/{String(date.month).padStart(2, '0')}</small></time><span>{date.label}</span></label>
          {editing ? <textarea id={`free-week-${instanceId}-${date.key}`} className="weekly-free-notes" aria-label={`Planos de ${date.label}, ${date.key}`}
            data-week-note={date.key} value={typeof editing.data[freeWeekNoteKey(date.key)] === 'string' ? editing.data[freeWeekNoteKey(date.key)] as string : ''}
            placeholder="Atividades, compromissos e pequenos planos…" onChange={event => editing.update(freeWeekNoteKey(date.key), event.target.value)}
            onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
            onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') event.currentTarget.blur() }} />
            : <div className="weekly-free-note-preview" />}
        </article>)}
      </div>
      <footer className="weekly-free-footer">Um dia de cada vez.</footer>
    </section>}
    {spreadSide !== 'left' && <section className="weekly-free-page weekly-free-grid" aria-label="Papel quadriculado livre" />}
  </div>
}
