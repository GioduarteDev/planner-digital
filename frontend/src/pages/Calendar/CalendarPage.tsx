import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  apiRequest,
} from '../../services/api'

import './CalendarPage.css'


type EventFromApi = {
  id: number
  user_id: number
  title: string
  description: string
  starts_at: string
  ends_at: string | null
  all_day: boolean
  reminder_minutes: number | null
  created_at: string
}


type TaskFromApi = {
  id: number
  page_id: number
  text: string
  done: boolean
  due_date: string | null
  priority: string
  created_at: string
}


type CalendarEvent = {
  id: number
  title: string
  description: string
  startsAt: string
  endsAt: string | null
  allDay: boolean
  reminderMinutes: number | null
}


type CalendarTask = {
  id: number
  text: string
  done: boolean
  dueDate: string | null
  priority: string
}


const WEEK_DAYS = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
]


const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]


function formatDateKey(
  date: Date,
) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    )

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    )

  return `${year}-${month}-${day}`
}


function CalendarPage() {
  const navigate =
    useNavigate()


  const today =
    useMemo(
      () => new Date(),
      [],
    )


  const [
    currentDate,
    setCurrentDate,
  ] =
    useState(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ),
    )


  const [
    events,
    setEvents,
  ] =
    useState<CalendarEvent[]>([])


  const [
    tasks,
    setTasks,
  ] =
    useState<CalendarTask[]>([])


  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      formatDateKey(
        today,
      ),
    )


  const [
    editingEventId,
    setEditingEventId,
  ] =
    useState<number | null>(
      null,
    )


  const [
    title,
    setTitle,
  ] =
    useState('')


  const [
    description,
    setDescription,
  ] =
    useState('')


  const [
    time,
    setTime,
  ] =
    useState('09:00')


  const [
    allDay,
    setAllDay,
  ] =
    useState(false)


  const [
    reminderMinutes,
    setReminderMinutes,
  ] =
    useState('')


  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)


  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false)


  async function enableNotifications() {
  if (
    !('Notification' in window)
  ) {
    alert(
      'Este navegador não suporta notificações.',
    )

    return
  }

  const permission =
    await Notification.requestPermission()

  if (
    permission !== 'granted'
  ) {
    alert(
      'As notificações não foram autorizadas.',
    )

    return
  }

  new Notification(
    'Planner Digital 🔔',
    {
      body:
        'Notificações funcionando!',
    },
  )

  alert(
    'Lembretes ativados! Fiz um teste de notificação. 🔔',
  )
}

  useEffect(() => {
    let cancelled = false


    async function loadCalendar() {
      try {
        const [
          eventsData,
          tasksData,
        ] =
          await Promise.all([
            apiRequest<EventFromApi[]>(
              '/events',
            ),

            apiRequest<TaskFromApi[]>(
              '/tasks',
            ),
          ])


        if (cancelled) {
          return
        }


        setEvents(
          eventsData.map(
            (event) => ({
              id: event.id,

              title:
                event.title,

              description:
                event.description,

              startsAt:
                event.starts_at,

              endsAt:
                event.ends_at,

              allDay:
                event.all_day,

              reminderMinutes:
                event.reminder_minutes,
            }),
          ),
        )


        setTasks(
          tasksData.map(
            (task) => ({
              id: task.id,

              text:
                task.text,

              done:
                task.done,

              dueDate:
                task.due_date,

              priority:
                task.priority,
            }),
          ),
        )
      } catch (error) {
        if (cancelled) {
          return
        }


        console.error(
          error,
        )


        alert(
          'Não foi possível carregar o calendário.',
        )
      } finally {
        if (!cancelled) {
          setIsLoading(
            false,
          )
        }
      }
    }


    void loadCalendar()


    return () => {
      cancelled = true
    }
  }, [])


  const year =
    currentDate.getFullYear()


  const month =
    currentDate.getMonth()


  const firstDay =
    new Date(
      year,
      month,
      1,
    ).getDay()


  const daysInMonth =
    new Date(
      year,
      month + 1,
      0,
    ).getDate()


  const calendarCells =
    Array.from(
      {
        length:
          firstDay
          + daysInMonth,
      },

      (
        _,
        index,
      ) => {
        if (
          index < firstDay
        ) {
          return null
        }


        return (
          index
          - firstDay
          + 1
        )
      },
    )


  function resetEventForm() {
    setEditingEventId(
      null,
    )

    setTitle('')

    setDescription('')

    setTime(
      '09:00',
    )

    setAllDay(
      false,
    )

    setReminderMinutes(
      '',
    )
  }


  function previousMonth() {
    setCurrentDate(
      new Date(
        year,
        month - 1,
        1,
      ),
    )


    resetEventForm()
  }


  function nextMonth() {
    setCurrentDate(
      new Date(
        year,
        month + 1,
        1,
      ),
    )


    resetEventForm()
  }


  function goToToday() {
    setCurrentDate(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ),
    )


    setSelectedDate(
      formatDateKey(
        today,
      ),
    )


    resetEventForm()
  }


  function selectDay(
    day: number,
  ) {
    const date =
      new Date(
        year,
        month,
        day,
      )


    setSelectedDate(
      formatDateKey(
        date,
      ),
    )


    resetEventForm()
  }


  function getEventsForDay(
    day: number,
  ) {
    const date =
      new Date(
        year,
        month,
        day,
      )


    const dateKey =
      formatDateKey(
        date,
      )


    return events.filter(
      (event) => {
        const eventDate =
          new Date(
            event.startsAt,
          )


        return (
          formatDateKey(
            eventDate,
          )
          === dateKey
        )
      },
    )
  }


  function getTasksForDay(
    day: number,
  ) {
    const date =
      new Date(
        year,
        month,
        day,
      )


    const dateKey =
      formatDateKey(
        date,
      )


    return tasks.filter(
      (task) =>
        task.dueDate
        === dateKey,
    )
  }


  async function saveEvent() {
    if (
      title.trim() === ''
    ) {
      alert(
        'Digite o título do evento.',
      )

      return
    }


    try {
      setIsSaving(
        true,
      )


      const localDateTime =
        allDay
          ? `${selectedDate}T00:00`
          : `${selectedDate}T${time}`


      const startsAt =
        new Date(
          localDateTime,
        ).toISOString()


      const body =
        JSON.stringify({
          title:
            title.trim(),

          description:
            description.trim(),

          starts_at:
            startsAt,

          ends_at:
            null,

          all_day:
            allDay,

          reminder_minutes:
            reminderMinutes === ''
              ? null
              : Number(
                  reminderMinutes,
                ),
        })


      if (
        editingEventId
        !== null
      ) {
        const updated =
          await apiRequest<EventFromApi>(
            `/events/${editingEventId}`,
            {
              method: 'PATCH',

              body,
            },
          )


        setEvents(
          (
            currentEvents,
          ) =>
            currentEvents.map(
              (event) =>
                event.id
                === updated.id
                  ? {
                      id:
                        updated.id,

                      title:
                        updated.title,

                      description:
                        updated.description,

                      startsAt:
                        updated.starts_at,

                      endsAt:
                        updated.ends_at,

                      allDay:
                        updated.all_day,

                      reminderMinutes:
                        updated.reminder_minutes,
                    }
                  : event,
            ),
        )
      } else {
        const created =
          await apiRequest<EventFromApi>(
            '/events',
            {
              method: 'POST',

              body,
            },
          )


        setEvents(
          (
            currentEvents,
          ) => [
            ...currentEvents,

            {
              id:
                created.id,

              title:
                created.title,

              description:
                created.description,

              startsAt:
                created.starts_at,

              endsAt:
                created.ends_at,

              allDay:
                created.all_day,

              reminderMinutes:
                created.reminder_minutes,
            },
          ],
        )
      }


      resetEventForm()
    } catch (error) {
      console.error(
        error,
      )


      if (
        error instanceof Error
      ) {
        alert(
          error.message,
        )
      }
    } finally {
      setIsSaving(
        false,
      )
    }
  }


  function startEditingEvent(
    event: CalendarEvent,
  ) {
    const eventDate =
      new Date(
        event.startsAt,
      )


    setEditingEventId(
      event.id,
    )


    setSelectedDate(
      formatDateKey(
        eventDate,
      ),
    )


    setCurrentDate(
      new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        1,
      ),
    )


    setTitle(
      event.title,
    )


    setDescription(
      event.description,
    )


    setAllDay(
      event.allDay,
    )


    setReminderMinutes(
      event.reminderMinutes
        === null
        ? ''
        : String(
            event.reminderMinutes,
          ),
    )


    const hours =
      String(
        eventDate.getHours(),
      ).padStart(
        2,
        '0',
      )


    const minutes =
      String(
        eventDate.getMinutes(),
      ).padStart(
        2,
        '0',
      )


    setTime(
      `${hours}:${minutes}`,
    )
  }


  async function deleteEvent(
    eventId: number,
  ) {
    const confirmed =
      window.confirm(
        'Excluir este evento?',
      )


    if (!confirmed) {
      return
    }


    try {
      await apiRequest<void>(
        `/events/${eventId}`,
        {
          method:
            'DELETE',
        },
      )


      setEvents(
        (
          currentEvents,
        ) =>
          currentEvents.filter(
            (event) =>
              event.id
              !== eventId,
          ),
      )


      if (
        editingEventId
        === eventId
      ) {
        resetEventForm()
      }
    } catch (error) {
      console.error(
        error,
      )


      alert(
        'Não foi possível excluir o evento.',
      )
    }
  }


  async function toggleTask(
    task: CalendarTask,
  ) {
    try {
      const updated =
        await apiRequest<TaskFromApi>(
          `/tasks/${task.id}`,
          {
            method: 'PATCH',

            body:
              JSON.stringify({
                done:
                  !task.done,
              }),
          },
        )


      setTasks(
        (
          currentTasks,
        ) =>
          currentTasks.map(
            (
              currentTask,
            ) =>
              currentTask.id
              === updated.id
                ? {
                    ...currentTask,

                    done:
                      updated.done,
                  }
                : currentTask,
          ),
      )
    } catch (error) {
      console.error(
        error,
      )


      alert(
        'Não foi possível atualizar a tarefa.',
      )
    }
  }


  const selectedEvents =
    events.filter(
      (event) => {
        const date =
          new Date(
            event.startsAt,
          )


        return (
          formatDateKey(
            date,
          )
          === selectedDate
        )
      },
    )


  const selectedTasks =
    tasks.filter(
      (task) =>
        task.dueDate
        === selectedDate,
    )


  return (
    <main className="calendar-page">
      <header className="calendar-topbar">
        <button
          type="button"

          onClick={() =>
            navigate('/')
          }
        >
          ← Biblioteca
        </button>


        <h1>
          Calendário
        </h1>


        <div className="calendar-topbar-actions">
          <button
            type="button"

            onClick={
              enableNotifications
            }
          >
            🔔 Ativar lembretes
          </button>


          <button
            type="button"

            onClick={
              goToToday
            }
          >
            Hoje
          </button>
        </div>
      </header>


      <section className="calendar-layout">
        <div className="calendar-main">
          <div className="calendar-month-header">
            <button
              type="button"

              onClick={
                previousMonth
              }
            >
              ‹
            </button>


            <h2>
              {
                MONTH_NAMES[
                  month
                ]
              }{' '}

              {year}
            </h2>


            <button
              type="button"

              onClick={
                nextMonth
              }
            >
              ›
            </button>
          </div>


          <div className="calendar-grid calendar-week">
            {WEEK_DAYS.map(
              (day) => (
                <div
                  key={day}

                  className="calendar-weekday"
                >
                  {day}
                </div>
              ),
            )}
          </div>


          <div className="calendar-grid calendar-days">
            {calendarCells.map(
              (
                day,
                index,
              ) => {
                if (
                  day === null
                ) {
                  return (
                    <div
                      key={
                        `empty-${index}`
                      }

                      className="calendar-day empty"
                    />
                  )
                }


                const date =
                  new Date(
                    year,
                    month,
                    day,
                  )


                const dateKey =
                  formatDateKey(
                    date,
                  )


                const dayEvents =
                  getEventsForDay(
                    day,
                  )


                const dayTasks =
                  getTasksForDay(
                    day,
                  )


                const isToday =
                  dateKey
                  === formatDateKey(
                    today,
                  )


                const isSelected =
                  dateKey
                  === selectedDate


                return (
                  <button
                    key={
                      dateKey
                    }

                    type="button"

                    className={
                      [
                        'calendar-day',

                        isToday
                          ? 'today'
                          : '',

                        isSelected
                          ? 'selected'
                          : '',
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(' ')
                    }

                    onClick={() =>
                      selectDay(
                        day,
                      )
                    }
                  >
                    <span className="day-number">
                      {day}
                    </span>


                    <div className="day-events">
                      {dayEvents
                        .slice(
                          0,
                          2,
                        )
                        .map(
                          (
                            event,
                          ) => (
                            <span
                              key={
                                `event-${event.id}`
                              }

                              className="day-event"
                            >
                              {event.allDay
                                ? ''
                                : `${new Date(
                                    event.startsAt,
                                  ).toLocaleTimeString(
                                    'pt-BR',
                                    {
                                      hour:
                                        '2-digit',

                                      minute:
                                        '2-digit',
                                    },
                                  )} `}

                              {
                                event.title
                              }
                            </span>
                          ),
                        )}


                      {dayTasks
                        .slice(
                          0,

                          Math.max(
                            0,

                            3
                            - dayEvents.length,
                          ),
                        )
                        .map(
                          (
                            task,
                          ) => (
                            <span
                              key={
                                `task-${task.id}`
                              }

                              className={
                                task.done
                                  ? 'day-event task-event done'
                                  : 'day-event task-event'
                              }
                            >
                              ✓ {task.text}
                            </span>
                          ),
                        )}


                      {(
                        dayEvents.length
                        + dayTasks.length
                      ) > 3 && (
                        <small>
                          +
                          {
                            dayEvents.length
                            + dayTasks.length
                            - 3
                          } itens
                        </small>
                      )}
                    </div>
                  </button>
                )
              },
            )}
          </div>
        </div>


        <aside className="calendar-sidebar">
          <h2>
            {new Date(
              `${selectedDate}T12:00`,
            ).toLocaleDateString(
              'pt-BR',
              {
                day:
                  '2-digit',

                month:
                  'long',

                year:
                  'numeric',
              },
            )}
          </h2>


          <div className="event-form">
            <h3>
              {editingEventId
                !== null
                ? 'Editar evento'
                : 'Novo evento'}
            </h3>


            {editingEventId
              !== null && (
              <p className="editing-banner">
                Você está editando
                um evento.
              </p>
            )}


            <label>
              Título

              <input
                type="text"

                value={
                  title
                }

                maxLength={
                  200
                }

                onChange={(
                  event,
                ) =>
                  setTitle(
                    event.target.value,
                  )
                }
              />
            </label>


            <label>
              Descrição

              <textarea
                value={
                  description
                }

                maxLength={
                  2000
                }

                onChange={(
                  event,
                ) =>
                  setDescription(
                    event.target.value,
                  )
                }
              />
            </label>


            <label className="event-checkbox">
              <input
                type="checkbox"

                checked={
                  allDay
                }

                onChange={(
                  event,
                ) =>
                  setAllDay(
                    event.target.checked,
                  )
                }
              />

              Dia inteiro
            </label>


            {!allDay && (
              <label>
                Horário

                <input
                  type="time"

                  value={
                    time
                  }

                  onChange={(
                    event,
                  ) =>
                    setTime(
                      event.target.value,
                    )
                  }
                />
              </label>
            )}


            <label>
              Lembrete

              <select
                value={
                  reminderMinutes
                }

                onChange={(
                  event,
                ) =>
                  setReminderMinutes(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Sem lembrete
                </option>

                <option value="10">
                  10 minutos antes
                </option>

                <option value="30">
                  30 minutos antes
                </option>

                <option value="60">
                  1 hora antes
                </option>

                <option value="1440">
                  1 dia antes
                </option>

                <option value="10080">
                  1 semana antes
                </option>
              </select>
            </label>


            <button
              type="button"

              className="create-event-button"

              disabled={
                isSaving
              }

              onClick={
                saveEvent
              }
            >
              {isSaving
                ? 'Salvando...'
                : editingEventId
                    !== null
                  ? 'Salvar alterações'
                  : 'Criar evento'}
            </button>


            {editingEventId
              !== null && (
              <button
                type="button"

                onClick={
                  resetEventForm
                }
              >
                Cancelar edição
              </button>
            )}
          </div>


          <div className="selected-events">
            <h3>
              Eventos do dia
            </h3>


            {isLoading && (
              <p>
                Carregando...
              </p>
            )}


            {!isLoading
              && selectedEvents.length
                === 0 && (
                <p className="no-events">
                  Nenhum evento.
                </p>
              )}


            {selectedEvents.map(
              (
                event,
              ) => (
                <article
                  key={
                    event.id
                  }

                  className="event-card"
                >
                  <div>
                    <strong>
                      {
                        event.title
                      }
                    </strong>


                    <span>
                      {event.allDay
                        ? 'Dia inteiro'
                        : new Date(
                            event.startsAt,
                          ).toLocaleTimeString(
                            'pt-BR',
                            {
                              hour:
                                '2-digit',

                              minute:
                                '2-digit',
                            },
                          )}
                    </span>


                    {event.description && (
                      <p>
                        {
                          event.description
                        }
                      </p>
                    )}
                  </div>


                  <div className="event-actions">
                    <button
                      type="button"

                      onClick={() =>
                        startEditingEvent(
                          event,
                        )
                      }
                    >
                      Editar
                    </button>


                    <button
                      type="button"

                      onClick={() =>
                        deleteEvent(
                          event.id,
                        )
                      }
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>


          <div className="selected-events">
            <h3>
              Tarefas do dia
            </h3>


            {selectedTasks.length
              === 0 && (
              <p className="no-events">
                Nenhuma tarefa.
              </p>
            )}


            {selectedTasks.map(
              (
                task,
              ) => (
                <article
                  key={
                    task.id
                  }

                  className={
                    task.done
                      ? 'task-card done'
                      : 'task-card'
                  }
                >
                  <label>
                    <input
                      type="checkbox"

                      checked={
                        task.done
                      }

                      onChange={() =>
                        toggleTask(
                          task,
                        )
                      }
                    />


                    <span>
                      {
                        task.text
                      }
                    </span>
                  </label>


                  <small>
                    Prioridade:{' '}

                    {
                      task.priority
                    }
                  </small>
                </article>
              ),
            )}
          </div>
        </aside>
      </section>
    </main>
  )
}


export default CalendarPage