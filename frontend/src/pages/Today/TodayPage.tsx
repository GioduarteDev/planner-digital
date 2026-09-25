import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  BookOpen,
  CalendarDays,
  Check,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Film,
  Focus,
  GraduationCap,
  Heart,
  LibraryBig,
  Moon,
  Music2,
  Pencil,
  PencilLine,
  Smile,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'

import {
  apiRequest,
  API_URL,
  getCsrfToken,
} from '../../services/api'

import {
  WeatherWidget,
  MiniCalendar,
  TodayTasks,
} from './TodayPieces'

import HabitQuickCreate from './HabitQuickCreate'

import {
  completeHabit,
  dateKey,
  deleteHabit,
  emptyMoment,
  loadHabitCompletions,
  loadHabitsForDate,
  loadMoment,
  quoteForDate,
  saveMoment,
  uncompleteHabit,
  updateHabit,
  type Event,
  type Habit,
  type HabitCompletion,
  type Media,
  type Moment,
  type Profile,
  type Study,
  type Task,
} from './todayData'

import './TodayPage.css'

const moods = [
  { id: 'calm', label: 'calma', Icon: Cloud },
  { id: 'happy', label: 'feliz', Icon: Smile },
  { id: 'tired', label: 'cansada', Icon: Moon },
  { id: 'focused', label: 'focada', Icon: Focus },
  { id: 'sensitive', label: 'sensível', Icon: Heart },
]

const weekdays = [
  { value: 0, label: 'Seg' },
  { value: 1, label: 'Ter' },
  { value: 2, label: 'Qua' },
  { value: 3, label: 'Qui' },
  { value: 4, label: 'Sex' },
  { value: 5, label: 'Sáb' },
  { value: 6, label: 'Dom' },
]

type MissionTab =
  | 'main'
  | 'habits'
  | 'mood'

function startOfLocalDay(
  date: Date,
) {
  const copy =
    new Date(date)

  copy.setHours(
    0,
    0,
    0,
    0,
  )

  return copy
}

const greeting = (
  hour: number,
) =>
  hour < 12
    ? 'Bom dia'
    : hour < 18
      ? 'Boa tarde'
      : 'Boa noite'

