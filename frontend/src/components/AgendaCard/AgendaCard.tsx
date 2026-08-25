import './AgendaCard.css'

type AgendaCardProps = {
  title: string
  coverColor: string
  onDelete: () => void
}

function AgendaCard({
  title,
  coverColor,
  onDelete,
}: AgendaCardProps) {
  return (
    <article className="agenda-card">
      <div
        className="agenda-cover"
        style={{ backgroundColor: coverColor }}
      ></div>

      <h3>{title}</h3>

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