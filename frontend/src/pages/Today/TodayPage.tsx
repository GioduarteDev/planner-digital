import {
  Link,
  useNavigate,
} from 'react-router-dom'

import { useState } from 'react'

import './TodayPage.css'

const AGENDA_STORAGE_KEY = 'planner-agendas'

type TaskPriority = 'low' | 'medium' | 'high'

type StoredAgenda = {
  id: number
  title: string
  coverColor: string
}

type PlannerTask = {
  id: number
  text: string
  done: boolean
  dueDate: string
  priority: TaskPriority
}

type PlannerPage = {
  id: number
  title: string
  content: string
  favorite: boolean
  tasks: PlannerTask[]
}

type DashboardTask = PlannerTask & {
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

  const year = today.getFullYear()

  const month = String(
    today.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    today.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDate(date: string) {
  if (!date) {
    return ''
  }

  return new Date(
    `${date}T00:00:00`,
  ).toLocaleDateString('pt-BR')
}

function loadDashboardData(): DashboardData {
  const savedAgendas =
    localStorage.getItem(AGENDA_STORAGE_KEY)

  const agendas: StoredAgenda[] = savedAgendas
    ? JSON.parse(savedAgendas)
    : []

  const tasks: DashboardTask[] = []
  const favorites: FavoritePage[] = []

  agendas.forEach((agenda) => {
    const pagesStorageKey =
      `planner-pages-${agenda.id}`

    const savedPages =
      localStorage.getItem(pagesStorageKey)

    const pages: PlannerPage[] = savedPages
      ? JSON.parse(savedPages)
      : []

    pages.forEach((page) => {
      if (page.favorite) {
        favorites.push({
          agendaId: agenda.id,
          agendaTitle: agenda.title,
          pageId: page.id,
          pageTitle:
            page.title || 'Sem título',
        })
      }

      const pageTasks = page.tasks ?? []

      pageTasks.forEach((task) => {
        tasks.push({
          ...task,

          dueDate:
            task.dueDate ?? '',

          priority:
            task.priority ?? 'medium',

          agendaId:
            agenda.id,

          agendaTitle:
            agenda.title,

          pageId:
            page.id,

          pageTitle:
            page.title || 'Sem título',
        })
      })
    })
  })

  return {
    tasks,
    favorites,
  }
}

function TodayPage() {
  const navigate = useNavigate()

  const [dashboardData, setDashboardData] =
    useState<DashboardData>(
      loadDashboardData,
    )

  const today = getTodayString()

  const pendingTasks =
    dashboardData.tasks.filter(
      (task) => !task.done,
    )

  const overdueTasks =
    pendingTasks.filter(
      (task) =>
        task.dueDate !== '' &&
        task.dueDate < today,
    )

  const todayTasks =
    pendingTasks.filter(
      (task) =>
        task.dueDate === today,
    )

  const upcomingTasks =
    pendingTasks.filter(
      (task) =>
        task.dueDate !== '' &&
        task.dueDate > today,
    )

  const noDateTasks =
    pendingTasks.filter(
      (task) =>
        task.dueDate === '',
    )

  function handleToggleTask(
    task: DashboardTask,
  ) {
    const pagesStorageKey =
      `planner-pages-${task.agendaId}`

    const savedPages =
      localStorage.getItem(
        pagesStorageKey,
      )

    if (!savedPages) {
      return
    }

    const pages: PlannerPage[] =
      JSON.parse(savedPages)

    const updatedPages =
      pages.map((page) =>
        page.id === task.pageId
          ? {
              ...page,

              tasks: (
                page.tasks ?? []
              ).map((pageTask) =>
                pageTask.id === task.id
                  ? {
                      ...pageTask,
                      done:
                        !pageTask.done,
                    }
                  : pageTask,
              ),
            }
          : page,
      )

    localStorage.setItem(
      pagesStorageKey,
      JSON.stringify(updatedPages),
    )

    setDashboardData(
      loadDashboardData(),
    )
  }

  function renderTaskSection(
    title: string,
    tasks: DashboardTask[],
    emptyMessage: string,
  ) {
    return (
      <section className="today-section">
        <div className="today-section-header">
          <h2>{title}</h2>

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
            {tasks.map((task) => (
              <article
                className="today-task"
                key={`${task.agendaId}-${task.pageId}-${task.id}`}
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() =>
                    handleToggleTask(
                      task,
                    )
                  }
                />

                <div className="today-task-content">
                  <span className="today-task-title">
                    {task.text}
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
                      {task.agendaTitle}
                      {' • '}
                      {task.pageTitle}
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
            ))}
          </div>
        )}
      </section>
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

          <h1>Hoje</h1>

          <p>
            {new Date().toLocaleDateString(
              'pt-BR',
              {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              },
            )}
          </p>
        </div>

        <div className="today-summary">
          <strong>
            {pendingTasks.length}
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
          ' Hoje',
          todayTasks,
          'Nada marcado para hoje.',
        )}

        {renderTaskSection(
          ' Próximas',
          upcomingTasks,
          'Nenhuma tarefa futura.',
        )}

        {renderTaskSection(
          ' Sem data',
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
                  .favorites.length
              }
            </span>
          </div>

          {dashboardData
            .favorites.length === 0 ? (
            <p className="empty-message">
              Nenhuma página favorita.
            </p>
          ) : (
            <div className="favorite-pages-grid">
              {dashboardData.favorites.map(
                (page) => (
                  <button
                    key={`${page.agendaId}-${page.pageId}`}
                    className="favorite-page-card"
                    type="button"
                    onClick={() =>
                      navigate(
                        `/agenda/${page.agendaId}`,
                      )
                    }
                  >
                    <strong>
                      {page.pageTitle}
                    </strong>

                    <span>
                      {page.agendaTitle}
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