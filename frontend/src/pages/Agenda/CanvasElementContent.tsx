import { Shapes } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import type { CanvasElementFromApi } from './editorModel'
import type { PlannerTask } from './editorModel'
import { DailyPlanner, KoreanStudyPlanner, TaskReceipt } from './PlannerWidgets'
import { TemplateBackground } from './TemplateBackground'
import { SectionTemplateContent } from './SectionTemplates'
export function CanvasElementContent({ element, editing, onTextBlur, onTextInput, onSelect, onDataChange, onDuplicateSection, tasks, onToggleTask, weekStart, onWeeklyWeekChange }: {
  element: CanvasElementFromApi
  editing?: boolean
  onDuplicateSection?: (title: string, text: string) => void
  onTextBlur: (element: CanvasElementFromApi, text: string) => void
  onTextInput: (element: CanvasElementFromApi, text: string) => void
  onSelect: (id: number) => void
  onDataChange: (element: CanvasElementFromApi, data: Record<string, unknown>) => void
  tasks: PlannerTask[]
  onToggleTask: (id: number, done: boolean) => void
  weekStart?: string
  onWeeklyWeekChange?: (weekStart: string) => Promise<void>
}) {
    const textRef = useRef<HTMLTextAreaElement>(null)
    useLayoutEffect(() => {
      if (editing && textRef.current && document.activeElement !== textRef.current) textRef.current.focus()
    }, [editing])
    if (element.element_type.startsWith('template:')) {
      const spreadSide = element.data.spreadSide === 'left' || element.data.spreadSide === 'right'
        ? element.data.spreadSide
        : undefined
      return <TemplateBackground templateId={element.element_type.slice('template:'.length)} spreadSide={spreadSide} data={element.data} onChange={data => onDataChange(element, data)} onDuplicateSection={onDuplicateSection} weekStart={weekStart} onWeeklyWeekChange={onWeeklyWeekChange} />
    }
    if (['section:habit-tracker', 'section:mini-calendar', 'section:notes-block', 'section:goal-block', 'section:priorities-block', 'section:checklist-block', 'section:quote-block', 'section:time-blocking'].includes(element.element_type)) {
      return <SectionTemplateContent element={element} onDataChange={data => onDataChange(element, data)} />
    }
    if (element.element_type === 'section:study-planner' || element.element_type === 'widget:task-receipt' || element.element_type === 'section:daily-planner') {
      const props = { element, tasks, onDataChange: (data: Record<string, unknown>) => onDataChange(element, data), onToggleTask }
      return element.element_type === 'section:study-planner' ? <KoreanStudyPlanner {...props} /> : element.element_type === 'section:daily-planner' ? <DailyPlanner {...props} /> : <TaskReceipt {...props} />
    }
    const color =
      typeof element.data.color === 'string'
        ? element.data.color
        : '#FDD0D0'

    if (element.element_type === 'shape') {
      const fill =
        typeof element.data.fill === 'string'
          ? element.data.fill
          : color
      const border =
        typeof element.data.border === 'string'
          ? element.data.border
          : '#7a6f67'
      const shape =
        typeof element.data.shape === 'string'
          ? element.data.shape
          : 'rounded'

      return (
        <svg
          className="canvas-shape-element"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {shape === 'circle' && (
            <ellipse
              cx="50"
              cy="50"
              rx="45"
              ry="45"
              fill={fill}
              stroke={border}
              strokeWidth="2"
            />
          )}

          {shape === 'square' && (
            <rect
              x="7"
              y="7"
              width="86"
              height="86"
              rx="3"
              fill={fill}
              stroke={border}
              strokeWidth="2"
            />
          )}

          {shape === 'rounded' && (
            <rect
              x="6"
              y="12"
              width="88"
              height="76"
              rx="18"
              fill={fill}
              stroke={border}
              strokeWidth="2"
            />
          )}

          {shape === 'triangle' && (
            <polygon
              points="50,6 94,91 6,91"
              fill={fill}
              stroke={border}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}

          {shape === 'diamond' && (
            <polygon
              points="50,5 95,50 50,95 5,50"
              fill={fill}
              stroke={border}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}

          {shape === 'hexagon' && (
            <polygon
              points="25,7 75,7 96,50 75,93 25,93 4,50"
              fill={fill}
              stroke={border}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}

          {shape === 'cloud' && (
            <path
              d="M23 73C11 73 5 65 5 56c0-9 7-16 17-17 3-15 15-24 29-24 15 0 27 10 30 25 9 1 15 8 15 17 0 10-8 16-18 16H23Z"
              fill={fill}
              stroke={border}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}

          {shape === 'heart' && (
            <path
              d="M50 91 13 55C-2 40 7 14 28 12c11-1 18 5 22 13 5-8 12-14 23-13 21 2 30 28 14 43L50 91Z"
              fill={fill}
              stroke={border}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}

          {shape === 'star' && (
            <polygon
              points="50,5 61,37 95,37 67,57 78,91 50,70 22,91 33,57 5,37 39,37"
              fill={fill}
              stroke={border}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}

          {shape === 'speech' && (
            <path
              d="M10 12h80c5 0 8 3 8 8v52c0 5-3 8-8 8H50L28 96l4-16H10c-5 0-8-3-8-8V20c0-5 3-8 8-8Z"
              fill={fill}
              stroke={border}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}
          {shape === 'line' && <line x1="5" y1="50" x2="95" y2="50" stroke={border} strokeWidth="3" strokeLinecap="round" />}
        </svg>
      )
    }

    if (element.element_type === 'arrow') {
      const variant =
        typeof element.data.variant === 'string'
          ? element.data.variant
          : 'straight'

      return (
        <svg
          className="canvas-arrow-element"
          viewBox="0 0 220 82"
          aria-hidden="true"
        >
          {variant === 'decorative' ? <><path d="M18 41 C55 16 78 66 112 41 S170 15 194 41" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" /><path d="m177 25 22 16-22 16" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="31" cy="41" r="5" fill={color} /></>
            : variant === 'curved'
            ? (
              <>
                <path
                  d="M18 63 C68 7 139 8 194 42"
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <polyline
                  points="164,20 198,43 171,69"
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )
            : variant === 'double'
              ? (
                <>
                  <line
                    x1="30"
                    y1="41"
                    x2="190"
                    y2="41"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <polyline
                    points="57,16 24,41 57,66"
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points="163,16 196,41 163,66"
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )
              : variant === 'down'
                ? (
                  <>
                    <line
                      x1="110"
                      y1="10"
                      x2="110"
                      y2="64"
                      stroke={color}
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    <polyline
                      points="84,46 110,72 136,46"
                      fill="none"
                      stroke={color}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )
                : variant === 'corner'
                  ? (
                    <>
                      <path
                        d="M24 16v42c0 9 7 16 16 16h151"
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points="162,50 198,74 163,79"
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  )
                  : (
                    <>
                      <line
                        x1="16"
                        y1="41"
                        x2="194"
                        y2="41"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={
                          variant === 'dashed'
                            ? '15 13'
                            : undefined
                        }
                      />
                      <polyline
                        points="164,16 198,41 164,66"
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  )}
        </svg>
      )
    }

    if (element.element_type === 'text') {
      return <textarea
        ref={textRef}
        className="canvas-inline-text"
        aria-label="Texto da página"
        defaultValue={typeof element.data.text === 'string' ? element.data.text : ''}
        placeholder={typeof element.data.placeholder === 'string' ? element.data.placeholder : ''}
        readOnly={element.locked}
        style={{
          color: typeof element.data.color === 'string' ? element.data.color : '#403a35',
          fontSize: typeof element.data.fontSize === 'number' ? `${element.data.fontSize}px` : '18px',
          fontFamily: typeof element.data.fontFamily === 'string' ? element.data.fontFamily : undefined,
          fontWeight: element.data.fontWeight === 'bold' ? 'bold' : 'normal',
          fontStyle: element.data.fontStyle === 'italic' ? 'italic' : 'normal',
          textAlign: element.data.textAlign === 'center' ? 'center' : element.data.textAlign === 'right' ? 'right' : 'left',
          lineHeight: typeof element.data.lineHeight === 'number' ? element.data.lineHeight : 1.55,
        }}
        onFocus={() => onSelect(element.id)}
        onPointerDown={event => event.stopPropagation()}
        onClick={event => event.stopPropagation()}
        onChange={event => onTextInput(element, event.target.value)}
        onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') event.currentTarget.blur() }}
        onBlur={event => onTextBlur(element, event.target.value)}
      />
    }

    if (element.element_type === 'postit') {
      const text =
        typeof element.data.text === 'string'
          ? element.data.text
          : ''

      const variant =
        typeof element.data.variant === 'string'
          ? element.data.variant
          : 'classic-butter'

      return (
        <textarea
          className={`canvas-postit-element postit-${variant}`}
          defaultValue={text}
          style={{
            backgroundColor: color,
          }}
          aria-label="Texto do post-it"
          placeholder="Escreva aqui…"
          readOnly={element.locked}
          onChange={event => onTextInput(element, event.target.value)}
          onFocus={() => onSelect(element.id)}
          onPointerDown={(event) =>
            event.stopPropagation()
          }
          onClick={(event) =>
            event.stopPropagation()
          }
          onBlur={(event) =>
            onTextBlur(
              element,
              event.target.value,
            )
          }
        />
      )
    }

    if (element.element_type === 'washi') {
      const pattern =
        typeof element.data.pattern === 'string'
          ? element.data.pattern
          : 'dots'

      return (
        <div
          className={`canvas-washi-element washi-${pattern}`}
          style={{
            backgroundColor: color,
          }}
        >
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      )
    }

    if (element.element_type === 'stamp') {
      const symbol =
        typeof element.data.symbol === 'string'
          ? element.data.symbol
          : '✦'

      return (
        <div
          className="canvas-stamp-element"
          style={{ color }}
          aria-hidden="true"
        >
          {symbol}
        </div>
      )
    }

    return (
      <div className="canvas-generic-element">
        <Shapes size={16} />
      </div>
    )
  }
