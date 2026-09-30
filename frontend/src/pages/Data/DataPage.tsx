import {
  useEffect,
  useState,
} from 'react'

import {
  apiRequest,
} from '../../services/api'

import './DataPage.css'


type StorageSummary = {
  upload_bytes: number
  upload_megabytes: number
  media_library_items: number
  page_media_items: number
  templates: number
  agendas: number
  pages: number
}


type AnalyticsPeriod =
  | '7days'
  | 'current_month'
  | 'previous_month'


type SubjectAnalytics = {
  id: number
  name: string
  color: string | null
  study_minutes: number
  study_sessions: number
  completed_tasks: number
  pending_tasks: number
}


type ProjectAnalytics = {
  id: number
  title: string
  color: string | null
  status: string | null
  study_minutes: number
  study_sessions: number
  completed_tasks: number
  pending_tasks: number
}


type DailyAnalytics = {
  date: string
  study_minutes: number
  completed_tasks: number
}


type AnalyticsSummary = {
  period: AnalyticsPeriod
  start_date: string
  end_date: string
  studies: {
    total_minutes: number
    sessions: number
    daily_average_minutes: number
  }
  tasks: {
    completed: number
    pending: number
    overdue: number
    completion_rate: number
  }
  timeline: DailyAnalytics[]
  subjects: SubjectAnalytics[]
  projects: ProjectAnalytics[]
}


const PERIOD_OPTIONS: Array<{
  value: AnalyticsPeriod
  label: string
}> = [
  {
    value: '7days',
    label: 'Últimos 7 dias',
  },
  {
    value: 'current_month',
    label: 'Mês atual',
  },
  {
    value: 'previous_month',
    label: 'Mês anterior',
  },
]


