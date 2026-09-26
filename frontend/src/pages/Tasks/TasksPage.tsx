import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'

import {
  apiRequest,
} from '../../services/api'

import './TasksPage.css'
import SubjectPicker from '../../components/SubjectPicker'


type TaskPriority =
  | 'low'
  | 'medium'
  | 'high'


type Task = {
  subject_id: number | null
  id: number
  user_id: number
  page_id: number | null
  project_id: number | null
  category_id: number | null
  text: string
  description: string
  done: boolean
  due_date: string | null
  due_at: string | null
  priority: TaskPriority
  show_in_calendar: boolean
  created_at: string
  updated_at: string | null
}


type Project = {
  id: number
  title: string
  status: string
  color: string
}


type Category = {
  id: number
  name: string
  color: string
}


type TaskFilter =
  | 'all'
  | 'pending'
  | 'done'
  | 'calendar'


function priorityLabel(
  priority: TaskPriority,
) {
  if (priority === 'high') {
    return 'Alta'
  }

  if (priority === 'low') {
    return 'Baixa'
  }

  return 'Média'
}


function formatDate(
  value: string | null,
) {
  if (!value) {
    return 'Sem data'
  }

  const date =
    new Date(
      `${value}T00:00:00`,
    )

  return date.toLocaleDateString(
    'pt-BR',
  )
}


