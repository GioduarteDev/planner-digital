export type PlanningTask = {
  id: number; text: string; done: boolean; due_date: string | null; due_at: string | null
  completed_at: string | null; subject_id: number | null; project_id: number | null
  priority: string; created_at: string; updated_at: string | null
}
export type PlanningEvent = {
  id: number; title: string; starts_at: string; ends_at: string | null; all_day: boolean
  subject_id: number | null; project_id: number | null
}
export type PlanningProject = {
  id: number; title: string; status: string; due_date: string | null; subject_id: number | null
  created_at: string; updated_at: string | null
}
export type PlanningSubject = { id: number; name: string; color: string }
export type PlanningStudy = { id: number; subject_id: number | null; project_id: number | null; subject: string; topic: string; study_date: string; duration_minutes: number }
export type PlanningData = { tasks: PlanningTask[]; events: PlanningEvent[]; projects: PlanningProject[]; subjects: PlanningSubject[]; studies: PlanningStudy[] }
export type Deadline = {
  key: string; id: number; kind: 'task' | 'event' | 'project'; title: string; type: string
  day: string; at: string | null; status: string; subjectId: number | null; projectId: number | null; href: string
}
export const GROUPS = ['Atrasados', 'Hoje', 'Amanhã', 'Próximos 7 dias', 'Depois'] as const
export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function dateLabel(day: string): string { return new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR') }
export function dayDistance(day: string, from: string): number {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)
}
export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00`)
  date.setDate(date.getDate() + amount)
  return localDate(date)
}
export function mondayOf(day: string): string {
  const date = new Date(`${day}T12:00:00`)
  return addDays(day, -((date.getDay() + 6) % 7))
}
export function isoWeek(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const year = date.getUTCFullYear()
  const start = new Date(Date.UTC(year, 0, 1))
  return `${year}-W${String(Math.ceil(((date.getTime() - start.getTime()) / 86400000 + 1) / 7)).padStart(2, '0')}`
}
export function deadlineGroup(day: string, today: string): typeof GROUPS[number] {
  const distance = dayDistance(day, today)
  return distance < 0 ? 'Atrasados' : distance === 0 ? 'Hoje' : distance === 1 ? 'Amanhã' : distance <= 7 ? 'Próximos 7 dias' : 'Depois'
}
export function remainingLabel(day: string, today: string): string {
  const days = dayDistance(day, today)
  return days < 0 ? `${-days} dia${days === -1 ? '' : 's'} de atraso` : days === 0 ? 'Vence hoje' : `Falta${days === 1 ? '' : 'm'} ${days} dia${days === 1 ? '' : 's'}`
}
export function taskDay(task: PlanningTask): string | null {
  return task.due_date || (task.due_at ? localDate(new Date(task.due_at)) : null)
}
export function deadlines(data: PlanningData, now: Date, includePastEvents = false): Deadline[] {
  const today = localDate(now)
  const tasks: Deadline[] = data.tasks.filter(t => !t.done && taskDay(t)).map(t => ({
    key: `task-${t.id}`, id: t.id, kind: 'task', title: t.text,
    type: t.subject_id ? 'Entrega acadêmica' : 'Tarefa', day: taskDay(t)!, at: t.due_at,
    status: 'Pendente', subjectId: t.subject_id, projectId: t.project_id, href: `/tasks#task-${t.id}`,
  }))
  const events: Deadline[] = data.events.filter(e => includePastEvents || localDate(new Date(e.starts_at)) >= today).map(e => ({
    key: `event-${e.id}`, id: e.id, kind: 'event', title: e.title,
    type: e.subject_id ? 'Evento acadêmico / prova' : 'Evento', day: localDate(new Date(e.starts_at)), at: e.all_day ? null : e.starts_at,
    status: new Date(e.ends_at || e.starts_at).getTime() < now.getTime() ? 'Passado' : new Date(e.starts_at).getTime() <= now.getTime() ? 'Em andamento' : 'Agendado',
    subjectId: e.subject_id, projectId: e.project_id, href: `/calendar?date=${localDate(new Date(e.starts_at))}&event=${e.id}`,
  }))
  const projects: Deadline[] = data.projects.filter(p => p.status === 'active' && p.due_date).map(p => ({
    key: `project-${p.id}`, id: p.id, kind: 'project', title: p.title, type: 'Projeto', day: p.due_date!, at: null,
    status: 'Em andamento', subjectId: p.subject_id, projectId: null, href: `/organization?section=projects#project-${p.id}`,
  }))
  return [...tasks, ...events, ...projects].sort((a, b) => a.day.localeCompare(b.day) || (a.at ? new Date(a.at).getTime() : 0) - (b.at ? new Date(b.at).getTime() : 0) || a.key.localeCompare(b.key))
}
export function weeklySummary(data: PlanningData, start: string, now: Date) {
  const end = addDays(start, 6)
  const inWeek = (day: string | null) => !!day && day >= start && day <= end
  const timestampDay = (value: string | null) => value ? localDate(new Date(value)) : null
  const completed = data.tasks.filter(t => t.done && inWeek(timestampDay(t.completed_at)))
  const pending = data.tasks.filter(t => !t.done && inWeek(taskDay(t)))
  const deferred = pending.filter(t => taskDay(t)! < localDate(now))
  const events = data.events.filter(e => inWeek(localDate(new Date(e.starts_at))))
  const studies = data.studies.filter(s => inWeek(s.study_date))
  const subjectMinutes = new Map<string, { id: number | null; name: string; minutes: number }>()
  for (const study of studies) {
    const key = study.subject_id === null ? `name:${study.subject}` : `id:${study.subject_id}`
    const entry = subjectMinutes.get(key) || { id: study.subject_id, name: data.subjects.find(s => s.id === study.subject_id)?.name || study.subject, minutes: 0 }
    entry.minutes += study.duration_minutes
    subjectMinutes.set(key, entry)
  }
  const projectIds = new Set<number>()
  for (const record of [...completed, ...events, ...studies, ...data.tasks.filter(t => inWeek(timestampDay(t.updated_at || t.created_at)))]) {
    if (record.project_id !== null) projectIds.add(record.project_id)
  }
  for (const project of data.projects) if (inWeek(timestampDay(project.updated_at || project.created_at))) projectIds.add(project.id)
  return { completed, pending, deferred, events, studies, minutes: studies.reduce((sum, s) => sum + s.duration_minutes, 0), subjects: [...subjectMinutes.values()].sort((a, b) => b.minutes - a.minutes), projects: data.projects.filter(p => projectIds.has(p.id)), legacyCompleted: data.tasks.filter(t => t.done && !t.completed_at && inWeek(taskDay(t))) }
}
