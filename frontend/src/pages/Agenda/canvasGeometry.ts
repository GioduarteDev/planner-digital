/** Coordinates are persisted in unscaled paper pixels, never viewport pixels. */
export function clampPosition(x: number, y: number, width: number, height: number, pageWidth: number, pageHeight: number) {
  return {
    x: Math.max(0, Math.min(x, Math.max(0, pageWidth - width))),
    y: Math.max(0, Math.min(y, Math.max(0, pageHeight - height))),
  }
}

export type LayerAction = 'front' | 'back' | 'up' | 'down'

export function reorderLayers<T extends { id: number; zIndex: number }>(
  items: T[],
  itemId: number,
  action: LayerAction,
) {
  const ordered = [...items].sort((a, b) => a.zIndex - b.zIndex || a.id - b.id)
  const index = ordered.findIndex(item => item.id === itemId)
  if (index < 0) return []
  const target = action === 'front'
    ? ordered.length - 1
    : action === 'back'
      ? 0
      : action === 'up'
        ? Math.min(ordered.length - 1, index + 1)
        : Math.max(0, index - 1)
  if (target === index) return []
  const [item] = ordered.splice(index, 1)
  ordered.splice(target, 0, item)
  return ordered.flatMap((layer, zIndex) =>
    layer.zIndex === zIndex ? [] : [{ id: layer.id, zIndex }],
  )
}
