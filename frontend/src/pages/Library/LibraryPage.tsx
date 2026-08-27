import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import './LibraryPage.css'

import AgendaCard from '../../components/AgendaCard/AgendaCard'

const MAX_AGENDAS = 6
const STORAGE_KEY = 'planner-agendas'

const initialAgendas = [
  {
    id: 1,
    title: 'Planner 2026',
    coverColor: '#f3e8ee',
  },
  {
    id: 2,
    title: 'Diário',
    coverColor: '#e8e5f3',
  },
  {
    id: 3,
    title: 'Faculdade',
    coverColor: '#e5edf3',
  },
  {
    id: 4,
    title: 'Projetos',
    coverColor: '#eee7dc',
  },
]

function LibraryPage() {
  const navigate = useNavigate()

  const [agendas, setAgendas] = useState(() => {
    const savedAgendas = localStorage.getItem(STORAGE_KEY)

    if (savedAgendas) {
      return JSON.parse(savedAgendas)
    }

    return initialAgendas
  })

  const [isCreatingAgenda, setIsCreatingAgenda] = useState(false)
  const [newAgendaTitle, setNewAgendaTitle] = useState('')
  const [newAgendaColor, setNewAgendaColor] = useState('#f0ece8')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(agendas),
    )
  }, [agendas])

  const filteredAgendas = agendas.filter((agenda: {
    id: number
    title: string
    coverColor: string
  }) =>
    agenda.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  )

  function handleCreateAgenda() {
    if (agendas.length >= MAX_AGENDAS) {
      alert(
        `Você pode ter no máximo ${MAX_AGENDAS} agendas ativas.`,
      )

      return
    }

    if (newAgendaTitle.trim() === '') {
      alert('Digite um nome para a agenda.')
      return
    }

    const newAgenda = {
      id: Date.now(),
      title: newAgendaTitle,
      coverColor: newAgendaColor,
    }

    setAgendas([...agendas, newAgenda])

    setNewAgendaTitle('')
    setNewAgendaColor('#f0ece8')
    setIsCreatingAgenda(false)
  }

  function handleDeleteAgenda(id: number) {
    const updatedAgendas = agendas.filter(
      (agenda: { id: number }) => agenda.id !== id,
    )

    setAgendas(updatedAgendas)
  }

  function handleOpenAgenda(id: number) {
    navigate(`/agenda/${id}`)
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

        <input
          className="library-search"
          type="search"
          placeholder="Pesquisar..."
          aria-label="Pesquisar na biblioteca"
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(event.target.value)
          }
        />
      </header>

      <section className="library-content">
        <div className="library-content-header">
          <h2>Minhas agendas</h2>

          <div className="library-content-actions">
            <span className="agenda-count">
              {agendas.length}/{MAX_AGENDAS} agendas
            </span>

            <button
              className="new-agenda-button"
              type="button"
              onClick={() =>
                setIsCreatingAgenda(true)
              }
              disabled={agendas.length >= MAX_AGENDAS}
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
                setNewAgendaTitle(event.target.value)
              }
            />

            <input
              type="color"
              value={newAgendaColor}
              onChange={(event) =>
                setNewAgendaColor(event.target.value)
              }
            />

            <button
              type="button"
              onClick={handleCreateAgenda}
            >
              Criar agenda
            </button>

            <button
              type="button"
              onClick={() =>
                setIsCreatingAgenda(false)
              }
            >
              Cancelar
            </button>
          </div>
        )}

        <div className="agenda-grid">
          {filteredAgendas.map(
            (agenda: {
              id: number
              title: string
              coverColor: string
            }) => (
              <AgendaCard
                key={agenda.id}
                title={agenda.title}
                coverColor={agenda.coverColor}
                onOpen={() =>
                  handleOpenAgenda(agenda.id)
                }
                onDelete={() =>
                  handleDeleteAgenda(agenda.id)
                }
              />
            ),
          )}
        </div>
      </section>
    </main>
  )
}

export default LibraryPage