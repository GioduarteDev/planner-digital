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

import './StudiesPage.css'


type StudyFromApi = {
  id: number
  user_id: number
  subject: string
  topic: string
  study_date: string
  duration_minutes: number
  notes: string
  created_at: string
}


type StudySession = {
  id: number
  subject: string
  topic: string
  studyDate: string
  durationMinutes: number
  notes: string
}


function getLocalDateKey(
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


function formatDuration(
  minutes: number,
) {
  const hours =
    Math.floor(
      minutes / 60,
    )

  const remainingMinutes =
    minutes % 60


  if (
    hours === 0
  ) {
    return `${remainingMinutes}min`
  }


  if (
    remainingMinutes === 0
  ) {
    return `${hours}h`
  }


  return (
    `${hours}h ${remainingMinutes}min`
  )
}


function StudiesPage() {
  const navigate =
    useNavigate()


  const today =
    useMemo(
      () => new Date(),
      [],
    )


  const [
    sessions,
    setSessions,
  ] =
    useState<StudySession[]>([])


  const [
    editingId,
    setEditingId,
  ] =
    useState<number | null>(
      null,
    )


  const [
    subject,
    setSubject,
  ] =
    useState('')


  const [
    topic,
    setTopic,
  ] =
    useState('')


  const [
    studyDate,
    setStudyDate,
  ] =
    useState(
      getLocalDateKey(
        today,
      ),
    )


  const [
    hours,
    setHours,
  ] =
    useState('1')


  const [
    minutes,
    setMinutes,
  ] =
    useState('0')


  const [
    notes,
    setNotes,
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


    async function loadStudies() {
      try {
        const data =
          await apiRequest<
            StudyFromApi[]
          >(
            '/studies',
          )


        if (cancelled) {
          return
        }


        setSessions(
          data.map(
            (
              session,
            ) => ({
              id:
                session.id,

              subject:
                session.subject,

              topic:
                session.topic,

              studyDate:
                session.study_date,

              durationMinutes:
                session.duration_minutes,

              notes:
                session.notes,
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
          'Não foi possível carregar os estudos.',
        )
      } finally {
        if (!cancelled) {
          setIsLoading(
            false,
          )
        }
      }
    }


    void loadStudies()


    return () => {
      cancelled = true
    }
  }, [])


  function resetForm() {
    setEditingId(
      null,
    )

    setSubject('')
    setTopic('')

    setStudyDate(
      getLocalDateKey(
        new Date(),
      ),
    )

    setHours('1')
    setMinutes('0')
    setNotes('')
  }


  async function saveStudy() {
    if (
      subject.trim() === ''
    ) {
      alert(
        'Digite a matéria.',
      )

      return
    }


    const hoursNumber =
      Number(hours) || 0

    const minutesNumber =
      Number(minutes) || 0


    const durationMinutes =
      (
        hoursNumber * 60
      )
      + minutesNumber


    if (
      durationMinutes <= 0
    ) {
      alert(
        'Informe quanto tempo você estudou.',
      )

      return
    }


    if (
      durationMinutes > 1440
    ) {
      alert(
        'O registro não pode ultrapassar 24 horas.',
      )

      return
    }


    try {
      setIsSaving(
        true,
      )


      const body =
        JSON.stringify({
          subject:
            subject.trim(),

          topic:
            topic.trim(),

          study_date:
            studyDate,

          duration_minutes:
            durationMinutes,

          notes:
            notes.trim(),
        })


      if (
        editingId
        !== null
      ) {
        const updated =
          await apiRequest<
            StudyFromApi
          >(
            `/studies/${editingId}`,
            {
              method:
                'PATCH',

              body,
            },
          )


        setSessions(
          (
            currentSessions,
          ) =>
            currentSessions.map(
              (
                session,
              ) =>
                session.id
                === updated.id
                  ? {
                      id:
                        updated.id,

                      subject:
                        updated.subject,

                      topic:
                        updated.topic,

                      studyDate:
                        updated.study_date,

                      durationMinutes:
                        updated.duration_minutes,

                      notes:
                        updated.notes,
                    }
                  : session,
            ),
        )
      } else {
        const created =
          await apiRequest<
            StudyFromApi
          >(
            '/studies',
            {
              method:
                'POST',

              body,
            },
          )


        setSessions(
          (
            currentSessions,
          ) => [
            {
              id:
                created.id,

              subject:
                created.subject,

              topic:
                created.topic,

              studyDate:
                created.study_date,

              durationMinutes:
                created.duration_minutes,

              notes:
                created.notes,
            },

            ...currentSessions,
          ],
        )
      }


      resetForm()
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


  function startEditing(
    session: StudySession,
  ) {
    setEditingId(
      session.id,
    )

    setSubject(
      session.subject,
    )

    setTopic(
      session.topic,
    )

    setStudyDate(
      session.studyDate,
    )


    const sessionHours =
      Math.floor(
        session.durationMinutes
        / 60,
      )


    const sessionMinutes =
      session.durationMinutes
      % 60


    setHours(
      String(
        sessionHours,
      ),
    )

    setMinutes(
      String(
        sessionMinutes,
      ),
    )

    setNotes(
      session.notes,
    )
  }


  async function deleteStudy(
    sessionId: number,
  ) {
    const confirmed =
      window.confirm(
        'Excluir este registro de estudo?',
      )


    if (!confirmed) {
      return
    }


    try {
      await apiRequest<void>(
        `/studies/${sessionId}`,
        {
          method:
            'DELETE',
        },
      )


      setSessions(
        (
          currentSessions,
        ) =>
          currentSessions.filter(
            (
              session,
            ) =>
              session.id
              !== sessionId,
          ),
      )


      if (
        editingId
        === sessionId
      ) {
        resetForm()
      }
    } catch (error) {
      console.error(
        error,
      )


      alert(
        'Não foi possível excluir o registro.',
      )
    }
  }


  const todayKey =
    getLocalDateKey(
      today,
    )


  const startOfWeek =
    useMemo(
      () => {
        const date =
          new Date(
            today,
          )

        const day =
          date.getDay()

        const difference =
          day === 0
            ? -6
            : 1 - day

        date.setDate(
          date.getDate()
          + difference,
        )

        date.setHours(
          0,
          0,
          0,
          0,
        )

        return date
      },
      [today],
    )


  const endOfWeek =
    useMemo(
      () => {
        const date =
          new Date(
            startOfWeek,
          )

        date.setDate(
          date.getDate()
          + 6,
        )

        date.setHours(
          23,
          59,
          59,
          999,
        )

        return date
      },
      [startOfWeek],
    )


  const todayMinutes =
    sessions
      .filter(
        (
          session,
        ) =>
          session.studyDate
          === todayKey,
      )
      .reduce(
        (
          total,
          session,
        ) =>
          total
          + session.durationMinutes,
        0,
      )


  const weekMinutes =
    sessions
      .filter(
        (
          session,
        ) => {
          const date =
            new Date(
              `${session.studyDate}T12:00`,
            )

          return (
            date >= startOfWeek
            && date <= endOfWeek
          )
        },
      )
      .reduce(
        (
          total,
          session,
        ) =>
          total
          + session.durationMinutes,
        0,
      )


  const monthMinutes =
    sessions
      .filter(
        (
          session,
        ) => {
          const [
            year,
            month,
          ] =
            session.studyDate
              .split('-')
              .map(
                Number,
              )

          return (
            year
              === today.getFullYear()
            && month
              === today.getMonth()
                + 1
          )
        },
      )
      .reduce(
        (
          total,
          session,
        ) =>
          total
          + session.durationMinutes,
        0,
      )


  const totalMinutes =
    sessions.reduce(
      (
        total,
        session,
      ) =>
        total
        + session.durationMinutes,
      0,
    )


  return (
    <main className="studies-page">
      <header className="studies-topbar">
        <button
          type="button"
          onClick={() =>
            navigate('/')
          }
        >
          ← Biblioteca
        </button>


        <h1>
          Estudos
        </h1>


        <button
          type="button"
          onClick={() =>
            navigate(
              '/calendar',
            )
          }
        >
          Calendário
        </button>
      </header>


      <section className="study-stats">
        <article>
          <span>
            Hoje
          </span>

          <strong>
            {
              formatDuration(
                todayMinutes,
              )
            }
          </strong>
        </article>


        <article>
          <span>
            Esta semana
          </span>

          <strong>
            {
              formatDuration(
                weekMinutes,
              )
            }
          </strong>
        </article>


        <article>
          <span>
            Este mês
          </span>

          <strong>
            {
              formatDuration(
                monthMinutes,
              )
            }
          </strong>
        </article>


        <article>
          <span>
            Total
          </span>

          <strong>
            {
              formatDuration(
                totalMinutes,
              )
            }
          </strong>
        </article>
      </section>


      <section className="studies-layout">
        <div className="study-form-card">
          <h2>
            {editingId
              !== null
                ? 'Editar estudo'
                : 'Registrar estudo'}
          </h2>


          <label>
            Matéria

            <input
              type="text"

              value={
                subject
              }

              placeholder="Python"

              maxLength={
                100
              }

              onChange={(
                event,
              ) =>
                setSubject(
                  event.target.value,
                )
              }
            />
          </label>


          <label>
            Assunto

            <input
              type="text"

              value={
                topic
              }

              placeholder="Funções e parâmetros"

              maxLength={
                200
              }

              onChange={(
                event,
              ) =>
                setTopic(
                  event.target.value,
                )
              }
            />
          </label>


          <label>
            Data

            <input
              type="date"

              value={
                studyDate
              }

              onChange={(
                event,
              ) =>
                setStudyDate(
                  event.target.value,
                )
              }
            />
          </label>


          <div className="duration-fields">
            <label>
              Horas

              <input
                type="number"

                min="0"
                max="24"

                value={
                  hours
                }

                onChange={(
                  event,
                ) =>
                  setHours(
                    event.target.value,
                  )
                }
              />
            </label>


            <label>
              Minutos

              <input
                type="number"

                min="0"
                max="59"

                value={
                  minutes
                }

                onChange={(
                  event,
                ) =>
                  setMinutes(
                    event.target.value,
                  )
                }
              />
            </label>
          </div>


          <label>
            Observações

            <textarea
              value={
                notes
              }

              placeholder="O que você estudou hoje?"

              maxLength={
                2000
              }

              onChange={(
                event,
              ) =>
                setNotes(
                  event.target.value,
                )
              }
            />
          </label>


          <button
            type="button"

            className="save-study-button"

            disabled={
              isSaving
            }

            onClick={
              saveStudy
            }
          >
            {isSaving
              ? 'Salvando...'
              : editingId
                  !== null
                ? 'Salvar alterações'
                : 'Registrar estudo'}
          </button>


          {editingId
            !== null && (
            <button
              type="button"

              onClick={
                resetForm
              }
            >
              Cancelar edição
            </button>
          )}
        </div>


        <div className="study-history">
          <div className="study-history-header">
            <h2>
              Histórico
            </h2>

            <span>
              {
                sessions.length
              } registros
            </span>
          </div>


          {isLoading && (
            <p>
              Carregando...
            </p>
          )}


          {!isLoading
            && sessions.length
              === 0 && (
              <p className="no-study-sessions">
                Nenhum estudo registrado ainda.
              </p>
            )}


          {sessions.map(
            (
              session,
            ) => (
              <article
                key={
                  session.id
                }

                className="study-card"
              >
                <div className="study-card-main">
                  <div className="study-card-title">
                    <strong>
                      {
                        session.subject
                      }
                    </strong>

                    <span>
                      {
                        formatDuration(
                          session.durationMinutes,
                        )
                      }
                    </span>
                  </div>


                  {session.topic && (
                    <h3>
                      {
                        session.topic
                      }
                    </h3>
                  )}


                  <small>
                    {new Date(
                      `${session.studyDate}T12:00`,
                    ).toLocaleDateString(
                      'pt-BR',
                    )}
                  </small>


                  {session.notes && (
                    <p>
                      {
                        session.notes
                      }
                    </p>
                  )}
                </div>


                <div className="study-card-actions">
                  <button
                    type="button"

                    onClick={() =>
                      startEditing(
                        session,
                      )
                    }
                  >
                    Editar
                  </button>


                  <button
                    type="button"

                    onClick={() =>
                      deleteStudy(
                        session.id,
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
      </section>
    </main>
  )
}


export default StudiesPage