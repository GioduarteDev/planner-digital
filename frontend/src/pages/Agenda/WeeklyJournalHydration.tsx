import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

type DailyWaterEntry = {
  entry_date: string
  mood: string
  quick_note: string
  music_data: Record<string, unknown>
  reading_data: Record<string, unknown>
  watching_data: Record<string, unknown>
  photo_media_id: number | null
  water_ml: number
}

const WEEKDAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']
const WATER_STEP_ML = 250
const VISUAL_GOAL_ML = 2000

function addDays(start: string, offset: number) {
  const [year, month, day] = start.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function longDate(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day, 12).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function safeWaterValue(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0
}

export function WeeklyJournalHydration({ weekStart }: { weekStart: string }) {
  const days = useMemo(() => WEEKDAYS.map((label, index) => ({
    label,
    key: addDays(weekStart, index),
  })), [weekStart])
  const weekEnd = days[6].key
  const loadKey = `${weekStart}:${weekEnd}`
  const [entries, setEntries] = useState<Record<string, number>>({})
  const [loadedKey, setLoadedKey] = useState('')
  const [failedLoad, setFailedLoad] = useState<{ key: string; message: string } | null>(null)
  const [savingDate, setSavingDate] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loadAttempt, setLoadAttempt] = useState(0)
  const requestKey = `${loadKey}:${loadAttempt}`
  const loading = loadedKey !== requestKey && failedLoad?.key !== requestKey
  const loadError = failedLoad?.key === requestKey ? failedLoad.message : ''

  useEffect(() => {
    let cancelled = false
    apiRequest<DailyWaterEntry[]>(`/daily-entries?start=${weekStart}&end=${weekEnd}`)
      .then(records => {
        if (cancelled) return
        setEntries(Object.fromEntries(records.map(entry => [entry.entry_date, safeWaterValue(entry.water_ml)])))
        setFailedLoad(null)
      })
      .catch(error => {
        if (!cancelled) {
          setFailedLoad({
            key: requestKey,
            message: error instanceof Error ? error.message : 'Não foi possível carregar a hidratação desta semana.',
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(requestKey)
      })
    return () => { cancelled = true }
  }, [loadKey, requestKey, weekEnd, weekStart])

  async function saveValue(key: string, value: number) {
    if (savingDate !== null) return
    if (!Number.isSafeInteger(value) || value < 0) {
      setSaveError('Informe um número inteiro igual ou maior que zero.')
      return
    }
    setSavingDate(key)
    setSaveError('')
    const nextValue = safeWaterValue(value)
    try {
      const saved = await apiRequest<DailyWaterEntry>(`/daily-entries/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ water_ml: nextValue }),
      })
      setEntries(current => ({ ...current, [key]: safeWaterValue(saved.water_ml) }))
      setDrafts(current => {
        const next = { ...current }
        delete next[key]
        return next
      })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar a hidratação.')
    } finally {
      setSavingDate(null)
    }
  }

  function saveDraft(key: string) {
    const draft = drafts[key]
    if (draft === undefined || draft.trim() === '') {
      setDrafts(current => {
        const next = { ...current }
        delete next[key]
        return next
      })
      return
    }
    const value = Number(draft)
    if (!Number.isSafeInteger(value) || value < 0) {
      setSaveError('Informe um número inteiro igual ou maior que zero.')
      return
    }
    void saveValue(key, value)
  }

  return <section className="tpl-open-hydration" aria-label="Hidratação semanal">
    <header><div><span>04 · HIDRATAÇÃO</span><h4>Um registro tranquilo, dia a dia</h4></div><span>META VISUAL · {VISUAL_GOAL_ML} ml</span></header>
    {loading ? <p className="tpl-open-water-status" role="status">Carregando hidratação…</p>
      : loadError ? <div className="tpl-open-water-error" role="alert"><span>{loadError}</span><button type="button" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Tentar novamente</button></div>
        : <div className="tpl-open-water-days">
          {days.map(day => {
            const current = safeWaterValue(entries[day.key])
            const accessibleDate = longDate(day.key)
            const saving = savingDate === day.key
            const draft = drafts[day.key]
            const displayed = draft ?? String(current)
            return <article key={day.key} className="tpl-open-water-day">
              <h5>{day.label}</h5>
                      <span className="tpl-open-water-count" aria-label={`${current} ml registrados em ${accessibleDate}`}>{current} / {VISUAL_GOAL_ML} ml</span>
              <div className="tpl-open-water-marks" aria-hidden="true">
                {Array.from({ length: VISUAL_GOAL_ML / WATER_STEP_ML }, (_, index) => <i className={current >= (index + 1) * WATER_STEP_ML ? 'is-filled' : ''} key={index} />)}
              </div>
                      <label className="tpl-open-water-correction"><span className="tpl-open-water-sr-only">Total em ml</span>
                <input type="number" min="0" step={WATER_STEP_ML} value={displayed} disabled={savingDate !== null} aria-label={`Total de hidratação em ml para ${accessibleDate}`} onChange={event => setDrafts(currentDrafts => ({ ...currentDrafts, [day.key]: event.target.value }))} onBlur={() => saveDraft(day.key)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
              </label>
              <div className="tpl-open-water-actions">
                <button type="button" aria-label={`Remover ${WATER_STEP_ML} ml de ${accessibleDate}`} disabled={saving || current < WATER_STEP_ML || savingDate !== null} onClick={() => void saveValue(day.key, Math.max(0, current - WATER_STEP_ML))}>−250</button>
                        <button type="button" aria-label={`Adicionar ${WATER_STEP_ML} ml em ${accessibleDate}`} disabled={savingDate !== null} onClick={() => void saveValue(day.key, current + WATER_STEP_ML)}>+250</button>
              </div>
              {saving && <span className="tpl-open-water-saving" role="status">Salvando…</span>}
            </article>
          })}
        </div>}
    {saveError && <p className="tpl-open-water-error" role="alert">{saveError}</p>}
  </section>
}
