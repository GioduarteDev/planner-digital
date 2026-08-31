import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import AgendaCard from '../../components/AgendaCard/AgendaCard'
import {
  apiRequest,
  clearAuth,
} from '../../services/api'

import './LibraryPage.css'


const MAX_AGENDAS = 6


type Agenda = {
  id: number
  title: string
  coverColor: string
}


type AgendaFromApi = {
  id: number
  title: string
  cover_color: string
  created_at: string
}


function convertAgendaFromApi(
  agenda: AgendaFromApi,
): Agenda {
  return {
    id: agenda.id,
    title: agenda.title,
    coverColor: agenda.cover_color,
  }
}


function LibraryPage() {
  const navigate = useNavigate()

  const [agendas, setAgendas] = useState<Agenda[]>([])

  const [
    isCreatingAgenda,
    setIsCreatingAgenda,
  ] = useState(false)

  const [
    newAgendaTitle,
    setNewAgendaTitle,
  ] = useState('')

  const [
    newAgendaColor,
    setNewAgendaColor,
  ] = useState('#f0ece8')

  const [
    searchTerm,
    setSearchTerm,
  ] = useState('')

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)
  function handleLogout() {
  const confirmed =
    window.confirm(
      'Deseja sair da sua conta?',
    )


  if (!confirmed) {
    return
  }


  clearAuth()


  navigate(
    '/login',
    {
      replace: true,
    },
  )
}


  useEffect(() => {
  let cancelled = false

  async function loadAgendasFromApi() {
    try {
      const data =
        await apiRequest<AgendaFromApi[]>(
          '/agendas',
        )

      if (cancelled) {
        return
      }

      const convertedAgendas =
        data.map(convertAgendaFromApi)

      setAgendas(convertedAgendas)
    } catch (error) {
      if (cancelled) {
        return
      }

      console.error(error)

      alert(
        'Não foi possível carregar as agendas.',
      )
    } finally {
      if (!cancelled) {
        setIsLoading(false)
      }
    }
  }

  void loadAgendasFromApi()

  return () => {
    cancelled = true
  }
}, [])


  const filteredAgendas = agendas.filter(
    (agenda) =>
      agenda.title
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase(),
        ),
  )


  async function handleCreateAgenda() {
    if (agendas.length >= MAX_AGENDAS) {
      alert(
        `Você pode ter no máximo ${MAX_AGENDAS} agendas ativas.`,
      )

      return
    }

    if (newAgendaTitle.trim() === '') {
      alert(
        'Digite um nome para a agenda.',
      )

      return
    }

    try {
      const createdAgenda =
        await apiRequest<AgendaFromApi>(
          '/agendas',
          {
            method: 'POST',

            body: JSON.stringify({
              title: newAgendaTitle,
              cover_color:
                newAgendaColor,
            }),
          },
        )

      const convertedAgenda =
        convertAgendaFromApi(
          createdAgenda,
        )

      setAgendas((currentAgendas) => [
        ...currentAgendas,
        convertedAgenda,
      ])

      setNewAgendaTitle('')
      setNewAgendaColor('#f0ece8')
      setIsCreatingAgenda(false)
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        alert(error.message)
      }
    }
  }


  async function handleDeleteAgenda(
    id: number,
  ) {
    const confirmed = window.confirm(
      'Deseja realmente excluir esta agenda?',
    )

    if (!confirmed) {
      return
    }

    try {
      await apiRequest<void>(
        `/agendas/${id}`,
        {
          method: 'DELETE',
        },
      )

      setAgendas(
        (currentAgendas) =>
          currentAgendas.filter(
            (agenda) =>
              agenda.id !== id,
          ),
      )
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        alert(error.message)
      }
    }
  }


  function handleOpenAgenda(
    id: number,
  ) {
    navigate(
      `/agenda/${id}`,
    )
  }


  return (
    <main className="library-page">
      <header className="library-header">
        <div className="library-header-left">
          <button
            className="menu-button"
            type="button"
            aria-label="Abrir menu"
          >
            ☰
          </button>

          <h1>Biblioteca</h1>

          <button
            className="today-button"
            type="button"
            onClick={() =>
              navigate('/today')
            }
          >
            Hoje
          </button>
        </div>         

        <button
  type="button"
  onClick={() =>
    navigate('/studies')
  }
>
  Estudos
</button>

        <button
  type="button"
  onClick={handleLogout}
>
  Sair
</button>
<button
  type="button"
  onClick={() =>
    navigate('/calendar')
  }
>
  Calendário
</button>


        <input
          className="library-search"
          type="search"
          placeholder="Pesquisar..."
          aria-label="Pesquisar na biblioteca"
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(
              event.target.value,
            )
          }
        />
      </header>

      <section className="library-content">
        <div className="library-content-header">
          <h2>Minhas agendas</h2>

          <div className="library-content-actions">
            <span className="agenda-count">
              {agendas.length}/
              {MAX_AGENDAS} agendas
            </span>

            <button
              className="new-agenda-button"
              type="button"
              onClick={() =>
                setIsCreatingAgenda(true)
              }
              disabled={
                agendas.length >=
                MAX_AGENDAS
              }
            >
              + Nova agenda
            </button>
          </div>
        </div>

        {isCreatingAgenda && (
          <div className="agenda-form">
            <input
              type="text"
              placeholder="Nome da agenda"
              value={newAgendaTitle}
              onChange={(event) =>
                setNewAgendaTitle(
                  event.target.value,
                )
              }
            />

            <input
              type="color"
              value={newAgendaColor}
              onChange={(event) =>
                setNewAgendaColor(
                  event.target.value,
                )
              }
            />

            <button
              type="button"
              onClick={
                handleCreateAgenda
              }
            >
              Criar agenda
            </button>

            <button
              type="button"
              onClick={() =>
                setIsCreatingAgenda(
                  false,
                )
              }
            >
              Cancelar
            </button>
          </div>
        )}

        {isLoading ? (
          <p>Carregando agendas...</p>
        ) : (
          <div className="agenda-grid">
            {filteredAgendas.map(
              (agenda) => (
                <AgendaCard
                  key={agenda.id}
                  title={agenda.title}
                  coverColor={
                    agenda.coverColor
                  }
                  onOpen={() =>
                    handleOpenAgenda(
                      agenda.id,
                    )
                  }
                  onDelete={() =>
                    handleDeleteAgenda(
                      agenda.id,
                    )
                  }
                />
              ),
            )}
          </div>
        )}
      </section>
    </main>
  )
}


export default LibraryPage