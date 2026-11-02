export const SYMBOL_FAVORITES_KEY = 'symbol_favorites_v1'

export function readSymbolFavorites(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    : []
}

// Keep unknown IDs on disk so catalog changes do not erase saved preferences.
export function createSymbolFavorites(save: (ids: string[]) => Promise<unknown>, validIds: ReadonlySet<string>) {
  let state = { ids: [] as readonly string[], ready: false, saving: false, error: '' }
  let confirmed: readonly string[] = []
  let revision = 0
  const listeners = new Set<() => void>()
  function update(patch: Partial<typeof state>) {
    state = { ...state, ...patch }
    listeners.forEach(listener => listener())
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    load(value: unknown) {
      if (state.ready) return
      confirmed = readSymbolFavorites(value)
      update({ ids: confirmed, ready: true })
    },
    toggle(id: string) {
      if (!state.ready || !validIds.has(id)) return
      const ids = state.ids.includes(id) ? state.ids.filter(item => item !== id) : [...state.ids, id]
      const currentRevision = ++revision
      update({ ids, saving: true, error: '' })
      // save must enqueue synchronously; every snapshot is written in click order.
      void save(ids).then(() => {
        confirmed = ids
        if (revision === currentRevision) update({ saving: false })
      }).catch(() => {
        if (revision === currentRevision) update({
          ids: confirmed, saving: false,
          error: 'Não foi possível salvar os favoritos. A última seleção salva foi restaurada. Tente novamente.',
        })
      })
    },
  }
}
