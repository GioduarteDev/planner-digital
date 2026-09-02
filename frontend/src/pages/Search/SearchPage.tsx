import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import {
  apiRequest,
} from '../../services/api'

import './SearchPage.css'


type SearchResult = {
  type:
    | 'agenda'
    | 'page'
    | 'task'
    | 'event'
    | 'study'

  id: number
  title: string
  subtitle: string
  agenda_id: number | null
  page_id: number | null
}


const TYPE_LABELS = {
  agenda: 'Agenda',
  page: 'Página',
  task: 'Tarefa',
  event: 'Evento',
  study: 'Estudo',
}


const TYPE_ICONS = {
  agenda: '📔',
  page: '📄',
  task: '✓',
  event: '📅',
  study: '📚',
}


function SearchPage() {
  const navigate =
    useNavigate()


  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams()


  const initialQuery =
    searchParams.get('q') ?? ''


  const [
    query,
    setQuery,
  ] =
    useState(
      initialQuery,
    )


  const [
    results,
    setResults,
  ] =
    useState<SearchResult[]>([])


  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false)


  const [
    error,
    setError,
  ] =
    useState('')


  useEffect(() => {
    const cleanQuery =
      query.trim()


    if (
      cleanQuery === ''
    ) {
      return
    }


    let cancelled =
      false


    const timeoutId =
      window.setTimeout(
        () => {
          async function search() {
            try {
              setIsLoading(
                true,
              )

              setError('')


              setSearchParams(
                {
                  q:
                    cleanQuery,
                },
                {
                  replace: true,
                },
              )


              const data =
                await apiRequest<
                  SearchResult[]
                >(
                  `/search?q=${encodeURIComponent(
                    cleanQuery,
                  )}`,
                )


              if (cancelled) {
                return
              }


              setResults(
                data,
              )
            } catch (error) {
              if (cancelled) {
                return
              }


              console.error(
                error,
              )


              if (
                error
                instanceof Error
              ) {
                setError(
                  error.message,
                )
              } else {
                setError(
                  'Não foi possível realizar a busca.',
                )
              }
            } finally {
              if (
                !cancelled
              ) {
                setIsLoading(
                  false,
                )
              }
            }
          }


          void search()
        },
        350,
      )


    return () => {
      cancelled =
        true


      window.clearTimeout(
        timeoutId,
      )
    }
  }, [
    query,
    setSearchParams,
  ])


  function handleQueryChange(
    value: string,
  ) {
    setQuery(
      value,
    )


    if (
      value.trim() === ''
    ) {
      setResults([])
      setError('')
      setIsLoading(false)


      setSearchParams(
        {},
        {
          replace: true,
        },
      )
    }
  }


  function openResult(
    result: SearchResult,
  ) {
    if (
      result.type === 'agenda'
      && result.agenda_id
    ) {
      navigate(
        `/agenda/${result.agenda_id}`,
      )

      return
    }


    if (
      (
        result.type === 'page'
        || result.type === 'task'
      )
      && result.agenda_id
      && result.page_id
    ) {
      navigate(
        `/agenda/${result.agenda_id}?page=${result.page_id}`,
      )

      return
    }


    if (
      result.type === 'event'
    ) {
      navigate(
        '/calendar',
      )

      return
    }


    if (
      result.type === 'study'
    ) {
      navigate(
        '/studies',
      )
    }
  }


  const groupedResults =
    results.reduce(
      (
        groups,
        result,
      ) => {
        const current =
          groups[
            result.type
          ] ?? []


        current.push(
          result,
        )


        groups[
          result.type
        ] =
          current


        return groups
      },
      {} as Record<
        SearchResult['type'],
        SearchResult[]
      >,
    )


  return (
    <main className="search-page">
      <header className="search-topbar">
        <button
          type="button"
          onClick={() =>
            navigate('/')
          }
        >
          ← Biblioteca
        </button>


        <h1>
          Buscar
        </h1>


        <div />
      </header>


      <section className="search-container">
        <div className="search-box">
          <span>
            🔎
          </span>


          <input
            type="search"
            autoFocus

            value={
              query
            }

            placeholder="Buscar no planner inteiro..."

            onChange={(
              event,
            ) =>
              handleQueryChange(
                event.target.value,
              )
            }
          />


          {query && (
            <button
              type="button"
              onClick={() =>
                handleQueryChange(
                  '',
                )
              }
            >
              ×
            </button>
          )}
        </div>


        {query.trim() === '' && (
          <div className="search-empty">
            <span>
              🔎
            </span>

            <h2>
              Busque qualquer coisa
            </h2>

            <p>
              Agendas, páginas,
              tarefas, eventos
              e estudos.
            </p>
          </div>
        )}


        {isLoading && (
          <p className="search-status">
            Buscando...
          </p>
        )}


        {error && (
          <p className="search-error">
            {error}
          </p>
        )}


        {!isLoading
          && !error
          && query.trim()
            !== ''
          && results.length
            === 0 && (
          <div className="search-empty">
            <span>
              🫥
            </span>

            <h2>
              Nada encontrado
            </h2>

            <p>
              Tente outra palavra.
            </p>
          </div>
        )}


        {!isLoading
          && results.length
            > 0 && (
          <div className="search-results">
            <div className="search-result-summary">
              <strong>
                {
                  results.length
                }
              </strong>

              {' '}

              {results.length
                === 1
                ? 'resultado'
                : 'resultados'}

              {' para '}

              <strong>
                “{query.trim()}”
              </strong>
            </div>


            {(
              [
                'agenda',
                'page',
                'task',
                'event',
                'study',
              ] as SearchResult[
                'type'
              ][]
            ).map(
              (
                type,
              ) => {
                const items =
                  groupedResults[
                    type
                  ]


                if (
                  !items
                  || items.length
                    === 0
                ) {
                  return null
                }


                return (
                  <section
                    key={
                      type
                    }
                    className="search-group"
                  >
                    <h2>
                      {
                        TYPE_ICONS[
                          type
                        ]
                      }

                      {' '}

                      {
                        TYPE_LABELS[
                          type
                        ]
                      }

                      <span>
                        {
                          items.length
                        }
                      </span>
                    </h2>


                    <div className="search-group-items">
                      {items.map(
                        (
                          result,
                        ) => (
                          <button
                            key={
                              `${result.type}-${result.id}`
                            }

                            type="button"

                            className="search-result-card"

                            onClick={() =>
                              openResult(
                                result,
                              )
                            }
                          >
                            <span className="search-result-icon">
                              {
                                TYPE_ICONS[
                                  result.type
                                ]
                              }
                            </span>


                            <div className="search-result-content">
                              <strong>
                                {
                                  result.title
                                }
                              </strong>

                              <span>
                                {
                                  result.subtitle
                                }
                              </span>
                            </div>


                            <span className="search-result-arrow">
                              →
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  </section>
                )
              },
            )}
          </div>
        )}
      </section>
    </main>
  )
}


export default SearchPage