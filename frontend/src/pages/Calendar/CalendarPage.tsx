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


type CalendarEvent = {
  id: number
  title: string
  description: string
  startsAt: string
  endsAt: string | null
  allDay: boolean
  reminderMinutes: number | null
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
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      formatDateKey(
        today,
      ),
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


  useEffect(() => {
    let cancelled = false


    async function loadEvents() {
      try {
        const data =
          await apiRequest<EventFromApi[]>(
            '/events',
          )


        if (cancelled) {
          return
        }


        setEvents(
          data.map(
            (event) => ({
              id: event.id,
              title: event.title,
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
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error(
          error,
        )

        alert(
          'Não foi possível carregar os eventos.',
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }


    void loadEvents()


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


  function previousMonth() {
    setCurrentDate(
      new Date(
        year,
        month - 1,
        1,
      ),
    )
  }


  function nextMonth() {
    setCurrentDate(
      new Date(
        year,
        month + 1,
        1,
      ),
    )
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


  async function createEvent() {
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


      const created =
        await apiRequest<EventFromApi>(
          '/events',
          {
            method: 'POST',

            body: JSON.stringify({
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
            }),
          },
        )


      setEvents(
        (currentEvents) => [
          ...currentEvents,

          {
            id: created.id,
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


      setTitle('')
      setDescription('')
      setTime('09:00')
      setAllDay(false)
      setReminderMinutes('')
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
          method: 'DELETE',
        },
      )


      setEvents(
        (currentEvents) =>
          currentEvents.filter(
            (event) =>
              event.id
              !== eventId,
          ),
      )
    } catch (error) {
      console.error(
        error,
      )

      alert(
        'Não foi possível excluir o evento.',
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


  return (
    <main className="calendar-page">
      <header className="calendar-topbar">
        <div>
          <button
            type="button"
            onClick={() =>
              navigate('/')
            }
          >
            ← Biblioteca
          </button>
        </div>


        <h1>
          Calendário
        </h1>


        <button
          type="button"
          onClick={
            goToToday
          }
        >
          Hoje
        </button>
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
                          3,
                        )
                        .map(
                          (event) => (
                            <span
                              key={
                                event.id
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


                      {dayEvents.length
                        > 3 && (
                        <small>
                          +
                          {
                            dayEvents.length
                            - 3
                          } eventos
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
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              },
            )}
          </h2>


          <div className="event-form">
            <h3>
              Novo evento
            </h3>


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
                onChange={(event) =>
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
                onChange={(event) =>
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
                onChange={(event) =>
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
                  onChange={(event) =>
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
                onChange={(event) =>
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
                createEvent
              }
            >
              {isSaving
                ? 'Salvando...'
                : 'Criar evento'}
            </button>
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
              (event) => (
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