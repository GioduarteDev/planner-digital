import { useEffect, useMemo, useState } from 'react'
import {
  CircleHelp,
  Droplets,
  Heart,
  ListChecks,
  Pause,
  Play,
  RotateCcw,
  Star,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { apiRequest } from '../../services/api'
import type { PlannerTask } from './editorModel'
import type { Habit, HabitCompletion } from '../Today/todayData'
import './PlannerWidgets.css'

export type HabitWidgetType =
  | 'widget:water-tracker'
  | 'widget:habit-tracker'
  | 'widget:mood-tracker'
  | 'widget:progress-bar'
  | 'widget:star-rating'
  | 'widget:time-control'

const widgetOptions = [
  { type: 'widget:water-tracker', name: 'Tracker de água', help: 'Consumo do dia ligado ao seu registro de hidratação.', icon: Droplets, width: 260, height: 190 },
  { type: 'widget:habit-tracker', name: 'Tracker de hábitos', help: 'Hábitos ativos e marcações reais do dia.', icon: ListChecks, width: 300, height: 250 },
  { type: 'widget:mood-tracker', name: 'Tracker de humor', help: 'Humor diário salvo no seu acompanhamento.', icon: Heart, width: 250, height: 180 },
  { type: 'widget:progress-bar', name: 'Barra de progresso', help: 'Acompanhe tarefas reais ou uma meta manual.', icon: TrendingUp, width: 270, height: 165 },
  { type: 'widget:star-rating', name: 'Avaliação em estrelas', help: 'Dê uma nota de uma a cinco estrelas; ela fica salva aqui.', icon: Star, width: 230, height: 140 },
  { type: 'widget:time-control', name: 'Controle de tempo', help: 'Temporizador com início, pausa e reinício.', icon: Timer, width: 240, height: 185 },
] as const

export function HabitWidgetLibrary({ onInsert }: { onInsert: (type: HabitWidgetType, width: number, height: number) => void }) {
  const [helpId, setHelpId] = useState<HabitWidgetType | null>(null)

  return <section className="habit-widget-library" aria-label="Widgets de hábitos">
    <header><span>✿</span><div><h3>Hábitos</h3><p>Pequenos registros para compor sua folha.</p></div></header>
    <div className="habit-widget-library-grid">
      {widgetOptions.map(option => {
        const Icon = option.icon
        return <article className="habit-widget-library-card" key={option.type}>
          <button type="button" className="habit-widget-library-insert" onClick={() => onInsert(option.type, option.width, option.height)}>
            <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
            <span>{option.name}</span>
          </button>
          <button type="button" className="habit-widget-library-help" aria-label={`Ajuda: ${option.name}`} aria-expanded={helpId === option.type}
            onClick={() => setHelpId(current => current === option.type ? null : option.type)}>
            <CircleHelp size={14} aria-hidden="true" />
          </button>
          {helpId === option.type && <p className="habit-widget-library-description">{option.help}</p>}
        </article>
      })}
    </div>
  </section>
}

type DailyEntry = {
  id: number
  entry_date: string
  mood: string
  quick_note: string
  music_data: Record<string, unknown>
  reading_data: Record<string, unknown>
  watching_data: Record<string, unknown>
  photo_media_id: number | null
  water_ml: number
}

function localDateKey() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function DailyRecordWidget({ locked, kind }: {
  locked: boolean
  kind: 'water' | 'mood'
}) {
  const entryDate = localDateKey()
  const [entry, setEntry] = useState<DailyEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [waterDraft, setWaterDraft] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiRequest<DailyEntry[]>(`/daily-entries?start=${entryDate}&end=${entryDate}`)
      .then(records => {
        if (!cancelled) setEntry(records[0] ?? null)
      })
      .catch(error => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar o registro diário.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [attempt, entryDate])

  async function save(patch: Partial<DailyEntry>) {
    if (saving) return
    setSaving(true)
    setActionError('')
    const previous = entry
    try {
      const saved = await apiRequest<DailyEntry>(`/daily-entries/${entryDate}`, {
        method: previous ? 'PATCH' : 'PUT',
        body: JSON.stringify(patch),
      })
      setEntry(saved)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível salvar o registro diário.')
    } finally {
      setSaving(false)
    }
  }

  const value = kind === 'water' ? entry?.water_ml ?? 0 : entry?.mood ?? ''
  const label = kind === 'water' ? 'Tracker de água' : 'Tracker de humor'
  const dateLabel = new Date(`${entryDate}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })

  return <section className={`habit-widget habit-widget-${kind}`} aria-label={label}>
    <header><span className="habit-widget-icon">{kind === 'water' ? <Droplets size={16} /> : <Heart size={16} />}</span>
      <div><h3>{kind === 'water' ? 'Água' : 'Humor'}</h3><small>{dateLabel} · registro real</small></div>
      <span className="habit-widget-flower" aria-hidden="true">✿</span>
    </header>
    {loading ? <p className="habit-widget-status" role="status">Carregando registro…</p>
      : loadError ? <div className="habit-widget-feedback" role="alert">{loadError}<button type="button" onClick={() => { setLoading(true); setLoadError(''); setAttempt(current => current + 1) }}>Tentar novamente</button></div>
        : kind === 'water' ? <div className="habit-widget-water">
          <div className="habit-widget-water-total"><strong>{value} <small>ml</small></strong><span>consumo registrado</span></div>
          <div className="habit-widget-actions">
            <button type="button" disabled={locked || saving || Number(value) < 250} aria-label="Remover 250 ml" onClick={() => void save({ water_ml: Math.max(0, Number(value) - 250) })}>−250</button>
            <label><span>ml</span><input type="number" min="0" step="50" value={waterDraft ?? value} disabled={locked || saving}
              onChange={event => setWaterDraft(event.target.value)}
              onBlur={event => {
                const rawValue = event.target.value.trim()
                setWaterDraft(null)
                if (!rawValue) return
                const nextValue = Number(rawValue)
                if (Number.isSafeInteger(nextValue) && nextValue >= 0) void save({ water_ml: nextValue })
                else setActionError('Informe um número inteiro igual ou maior que zero.')
              }} /></label>
            <button type="button" disabled={locked || saving} aria-label="Adicionar 250 ml" onClick={() => void save({ water_ml: Number(value) + 250 })}>+250</button>
          </div>
        </div> : <div className="habit-widget-mood">
          <p>{value ? `Hoje você se sente ${moodLabel(String(value))}.` : 'Como você está se sentindo hoje?'}</p>
          <select aria-label="Humor de hoje" value={value} disabled={locked || saving} onChange={event => { if (event.target.value) void save({ mood: event.target.value }) }}>
            <option value="">Escolher humor</option>
            {MOODS.map(mood => <option key={mood.id} value={mood.id}>{mood.label}</option>)}
          </select>
        </div>}
    {saving && <span className="habit-widget-status" role="status">Salvando…</span>}
    {actionError && <p className="habit-widget-feedback" role="alert">{actionError}</p>}
  </section>
}

const MOODS = [
  { id: 'calm', label: 'calma' },
  { id: 'happy', label: 'feliz' },
  { id: 'tired', label: 'cansada' },
  { id: 'focused', label: 'focada' },
  { id: 'sensitive', label: 'sensível' },
]

function moodLabel(id: string) {
  return MOODS.find(mood => mood.id === id)?.label ?? id
}

function HabitTrackerWidget({ locked }: { locked: boolean }) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)
  const today = localDateKey()
  const dayIndex = (new Date(`${today}T12:00:00`).getDay() + 6) % 7
  const todayLabel = new Date(`${today}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
  const completedIds = useMemo(() => new Set(completions.filter(item => item.completion_date === today).map(item => item.habit_id)), [completions, today])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiRequest<Habit[]>('/habits?active=true'),
      apiRequest<HabitCompletion[]>(`/habit-completions?start=${today}&end=${today}`),
    ]).then(([habitRecords, completionRecords]) => {
      if (cancelled) return
      setHabits(habitRecords.filter(habit => habit.active))
      setCompletions(completionRecords)
    }).catch(loadError => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar seus hábitos.')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [attempt, today])

  async function toggle(habit: Habit) {
    if (savingId !== null) return
    const complete = completedIds.has(habit.id)
    setSavingId(habit.id)
    setError('')
    try {
      if (complete) {
        await apiRequest<void>(`/habits/${habit.id}/completions/${today}`, { method: 'DELETE' })
        setCompletions(current => current.filter(item => !(item.habit_id === habit.id && item.completion_date === today)))
      } else {
        const saved = await apiRequest<HabitCompletion>(`/habits/${habit.id}/completions/${today}`, { method: 'PUT' })
        setCompletions(current => [...current.filter(item => !(item.habit_id === habit.id && item.completion_date === today)), saved])
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível atualizar o hábito.')
    } finally {
      setSavingId(null)
    }
  }

  const scheduled = habits.filter(habit => habit.days_of_week.includes(dayIndex))
  return <section className="habit-widget habit-widget-tracker" aria-label="Tracker de hábitos">
    <header><span className="habit-widget-icon"><ListChecks size={16} /></span><div><h3>Meus hábitos</h3><small>{todayLabel} · dados reais</small></div><span className="habit-widget-flower" aria-hidden="true">✿</span></header>
    {loading ? <p className="habit-widget-status" role="status">Carregando hábitos…</p>
      : error ? <div className="habit-widget-feedback" role="alert">{error}<button type="button" onClick={() => { setLoading(true); setError(''); setAttempt(current => current + 1) }}>Tentar novamente</button></div>
        : scheduled.length ? <ul className="habit-widget-habit-list">{scheduled.map(habit => {
          const complete = completedIds.has(habit.id)
          return <li key={habit.id}><button type="button" className={complete ? 'is-complete' : ''} disabled={locked || savingId !== null}
            aria-pressed={complete} onClick={() => void toggle(habit)}><span className="habit-widget-check">{complete ? '✓' : ''}</span><span>{habit.name}</span></button></li>
        })}</ul> : <p className="habit-widget-empty">Nenhum hábito ativo previsto para hoje. Crie ou ajuste seus hábitos no acompanhamento para vê-los aqui.</p>}
    {habits.length > 0 && <footer>{scheduled.filter(habit => completedIds.has(habit.id)).length} de {scheduled.length} concluídos hoje</footer>}
  </section>
}

function ProgressWidget({ data, tasks, locked, onDataChange }: {
  data: Record<string, unknown>
  tasks: PlannerTask[]
  locked: boolean
  onDataChange: (data: Record<string, unknown>) => void
}) {
  const source = data.source === 'manual' ? 'manual' : 'tasks'
  const [currentDraft, setCurrentDraft] = useState(String(typeof data.current === 'number' ? data.current : 0))
  const [goalDraft, setGoalDraft] = useState(String(typeof data.goal === 'number' ? data.goal : 10))
  const doneTasks = tasks.filter(task => task.done).length
  const totalTasks = tasks.length
  const current = source === 'manual' ? Math.max(0, Number(data.current) || 0) : doneTasks
  const goal = source === 'manual' ? Math.max(1, Number(data.goal) || 1) : totalTasks
  const percent = source === 'manual' || totalTasks > 0 ? Math.min(100, Math.round(current / goal * 100)) : 0
  const [validationError, setValidationError] = useState('')

  function updateManualValue(key: 'current' | 'goal', rawValue: string) {
    const value = Number(rawValue)
    if (!Number.isSafeInteger(value) || value < (key === 'current' ? 0 : 1)) {
      setValidationError(key === 'current' ? 'Use um número inteiro igual ou maior que zero.' : 'A meta precisa ser um número inteiro maior que zero.')
      return
    }
    setValidationError('')
    const next = { ...data, [key]: value }
    if (key === 'current') setCurrentDraft(rawValue)
    else setGoalDraft(rawValue)
    onDataChange(next)
  }

  return <section className="habit-widget habit-widget-progress" aria-label="Barra de progresso">
    <header><span className="habit-widget-icon"><TrendingUp size={16} /></span><div><h3>Progresso</h3><small>{source === 'manual' ? 'meta manual' : 'tarefas reais da Agenda'}</small></div><span className="habit-widget-flower" aria-hidden="true">✿</span></header>
    <label className="habit-widget-source">Acompanhar
      <select value={source} disabled={locked} onChange={event => onDataChange({ ...data, source: event.target.value })}>
        <option value="tasks">Tarefas da Agenda</option><option value="manual">Meta manual</option>
      </select>
    </label>
    <div className="habit-widget-progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso">
      <span style={{ width: `${percent}%` }} />
    </div>
    {source === 'manual' ? <div className="habit-widget-progress-fields">
      <label>Feito<input type="number" min="0" step="1" value={currentDraft} disabled={locked}
        onChange={event => setCurrentDraft(event.target.value)} onBlur={event => updateManualValue('current', event.target.value)} /></label>
      <label>Meta<input type="number" min="1" step="1" value={goalDraft} disabled={locked}
        onChange={event => setGoalDraft(event.target.value)} onBlur={event => updateManualValue('goal', event.target.value)} /></label>
      <strong>{percent}%</strong>
    </div> : <p className="habit-widget-progress-caption">{totalTasks ? `${doneTasks} de ${totalTasks} tarefas concluídas · ${percent}%` : 'Ainda não há tarefas na Agenda.'}</p>}
    {validationError && <p className="habit-widget-feedback" role="alert">{validationError}</p>}
  </section>
}

function StarRatingWidget({ data, locked, onDataChange }: {
  data: Record<string, unknown>
  locked: boolean
  onDataChange: (data: Record<string, unknown>) => void
}) {
  const value = typeof data.rating === 'number' && data.rating >= 1 && data.rating <= 5 ? data.rating : 0
  return <section className="habit-widget habit-widget-stars" aria-label="Avaliação em estrelas">
    <header><span className="habit-widget-icon"><Star size={16} /></span><div><h3>Hoje, em estrelas</h3><small>{value ? `${value} de 5 · salvo na folha` : 'Escolha uma nota'}</small></div><span className="habit-widget-flower" aria-hidden="true">✿</span></header>
    <div className="habit-widget-star-row" role="radiogroup" aria-label="Avaliação de uma a cinco estrelas">
      {[1, 2, 3, 4, 5].map(rating => <button type="button" key={rating} role="radio" aria-checked={value === rating} aria-label={`${rating} ${rating === 1 ? 'estrela' : 'estrelas'}`} disabled={locked}
        className={rating <= value ? 'is-filled' : ''} onClick={() => onDataChange({ ...data, rating })}>
        <Star size={24} strokeWidth={1.6} fill={rating <= value ? 'currentColor' : 'transparent'} />
      </button>)}
    </div>
  </section>
}

function TimeControlWidget({ data, locked, onDataChange }: {
  data: Record<string, unknown>
  locked: boolean
  onDataChange: (data: Record<string, unknown>) => void
}) {
  const durationSeconds = typeof data.durationSeconds === 'number' && data.durationSeconds >= 60
    ? Math.floor(data.durationSeconds)
    : 25 * 60
  const running = data.running === true && typeof data.endsAt === 'number'
  const [now, setNow] = useState(0)
  const storedRemaining = typeof data.remainingSeconds === 'number' ? Math.max(0, Math.floor(data.remainingSeconds)) : durationSeconds
  const remaining = running && now > 0 ? Math.max(0, Math.ceil(((data.endsAt as number) - now) / 1000)) : storedRemaining
  const [minutesDraft, setMinutesDraft] = useState(String(Math.round(durationSeconds / 60)))
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (!running) return
    const firstUpdate = window.setTimeout(() => setNow(Date.now()), 0)
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => { window.clearTimeout(firstUpdate); window.clearInterval(interval) }
  }, [running])

  useEffect(() => {
    if (!running || remaining > 0) return
    onDataChange({ ...data, running: false, endsAt: null, remainingSeconds: 0 })
  }, [data, onDataChange, remaining, running])

  function start() {
    const seconds = remaining > 0 ? remaining : durationSeconds
    const nowTime = Date.now()
    setNow(nowTime)
    onDataChange({ ...data, running: true, endsAt: nowTime + seconds * 1000, remainingSeconds: seconds, durationSeconds })
  }

  function pause() {
    onDataChange({ ...data, running: false, endsAt: null, remainingSeconds: remaining, durationSeconds })
  }

  function reset() {
    onDataChange({ ...data, running: false, endsAt: null, remainingSeconds: durationSeconds })
  }

  function updateDuration(raw: string) {
    setMinutesDraft(raw)
    const minutes = Number(raw)
    if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 240) {
      setValidationError('Escolha uma duração inteira entre 1 e 240 minutos.')
      return
    }
    setValidationError('')
    const seconds = minutes * 60
    onDataChange({ ...data, durationSeconds: seconds, running: false, endsAt: null, remainingSeconds: seconds })
  }

  const time = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
  return <section className="habit-widget habit-widget-time" aria-label="Controle de tempo">
    <header><span className="habit-widget-icon"><Timer size={16} /></span><div><h3>Tempo gentil</h3><small>{running ? 'em andamento' : 'pausa com intenção'}</small></div><span className="habit-widget-flower" aria-hidden="true">✿</span></header>
    <div className="habit-widget-timer" role="timer" aria-label={`Tempo restante ${time}`}>{time}</div>
    <div className="habit-widget-timer-actions">
      {running
        ? <button type="button" disabled={locked} onClick={pause}><Pause size={13} /> Pausar</button>
        : <button type="button" disabled={locked} onClick={start}><Play size={13} /> Iniciar</button>}
      <button type="button" disabled={locked} onClick={reset}><RotateCcw size={13} /> Reiniciar</button>
    </div>
    <label className="habit-widget-duration">Duração · minutos
      <input type="number" min="1" max="240" step="1" value={minutesDraft} disabled={locked || running}
        onChange={event => setMinutesDraft(event.target.value)} onBlur={event => updateDuration(event.target.value)} />
    </label>
    {validationError && <p className="habit-widget-feedback" role="alert">{validationError}</p>}
  </section>
}

export function HabitWidgetContent({ element, tasks, onDataChange }: {
  element: { element_type: string; data: Record<string, unknown>; locked: boolean }
  tasks: PlannerTask[]
  onDataChange: (data: Record<string, unknown>) => void
}) {
  if (element.element_type === 'widget:water-tracker') return <DailyRecordWidget locked={element.locked} kind="water" />
  if (element.element_type === 'widget:mood-tracker') return <DailyRecordWidget locked={element.locked} kind="mood" />
  if (element.element_type === 'widget:habit-tracker') return <HabitTrackerWidget locked={element.locked} />
  if (element.element_type === 'widget:progress-bar') return <ProgressWidget data={element.data} tasks={tasks} locked={element.locked} onDataChange={onDataChange} />
  if (element.element_type === 'widget:star-rating') return <StarRatingWidget data={element.data} locked={element.locked} onDataChange={onDataChange} />
  if (element.element_type === 'widget:time-control') return <TimeControlWidget data={element.data} locked={element.locked} onDataChange={onDataChange} />
  return null
}
