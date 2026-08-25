import { useState } from 'react'

import './LibraryPage.css'

import AgendaCard from '../../components/AgendaCard/AgendaCard'

const MAX_AGENDAS = 6

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
  const [agendas, setAgendas] = useState(initialAgendas)
  const [isCreatingAgenda, setIsCreatingAgenda] = useState(false)
  const [newAgendaTitle, setNewAgendaTitle] = useState('')
  const [newAgendaColor, setNewAgendaColor] = useState('#f0ece8')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredAgendas = agendas.filter((agenda) =>
    agenda.title.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  function handleCreateAgenda() {
    if (agendas.length >= MAX_AGENDAS) {
      alert(`Você pode ter no máximo ${MAX_AGENDAS} agendas ativas.`)
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
      (agenda) => agenda.id !== id,
    )

    setAgendas(updatedAgendas)
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
        </div>

        <input
          className="library-search"
          type="search"
          placeholder="Pesquisar..."
          aria-label="Pesquisar na biblioteca"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
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
              onClick={() => setIsCreatingAgenda(true)}
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
              onClick={() => setIsCreatingAgenda(false)}
            >
              Cancelar
            </button>
          </div>
        )}

        <div className="agenda-grid">
          {filteredAgendas.map((agenda) => (
            <AgendaCard
              key={agenda.id}
              title={agenda.title}
              coverColor={agenda.coverColor}
              onDelete={() => handleDeleteAgenda(agenda.id)}
            />
          ))}
        </div>
      </section>
    </main>
  )
}

export default LibraryPage