function TasksPage() {
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [
    tasks,
    setTasks,
  ] = useState<Task[]>([])

  const [
    projects,
    setProjects,
  ] = useState<Project[]>([])

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    filter,
    setFilter,
  ] = useState<TaskFilter>(
    'all',
  )


  const [
    editingTaskId,
    setEditingTaskId,
  ] = useState<number | null>(
    null,
  )

  const [
    text,
    setText,
  ] = useState('')

  const [
    description,
    setDescription,
  ] = useState('')

  const [
    dueDate,
    setDueDate,
  ] = useState('')

  const [
    priority,
    setPriority,
  ] = useState<TaskPriority>(
    'medium',
  )

  const [
    projectId,
    setProjectId,
  ] = useState('')

  const [
    categoryId,
    setCategoryId,
  ] = useState('')

  const [
    showInCalendar,
    setShowInCalendar,
  ] = useState(true)


  useEffect(() => {
    let cancelled = false

    Promise.all([
      apiRequest<Task[]>(
        '/tasks',
      ),

      apiRequest<Project[]>(
        '/projects',
      ),

      apiRequest<Category[]>(
        '/categories',
      ),
    ])
      .then(
        ([
          tasksData,
          projectsData,
          categoriesData,
        ]) => {
          if (cancelled) {
            return
          }

          setTasks(
            tasksData,
          )

          setProjects(
            projectsData,
          )

          setCategories(
            categoriesData,
          )
        },
      )
      .catch((err) => {
        if (cancelled) {
          return
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar as tarefas.',
        )
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])


  const filteredTasks =
    useMemo(
      () => {
        if (filter === 'pending') {
          return tasks.filter(
            (task) =>
              !task.done,
          )
        }

        if (filter === 'done') {
          return tasks.filter(
            (task) =>
              task.done,
          )
        }

        if (filter === 'calendar') {
          return tasks.filter(
            (task) =>
              task.show_in_calendar,
          )
        }

        return tasks
      },
      [
        filter,
        tasks,
      ],
    )

  const completedCount =
    tasks.filter(
      (task) => task.done,
    ).length

  const completionPercent =
    tasks.length === 0
      ? 0
      : Math.round(
          completedCount / tasks.length * 100,
        )


  function clearMessages() {
    setError('')
    setMessage('')
  }


  function resetForm() {
    setSubjectId(null)
    setEditingTaskId(null)
    setText('')
    setDescription('')
    setDueDate('')
    setPriority('medium')
    setProjectId('')
    setCategoryId('')
    setShowInCalendar(true)
  }


  function startEdit(
    task: Task,
  ) {
    setSubjectId(task.subject_id ?? null)
    clearMessages()

    setEditingTaskId(
      task.id,
    )

    setText(
      task.text,
    )

    setDescription(
      task.description,
    )

    setDueDate(
      task.due_date ?? '',
    )

    setPriority(
      task.priority,
    )

    setProjectId(
      task.project_id
        ? String(task.project_id)
        : '',
    )

    setCategoryId(
      task.category_id
        ? String(task.category_id)
        : '',
    )

    setShowInCalendar(
      task.show_in_calendar,
    )

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const cleanText =
      text.trim()

    if (!cleanText) {
      setError(
        'Digite o nome da tarefa.',
      )

      return
    }

    try {
      setSaving(true)
      clearMessages()

      const body =
        JSON.stringify({
          text:
            cleanText,

          description:
            description.trim(),

          due_date:
            dueDate || null,

          priority,

          subject_id: subjectId,
          project_id:
            projectId
              ? Number(projectId)
              : null,

          category_id:
            categoryId
              ? Number(categoryId)
              : null,

          show_in_calendar:
            showInCalendar,
        })


      if (
        editingTaskId !== null
      ) {
        const updated =
          await apiRequest<Task>(
            `/tasks/${editingTaskId}`,
            {
              method: 'PATCH',
              body,
            },
          )

        setTasks(
          (current) =>
            current.map(
              (task) =>
                task.id === updated.id
                  ? updated
                  : task,
            ),
        )

        setMessage(
          'Tarefa atualizada com sucesso.',
        )
      } else {
        const created =
          await apiRequest<Task>(
            '/tasks',
            {
              method: 'POST',
              body,
            },
          )

        setTasks(
          (current) => [
            ...current,
            created,
          ],
        )

        setMessage(
          'Tarefa criada com sucesso.',
        )
      }

      resetForm()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar a tarefa.',
      )
    } finally {
      setSaving(false)
    }
  }


  async function toggleDone(
    task: Task,
  ) {
    const nextDone =
      !task.done

    try {
      clearMessages()
      const updated =
        await apiRequest<Task>(
          `/tasks/${task.id}`,
          {
            method: 'PATCH',

            body: JSON.stringify({
              done:
                nextDone,
            }),
          },
        )

      setTasks(
        (current) =>
          current.map(
            (item) =>
              item.id === updated.id
                ? updated
                : item,
          ),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar a tarefa.',
      )
    }
  }


  async function toggleCalendar(
    task: Task,
  ) {
    const nextValue =
      !task.show_in_calendar

    try {
      clearMessages()
      const updated =
        await apiRequest<Task>(
          `/tasks/${task.id}`,
          {
            method: 'PATCH',

            body: JSON.stringify({
              show_in_calendar:
                nextValue,
            }),
          },
        )

      setTasks(
        (current) =>
          current.map(
            (item) =>
              item.id === updated.id
                ? updated
                : item,
          ),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar o calendário.',
      )
    }
  }


  async function deleteTask(
    task: Task,
  ) {
    const confirmed =
      window.confirm(
        `Excluir a tarefa "${task.text}"?`,
      )

    if (!confirmed) {
      return
    }

    try {
      clearMessages()

      await apiRequest<void>(
        `/tasks/${task.id}`,
        {
          method: 'DELETE',
        },
      )

      setTasks(
        (current) =>
          current.filter(
            (item) =>
              item.id !== task.id,
          ),
      )

      if (
        editingTaskId === task.id
      ) {
        resetForm()
      }

      setMessage(
        'Tarefa excluída.',
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível excluir a tarefa.',
      )
    }
  }


  function getProject(
    id: number | null,
  ) {
    if (id === null) {
      return null
    }

    return projects.find(
      (project) =>
        project.id === id,
    ) ?? null
  }


  function getCategory(
    id: number | null,
  ) {
    if (id === null) {
      return null
    }

    return categories.find(
      (category) =>
        category.id === id,
    ) ?? null
  }


  if (loading) {
    return (
      <section className="tasks-page">
        <div className="tasks-loading">
          Carregando tarefas...
        </div>
      </section>
    )
  }


  return (
    <section className="tasks-page">
      <header className="tasks-heading">
        <div>
          <span className="tasks-eyebrow">
            Planejamento
          </span>

          <h1>
            Tarefas
          </h1>

          <p>
            Organize o que precisa fazer
            e escolha o que deve aparecer
            no calendário.
          </p>
        </div>
      </header>

      <div className="tasks-receipt-banner">
        <div>
          <span className="tasks-receipt-kicker">LISTA Nº {String(tasks.length).padStart(2, '0')}</span>
          <strong>CHECKOUT DO DIA</strong>
        </div>
        <div className="tasks-receipt-stamp" aria-label={`${completionPercent}% das tarefas concluídas`}>
          <strong>{completionPercent}%</strong>
          <span>feito</span>
        </div>
      </div>

      <div className="tasks-summary-strip" aria-label="Resumo das tarefas">
        <span><b>{String(tasks.length).padStart(2, '0')}</b> itens</span>
        <span><b>{String(tasks.length - completedCount).padStart(2, '0')}</b> abertos</span>
        <span><b>{String(completedCount).padStart(2, '0')}</b> pagos</span>
        <span className="tasks-progress-bar"><i style={{ width: `${completionPercent}%` }} /></span>
      </div>


      {message && (
        <div className="tasks-message success">
          {message}
        </div>
      )}


      {error && (
        <div className="tasks-message error">
          {error}
        </div>
      )}


      <form
        className="tasks-form-card"
        onSubmit={
          handleSubmit
        }
      >
        <div className="tasks-card-heading">
          <div>
            <span className="tasks-card-kicker">
              {editingTaskId !== null
                ? 'Editando'
                : 'Nova'}
            </span>

            <h2>
              {editingTaskId !== null
                ? 'Editar tarefa'
                : 'Criar tarefa'}
            </h2>
          </div>


          {editingTaskId !== null && (
            <button
              type="button"
              className="tasks-text-button"
              onClick={
                resetForm
              }
            >
              Cancelar edição
            </button>
          )}
        </div>


        <div className="tasks-form-grid">
          <SubjectPicker value={subjectId} onChange={setSubjectId} />
          <label className="tasks-full">
            Tarefa

            <input
              type="text"
              required
              maxLength={300}
              value={text}
              placeholder="Ex.: Terminar relatório"
              onChange={(event) =>
                setText(
                  event.target.value,
                )
              }
            />
          </label>


          <label className="tasks-full">
            Descrição

            <textarea
              rows={4}
              maxLength={3000}
              value={description}
              placeholder="Detalhes, observações ou contexto..."
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
            />
          </label>


          <label>
            Data

            <input
              type="date"
              value={dueDate}
              onChange={(event) =>
                setDueDate(
                  event.target.value,
                )
              }
            />
          </label>


          <label>
            Prioridade

            <select
              value={priority}
              onChange={(event) =>
                setPriority(
                  event.target.value as TaskPriority,
                )
              }
            >
              <option value="low">
                Baixa
              </option>

              <option value="medium">
                Média
              </option>

              <option value="high">
                Alta
              </option>
            </select>
          </label>


          <label>
            Projeto

            <select
              value={projectId}
              onChange={(event) =>
                setProjectId(
                  event.target.value,
                )
              }
            >
              <option value="">
                Sem projeto
              </option>

              {projects.map(
                (project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    {project.title}
                  </option>
                ),
              )}
            </select>
          </label>


          <label>
            Categoria

            <select
              value={categoryId}
              onChange={(event) =>
                setCategoryId(
                  event.target.value,
                )
              }
            >
              <option value="">
                Sem categoria
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ),
              )}
            </select>
          </label>


          <label className="tasks-calendar-option tasks-full">
            <input
              type="checkbox"
              checked={
                showInCalendar
              }
              onChange={(event) =>
                setShowInCalendar(
                  event.target.checked,
                )
              }
            />

            <span>
              <strong>
                Mostrar no calendário
              </strong>

              <small>
                A tarefa só aparecerá no
                calendário se esta opção
                estiver marcada e houver
                uma data definida.
              </small>
            </span>
          </label>
        </div>


        <div className="tasks-form-actions">
          <button
            type="submit"
            className="tasks-primary-button"
            disabled={saving}
          >
            {saving
              ? 'Salvando...'
              : editingTaskId !== null
                ? 'Salvar tarefa'
                : 'Criar tarefa'}
          </button>
        </div>
      </form>


      <div className="tasks-list-header">
        <div>
          <h2>
            Suas tarefas
          </h2>

          <p>
            {tasks.length === 1
              ? '1 tarefa cadastrada'
              : `${tasks.length} tarefas cadastradas`}
          </p>
        </div>


        <div className="tasks-filters">
          <button
            type="button"
            className={
              filter === 'all'
                ? 'active'
                : ''
            }
            onClick={() =>
              setFilter('all')
            }
          >
            Todas
          </button>

          <button
            type="button"
            className={
              filter === 'pending'
                ? 'active'
                : ''
            }
            onClick={() =>
              setFilter('pending')
            }
          >
            Pendentes
          </button>

          <button
            type="button"
            className={
              filter === 'done'
                ? 'active'
                : ''
            }
            onClick={() =>
              setFilter('done')
            }
          >
            Concluídas
          </button>

          <button
            type="button"
            className={
              filter === 'calendar'
                ? 'active'
                : ''
            }
            onClick={() =>
              setFilter('calendar')
            }
          >
            No calendário
          </button>
        </div>
      </div>


      {filteredTasks.length === 0 ? (
        <div className="tasks-empty">
          <strong>
            Nenhuma tarefa aqui.
          </strong>

          <span>
            Crie uma tarefa ou altere
            o filtro selecionado.
          </span>
        </div>
      ) : (
        <div className="tasks-list">
          {filteredTasks.map(
            (task, index) => {
              const project =
                getProject(
                  task.project_id,
                )

              const category =
                getCategory(
                  task.category_id,
                )

              return (
                <article
                  key={task.id} id={`task-${task.id}`}
                  className={
                    task.done
                      ? 'task-card done'
                      : 'task-card'
                  }
                >
                  <div className="task-item-number" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <button
                    type="button"
                    className={
                      task.done
                        ? 'task-check checked'
                        : 'task-check'
                    }
                    aria-label={
                      task.done
                        ? 'Marcar como pendente'
                        : 'Marcar como concluída'
                    }
                    onClick={() =>
                      void toggleDone(
                        task,
                      )
                    }
                  >
                    {task.done
                      ? '✓'
                      : ''}
                  </button>


                  <div className="task-card-content">
                    <div className="task-card-title-row">
                      <h3>
                        {task.text}
                      </h3>

                      <span
                        className={
                          `task-priority priority-${task.priority}`
                        }
                      >
                        {
                          priorityLabel(
                            task.priority,
                          )
                        }
                      </span>
                    </div>


                    {task.description && (
                      <p className="task-description">
                        {task.description}
                      </p>
                    )}


                    <div className="task-meta">
                      <span className="task-status-label">
                        {task.done ? 'STATUS: PAGO' : 'STATUS: ABERTO'}
                      </span>
                      <span>
                        Data: {
                          formatDate(
                            task.due_date,
                          )
                        }
                      </span>


                      {task.page_id !== null && (
                        <span>
                          Vinculada a uma página
                        </span>
                      )}


                      {project && (
                        <span
                          className="task-tag"
                          style={{
                            borderColor:
                              project.color,
                          }}
                        >
                          {project.title}
                        </span>
                      )}


                      {category && (
                        <span
                          className="task-tag"
                          style={{
                            borderColor:
                              category.color,
                          }}
                        >
                          {category.name}
                        </span>
                      )}
                    </div>


                    <div className="task-calendar-row">
                      <button
                        type="button"
                        className={
                          task.show_in_calendar
                            ? 'task-calendar-toggle active'
                            : 'task-calendar-toggle'
                        }
                        onClick={() =>
                          void toggleCalendar(
                            task,
                          )
                        }
                      >
                        {task.show_in_calendar
                          ? '✓ No calendário'
                          : 'Fora do calendário'}
                      </button>


                      {task.show_in_calendar
                        && !task.due_date && (
                        <span className="task-calendar-warning">
                          Defina uma data para
                          aparecer no calendário.
                        </span>
                      )}
                    </div>
                  </div>


                  <div className="task-actions">
                    <button
                      type="button"
                      onClick={() =>
                        startEdit(
                          task,
                        )
                      }
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="delete"
                      onClick={() =>
                        void deleteTask(
                          task,
                        )
                      }
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              )
            },
          )}
        </div>
      )}

      <footer className="tasks-receipt-total">
        <span>TOTAL DO DIA</span>
        <strong>{completedCount} / {tasks.length || 0}</strong>
        <small>tarefas concluídas</small>
      </footer>
    </section>
  )
}


export default TasksPage