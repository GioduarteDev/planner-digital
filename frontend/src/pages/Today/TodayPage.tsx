import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  useEffect,
  useState,
} from 'react'

import { apiRequest } from '../../services/api'

import './TodayPage.css'


type TaskPriority =
  | 'low'
  | 'medium'
  | 'high'


type AgendaFromApi = {
  id: number
  title: string
}


type PageFromApi = {
  id: number
  agenda_id: number
  title: string
  favorite: boolean
}


type TaskFromApi = {
  id: number
  page_id: number
  text: string
  done: boolean
  due_date: string | null
  priority: TaskPriority
}


type DashboardTask = {
  id: number
  text: string
  done: boolean
  dueDate: string
  priority: TaskPriority

  agendaId: number
  agendaTitle: string

  pageId: number
  pageTitle: string
}


type FavoritePage = {
  agendaId: number
  agendaTitle: string

  pageId: number
  pageTitle: string
}


type DashboardData = {
  tasks: DashboardTask[]
  favorites: FavoritePage[]
}


function getTodayString() {
  const today = new Date()

  const year =
    today.getFullYear()

  const month =
    String(
      today.getMonth() + 1,
    ).padStart(
      2,
      '0',
    )

  const day =
    String(
      today.getDate(),
    ).padStart(
      2,
      '0',
    )

  return `${year}-${month}-${day}`
}


function formatDate(
  date: string,
) {
  if (!date) {
    return ''
  }

  return new Date(
    `${date}T00:00:00`,
  ).toLocaleDateString(
    'pt-BR',
  )
}


