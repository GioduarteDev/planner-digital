import './AgendaCard.css'

type AgendaCardProps = {
  title: string
}

function AgendaCard({ title }: AgendaCardProps) {
  return (
    <article className="agenda-card">
      <div className="agenda-cover"></div>

      <h3>{title}</h3>
    </article>
  )
}

export default AgendaCard