function TodayPage() {
  const now =
    new Date()

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState<Date>(() =>
      startOfLocalDay(
        new Date(),
      ),
    )

  const key =
    dateKey(
      selectedDate,
    )

  const todayKey =
    dateKey(now)

  const isViewingToday =
    key === todayKey

  const quote =
    quoteForDate(key)

  const selectedWeekday =
    selectedDate.getDay() ===
    0
      ? 6
      : selectedDate.getDay() -
        1

  const [
    profile,
    setProfile,
  ] =
    useState<
      Profile | null
    >(null)

  const [
    tasks,
    setTasks,
  ] =
    useState<Task[]>([])

  const [
    events,
    setEvents,
  ] =
    useState<Event[]>([])

  const [
    studies,
    setStudies,
  ] =
    useState<Study[]>([])

  const [
    media,
    setMedia,
  ] =
    useState<Media[]>([])

  const [
    habits,
    setHabits,
  ] =
    useState<Habit[]>([])

  const [
    habitCompletions,
    setHabitCompletions,
  ] =
    useState<
      HabitCompletion[]
    >([])

  const [
    habitBusyId,
    setHabitBusyId,
  ] =
    useState<
      number | null
    >(null)

  const [
    editingHabitId,
    setEditingHabitId,
  ] =
    useState<
      number | null
    >(null)

  const [
    editHabitName,
    setEditHabitName,
  ] =
    useState('')

  const [
    editHabitDays,
    setEditHabitDays,
  ] =
    useState<number[]>([])

  const [
    missionTab,
    setMissionTab,
  ] =
    useState<MissionTab>(
      'main',
    )

  const [
    moment,
    setMoment,
  ] =
    useState<Moment>({
      ...emptyMoment,
    })

  const momentRef =
    useRef<Moment>({
      ...emptyMoment,
    })

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    saveState,
    setSaveState,
  ] =
    useState<
      | 'saved'
      | 'saving'
      | 'error'
    >('saved')

  const [
    photoUploading,
    setPhotoUploading,
  ] =
    useState(false)

  const saveTimer =
    useRef<
      number | undefined
    >(undefined)

  const unsaved =
    useRef<
      Moment | null
    >(null)

  const isLoaded =
    useRef(false)

  useEffect(() => {
    let cancelled =
      false

    isLoaded.current =
      false

    const blankMoment = {
      ...emptyMoment,
    }

    void Promise.resolve().then(
      () => {
        if (cancelled) {
          return
        }

        setLoading(true)
        setError('')
        setSaveState(
          'saved',
        )
        setMoment(
          blankMoment,
        )
        momentRef.current =
          blankMoment
      },
    )

    Promise.allSettled([
      apiRequest<Profile>(
        '/profile',
      ),

      apiRequest<Task[]>(
        '/tasks',
      ),

      apiRequest<Event[]>(
        '/events',
      ),

      apiRequest<Study[]>(
        '/studies',
      ),

      apiRequest<Media[]>(
        '/library/media',
      ),

      loadHabitsForDate(
        key,
      ),

      loadHabitCompletions(
        key,
      ),
    ]).then(
      async results => {
        if (cancelled) {
          return
        }

        const [
          profileResult,
          tasksResult,
          eventsResult,
          studiesResult,
          mediaResult,
          habitsResult,
          habitCompletionsResult,
        ] = results

        if (
          profileResult.status ===
          'fulfilled'
        ) {
          const loaded =
            await loadMoment(
              profileResult
                .value
                .settings ??
                {},
              key,
            )

          if (cancelled) {
            return
          }

          setProfile(
            profileResult.value,
          )

          setMoment(
            loaded,
          )

          momentRef.current =
            loaded

          isLoaded.current =
            true
        } else {
          setError(
            'Não foi possível carregar o perfil. Tente atualizar a página.',
          )
        }

        if (
          tasksResult.status ===
          'fulfilled'
        ) {
          setTasks(
            tasksResult.value,
          )
        }

        if (
          eventsResult.status ===
          'fulfilled'
        ) {
          setEvents(
            eventsResult.value,
          )
        }

        if (
          studiesResult.status ===
          'fulfilled'
        ) {
          setStudies(
            studiesResult.value,
          )
        }

        if (
          mediaResult.status ===
          'fulfilled'
        ) {
          setMedia(
            mediaResult.value.filter(
              item =>
                item.media_type ===
                'image',
            ),
          )
        }

        if (
          habitsResult.status ===
          'fulfilled'
        ) {
          setHabits(
            habitsResult.value,
          )
        } else {
          setHabits([])
        }

        if (
          habitCompletionsResult.status ===
          'fulfilled'
        ) {
          setHabitCompletions(
            habitCompletionsResult.value,
          )
        } else {
          setHabitCompletions(
            [],
          )
        }

        setLoading(false)
      },
    )

    return () => {
      cancelled = true

      window.clearTimeout(
        saveTimer.current,
      )

      const pendingMoment =
        unsaved.current

      unsaved.current =
        null

      if (
        pendingMoment
      ) {
        void saveMoment(
          key,
          pendingMoment,
        )
      }
    }
  }, [key])

  function moveDate(
    amount: number,
  ) {
    setSelectedDate(
      current => {
        const next =
          new Date(
            current,
          )

        next.setDate(
          next.getDate() +
            amount,
        )

        return startOfLocalDay(
          next,
        )
      },
    )

    setEditingHabitId(
      null,
    )
  }

  function goToToday() {
    setSelectedDate(
      startOfLocalDay(
        new Date(),
      ),
    )

    setEditingHabitId(
      null,
    )
  }

  function updateMoment(
    patch: Partial<Moment>,
  ) {
    if (
      !isLoaded.current
    ) {
      return
    }

    const next = {
      ...momentRef.current,
      ...patch,
    }

    momentRef.current =
      next

    setMoment(next)

    setSaveState(
      'saving',
    )

    unsaved.current =
      next

    window.clearTimeout(
      saveTimer.current,
    )

    saveTimer.current =
      window.setTimeout(
        () => {
          saveMoment(
            key,
            next,
          )
            .then(() => {
              if (
                unsaved.current ===
                next
              ) {
                unsaved.current =
                  null
              }

              setSaveState(
                'saved',
              )
            })
            .catch(() => {
              setSaveState(
                'error',
              )
            })
        },
        500,
      )
  }

  async function toggleTask(
    id: number,
  ) {
    const task =
      tasks.find(
        item =>
          item.id === id,
      )

    if (!task) {
      return
    }

    setTasks(current =>
      current.map(item =>
        item.id === id
          ? {
              ...item,
              done:
                !item.done,
            }
          : item,
      ),
    )

    try {
      await apiRequest(
        `/tasks/${id}`,
        {
          method:
            'PATCH',

          body:
            JSON.stringify({
              done:
                !task.done,
            }),
        },
      )
    } catch {
      setTasks(current =>
        current.map(
          item =>
            item.id ===
            id
              ? {
                  ...item,
                  done:
                    task.done,
                }
              : item,
        ),
      )

      setError(
        'Não foi possível atualizar a tarefa.',
      )
    }
  }

  async function toggleHabitCompletion(
    habitId: number,
  ) {
    if (
      habitBusyId !==
      null
    ) {
      return
    }

    const existing =
      habitCompletions.find(
        completion =>
          completion.habit_id ===
          habitId,
      )

    setHabitBusyId(
      habitId,
    )

    setError('')

    try {
      if (existing) {
        await uncompleteHabit(
          habitId,
          key,
        )

        setHabitCompletions(
          current =>
            current.filter(
              completion =>
                completion.habit_id !==
                habitId,
            ),
        )
      } else {
        const created =
          await completeHabit(
            habitId,
            key,
          )

        setHabitCompletions(
          current => [
            ...current,
            created,
          ],
        )
      }
    } catch {
      setError(
        'Não foi possível atualizar o hábito.',
      )
    } finally {
      setHabitBusyId(
        null,
      )
    }
  }

  function startEditingHabit(
    habit: Habit,
  ) {
    setEditingHabitId(
      habit.id,
    )

    setEditHabitName(
      habit.name,
    )

    setEditHabitDays(
      [
        ...habit.days_of_week,
      ],
    )

    setError('')
  }

  function cancelEditingHabit() {
    setEditingHabitId(
      null,
    )

    setEditHabitName(
      '',
    )

    setEditHabitDays(
      [],
    )
  }

  function toggleEditHabitDay(
    day: number,
  ) {
    setEditHabitDays(
      current => {
        if (
          current.includes(
            day,
          )
        ) {
          if (
            current.length ===
            1
          ) {
            return current
          }

          return current.filter(
            item =>
              item !== day,
          )
        }

        return [
          ...current,
          day,
        ].sort(
          (
            a,
            b,
          ) =>
            a - b,
        )
      },
    )
  }

  async function saveEditedHabit(
    habitId: number,
  ) {
    const cleanName =
      editHabitName.trim()

    if (!cleanName) {
      setError(
        'Dê um nome ao hábito.',
      )

      return
    }

    if (
      !editHabitDays.length
    ) {
      setError(
        'Escolha pelo menos um dia para o hábito.',
      )

      return
    }

    if (
      habitBusyId !==
      null
    ) {
      return
    }

    setHabitBusyId(
      habitId,
    )

    setError('')

    try {
      const updated =
        await updateHabit(
          habitId,
          {
            name:
              cleanName,

            days_of_week:
              editHabitDays,
          },
        )

      if (
        updated.active &&
        updated.days_of_week.includes(
          selectedWeekday,
        )
      ) {
        setHabits(
          current =>
            current.map(
              habit =>
                habit.id ===
                updated.id
                  ? updated
                  : habit,
            ),
        )
      } else {
        setHabits(
          current =>
            current.filter(
              habit =>
                habit.id !==
                updated.id,
            ),
        )
      }

      cancelEditingHabit()
    } catch {
      setError(
        'Não foi possível editar o hábito.',
      )
    } finally {
      setHabitBusyId(
        null,
      )
    }
  }

  async function removeHabit(
    habit: Habit,
  ) {
    const confirmed =
      window.confirm(
        `Excluir o hábito "${habit.name}"?`,
      )

    if (
      !confirmed ||
      habitBusyId !==
        null
    ) {
      return
    }

    setHabitBusyId(
      habit.id,
    )

    setError('')

    try {
      await deleteHabit(
        habit.id,
      )

      setHabits(
        current =>
          current.filter(
            item =>
              item.id !==
              habit.id,
          ),
      )

      setHabitCompletions(
        current =>
          current.filter(
            completion =>
              completion.habit_id !==
              habit.id,
          ),
      )

      if (
        editingHabitId ===
        habit.id
      ) {
        cancelEditingHabit()
      }
    } catch {
      setError(
        'Não foi possível excluir o hábito.',
      )
    } finally {
      setHabitBusyId(
        null,
      )
    }
  }

  async function uploadPhoto(
    file?: File,
  ) {
    if (!file) {
      return
    }

    if (
      ![
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ].includes(
        file.type,
      ) ||
      file.size >
        10 *
          1024 *
          1024
    ) {
      setError(
        'Escolha uma imagem JPG, PNG, WebP ou GIF de até 10 MB.',
      )

      return
    }

    setPhotoUploading(
      true,
    )

    setError('')

    try {
      const body =
        new FormData()

      body.append(
        'media_type',
        'image',
      )

      body.append(
        'file',
        file,
      )

      const response =
        await fetch(
          `${API_URL}/library/media`,
          {
            method:
              'POST',

            credentials:
              'include',

            headers: {
              'X-CSRF-Token':
                getCsrfToken() ??
                '',
            },

            body,
          },
        )

      if (
        !response.ok
      ) {
        throw new Error(
          'Não foi possível enviar a foto.',
        )
      }

      const created =
        (await response.json()) as Media

      setMedia(
        current => [
          ...current,
          created,
        ],
      )

      updateMoment({
        photoId:
          created.id,
      })
    } catch (
      caught
    ) {
      setError(
        caught instanceof
        Error
          ? caught.message
          : 'Não foi possível enviar a foto.',
      )
    } finally {
      setPhotoUploading(
        false,
      )
    }
  }

  const upcoming =
    events
      .filter(
        event =>
          new Date(
            event.starts_at,
          ).getTime() >=
          selectedDate.getTime(),
      )
      .sort(
        (a, b) =>
          a.starts_at.localeCompare(
            b.starts_at,
          ),
      )
      .slice(
        0,
        3,
      )

  const todayStudy =
    studies.filter(
      study =>
        study.study_date ===
        key,
    )

  const studyMinutes =
    todayStudy.reduce(
      (
        sum,
        study,
      ) =>
        sum +
        study.duration_minutes,
      0,
    )

  const monthPrefix =
    key.slice(
      0,
      7,
    )

  const monthStudyMinutes =
    studies
      .filter(
        study =>
          study.study_date.startsWith(
            monthPrefix,
          ),
      )
      .reduce(
        (
          sum,
          study,
        ) =>
          sum +
          study.duration_minutes,
        0,
      )

  const monthCompletedTasks =
    tasks.filter(
      task =>
        task.done &&
        task.due_date?.startsWith(
          monthPrefix,
        ),
    ).length

  const selectedPhoto =
    media.find(
      item =>
        item.id ===
        moment.photoId,
    )

  const dayTasks =
    tasks.filter(
      task =>
        task.due_date ===
        key,
    )

  const openDayTasks =
    dayTasks.filter(
      task =>
        !task.done,
    )

  const doneDayTasks =
    dayTasks.filter(
      task =>
        task.done,
    )

  const completedHabitIds =
    new Set(
      habitCompletions.map(
        completion =>
          completion.habit_id,
      ),
    )

  const completedHabits =
    habits.filter(
      habit =>
        completedHabitIds.has(
          habit.id,
        ),
    )

  const habitProgress =
    habits.length
      ? Math.round(
          (completedHabits.length /
            habits.length) *
            100,
        )
      : 0

  const currentMood =
    moods.find(
      mood =>
        mood.id ===
        moment.mood,
    )

  return (
    <main className="today-v2">
      <div className="today-desktop-shell">
        <div className="today-window-chrome">
          <div
            className="today-window-dots"
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
          </div>

          <span>
            my little day.exe
          </span>

          <small>
            matcha planner
          </small>
        </div>

        <div className="today-dashboard-layout">
          <nav
            className="today-dock"
            aria-label="Atalhos do meu dia"
          >
            <Link to="/calendar">
              <CalendarDays
                size={18}
              />
              <span>
                Agenda
              </span>
            </Link>

            <Link to="/tasks">
              <CheckSquare2
                size={18}
              />
              <span>
                Tarefas
              </span>
            </Link>

            <Link to="/studies">
              <GraduationCap
                size={18}
              />
              <span>
                Estudos
              </span>
            </Link>

            <Link to="/stationery">
              <LibraryBig
                size={18}
              />
              <span>
                Papelaria
              </span>
            </Link>

            <i
              className="today-dock-mascot"
              aria-hidden="true"
            >
              :)
            </i>
          </nav>

          <div className="today-inner">
            <header className="today-hero">
              <div className="today-hero-copy">
                <span className="today-eyebrow">
                  MATCHA PLANNER / O MEU DIA
                </span>

                <p className="today-full-date">
                  {selectedDate.toLocaleDateString(
                    'pt-BR',
                    {
                      weekday:
                        'long',
                      day:
                        'numeric',
                      month:
                        'long',
                      year:
                        'numeric',
                    },
                  )}
                </p>

                <h1>
  {greeting(now.getHours())}

  <span className="today-heart">
    {' '}
    ♡
  </span>
