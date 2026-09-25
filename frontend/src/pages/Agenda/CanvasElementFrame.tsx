import { GripHorizontal } from 'lucide-react'
import type { PointerEvent, ReactNode } from 'react'
import type { CanvasElementFromApi } from './editorModel'
import { clampPosition } from './canvasGeometry'

export function CanvasElementFrame({ element, selected, editing, children, onSelect, onMoveStart, onMove, onMoveEnd, onNudge }: {
  element: CanvasElementFromApi; selected: boolean; children: ReactNode
  editing?: boolean
  onSelect: () => void
  onMoveStart: (event: PointerEvent<HTMLElement>) => void
  onMove: (event: PointerEvent<HTMLElement>) => void
  onMoveEnd: (event: PointerEvent<HTMLElement>) => void
  onNudge: (x: number, y: number) => void
}) {
  const isTemplateBase = element.element_type.startsWith('template:')
  return <article data-element-id={element.id} className={`free-canvas-element ${selected && !editing ? 'is-selected' : ''} ${editing ? 'is-writing' : ''} ${element.locked ? 'is-locked' : ''} ${isTemplateBase ? 'is-template-base' : ''}`}
    style={{ left: element.x, top: element.y, width: element.width, height: element.height,
      transform: `rotate(${element.rotation}deg)`, zIndex: element.z_index }}
    onContextMenu={isTemplateBase ? undefined : event => { event.preventDefault(); event.stopPropagation(); if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); onSelect() }}
    onClick={isTemplateBase ? undefined : event => { event.stopPropagation(); if (!(event.target as Element).closest('input, textarea, [contenteditable]')) onSelect() }}
    onPointerDown={isTemplateBase ? undefined : event => { if ((event.target as Element).closest('input, textarea, button, [contenteditable]')) { event.stopPropagation(); return } onMoveStart(event) }} onPointerMove={isTemplateBase ? undefined : onMove} onPointerUp={isTemplateBase ? undefined : onMoveEnd} onPointerCancel={isTemplateBase ? undefined : onMoveEnd}>
    {children}
    {!element.locked && !isTemplateBase && !editing && <button type="button" className="canvas-move-handle"
      aria-label={`Mover ${element.element_type === 'postit' ? 'post-it' : 'elemento'}. Use as setas do teclado.`}
      title="Arraste para mover · setas para ajustar" onFocus={onSelect}
      onPointerDown={onMoveStart} onPointerMove={event => { event.stopPropagation(); onMove(event) }}
      onPointerUp={event => { event.stopPropagation(); onMoveEnd(event) }}
      onPointerCancel={event => { event.stopPropagation(); onMoveEnd(event) }}
      onKeyDown={event => {
        const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
        const direction = directions[event.key]
        const layer = event.currentTarget.closest('.free-canvas-layer')
        if (!direction || !layer) return
        event.preventDefault()
        const step = event.shiftKey ? 10 : 1
        const point = clampPosition(element.x + direction[0] * step, element.y + direction[1] * step,
          element.width, element.height, layer.clientWidth, layer.clientHeight)
        onNudge(point.x, point.y)
      }}><GripHorizontal size={18} aria-hidden="true" /></button>}
  </article>
}
