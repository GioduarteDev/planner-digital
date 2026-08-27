import './AgendaCard.css'

type AgendaCardProps = {
  title: string
  coverColor: string
  onOpen: () => void
  onDelete: () => void
}

function AgendaCard({
  title,
  coverColor,
  onOpen,
  onDelete,
}: AgendaCardProps) {
  return (
    <article className="agenda-card">
      <button
        className="agenda-open-button"
        type="button"
        onClick={onOpen}
      >
        <div
          className="agenda-cover"
          style={{ backgroundColor: coverColor }}
        ></div>

        <h3>{title}</h3>
      </button>

      <button
        type="button"
        onClick={onDelete}
      >
        Excluir
      </button>
    </article>
  )
}

export default AgendaCard