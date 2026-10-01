import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { apiRequest } from '../../services/api'
import type { CanvasElementFromApi, CanvasElementPatch, CanvasElementDragState, CanvasElementResizeState, SaveStatus } from './editorModel'
import { POSTIT_OPTIONS, WASHI_OPTIONS, STAMP_OPTIONS } from './editorCatalog'
import type { EditorHistoryEntry } from './useEditorHistory'
import { reorderLayers, type LayerAction } from './canvasGeometry'

/** Shared DOM canvas controller. CanvasElement remains the sole persistence contract. */
export function useCanvasElements({ activePageId, scale, stampColor, onInsert, onCreated, onError: setDrawingError, history }: {
  activePageId: number | null
  scale: number
  stampColor: string
  onInsert: () => void
  onCreated: () => void
  onError: (message: string) => void
  history: {
    push: (entry: EditorHistoryEntry) => void
    remapEntityId: (entityType: 'canvas' | 'media', previousId: number, nextId: number) => void
  }
}) {
  const [
    pageCanvasElements,
    setPageCanvasElements,
  ] = useState<CanvasElementFromApi[]>([])
  const [
    selectedCanvasElementId,
    setSelectedCanvasElementId,
  ] = useState<number | null>(null)
  const [editingTextElementId, setEditingTextElementId] = useState<number | null>(null)
  const draftSequence = useRef(-1)
  const createdIds = useRef<Record<number, Promise<number>>>({})
  const draftPayloads = useRef<Record<number, Record<string, unknown>>>({})
  const elementWrites = useRef<Record<number, Promise<void>>>({})
  const canvasPendingCount = useRef(0)
  const [canvasSaveStatus, setCanvasSaveStatus] = useState<SaveStatus>('saved')
  const failedElementWrites = useRef<Record<number, CanvasElementPatch>>({})
  const canvasElementDragRef =
    useRef<CanvasElementDragState | null>(null)
  const canvasElementResizeRef =
    useRef<CanvasElementResizeState | null>(null)

  function historyPayload(element: CanvasElementFromApi) {
    if (element.asset_url) return null
    return {
      surface_type: element.surface_type,
      surface_key: element.surface_key,
      page_id: element.page_id,
      element_type: element.element_type,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      rotation: element.rotation,
      z_index: element.z_index,
      locked: element.locked,
      data: element.data,
    }
  }

  function pushCreatedElementHistory(payload: Record<string, unknown>, created: CanvasElementFromApi) {
    let entityId = created.id
    history.push({
      undo: async () => {
        await apiRequest<void>(`/canvas/elements/${entityId}`, { method: 'DELETE' })
        setPageCanvasElements(current => current.filter(element => element.id !== entityId))
        setSelectedCanvasElementId(current => current === entityId ? null : current)
      },
      redo: async () => {
        const previousId = entityId
        const restored = await apiRequest<CanvasElementFromApi>('/canvas/elements', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        entityId = restored.id
        history.remapEntityId('canvas', previousId, entityId)
        setPageCanvasElements(current => [...current, restored])
        setSelectedCanvasElementId(restored.id)
      },
      remapEntityId: (entityType, previousId, nextId) => {
        if (entityType === 'canvas' && entityId === previousId) entityId = nextId
      },
    })
  }

  function createInlineText(x: number, y: number, width: number) {
    if (activePageId === null) return
    const id = draftSequence.current--
    const payload = {
      surface_type: 'page', page_id: activePageId, element_type: 'text',
      x, y, width, height: 36, rotation: 0, z_index: Math.max(0, ...pageCanvasElements.map(element => element.z_index)) + 1, locked: false,
      data: { text: '', fontSize: 18, color: '#403a35' },
    }
    const draft: CanvasElementFromApi = { ...payload, id, user_id: 0, surface_key: '', created_at: new Date().toISOString(), updated_at: null }
    draftPayloads.current[id] = payload
    // A stable local identity keeps the caret independent of network latency.
    setPageCanvasElements(current => [...current, draft])
    setSelectedCanvasElementId(null)
    setEditingTextElementId(id)
    onCreated()
    canvasPendingCount.current += 1
    setCanvasSaveStatus('saving')
    createdIds.current[id] = apiRequest<CanvasElementFromApi>('/canvas/elements', {
      method: 'POST', body: JSON.stringify(payload),
    }).then(created => {
      pushCreatedElementHistory(payload, created)
      return created.id
    })
    void createdIds.current[id].catch(error => {
      failedElementWrites.current[id] = { data: draft.data }
      setDrawingError(error instanceof Error ? error.message : 'Falha ao criar texto.')
    }).finally(() => {
      canvasPendingCount.current -= 1
      setCanvasSaveStatus(Object.keys(failedElementWrites.current).length ? 'error' : canvasPendingCount.current ? 'saving' : 'saved')
    })
  }
  async function createStructuredElement(elementType: string, data: Record<string, unknown>, width: number, height: number, targetPageId = activePageId, x = 64, y = 100, zIndex = 2, locked = false, select = true) {
    if (targetPageId === null) return
    try {
      const created = await apiRequest<CanvasElementFromApi>('/canvas/elements', {
        method: 'POST',
        body: JSON.stringify({ surface_type: 'page', page_id: targetPageId, element_type: elementType,
          x, y, width, height, rotation: 0, z_index: select ? Math.max(zIndex, ...pageCanvasElements.map(element => element.z_index + 1)) : zIndex, locked, data }),
      })
      if (targetPageId === activePageId) setPageCanvasElements(current => [...current, created])
      if (select) setSelectedCanvasElementId(created.id)
      if (select && !elementType.startsWith('template:')) {
        pushCreatedElementHistory({
          surface_type: 'page',
          page_id: targetPageId,
          element_type: elementType,
          x,
          y,
          width,
          height,
          rotation: 0,
          z_index: created.z_index,
          locked,
          data,
        }, created)
      }
      onCreated()
      return created
    } catch (error) {
      setDrawingError(error instanceof Error ? error.message : 'Não foi possível inserir o elemento.')
      return null
    }
  }
  async function createPageCanvasElement(
    kind: 'shape' | 'arrow' | 'postit' | 'washi' | 'stamp',
    variant = '',
    customColor?: string,
  ) {
    if (activePageId === null) {
      return
    }

    onInsert()

    let defaults: {
      elementType: string
      width: number
      height: number
      data: Record<string, unknown>
    }

    if (kind === 'shape') {
      defaults = {
        elementType: 'shape',
        width:
          variant === 'circle'
            ? 150
            : variant === 'triangle'
              ? 170
              : 180,
        height:
          variant === 'circle'
            ? 150
            : 120,
        data: {
          shape:
            variant || 'rounded',
          fill: '#FDD0D0',
          border: '#7a6f67',
        },
      }
    } else if (kind === 'arrow') {
      defaults = {
        elementType: 'arrow',
        width:
          variant === 'down'
            ? 78
            : 220,
        height:
          variant === 'down'
            ? 220
            : 82,
        data: {
          variant:
            variant || 'straight',
          color: '#5BA881',
        },
      }
    } else if (kind === 'postit') {
      const option =
        POSTIT_OPTIONS.find(
          ([id]) => id === variant,
        )

      defaults = {
        elementType: 'postit',
        width: 210,
        height: 170,
        data: {
          text: '',
          color:
            option?.[1]
            ?? '#FCD57D',
          variant:
            variant || 'classic-butter',
        },
      }
    } else if (kind === 'washi') {
      const option =
        WASHI_OPTIONS.find(
          ([id]) => id === variant,
        )

      defaults = {
        elementType: 'washi',
        width: 260,
        height: 54,
        data: {
          color:
            option?.[1]
            ?? '#E6E3F7',
          pattern:
            variant || 'dots',
        },
      }
    } else {
      const option =
        STAMP_OPTIONS.find(
          ([id]) => id === variant,
        )

      defaults = {
        elementType: 'stamp',
        width: 92,
        height: 92,
        data: {
          symbol:
            option?.[1]
            ?? '✦',
          variant:
            variant || 'star',
          color: customColor ?? stampColor,
        },
      }
    }

    await createStructuredElement(
      defaults.elementType,
      defaults.data,
      defaults.width,
      defaults.height,
      activePageId,
      110,
      120,
      Math.max(0, ...pageCanvasElements.map(element => element.z_index)) + 1,
    )
  }

  async function patchPageCanvasElement(elementId: number, patch: CanvasElementPatch, recordHistory = true, historyBefore?: CanvasElementFromApi): Promise<boolean> {
    const before = historyBefore ?? pageCanvasElements.find(element => element.id === elementId)
    const trackedPatch: CanvasElementPatch = {}
    if (recordHistory && !('data' in patch) && before) {
      if (patch.x !== undefined && patch.x !== before.x) trackedPatch.x = patch.x
      if (patch.y !== undefined && patch.y !== before.y) trackedPatch.y = patch.y
      if (patch.width !== undefined && patch.width !== before.width) trackedPatch.width = patch.width
      if (patch.height !== undefined && patch.height !== before.height) trackedPatch.height = patch.height
      if (patch.rotation !== undefined && patch.rotation !== before.rotation) trackedPatch.rotation = patch.rotation
      if (patch.z_index !== undefined && patch.z_index !== before.z_index) trackedPatch.z_index = patch.z_index
      if (patch.locked !== undefined && patch.locked !== before.locked) trackedPatch.locked = patch.locked
    }
    if (Object.keys(trackedPatch).length > 0 && before) {
      const after = { ...before, ...trackedPatch }
      let targetId = elementId
      const apply = async (target: CanvasElementFromApi) => {
        const didSave = await patchPageCanvasElement(targetId, {
          x: target.x,
          y: target.y,
          width: target.width,
          height: target.height,
          rotation: target.rotation,
          z_index: target.z_index,
          locked: target.locked,
        }, false)
        if (!didSave) throw new Error('Não foi possível persistir a operação do canvas.')
      }
      history.push({
        undo: () => apply(before),
        redo: () => apply(after),
        remapEntityId: (entityType, previousId, nextId) => {
          if (entityType === 'canvas' && targetId === previousId) targetId = nextId
        },
      })
    }
    setPageCanvasElements(current => current.map(element => element.id === elementId ? { ...element, ...patch } : element))
    canvasPendingCount.current += 1
    setCanvasSaveStatus('saving')
    const previous = elementWrites.current[elementId] ?? Promise.resolve()
    let succeeded = true
    const write = previous.then(async () => {
      const payload = { ...failedElementWrites.current[elementId], ...patch }
      try {
        const persistedId = elementId < 0 ? await createdIds.current[elementId].catch(() => {
          // A failed initial POST must be retryable without losing the local draft.
          const retry = apiRequest<CanvasElementFromApi>('/canvas/elements', {
            method: 'POST', body: JSON.stringify(draftPayloads.current[elementId]),
          }).then(created => created.id)
          createdIds.current[elementId] = retry
          return retry
        }) : elementId
        await apiRequest<CanvasElementFromApi>(`/canvas/elements/${persistedId}`, {
          method: 'PATCH', body: JSON.stringify(payload),
        })
        delete failedElementWrites.current[elementId]
      } catch (error) {
        succeeded = false
        failedElementWrites.current[elementId] = payload
        setDrawingError(error instanceof Error ? error.message : 'Não foi possível salvar o elemento.')
      } finally {
        canvasPendingCount.current -= 1
        setCanvasSaveStatus(Object.keys(failedElementWrites.current).length ? 'error' : canvasPendingCount.current ? 'saving' : 'saved')
      }
    })
    elementWrites.current[elementId] = write
    await write
    return succeeded
  }

  async function reorderPageCanvasElements(elementId: number, action: LayerAction) {
    const reorderable = pageCanvasElements.filter(element => !element.element_type.startsWith('template:'))
    const changes = reorderLayers(
      reorderable.map(element => ({ id: element.id, zIndex: element.z_index })),
      elementId,
      action,
    )
    if (changes.length === 0) return
    const before = changes.map(change => ({
      id: change.id,
      zIndex: reorderable.find(element => element.id === change.id)?.z_index ?? change.zIndex,
    }))
    const after = changes.map(change => ({ id: change.id, zIndex: change.zIndex }))
    const apply = async (values: typeof before) => {
      for (const value of values) {
        const didSave = await patchPageCanvasElement(value.id, { z_index: value.zIndex }, false)
        if (!didSave) throw new Error('Não foi possível salvar a ordem das camadas.')
      }
    }
    await apply(after)
    history.push({
      undo: () => apply(before),
      redo: () => apply(after),
      remapEntityId: (entityType, previousId, nextId) => {
        if (entityType !== 'canvas') return
        for (const value of [...before, ...after]) {
          if (value.id === previousId) value.id = nextId
        }
      },
    })
  }

  function handleCanvasElementPointerDown(
    event: ReactPointerEvent<HTMLElement>,
    element: CanvasElementFromApi,
  ) {
    if (
      event.button !== 0
      || element.locked
    ) {
      return
    }

    const layer =
      event.currentTarget.closest(
        '.free-canvas-layer',
      ) as HTMLElement | null

    if (!layer) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(
      event.pointerId,
    )

    const maxX = Math.max(
      0,
      layer.clientWidth - element.width,
    )
    const maxY = Math.max(
      0,
      layer.clientHeight - element.height,
    )

    setEditingTextElementId(null)
    canvasElementDragRef.current = {
      elementId: element.id,
      pointerId: event.pointerId,
      before: element,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: element.x,
      startY: element.y,
      maxX,
      maxY,
      currentX: element.x,
      currentY: element.y,
    }

    setSelectedCanvasElementId(
      element.id,
    )
  }

  function handleCanvasElementPointerMove(
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const drag =
      canvasElementDragRef.current

    if (
      drag === null
      || drag.pointerId !==
        event.pointerId
    ) {
      return
    }

    const nextX = Math.max(
      0,
      Math.min(
        drag.maxX,
        drag.startX
          + (event.clientX - drag.startClientX) / scale,
      ),
    )
    const nextY = Math.max(
      0,
      Math.min(
        drag.maxY,
        drag.startY
          + (event.clientY - drag.startClientY) / scale,
      ),
    )

    drag.currentX = nextX
    drag.currentY = nextY

    setPageCanvasElements(
      (current) =>
        current.map(
          (element) =>
            element.id ===
              drag.elementId
              ? {
                  ...element,
                  x: nextX,
                  y: nextY,
                }
              : element,
        ),
    )
  }

  function finishCanvasElementDrag(
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const drag =
      canvasElementDragRef.current

    if (
      drag === null
      || drag.pointerId !==
        event.pointerId
    ) {
      return
    }

    if (
      event.currentTarget
        .hasPointerCapture(
          event.pointerId,
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId,
        )
    }

    canvasElementDragRef.current = null

    void patchPageCanvasElement(
      drag.elementId,
      {
        x: drag.currentX,
        y: drag.currentY,
      },
      true,
      { ...drag.before, x: drag.startX, y: drag.startY },
    )
  }

  function handleCanvasElementResizeStart(
    event: ReactPointerEvent<HTMLElement>,
    element: CanvasElementFromApi,
  ) {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(
      event.pointerId,
    )

    canvasElementResizeRef.current = {
      elementId: element.id,
      pointerId: event.pointerId,
      before: element,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: element.width,
      startHeight: element.height,
      maxWidth: Math.max(56, (event.currentTarget.closest('.free-canvas-layer')?.clientWidth ?? 886) - element.x),
      maxHeight: Math.max(42, (event.currentTarget.closest('.free-canvas-layer')?.clientHeight ?? 1253) - element.y),
      currentWidth: element.width,
      currentHeight: element.height,
    }
  }

  function handleCanvasElementResizeMove(
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const resize =
      canvasElementResizeRef.current

    if (
      resize === null
      || resize.pointerId !==
        event.pointerId
    ) {
      return
    }

    const nextWidth = Math.min(resize.maxWidth, Math.max(56, resize.startWidth + (event.clientX - resize.startClientX) / scale))
    const nextHeight = Math.min(resize.maxHeight, Math.max(42, resize.startHeight + (event.clientY - resize.startClientY) / scale))

    resize.currentWidth = nextWidth
    resize.currentHeight = nextHeight

    setPageCanvasElements(
      (current) =>
        current.map(
          (element) =>
            element.id ===
              resize.elementId
              ? {
                  ...element,
                  width: nextWidth,
                  height: nextHeight,
                }
              : element,
        ),
    )
  }

  function finishCanvasElementResize(
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const resize =
      canvasElementResizeRef.current

    if (
      resize === null
      || resize.pointerId !==
        event.pointerId
    ) {
      return
    }

    if (
      event.currentTarget
        .hasPointerCapture(
          event.pointerId,
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId,
        )
    }

    canvasElementResizeRef.current = null

    void patchPageCanvasElement(
      resize.elementId,
      {
        width: resize.currentWidth,
        height: resize.currentHeight,
      },
      true,
      { ...resize.before, width: resize.startWidth, height: resize.startHeight },
    )
  }

  async function duplicatePageCanvasElement(
    elementId: number,
  ) {
    try {
      await elementWrites.current[elementId]
      const persistedId = elementId < 0 ? await createdIds.current[elementId] : elementId
      const duplicated =
        await apiRequest<
          CanvasElementFromApi
        >(
          `/canvas/elements/${persistedId}/duplicate`,
          { method: 'POST' },
        )

      setPageCanvasElements(
        (current) => [
          ...current,
          duplicated,
        ],
      )
      setSelectedCanvasElementId(
        duplicated.id,
      )
      let duplicatedId = duplicated.id
      let sourceId = persistedId
      history.push({
        undo: async () => {
          await apiRequest<void>(`/canvas/elements/${duplicatedId}`, { method: 'DELETE' })
          setPageCanvasElements(current => current.filter(element => element.id !== duplicatedId))
          setSelectedCanvasElementId(current => current === duplicatedId ? null : current)
        },
        redo: async () => {
          const previousId = duplicatedId
          const restored = await apiRequest<CanvasElementFromApi>(`/canvas/elements/${sourceId}/duplicate`, { method: 'POST' })
          duplicatedId = restored.id
          history.remapEntityId('canvas', previousId, duplicatedId)
          setPageCanvasElements(current => [...current, restored])
          setSelectedCanvasElementId(restored.id)
        },
        remapEntityId: (entityType, previousId, nextId) => {
          if (entityType !== 'canvas') return
          if (duplicatedId === previousId) duplicatedId = nextId
          if (sourceId === previousId) sourceId = nextId
        },
      })
    } catch (error) {
      console.error(error)
      setDrawingError(
        error instanceof Error
          ? error.message
          : 'Não foi possível duplicar o elemento.',
      )
    }
  }

  async function deletePageCanvasElement(
    elementId: number,
  ) {
    try {
      await elementWrites.current[elementId]
      const persistedId = elementId < 0 ? await createdIds.current[elementId] : elementId
      const element = pageCanvasElements.find(item => item.id === elementId)
      if (element?.asset_url && !window.confirm('Este elemento contém um arquivo que será removido permanentemente. Deseja continuar?')) return
      await apiRequest<void>(
        `/canvas/elements/${persistedId}`,
        { method: 'DELETE' },
      )
      delete failedElementWrites.current[elementId]
      setCanvasSaveStatus(Object.keys(failedElementWrites.current).length ? 'error' : canvasPendingCount.current ? 'saving' : 'saved')

      setPageCanvasElements(
        (current) =>
          current.filter(
            (element) =>
              element.id !== elementId,
          ),
      )
      setSelectedCanvasElementId(
        (current) =>
          current === elementId
            ? null
            : current,
      )
      const payload = element ? historyPayload(element) : null
      if (payload) {
        let restoredId = persistedId
        history.push({
          undo: async () => {
            const previousId = restoredId
            const restored = await apiRequest<CanvasElementFromApi>('/canvas/elements', {
              method: 'POST',
              body: JSON.stringify(payload),
            })
            restoredId = restored.id
            history.remapEntityId('canvas', previousId, restoredId)
            setPageCanvasElements(current => [...current, restored])
            setSelectedCanvasElementId(restored.id)
          },
          redo: async () => {
            await apiRequest<void>(`/canvas/elements/${restoredId}`, { method: 'DELETE' })
            setPageCanvasElements(current => current.filter(item => item.id !== restoredId))
            setSelectedCanvasElementId(current => current === restoredId ? null : current)
          },
          remapEntityId: (entityType, previousId, nextId) => {
            if (entityType === 'canvas' && restoredId === previousId) restoredId = nextId
          },
        })
      }
    } catch (error) {
      console.error(error)
      setDrawingError(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir o elemento.',
      )
    }
  }

  function rotatePageCanvasElement(
    element: CanvasElementFromApi,
  ) {
    const nextRotation =
      element.rotation + 15

    setPageCanvasElements(
      (current) =>
        current.map(
          (currentElement) =>
            currentElement.id ===
              element.id
              ? {
                  ...currentElement,
                  rotation: nextRotation,
                }
              : currentElement,
        ),
    )

    void patchPageCanvasElement(
      element.id,
      { rotation: nextRotation },
    )
  }

  function handlePostItTextBlur(
    element: CanvasElementFromApi,
    text: string,
  ) {
    if (element.locked || text === (element.data.text ?? '')) return
    const nextData = {
      ...element.data,
      text,
    }

    setPageCanvasElements(
      (current) =>
        current.map(
          (currentElement) =>
            currentElement.id ===
              element.id
              ? {
                  ...currentElement,
                  data: nextData,
                }
              : currentElement,
        ),
    )

    void patchPageCanvasElement(
      element.id,
      { data: nextData },
    )
  }

  return { editingTextElementId, setEditingTextElementId, pageCanvasElements, setPageCanvasElements, selectedCanvasElementId, setSelectedCanvasElementId, canvasSaveStatus, failedElementWrites, createInlineText, createStructuredElement, createPageCanvasElement, patchPageCanvasElement, handleCanvasElementPointerDown, handleCanvasElementPointerMove, finishCanvasElementDrag, handleCanvasElementResizeStart, handleCanvasElementResizeMove, finishCanvasElementResize, duplicatePageCanvasElement, deletePageCanvasElement, rotatePageCanvasElement, reorderPageCanvasElements, handlePostItTextBlur }
}
