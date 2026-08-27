import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  useEffect,
  useState,
} from 'react'

import './AgendaPage.css'

const AGENDA_STORAGE_KEY = 'planner-agendas'
const MAX_PAGES = 400

type StoredAgenda = {
  id: number
  title: string
  coverColor: string
}

type PlannerTask = {
  id: number
  text: string
  done: boolean
}

type PlannerPage = {
  id: number
  title: string
  content: string
  favorite: boolean
  tasks: PlannerTask[]
}

function createInitialPages(): PlannerPage[] {
  return [
    {
      id: 1,
      title: 'Página 1',
      content: '',
      favorite: false,
      tasks: [],
    },
    {
      id: 2,
      title: 'Página 2',
      content: '',
      favorite: false,
      tasks: [],
    },
    {
      id: 3,
      title: 'Página 3',
      content: '',
      favorite: false,
      tasks: [],
    },
    {
      id: 4,
      title: 'Página 4',
      content: '',
      favorite: false,
      tasks: [],
    },
    {
      id: 5,
      title: 'Página 5',
      content: '',
      favorite: false,
      tasks: [],
    },
  ]
}

function AgendaPage() {
  const { id } = useParams()

  const pagesStorageKey = `planner-pages-${id}`

  const savedAgendas =
    localStorage.getItem(AGENDA_STORAGE_KEY)

  const agendas: StoredAgenda[] = savedAgendas
    ? JSON.parse(savedAgendas)
    : []

  const agenda = agendas.find(
    (item) => String(item.id) === id,
  )

  const [pages, setPages] = useState<PlannerPage[]>(() => {
    const savedPages =
      localStorage.getItem(pagesStorageKey)

    if (savedPages) {
      const parsedPages = JSON.parse(
        savedPages,
      ) as PlannerPage[]

      return parsedPages.map((page) => ({
        id: page.id,
        title: page.title,
        content: page.content,
        favorite: page.favorite ?? false,
        tasks: page.tasks ?? [],
      }))
    }

    return createInitialPages()
  })

  const [activePageId, setActivePageId] =
    useState<number | null>(
      pages[0]?.id ?? null,
    )

  const [newTaskText, setNewTaskText] =
    useState('')

  useEffect(() => {
    localStorage.setItem(
      pagesStorageKey,
      JSON.stringify(pages),
    )
  }, [pages, pagesStorageKey])

  const activePage = pages.find(
    (page) => page.id === activePageId,
  )

  function handleCreatePage() {
    if (pages.length >= MAX_PAGES) {
      alert(
        `Uma agenda pode ter no máximo ${MAX_PAGES} páginas.`,
      )

      return
    }

    const newPage: PlannerPage = {
      id: Date.now(),
      title: `Página ${pages.length + 1}`,
      content: '',
      favorite: false,
      tasks: [],
    }

    setPages([...pages, newPage])
    setActivePageId(newPage.id)
  }

  function handleChangeTitle(
    newTitle: string,
  ) {
    setPages(
      pages.map((page) =>
        page.id === activePageId
          ? {
              ...page,
              title: newTitle,
            }
          : page,
      ),
    )
  }

  function handleChangeContent(
    newContent: string,
  ) {
    setPages(
      pages.map((page) =>
        page.id === activePageId
          ? {
              ...page,
              content: newContent,
            }
          : page,
      ),
    )
  }

  function handleToggleFavorite() {
    setPages(
      pages.map((page) =>
        page.id === activePageId
          ? {
              ...page,
              favorite: !page.favorite,
            }
          : page,
      ),
    )
  }

  function handleAddTask() {
    if (
      newTaskText.trim() === '' ||
      activePageId === null
    ) {
      return
    }

    const newTask: PlannerTask = {
      id: Date.now(),
      text: newTaskText.trim(),
      done: false,
    }

    setPages(
      pages.map((page) =>
        page.id === activePageId
          ? {
              ...page,
              tasks: [
                ...page.tasks,
                newTask,
              ],
            }
          : page,
      ),
    )

    setNewTaskText('')
  }

  function handleToggleTask(
    taskId: number,
  ) {
    setPages(
      pages.map((page) =>
        page.id === activePageId
          ? {
              ...page,
              tasks: page.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      done: !task.done,
                    }
                  : task,
              ),
            }
          : page,
      ),
    )
  }

  function handleDeleteTask(
    taskId: number,
  ) {
    setPages(
      pages.map((page) =>
        page.id === activePageId
          ? {
              ...page,
              tasks: page.tasks.filter(
                (task) =>
                  task.id !== taskId,
              ),
            }
          : page,
      ),
    )
  }

  function handleDeletePage() {
    if (pages.length <= 1) {
      alert(
        'A agenda precisa ter pelo menos uma página.',
      )

      return
    }

    const remainingPages = pages.filter(
      (page) => page.id !== activePageId,
    )

    setPages(remainingPages)

    setActivePageId(
      remainingPages[0].id,
    )
  }

  if (!agenda) {
    return (
      <main className="agenda-page">
        <Link to="/">
          ← Voltar para Biblioteca
        </Link>

        <h1>Agenda não encontrada</h1>
      </main>
    )
  }

  return (
    <main className="agenda-page">
      <aside className="agenda-sidebar">
        <Link
          className="back-link"
          to="/"
        >
          ← Biblioteca
        </Link>

        <h2>{agenda.title}</h2>

        <div className="pages-header">
          <span>
            {pages.length}/{MAX_PAGES}
          </span>

          <button
            type="button"
            onClick={handleCreatePage}
          >
            + Página
          </button>
        </div>

        <div className="pages-list">
          {pages.map((page) => (
            <button
              key={page.id}
              className={
                page.id === activePageId
                  ? 'page-button active'
                  : 'page-button'
              }
              type="button"
              onClick={() =>
                setActivePageId(page.id)
              }
            >
              {page.favorite && '★ '}
              {page.title || 'Sem título'}
            </button>
          ))}
        </div>
      </aside>

      <section className="agenda-editor">
        {activePage && (
          <>
            <div className="editor-header">
              <input
                className="page-title-input"
                type="text"
                value={activePage.title}
                placeholder="Título da página"
                onChange={(event) =>
                  handleChangeTitle(
                    event.target.value,
                  )
                }
              />

              <button
                className="favorite-button"
                type="button"
                onClick={handleToggleFavorite}
              >
                {activePage.favorite
                  ? '★ Favorita'
                  : '☆ Favoritar'}
              </button>

              <button
                className="delete-page-button"
                type="button"
                onClick={handleDeletePage}
              >
                Excluir página
              </button>
            </div>

            <section className="tasks-section">
              <h3>Tarefas</h3>

              <form
                className="task-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  handleAddTask()
                }}
              >
                <input
                  type="text"
                  value={newTaskText}
                  placeholder="Adicionar tarefa..."
                  onChange={(event) =>
                    setNewTaskText(
                      event.target.value,
                    )
                  }
                />

                <button type="submit">
                  Adicionar
                </button>
              </form>

              <div className="task-list">
                {activePage.tasks.map(
                  (task) => (
                    <div
                      className="task-item"
                      key={task.id}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() =>
                            handleToggleTask(
                              task.id,
                            )
                          }
                        />

                        <span
                          className={
                            task.done
                              ? 'task-text done'
                              : 'task-text'
                          }
                        >
                          {task.text}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteTask(
                            task.id,
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  ),
                )}
              </div>
            </section>

            <textarea
              className="page-content"
              value={activePage.content}
              placeholder="Comece a escrever..."
              onChange={(event) =>
                handleChangeContent(
                  event.target.value,
                )
              }
            />

            <span className="autosave-message">
              Salvo automaticamente
            </span>
          </>
        )}
      </section>
    </main>
  )
}

export default AgendaPage