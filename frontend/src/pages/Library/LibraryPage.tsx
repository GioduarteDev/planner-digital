import './LibraryPage.css'
import AgendaCard from '../../components/AgendaCard/AgendaCard'

function LibraryPage() {
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
        />
      </header>
      <section className="library-content">
  <div className="library-content-header">
    <h2>Minhas agendas</h2>
    <div className="agenda-grid">
  <AgendaCard title="Planner 2026" />
<AgendaCard title="Diário" />
<AgendaCard title="Faculdade" />
</div>

    <button className="new-agenda-button" type="button">
      + Nova agenda
    </button>
  </div>
</section>
    </main>
  )
}

export default LibraryPage