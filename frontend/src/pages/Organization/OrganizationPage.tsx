import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import {
  apiRequest,
} from '../../services/api'

import './OrganizationPage.css'
import SubjectPicker from '../../components/SubjectPicker'
import AcademicCenter from './AcademicCenter'
import { useSearchParams } from 'react-router-dom'


type ProjectStatus =
  | 'active'
  | 'completed'
  | 'archived'

type ProjectPriority =
  | 'low'
  | 'medium'
  | 'high'

type OrganizationSection =
  | 'academic'
  | 'projects'
  | 'categories'
  | 'subjects'


type Project = {
  subject_id: number | null
  id: number
  user_id: number
  title: string
  description: string
  status: ProjectStatus
  priority: ProjectPriority
  color: string
  due_date: string | null
  created_at: string
  updated_at: string | null
}


type Category = {
  id: number
  user_id: number
  name: string
  color: string
  created_at: string
}


type Subject = {
  professor?: string | null
  semester?: string | null
  id: number
  user_id: number
  name: string
  color: string
  created_at: string
}


function formatDate(
  value: string | null,
) {
  if (!value) {
    return 'Sem prazo'
  }

  const date =
    new Date(
      `${value}T00:00:00`,
    )

  return date.toLocaleDateString(
    'pt-BR',
  )
}


function projectStatusLabel(
  status: ProjectStatus,
) {
  if (status === 'completed') {
    return 'Concluído'
  }

  if (status === 'archived') {
    return 'Arquivado'
  }

  return 'Ativo'
}


function projectPriorityLabel(
  priority: ProjectPriority,
) {
  if (priority === 'high') {
    return 'Alta'
  }

  if (priority === 'low') {
    return 'Baixa'
  }

  return 'Média'
}


