import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CanvasElementFromApi } from './editorModel'
import './SectionTemplates.css'

type Props = {
  element: CanvasElementFromApi
  onDataChange: (data: Record<string, unknown>) => void
}

const readText = (data: Record<string, unknown>, key: string, fallback = '') => typeof data[key] === 'string' ? data[key] as string : fallback

export function SectionTemplateContent({ element, onDataChange }: Props) {
  const { data, element_type: type } = element
  const update = (key: string, value: unknown) => onDataChange({ ...data, [key]: value })

  if (type === 'section:habit-tracker') {
    const habits = Array.isArray(data.habits) ? data.habits as Array<{ name: string; days: boolean[] }> : ['Hábito 1', 'Hábito 2', 'Hábito 3', 'Hábito 4'].map(() => ({ name: '', days: Array(7).fill(false) as boolean[] }))
    return <section className="planner-section section-habits"><header><span>WEEKLY RHYTHM</span><h3><input aria-label="Título da seção" value={readText(data, 'title', 'Habit tracker')} onChange={event => update('title', event.target.value)} /></h3></header><div className="section-habit-head"><span />{['M','T','W','T','F','S','S'].map((day, index) => <b key={`${day}${index}`}>{day}</b>)}</div>{habits.map((habit, row) => <div className="section-habit-row" key={row}><input aria-label={`Hábito ${row + 1}`} defaultValue={habit.name} placeholder={`Hábito ${row + 1}`} onChange={event => update('habits', habits.map((item, index) => index === row ? { ...item, name: event.target.value } : item))} />{habit.days.map((done, column) => <button type="button" aria-label={`${habit.name}, dia ${column + 1}`} aria-pressed={done} className={done ? 'is-done' : ''} key={column} onClick={() => update('habits', habits.map((item, index) => index === row ? { ...item, days: item.days.map((value, day) => day === column ? !value : value) } : item))} />)}</div>)}</section>
  }

  if (type === 'section:mini-calendar') {
    const now = new Date()
    const year = typeof data.year === 'number' ? data.year : now.getFullYear()
    const month = typeof data.month === 'number' ? data.month : now.getMonth()
    const first = new Date(year, month, 1).getDay()
    const total = new Date(year, month + 1, 0).getDate()
    return <section className="planner-section section-mini-calendar"><header><button type="button" aria-label="Mês anterior" onClick={() => { const date = new Date(year, month - 1, 1); onDataChange({ ...data, year: date.getFullYear(), month: date.getMonth() }) }}><ChevronLeft size={18} /></button><div><span>A LITTLE MONTH</span><h3>{new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3></div><button type="button" aria-label="Próximo mês" onClick={() => { const date = new Date(year, month + 1, 1); onDataChange({ ...data, year: date.getFullYear(), month: date.getMonth() }) }}><ChevronRight size={18} /></button></header><div className="section-calendar-grid">{['D','S','T','Q','Q','S','S'].map((day,index) => <b key={`${day}${index}`}>{day}</b>)}{Array.from({ length: 42 }, (_, index) => <span className={index - first + 1 === now.getDate() && month === now.getMonth() && year === now.getFullYear() ? 'is-today' : ''} key={index}>{index >= first && index < first + total ? index - first + 1 : ''}</span>)}</div></section>
  }

  if (type === 'section:notes-block') return <section className="planner-section section-notes"><header><span>KEEP THE LITTLE THINGS</span><h3><input aria-label="Título da seção" value={readText(data, 'title', 'Notes')} onChange={event => update('title', event.target.value)} /></h3></header><textarea aria-label="Notas" defaultValue={readText(data, 'text')} placeholder="Escreva sem pressa..." onChange={event => update('text', event.target.value)} /></section>

  if (type === 'section:goal-block') {
    const progress = typeof data.progress === 'number' ? data.progress : 0
    return <section className="planner-section section-goal"><header><span>ONE THING AT A TIME</span><h3><input aria-label="Título da seção" value={readText(data, 'title', 'My gentle goal')} onChange={event => update('title', event.target.value)} /></h3></header><input aria-label="Meta principal" defaultValue={readText(data, 'goal')} placeholder="O que quero cultivar?" onChange={event => update('goal', event.target.value)} /><div className="section-goal-progress"><i><b style={{ width: `${progress}%` }} /></i><output>{progress}%</output></div><input type="range" min="0" max="100" value={progress} aria-label="Progresso da meta" onChange={event => update('progress', Number(event.target.value))} /><textarea aria-label="Próximos passos" defaultValue={readText(data, 'steps')} placeholder="Próximos passos..." onChange={event => update('steps', event.target.value)} /></section>
  }

  if (type === 'section:priorities-block') return <section className="planner-section section-priorities"><header><span>WHAT MATTERS MOST</span><h3><input aria-label="Título da seção" value={readText(data, 'title', 'Priorities')} onChange={event => update('title', event.target.value)} /></h3></header>{[0, 1, 2].map(index => <label key={index}><b>{String(index + 1).padStart(2, '0')}</b><input aria-label={`Prioridade ${index + 1}`} defaultValue={readText(data, `priority${index}`)} placeholder="Defina uma prioridade…" onChange={event => update(`priority${index}`, event.target.value)} /></label>)}</section>

  if (type === 'section:checklist-block') {
    const items = Array.isArray(data.items) ? data.items as Array<{ text: string; done: boolean }> : Array.from({ length: 5 }, () => ({ text: '', done: false }))
    return <section className="planner-section section-checklist"><header><span>LITTLE STEPS</span><h3><input aria-label="Título da seção" value={readText(data, 'title', 'Checklist')} onChange={event => update('title', event.target.value)} /></h3></header>{items.map((item, index) => <label key={index}><input type="checkbox" checked={item.done} aria-label={`Concluir item ${index + 1}`} onChange={() => update('items', items.map((current, itemIndex) => itemIndex === index ? { ...current, done: !current.done } : current))} /><input value={item.text} aria-label={`Item ${index + 1}`} placeholder="Adicionar item…" onChange={event => update('items', items.map((current, itemIndex) => itemIndex === index ? { ...current, text: event.target.value } : current))} /></label>)}</section>
  }

  if (type === 'section:quote-block') return <section className="planner-section section-quote"><header><span>A NOTE TO KEEP</span><h3><input aria-label="Título da seção" value={readText(data, 'title', 'Quote')} onChange={event => update('title', event.target.value)} /></h3></header><textarea aria-label="Citação" defaultValue={readText(data, 'text')} placeholder="Escreva uma frase para guardar…" onChange={event => update('text', event.target.value)} /></section>

  if (type === 'section:time-blocking') return <section className="planner-section section-time-blocking"><header><span>MAKE SPACE FOR WHAT MATTERS</span><h3><input aria-label="Título da seção" value={readText(data, 'title', 'Time blocking')} onChange={event => update('title', event.target.value)} /></h3></header>{['Morning','Afternoon','Evening'].map((period, index) => <label key={period}><b>{period}</b><textarea defaultValue={readText(data, `period${index}`)} aria-label={`Bloco ${period}`} onChange={event => update(`period${index}`, event.target.value)} /></label>)}</section>

  return null
}