function TodayPage() {
  const navigate =
    useNavigate()


  const [
    dashboardData,
    setDashboardData,
  ] =
    useState<DashboardData>({
      tasks: [],
      favorites: [],
    })


  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)


  const [
    loadError,
    setLoadError,
  ] =
    useState('')


  useEffect(() => {
    let cancelled = false


    async function loadDashboardFromApi() {
      try {
        const agendas =
          await apiRequest<
            AgendaFromApi[]
          >(
            '/agendas',
          )


        const [
          tasks,
          pagesByAgenda,
        ] =
          await Promise.all([
            apiRequest<
              TaskFromApi[]
            >(
              '/tasks',
            ),

            Promise.all(
              agendas.map(
                (agenda) =>
                  apiRequest<
                    PageFromApi[]
                  >(
                    `/agendas/${agenda.id}/pages`,
                  ),
              ),
            ),
          ])


        if (cancelled) {
          return
        }


        const pageMap =
          new Map<
            number,
            {
              agendaId: number
              agendaTitle: string
              pageId: number
              pageTitle: string
            }
          >()


        const favorites:
          FavoritePage[] = []


        agendas.forEach(
          (
            agenda,
            agendaIndex,
          ) => {
            const pages =
              pagesByAgenda[
                agendaIndex
              ]


            pages.forEach(
              (page) => {
                const pageTitle =
                  page.title ||
                  'Sem título'


                pageMap.set(
                  page.id,
                  {
                    agendaId:
                      agenda.id,

                    agendaTitle:
                      agenda.title,

                    pageId:
                      page.id,

                    pageTitle,
                  },
                )


                if (
                  page.favorite
                ) {
                  favorites.push({
                    agendaId:
                      agenda.id,

                    agendaTitle:
                      agenda.title,

                    pageId:
                      page.id,

                    pageTitle,
                  })
                }
              },
            )
          },
        )


        const dashboardTasks:
          DashboardTask[] =
          tasks
            .map(
              (task) => {
                const pageInfo =
                  pageMap.get(
                    task.page_id,
                  )


                if (!pageInfo) {
                  return null
                }


                return {
                  id:
                    task.id,

                  text:
                    task.text,

                  done:
                    task.done,

                  dueDate:
                    task.due_date ??
                    '',

                  priority:
                    task.priority,

                  agendaId:
                    pageInfo.agendaId,

                  agendaTitle:
                    pageInfo.agendaTitle,

                  pageId:
                    pageInfo.pageId,

                  pageTitle:
                    pageInfo.pageTitle,
                }
              },
            )
            .filter(
              (
                task,
              ): task is DashboardTask =>
                task !== null,
            )


        setDashboardData({
          tasks:
            dashboardTasks,

          favorites,
        })
      } catch (error) {
        if (cancelled) {
          return
        }


        console.error(error)


        if (
          error instanceof Error
        ) {
          setLoadError(
            error.message,
          )
        } else {
          setLoadError(
            'Não foi possível carregar a tela Hoje.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(
            false,
          )
        }
      }
    }


    void loadDashboardFromApi()


    return () => {
      cancelled = true
    }
  }, [])


  const today =
    getTodayString()


  const pendingTasks =
    dashboardData.tasks.filter(
      (task) =>
        !task.done,
    )


  const overdueTasks =
    pendingTasks.filter(
      (task) =>
        task.dueDate !==
          '' &&
        task.dueDate <
          today,
    )


  const todayTasks =
    pendingTasks.filter(
      (task) =>
        task.dueDate ===
        today,
    )


  const upcomingTasks =
    pendingTasks.filter(
      (task) =>
        task.dueDate !==
          '' &&
        task.dueDate >
          today,
    )


  const noDateTasks =
    pendingTasks.filter(
      (task) =>
        task.dueDate ===
        '',
    )


  async function handleToggleTask(
    task: DashboardTask,
  ) {
    const newDoneValue =
      !task.done


    setDashboardData(
      (currentData) => ({
        ...currentData,

        tasks:
          currentData.tasks.map(
            (
              currentTask,
            ) =>
              currentTask.id ===
              task.id
                ? {
                    ...currentTask,

                    done:
                      newDoneValue,
                  }
                : currentTask,
          ),
      }),
    )


    try {
      await apiRequest(
        `/tasks/${task.id}`,
        {
          method:
            'PATCH',

          body:
            JSON.stringify({
              done:
                newDoneValue,
            }),
        },
      )
    } catch (error) {
      console.error(error)


      setDashboardData(
        (currentData) => ({
          ...currentData,

          tasks:
            currentData.tasks.map(
              (
                currentTask,
              ) =>
                currentTask.id ===
                task.id
                  ? {
                      ...currentTask,

                      done:
                        task.done,
                    }
                  : currentTask,
            ),
        }),
      )


      alert(
        'Não foi possível atualizar a tarefa.',
      )
    }
  }


  function renderTaskSection(
    title: string,
    tasks: DashboardTask[],
    emptyMessage: string,
  ) {
    return (
      <section className="today-section">
        <div className="today-section-header">
          <h2>
            {title}
          </h2>

          <span>
            {tasks.length}
          </span>
        </div>


        {tasks.length === 0 ? (
          <p className="empty-message">
            {emptyMessage}
          </p>
        ) : (
          <div className="today-task-list">
            {tasks.map(
              (task) => (
                <article
                  className="today-task"

                  key={
                    task.id
                  }
                >
                  <input
                    type="checkbox"

                    checked={
                      task.done
                    }

                    onChange={() =>
                      void handleToggleTask(
                        task,
                      )
                    }
                  />


                  <div className="today-task-content">
                    <span className="today-task-title">
                      {
                        task.text
                      }
                    </span>


                    <div className="today-task-meta">
                      {task.dueDate && (
                        <span>
                          📅{' '}

                          {formatDate(
                            task.dueDate,
                          )}
                        </span>
                      )}


                      <span>
                        {task.priority ===
                          'high' &&
                          '🔴 Alta'}

                        {task.priority ===
                          'medium' &&
                          '🟡 Média'}

                        {task.priority ===
                          'low' &&
                          '🟢 Baixa'}
                      </span>


                      <span>
                        {
                          task.agendaTitle
                        }

                        {' • '}

                        {
                          task.pageTitle
                        }
                      </span>
                    </div>
                  </div>


                  <button
                    type="button"

                    className="open-task-button"

                    onClick={() =>
                      navigate(
                        `/agenda/${task.agendaId}`,
                      )
                    }
                  >
                    Abrir
                  </button>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    )
  }


  if (isLoading) {
    return (
      <main className="today-page">
        <header className="today-header">
          <div>
            <Link
              className="today-back-link"
              to="/"
            >
              ← Biblioteca
            </Link>

            <h1>
              Hoje
            </h1>
          </div>
        </header>


        <div className="today-content">
          <p>
            Carregando...
          </p>
        </div>
      </main>
    )
  }


  if (loadError) {
    return (
      <main className="today-page">
        <header className="today-header">
          <div>
            <Link
              className="today-back-link"
              to="/"
            >
              ← Biblioteca
            </Link>

            <h1>
              Hoje
            </h1>
          </div>
        </header>


        <div className="today-content">
          <p>
            {loadError}
          </p>
        </div>
      </main>
    )
  }


  return (
    <main className="today-page">
      <header className="today-header">
        <div>
          <Link
            className="today-back-link"
            to="/"
          >
            ← Biblioteca
          </Link>


          <h1>
            Hoje
          </h1>


          <p>
            {new Date()
              .toLocaleDateString(
                'pt-BR',
                {
                  weekday:
                    'long',

                  day:
                    '2-digit',

                  month:
                    'long',
                },
              )}
          </p>
        </div>


        <div className="today-summary">
          <strong>
            {
              pendingTasks.length
            }
          </strong>

          <span>
            tarefas pendentes
          </span>
        </div>
      </header>


      <div className="today-content">
        {renderTaskSection(
          '⚠ Atrasadas',

          overdueTasks,

          'Nenhuma tarefa atrasada.',
        )}


        {renderTaskSection(
          'Hoje',

          todayTasks,

          'Nada marcado para hoje.',
        )}


        {renderTaskSection(
          'Próximas',

          upcomingTasks,

          'Nenhuma tarefa futura.',
        )}


        {renderTaskSection(
          'Sem data',

          noDateTasks,

          'Nenhuma tarefa sem data.',
        )}


        <section className="today-section">
          <div className="today-section-header">
            <h2>
              ⭐ Páginas favoritas
            </h2>

            <span>
              {
                dashboardData
                  .favorites
                  .length
              }
            </span>
          </div>


          {dashboardData
            .favorites
            .length === 0 ? (
            <p className="empty-message">
              Nenhuma página favorita.
            </p>
          ) : (
            <div className="favorite-pages-grid">
              {dashboardData
                .favorites
                .map(
                  (page) => (
                    <button
                      key={
                        page.pageId
                      }

                      className="favorite-page-card"

                      type="button"

                      onClick={() =>
                        navigate(
                          `/agenda/${page.agendaId}`,
                        )
                      }
                    >
                      <strong>
                        {
                          page.pageTitle
                        }
                      </strong>

                      <span>
                        {
                          page.agendaTitle
                        }
                      </span>
                    </button>
                  ),
                )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}


export default TodayPage