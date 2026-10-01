import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiRequest } from '../../services/api'
import { WeeklyJournalHydration } from './WeeklyJournalHydration'
import type { Habit, HabitCompletion } from '../Today/todayData'

type JournalTask = {
  id: number
  text: string
  done: boolean
  due_date: string | null
  due_at: string | null
  completed_at: string | null
  priority: 'low' | 'medium' | 'high'
}

type DailyEntry = {
  entry_date: string
  mood: string
  quick_note: string
  music_data: Record<string, unknown>
  reading_data: Record<string, unknown>
  watching_data: Record<string, unknown>
  photo_media_id: number | null
}

type WeeklyReview = {
  week_start: string
  priorities: string[]
  reflection: string
  goal: string
  updated_at: string | null
}

type JournalData = {
  tasks: JournalTask[]
  habits: Habit[]
  completions: HabitCompletion[]
  entries: Record<string, DailyEntry>
  review: WeeklyReview
}

const DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']
const MOODS = [
  { id: 'calm', label: 'calma' },
  { id: 'happy', label: 'feliz' },
  { id: 'tired', label: 'cansada' },
  { id: 'focused', label: 'focada' },
  { id: 'sensitive', label: 'sensível' },
]

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(key: string, amount: number) {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  date.setDate(date.getDate() + amount)
  return dateKey(date)
}

function weekDates(start: string) {
  return DAY_LABELS.map((label, index) => {
    const key = addDays(start, index)
    const [year, month, day] = key.split('-').map(Number)
    return { label, key, day: new Date(year, month - 1, day, 12).getDate() }
  })
}