function OrganizationPage() {
  const [searchParams] = useSearchParams()
  const [projectSubjectId, setProjectSubjectId] = useState<number | null>(null)
  const [professor, setProfessor] = useState('')
  const [semester, setSemester] = useState('')
  const [
    activeSection,
    setActiveSection,
  ] = useState<OrganizationSection>(
    searchParams.get('section') === 'projects' ? 'projects' : 'academic',
  )

  const [
    projects,
    setProjects,
  ] = useState<Project[]>([])

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([])

  const [
    subjects,
    setSubjects,
  ] = useState<Subject[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    saving,
    setSaving,
  ] = useState(false)


  const [
    projectTitle,
    setProjectTitle,
  ] = useState('')

  const [
    projectDescription,
    setProjectDescription,
  ] = useState('')

  const [
    projectStatus,
    setProjectStatus,
  ] = useState<ProjectStatus>(
    'active',
  )

  const [
    projectPriority,
    setProjectPriority,
  ] = useState<ProjectPriority>(
    'medium',
  )

  const [
    projectColor,
    setProjectColor,
  ] = useState('#a8b5a2')

  const [
    projectDueDate,
    setProjectDueDate,
  ] = useState('')

  const [
    editingProjectId,
    setEditingProjectId,
  ] = useState<number | null>(
    null,
  )


  const [
    categoryName,
    setCategoryName,
  ] = useState('')

  const [
    categoryColor,
    setCategoryColor,
  ] = useState('#c7b8d6')

  const [
    editingCategoryId,
    setEditingCategoryId,
  ] = useState<number | null>(
    null,
  )


  const [
    subjectName,
    setSubjectName,
  ] = useState('')

  const [
    subjectColor,
    setSubjectColor,
  ] = useState('#9fb9cc')

  const [
    editingSubjectId,
    setEditingSubjectId,
  ] = useState<number | null>(
    null,
  )


  useEffect(() => {
    let cancelled = false

    Promise.all([
      apiRequest<Project[]>(
        '/projects',
      ),

      apiRequest<Category[]>(
        '/categories',
      ),

      apiRequest<Subject[]>(
        '/subjects',
      ),
    ])
      .then(
        ([
          projectsData,
          categoriesData,
          subjectsData,
        ]) => {
          if (cancelled) {
            return
          }

          setProjects(
            projectsData,
          )

          setCategories(
            categoriesData,
          )

          setSubjects(
            subjectsData,
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
            : 'Não foi possível carregar a organização.',
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


  function clearMessages() {
    setError('')
    setMessage('')
  }


  function resetProjectForm() {
    setProjectSubjectId(null)
    setProjectTitle('')
    setProjectDescription('')
    setProjectStatus('active')
    setProjectPriority('medium')
    setProjectColor('#a8b5a2')
    setProjectDueDate('')
    setEditingProjectId(null)
  }


  function resetCategoryForm() {
    setCategoryName('')
    setCategoryColor('#c7b8d6')
    setEditingCategoryId(null)
  }


  function resetSubjectForm() {
    setSubjectName('')
    setProfessor('')
    setSemester('')
    setSubjectColor('#9fb9cc')
    setEditingSubjectId(null)
  }


  async function handleProjectSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const cleanTitle =
      projectTitle.trim()

    if (!cleanTitle) {
      setError(
        'Digite um nome para o projeto.',
      )

      return
    }

    try {
      setSaving(true)
      clearMessages()

      const body =
        JSON.stringify({
          title:
            cleanTitle,

          description:
            projectDescription.trim(),

          status:
            projectStatus,

          priority:
            projectPriority,

          color:
            projectColor,

          subject_id: projectSubjectId,
          due_date:
            projectDueDate
            || null,
        })


      if (
        editingProjectId !== null
      ) {
        const updated =
          await apiRequest<Project>(
            `/projects/${editingProjectId}`,
            {
              method: 'PATCH',
              body,
            },
          )

        setProjects(
          (current) =>
            current.map(
              (project) =>
                project.id
                === updated.id
                  ? updated
                  : project,
            ),
        )

        setMessage(
          'Projeto atualizado com sucesso.',
        )
      } else {
        const created =
          await apiRequest<Project>(
            '/projects',
            {
              method: 'POST',
              body,
            },
          )

        setProjects(
          (current) => [
            created,
            ...current,
          ],
        )

        setMessage(
          'Projeto criado com sucesso.',
        )
      }

      resetProjectForm()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar o projeto.',
      )
    } finally {
      setSaving(false)
    }
  }


  function startProjectEdit(
    project: Project,
  ) {
    setProjectSubjectId(project.subject_id ?? null)
    clearMessages()

    setEditingProjectId(
      project.id,
    )

    setProjectTitle(
      project.title,
    )

    setProjectDescription(
      project.description,
    )

    setProjectStatus(
      project.status,
    )

    setProjectPriority(
      project.priority,
    )

    setProjectColor(
      project.color,
    )

    setProjectDueDate(
      project.due_date ?? '',
    )

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }


  async function deleteProject(
    project: Project,
  ) {
    const confirmed =
      window.confirm(
        `Excluir o projeto "${project.title}"?`,
      )

    if (!confirmed) {
      return
    }

    try {
      clearMessages()

      await apiRequest<void>(
        `/projects/${project.id}`,
        {
          method: 'DELETE',
        },
      )

      setProjects(
        (current) =>
          current.filter(
            (item) =>
              item.id
              !== project.id,
          ),
      )

      if (
        editingProjectId
        === project.id
      ) {
        resetProjectForm()
      }

      setMessage(
        'Projeto excluído.',
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível excluir o projeto.',
      )
    }
  }


  async function handleCategorySubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const cleanName =
      categoryName.trim()

    if (!cleanName) {
      setError(
        'Digite um nome para a categoria.',
      )

      return
    }

    try {
      setSaving(true)
      clearMessages()

      const body =
        JSON.stringify({
          name:
            cleanName,

          color:
            categoryColor,
        })


      if (
        editingCategoryId !== null
      ) {
        const updated =
          await apiRequest<Category>(
            `/categories/${editingCategoryId}`,
            {
              method: 'PATCH',
              body,
            },
          )

        setCategories(
          (current) =>
            current.map(
              (category) =>
                category.id
                === updated.id
                  ? updated
                  : category,
            ),
        )

        setMessage(
          'Categoria atualizada.',
        )
      } else {
        const created =
          await apiRequest<Category>(
            '/categories',
            {
              method: 'POST',
              body,
            },
          )

        setCategories(
          (current) =>
            [
              ...current,
              created,
            ].sort(
              (a, b) =>
                a.name.localeCompare(
                  b.name,
                  'pt-BR',
                ),
            ),
        )

        setMessage(
          'Categoria criada.',
        )
      }

      resetCategoryForm()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar a categoria.',
      )
    } finally {
      setSaving(false)
    }
  }


  function startCategoryEdit(
    category: Category,
  ) {
    clearMessages()

    setEditingCategoryId(
      category.id,
    )

    setCategoryName(
      category.name,
    )

    setCategoryColor(
      category.color,
    )
  }


  async function deleteCategory(
    category: Category,
  ) {
    const confirmed =
      window.confirm(
        `Excluir a categoria "${category.name}"?`,
      )

    if (!confirmed) {
      return
    }

    try {
      clearMessages()

      await apiRequest<void>(
        `/categories/${category.id}`,
        {
          method: 'DELETE',
        },
      )

      setCategories(
        (current) =>
          current.filter(
            (item) =>
              item.id
              !== category.id,
          ),
      )

      if (
        editingCategoryId
        === category.id
      ) {
        resetCategoryForm()
      }

      setMessage(
        'Categoria excluída.',
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível excluir a categoria.',
      )
    }
  }


  async function handleSubjectSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const cleanName =
      subjectName.trim()

    if (!cleanName) {
      setError(
        'Digite um nome para a matéria.',
      )

      return
    }

    try {
      setSaving(true)
      clearMessages()

      const body =
        JSON.stringify({
          name:
            cleanName,

          color:
            subjectColor,
          professor: professor.trim() || null,
          semester: semester.trim() || null,
        })


      if (
        editingSubjectId !== null
      ) {
        const updated =
          await apiRequest<Subject>(
            `/subjects/${editingSubjectId}`,
            {
              method: 'PATCH',
              body,
            },
          )

        setSubjects(
          (current) =>
            current.map(
              (subject) =>
                subject.id
                === updated.id
                  ? updated
                  : subject,
            ),
        )

        setMessage(
          'Matéria atualizada.',
        )
      } else {
        const created =
          await apiRequest<Subject>(
            '/subjects',
            {
              method: 'POST',
              body,
            },
          )

        setSubjects(
          (current) =>
            [
              ...current,
              created,
            ].sort(
              (a, b) =>
                a.name.localeCompare(
                  b.name,
                  'pt-BR',
                ),
            ),
        )

        setMessage(
          'Matéria criada.',
        )
      }

      resetSubjectForm()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar a matéria.',
      )
    } finally {
      setSaving(false)
    }
  }


  function startSubjectEdit(
    subject: Subject,
  ) {
    setProfessor(subject.professor || '')
    setSemester(subject.semester || '')
    clearMessages()

    setEditingSubjectId(
      subject.id,
    )

    setSubjectName(
      subject.name,
    )

    setSubjectColor(
      subject.color,
    )
  }


  async function deleteSubject(
    subject: Subject,
  ) {
    const confirmed =
      window.confirm(
        `Excluir a matéria "${subject.name}"?`,
      )

    if (!confirmed) {
      return
    }

    try {
      clearMessages()

      await apiRequest<void>(
        `/subjects/${subject.id}`,
        {
          method: 'DELETE',
        },
      )

      setSubjects(
        (current) =>
          current.filter(
            (item) =>
              item.id
              !== subject.id,
          ),
      )

      if (
        editingSubjectId
        === subject.id
      ) {
        resetSubjectForm()
      }

      setMessage(
        'Matéria excluída.',
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível excluir a matéria.',
      )
    }
  }


  if (loading) {
    return (
      <section className="organization-page">
        <div className="organization-loading">
          Carregando organização...
        </div>
      </section>
    )
  }


  return (
    <section className="organization-page">
      <header className="organization-heading">
        <div>
          <span className="organization-eyebrow">
            Organização
          </span>

          <h1>
            Organize seu planner
          </h1>

          <p>
            Centralize projetos,
            categorias e matérias
            em um só lugar.
          </p>
        </div>
      </header>


      <div className="organization-tabs">
        <button type="button" className={activeSection === 'academic' ? 'organization-tab active' : 'organization-tab'} onClick={() => setActiveSection('academic')}>Central Acadêmica</button>
        <button
          type="button"
          className={
            activeSection === 'projects'
              ? 'organization-tab active'
              : 'organization-tab'
          }
          onClick={() => {
            clearMessages()

            setActiveSection(
              'projects',
            )
          }}
        >
          Projetos

          <span>
            {projects.length}
          </span>
        </button>


        <button
          type="button"
          className={
            activeSection === 'categories'
              ? 'organization-tab active'
              : 'organization-tab'
          }
          onClick={() => {
            clearMessages()

            setActiveSection(
              'categories',
            )
          }}
        >
          Categorias

          <span>
            {categories.length}
          </span>
        </button>


        <button
          type="button"
          className={
            activeSection === 'subjects'
              ? 'organization-tab active'
              : 'organization-tab'
          }
          onClick={() => {
            clearMessages()

            setActiveSection(
              'subjects',
            )
          }}
        >
          Matérias

          <span>
            {subjects.length}
          </span>
        </button>
      </div>


      {message && (
        <div className="organization-message success">
          {message}
        </div>
      )}


      {error && (
        <div className="organization-message error">
          {error}
        </div>
      )}


      {activeSection === 'academic' && <AcademicCenter />}
      {activeSection === 'projects' && (
        <div className="organization-section">
          <form
            className="organization-form-card"
            onSubmit={
              handleProjectSubmit
            }
          >
            <div className="organization-card-heading">
              <div>
                <span className="organization-card-kicker">
                  {editingProjectId !== null
                    ? 'Editando'
                    : 'Novo'}
                </span>

                <h2>
                  {editingProjectId !== null
                    ? 'Editar projeto'
                    : 'Criar projeto'}
                </h2>
              </div>


              {editingProjectId !== null && (
                <button
                  type="button"
                  className="organization-text-button"
                  onClick={
                    resetProjectForm
                  }
                >
                  Cancelar edição
                </button>
              )}
            </div>


            <div className="organization-form-grid">
              <SubjectPicker value={projectSubjectId} onChange={setProjectSubjectId} />
              <label className="organization-full">
                Nome do projeto

                <input
                  type="text"
                  required
                  maxLength={160}
                  value={projectTitle}
                  placeholder="Ex.: Super Planner"
                  onChange={(event) =>
                    setProjectTitle(
                      event.target.value,
                    )
                  }
                />
              </label>


              <label className="organization-full">
                Descrição

                <textarea
                  rows={4}
                  maxLength={4000}
                  value={
                    projectDescription
                  }
                  placeholder="Objetivo, detalhes e observações..."
                  onChange={(event) =>
                    setProjectDescription(
                      event.target.value,
                    )
                  }
                />
              </label>


              <label>
                Status

                <select
                  value={projectStatus}
                  onChange={(event) =>
                    setProjectStatus(
                      event.target.value as ProjectStatus,
                    )
                  }
                >
                  <option value="active">
                    Ativo
                  </option>

                  <option value="completed">
                    Concluído
                  </option>

                  <option value="archived">
                    Arquivado
                  </option>
                </select>
              </label>


              <label>
                Prioridade

                <select
                  value={
                    projectPriority
                  }
                  onChange={(event) =>
                    setProjectPriority(
                      event.target.value as ProjectPriority,
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
                Prazo

                <input
                  type="date"
                  value={
                    projectDueDate
                  }
                  onChange={(event) =>
                    setProjectDueDate(
                      event.target.value,
                    )
                  }
                />
              </label>


              <label>
                Cor

                <div className="organization-color-field">
                  <input
                    type="color"
                    value={
                      projectColor
                    }
                    onChange={(event) =>
                      setProjectColor(
                        event.target.value,
                      )
                    }
                  />

                  <span>
                    {projectColor}
                  </span>
                </div>
              </label>
            </div>


            <div className="organization-form-actions">
              <button
                type="submit"
                className="organization-primary-button"
                disabled={saving}
              >
                {saving
                  ? 'Salvando...'
                  : editingProjectId !== null
                    ? 'Salvar projeto'
                    : 'Criar projeto'}
              </button>
            </div>
          </form>


          <div className="organization-list-heading">
            <div>
              <h2>
                Seus projetos
              </h2>

              <p>
                {projects.length === 1
                  ? '1 projeto cadastrado'
                  : `${projects.length} projetos cadastrados`}
              </p>
            </div>
          </div>


          {projects.length === 0 ? (
            <div className="organization-empty">
              <strong>
                Nenhum projeto ainda.
              </strong>

              <span>
                Crie seu primeiro projeto
                usando o formulário acima.
              </span>
            </div>
          ) : (
            <div className="organization-project-grid">
              {projects.map(
                (project) => (
                  <article
                    key={project.id}
                    id={`project-${project.id}`}
                    className="organization-project-card"
                  >
                    <div
                      className="organization-project-color"
                      style={{
                        backgroundColor:
                          project.color,
                      }}
                    />


                    <div className="organization-project-body">
                      <div className="organization-project-top">
                        <div>
                          <h3>
                            {project.title}
                          </h3>

                          <div className="organization-project-meta">
                            <span
                              className={
                                `organization-chip status-${project.status}`
                              }
                            >
                              {
                                projectStatusLabel(
                                  project.status,
                                )
                              }
                            </span>

                            <span
                              className={
                                `organization-chip priority-${project.priority}`
                              }
                            >
                              {
                                projectPriorityLabel(
                                  project.priority,
                                )
                              }
                            </span>
                          </div>
                        </div>
                      </div>


                      {project.description && (
                        <p className="organization-project-description">
                          {project.description}
                        </p>
                      )}


                      <div className="organization-project-footer">
                        <span>
                          Prazo:{' '}
                          {
                            formatDate(
                              project.due_date,
                            )
                          }
                        </span>


                        <div className="organization-item-actions">
                          <button
                            type="button"
                            onClick={() =>
                              startProjectEdit(
                                project,
                              )
                            }
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="delete"
                            onClick={() =>
                              void deleteProject(
                                project,
                              )
                            }
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </div>
      )}


      {activeSection === 'categories' && (
        <div className="organization-section">
          <form
            className="organization-form-card compact"
            onSubmit={
              handleCategorySubmit
            }
          >
            <div className="organization-card-heading">
              <div>
                <span className="organization-card-kicker">
                  {editingCategoryId !== null
                    ? 'Editando'
                    : 'Nova'}
                </span>

                <h2>
                  {editingCategoryId !== null
                    ? 'Editar categoria'
                    : 'Criar categoria'}
                </h2>
              </div>


              {editingCategoryId !== null && (
                <button
                  type="button"
                  className="organization-text-button"
                  onClick={
                    resetCategoryForm
                  }
                >
                  Cancelar edição
                </button>
              )}
            </div>


            <div className="organization-inline-form">
              <label>
                Nome

                <input
                  type="text"
                  required
                  maxLength={100}
                  value={
                    categoryName
                  }
                  placeholder="Ex.: Faculdade"
                  onChange={(event) =>
                    setCategoryName(
                      event.target.value,
                    )
                  }
                />
              </label>


              <label className="organization-small-color">
                Cor

                <input
                  type="color"
                  value={
                    categoryColor
                  }
                  onChange={(event) =>
                    setCategoryColor(
                      event.target.value,
                    )
                  }
                />
              </label>


              <button
                type="submit"
                className="organization-primary-button"
                disabled={saving}
              >
                {saving
                  ? 'Salvando...'
                  : editingCategoryId !== null
                    ? 'Salvar'
                    : 'Criar'}
              </button>
            </div>
          </form>


          {categories.length === 0 ? (
            <div className="organization-empty">
              <strong>
                Nenhuma categoria ainda.
              </strong>

              <span>
                Categorias ajudam a
                organizar tarefas e eventos.
              </span>
            </div>
          ) : (
            <div className="organization-simple-grid">
              {categories.map(
                (category) => (
                  <article
                    key={category.id}
                    className="organization-simple-card"
                  >
                    <div className="organization-simple-info">
                      <span
                        className="organization-dot"
                        style={{
                          backgroundColor:
                            category.color,
                        }}
                      />

                      <strong>
                        {category.name}
                      </strong>
                    </div>


                    <div className="organization-item-actions">
                      <button
                        type="button"
                        onClick={() =>
                          startCategoryEdit(
                            category,
                          )
                        }
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="delete"
                        onClick={() =>
                          void deleteCategory(
                            category,
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
          )}
        </div>
      )}


      {activeSection === 'subjects' && (
        <div className="organization-section">
          <form
            className="organization-form-card compact"
            onSubmit={
              handleSubjectSubmit
            }
          >
            <div className="organization-card-heading">
              <div>
                <span className="organization-card-kicker">
                  {editingSubjectId !== null
                    ? 'Editando'
                    : 'Nova'}
                </span>

                <h2>
                  {editingSubjectId !== null
                    ? 'Editar matéria'
                    : 'Criar matéria'}
                </h2>
              </div>


              {editingSubjectId !== null && (
                <button
                  type="button"
                  className="organization-text-button"
                  onClick={
                    resetSubjectForm
                  }
                >
                  Cancelar edição
                </button>
              )}
            </div>


            <div className="organization-inline-form">
              <label>Professor<input maxLength={160} value={professor} onChange={e => setProfessor(e.target.value)} /></label>
              <label>Semestre / período<input maxLength={80} placeholder="Ex.: 2026.2" value={semester} onChange={e => setSemester(e.target.value)} /></label>
              <label>
                Nome

                <input
                  type="text"
                  required
                  maxLength={100}
                  value={
                    subjectName
                  }
                  placeholder="Ex.: Banco de Dados"
                  onChange={(event) =>
                    setSubjectName(
                      event.target.value,
                    )
                  }
                />
              </label>


              <label className="organization-small-color">
                Cor

                <input
                  type="color"
                  value={
                    subjectColor
                  }
                  onChange={(event) =>
                    setSubjectColor(
                      event.target.value,
                    )
                  }
                />
              </label>


              <button
                type="submit"
                className="organization-primary-button"
                disabled={saving}
              >
                {saving
                  ? 'Salvando...'
                  : editingSubjectId !== null
                    ? 'Salvar'
                    : 'Criar'}
              </button>
            </div>
          </form>


          {subjects.length === 0 ? (
            <div className="organization-empty">
              <strong>
                Nenhuma matéria ainda.
              </strong>

              <span>
                Crie matérias para
                organizar seus estudos.
              </span>
            </div>
          ) : (
            <div className="organization-simple-grid">
              {subjects.map(
                (subject) => (
                  <article
                    key={subject.id}
                    className="organization-simple-card"
                  >
                    <div className="organization-simple-info">
                      <span
                        className="organization-dot"
                        style={{
                          backgroundColor:
                            subject.color,
                        }}
                      />

                      <strong>
                        {subject.name}
                      </strong>
                    </div>


                    <div className="organization-item-actions">
                      <button
                        type="button"
                        onClick={() =>
                          startSubjectEdit(
                            subject,
                          )
                        }
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="delete"
                        onClick={() =>
                          void deleteSubject(
                            subject,
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
          )}
        </div>
      )}
    </section>
  )
}


export default OrganizationPage