function formatMinutes(totalMinutes: number) {
  const safeMinutes = Math.max(
    0,
    Math.round(totalMinutes),
  )
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  if (hours === 0) {
    return `${minutes} min`
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}min`
}


function formatIsoDate(value: string) {
  const [year, month, day] = value
    .split('-')
    .map(Number)

  if (!year || !month || !day) {
    return value
  }

  return new Date(
    year,
    month - 1,
    day,
  ).toLocaleDateString('pt-BR')
}


function safeColor(
  value: string | null,
  fallback: string,
) {
  if (!value) {
    return fallback
  }

  const normalized = value.trim()

  if (
    /^#[0-9a-f]{3,8}$/i.test(normalized)
    || /^rgb(a)?\(/i.test(normalized)
    || /^hsl(a)?\(/i.test(normalized)
  ) {
    return normalized
  }

  return fallback
}


function formatChartLabel(
  value: string,
  period: AnalyticsPeriod,
) {
  const [year, month, day] = value
    .split('-')
    .map(Number)

  if (!year || !month || !day) {
    return value
  }

  const chartDate = new Date(
    year,
    month - 1,
    day,
  )

  if (period === '7days') {
    return chartDate
      .toLocaleDateString(
        'pt-BR',
        {
          weekday: 'short',
        },
      )
      .replace('.', '')
  }

  return String(day)
    .padStart(2, '0')
}


function chartBarHeight(
  value: number,
  maximum: number,
) {
  if (value <= 0) {
    return 0
  }

  return Math.max(
    8,
    Math.round(
      (value / Math.max(1, maximum)) * 100,
    ),
  )
}


function DataPage() {
  const [storage, setStorage] =
    useState<StorageSummary | null>(null)
  const [isLoading, setIsLoading] =
    useState(true)
  const [loadError, setLoadError] =
    useState('')
  const [isExporting, setIsExporting] =
    useState(false)
  const [exportError, setExportError] =
    useState('')
  const [exportedAt, setExportedAt] =
    useState<string | null>(null)
  const [analyticsPeriod, setAnalyticsPeriod] =
    useState<AnalyticsPeriod>('7days')
  const [analytics, setAnalytics] =
    useState<AnalyticsSummary | null>(null)
  const [analyticsLoading, setAnalyticsLoading] =
    useState(true)
  const [analyticsError, setAnalyticsError] =
    useState('')


  useEffect(() => {
    let cancelled = false

    async function loadStorage() {
      try {
        setLoadError('')

        const data =
          await apiRequest<StorageSummary>(
            '/data/storage',
          )

        if (!cancelled) {
          setStorage(data)
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error(error)

        setLoadError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os dados de armazenamento.',
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadStorage()

    return () => {
      cancelled = true
    }
  }, [])


  useEffect(() => {
    let cancelled = false

    async function loadAnalytics() {
      try {
        setAnalyticsLoading(true)
        setAnalyticsError('')

        const data =
          await apiRequest<AnalyticsSummary>(
            `/data/analytics?period=${analyticsPeriod}`,
          )

        if (!cancelled) {
          setAnalytics(data)
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error(error)
        setAnalytics(null)

        setAnalyticsError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar o resumo do período.',
        )
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false)
        }
      }
    }

    void loadAnalytics()

    return () => {
      cancelled = true
    }
  }, [analyticsPeriod])


  async function handleExportData() {
    setIsExporting(true)
    setExportError('')

    try {
      const data = await apiRequest<{
        version: number
        exported_at: string
      }>('/data/export')

      const generatedAt =
        new Date(data.exported_at)

      if (
        data.version !== 3
        || Number.isNaN(generatedAt.getTime())
      ) {
        throw new Error(
          'O servidor retornou um backup inválido. Tente novamente.',
        )
      }

      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        {
          type: 'application/json;charset=utf-8',
        },
      )

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download =
        `matcha-planner-backup-v3-${generatedAt
          .toISOString()
          .replace(/[:.]/g, '-')}.json`

      document.body.appendChild(link)

      try {
        link.click()
        setExportedAt(data.exported_at)
      } finally {
        link.remove()
        window.setTimeout(
          () => URL.revokeObjectURL(url),
          1000,
        )
      }
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : 'Não foi possível exportar seus dados.',
      )
    } finally {
      setIsExporting(false)
    }
  }


  const maxStudyMinutes = analytics
    ? Math.max(
        0,
        ...analytics.timeline.map(
          item => item.study_minutes,
        ),
      )
    : 1

  const maxCompletedTasks = analytics
    ? Math.max(
        0,
        ...analytics.timeline.map(
          item => item.completed_tasks,
        ),
      )
    : 1


  return (
    <main className="data-page">
      <section className="data-hero">
        <div>
          <span className="data-eyebrow">
            Meu planner
          </span>

          <h1>
            Dados e armazenamento
          </h1>

          <p>
            Acompanhe seus estudos e tarefas,
            veja o que está salvo no planner
            e faça uma cópia dos seus dados
            quando quiser.
          </p>
        </div>

        <div
          className="data-hero-decoration"
          aria-hidden="true"
        >
          ✿
        </div>
      </section>


      <section className="data-section">
        <div className="data-analytics-header">
          <div className="data-section-heading">
            <div>
              <span>
                Resumo analítico
              </span>

              <h2>
                Seu ritmo no planner
              </h2>
            </div>
          </div>

          <div
            className="data-period-filter"
            aria-label="Período do resumo"
          >
            {PERIOD_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                className={
                  analyticsPeriod === option.value
                    ? 'data-period-button data-period-button-active'
                    : 'data-period-button'
                }
                aria-pressed={
                  analyticsPeriod === option.value
                }
                onClick={() => {
                  setAnalyticsPeriod(option.value)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {analyticsLoading && (
          <div
            className="data-panel"
            role="status"
          >
            <p>
              Calculando seu resumo...
            </p>
          </div>
        )}

        {!analyticsLoading
          && analyticsError && (
            <div
              className="data-panel data-error"
              role="alert"
            >
              <strong>
                Não foi possível carregar o resumo.
              </strong>

              <p>
                {analyticsError}
              </p>
            </div>
          )}

        {!analyticsLoading
          && !analyticsError
          && analytics && (
            <>
              <p className="data-analytics-range">
                {formatIsoDate(analytics.start_date)}
                {' — '}
                {formatIsoDate(analytics.end_date)}
              </p>

              <div className="data-grid">
                <article className="data-stat-card data-stat-mint">
                  <span>
                    Tempo estudado
                  </span>

                  <strong>
                    {formatMinutes(
                      analytics.studies.total_minutes,
                    )}
                  </strong>

                  <small>
                    Média de{' '}
                    {formatMinutes(
                      analytics
                        .studies
                        .daily_average_minutes,
                    )}{' '}
                    por dia
                  </small>
                </article>

                <article className="data-stat-card data-stat-blue">
                  <span>
                    Sessões de estudo
                  </span>

                  <strong>
                    {analytics.studies.sessions}
                  </strong>

                  <small>
                    sessões registradas
                  </small>
                </article>

                <article className="data-stat-card data-stat-yellow">
                  <span>
                    Tarefas concluídas
                  </span>

                  <strong>
                    {analytics.tasks.completed}
                  </strong>

                  <small>
                    concluídas no período
                  </small>
                </article>

                <article className="data-stat-card data-stat-pink">
                  <span>
                    Tarefas pendentes
                  </span>

                  <strong>
                    {analytics.tasks.pending}
                  </strong>

                  <small>
                    com prazo no período
                  </small>
                </article>

                <article className="data-stat-card data-stat-lilac">
                  <span>
                    Tarefas atrasadas
                  </span>

                  <strong>
                    {analytics.tasks.overdue}
                  </strong>

                  <small>
                    prazo já vencido
                  </small>
                </article>

                <article className="data-stat-card data-stat-paper">
                  <span>
                    Taxa de conclusão
                  </span>

                  <strong>
                    {analytics.tasks.completion_rate}%
                  </strong>

                  <small>
                    das tarefas com prazo no período
                  </small>
                </article>
              </div>
            </>
          )}
      </section>


      {!analyticsLoading
        && !analyticsError
        && analytics && (
          <section
            className="data-charts-grid"
            aria-label="Gráficos do período"
          >
            <article className="data-chart-card">
              <div className="data-chart-heading">
                <div>
                  <span>
                    Estudos
                  </span>

                  <h3>
                    Tempo estudado por dia
                  </h3>
                </div>

                <small>
                  Pico: {formatMinutes(maxStudyMinutes)}
                </small>
              </div>

              <div className="data-chart-scroll">
                <div className="data-chart-bars">
                  {analytics.timeline.map(day => (
                    <div
                      key={day.date}
                      className="data-chart-column"
                      role="img"
                      aria-label={
                        `${formatIsoDate(day.date)}: `
                        + `${formatMinutes(day.study_minutes)} estudados`
                      }
                      title={
                        `${formatIsoDate(day.date)} — `
                        + `${formatMinutes(day.study_minutes)}`
                      }
                    >
                      <div className="data-chart-track">
                        <div
                          className="data-chart-bar data-chart-bar-study"
                          style={{
                            height:
                              `${chartBarHeight(
                                day.study_minutes,
                                maxStudyMinutes,
                              )}%`,
                          }}
                        />
                      </div>

                      <span>
                        {formatChartLabel(
                          day.date,
                          analyticsPeriod,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="data-chart-note">
                Cada barra representa o tempo
                registrado em um dia.
              </p>
            </article>


            <article className="data-chart-card">
              <div className="data-chart-heading">
                <div>
                  <span>
                    Tarefas
                  </span>

                  <h3>
                    Conclusões por dia
                  </h3>
                </div>

                <small>
                  Pico: {maxCompletedTasks}
                </small>
              </div>

              <div className="data-chart-scroll">
                <div className="data-chart-bars">
                  {analytics.timeline.map(day => (
                    <div
                      key={day.date}
                      className="data-chart-column"
                      role="img"
                      aria-label={
                        `${formatIsoDate(day.date)}: `
                        + `${day.completed_tasks} `
                        + `${day.completed_tasks === 1
                          ? 'tarefa concluída'
                          : 'tarefas concluídas'}`
                      }
                      title={
                        `${formatIsoDate(day.date)} — `
                        + `${day.completed_tasks} concluídas`
                      }
                    >
                      <div className="data-chart-track">
                        <div
                          className="data-chart-bar data-chart-bar-tasks"
                          style={{
                            height:
                              `${chartBarHeight(
                                day.completed_tasks,
                                maxCompletedTasks,
                              )}%`,
                          }}
                        />
                      </div>

                      <span>
                        {formatChartLabel(
                          day.date,
                          analyticsPeriod,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="data-chart-note">
                Usa a data real de conclusão
                registrada em cada tarefa.
              </p>
            </article>
          </section>
        )}


      {!analyticsLoading
        && !analyticsError
        && analytics && (
          <section
            className="data-breakdown-grid"
            aria-label="Análise por matéria e projeto"
          >
            <article className="data-breakdown-card">
              <div className="data-breakdown-heading">
                <div>
                  <span>
                    Matérias
                  </span>

                  <h3>
                    Atividade por matéria
                  </h3>
                </div>

                <div className="data-breakdown-count">
                  {analytics.subjects.length}
                </div>
              </div>

              {analytics.subjects.length === 0 ? (
                <p className="data-breakdown-empty">
                  Ainda não há estudos ou tarefas
                  vinculados a matérias neste período.
                </p>
              ) : (
                <div className="data-breakdown-list">
                  {analytics.subjects.map(subject => (
                    <div
                      key={subject.id}
                      className="data-breakdown-item"
                    >
                      <span
                        className="data-breakdown-dot"
                        aria-hidden="true"
                        style={{
                          backgroundColor: safeColor(
                            subject.color,
                            '#deeee7',
                          ),
                        }}
                      />

                      <div className="data-breakdown-body">
                        <div className="data-breakdown-title-row">
                          <strong title={subject.name}>
                            {subject.name}
                          </strong>

                          <span className="data-breakdown-time">
                            {formatMinutes(
                              subject.study_minutes,
                            )}
                          </span>
                        </div>

                        <div className="data-breakdown-meta">
                          <span className="data-breakdown-pill">
                            {subject.study_sessions}{' '}
                            {subject.study_sessions === 1
                              ? 'sessão'
                              : 'sessões'}
                          </span>

                          <span className="data-breakdown-pill data-breakdown-pill-done">
                            {subject.completed_tasks}{' '}
                            concluídas
                          </span>

                          <span className="data-breakdown-pill data-breakdown-pill-pending">
                            {subject.pending_tasks}{' '}
                            pendentes
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>


            <article className="data-breakdown-card">
              <div className="data-breakdown-heading">
                <div>
                  <span>
                    Projetos
                  </span>

                  <h3>
                    Atividade por projeto
                  </h3>
                </div>

                <div className="data-breakdown-count">
                  {analytics.projects.length}
                </div>
              </div>

              {analytics.projects.length === 0 ? (
                <p className="data-breakdown-empty">
                  Ainda não há estudos ou tarefas
                  vinculados a projetos neste período.
                </p>
              ) : (
                <div className="data-breakdown-list">
                  {analytics.projects.map(project => (
                    <div
                      key={project.id}
                      className="data-breakdown-item"
                    >
                      <span
                        className="data-breakdown-dot"
                        aria-hidden="true"
                        style={{
                          backgroundColor: safeColor(
                            project.color,
                            '#dfeaf3',
                          ),
                        }}
                      />

                      <div className="data-breakdown-body">
                        <div className="data-breakdown-title-row">
                          <strong title={project.title}>
                            {project.title}
                          </strong>

                          <span className="data-breakdown-time">
                            {formatMinutes(
                              project.study_minutes,
                            )}
                          </span>
                        </div>

                        <div className="data-breakdown-meta">
                          {project.status && (
                            <span className="data-breakdown-pill">
                              {project.status}
                            </span>
                          )}

                          <span className="data-breakdown-pill">
                            {project.study_sessions}{' '}
                            {project.study_sessions === 1
                              ? 'sessão'
                              : 'sessões'}
                          </span>

                          <span className="data-breakdown-pill data-breakdown-pill-done">
                            {project.completed_tasks}{' '}
                            concluídas
                          </span>

                          <span className="data-breakdown-pill data-breakdown-pill-pending">
                            {project.pending_tasks}{' '}
                            pendentes
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        )}


      {isLoading && (
        <section className="data-panel">
          <p>
            Carregando informações de armazenamento...
          </p>
        </section>
      )}


      {loadError && (
        <section className="data-panel data-error">
          <strong>
            Não foi possível carregar o armazenamento.
          </strong>

          <p>
            {loadError}
          </p>
        </section>
      )}


      {!isLoading
        && storage && (
          <>
            <section className="data-section">
              <div className="data-section-heading">
                <div>
                  <span>
                    Visão geral
                  </span>

                  <h2>
                    Seu espaço
                  </h2>
                </div>

                <div className="data-storage-total">
                  <strong>
                    {storage.upload_megabytes} MB
                  </strong>

                  <small>
                    arquivos enviados
                  </small>
                </div>
              </div>

              <div className="data-grid">
                <article className="data-stat-card data-stat-pink">
                  <span>
                    Agendas
                  </span>

                  <strong>
                    {storage.agendas}
                  </strong>

                  <small>
                    até 6 ativas
                  </small>
                </article>

                <article className="data-stat-card data-stat-blue">
                  <span>
                    Páginas
                  </span>

                  <strong>
                    {storage.pages}
                  </strong>

                  <small>
                    conteúdo criado
                  </small>
                </article>

                <article className="data-stat-card data-stat-mint">
                  <span>
                    Biblioteca
                  </span>

                  <strong>
                    {storage.media_library_items}
                  </strong>

                  <small>
                    itens salvos
                  </small>
                </article>

                <article className="data-stat-card data-stat-lilac">
                  <span>
                    Mídias nas páginas
                  </span>

                  <strong>
                    {storage.page_media_items}
                  </strong>

                  <small>
                    fotos e stickers
                  </small>
                </article>

                <article className="data-stat-card data-stat-yellow">
                  <span>
                    Templates
                  </span>

                  <strong>
                    {storage.templates}
                  </strong>

                  <small>
                    modelos pessoais
                  </small>
                </article>

                <article className="data-stat-card data-stat-paper">
                  <span>
                    Arquivos
                  </span>

                  <strong>
                    {storage.upload_megabytes} MB
                  </strong>

                  <small>
                    {storage.upload_bytes.toLocaleString(
                      'pt-BR',
                    )}{' '}
                    bytes
                  </small>
                </article>
              </div>
            </section>


            <section className="data-section">
              <div className="data-backup-card">
                <div className="data-backup-icon">
                  ↓
                </div>

                <div className="data-backup-content">
                  <span className="data-backup-label">
                    Backup
                  </span>

                  <h2>
                    Exportar meus dados
                  </h2>

                  <p>
                    Baixe um arquivo JSON
                    com seus dados do planner,
                    incluindo agendas, páginas,
                    tarefas, eventos, estudos,
                    projetos, templates e configurações.
                  </p>

                  <div
                    role="status"
                    aria-live="polite"
                  >
                    {isExporting && (
                      <p>
                        Preparando seu backup...
                      </p>
                    )}

                    {!isExporting
                      && !exportError
                      && exportedAt && (
                        <p>
                          Backup gerado com sucesso.
                          Download iniciado.
                        </p>
                      )}

                    {exportedAt && (
                      <p>
                        Último backup gerado:{' '}
                        <time dateTime={exportedAt}>
                          {new Date(
                            exportedAt,
                          ).toLocaleString('pt-BR')}
                        </time>
                      </p>
                    )}
                  </div>

                  {exportError && (
                    <p role="alert">
                      {exportError}
                    </p>
                  )}

                  <div className="data-backup-note">
                    <strong>
                      Importante:
                    </strong>

                    <span>
                      imagens e outros arquivos enviados
                      não ficam incorporados dentro do JSON.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="data-export-button"
                  disabled={isExporting}
                  onClick={() => {
                    void handleExportData()
                  }}
                >
                  {isExporting
                    ? 'Preparando...'
                    : 'Baixar backup'}
                </button>
              </div>
            </section>
          </>
        )}
    </main>
  )
}


export default DataPage