function formatRange(start: string, end: string) {
  const [startYear, startMonth, startDay] = start.split('-').map(Number)
  const [endYear, endMonth, endDay] = end.split('-').map(Number)
  const first = new Date(startYear, startMonth - 1, startDay, 12)
  const last = new Date(endYear, endMonth - 1, endDay, 12)
  const left = first.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const right = last.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${left} — ${right}`
}

function getWeekNumber(start: string) {
  const [year, month, day] = start.split('-').map(Number)
  const thursday = new Date(Date.UTC(year, month - 1, day))
  thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7))
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4))
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7))
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 604800000)
}

function formatMonthHeading(start: string, end: string) {
  const [startYear, startMonth] = start.split('-').map(Number)
  const [endYear, endMonth] = end.split('-').map(Number)
  const monthLabel = (year: number, month: number) =>
    new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })
      .replace(/\.$/, '')
      .toLocaleUpperCase('pt-BR')
  const firstMonth = monthLabel(startYear, startMonth)
  if (startYear === endYear && startMonth === endMonth) return `${firstMonth} ${startYear}`
  const lastMonth = monthLabel(endYear, endMonth)
  return startYear === endYear
    ? `${firstMonth} / ${lastMonth} ${startYear}`
    : `${firstMonth} ${startYear} / ${lastMonth} ${endYear}`
}

function emptyReview(weekStart: string): WeeklyReview {
  return { week_start: weekStart, priorities: ['', '', ''], reflection: '', goal: '', updated_at: null }
}

function dateForTask(task: JournalTask) {
  if (task.due_date) return task.due_date
  if (!task.due_at) return null
  const date = new Date(task.due_at)
  return Number.isNaN(date.getTime()) ? null : dateKey(date)
}

export function WeeklyOpenJournal({ spreadSide, weekStart, onWeekChange, enabled = true }: {
  spreadSide?: 'left' | 'right'
  weekStart: string
  onWeekChange: (weekStart: string) => Promise<void>
  enabled?: boolean
}) {
  const dates = useMemo(() => weekDates(weekStart), [weekStart])
  const end = dates[6].key
  const [data, setData] = useState<JournalData | null>(null)
  const [completedLoadKey, setCompletedLoadKey] = useState('')
  const [loadFailure, setLoadFailure] = useState<{ key: string; message: string } | null>(null)
  const [actionError, setActionError] = useState('')
  const [savingTask, setSavingTask] = useState<number | null>(null)
  const [savingMood, setSavingMood] = useState<string | null>(null)
  const [savingHabit, setSavingHabit] = useState<string | null>(null)
  const [savingWeek, setSavingWeek] = useState(false)
  const [savingReview, setSavingReview] = useState(false)
  const [reviewDirty, setReviewDirty] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const loadKey = `${weekStart}:${loadAttempt}`
  const loadError = loadFailure?.key === loadKey ? loadFailure.message : ''
  const loading = enabled && !loadError && completedLoadKey !== loadKey

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    const includeTasks = spreadSide !== 'right'
    const includeCarePanels = spreadSide !== 'left'

    Promise.all([
      includeTasks ? apiRequest<JournalTask[]>(`/tasks?due_from=${weekStart}&due_to=${end}`) : Promise.resolve([] as JournalTask[]),
      includeCarePanels ? apiRequest<Habit[]>('/habits?active=true') : Promise.resolve([] as Habit[]),
      includeCarePanels ? apiRequest<HabitCompletion[]>(`/habit-completions?start=${weekStart}&end=${end}`) : Promise.resolve([] as HabitCompletion[]),
      includeCarePanels ? apiRequest<DailyEntry[]>(`/daily-entries?start=${weekStart}&end=${end}`) : Promise.resolve([] as DailyEntry[]),
      includeCarePanels ? apiRequest<WeeklyReview>(`/weekly-reviews/${weekStart}`) : Promise.resolve(emptyReview(weekStart)),
    ]).then(([tasks, habits, completions, entries, review]) => {
      if (cancelled) return
      setLoadFailure(null)
      setData({
        tasks,
        habits: habits.filter(habit => habit.active),
        completions,
        entries: Object.fromEntries(entries.map(entry => [entry.entry_date, entry])),
        review: { ...review, priorities: [...review.priorities] },
      })
    }).catch(error => {
      if (!cancelled) setLoadFailure({
        key: loadKey,
        message: error instanceof Error ? error.message : 'Não foi possível carregar os dados da semana.',
      })
    }).finally(() => {
      if (!cancelled) setCompletedLoadKey(loadKey)
    })

    return () => { cancelled = true }
  }, [enabled, end, loadAttempt, loadKey, spreadSide, weekStart])

  const completionKeys = useMemo(
    () => new Set(data?.completions.map(item => `${item.habit_id}:${item.completion_date}`) ?? []),
    [data?.completions],
  )
  const applicableHabits = useMemo(() => dates.map((date, dayIndex) => ({
    ...date,
    habits: (data?.habits ?? []).filter(habit => habit.days_of_week.includes(dayIndex)),
  })), [data?.habits, dates])
  const habitChecks = applicableHabits.reduce((sum, day) => sum + day.habits.length, 0)
  const completedHabitChecks = applicableHabits.reduce(
    (sum, day) => sum + day.habits.filter(habit => completionKeys.has(`${habit.id}:${day.key}`)).length,
    0,
  )
  const habitPercent = habitChecks ? Math.round(completedHabitChecks / habitChecks * 100) : 0
  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, JournalTask[]>()
    for (const task of data?.tasks ?? []) {
      const key = dateForTask(task)
      if (!key || key < weekStart || key > end) continue
      grouped.set(key, [...(grouped.get(key) ?? []), task])
    }
    for (const tasks of grouped.values()) tasks.sort((a, b) => Number(a.done) - Number(b.done) || a.id - b.id)
    return grouped
  }, [data?.tasks, end, weekStart])
  const completedTasks = (data?.tasks ?? []).filter(task => task.done).length
  const tasksCount = data?.tasks.length ?? 0
  const taskPercent = tasksCount ? Math.round(completedTasks / tasksCount * 100) : 0
  const journalBusy = savingTask !== null || savingMood !== null || savingHabit !== null || savingWeek || savingReview

  async function toggleTask(task: JournalTask) {
    if (!data || savingTask !== null) return
    setSavingTask(task.id)
    setActionError('')
    try {
      const updated = await apiRequest<JournalTask>(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ done: !task.done }),
      })
      setData(current => current ? {
        ...current,
        tasks: current.tasks.map(item => item.id === updated.id ? updated : item),
      } : current)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível atualizar a tarefa.')
    } finally {
      setSavingTask(null)
    }
  }

  async function updateMood(key: string, mood: string) {
    if (!data || savingMood !== null) return
    setSavingMood(key)
    setActionError('')
    const previous = data.entries[key]
    const payload: Omit<DailyEntry, 'entry_date'> = {
      mood,
      quick_note: previous?.quick_note ?? '',
      music_data: previous?.music_data ?? {},
      reading_data: previous?.reading_data ?? {},
      watching_data: previous?.watching_data ?? {},
      photo_media_id: previous?.photo_media_id ?? null,
    }
    try {
      const saved = await apiRequest<DailyEntry & { entry_date: string }>(`/daily-entries/${key}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      setData(current => current ? { ...current, entries: { ...current.entries, [saved.entry_date]: saved } } : current)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível salvar o humor do dia.')
    } finally {
      setSavingMood(null)
    }
  }

  async function toggleHabit(habitId: number, key: string, complete: boolean) {
    if (!data || savingHabit !== null) return
    const savingKey = `${habitId}:${key}`
    setSavingHabit(savingKey)
    setActionError('')
    try {
      if (complete) {
        await apiRequest<void>(`/habits/${habitId}/completions/${key}`, { method: 'DELETE' })
        setData(current => current ? {
          ...current,
          completions: current.completions.filter(item => !(item.habit_id === habitId && item.completion_date === key)),
        } : current)
      } else {
        const saved = await apiRequest<HabitCompletion>(`/habits/${habitId}/completions/${key}`, { method: 'PUT' })
        setData(current => current ? {
          ...current,
          completions: [...current.completions.filter(item => !(item.habit_id === habitId && item.completion_date === key)), saved],
        } : current)
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível atualizar o hábito.')
    } finally {
      setSavingHabit(null)
    }
  }

  function editReview(patch: Partial<WeeklyReview>) {
    setData(current => current ? { ...current, review: { ...current.review, ...patch } } : current)
    setReviewDirty(true)
    setActionError('')
  }

  async function saveReview() {
    if (!data || savingReview || !reviewDirty) return
    setSavingReview(true)
    setActionError('')
    try {
      const review = await apiRequest<WeeklyReview>(`/weekly-reviews/${weekStart}`, {
        method: 'PUT',
        body: JSON.stringify({
          priorities: data.review.priorities,
          reflection: data.review.reflection,
          goal: data.review.goal,
        }),
      })
      setData(current => current ? { ...current, review } : current)
      setReviewDirty(false)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível salvar a revisão semanal.')
    } finally {
      setSavingReview(false)
    }
  }

  async function changeWeek(next: string) {
    if (savingWeek) return
    setSavingWeek(true)
    setActionError('')
    try {
      await onWeekChange(next)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível guardar a semana escolhida.')
    } finally {
      setSavingWeek(false)
    }
  }

  return <section className={`tpl-open-journal ${spreadSide ? `is-spread-${spreadSide}` : ''}`}>
    <header className="tpl-open-journal-heading">
      <div className="tpl-open-journal-title">
        <span>{formatMonthHeading(weekStart, end)}</span>
        <h3>SEMANA {String(getWeekNumber(weekStart)).padStart(2, '0')} · {dates[0].day} → {dates[6].day}</h3>
      </div>
      <div className="tpl-open-journal-week">
        <button type="button" aria-label="Semana anterior" disabled={!enabled || journalBusy || reviewDirty} title={reviewDirty ? 'Salve a revisão antes de mudar de semana.' : undefined} onClick={() => void changeWeek(addDays(weekStart, -7))}><ChevronLeft size={15} aria-hidden="true" /></button>
        <time aria-label={`Período de ${formatRange(weekStart, end)}`}>{formatRange(weekStart, end)}</time>
        <button type="button" aria-label="Próxima semana" disabled={!enabled || journalBusy || reviewDirty} title={reviewDirty ? 'Salve a revisão antes de mudar de semana.' : undefined} onClick={() => void changeWeek(addDays(weekStart, 7))}><ChevronRight size={15} aria-hidden="true" /></button>
      </div>
    </header>

    {!enabled ? <p className="tpl-open-preview">Os dados da semana aparecem aqui quando o modelo estiver em uma página da Agenda.</p>
      : loading ? <p className="tpl-open-status" role="status">Carregando seus registros…</p>
        : loadError ? <p className="tpl-open-error" role="alert">{loadError}</p>
          : data && <div className="tpl-open-journal-spread">
            {spreadSide !== 'right' && <section className="tpl-open-page tpl-open-page-left">
              <header className="tpl-open-section-heading"><div><span>01 · ORGANIZAR</span><h4>Uma coisa de cada vez</h4></div><div className="tpl-open-progress-group"><span>{completedTasks}/{tasksCount} tarefas · {taskPercent}%</span><progress value={completedTasks} max={tasksCount || 1} aria-label="Progresso das tarefas da semana" /></div></header>
              <div className="tpl-open-days">
                {dates.map(date => {
                  const tasks = tasksByDate.get(date.key) ?? []
                  return <article className="tpl-open-day" key={date.key}>
                    <header><span>{date.label}</span><b>{String(date.day).padStart(2, '0')}</b><small>{tasks.filter(task => task.done).length}/{tasks.length}</small></header>
                    {tasks.length ? <ul>{tasks.map(task => <li key={task.id} className={task.done ? 'is-done' : ''}>
                      <input type="checkbox" checked={task.done} disabled={savingTask !== null} aria-label={`${task.done ? 'Reabrir' : 'Concluir'} tarefa: ${task.text}`} onChange={() => void toggleTask(task)} />
                      <span>{task.text}</span><small>{task.priority === 'high' ? 'alta' : task.priority === 'medium' ? 'média' : 'baixa'}</small>
                    </li>)}</ul> : <p className="tpl-open-empty">Sem tarefas com prazo</p>}
                  </article>
                })}
              </div>
              <footer className="tpl-open-task-summary"><span>As tarefas são compartilhadas com sua lista de tarefas.</span><strong>{completedTasks} concluídas nesta semana</strong></footer>
            </section>}

            {spreadSide !== 'left' && <section className="tpl-open-page tpl-open-page-right">
              <header className="tpl-open-section-heading"><div><span>02 · CUIDAR</span><h4>Pequenos passos também contam</h4></div><div className="tpl-open-progress-group"><span>{completedHabitChecks}/{habitChecks} hábitos · {habitPercent}%</span><progress value={completedHabitChecks} max={habitChecks || 1} aria-label="Progresso dos hábitos da semana" /></div></header>
              <div className="tpl-open-habits-scroll">
                <table className="tpl-open-habits">
                  <thead><tr><th scope="col">HÁBITO</th>{dates.map(date => <th scope="col" key={date.key}>{date.label}</th>)}</tr></thead>
                  <tbody>{data.habits.map(habit => <tr key={habit.id}>
                    <th scope="row" title={habit.name}>{habit.name}</th>
                    {dates.map((date, dayIndex) => {
                      const scheduled = habit.days_of_week.includes(dayIndex)
                      const complete = completionKeys.has(`${habit.id}:${date.key}`)
                      return <td key={date.key}>{scheduled
                        ? <button type="button" className={complete ? 'is-complete' : ''} aria-label={`${complete ? 'Desmarcar' : 'Marcar'} ${habit.name} em ${date.label}`} aria-pressed={complete} disabled={savingHabit !== null} onClick={() => void toggleHabit(habit.id, date.key, complete)}>{complete ? <Check size={11} strokeWidth={2.2} aria-hidden="true" /> : <span aria-hidden="true" />}</button>
                        : <span aria-label={`${habit.name} não previsto para ${date.label}`}>—</span>}</td>
                    })}
                  </tr>)}</tbody>
                </table>
                {!data.habits.length && <p className="tpl-open-empty">Nenhum hábito ativo para acompanhar.</p>}
              </div>
              <div className="tpl-open-moods">
                <h4>Como foi cada dia?</h4>
                {dates.map(date => <label key={date.key}>{date.label} · {String(date.day).padStart(2, '0')}
                  <select aria-label={`Humor em ${date.label} ${date.day}`} value={data.entries[date.key]?.mood ?? ''} disabled={savingMood !== null} onChange={event => { if (event.target.value) void updateMood(date.key, event.target.value) }}>
                    <option value="">Sem registro</option>
                    {MOODS.map(mood => <option key={mood.id} value={mood.id}>{mood.label}</option>)}
                  </select>
                </label>)}
              </div>
              <div className="tpl-open-review">
                <header><div><span>03 · PERCEBER</span><h4>Revisão da semana</h4></div><span>{reviewDirty ? 'Alterações não salvas' : data.review.updated_at ? 'Revisão salva' : 'Ainda não revisada'}</span></header>
                <div className="tpl-open-priorities">{data.review.priorities.map((priority, index) => <label key={index}>Prioridade {index + 1}<input maxLength={300} value={priority} disabled={savingReview} onChange={event => editReview({ priorities: data.review.priorities.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} /></label>)}</div>
                <label>Reflexão<textarea rows={2} maxLength={5000} value={data.review.reflection} disabled={savingReview} onChange={event => editReview({ reflection: event.target.value })} /></label>
                <label>Objetivo da próxima semana<input maxLength={500} value={data.review.goal} disabled={savingReview} onChange={event => editReview({ goal: event.target.value })} /></label>
                <button type="button" disabled={!reviewDirty || savingReview} onClick={() => void saveReview()}>{savingReview ? 'Salvando…' : 'Salvar revisão'}</button>
              </div>
              <WeeklyJournalHydration weekStart={weekStart} />
            </section>}
          </div>}

    {actionError && <p className="tpl-open-error" role="alert">{actionError}</p>}
    {loadError && <button type="button" className="tpl-open-retry" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Tentar novamente</button>}
  </section>
}
