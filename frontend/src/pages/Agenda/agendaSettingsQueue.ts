// Share one write queue per agenda, including both editors in spread mode.
const queues = new Map<number, Promise<unknown>>()

export function enqueueAgendaSettingsWrite<T>(agendaId: number, write: () => Promise<T>): Promise<T> {
  const next = (queues.get(agendaId) ?? Promise.resolve()).catch(() => undefined).then(write)
  queues.set(agendaId, next)
  const cleanup = () => { if (queues.get(agendaId) === next) queues.delete(agendaId) }
  void next.then(cleanup, cleanup)
  return next
}
