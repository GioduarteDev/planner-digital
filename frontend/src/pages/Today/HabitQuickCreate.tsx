import { useState } from 'react'

import {
  createHabit,
  type Habit,
} from './todayData'

type HabitQuickCreateProps = {
  currentWeekday: number
  onCreated: (habit: Habit) => void
}

const weekdays = [
  { value: 0, label: 'Seg' },
  { value: 1, label: 'Ter' },
  { value: 2, label: 'Qua' },
  { value: 3, label: 'Qui' },
  { value: 4, label: 'Sex' },
  { value: 5, label: 'Sáb' },
  { value: 6, label: 'Dom' },
]

function HabitQuickCreate({
  currentWeekday,
  onCreated,
}: HabitQuickCreateProps) {
  const [name, setName] = useState('')

  const [selectedDays, setSelectedDays] =
    useState<number[]>([
      currentWeekday,
    ])

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  function toggleDay(
    day: number,
  ) {
    setSelectedDays(current => {
      if (
        current.includes(day)
      ) {
        if (
          current.length === 1
        ) {
          return current
        }

        return current.filter(
          item => item !== day,
        )
      }

      return [
        ...current,
        day,
      ].sort(
        (a, b) => a - b,
      )
    })
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const cleanName =
      name.trim()

    if (!cleanName) {
      setError(
        'Dê um nome ao hábito.',
      )

      return
    }

    if (!selectedDays.length) {
      setError(
        'Escolha pelo menos um dia.',
      )

      return
    }

    setSaving(true)
    setError('')

    try {
      const created =
        await createHabit({
          name: cleanName,

          description: '',

          days_of_week:
            selectedDays,

          time_of_day: null,

          color: '#9CA362',
        })

      onCreated(created)

      setName('')

      setSelectedDays([
        currentWeekday,
      ])
    } catch {
      setError(
        'Não foi possível criar o hábito.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="today-habit-create"
      onSubmit={
        handleSubmit
      }
    >
      <span className="today-habit-create-title">
        + novo hábito
      </span>

      <input
        value={name}
        maxLength={200}
        placeholder="Ex.: caminhar 20 min"
        disabled={saving}
        onChange={
          event =>
            setName(
              event.target.value,
            )
        }
      />

      <div className="today-habit-days">
        {weekdays.map(
          day => (
            <button
              key={
                day.value
              }
              type="button"
              className={
                selectedDays.includes(
                  day.value,
                )
                  ? 'is-selected'
                  : ''
              }
              aria-pressed={
                selectedDays.includes(
                  day.value,
                )
              }
              disabled={
                saving
              }
              onClick={() =>
                toggleDay(
                  day.value,
                )
              }
            >
              {day.label}
            </button>
          ),
        )}
      </div>

      <button
        className="today-habit-save"
        type="submit"
        disabled={
          saving ||
          !name.trim()
        }
      >
        {saving
          ? 'salvando...'
          : 'adicionar'}
      </button>

      {error && (
        <small
          className="today-habit-create-error"
          role="alert"
        >
          {error}
        </small>
      )}
    </form>
  )
}

export default HabitQuickCreate