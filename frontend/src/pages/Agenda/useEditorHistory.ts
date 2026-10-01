import { useCallback, useRef, useState } from 'react'

export type HistoryEntityType = 'canvas' | 'media'

export type EditorHistoryEntry = {
  undo: () => Promise<void>
  redo: () => Promise<void>
  remapEntityId?: (entityType: HistoryEntityType, previousId: number, nextId: number) => void
}

const HISTORY_LIMIT = 50

export function useEditorHistory(onError: (error: unknown) => void) {
  const undoStack = useRef<EditorHistoryEntry[]>([])
  const redoStack = useRef<EditorHistoryEntry[]>([])
  const busy = useRef(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const refresh = useCallback(() => {
    setCanUndo(undoStack.current.length > 0 && !busy.current)
    setCanRedo(redoStack.current.length > 0 && !busy.current)
  }, [])

  const push = useCallback((entry: EditorHistoryEntry) => {
    undoStack.current.push(entry)
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
    redoStack.current = []
    refresh()
  }, [refresh])

  const remapEntityId = useCallback((entityType: HistoryEntityType, previousId: number, nextId: number) => {
    for (const entry of [...undoStack.current, ...redoStack.current]) {
      entry.remapEntityId?.(entityType, previousId, nextId)
    }
  }, [])

  const undo = useCallback(async () => {
    if (busy.current) return
    const entry = undoStack.current.at(-1)
    if (!entry) return
    busy.current = true
    try {
      await entry.undo()
      undoStack.current.pop()
      redoStack.current.push(entry)
      refresh()
    } catch (error) {
      onError(error)
    } finally {
      busy.current = false
      refresh()
    }
  }, [onError, refresh])

  const redo = useCallback(async () => {
    if (busy.current) return
    const entry = redoStack.current.at(-1)
    if (!entry) return
    busy.current = true
    try {
      await entry.redo()
      redoStack.current.pop()
      undoStack.current.push(entry)
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
      refresh()
    } catch (error) {
      onError(error)
    } finally {
      busy.current = false
      refresh()
    }
  }, [onError, refresh])

  const clear = useCallback(() => {
    undoStack.current = []
    redoStack.current = []
    refresh()
  }, [refresh])

  return {
    push,
    undo,
    redo,
    clear,
    remapEntityId,
    canUndo,
    canRedo,
  }
}
