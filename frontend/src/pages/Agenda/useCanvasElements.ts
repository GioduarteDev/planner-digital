import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { apiRequest } from '../../services/api'
import type { CanvasElementFromApi, CanvasElementPatch, CanvasElementDragState, CanvasElementResizeState, SaveStatus } from './editorModel'
import { POSTIT_OPTIONS, WASHI_OPTIONS, STAMP_OPTIONS } from './editorCatalog'

/** Shared DOM canvas controller. CanvasElement remains the sole persistence contract. */
export function useCanvasElements({ activePageId, scale, stampColor, onInsert, onCreated, onError: setDrawingError }: {
  activePageId: number | null
  scale: number
  stampColor: string
  onInsert: () => void
  onCreated: () => void
  onError: (message: string) => void
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
    }).then(created => created.id)
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

    try {
      setDrawingError('')

      const created =
        await apiRequest<
          CanvasElementFromApi
        >(
          '/canvas/elements',
          {
            method: 'POST',
            body: JSON.stringify({
              surface_type: 'page',
              page_id: activePageId,
              element_type:
                defaults.elementType,
              x: 110,
              y: 120,
              width: defaults.width,
              height: defaults.height,
              rotation: 0,
              z_index: Math.max(0, ...pageCanvasElements.map(element => element.z_index)) + 1,
              locked: false,
              data: defaults.data,
            }),
          },
        )

      setPageCanvasElements(
        (current) => [
          ...current,
          created,
        ],
      )
      setSelectedCanvasElementId(
        created.id,
      )
      onCreated()
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setDrawingError(error.message)
      } else {
        setDrawingError(
          'Não foi possível inserir o elemento.',
        )
      }
    }
  }

  async function patchPageCanvasElement(elementId: number, patch: CanvasElementPatch) {
    setPageCanvasElements(current => current.map(element => element.id === elementId ? { ...element, ...patch } : element))
    canvasPendingCount.current += 1
    setCanvasSaveStatus('saving')
    const previous = elementWrites.current[elementId] ?? Promise.resolve()
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
        failedElementWrites.current[elementId] = payload
        setDrawingError(error instanceof Error ? error.message : 'Não foi possível salvar o elemento.')
      } finally {
        canvasPendingCount.current -= 1
        setCanvasSaveStatus(Object.keys(failedElementWrites.current).length ? 'error' : canvasPendingCount.current ? 'saving' : 'saved')
      }
    })
    elementWrites.current[elementId] = write
    await write
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

  return { editingTextElementId, setEditingTextElementId, pageCanvasElements, setPageCanvasElements, selectedCanvasElementId, setSelectedCanvasElementId, canvasSaveStatus, failedElementWrites, createInlineText, createStructuredElement, createPageCanvasElement, patchPageCanvasElement, handleCanvasElementPointerDown, handleCanvasElementPointerMove, finishCanvasElementDrag, handleCanvasElementResizeStart, handleCanvasElementResizeMove, finishCanvasElementResize, duplicatePageCanvasElement, deletePageCanvasElement, rotatePageCanvasElement, handlePostItTextBlur }
}
