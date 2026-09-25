import type { CanvasElementFromApi, PlannerTask } from './editorModel'

type Props = { element: CanvasElementFromApi; tasks: PlannerTask[]; onDataChange: (data: Record<string, unknown>) => void; onToggleTask: (id: number, done: boolean) => void }
const field = (data: Record<string, unknown>, key: string) => typeof data[key] === 'string' ? data[key] as string : ''

export function KoreanStudyPlanner({ element, onDataChange }: Props) {
  const data = element.data
  const update = (key: string, value: string) => onDataChange({ ...data, [key]: value })
  const input = (key: string, label: string, placeholder = '—') => <label className="study-widget-field">{label}<input
    defaultValue={field(data, key)} placeholder={placeholder} aria-label={label} disabled={element.locked}
    onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
    onBlur={event => update(key, event.target.value)} /></label>
  return <section className="study-widget" aria-label="Study Planner">
    <header><span>01 / STUDY NOTES</span><h2>Study Planner</h2><span className="study-widget-flower">✳</span></header>
    <div className="study-widget-top">{input('goal', 'Goal', 'O que quero alcançar?')}{input('dx', 'D-X', 'D-30')}{input('totalTime', 'Total Time', '0h 00m')}</div>
    <div className="study-widget-rule"><strong>To study</strong><span>✦ cada passo conta</span></div>
    <div className="study-widget-tasks">{[0, 1, 2, 3].map(index => <label key={index}><i>{String(index + 1).padStart(2, '0')}</i><input
      aria-label={`Tarefa de estudo ${index + 1}`} placeholder="Uma pequena meta..." defaultValue={field(data, `task${index}`)}
      disabled={element.locked} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
      onBlur={event => update(`task${index}`, event.target.value)} /><span className="study-widget-code">◌</span></label>)}</div>
    <div className="study-widget-colors"><span>Code / colors</span><b>● focus</b><b>● review</b><b>● done</b></div>
    <div className="study-widget-rhythm">{input('wake', 'Wake-up', '07:00')}{input('bed', 'Bed time', '22:30')}{input('mood', 'Mood', 'Como me sinto?')}</div>
    <div className="study-widget-rule"><strong>Time blocking</strong><span>o meu ritmo</span></div>
    <div className="study-widget-timeline">{['Morning', 'Afternoon', 'Evening'].map((part, index) => <label key={part}>{part}<input
      aria-label={`Planejamento ${part}`} defaultValue={field(data, `time${index}`)} disabled={element.locked}
      onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
      onBlur={event => update(`time${index}`, event.target.value)} /></label>)}</div>
    <label className="study-widget-notes">Notes<textarea aria-label="Notas de estudo" defaultValue={field(data, 'notes')}
      disabled={element.locked} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
      onBlur={event => update('notes', event.target.value)} /></label>
  </section>
}

export function TaskReceipt({ element, tasks, onDataChange, onToggleTask }: Props) {
  const selected = Array.isArray(element.data.taskIds) ? element.data.taskIds.filter((id): id is number => typeof id === 'number') : []
  const shown = tasks.filter(task => selected.includes(task.id))
  const completed = shown.filter(task => task.done).length
  const remaining = shown.length - completed
  const today = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())
  return <section className="task-receipt" aria-label="Recibo de tarefas">
    <div className="task-receipt-head"><span>MATCHA PLANNER</span><strong>Tarefas do dia</strong><small>{today}</small></div>
    <div className="task-receipt-divider" />
    {shown.length ? shown.map((task, index) => <label className="task-receipt-item" key={task.id}>
      <span>{String(index + 1).padStart(2, '0')}</span><input type="checkbox" checked={task.done} disabled={element.locked}
        onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
        onChange={event => onToggleTask(task.id, event.target.checked)} />
      <span className={task.done ? 'is-done' : ''}>{task.text}</span>
    </label>) : <p className="task-receipt-empty">Escolha tarefas reais para este recibo.</p>}
    <div className="task-receipt-divider" />
    <details onPointerDown={event => event.stopPropagation()}><summary>Escolher tarefas</summary><div className="task-receipt-picker">
      {tasks.map(task => <label key={task.id}><input type="checkbox" checked={selected.includes(task.id)} disabled={element.locked}
        onChange={() => onDataChange({ ...element.data, taskIds: selected.includes(task.id) ? selected.filter(id => id !== task.id) : [...selected, task.id] })} />{task.text}</label>)}
      {!tasks.length && <span>Crie uma tarefa em Tarefas para adicioná-la.</span>}
    </div></details>
    <footer><span>{completed} concluída{completed === 1 ? '' : 's'}</span><b>{remaining} restante{remaining === 1 ? '' : 's'}</b></footer>
  </section>
}

export function DailyPlanner({ element, onDataChange }: Props) {
  const data = element.data
  const entries = [
    ['focus', 'Today’s focus', 'O que mais importa hoje?'],
    ['priorities', 'Little priorities', '1.\n2.\n3.'],
    ['schedule', 'My day', 'Manhã\nTarde\nNoite'],
    ['gratitude', 'A good thing', 'Algo pequeno para guardar...'],
  ]
  return <section className="daily-planner-widget" aria-label="Daily Planner"><header><span>DAILY / MATCHA PLANNER</span><h2>Today, gently.</h2><p>Planos para um dia de cada vez ✳</p></header>
    {entries.map(([key, label, placeholder]) => <label key={key}><strong>{label}</strong><textarea aria-label={label} defaultValue={field(data, key)} placeholder={placeholder}
      disabled={element.locked} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
      onBlur={event => onDataChange({ ...data, [key]: event.target.value })} /></label>)}
    <footer>small steps are still steps ♡</footer>
  </section>
}