</h1>

                <p className="today-hero-subtitle">
                  {isViewingToday
                    ? 'Um cantinho para viver o dia no seu ritmo.'
                    : 'Revisite seus dias no seu próprio ritmo.'}
                </p>
              </div>

              <WeatherWidget />
            </header>

            {error && (
              <p
                className="today-page-error"
                role="alert"
              >
                {error}
              </p>
            )}

            <section
              className="today-command-center"
              aria-labelledby="strategy-title"
            >
              <aside className="today-system-panel">
                <span className="today-os-caption">
                  welcome, pilot
                </span>

                <div className="today-date-nav">
                  <button
                    type="button"
                    aria-label="Dia anterior"
                    title="Dia anterior"
                    onClick={() =>
                      moveDate(-1)
                    }
                  >
                    <ChevronLeft
                      size={16}
                    />
                  </button>

                  <div className="today-clock">
                    <b>
                      {String(
                        selectedDate.getDate(),
                      ).padStart(
                        2,
                        '0',
                      )}
                    </b>

                    <b>
                      {String(
                        now.getHours(),
                      ).padStart(
                        2,
                        '0',
                      )}

                      <small>
                        :
                        {String(
                          now.getMinutes(),
                        ).padStart(
                          2,
                          '0',
                        )}
                      </small>
                    </b>
                  </div>

                  <button
                    type="button"
                    aria-label="Próximo dia"
                    title="Próximo dia"
                    onClick={() =>
                      moveDate(1)
                    }
                  >
                    <ChevronRight
                      size={16}
                    />
                  </button>
                </div>

                <button
                  type="button"
                  className={
                    isViewingToday
                      ? 'today-date-today is-active'
                      : 'today-date-today'
                  }
                  disabled={
                    isViewingToday
                  }
                  onClick={
                    goToToday
                  }
                >
                  {isViewingToday
                    ? 'HOJE'
                    : 'VOLTAR PARA HOJE'}
                </button>

                <div className="today-soft-photo">
                  <span>
                    {quote.text}
                  </span>
                </div>

                <h3>
                  System info
                </h3>

                {[
                  [
                    'focus',
                    openDayTasks.length
                      ? 72
                      : 38,
                  ],
                  [
                    'energy',
                    moment.mood
                      ? 78
                      : 54,
                  ],
                  [
                    'progress',
                    dayTasks.length
                      ? Math.round(
                          (doneDayTasks.length /
                            dayTasks.length) *
                            100,
                        )
                      : 0,
                  ],
                ].map(
                  ([
                    label,
                    value,
                  ]) => (
                    <div
                      className="today-system-meter"
                      key={
                        label
                      }
                    >
                      <span>
                        {label}
                      </span>

                      <i>
                        <b
                          style={{
                            width:
                              `${value}%`,
                          }}
                        />
                      </i>
                    </div>
                  ),
                )}
              </aside>

              <div className="today-console">
                <div className="today-console-status">
                  <span>
                    xp{' '}
                    {studyMinutes ||
                      1}{' '}
                    min
                  </span>

                  <i>
                    LVL 01
                  </i>

                  <span>
                    {missionTab ===
                    'habits'
                      ? `${completedHabits.length}/${habits.length}`
                      : `${doneDayTasks.length}/${dayTasks.length || 0}`}
                  </span>
                </div>

                <div className="today-console-screen">
                  <header>
                    <span>
                      ME.WEEKLY.NO.
                      {String(
                        selectedDate.getDate(),
                      ).padStart(
                        3,
                        '0',
                      )}
                    </span>

                    <h2 id="strategy-title">
                      MAIN TASK STRATEGY
                    </h2>

                    <small>
                      {key.replaceAll(
                        '-',
                        '.',
                      )}
                    </small>
                  </header>

                  <div className="today-mission-layout">
                    <nav>
                      <button
                        type="button"
                        className={
                          missionTab ===
                          'main'
                            ? 'is-active'
                            : ''
                        }
                        aria-pressed={
                          missionTab ===
                          'main'
                        }
                        onClick={() =>
                          setMissionTab(
                            'main',
                          )
                        }
                      >
                        MAIN
                      </button>

                      <button
                        type="button"
                        className={
                          missionTab ===
                          'habits'
                            ? 'is-active'
                            : ''
                        }
                        aria-pressed={
                          missionTab ===
                          'habits'
                        }
                        onClick={() =>
                          setMissionTab(
                            'habits',
                          )
                        }
                      >
                        HABITS
                      </button>

                      <button
                        type="button"
                        className={
                          missionTab ===
                          'mood'
                            ? 'is-active'
                            : ''
                        }
                        aria-pressed={
                          missionTab ===
                          'mood'
                        }
                        onClick={() =>
                          setMissionTab(
                            'mood',
                          )
                        }
                      >
                        MOOD
                      </button>
                    </nav>

                    <div className="today-mission-copy">
                      {missionTab ===
                        'main' && (
                        <>
                          <b>
                            Current stage
                          </b>

                          {openDayTasks
                            .slice(
                              0,
                              4,
                            )
                            .map(
                              task => (
                                <p
                                  key={
                                    task.id
                                  }
                                >
                                  -{' '}
                                  {
                                    task.text
                                  }
                                </p>
                              ),
                            )}

                          {!openDayTasks.length && (
                            <p>
                              - Nenhuma missão pendente neste dia.
                            </p>
                          )}

                          <div className="today-mission-progress">
                            <span>
                              progress (
                              {
                                doneDayTasks.length
                              }
                              /
                              {dayTasks.length ||
                                0}
                              )
                            </span>

                            <i>
                              <b
                                style={{
                                  width: `${
                                    dayTasks.length
                                      ? (doneDayTasks.length /
                                          dayTasks.length) *
                                        100
                                      : 0
                                  }%`,
                                }}
                              />
                            </i>
                          </div>

                          <strong>
                            Reward
                          </strong>

                          <div className="today-rewards">
                            <i>
                              XP
                            </i>
                            <i>
                              +
                            </i>
                            <i>
                              OK
                            </i>
                          </div>
                        </>
                      )}

                      {missionTab ===
                        'habits' && (
                        <>
                          <b>
                            Habits
                          </b>

                          {habits.length ? (
                            <div className="today-habit-list">
                              {habits.map(
                                habit => {
                                  const completed =
                                    completedHabitIds.has(
                                      habit.id,
                                    )

                                  const editing =
                                    editingHabitId ===
                                    habit.id

                                  if (
                                    editing
                                  ) {
                                    return (
                                      <div
                                        className="today-habit-edit-card"
                                        key={
                                          habit.id
                                        }
                                      >
                                        <input
                                          value={
                                            editHabitName
                                          }
                                          maxLength={
                                            200
                                          }
                                          disabled={
                                            habitBusyId ===
                                            habit.id
                                          }
                                          onChange={
                                            event =>
                                              setEditHabitName(
                                                event
                                                  .target
                                                  .value,
                                              )
                                          }
                                        />

                                        <div className="today-habit-edit-days">
                                          {weekdays.map(
                                            day => (
                                              <button
                                                key={
                                                  day.value
                                                }
                                                type="button"
                                                className={
                                                  editHabitDays.includes(
                                                    day.value,
                                                  )
                                                    ? 'is-selected'
                                                    : ''
                                                }
                                                aria-pressed={
                                                  editHabitDays.includes(
                                                    day.value,
                                                  )
                                                }
                                                disabled={
                                                  habitBusyId ===
                                                  habit.id
                                                }
                                                onClick={() =>
                                                  toggleEditHabitDay(
                                                    day.value,
                                                  )
                                                }
                                              >
                                                {
                                                  day.label
                                                }
                                              </button>
                                            ),
                                          )}
                                        </div>

                                        <div className="today-habit-edit-actions">
                                          <button
                                            type="button"
                                            disabled={
                                              habitBusyId ===
                                                habit.id ||
                                              !editHabitName.trim()
                                            }
                                            onClick={() =>
                                              void saveEditedHabit(
                                                habit.id,
                                              )
                                            }
                                          >
                                            <Check
                                              size={
                                                13
                                              }
                                            />
                                            salvar
                                          </button>

                                          <button
                                            type="button"
                                            disabled={
                                              habitBusyId ===
                                              habit.id
                                            }
                                            onClick={
                                              cancelEditingHabit
                                            }
                                          >
                                            <X
                                              size={
                                                13
                                              }
                                            />
                                            cancelar
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  }

                                  return (
                                    <div
                                      className="today-habit-row-shell"
                                      key={
                                        habit.id
                                      }
                                    >
                                      <button
                                        type="button"
                                        className={
                                          completed
                                            ? 'today-habit-row is-done'
                                            : 'today-habit-row'
                                        }
                                        aria-pressed={
                                          completed
                                        }
                                        disabled={
                                          habitBusyId ===
                                          habit.id
                                        }
                                        onClick={() =>
                                          void toggleHabitCompletion(
                                            habit.id,
                                          )
                                        }
                                      >
                                        <span
                                          className="today-habit-check"
                                          aria-hidden="true"
                                        >
                                          {completed
                                            ? '✓'
                                            : '○'}
                                        </span>

                                        <span>
                                          {
                                            habit.name
                                          }
                                        </span>
                                      </button>

                                      <button
                                        type="button"
                                        className="today-habit-icon-button"
                                        aria-label={`Editar ${habit.name}`}
                                        title="Editar hábito"
                                        disabled={
                                          habitBusyId !==
                                          null
                                        }
                                        onClick={() =>
                                          startEditingHabit(
                                            habit,
                                          )
                                        }
                                      >
                                        <Pencil
                                          size={
                                            13
                                          }
                                        />
                                      </button>

                                      <button
                                        type="button"
                                        className="today-habit-icon-button is-danger"
                                        aria-label={`Excluir ${habit.name}`}
                                        title="Excluir hábito"
                                        disabled={
                                          habitBusyId !==
                                          null
                                        }
                                        onClick={() =>
                                          void removeHabit(
                                            habit,
                                          )
                                        }
                                      >
                                        <Trash2
                                          size={
                                            13
                                          }
                                        />
                                      </button>
                                    </div>
                                  )
                                },
                              )}
                            </div>
                          ) : (
                            <p>
                              - Nenhum hábito previsto para este dia.
                            </p>
                          )}

                          <div className="today-mission-progress">
                            <span>
                              rhythm (
                              {
                                completedHabits.length
                              }
                              /
                              {
                                habits.length
                              }
                              )
                            </span>

                            <i>
                              <b
                                style={{
                                  width:
                                    `${habitProgress}%`,
                                }}
                              />
                            </i>
                          </div>

                          <HabitQuickCreate
                            currentWeekday={
                              selectedWeekday
                            }
                            onCreated={
                              habit => {
                                if (
                                  habit.active &&
                                  habit.days_of_week.includes(
                                    selectedWeekday,
                                  )
                                ) {
                                  setHabits(
                                    current => [
                                      ...current,
                                      habit,
                                    ],
                                  )
                                }
                              }
                            }
                          />

                          <strong>
                            Daily rhythm
                          </strong>

                          <div className="today-rewards">
                            <i>
                              {
                                completedHabits.length
                              }
                            </i>

                            <i>
                              /
                            </i>

                            <i>
                              {
                                habits.length
                              }
                            </i>
                          </div>
                        </>
                      )}

                      {missionTab ===
                        'mood' && (
                        <>
                          <b>
                            Current mood
                          </b>

                          {currentMood ? (
                            <>
                              <p>
                                - Humor registrado:{' '}
                                <strong>
                                  {
                                    currentMood.label
                                  }
                                </strong>
                              </p>

                              <p>
                                - Esse registro pertence a {selectedDate.toLocaleDateString(
                                  'pt-BR',
                                  {
                                    day:
                                      '2-digit',
                                    month:
                                      '2-digit',
                                  },
                                )}
                                .
                              </p>
                            </>
                          ) : (
                            <>
                              <p>
                                - Nenhum humor registrado neste dia.
                              </p>

                              <p>
                                - Você pode registrar em “Meu momento”.
                              </p>
                            </>
                          )}

                          <div className="today-mission-progress">
                            <span>
                              mood signal
                            </span>

                            <i>
                              <b
                                style={{
                                  width:
                                    moment.mood
                                      ? '100%'
                                      : '0%',
                                }}
                              />
                            </i>
                          </div>

                          <strong>
                            Status
                          </strong>

                          <div className="today-rewards">
                            <i>
                              {moment.mood
                                ? 'OK'
                                : '?'}
                            </i>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="today-console-controls">
                  <i className="today-dpad">
                    +
                  </i>

                  <span />
                  <span />

                  <b>
                    A
                  </b>

                  <b>
                    B
                  </b>
                </div>
              </div>

              <aside className="today-social-panel">
  <header>
    <span>
      moodgram
    </span>

    <b>
      {profile?.name
        .trim()
        .split(/\s+/)[0] ||
        'matcha'}
    </b>
  </header>

  <label
    className="today-social-photo today-social-photo-editable"
    title="Clique para trocar a foto"
  >
    {selectedPhoto ? (
      <img
        src={
          selectedPhoto.file_url.startsWith(
            'http',
          )
            ? selectedPhoto.file_url
            : `${API_URL}${selectedPhoto.file_url}`
        }
        alt={
          selectedPhoto.name
        }
      />
    ) : (
      <span>
        M

        <small>
          escolher momento
        </small>
      </span>
    )}

    <span className="today-social-photo-overlay">
      {photoUploading
        ? 'enviando...'
        : 'trocar foto'}
    </span>

    <input
      className="today-social-photo-input"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      disabled={
        photoUploading
      }
      onChange={
        event => {
          void uploadPhoto(
            event
              .target
              .files?.[0],
          )

          event.target.value =
            ''
        }
      }
    />
  </label>

  <div className="today-sound-wave">
    <i />
    <i />
    <i />
    <i />
    <i />
    <i />
    <i />
  </div>

  <div className="today-social-music-editor">
    <label>
      <span>
        música
      </span>

      <input
        value={
          moment.music
        }
        maxLength={200}
        placeholder="today soundtrack"
        onChange={
          event =>
            updateMoment({
              music:
                event.target
                  .value,
            })
        }
      />
    </label>

    <label>
      <span>
        artista
      </span>

      <input
        value={
          moment.artist
        }
        maxLength={200}
        placeholder="quem está tocando?"
        onChange={
          event =>
            updateMoment({
              artist:
                event.target
                  .value,
            })
        }
      />
    </label>

    <label>
      <span>
        álbum
      </span>

      <input
        value={
          moment.album
        }
        maxLength={200}
        placeholder="álbum"
        onChange={
          event =>
            updateMoment({
              album:
                event.target
                  .value,
            })
        }
      />
    </label>
  </div>

  <div className="today-player-controls">
    <span>
      PREV
    </span>

    <b>
      II
    </b>

    <span>
      NEXT
    </span>
  </div>

  <small className="today-social-save">
    {saveState === 'saving'
      ? 'salvando...'
      : saveState === 'error'
        ? 'erro ao salvar'
        : 'salvo!'}
  </small>
</aside>
            </section>

            <div className="today-top-layout">
              <div className="today-left-column">
                <MiniCalendar
                  tasks={
                    tasks
                  }
                  events={
                    events
                  }
                />

                <aside className="today-quote">
                  <span>
                    UM BILHETE PARA O DIA ·{' '}
                    {quote.category.toUpperCase()}
                  </span>

                  <p>
                    “{quote.text}”
                  </p>

                  <i>
                    ✳
                  </i>
                </aside>
              </div>

              <TodayTasks
                tasks={
                  dayTasks
                }
                onToggle={
                  toggleTask
                }
                loading={
                  loading
                }
              />
            </div>

            <section
              className="today-moment"
              aria-label="Meu momento"
            >
              <div className="today-moment-intro">
                <span className="today-eyebrow">
                  PEQUENOS RASTROS DO DIA
                </span>

                <h2>
                  Meu momento

                  <Sparkles
                    size={
                      22
                    }
                    strokeWidth={
                      1.5
                    }
                  />
                </h2>

                <p>
                  {selectedDate.toLocaleDateString(
                    'pt-BR',
                    {
                      day:
                        '2-digit',
                      month:
                        'long',
                    },
                  )}
                </p>

                <span
                  className="today-save-state"
                  role="status"
                >
                  {saveState ===
                  'saving'
                    ? 'Salvando…'
                    : saveState ===
                        'error'
                      ? 'Erro ao salvar. Edite novamente para tentar.'
                      : 'Salvo'}
                </span>
              </div>

              <div className="today-moment-layout">
                <div className="today-moment-details">
                  <div className="today-mood">
                    <strong>
                      Como você estava se sentindo?
                    </strong>

                    <div>
                      {moods.map(
                        ({
                          id,
                          label,
                          Icon,
                        }) => (
                          <button
                            type="button"
                            key={
                              id
                            }
                            className={
                              moment.mood ===
                              id
                                ? 'is-selected'
                                : ''
                            }
                            aria-pressed={
                              moment.mood ===
                              id
                            }
                            onClick={() =>
                              updateMoment(
                                {
                                  mood:
                                    id,
                                },
                              )
                            }
                          >
                            <Icon
                              size={
                                16
                              }
                              aria-hidden="true"
                            />

                            {
                              label
                            }
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="today-current-grid">
                    <div className="today-current-section">
                      <h3>
                        <Music2
                          size={
                            17
                          }
                        />

                        No repeat
                      </h3>

                      <label>
                        Música

                        <input
                          value={
                            moment.music
                          }
                          placeholder="Qual música ficou com você?"
                          onChange={
                            event =>
                              updateMoment(
                                {
                                  music:
                                    event
                                      .target
                                      .value,
                                },
                              )
                          }
                        />
                      </label>

                      <label>
                        Artista

                        <input
                          value={
                            moment.artist
                          }
                          placeholder="Artista"
                          onChange={
                            event =>
                              updateMoment(
                                {
                                  artist:
                                    event
                                      .target
                                      .value,
                                },
                              )
                          }
                        />
                      </label>

                      <label>
                        Álbum

                        <input
                          value={
                            moment.album
                          }
                          placeholder="Álbum"
                          onChange={
                            event =>
                              updateMoment(
                                {
                                  album:
                                    event
                                      .target
                                      .value,
                                },
                              )
                          }
                        />
                      </label>
                    </div>

                    <div className="today-current-section">
                      <h3>
                        <BookOpen
                          size={
                            17
                          }
                        />

                        Na minha estante
                      </h3>

                      <label>
                        Lendo agora

                        <input
                          value={
                            moment.reading
                          }
                          placeholder="Livro ou história"
                          onChange={
                            event =>
                              updateMoment(
                                {
                                  reading:
                                    event
                                      .target
                                      .value,
                                },
                              )
                          }
                        />
                      </label>

                      <h3>
                        <Film
                          size={
                            17
                          }
                        />

                        Na minha tela
                      </h3>

                      <select
                        aria-label="Tipo do que está assistindo"
                        value={
                          moment.watchingType
                        }
                        onChange={
                          event =>
                            updateMoment(
                              {
                                watchingType:
                                  event
                                    .target
                                    .value,
                              },
                            )
                        }
                      >
                        <option value="filme">
                          Filme
                        </option>

                        <option value="série">
                          Série
                        </option>

                        <option value="anime">
                          Anime
                        </option>
                      </select>

                      <label>
                        Assistindo agora

                        <input
                          value={
                            moment.watching
                          }
                          placeholder="Título"
                          onChange={
                            event =>
                              updateMoment(
                                {
                                  watching:
                                    event
                                      .target
                                      .value,
                                },
                              )
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <label className="today-quick-note">
                    <span>
                      <PencilLine
                        size={
                          17
                        }
                      />

                      Como foi esse dia?
                    </span>

                    <textarea
                      value={
                        moment.note
                      }
                      placeholder="Escreva uma lembrança, pensamento ou pequeno agradecimento…"
                      maxLength={
                        1000
                      }
                      onChange={
                        event =>
                          updateMoment(
                            {
                              note:
                                event
                                  .target
                                  .value,
                            },
                          )
                      }
                    />
                  </label>
                </div>

                <div className="today-photo-area">
                  <div className="today-polaroid">
                    {selectedPhoto ? (
                      <img
                        src={
                          selectedPhoto.file_url.startsWith(
                            'http',
                          )
                            ? selectedPhoto.file_url
                            : `${API_URL}${selectedPhoto.file_url}`
                        }
                        alt={
                          selectedPhoto.name
                        }
                      />
                    ) : (
                      <div className="today-photo-empty">
                        <Heart
                          size={
                            26
                          }
                          strokeWidth={
                            1.2
                          }
                        />

                        <span>
                          Um instante para guardar
                        </span>
                      </div>
                    )}

                    <span>
                      momento do dia ♡
                    </span>
                  </div>

                  <label className="today-photo-select">
                    Escolher foto da biblioteca

                    <select
                      value={
                        moment.photoId ??
                        ''
                      }
                      onChange={
                        event =>
                          updateMoment(
                            {
                              photoId:
                                event
                                  .target
                                  .value
                                  ? Number(
                                      event
                                        .target
                                        .value,
                                    )
                                  : null,
                            },
                          )
                      }
                    >
                      <option value="">
                        Nenhuma foto
                      </option>

                      {media.map(
                        item => (
                          <option
                            value={
                              item.id
                            }
                            key={
                              item.id
                            }
                          >
                            {
                              item.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label className="today-photo-upload">
                    {photoUploading
                      ? 'Enviando foto…'
                      : 'Enviar uma foto'}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={
                        photoUploading
                      }
                      onChange={
                        event => {
                          void uploadPhoto(
                            event
                              .target
                              .files?.[0],
                          )

                          event.target.value =
                            ''
                        }
                      }
                    />
                  </label>

                  {!media.length && (
                    <Link to="/stationery">
                      Explorar Papelaria

                      <ChevronRight
                        size={
                          13
                        }
                      />
                    </Link>
                  )}
                </div>
              </div>
            </section>

            <div className="today-bottom-layout">
              <section className="today-upcoming">
                <span className="today-eyebrow">
                  NO HORIZONTE
                </span>

                <h2>
                  Próximos compromissos
                </h2>

                {upcoming.length ? (
                  upcoming.map(
                    event => (
                      <div
                        className="today-upcoming-row"
                        key={
                          event.id
                        }
                      >
                        <time>
                          {new Date(
                            event.starts_at,
                          ).toLocaleDateString(
                            'pt-BR',
                            {
                              day:
                                '2-digit',
                              month:
                                'short',
                            },
                          )}
                        </time>

                        <span>
                          {
                            event.title
                          }
                        </span>
                      </div>
                    ),
                  )
                ) : (
                  <p>
                    Nenhum compromisso próximo a partir deste dia.
                  </p>
                )}

                <Link to="/calendar">
                  Ver calendário

                  <ChevronRight
                    size={
                      14
                    }
                  />
                </Link>
              </section>

              <section className="today-studies">
                <span className="today-eyebrow">
                  UM POUCO A CADA DIA
                </span>

                <h2>
                  Estudos
                </h2>

                {todayStudy.length ? (
                  <>
                    <strong>
                      {
                        studyMinutes
                      }{' '}
                      min
                    </strong>

                    <p>
                      registrados neste dia em{' '}
                      {
                        todayStudy.length
                      }{' '}
                      {todayStudy.length ===
                      1
                        ? 'sessão'
                        : 'sessões'}
                      .
                    </p>

                    <small>
                      {[
                        ...new Set(
                          todayStudy.map(
                            item =>
                              item.subject,
                          ),
                        ),
                      ].join(
                        ' · ',
                      )}
                    </small>
                  </>
                ) : (
                  <p>
                    Nenhum estudo registrado neste dia.
                  </p>
                )}

                <Link to="/studies">
                  Abrir estudos

                  <ChevronRight
                    size={
                      14
                    }
                  />
                </Link>

                {(monthStudyMinutes >
                  0 ||
                  monthCompletedTasks >
                    0) && (
                  <div className="today-month-note">
                    Neste mês ·{' '}
                    {
                      monthStudyMinutes
                    }{' '}
                    min de estudo ·{' '}
                    {
                      monthCompletedTasks
                    }{' '}
                    {monthCompletedTasks ===
                    1
                      ? 'tarefa concluída com prazo no mês'
                      : 'tarefas concluídas com prazo no mês'}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default TodayPage