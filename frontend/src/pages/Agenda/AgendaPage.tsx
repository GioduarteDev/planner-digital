import {
  Link,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import {
  Ellipsis,
  FileText,
  Highlighter,
  Image as ImageIcon,
  LayoutTemplate,
  ListChecks,
  PenTool,
  Shapes,
  Sticker,
  Type as TypeIcon,
} from 'lucide-react'

import {
  apiRequest,
  API_URL,
  getCsrfToken,
} from '../../services/api'
import './AgendaPage.css'

const MAX_PAGES = 400
const API_BASE_URL = API_URL

const DEFAULT_PAPER_SETTINGS: PaperSettings = {
  backgroundColor: '#fffdf8',
  lineColor: '#d8d1ca',
  spacing: 28,
  opacity: 0.72,
  margin: 56,
  orientation: 'portrait',
  size: 'a4',
  customWidth: 820,
  customHeight: 1160,
}

const PEN_COLORS = [
  '#2f2b28',
  '#6f5f59',
  '#9b6e73',
  '#9d7b57',
  '#617064',
  '#547383',
  '#6c6488',
  '#a45e6c',
  '#c17f62',
  '#3f6d66',
  '#506aa0',
  '#7d5e92',
]

const HIGHLIGHTER_PRESETS = [
  '#fff1a8', '#ffe49a', '#ffd99f', '#ffcfa8', '#ffc1bf',
  '#f6b9ca', '#eebbd8', '#dfc0e8', '#d3c6f1', '#c4cdf5',
  '#bad8f4', '#b9e2ef', '#bce8df', '#c8ebce', '#d7efbc',
  '#e7efb5', '#f2e9b6', '#f5dfc1', '#f2d4c9', '#e9ccd7',
  '#d8d0e4', '#cbd7e3', '#c8dedb', '#d2dfce', '#e3dfca',
  '#ffea62', '#ffd15c', '#ffb869', '#ff9e9e', '#ff8fbd',
  '#d68cff', '#a99cff', '#7fb5ff', '#75d7e7', '#76dec1',
  '#8cdf91', '#b5e467', '#d8e75d', '#f3ca67', '#e9a978',
]

const SHAPE_OPTIONS = [
  ['circle', '○', 'Círculo'],
  ['square', '□', 'Quadrado'],
  ['rounded', '▢', 'Arredondado'],
  ['triangle', '△', 'Triângulo'],
  ['diamond', '◇', 'Losango'],
  ['hexagon', '⬡', 'Hexágono'],
  ['cloud', '☁', 'Nuvem'],
  ['heart', '♡', 'Coração'],
  ['star', '☆', 'Estrela'],
  ['speech', '▱', 'Balão'],
] as const

const ARROW_OPTIONS = [
  ['straight', '→', 'Reta'],
  ['double', '↔', 'Dupla'],
  ['curved', '↪', 'Curva'],
  ['dashed', '⇢', 'Tracejada'],
  ['down', '↓', 'Vertical'],
  ['corner', '↳', 'Canto'],
] as const

const POSTIT_OPTIONS = [
  ['classic-butter', '#FCD57D', 'Clássico'],
  ['rounded-ballet', '#FDD0D0', 'Arredondado'],
  ['torn-wisteria', '#E6E3F7', 'Papel rasgado'],
  ['ticket-seafoam', '#E7F5F9', 'Ticket'],
  ['tab-rainy', '#B3DFE8', 'Com aba'],
  ['folded-matcha', '#9CA362', 'Dobradinho'],
  ['soft-milk', '#FCEDED', 'Soft'],
  ['wide-attic', '#98C1E7', 'Horizontal'],
  ['tall-clover', '#5BA881', 'Vertical'],
  ['memo-latte', '#F7F1E8', 'Memo'],
  ['label-apricot', '#F0A351', 'Etiqueta'],
  ['scallop-ballet', '#FDD0D0', 'Ondulado'],
  ['corner-butter', '#FCD57D', 'Canto'],
  ['note-wisteria', '#E6E3F7', 'Bilhetinho'],
  ['card-seafoam', '#E7F5F9', 'Card'],
  ['organic-matcha', '#9CA362', 'Orgânico'],
  ['mini-rainy', '#B3DFE8', 'Mini'],
  ['paper-clover', '#5BA881', 'Papel'],
  ['bookmark-apricot', '#F0A351', 'Marcador'],
  ['accent-cherry', '#C62A29', 'Destaque'],
] as const

const WASHI_OPTIONS = [
  ['dots', '#E6E3F7', 'Poá'],
  ['stripes', '#B3DFE8', 'Listras'],
  ['checks', '#FDD0D0', 'Xadrez'],
  ['stars', '#FCD57D', 'Estrelas'],
  ['hearts', '#FDD0D0', 'Corações'],
  ['flowers', '#FCEDED', 'Flores'],
  ['moons', '#E6E3F7', 'Luas'],
  ['leaves', '#9CA362', 'Folhinhas'],
  ['bows', '#FDD0D0', 'Laços'],
  ['clouds', '#B3DFE8', 'Nuvens'],
  ['sparkles', '#E6E3F7', 'Brilhos'],
  ['cherries', '#C62A29', 'Cerejas'],
  ['daisies', '#FCD57D', 'Margaridas'],
  ['grid', '#E7F5F9', 'Grid'],
  ['scallop', '#F0A351', 'Ondinhas'],
  ['waves', '#98C1E7', 'Ondas'],
  ['tickets', '#F7F1E8', 'Tickets'],
  ['confetti', '#5BA881', 'Confete'],
  ['lace', '#FCEDED', 'Rendinha'],
  ['plain', '#9CA362', 'Liso'],
] as const

const STAMP_OPTIONS = [
  ['star', '✦', 'Estrela'],
  ['heart', '♥', 'Coração'],
  ['flower', '✿', 'Flor'],
  ['sparkle', '✧', 'Brilho'],
  ['check', '✓', 'Check'],
  ['moon', '☾', 'Lua'],
  ['sun', '☀', 'Sol'],
  ['leaf', '❧', 'Folha'],
  ['clover', '♣', 'Trevo'],
  ['butterfly', '𓆩♡𓆪', 'Borboleta'],
  ['diamond', '◆', 'Diamante'],
  ['circle', '●', 'Bolinha'],
  ['cross', '×', 'X'],
  ['arrow', '➜', 'Seta'],
  ['crown', '♛', 'Coroa'],
  ['music', '♫', 'Música'],
  ['book', '▤', 'Livro'],
  ['coffee', '☕', 'Café'],
  ['flower2', '❀', 'Flor 2'],
  ['magic', '⋆', 'Mágico'],
] as const

type TaskPriority = 'low' | 'medium' | 'high'

type PaperType =
  | 'blank'
  | 'lined'
  | 'grid'
  | 'dotted'

type EditorTool =
  | 'text'
  | 'pen'
  | 'highlighter'
  | 'paper'
  | 'stickers'
  | 'photos'
  | 'elements'
  | 'templates'
  | 'tasks'
  | 'more'
  | null

type DrawingTool =
  | 'pen'
  | 'fineliner'
  | 'fountain'
  | 'pencil'
  | 'brush'
  | 'highlighter'
  | 'eraser'

type ElementLibraryCategory =
  | 'shapes'
  | 'arrows'
  | 'postits'
  | 'washi'
  | 'stamps'
  | null

type PaperSettings = Record<string, unknown>

type DrawingPoint = {
  x: number
  y: number
  pressure?: number
}

type DrawingStroke = {
  id: number
  tool: DrawingTool
  color: string
  width: number
  opacity: number
  points: DrawingPoint[]
}

type DrawingDraft = Omit<DrawingStroke, 'id'>

type CanvasElementDragState = {
  elementId: number
  pointerId: number
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  maxX: number
  maxY: number
  currentX: number
  currentY: number
}

type CanvasElementResizeState = {
  elementId: number
  pointerId: number
  startClientX: number
  startClientY: number
  startWidth: number
  startHeight: number
  currentWidth: number
  currentHeight: number
}

type FloatingRulerState = {
  x: number
  y: number
  width: number
  rotation: number
}

type RulerDragState = {
  pointerId: number
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  maxX: number
  maxY: number
  currentX: number
  currentY: number
}

type BlockType =
  | 'text'
  | 'heading'
  | 'checkbox'
  | 'list'

type MediaType =
  | 'image'
  | 'sticker'

type StickerCropSelection = {
  x: number
  y: number
  width: number
  height: number
}

type StickerCropDragState = {
  pointerId: number
  startX: number
  startY: number
}

type SaveStatus =
  | 'saved'
  | 'saving'
  | 'error'

type BlockData = Record<string, unknown>

type PlannerTask = {
  id: number
  text: string
  done: boolean
  dueDate: string
  priority: TaskPriority
}

type PlannerPage = {
  id: number
  title: string
  content: string
  favorite: boolean
  folderId: number | null
  position: number
  paperType: PaperType
  paperSettings: PaperSettings
  tasks: PlannerTask[]
}

type PlannerFolder = {
  id: number
  title: string
  position: number
}

type PlannerBlock = {
  id: number
  pageId: number
  blockType: BlockType
  data: BlockData
  position: number
  createdAt: string
  updatedAt: string
}

type PlannerMedia = {
  id: number
  pageId: number
  mediaType: MediaType
  originalName: string
  mimeType: string
  sizeBytes: number
  fileUrl: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  locked: boolean
  createdAt: string
}

type Agenda = {
  id: number
  title: string
  coverColor: string
}

type AgendaFromApi = {
  id: number
  title: string
  cover_color: string
  created_at: string
}

type PageFromApi = {
  id: number
  agenda_id: number
  folder_id: number | null
  position: number
  title: string
  content: string
  favorite: boolean
  paper_type: PaperType
  paper_settings: PaperSettings
  created_at: string
}

type FolderFromApi = {
  id: number
  agenda_id: number
  title: string
  position: number
  created_at: string
}

type TaskFromApi = {
  id: number
  page_id: number
  text: string
  done: boolean
  due_date: string | null
  priority: TaskPriority
  created_at: string
}

type BlockFromApi = {
  id: number
  page_id: number
  block_type: BlockType
  data: BlockData
  position: number
  created_at: string
  updated_at: string
}

type MediaFromApi = {
  id: number
  page_id: number
  media_type: MediaType
  original_name: string
  mime_type: string
  size_bytes: number
  file_url: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  z_index: number
  locked: boolean
  created_at: string
}

type MediaLibraryItem = {
  id: number
  user_id: number
  media_type: MediaType
  name: string
  mime_type: string
  size_bytes: number
  file_url: string
  kit_name: string | null
  created_at: string
}

type PageTemplateItem = {
  id: number
  user_id: number
  name: string
  created_at: string
  updated_at: string
}

type CanvasElementFromApi = {
  id: number
  user_id: number
  page_id: number | null
  surface_type: string
  surface_key: string
  element_type: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  z_index: number
  locked: boolean
  data: Record<string, unknown>
  created_at: string
  updated_at: string | null
}

type CanvasElementPatch = {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  z_index?: number
  locked?: boolean
  data?: Record<string, unknown>
}

type LibraryTypeFilter =
  | 'all'
  | MediaType

type PagePatch = {
  title?: string
  content?: string
  favorite?: boolean
  paper_type?: PaperType
  paper_settings?: PaperSettings
}

type BlockPatch = {
  block_type?: BlockType
  data?: BlockData
}

type MediaPatch = {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  z_index?: number
  locked?: boolean
}

type MediaDragState = {
  mediaId: number
  pointerId: number
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  maxX: number
  maxY: number
  zIndex: number
}

type MediaResizeState = {
  mediaId: number
  pointerId: number
  startClientX: number
  startClientY: number
  startWidth: number
  startHeight: number
  maxWidth: number
  maxHeight: number
  zIndex: number
}

type MediaRotateState = {
  mediaId: number
  pointerId: number
  centerX: number
  centerY: number
  startPointerAngle: number
  startRotation: number
  zIndex: number
}

function readSettingString(
  settings: PaperSettings,
  key: string,
  fallback: string,
) {
  const value = settings[key]
  return typeof value === 'string'
    ? value
    : fallback
}

function readSettingNumber(
  settings: PaperSettings,
  key: string,
  fallback: number,
) {
  const value = settings[key]
  return typeof value === 'number'
    && Number.isFinite(value)
    ? value
    : fallback
}

function normalizePaperSettings(
  settings: PaperSettings | undefined,
): PaperSettings {
  return {
    ...DEFAULT_PAPER_SETTINGS,
    ...(settings ?? {}),
  }
}

function hexToRgba(
  hex: string,
  opacity: number,
) {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) {
    return hex
  }

  const red = Number.parseInt(
    clean.slice(0, 2),
    16,
  )
  const green = Number.parseInt(
    clean.slice(2, 4),
    16,
  )
  const blue = Number.parseInt(
    clean.slice(4, 6),
    16,
  )

  if (
    Number.isNaN(red)
    || Number.isNaN(green)
    || Number.isNaN(blue)
  ) {
    return hex
  }

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

function getDrawingTool(
  value: unknown,
): DrawingTool | null {
  return value === 'pen'
    || value === 'fineliner'
    || value === 'fountain'
    || value === 'pencil'
    || value === 'brush'
    || value === 'highlighter'
    ? value
    : null
}

function getDrawingPoints(
  value: unknown,
): DrawingPoint[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (
        typeof item !== 'object'
        || item === null
      ) {
        return null
      }

      const x = 'x' in item
        ? item.x
        : null
      const y = 'y' in item
        ? item.y
        : null
      const pressure =
        'pressure' in item
        && typeof item.pressure === 'number'
          ? Math.max(
              0.08,
              Math.min(1, item.pressure),
            )
          : undefined

      if (
        typeof x !== 'number'
        || typeof y !== 'number'
      ) {
        return null
      }

      return {
        x,
        y,
        ...(pressure === undefined
          ? {}
          : { pressure }),
      }
    })
    .filter(
      (point): point is DrawingPoint =>
        point !== null,
    )
}

function convertDrawingElement(
  element: CanvasElementFromApi,
): DrawingStroke | null {
  const tool = getDrawingTool(
    element.data.tool,
  )

  if (
    !element.element_type.startsWith('drawing:')
    || tool === null
  ) {
    return null
  }

  const points = getDrawingPoints(
    element.data.points,
  )

  if (points.length < 2) {
    return null
  }

  return {
    id: element.id,
    tool,
    color:
      typeof element.data.color === 'string'
        ? element.data.color
        : '#2f2b28',
    width:
      typeof element.data.width === 'number'
        ? element.data.width
        : 3,
    opacity:
      typeof element.data.opacity === 'number'
        ? element.data.opacity
        : 1,
    points,
  }
}

function drawingPointsToString(
  points: DrawingPoint[],
) {
  return points
    .map(
      (point) =>
        `${point.x},${point.y}`,
    )
    .join(' ')
}

function convertBlock(
  block: BlockFromApi,
): PlannerBlock {
  return {
    id: block.id,
    pageId: block.page_id,
    blockType: block.block_type,
    data: block.data,
    position: block.position,
    createdAt: block.created_at,
    updatedAt: block.updated_at,
  }
}

function convertMedia(
  media: MediaFromApi,
): PlannerMedia {
  return {
    id: media.id,
    pageId: media.page_id,
    mediaType: media.media_type,
    originalName: media.original_name,
    mimeType: media.mime_type,
    sizeBytes: media.size_bytes,
    fileUrl: media.file_url,
    x: media.x,
    y: media.y,
    width: media.width,
    height: media.height,
    rotation: media.rotation,
    zIndex: media.z_index,
    locked: media.locked,
    createdAt: media.created_at,
  }
}

function getMediaUrl(
  fileUrl: string,
) {
  if (
    fileUrl.startsWith('http://')
    || fileUrl.startsWith('https://')
  ) {
    return fileUrl
  }

  return `${API_BASE_URL}${fileUrl}`
}

function getBlockText(
  block: PlannerBlock,
) {
  const value = block.data.text
  return typeof value === 'string'
    ? value
    : ''
}

function getBlockChecked(
  block: PlannerBlock,
) {
  return block.data.checked === true
}


function getBlockListItems(
  block: PlannerBlock,
): string[] {
  const value = block.data.items

  if (Array.isArray(value)) {
    const items = value.filter(
      (item): item is string =>
        typeof item === 'string',
    )

    return items.length > 0
      ? items
      : ['']
  }

  return [
    getBlockText(block),
  ]
}

type SortablePageRowProps = {
  page: PlannerPage
  activePageId: number | null
  isFirst: boolean
  isLast: boolean
  onSelect: (pageId: number) => void
  onMove: (
    pageId: number,
    folderId: number | null,
    direction: 'up' | 'down',
  ) => void
}

function SortablePageRow({
  page,
  activePageId,
  isFirst,
  isLast,
  onSelect,
  onMove,
}: SortablePageRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: page.id,
  })

  const style: CSSProperties = {
    transform:
      CSS.Transform.toString(
        transform,
      ),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? 'page-row dragging'
          : 'page-row'
      }
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="page-drag-handle"
        aria-label={`Arrastar página ${page.title || 'Sem título'}`}
        title="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>

      <button
        className={
          page.id === activePageId
            ? 'page-button active'
            : 'page-button'
        }
        type="button"
        onClick={() =>
          onSelect(page.id)
        }
      >
        {page.favorite && '★ '}
        {page.title || 'Sem título'}
      </button>

      <div className="page-order-actions">
        <button
          type="button"
          aria-label="Mover página para cima"
          title="Mover página para cima"
          disabled={isFirst}
          onClick={() =>
            onMove(
              page.id,
              page.folderId,
              'up',
            )
          }
        >
          ↑
        </button>

        <button
          type="button"
          aria-label="Mover página para baixo"
          title="Mover página para baixo"
          disabled={isLast}
          onClick={() =>
            onMove(
              page.id,
              page.folderId,
              'down',
            )
          }
        >
          ↓
        </button>
      </div>
    </div>
  )
}

type SortableFolderGroupProps = {
  folder: PlannerFolder
  isFirst: boolean
  isLast: boolean
  isOpen: boolean
  children: ReactNode
  onToggle: (folderId: number) => void
  onMove: (
    folderId: number,
    direction: 'up' | 'down',
  ) => void
  onRename: (
    folder: PlannerFolder,
  ) => void
  onDelete: (
    folder: PlannerFolder,
  ) => void
}

function SortableFolderGroup({
  folder,
  isFirst,
  isLast,
  isOpen,
  children,
  onToggle,
  onMove,
  onRename,
  onDelete,
}: SortableFolderGroupProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `folder-${folder.id}`,
  })

  const style: CSSProperties = {
    transform:
      CSS.Transform.toString(
        transform,
      ),
    transition,
  }

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? 'folder-group dragging'
          : 'folder-group'
      }
    >
      <div className="folder-group-header">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="folder-drag-handle"
          aria-label={`Arrastar seção ${folder.title}`}
          title="Arrastar para reordenar seção"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>

        <button
          className="folder-toggle-button"
          type="button"
          title={folder.title}
          aria-expanded={isOpen}
          onClick={() =>
            onToggle(folder.id)
          }
        >
          <span
            className="folder-chevron"
            aria-hidden="true"
          >
            {isOpen ? '⌄' : '›'}
          </span>

          <span className="folder-group-title">
            ▤ {folder.title}
          </span>
        </button>

        <div className="folder-group-actions">
          <button
            type="button"
            aria-label={`Mover seção ${folder.title} para cima`}
            title="Mover seção para cima"
            disabled={isFirst}
            onClick={() =>
              onMove(folder.id, 'up')
            }
          >
            ↑
          </button>

          <button
            type="button"
            aria-label={`Mover seção ${folder.title} para baixo`}
            title="Mover seção para baixo"
            disabled={isLast}
            onClick={() =>
              onMove(folder.id, 'down')
            }
          >
            ↓
          </button>

          <button
            type="button"
            aria-label={`Renomear seção ${folder.title}`}
            title="Renomear seção"
            onClick={() =>
              onRename(folder)
            }
          >
            ✎
          </button>

          <button
            type="button"
            aria-label={`Excluir seção ${folder.title}`}
            title="Excluir seção"
            onClick={() =>
              onDelete(folder)
            }
          >
            ×
          </button>
        </div>
      </div>

      {isOpen && children}
    </section>
  )
}

type SortableBlockProps = {
  block: PlannerBlock
  onDataChange: (
    blockId: number,
    data: BlockData,
  ) => void
  onFlush: (blockId: number) => void
  onDelete: (blockId: number) => void
}

function SortableBlock({
  block,
  onDataChange,
  onFlush,
  onDelete,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `block-${block.id}`,
  })

  const style: CSSProperties = {
    transform:
      CSS.Transform.toString(
        transform,
      ),
    transition,
  }

  const text = getBlockText(block)
  const checked = getBlockChecked(block)
  const listItems =
    getBlockListItems(block)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? 'editor-block dragging'
          : 'editor-block'
      }
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="block-drag-handle"
        aria-label="Arrastar bloco"
        title="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>

      <div className="block-content">
        {block.blockType === 'heading' && (
          <input
            className="block-heading-input"
            type="text"
            value={text}
            placeholder="Título..."
            onChange={(event) =>
              onDataChange(
                block.id,
                {
                  ...block.data,
                  text: event.target.value,
                },
              )
            }
            onBlur={() =>
              onFlush(block.id)
            }
          />
        )}

        {block.blockType === 'text' && (
          <textarea
            className="block-textarea"
            rows={3}
            value={text}
            placeholder="Escreva alguma coisa..."
            onChange={(event) =>
              onDataChange(
                block.id,
                {
                  ...block.data,
                  text: event.target.value,
                },
              )
            }
            onBlur={() =>
              onFlush(block.id)
            }
          />
        )}

        {block.blockType === 'checkbox' && (
          <label className="block-checkbox-row">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) =>
                onDataChange(
                  block.id,
                  {
                    ...block.data,
                    checked:
                      event.target.checked,
                  },
                )
              }
            />

            <input
              className={
                checked
                  ? 'block-line-input checked'
                  : 'block-line-input'
              }
              type="text"
              value={text}
              placeholder="Tarefa..."
              onChange={(event) =>
                onDataChange(
                  block.id,
                  {
                    ...block.data,
                    text: event.target.value,
                  },
                )
              }
              onBlur={() =>
                onFlush(block.id)
              }
            />
          </label>
        )}

        {block.blockType === 'list' && (
          <div className="block-list-items">
            {listItems.map(
              (item, index) => (
                <div
                  className="block-list-item"
                  key={`${block.id}-${index}`}
                >
                  <span
                    className="block-list-bullet"
                    aria-hidden="true"
                  >
                    ?
                  </span>

                  <input
                    className="block-line-input"
                    type="text"
                    value={item}
                    data-block-list={block.id}
                    data-list-index={index}
                    placeholder="Item da lista..."
                    onChange={(event) => {
                      const nextItems = [
                        ...listItems,
                      ]

                      nextItems[index] =
                        event.target.value

                      onDataChange(
                        block.id,
                        {
                          ...block.data,
                          items: nextItems,
                        },
                      )
                    }}
                    onPaste={(event) => {
                      const pastedText =
                        event.clipboardData
                          .getData('text')

                      const pastedItems =
                        pastedText
                          .split(/\r?\n/)

                      if (
                        pastedItems.length <= 1
                      ) {
                        return
                      }

                      event.preventDefault()

                      const nextItems = [
                        ...listItems,
                      ]

                      const start =
                        event.currentTarget
                          .selectionStart
                        ?? item.length

                      const end =
                        event.currentTarget
                          .selectionEnd
                        ?? start

                      pastedItems[0] =
                        item.slice(0, start)
                        + pastedItems[0]

                      pastedItems[
                        pastedItems.length - 1
                      ] =
                        pastedItems[
                          pastedItems.length - 1
                        ]
                        + item.slice(end)

                      nextItems.splice(
                        index,
                        1,
                        ...pastedItems,
                      )

                      onDataChange(
                        block.id,
                        {
                          ...block.data,
                          items: nextItems,
                        },
                      )

                      window.requestAnimationFrame(
                        () => {
                          const targetIndex =
                            index
                            + pastedItems.length
                            - 1

                          const selector =
                            `input[data-block-list="${block.id}"]`
                            + `[data-list-index="${targetIndex}"]`

                          document
                            .querySelector<HTMLInputElement>(
                              selector,
                            )
                            ?.focus()
                        },
                      )
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter'
                      ) {
                        event.preventDefault()

                        const nextItems = [
                          ...listItems,
                        ]

                        nextItems.splice(
                          index + 1,
                          0,
                          '',
                        )

                        onDataChange(
                          block.id,
                          {
                            ...block.data,
                            items: nextItems,
                          },
                        )

                        window.requestAnimationFrame(
                          () => {
                            const selector =
                              `input[data-block-list="${block.id}"]`
                              + `[data-list-index="${index + 1}"]`

                            document
                              .querySelector<HTMLInputElement>(
                                selector,
                              )
                              ?.focus()
                          },
                        )

                        return
                      }

                      if (
                        event.key === 'ArrowUp'
                        && index > 0
                      ) {
                        event.preventDefault()

                        const selector =
                          `input[data-block-list="${block.id}"]`
                          + `[data-list-index="${index - 1}"]`

                        document
                          .querySelector<HTMLInputElement>(
                            selector,
                          )
                          ?.focus()

                        return
                      }

                      if (
                        event.key === 'ArrowDown'
                        && index
                          < listItems.length - 1
                      ) {
                        event.preventDefault()

                        const selector =
                          `input[data-block-list="${block.id}"]`
                          + `[data-list-index="${index + 1}"]`

                        document
                          .querySelector<HTMLInputElement>(
                            selector,
                          )
                          ?.focus()

                        return
                      }

                      if (
                        event.key === 'Backspace'
                        && item === ''
                        && listItems.length > 1
                      ) {
                        event.preventDefault()

                        const nextItems = [
                          ...listItems,
                        ]

                        nextItems.splice(
                          index,
                          1,
                        )

                        onDataChange(
                          block.id,
                          {
                            ...block.data,
                            items: nextItems,
                          },
                        )

                        const targetIndex =
                          index > 0
                            ? index - 1
                            : 0

                        window.requestAnimationFrame(
                          () => {
                            const selector =
                              `input[data-block-list="${block.id}"]`
                              + `[data-list-index="${targetIndex}"]`

                            document
                              .querySelector<HTMLInputElement>(
                                selector,
                              )
                              ?.focus()
                          },
                        )
                      }
                    }}
                    onBlur={() =>
                      onFlush(block.id)
                    }
                  />
                </div>
              ),
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        className="block-delete-button"
        aria-label="Excluir bloco"
        title="Excluir bloco"
        onClick={() =>
          onDelete(block.id)
        }
      >
        ×
      </button>
    </div>
  )
}

function AgendaPage() {
  const { id } = useParams()
  const agendaId = Number(id)
  const [searchParams] =
    useSearchParams()

  const requestedPageParam =
    searchParams.get('page')
  const requestedPageId =
    requestedPageParam === null
      ? null
      : Number(requestedPageParam)

  const [agenda, setAgenda] =
    useState<Agenda | null>(null)
  const [pages, setPages] =
    useState<PlannerPage[]>([])
  const [folders, setFolders] =
    useState<PlannerFolder[]>([])
  const [activePageId, setActivePageId] =
    useState<number | null>(null)

  const [newTaskText, setNewTaskText] =
    useState('')
  const [newTaskDate, setNewTaskDate] =
    useState('')
  const [newTaskPriority, setNewTaskPriority] =
    useState<TaskPriority>('medium')

  const [blocks, setBlocks] =
    useState<PlannerBlock[]>([])
  const [blocksLoading, setBlocksLoading] =
    useState(false)
  const [blockLoadError, setBlockLoadError] =
    useState('')

  const [mediaItems, setMediaItems] =
    useState<PlannerMedia[]>([])
  const [mediaType, setMediaType] =
    useState<MediaType>('image')
  const [mediaUploading, setMediaUploading] =
    useState(false)
  const [mediaError, setMediaError] =
    useState('')

  const [libraryItems, setLibraryItems] =
    useState<MediaLibraryItem[]>([])
  const [libraryLoading, setLibraryLoading] =
    useState(true)
  const [libraryUploading, setLibraryUploading] =
    useState(false)
  const [libraryError, setLibraryError] =
    useState('')
  const [libraryMediaType, setLibraryMediaType] =
    useState<MediaType>('sticker')
  const [libraryName, setLibraryName] =
    useState('')
  const [libraryKit, setLibraryKit] =
    useState('')
  const [libraryTypeFilter, setLibraryTypeFilter] =
    useState<LibraryTypeFilter>('all')
  const [libraryKitFilter, setLibraryKitFilter] =
    useState('')

  const [stickerCropFile, setStickerCropFile] =
    useState<File | null>(null)
  const [stickerCropUrl, setStickerCropUrl] =
    useState('')
  const [
    stickerCropSelection,
    setStickerCropSelection,
  ] = useState<StickerCropSelection>({
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.8,
  })
  const [
    stickerCropRemoveWhite,
    setStickerCropRemoveWhite,
  ] = useState(false)
  const [stickerCropSaving, setStickerCropSaving] =
    useState(false)
  const stickerCropImageRef =
    useRef<HTMLImageElement | null>(null)
  const stickerCropDragRef =
    useRef<StickerCropDragState | null>(null)

  const [pageTemplates, setPageTemplates] =
    useState<PageTemplateItem[]>([])
  const [templatesLoading, setTemplatesLoading] =
    useState(true)
  const [templatesError, setTemplatesError] =
    useState('')
  const [templateBusyId, setTemplateBusyId] =
    useState<number | null>(null)
  const [savingTemplate, setSavingTemplate] =
    useState(false)
  const mediaDragRef =
    useRef<MediaDragState | null>(null)
  const mediaResizeRef =
    useRef<MediaResizeState | null>(null)
  const mediaRotateRef =
    useRef<MediaRotateState | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)
  const [loadError, setLoadError] =
    useState('')
  const [saveStatus, setSaveStatus] =
    useState<SaveStatus>('saved')
  const [blockSaveStatus, setBlockSaveStatus] =
    useState<SaveStatus>('saved')
  const [isDuplicatingPage, setIsDuplicatingPage] =
    useState(false)

  const [selectedMediaId, setSelectedMediaId] =
    useState<number | null>(null)

  const [isNavigationOpen, setIsNavigationOpen] =
    useState(false)
  const [activeTool, setActiveTool] =
    useState<EditorTool>(null)
  const [
    elementLibraryCategory,
    setElementLibraryCategory,
  ] = useState<ElementLibraryCategory>(null)
  const [stampColor, setStampColor] =
    useState('#9CA362')
  const [openFolderIds, setOpenFolderIds] =
    useState<number[]>([])
  const [isLoosePagesOpen, setIsLoosePagesOpen] =
    useState(false)

  const [drawingStrokes, setDrawingStrokes] =
    useState<DrawingStroke[]>([])
  const [drawingDraft, setDrawingDraft] =
    useState<DrawingDraft | null>(null)
  const [drawingMode, setDrawingMode] =
    useState<DrawingTool | null>(null)
  const [drawingColor, setDrawingColor] =
    useState('#2f2b28')
  const [drawingWidth, setDrawingWidth] =
    useState(3)
  const [drawingOpacity, setDrawingOpacity] =
    useState(1)
  const [drawingSaving, setDrawingSaving] =
    useState(false)
  const [drawingError, setDrawingError] =
    useState('')

  const [
    pageCanvasElements,
    setPageCanvasElements,
  ] = useState<CanvasElementFromApi[]>([])
  const [
    selectedCanvasElementId,
    setSelectedCanvasElementId,
  ] = useState<number | null>(null)
  const [isRulerVisible, setIsRulerVisible] =
    useState(false)
  const [floatingRuler, setFloatingRuler] =
    useState<FloatingRulerState>({
      x: 96,
      y: 110,
      width: 360,
      rotation: 0,
    })
  const canvasElementDragRef =
    useRef<CanvasElementDragState | null>(null)
  const canvasElementResizeRef =
    useRef<CanvasElementResizeState | null>(null)
  const rulerDragRef =
    useRef<RulerDragState | null>(null)
  const erasingStrokeIdsRef =
    useRef<Set<number>>(new Set())

  const pendingUpdatesRef =
    useRef<Record<number, PagePatch>>({})
  const saveTimersRef =
    useRef<
      Record<
        number,
        ReturnType<typeof setTimeout>
      >
    >({})

  const pendingBlockUpdatesRef =
    useRef<Record<number, BlockPatch>>({})
  const blockSaveTimersRef =
    useRef<
      Record<
        number,
        ReturnType<typeof setTimeout>
      >
    >({})

  const sensors = useSensors(
    useSensor(
      PointerSensor,
      {
        activationConstraint: {
          distance: 6,
        },
      },
    ),
    useSensor(
      TouchSensor,
      {
        activationConstraint: {
          delay: 180,
          tolerance: 6,
        },
      },
    ),
    useSensor(
      KeyboardSensor,
      {
        coordinateGetter:
          sortableKeyboardCoordinates,
      },
    ),
  )

  useEffect(() => {
    if (Number.isNaN(agendaId)) {
      return
    }

    let cancelled = false

    async function loadAgendaFromApi() {
      try {
        const [
          agendaData,
          pagesData,
          tasksData,
          foldersData,
        ] = await Promise.all([
          apiRequest<AgendaFromApi>(
            `/agendas/${agendaId}`,
          ),
          apiRequest<PageFromApi[]>(
            `/agendas/${agendaId}/pages`,
          ),
          apiRequest<TaskFromApi[]>(
            '/tasks',
          ),
          apiRequest<FolderFromApi[]>(
            `/agendas/${agendaId}/folders`,
          ),
        ])

        if (cancelled) {
          return
        }

        setAgenda({
          id: agendaData.id,
          title: agendaData.title,
          coverColor:
            agendaData.cover_color,
        })

        setFolders(
          foldersData.map(
            (folder) => ({
              id: folder.id,
              title: folder.title,
              position:
                folder.position,
            }),
          ),
        )

        const pageIds = new Set(
          pagesData.map(
            (page) => page.id,
          ),
        )

        const tasksByPage =
          new Map<
            number,
            PlannerTask[]
          >()

        tasksData
          .filter((task) =>
            pageIds.has(task.page_id),
          )
          .forEach((task) => {
            const currentTasks =
              tasksByPage.get(
                task.page_id,
              ) ?? []

            currentTasks.push({
              id: task.id,
              text: task.text,
              done: task.done,
              dueDate:
                task.due_date ?? '',
              priority:
                task.priority,
            })

            tasksByPage.set(
              task.page_id,
              currentTasks,
            )
          })

        const convertedPages =
          pagesData.map(
            (page): PlannerPage => ({
              id: page.id,
              title: page.title,
              content: page.content,
              favorite:
                page.favorite,
              folderId:
                page.folder_id,
              position:
                page.position,
              paperType:
                page.paper_type,
              paperSettings:
                normalizePaperSettings(
                  page.paper_settings,
                ),
              tasks:
                tasksByPage.get(
                  page.id,
                ) ?? [],
            }),
          )

        setPages(convertedPages)

        const requestedPageExists =
          requestedPageId !== null
          && !Number.isNaN(
            requestedPageId,
          )
          && convertedPages.some(
            (page) =>
              page.id ===
              requestedPageId,
          )

        setBlocksLoading(true)
        setBlockLoadError('')

        setActivePageId(
          requestedPageExists
            ? requestedPageId
            : convertedPages[0]?.id
              ?? null,
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error(error)

        if (
          error instanceof Error
        ) {
          setLoadError(
            error.message,
          )
        } else {
          setLoadError(
            'Não foi possível carregar a agenda.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadAgendaFromApi()

    return () => {
      cancelled = true
    }
  }, [
    agendaId,
    requestedPageId,
  ])

  useEffect(() => {
    if (activePageId === null) {
      return
    }

    let cancelled = false

    async function loadBlocks() {
      try {
        const data =
          await apiRequest<
            BlockFromApi[]
          >(
            `/pages/${activePageId}/blocks`,
          )

        if (cancelled) {
          return
        }

        setBlocks(
          data
            .map(convertBlock)
            .sort(
              (a, b) =>
                a.position -
                  b.position
                || a.id - b.id,
            ),
        )
        setBlockLoadError('')
        setBlockSaveStatus('saved')
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error(error)
        setBlocks([])

        if (
          error instanceof Error
        ) {
          setBlockLoadError(
            error.message,
          )
        } else {
          setBlockLoadError(
            'Não foi possível carregar os blocos.',
          )
        }
      } finally {
        if (!cancelled) {
          setBlocksLoading(false)
        }
      }
    }

    void loadBlocks()

    return () => {
      cancelled = true
    }
  }, [activePageId])

  useEffect(() => {
    if (activePageId === null) {
      return
    }

    let cancelled = false

    async function loadMedia() {
      try {
        const data =
          await apiRequest<MediaFromApi[]>(
            `/pages/${activePageId}/media`,
          )

        if (cancelled) {
          return
        }

        setMediaItems(
          data.map(convertMedia),
        )
        setSelectedMediaId(null)
        setMediaError('')
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error(error)

        if (
          error instanceof Error
        ) {
          setMediaError(
            error.message,
          )
        } else {
          setMediaError(
            'Não foi possível carregar a mídia.',
          )
        }
      }
    }

    void loadMedia()

    return () => {
      cancelled = true
    }
  }, [activePageId])

  useEffect(() => {
    if (activePageId === null) {
      return
    }

    let cancelled = false

    async function loadDrawingStrokes() {
      try {
        setDrawingError('')

        const data =
          await apiRequest<
            CanvasElementFromApi[]
          >(
            `/canvas/elements?surface_type=page&page_id=${activePageId}`,
          )

        if (cancelled) {
          return
        }

        const strokes = data
          .map(convertDrawingElement)
          .filter(
            (stroke): stroke is DrawingStroke =>
              stroke !== null,
          )

        const freeElements =
          data.filter(
            (element) =>
              !element.element_type
                .startsWith('drawing:'),
          )

        setDrawingStrokes(strokes)
        setPageCanvasElements(
          freeElements,
        )
        setSelectedCanvasElementId(
          null,
        )
        setDrawingDraft(null)
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error(error)
        setDrawingStrokes([])
        setPageCanvasElements([])
        setSelectedCanvasElementId(
          null,
        )

        if (error instanceof Error) {
          setDrawingError(error.message)
        } else {
          setDrawingError(
            'Não foi possível carregar os desenhos.',
          )
        }
      }
    }

    void loadDrawingStrokes()

    return () => {
      cancelled = true
    }
  }, [activePageId])

  useEffect(() => {
    let cancelled = false

    async function loadMediaLibrary() {
      try {
        setLibraryLoading(true)
        setLibraryError('')

        const items =
          await apiRequest<
            MediaLibraryItem[]
          >(
            '/library/media',
          )

        if (!cancelled) {
          setLibraryItems(items)
        }
      } catch (error) {
        console.error(error)

        if (!cancelled) {
          if (error instanceof Error) {
            setLibraryError(
              error.message,
            )
          } else {
            setLibraryError(
              'Não foi possível carregar a biblioteca.',
            )
          }
        }
      } finally {
        if (!cancelled) {
          setLibraryLoading(false)
        }
      }
    }

    void loadMediaLibrary()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadTemplates() {
      try {
        setTemplatesLoading(true)
        setTemplatesError('')

        const data =
          await apiRequest<
            PageTemplateItem[]
          >(
            '/templates',
          )

        if (!cancelled) {
          setPageTemplates(data)
        }
      } catch (error) {
        console.error(error)

        if (!cancelled) {
          if (error instanceof Error) {
            setTemplatesError(
              error.message,
            )
          } else {
            setTemplatesError(
              'Não foi possível carregar os templates.',
            )
          }
        }
      } finally {
        if (!cancelled) {
          setTemplatesLoading(false)
        }
      }
    }

    void loadTemplates()

    return () => {
      cancelled = true
    }
  }, [])

  const activePage =
    pages.find(
      (page) =>
        page.id === activePageId,
    )

  const sortedFolders =
    [...folders].sort(
      (a, b) =>
        a.position - b.position
        || a.id - b.id,
    )

  const sortedBlocks =
    [...blocks].sort(
      (a, b) =>
        a.position - b.position
        || a.id - b.id,
    )

  const libraryKits =
    Array.from(
      new Set(
        libraryItems
          .map(
            (item) =>
              item.kit_name,
          )
          .filter(
            (
              kitName,
            ): kitName is string =>
              Boolean(kitName),
          ),
      ),
    ).sort(
      (a, b) =>
        a.localeCompare(b),
    )

  const visibleLibraryItems =
    libraryItems.filter(
      (item) => {
        const typeMatches =
          libraryTypeFilter === 'all'
          || item.media_type
            === libraryTypeFilter

        const kitMatches =
          libraryKitFilter === ''
          || item.kit_name
            === libraryKitFilter

        return (
          typeMatches
          && kitMatches
        )
      },
    )

  function getPagesForFolder(
    folderId: number | null,
  ) {
    return pages
      .filter(
        (page) =>
          page.folderId === folderId,
      )
      .sort(
        (a, b) =>
          a.position - b.position
          || a.id - b.id,
      )
  }

  function queuePageUpdate(
    pageId: number,
    updates: PagePatch,
  ) {
    pendingUpdatesRef.current[
      pageId
    ] = {
      ...pendingUpdatesRef
        .current[pageId],
      ...updates,
    }

    const currentTimer =
      saveTimersRef.current[
        pageId
      ]

    if (currentTimer) {
      clearTimeout(currentTimer)
    }

    setSaveStatus('saving')

    saveTimersRef.current[
      pageId
    ] = setTimeout(
      () => {
        void flushPageUpdate(
          pageId,
        )
      },
      600,
    )
  }

  async function flushPageUpdate(
    pageId: number,
  ) {
    const updates =
      pendingUpdatesRef.current[
        pageId
      ]

    if (!updates) {
      return
    }

    delete pendingUpdatesRef
      .current[pageId]

    const timer =
      saveTimersRef.current[
        pageId
      ]

    if (timer) {
      clearTimeout(timer)
      delete saveTimersRef
        .current[pageId]
    }

    try {
      await apiRequest(
        `/pages/${pageId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(
            updates,
          ),
        },
      )

      if (
        !pendingUpdatesRef
          .current[pageId]
      ) {
        setSaveStatus('saved')
      }
    } catch (error) {
      console.error(error)
      setSaveStatus('error')
    }
  }

  function queueBlockUpdate(
    blockId: number,
    updates: BlockPatch,
  ) {
    pendingBlockUpdatesRef
      .current[blockId] = {
      ...pendingBlockUpdatesRef
        .current[blockId],
      ...updates,
    }

    const currentTimer =
      blockSaveTimersRef.current[
        blockId
      ]

    if (currentTimer) {
      clearTimeout(currentTimer)
    }

    setBlockSaveStatus('saving')

    blockSaveTimersRef.current[
      blockId
    ] = setTimeout(
      () => {
        void flushBlockUpdate(
          blockId,
        )
      },
      500,
    )
  }

  async function flushBlockUpdate(
    blockId: number,
  ) {
    const updates =
      pendingBlockUpdatesRef
        .current[blockId]

    if (!updates) {
      return
    }

    delete pendingBlockUpdatesRef
      .current[blockId]

    const timer =
      blockSaveTimersRef.current[
        blockId
      ]

    if (timer) {
      clearTimeout(timer)
      delete blockSaveTimersRef
        .current[blockId]
    }

    try {
      const updated =
        await apiRequest<BlockFromApi>(
          `/blocks/${blockId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(
              updates,
            ),
          },
        )

      if (
        !pendingBlockUpdatesRef
          .current[blockId]
      ) {
        setBlocks(
          (currentBlocks) =>
            currentBlocks.map(
              (block) =>
                block.id === blockId
                  ? convertBlock(
                      updated,
                    )
                  : block,
            ),
        )
        setBlockSaveStatus(
          'saved',
        )
      }
    } catch (error) {
      console.error(error)
      setBlockSaveStatus('error')
    }
  }

  async function handleCreatePage() {
    if (pages.length >= MAX_PAGES) {
      alert(
        `Uma agenda pode ter no máximo ${MAX_PAGES} páginas.`,
      )
      return
    }

    try {
      const newPage =
        await apiRequest<PageFromApi>(
          `/agendas/${agendaId}/pages`,
          {
            method: 'POST',
            body: JSON.stringify({}),
          },
        )

      const convertedPage:
        PlannerPage = {
          id: newPage.id,
          title: newPage.title,
          content:
            newPage.content,
          favorite:
            newPage.favorite,
          folderId:
            newPage.folder_id,
          position:
            newPage.position,
          paperType:
            newPage.paper_type,
          paperSettings:
            normalizePaperSettings(
              newPage.paper_settings,
            ),
          tasks: [],
        }

      setPages(
        (currentPages) => [
          ...currentPages,
          convertedPage,
        ],
      )

      setBlocksLoading(true)
      setBlockLoadError('')
      setActivePageId(
        convertedPage.id,
      )
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error
      ) {
        alert(error.message)
      }
    }
  }

  function handleChangeTitle(
    newTitle: string,
  ) {
    if (activePageId === null) {
      return
    }

    setPages(
      (currentPages) =>
        currentPages.map(
          (page) =>
            page.id === activePageId
              ? {
                  ...page,
                  title: newTitle,
                }
              : page,
        ),
    )

    if (newTitle.trim() !== '') {
      queuePageUpdate(
        activePageId,
        {
          title: newTitle,
        },
      )
    }
  }

  function handleTitleBlur() {
    if (
      !activePage
      || activePageId === null
    ) {
      return
    }

    if (
      activePage.title.trim() === ''
    ) {
      const fallbackTitle =
        'Sem título'

      setPages(
        (currentPages) =>
          currentPages.map(
            (page) =>
              page.id === activePageId
                ? {
                    ...page,
                    title:
                      fallbackTitle,
                  }
                : page,
          ),
      )

      queuePageUpdate(
        activePageId,
        {
          title: fallbackTitle,
        },
      )
    }

    void flushPageUpdate(
      activePageId,
    )
  }

  function handleChangeContent(

    newContent: string,

  ) {

    if (

      activePageId === null

    ) {

      return

    }



    setPages(

      (currentPages) =>

        currentPages.map(

          (page) =>

            page.id ===

            activePageId

              ? {

                  ...page,

                  content:

                    newContent,

                }

              : page,

        ),

    )



    queuePageUpdate(

      activePageId,

      {

        content:

          newContent,

      },

    )

  }



  function handleChangePaperType(
    newPaperType: PaperType,
  ) {
    if (activePageId === null) {
      return
    }

    setPages(
      (currentPages) =>
        currentPages.map(
          (page) =>
            page.id === activePageId
              ? {
                  ...page,
                  paperType:
                    newPaperType,
                }
              : page,
        ),
    )

    queuePageUpdate(
      activePageId,
      {
        paper_type:
          newPaperType,
      },
    )
  }

  function handleChangePaperSetting(
    key: string,
    value: unknown,
  ) {
    if (activePageId === null) {
      return
    }

    const currentSettings =
      normalizePaperSettings(
        activePage?.paperSettings,
      )

    const nextSettings = {
      ...currentSettings,
      [key]: value,
    }

    setPages(
      (currentPages) =>
        currentPages.map(
          (page) =>
            page.id === activePageId
              ? {
                  ...page,
                  paperSettings:
                    nextSettings,
                }
              : page,
        ),
    )

    queuePageUpdate(
      activePageId,
      {
        paper_settings:
          nextSettings,
      },
    )
  }

  function handleResetPaperSettings() {
    if (activePageId === null) {
      return
    }

    const nextSettings = {
      ...DEFAULT_PAPER_SETTINGS,
    }

    setPages(
      (currentPages) =>
        currentPages.map(
          (page) =>
            page.id === activePageId
              ? {
                  ...page,
                  paperType: 'blank',
                  paperSettings:
                    nextSettings,
                }
              : page,
        ),
    )

    queuePageUpdate(
      activePageId,
      {
        paper_type: 'blank',
        paper_settings:
          nextSettings,
      },
    )
  }

  async function handleToggleFavorite() {
    if (
      !activePage
      || activePageId === null
    ) {
      return
    }

    const newFavoriteValue =
      !activePage.favorite

    setPages(
      (currentPages) =>
        currentPages.map(
          (page) =>
            page.id === activePageId
              ? {
                  ...page,
                  favorite:
                    newFavoriteValue,
                }
              : page,
        ),
    )

    try {
      await apiRequest(
        `/pages/${activePageId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            favorite:
              newFavoriteValue,
          }),
        },
      )
    } catch (error) {
      console.error(error)

      setPages(
        (currentPages) =>
          currentPages.map(
            (page) =>
              page.id === activePageId
                ? {
                    ...page,
                    favorite:
                      !newFavoriteValue,
                  }
                : page,
          ),
      )

      alert(
        'Não foi possível atualizar o favorito.',
      )
    }
  }

  async function handleCreateFolder() {
    const title = window.prompt(
      'Nome da nova seção:',
    )

    if (!title?.trim()) {
      return
    }

    try {
      const folder =
        await apiRequest<FolderFromApi>(
          `/agendas/${agendaId}/folders`,
          {
            method: 'POST',
            body: JSON.stringify({
              title: title.trim(),
            }),
          },
        )

      setFolders(
        (currentFolders) => [
          ...currentFolders,
          {
            id: folder.id,
            title: folder.title,
            position:
              folder.position,
          },
        ],
      )
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error
      ) {
        alert(error.message)
      }
    }
  }

  async function handleRenameFolder(
    folder: PlannerFolder,
  ) {
    const title = window.prompt(
      'Novo nome da seção:',
      folder.title,
    )

    if (!title?.trim()) {
      return
    }

    try {
      const updatedFolder =
        await apiRequest<FolderFromApi>(
          `/folders/${folder.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              title: title.trim(),
            }),
          },
        )

      setFolders(
        (currentFolders) =>
          currentFolders.map(
            (currentFolder) =>
              currentFolder.id ===
              folder.id
                ? {
                    ...currentFolder,
                    title:
                      updatedFolder.title,
                    position:
                      updatedFolder.position,
                  }
                : currentFolder,
          ),
      )
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error
      ) {
        alert(error.message)
      }
    }
  }

  async function handleDeleteFolder(
    folder: PlannerFolder,
  ) {
    const confirmed =
      window.confirm(
        `Excluir a seção "${folder.title}"? As páginas serão mantidas em "Sem seção".`,
      )

    if (!confirmed) {
      return
    }

    try {
      await apiRequest<void>(
        `/folders/${folder.id}`,
        {
          method: 'DELETE',
        },
      )

      setFolders(
        (currentFolders) =>
          currentFolders.filter(
            (currentFolder) =>
              currentFolder.id !==
              folder.id,
          ),
      )

      setPages(
        (currentPages) =>
          currentPages.map(
            (page) =>
              page.folderId ===
              folder.id
                ? {
                    ...page,
                    folderId: null,
                  }
                : page,
          ),
      )
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error
      ) {
        alert(error.message)
      } else {
        alert(
          'Não foi possível excluir a seção.',
        )
      }
    }
  }

  async function handleMovePageToFolder(
    folderId: number | null,
  ) {
    if (activePageId === null) {
      return
    }

    try {
      const updatedPage =
        await apiRequest<PageFromApi>(
          `/pages/${activePageId}/folder`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              folder_id: folderId,
            }),
          },
        )

      setPages(
        (currentPages) =>
          currentPages.map(
            (page) =>
              page.id === activePageId
                ? {
                    ...page,
                    folderId:
                      updatedPage.folder_id,
                    position:
                      updatedPage.position,
                  }
                : page,
          ),
      )
    } catch (error) {
      console.error(error)
      alert(
        'Não foi possível mover a página.',
      )
    }
  }

  async function handleMoveFolder(
    folderId: number,
    direction: 'up' | 'down',
  ) {
    const currentFolders =
      [...sortedFolders]
    const currentIndex =
      currentFolders.findIndex(
        (folder) =>
          folder.id === folderId,
      )

    if (currentIndex === -1) {
      return
    }

    const targetIndex =
      direction === 'up'
        ? currentIndex - 1
        : currentIndex + 1

    if (
      targetIndex < 0
      || targetIndex >=
        currentFolders.length
    ) {
      return
    }

    const reordered =
      arrayMove(
        currentFolders,
        currentIndex,
        targetIndex,
      )

    try {
      const updatedFolders =
        await apiRequest<
          FolderFromApi[]
        >(
          `/agendas/${agendaId}/folders/reorder`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              folder_ids:
                reordered.map(
                  (folder) =>
                    folder.id,
                ),
            }),
          },
        )

      setFolders(
        updatedFolders.map(
          (folder) => ({
            id: folder.id,
            title: folder.title,
            position:
              folder.position,
          }),
        ),
      )
    } catch (error) {
      console.error(error)
      alert(
        'Não foi possível reordenar as seções.',
      )
    }
  }

  async function handleFolderDragEnd(
    event: DragEndEvent,
  ) {
    const { active, over } = event

    if (
      over === null
      || active.id === over.id
    ) {
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)

    const oldIndex =
      sortedFolders.findIndex(
        (folder) =>
          `folder-${folder.id}` ===
          activeId,
      )
    const newIndex =
      sortedFolders.findIndex(
        (folder) =>
          `folder-${folder.id}` ===
          overId,
      )

    if (
      oldIndex === -1
      || newIndex === -1
    ) {
      return
    }

    const reordered =
      arrayMove(
        sortedFolders,
        oldIndex,
        newIndex,
      )

    try {
      const updatedFolders =
        await apiRequest<
          FolderFromApi[]
        >(
          `/agendas/${agendaId}/folders/reorder`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              folder_ids:
                reordered.map(
                  (folder) =>
                    folder.id,
                ),
            }),
          },
        )

      setFolders(
        updatedFolders.map(
          (folder) => ({
            id: folder.id,
            title: folder.title,
            position:
              folder.position,
          }),
        ),
      )
    } catch (error) {
      console.error(error)
      alert(
        'Não foi possível reordenar a seção.',
      )
    }
  }

  async function savePageOrder(
    folderId: number | null,
    reordered: PlannerPage[],
  ) {
    const updatedPages =
      await apiRequest<
        PageFromApi[]
      >(
        `/agendas/${agendaId}/pages/reorder`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            folder_id: folderId,
            page_ids:
              reordered.map(
                (page) => page.id,
              ),
          }),
        },
      )

    const positionsById =
      new Map(
        updatedPages.map(
          (page) => [
            page.id,
            page.position,
          ],
        ),
      )

    setPages(
      (currentPages) =>
        currentPages.map(
          (page) => {
            const newPosition =
              positionsById.get(
                page.id,
              )

            if (
              newPosition === undefined
            ) {
              return page
            }

            return {
              ...page,
              position:
                newPosition,
            }
          },
        ),
    )
  }

  async function handlePageDragEnd(
    folderId: number | null,
    event: DragEndEvent,
  ) {
    const { active, over } = event

    if (
      over === null
      || active.id === over.id
    ) {
      return
    }

    const groupPages =
      getPagesForFolder(folderId)
    const oldIndex =
      groupPages.findIndex(
        (page) =>
          page.id ===
          Number(active.id),
      )
    const newIndex =
      groupPages.findIndex(
        (page) =>
          page.id ===
          Number(over.id),
      )

    if (
      oldIndex === -1
      || newIndex === -1
    ) {
      return
    }

    const reordered =
      arrayMove(
        groupPages,
        oldIndex,
        newIndex,
      )

    try {
      await savePageOrder(
        folderId,
        reordered,
      )
    } catch (error) {
      console.error(error)
      alert(
        'Não foi possível reordenar a página.',
      )
    }
  }

  async function handleMovePage(
    pageId: number,
    folderId: number | null,
    direction: 'up' | 'down',
  ) {
    const groupPages =
      getPagesForFolder(folderId)
    const currentIndex =
      groupPages.findIndex(
        (page) =>
          page.id === pageId,
      )

    if (currentIndex === -1) {
      return
    }

    const targetIndex =
      direction === 'up'
        ? currentIndex - 1
        : currentIndex + 1

    if (
      targetIndex < 0
      || targetIndex >=
        groupPages.length
    ) {
      return
    }

    const reordered =
      arrayMove(
        groupPages,
        currentIndex,
        targetIndex,
      )

    try {
      await savePageOrder(
        folderId,
        reordered,
      )
    } catch (error) {
      console.error(error)
      alert(
        'Não foi possível reordenar a página.',
      )
    }
  }

  async function handleAddTask() {
    if (
      newTaskText.trim() === ''
      || activePageId === null
    ) {
      return
    }

    try {
      const createdTask =
        await apiRequest<TaskFromApi>(
          `/pages/${activePageId}/tasks`,
          {
            method: 'POST',
            body: JSON.stringify({
              text:
                newTaskText.trim(),
              due_date:
                newTaskDate || null,
              priority:
                newTaskPriority,
            }),
          },
        )

      const convertedTask:
        PlannerTask = {
          id: createdTask.id,
          text: createdTask.text,
          done: createdTask.done,
          dueDate:
            createdTask.due_date ?? '',
          priority:
            createdTask.priority,
        }

      setPages(
        (currentPages) =>
          currentPages.map(
            (page) =>
              page.id === activePageId
                ? {
                    ...page,
                    tasks: [
                      ...page.tasks,
                      convertedTask,
                    ],
                  }
                : page,
          ),
      )

      setNewTaskText('')
      setNewTaskDate('')
      setNewTaskPriority('medium')
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error
      ) {
        alert(error.message)
      }
    }
  }

  async function handleToggleTask(
    taskId: number,
  ) {
    if (!activePage) {
      return
    }

    const task =
      activePage.tasks.find(
        (item) =>
          item.id === taskId,
      )

    if (!task) {
      return
    }

    const newDoneValue =
      !task.done

    setPages(
      (currentPages) =>
        currentPages.map(
          (page) =>
            page.id === activePageId
              ? {
                  ...page,
                  tasks:
                    page.tasks.map(
                      (currentTask) =>
                        currentTask.id ===
                        taskId
                          ? {
                              ...currentTask,
                              done:
                                newDoneValue,
                            }
                          : currentTask,
                    ),
                }
              : page,
        ),
    )

    try {
      await apiRequest(
        `/tasks/${taskId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            done: newDoneValue,
          }),
        },
      )
    } catch (error) {
      console.error(error)

      setPages(
        (currentPages) =>
          currentPages.map(
            (page) =>
              page.id === activePageId
                ? {
                    ...page,
                    tasks:
                      page.tasks.map(
                        (currentTask) =>
                          currentTask.id ===
                          taskId
                            ? {
                                ...currentTask,
                                done:
                                  !newDoneValue,
                              }
                            : currentTask,
                      ),
                  }
                : page,
          ),
      )

      alert(
        'Não foi possível atualizar a tarefa.',
      )
    }
  }

  async function handleDeleteTask(
    taskId: number,
  ) {
    if (activePageId === null) {
      return
    }

    try {
      await apiRequest<void>(
        `/tasks/${taskId}`,
        {
          method: 'DELETE',
        },
      )

      setPages(
        (currentPages) =>
          currentPages.map(
            (page) =>
              page.id === activePageId
                ? {
                    ...page,
                    tasks:
                      page.tasks.filter(
                        (task) =>
                          task.id !==
                          taskId,
                      ),
                  }
                : page,
          ),
      )
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error
      ) {
        alert(error.message)
      }
    }
  }

  function defaultBlockData(
    blockType: BlockType,
  ): BlockData {
    if (blockType === 'list') {
      return {
        items: [''],
      }
    }

    if (blockType === 'checkbox') {
      return {
        text: '',
        checked: false,
      }
    }

    return {
      text: '',
    }
  }

  function getMediaDragPosition(
    event: ReactPointerEvent<HTMLElement>,
    drag: MediaDragState,
  ) {
    const deltaX =
      event.clientX - drag.startClientX
    const deltaY =
      event.clientY - drag.startClientY

    const nextX = Math.max(
      0,
      Math.min(
        drag.startX + deltaX,
        drag.maxX,
      ),
    )

    const nextY = Math.max(
      0,
      Math.min(
        drag.startY + deltaY,
        drag.maxY,
      ),
    )

    return {
      x: Math.round(nextX),
      y: Math.round(nextY),
    }
  }

  async function persistMediaPatch(
    mediaId: number,
    patch: MediaPatch,
  ) {
    try {
      const updated =
        await apiRequest<MediaFromApi>(
          `/media/${mediaId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(patch),
          },
        )

      setMediaItems(
        (currentItems) =>
          currentItems.map(
            (item) =>
              item.id === mediaId
                ? convertMedia(updated)
                : item,
          ),
      )

      setMediaError('')
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setMediaError(error.message)
      } else {
        setMediaError(
          'Não foi possível salvar as alterações da mídia.',
        )
      }
    }
  }


  function handleBringMediaToFront(
    item: PlannerMedia,
  ) {
    const highestZ =
      mediaItems.reduce(
        (highest, currentItem) =>
          Math.max(
            highest,
            currentItem.zIndex,
          ),
        item.zIndex,
      )

    if (item.zIndex >= highestZ) {
      return
    }

    const nextZ = highestZ + 1

    setMediaItems(
      (currentItems) =>
        currentItems.map(
          (currentItem) =>
            currentItem.id === item.id
              ? {
                  ...currentItem,
                  zIndex: nextZ,
                }
              : currentItem,
        ),
    )

    void persistMediaPatch(
      item.id,
      {
        z_index: nextZ,
      },
    )
  }

  function handleSendMediaToBack(
    item: PlannerMedia,
  ) {
    const lowestZ =
      mediaItems.reduce(
        (lowest, currentItem) =>
          Math.min(
            lowest,
            currentItem.zIndex,
          ),
        item.zIndex,
      )

    if (item.zIndex <= lowestZ) {
      return
    }

    const nextZ = lowestZ - 1

    setMediaItems(
      (currentItems) =>
        currentItems.map(
          (currentItem) =>
            currentItem.id === item.id
              ? {
                  ...currentItem,
                  zIndex: nextZ,
                }
              : currentItem,
        ),
    )

    void persistMediaPatch(
      item.id,
      {
        z_index: nextZ,
      },
    )
  }

  function handleToggleMediaLocked(
    item: PlannerMedia,
  ) {
    const nextLocked = !item.locked

    setMediaItems(
      (currentItems) =>
        currentItems.map(
          (currentItem) =>
            currentItem.id === item.id
              ? {
                  ...currentItem,
                  locked: nextLocked,
                }
              : currentItem,
        ),
    )

    mediaDragRef.current = null
    mediaResizeRef.current = null
    mediaRotateRef.current = null

    void persistMediaPatch(
      item.id,
      {
        locked: nextLocked,
      },
    )
  }

  function handleMediaPointerDown(
    event: ReactPointerEvent<HTMLElement>,
    item: PlannerMedia,
  ) {
    if (
      event.button !== 0
      || item.locked
    ) {
      return
    }

    const stage =
      event.currentTarget.parentElement

    if (!stage) {
      return
    }

    const stageRect =
      stage.getBoundingClientRect()

    mediaDragRef.current = {
      mediaId: item.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: item.x,
      startY: item.y,
      maxX: Math.max(
        0,
        stageRect.width - item.width,
      ),
      maxY: Math.max(
        0,
        stageRect.height - item.height,
      ),
      zIndex: item.zIndex,
    }

    event.currentTarget.setPointerCapture(
      event.pointerId,
    )

    event.preventDefault()
  }

  function handleMediaPointerMove(
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const drag = mediaDragRef.current

    if (
      !drag
      || drag.pointerId !== event.pointerId
    ) {
      return
    }

    const position =
      getMediaDragPosition(
        event,
        drag,
      )

    setMediaItems(
      (currentItems) =>
        currentItems.map(
          (item) =>
            item.id === drag.mediaId
              ? {
                  ...item,
                  x: position.x,
                  y: position.y,
                  zIndex: drag.zIndex,
                }
              : item,
        ),
    )
  }

  function finishMediaDrag(
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const drag = mediaDragRef.current

    if (
      !drag
      || drag.pointerId !== event.pointerId
    ) {
      return
    }

    const position =
      getMediaDragPosition(
        event,
        drag,
      )

    mediaDragRef.current = null

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      )
    }

    void persistMediaPatch(
      drag.mediaId,
      {
        x: position.x,
        y: position.y,
        z_index: drag.zIndex,
      },
    )
  }

  function getMediaResizeSize(
    event: ReactPointerEvent<HTMLElement>,
    resize: MediaResizeState,
  ) {
    const deltaX =
      event.clientX - resize.startClientX
    const deltaY =
      event.clientY - resize.startClientY

    const widthScale =
      (resize.startWidth + deltaX)
      / resize.startWidth
    const heightScale =
      (resize.startHeight + deltaY)
      / resize.startHeight

    let scale =
      Math.abs(widthScale - 1)
      >= Math.abs(heightScale - 1)
        ? widthScale
        : heightScale

    const minSize = 48
    const minScale = Math.max(
      minSize / resize.startWidth,
      minSize / resize.startHeight,
    )
    const maxScale = Math.min(
      resize.maxWidth / resize.startWidth,
      resize.maxHeight / resize.startHeight,
    )
    const lowerScale =
      Math.min(
        minScale,
        maxScale,
      )

    scale = Math.max(
      lowerScale,
      Math.min(scale, maxScale),
    )

    return {
      width: Math.round(
        resize.startWidth * scale,
      ),
      height: Math.round(
        resize.startHeight * scale,
      ),
    }
  }

  function handleMediaResizePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    item: PlannerMedia,
  ) {
    if (
      event.button !== 0
      || item.locked
    ) {
      return
    }

    event.stopPropagation()

    const mediaElement =
      event.currentTarget.parentElement
    const stage =
      mediaElement?.parentElement

    if (!stage) {
      return
    }

    const stageRect =
      stage.getBoundingClientRect()

    mediaResizeRef.current = {
      mediaId: item.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: item.width,
      startHeight: item.height,
      maxWidth: Math.max(
        1,
        stageRect.width - item.x,
      ),
      maxHeight: Math.max(
        1,
        stageRect.height - item.y,
      ),
      zIndex: item.zIndex,
    }

    event.currentTarget.setPointerCapture(
      event.pointerId,
    )

    event.preventDefault()
  }

  function handleMediaResizePointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const resize =
      mediaResizeRef.current

    if (
      !resize
      || resize.pointerId
        !== event.pointerId
    ) {
      return
    }

    const size =
      getMediaResizeSize(
        event,
        resize,
      )

    setMediaItems(
      (currentItems) =>
        currentItems.map(
          (item) =>
            item.id === resize.mediaId
              ? {
                  ...item,
                  width: size.width,
                  height: size.height,
                  zIndex: resize.zIndex,
                }
              : item,
        ),
    )
  }

  function finishMediaResize(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const resize =
      mediaResizeRef.current

    if (
      !resize
      || resize.pointerId
        !== event.pointerId
    ) {
      return
    }

    const size =
      getMediaResizeSize(
        event,
        resize,
      )

    mediaResizeRef.current = null

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      )
    }

    void persistMediaPatch(
      resize.mediaId,
      {
        width: size.width,
        height: size.height,
        z_index: resize.zIndex,
      },
    )

    event.stopPropagation()
  }

  function getPointerAngle(
    clientX: number,
    clientY: number,
    centerX: number,
    centerY: number,
  ) {
    return Math.atan2(
      clientY - centerY,
      clientX - centerX,
    ) * (180 / Math.PI)
  }

  function normalizeRotation(
    rotation: number,
  ) {
    return (
      ((rotation + 180) % 360 + 360) % 360
    ) - 180
  }

  function getMediaRotation(
    event: ReactPointerEvent<HTMLElement>,
    rotate: MediaRotateState,
  ) {
    const currentPointerAngle =
      getPointerAngle(
        event.clientX,
        event.clientY,
        rotate.centerX,
        rotate.centerY,
      )

    const delta =
      normalizeRotation(
        currentPointerAngle
        - rotate.startPointerAngle,
      )

    return Math.round(
      normalizeRotation(
        rotate.startRotation + delta,
      ),
    )
  }

  function handleMediaRotatePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    item: PlannerMedia,
  ) {
    if (
      event.button !== 0
      || item.locked
    ) {
      return
    }

    event.stopPropagation()

    const mediaElement =
      event.currentTarget.parentElement
    const stage =
      mediaElement?.parentElement

    if (!stage) {
      return
    }

    const stageRect =
      stage.getBoundingClientRect()

    const centerX =
      stageRect.left
      + item.x
      + item.width / 2

    const centerY =
      stageRect.top
      + item.y
      + item.height / 2

    mediaRotateRef.current = {
      mediaId: item.id,
      pointerId: event.pointerId,
      centerX,
      centerY,
      startPointerAngle:
        getPointerAngle(
          event.clientX,
          event.clientY,
          centerX,
          centerY,
        ),
      startRotation: item.rotation,
      zIndex: item.zIndex,
    }

    event.currentTarget.setPointerCapture(
      event.pointerId,
    )

    event.preventDefault()
  }

  function handleMediaRotatePointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const rotate =
      mediaRotateRef.current

    if (
      !rotate
      || rotate.pointerId
        !== event.pointerId
    ) {
      return
    }

    const rotation =
      getMediaRotation(
        event,
        rotate,
      )

    setMediaItems(
      (currentItems) =>
        currentItems.map(
          (item) =>
            item.id === rotate.mediaId
              ? {
                  ...item,
                  rotation,
                  zIndex: rotate.zIndex,
                }
              : item,
        ),
    )
  }

  function finishMediaRotate(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const rotate =
      mediaRotateRef.current

    if (
      !rotate
      || rotate.pointerId
        !== event.pointerId
    ) {
      return
    }

    const rotation =
      getMediaRotation(
        event,
        rotate,
      )

    mediaRotateRef.current = null

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      )
    }

    void persistMediaPatch(
      rotate.mediaId,
      {
        rotation,
        z_index: rotate.zIndex,
      },
    )

    event.stopPropagation()
  }

  async function flushCurrentEditorBeforeTemplateSave() {
    if (activePageId === null) {
      return
    }

    await flushPageUpdate(
      activePageId,
    )

    for (const block of blocks) {
      if (
        pendingBlockUpdatesRef
          .current[block.id]
      ) {
        await flushBlockUpdate(
          block.id,
        )
      }
    }
  }

  function clearPendingEditorSaves(
    pageId: number,
  ) {
    const pageTimer =
      saveTimersRef.current[
        pageId
      ]

    if (pageTimer) {
      clearTimeout(pageTimer)
      delete saveTimersRef
        .current[pageId]
    }

    delete pendingUpdatesRef
      .current[pageId]

    for (const block of blocks) {
      const blockTimer =
        blockSaveTimersRef.current[
          block.id
        ]

      if (blockTimer) {
        clearTimeout(blockTimer)
        delete blockSaveTimersRef
          .current[block.id]
      }

      delete pendingBlockUpdatesRef
        .current[block.id]
    }
  }

  async function reloadEditorPageData(
    pageId: number,
  ) {
    const [
      pageData,
      blocksData,
      mediaData,
    ] = await Promise.all([
      apiRequest<PageFromApi>(
        `/pages/${pageId}`,
      ),
      apiRequest<BlockFromApi[]>(
        `/pages/${pageId}/blocks`,
      ),
      apiRequest<MediaFromApi[]>(
        `/pages/${pageId}/media`,
      ),
    ])

    setPages(
      (currentPages) =>
        currentPages.map(
          (page) =>
            page.id === pageId
              ? {
                  ...page,
                  title: pageData.title,
                  content:
                    pageData.content,
                  favorite:
                    pageData.favorite,
                  folderId:
                    pageData.folder_id,
                  position:
                    pageData.position,
                  paperType:
                    pageData.paper_type,
                  paperSettings:
                    normalizePaperSettings(
                      pageData.paper_settings,
                    ),
                }
              : page,
        ),
    )

    setBlocks(
      blocksData
        .map(convertBlock)
        .sort(
          (a, b) =>
            a.position - b.position
            || a.id - b.id,
        ),
    )

    setMediaItems(
      mediaData.map(
        convertMedia,
      ),
    )

    setSelectedMediaId(null)
    setSaveStatus('saved')
    setBlockSaveStatus('saved')
    setBlockLoadError('')
    setMediaError('')
  }

  async function handleSaveCurrentPageAsTemplate() {
    if (
      activePageId === null
      || !activePage
    ) {
      return
    }

    const suggestedName =
      activePage.title.trim()
      || 'Meu template'

    const templateName =
      window.prompt(
        'Nome do template:',
        suggestedName,
      )

    if (templateName === null) {
      return
    }

    const cleanName =
      templateName.trim()

    if (cleanName === '') {
      alert(
        'Digite um nome para o template.',
      )
      return
    }

    try {
      setSavingTemplate(true)
      setTemplatesError('')

      await flushCurrentEditorBeforeTemplateSave()

      const created =
        await apiRequest<
          PageTemplateItem
        >(
          `/pages/${activePageId}/templates`,
          {
            method: 'POST',
            body: JSON.stringify({
              name: cleanName,
            }),
          },
        )

      setPageTemplates(
        (currentTemplates) => [
          created,
          ...currentTemplates,
        ],
      )
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setTemplatesError(
          error.message,
        )
      } else {
        setTemplatesError(
          'Não foi possível salvar o template.',
        )
      }
    } finally {
      setSavingTemplate(false)
    }
  }

  async function handleRenameTemplate(
    template: PageTemplateItem,
  ) {
    const newName =
      window.prompt(
        'Novo nome do template:',
        template.name,
      )

    if (newName === null) {
      return
    }

    const cleanName =
      newName.trim()

    if (cleanName === '') {
      alert(
        'O nome não pode ficar vazio.',
      )
      return
    }

    try {
      setTemplateBusyId(
        template.id,
      )
      setTemplatesError('')

      const updated =
        await apiRequest<
          PageTemplateItem
        >(
          `/templates/${template.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              name: cleanName,
            }),
          },
        )

      setPageTemplates(
        (currentTemplates) =>
          currentTemplates.map(
            (currentTemplate) =>
              currentTemplate.id
                === template.id
                ? updated
                : currentTemplate,
          ),
      )
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setTemplatesError(
          error.message,
        )
      } else {
        setTemplatesError(
          'Não foi possível renomear o template.',
        )
      }
    } finally {
      setTemplateBusyId(null)
    }
  }

  async function handleDeleteTemplate(
    template: PageTemplateItem,
  ) {
    const confirmed =
      window.confirm(
        `Excluir o template "${template.name}"?`,
      )

    if (!confirmed) {
      return
    }

    try {
      setTemplateBusyId(
        template.id,
      )
      setTemplatesError('')

      await apiRequest<void>(
        `/templates/${template.id}`,
        {
          method: 'DELETE',
        },
      )

      setPageTemplates(
        (currentTemplates) =>
          currentTemplates.filter(
            (currentTemplate) =>
              currentTemplate.id
              !== template.id,
          ),
      )
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setTemplatesError(
          error.message,
        )
      } else {
        setTemplatesError(
          'Não foi possível excluir o template.',
        )
      }
    } finally {
      setTemplateBusyId(null)
    }
  }

  async function handleApplyTemplate(
    template: PageTemplateItem,
  ) {
    if (activePageId === null) {
      return
    }

    const confirmed =
      window.confirm(
        `Aplicar "${template.name}" nesta página? O conteúdo, os blocos e as imagens/stickers atuais serão substituídos. As tarefas da página serão mantidas.`,
      )

    if (!confirmed) {
      return
    }

    try {
      setTemplateBusyId(
        template.id,
      )
      setTemplatesError('')

      clearPendingEditorSaves(
        activePageId,
      )

      await apiRequest<PageFromApi>(
        `/pages/${activePageId}/apply-template/${template.id}`,
        {
          method: 'POST',
        },
      )

      await reloadEditorPageData(
        activePageId,
      )
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setTemplatesError(
          error.message,
        )
      } else {
        setTemplatesError(
          'Não foi possível aplicar o template.',
        )
      }
    } finally {
      setTemplateBusyId(null)
    }
  }

  async function handleCreatePageFromTemplate(
    template: PageTemplateItem,
  ) {
    if (pages.length >= MAX_PAGES) {
      alert(
        `Uma agenda pode ter no máximo ${MAX_PAGES} páginas.`,
      )
      return
    }

    try {
      setTemplateBusyId(
        template.id,
      )
      setTemplatesError('')

      const newPage =
        await apiRequest<PageFromApi>(
          `/agendas/${agendaId}/pages/from-template/${template.id}`,
          {
            method: 'POST',
          },
        )

      const convertedPage:
        PlannerPage = {
          id: newPage.id,
          title: newPage.title,
          content:
            newPage.content,
          favorite:
            newPage.favorite,
          folderId:
            newPage.folder_id,
          position:
            newPage.position,
          paperType:
            newPage.paper_type,
          paperSettings:
            normalizePaperSettings(
              newPage.paper_settings,
            ),
          tasks: [],
        }

      setPages(
        (currentPages) => [
          ...currentPages,
          convertedPage,
        ],
      )

      setBlocksLoading(true)
      setBlockLoadError('')
      setActivePageId(
        convertedPage.id,
      )
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setTemplatesError(
          error.message,
        )
      } else {
        setTemplatesError(
          'Não foi possível criar a página pelo template.',
        )
      }
    } finally {
      setTemplateBusyId(null)
    }
  }

  async function handleUploadLibraryMedia(
    file: File | undefined,
    forcedMediaType?: MediaType,
  ) {
    if (!file) {
      return
    }

    setLibraryUploading(true)
    setLibraryError('')

    try {
      const formData =
        new FormData()

      formData.append(
        'media_type',
        forcedMediaType
          ?? libraryMediaType,
      )

      if (
        libraryName.trim() !== ''
      ) {
        formData.append(
          'name',
          libraryName.trim(),
        )
      }

      if (
        libraryKit.trim() !== ''
      ) {
        formData.append(
          'kit_name',
          libraryKit.trim(),
        )
      }

      formData.append(
        'file',
        file,
      )

      const response = await fetch(
        `${API_BASE_URL}/library/media`,
        {
          method: 'POST',
          headers: {
            'X-CSRF-Token':
              getCsrfToken() ?? '',
          },
          credentials: 'include',
          body: formData,
        },
      )

      if (!response.ok) {
        let message =
          'Não foi possível salvar na biblioteca.'

        try {
          const errorBody = (
            await response.json()
          ) as {
            detail?: string
          }

          if (
            typeof errorBody.detail
            === 'string'
          ) {
            message =
              errorBody.detail
          }
        } catch {
          // Mantém a mensagem padrão.
        }

        throw new Error(message)
      }

      const created = (
        await response.json()
      ) as MediaLibraryItem

      setLibraryItems(
        (currentItems) => [
          created,
          ...currentItems,
        ],
      )

      setLibraryName('')
      setLibraryKit('')

      return true
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setLibraryError(
          error.message,
        )
      } else {
        setLibraryError(
          'Não foi possível salvar na biblioteca.',
        )
      }
    } finally {
      setLibraryUploading(false)
    }
  }


  function openStickerCrop(
    file: File | undefined,
  ) {
    if (!file) {
      return
    }

    if (stickerCropUrl) {
      URL.revokeObjectURL(
        stickerCropUrl,
      )
    }

    const url =
      URL.createObjectURL(file)

    setStickerCropFile(file)
    setStickerCropUrl(url)
    setStickerCropSelection({
      x: 0.1,
      y: 0.1,
      width: 0.8,
      height: 0.8,
    })
    setStickerCropRemoveWhite(false)
    setLibraryError('')
  }

  function closeStickerCrop() {
    if (stickerCropUrl) {
      URL.revokeObjectURL(
        stickerCropUrl,
      )
    }

    stickerCropDragRef.current = null
    setStickerCropFile(null)
    setStickerCropUrl('')
    setStickerCropRemoveWhite(false)
  }

  function handleStickerCropPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (event.button !== 0) {
      return
    }

    const rect =
      event.currentTarget
        .getBoundingClientRect()

    const x = Math.max(
      0,
      Math.min(
        1,
        (
          event.clientX
          - rect.left
        ) / rect.width,
      ),
    )
    const y = Math.max(
      0,
      Math.min(
        1,
        (
          event.clientY
          - rect.top
        ) / rect.height,
      ),
    )

    event.currentTarget
      .setPointerCapture(
        event.pointerId,
      )

    stickerCropDragRef.current = {
      pointerId: event.pointerId,
      startX: x,
      startY: y,
    }

    setStickerCropSelection({
      x,
      y,
      width: 0.02,
      height: 0.02,
    })
  }

  function handleStickerCropPointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const drag =
      stickerCropDragRef.current

    if (
      drag === null
      || drag.pointerId
        !== event.pointerId
    ) {
      return
    }

    const rect =
      event.currentTarget
        .getBoundingClientRect()

    const currentX =
      Math.max(
        0,
        Math.min(
          1,
          (
            event.clientX
            - rect.left
          ) / rect.width,
        ),
      )
    const currentY =
      Math.max(
        0,
        Math.min(
          1,
          (
            event.clientY
            - rect.top
          ) / rect.height,
        ),
      )

    const left =
      Math.min(
        drag.startX,
        currentX,
      )
    const top =
      Math.min(
        drag.startY,
        currentY,
      )

    setStickerCropSelection({
      x: left,
      y: top,
      width: Math.max(
        0.02,
        Math.abs(
          currentX
          - drag.startX,
        ),
      ),
      height: Math.max(
        0.02,
        Math.abs(
          currentY
          - drag.startY,
        ),
      ),
    })
  }

  function finishStickerCropSelection(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
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

    stickerCropDragRef.current = null
  }

  async function handleSaveStickerCrop() {
    const image =
      stickerCropImageRef.current

    if (
      !image
      || !stickerCropFile
      || image.naturalWidth <= 0
      || image.naturalHeight <= 0
    ) {
      return
    }

    const sourceX =
      Math.round(
        stickerCropSelection.x
        * image.naturalWidth,
      )
    const sourceY =
      Math.round(
        stickerCropSelection.y
        * image.naturalHeight,
      )
    const sourceWidth =
      Math.max(
        1,
        Math.round(
          stickerCropSelection.width
          * image.naturalWidth,
        ),
      )
    const sourceHeight =
      Math.max(
        1,
        Math.round(
          stickerCropSelection.height
          * image.naturalHeight,
        ),
      )

    const canvas =
      document.createElement(
        'canvas',
      )
    canvas.width = sourceWidth
    canvas.height = sourceHeight

    const context =
      canvas.getContext('2d')

    if (!context) {
      setLibraryError(
        'Não foi possível abrir o editor de recorte.',
      )
      return
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight,
    )

    if (stickerCropRemoveWhite) {
      const imageData =
        context.getImageData(
          0,
          0,
          sourceWidth,
          sourceHeight,
        )
      const pixels =
        imageData.data

      for (
        let index = 0;
        index < pixels.length;
        index += 4
      ) {
        const red =
          pixels[index]
        const green =
          pixels[index + 1]
        const blue =
          pixels[index + 2]

        const brightest =
          Math.min(
            red,
            green,
            blue,
          )

        if (brightest >= 246) {
          pixels[index + 3] = 0
        } else if (brightest >= 232) {
          const fade =
            (
              246
              - brightest
            ) / 14

          pixels[index + 3] =
            Math.round(
              pixels[index + 3]
              * fade,
            )
        }
      }

      context.putImageData(
        imageData,
        0,
        0,
      )
    }

    setStickerCropSaving(true)
    setLibraryError('')

    try {
      const blob =
        await new Promise<Blob | null>(
          (resolve) =>
            canvas.toBlob(
              resolve,
              'image/png',
              1,
            ),
        )

      if (!blob) {
        throw new Error(
          'Não foi possível gerar o sticker recortado.',
        )
      }

      const originalBase =
        stickerCropFile.name
          .replace(
            /\.[^.]+$/,
            '',
          )
          .slice(0, 80)

      const croppedFile =
        new File(
          [blob],
          `${originalBase || 'sticker'}-recortado.png`,
          {
            type: 'image/png',
          },
        )

      const saved =
        await handleUploadLibraryMedia(
          croppedFile,
          'sticker',
        )

      if (saved) {
        closeStickerCrop()
      }
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setLibraryError(
          error.message,
        )
      } else {
        setLibraryError(
          'Não foi possível salvar o recorte.',
        )
      }
    } finally {
      setStickerCropSaving(false)
    }
  }

  function renderStickerCropPanel() {
    if (!stickerCropUrl) {
      return null
    }

    return (
      <div className="tool-panel-stack">
        <button
          type="button"
          className="element-library-back"
          onClick={closeStickerCrop}
        >
          ← Stickers
        </button>

        <div className="tool-panel-intro">
          <strong>
            Recortar sticker
          </strong>
          <p>
            Arraste sobre a cartela para selecionar só o sticker que você quer.
          </p>
        </div>

        <div
          className="sticker-crop-stage"
          onPointerDown={
            handleStickerCropPointerDown
          }
          onPointerMove={
            handleStickerCropPointerMove
          }
          onPointerUp={
            finishStickerCropSelection
          }
          onPointerCancel={
            finishStickerCropSelection
          }
        >
          <img
            ref={stickerCropImageRef}
            src={stickerCropUrl}
            alt="Cartela para recorte"
            draggable={false}
          />

          <div
            className="sticker-crop-selection"
            style={{
              left:
                `${stickerCropSelection.x * 100}%`,
              top:
                `${stickerCropSelection.y * 100}%`,
              width:
                `${stickerCropSelection.width * 100}%`,
              height:
                `${stickerCropSelection.height * 100}%`,
            }}
          />
        </div>

        <label className="sticker-crop-toggle">
          <input
            type="checkbox"
            checked={
              stickerCropRemoveWhite
            }
            onChange={(event) =>
              setStickerCropRemoveWhite(
                event.target.checked,
              )
            }
          />
          <span>
            Remover fundo branco
          </span>
        </label>

        <p className="tool-helper-note">
          “Remover fundo branco” torna branco e quase branco transparentes. Funciona melhor em cartelas com fundo branco liso.
        </p>

        <button
          type="button"
          className="tool-primary-button"
          disabled={stickerCropSaving}
          onClick={() =>
            void handleSaveStickerCrop()
          }
        >
          {stickerCropSaving
            ? 'Salvando recorte...'
            : 'Salvar como sticker'}
        </button>

        <button
          type="button"
          className="tool-secondary-button"
          onClick={closeStickerCrop}
        >
          Cancelar
        </button>

        {libraryError && (
          <p className="tool-error-message">
            {libraryError}
          </p>
        )}
      </div>
    )
  }

  async function handleInsertLibraryMedia(
    item: MediaLibraryItem,
  ) {
    if (activePageId === null) {
      return
    }

    try {
      setLibraryError('')

      const created =
        await apiRequest<MediaFromApi>(
          `/pages/${activePageId}/media/from-library/${item.id}`,
          {
            method: 'POST',
          },
        )

      const converted =
        convertMedia(created)

      setMediaItems(
        (currentItems) => [
          ...currentItems,
          converted,
        ],
      )

      setSelectedMediaId(
        converted.id,
      )
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setLibraryError(
          error.message,
        )
      } else {
        setLibraryError(
          'Não foi possível inserir o item na página.',
        )
      }
    }
  }

  async function handleEditLibraryMedia(
    item: MediaLibraryItem,
  ) {
    const newName =
      window.prompt(
        'Nome do item:',
        item.name,
      )

    if (newName === null) {
      return
    }

    const cleanName =
      newName.trim()

    if (cleanName === '') {
      alert(
        'O nome não pode ficar vazio.',
      )
      return
    }

    const newKit =
      window.prompt(
        'Nome do kit (deixe vazio para remover do kit):',
        item.kit_name ?? '',
      )

    if (newKit === null) {
      return
    }

    try {
      setLibraryError('')

      const updated =
        await apiRequest<
          MediaLibraryItem
        >(
          `/library/media/${item.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              name: cleanName,
              kit_name:
                newKit.trim() === ''
                  ? null
                  : newKit.trim(),
            }),
          },
        )

      setLibraryItems(
        (currentItems) =>
          currentItems.map(
            (currentItem) =>
              currentItem.id
                === item.id
                ? updated
                : currentItem,
          ),
      )
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setLibraryError(
          error.message,
        )
      } else {
        setLibraryError(
          'Não foi possível editar o item.',
        )
      }
    }
  }

  async function handleDeleteLibraryMedia(
    item: MediaLibraryItem,
  ) {
    const confirmed =
      window.confirm(
        `Excluir "${item.name}" da biblioteca? As cópias já usadas nas páginas continuarão funcionando.`,
      )

    if (!confirmed) {
      return
    }

    try {
      setLibraryError('')

      await apiRequest<void>(
        `/library/media/${item.id}`,
        {
          method: 'DELETE',
        },
      )

      setLibraryItems(
        (currentItems) =>
          currentItems.filter(
            (currentItem) =>
              currentItem.id
              !== item.id,
          ),
      )
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setLibraryError(
          error.message,
        )
      } else {
        setLibraryError(
          'Não foi possível excluir o item.',
        )
      }
    }
  }

  async function handleUploadMedia(
    file: File | undefined,
    forcedMediaType?: MediaType,
  ) {
    if (
      !file
      || activePageId === null
    ) {
      return
    }

    setMediaUploading(true)
    setMediaError('')

    try {
      const formData =
        new FormData()

      formData.append(
        'media_type',
        forcedMediaType
          ?? mediaType,
      )
      formData.append(
        'file',
        file,
      )

      const response = await fetch(
        `${API_BASE_URL}/pages/${activePageId}/media`,
        {
          method: 'POST',
          headers: {
            'X-CSRF-Token':
              getCsrfToken() ?? '',
          },
          credentials: 'include',
          body: formData,
        },
      )

      if (!response.ok) {
        let message =
          'Não foi possível enviar o arquivo.'

        try {
          const errorBody = (
            await response.json()
          ) as {
            detail?: string
          }

          if (
            typeof errorBody.detail
            === 'string'
          ) {
            message =
              errorBody.detail
          }
        } catch {
          // Mantém a mensagem padrão.
        }

        throw new Error(message)
      }

      const created = (
        await response.json()
      ) as MediaFromApi

      setMediaItems(
        (currentItems) => [
          ...currentItems,
          convertMedia(created),
        ],
      )
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error
      ) {
        setMediaError(
          error.message,
        )
      } else {
        setMediaError(
          'Não foi possível enviar o arquivo.',
        )
      }
    } finally {
      setMediaUploading(false)
    }
  }

  async function handleDuplicateMedia(
    item: PlannerMedia,
  ) {
    try {
      const duplicated =
        await apiRequest<MediaFromApi>(
          `/media/${item.id}/duplicate`,
          {
            method: 'POST',
          },
        )

      const converted =
        convertMedia(duplicated)

      setMediaItems(
        (currentItems) => [
          ...currentItems,
          converted,
        ],
      )

      setSelectedMediaId(
        converted.id,
      )
      setMediaError('')
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setMediaError(error.message)
      } else {
        setMediaError(
          'Não foi possível duplicar a mídia.',
        )
      }
    }
  }

  async function handleDeleteMedia(
    mediaId: number,
  ) {
    try {
      await apiRequest<void>(
        `/media/${mediaId}`,
        {
          method: 'DELETE',
        },
      )

      setMediaItems(
        (currentItems) =>
          currentItems.filter(
            (item) =>
              item.id !== mediaId,
          ),
      )

      setSelectedMediaId(
        (currentSelectedId) =>
          currentSelectedId === mediaId
            ? null
            : currentSelectedId,
      )
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error
      ) {
        setMediaError(
          error.message,
        )
      } else {
        setMediaError(
          'Não foi possível excluir a mídia.',
        )
      }
    }
  }

  async function handleCreateBlock(
    blockType: BlockType,
  ) {
    if (activePageId === null) {
      return
    }

    try {
      const created =
        await apiRequest<BlockFromApi>(
          `/pages/${activePageId}/blocks`,
          {
            method: 'POST',
            body: JSON.stringify({
              block_type:
                blockType,
              data:
                defaultBlockData(
                  blockType,
                ),
            }),
          },
        )

      setBlocks(
        (currentBlocks) => [
          ...currentBlocks,
          convertBlock(created),
        ],
      )
      setBlockSaveStatus('saved')
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error
      ) {
        alert(error.message)
      } else {
        alert(
          'Não foi possível criar o bloco.',
        )
      }
    }
  }

  function handleBlockDataChange(
    blockId: number,
    data: BlockData,
  ) {
    setBlocks(
      (currentBlocks) =>
        currentBlocks.map(
          (block) =>
            block.id === blockId
              ? {
                  ...block,
                  data,
                }
              : block,
        ),
    )

    queueBlockUpdate(
      blockId,
      { data },
    )
  }

  async function handleDeleteBlock(
    blockId: number,
  ) {
    const confirmed =
      window.confirm(
        'Excluir este bloco?',
      )

    if (!confirmed) {
      return
    }

    const timer =
      blockSaveTimersRef.current[
        blockId
      ]

    if (timer) {
      clearTimeout(timer)
      delete blockSaveTimersRef
        .current[blockId]
    }

    delete pendingBlockUpdatesRef
      .current[blockId]

    try {
      await apiRequest<void>(
        `/blocks/${blockId}`,
        {
          method: 'DELETE',
        },
      )

      setBlocks(
        (currentBlocks) =>
          currentBlocks.filter(
            (block) =>
              block.id !== blockId,
          ),
      )
      setBlockSaveStatus('saved')
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error
      ) {
        alert(error.message)
      } else {
        alert(
          'Não foi possível excluir o bloco.',
        )
      }
    }
  }

  async function handleBlockDragEnd(
    event: DragEndEvent,
  ) {
    if (activePageId === null) {
      return
    }

    const { active, over } = event

    if (
      over === null
      || active.id === over.id
    ) {
      return
    }

    const activeId =
      Number(
        String(active.id).replace(
          'block-',
          '',
        ),
      )
    const overId =
      Number(
        String(over.id).replace(
          'block-',
          '',
        ),
      )

    const oldIndex =
      sortedBlocks.findIndex(
        (block) =>
          block.id === activeId,
      )
    const newIndex =
      sortedBlocks.findIndex(
        (block) =>
          block.id === overId,
      )

    if (
      oldIndex === -1
      || newIndex === -1
    ) {
      return
    }

    const reordered =
      arrayMove(
        sortedBlocks,
        oldIndex,
        newIndex,
      )

    setBlocks(
      reordered.map(
        (block, index) => ({
          ...block,
          position: index,
        }),
      ),
    )

    try {
      const updated =
        await apiRequest<
          BlockFromApi[]
        >(
          `/pages/${activePageId}/blocks/reorder`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              block_ids:
                reordered.map(
                  (block) =>
                    block.id,
                ),
            }),
          },
        )

      setBlocks(
        updated.map(convertBlock),
      )
    } catch (error) {
      console.error(error)
      setBlocks(sortedBlocks)
      alert(
        'Não foi possível reordenar os blocos.',
      )
    }
  }

  async function handleDuplicatePage() {
    if (activePageId === null) {
      return
    }

    if (pages.length >= MAX_PAGES) {
      alert(
        `Uma agenda pode ter no máximo ${MAX_PAGES} páginas.`,
      )
      return
    }

    if (isDuplicatingPage) {
      return
    }

    try {
      setIsDuplicatingPage(true)

      await flushPageUpdate(
        activePageId,
      )

      await Promise.all(
        blocks.map(
          (block) =>
            flushBlockUpdate(
              block.id,
            ),
        ),
      )

      const duplicatedPage =
        await apiRequest<PageFromApi>(
          `/pages/${activePageId}/duplicate`,
          {
            method: 'POST',
          },
        )

      const allTasks =
        await apiRequest<TaskFromApi[]>(
          '/tasks',
        )

      const duplicatedTasks =
        allTasks
          .filter(
            (task) =>
              task.page_id ===
              duplicatedPage.id,
          )
          .map(
            (task): PlannerTask => ({
              id: task.id,
              text: task.text,
              done: task.done,
              dueDate:
                task.due_date ?? '',
              priority:
                task.priority,
            }),
          )

      const convertedPage:
        PlannerPage = {
          id:
            duplicatedPage.id,
          title:
            duplicatedPage.title,
          content:
            duplicatedPage.content,
          favorite:
            duplicatedPage.favorite,
          folderId:
            duplicatedPage.folder_id,
          position:
            duplicatedPage.position,
          paperType:
            duplicatedPage.paper_type,
          paperSettings:
            normalizePaperSettings(
              duplicatedPage.paper_settings,
            ),
          tasks:
            duplicatedTasks,
        }

      setPages(
        (currentPages) => [
          ...currentPages,
          convertedPage,
        ],
      )

      setBlocks([])
      setMediaItems([])
      setSelectedMediaId(null)
      setBlocksLoading(true)
      setBlockLoadError('')
      setActivePageId(
        convertedPage.id,
      )
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error
      ) {
        alert(error.message)
      } else {
        alert(
          'Não foi possível duplicar a página.',
        )
      }
    } finally {
      setIsDuplicatingPage(false)
    }
  }

  async function handleDeletePage() {
    if (activePageId === null) {
      return
    }

    if (pages.length <= 1) {
      alert(
        'A agenda precisa ter pelo menos uma página.',
      )
      return
    }

    const confirmed =
      window.confirm(
        'Deseja realmente excluir esta página?',
      )

    if (!confirmed) {
      return
    }

    try {
      await apiRequest<void>(
        `/pages/${activePageId}`,
        {
          method: 'DELETE',
        },
      )

      const remainingPages =
        pages.filter(
          (page) =>
            page.id !== activePageId,
        )

      delete pendingUpdatesRef
        .current[activePageId]

      const timer =
        saveTimersRef.current[
          activePageId
        ]

      if (timer) {
        clearTimeout(timer)
        delete saveTimersRef
          .current[activePageId]
      }

      setPages(remainingPages)
      setBlocks([])
      setBlocksLoading(true)
      setBlockLoadError('')
      setActivePageId(
        remainingPages[0]?.id
        ?? null,
      )
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error
      ) {
        alert(error.message)
      }
    }
  }

  function handleSelectPage(
    pageId: number,
  ) {
    if (pageId === activePageId) {
      setIsNavigationOpen(false)
      return
    }

    setBlocksLoading(true)
    setBlockLoadError('')
    setActivePageId(pageId)
    setIsNavigationOpen(false)
  }

  function toggleNavigation() {
    setIsNavigationOpen(
      (current) => !current,
    )
    setActiveTool(null)
  }

  function toggleTool(
    tool: Exclude<EditorTool, null>,
  ) {
    setIsNavigationOpen(false)

    const isClosing =
      activeTool === tool

    setActiveTool(
      isClosing
        ? null
        : tool,
    )

    if (isClosing) {
      return
    }

    if (tool === 'photos') {
      setLibraryTypeFilter('image')
      setLibraryMediaType('image')
      setMediaType('image')
    }

    if (tool === 'stickers') {
      setLibraryTypeFilter('sticker')
      setLibraryMediaType('sticker')
      setMediaType('sticker')
    }

    if (tool === 'pen') {
      setDrawingMode('fineliner')
      setDrawingColor('#3f3934')
      setDrawingWidth(3)
      setDrawingOpacity(1)
    }

    if (tool === 'highlighter') {
      setDrawingMode('highlighter')
      setDrawingColor(
        HIGHLIGHTER_PRESETS[0],
      )
      setDrawingWidth(18)
      setDrawingOpacity(0.42)
    }

    if (tool === 'elements') {
      setDrawingMode(null)
      setDrawingDraft(null)
      setElementLibraryCategory(null)
    }
  }

  function toggleFolder(
    folderId: number,
  ) {
    setOpenFolderIds(
      (current) =>
        current.includes(folderId)
          ? current.filter(
              (id) => id !== folderId,
            )
          : [
              ...current,
              folderId,
            ],
    )
  }

  function chooseDrawingStyle(
    tool: DrawingTool,
    color: string,
    width: number,
    opacity: number,
  ) {
    setDrawingMode(tool)
    setDrawingColor(color)
    setDrawingWidth(width)
    setDrawingOpacity(opacity)
    setDrawingError('')
    setActiveTool(null)
  }

  async function createPageCanvasElement(
    kind: 'shape' | 'arrow' | 'postit' | 'washi' | 'stamp',
    variant = '',
    customColor?: string,
  ) {
    if (activePageId === null) {
      return
    }

    setDrawingMode(null)
    setDrawingDraft(null)

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
          text: 'Escreva aqui...',
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
              z_index: 1,
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
      setActiveTool(null)
      setElementLibraryCategory(null)
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

  async function patchPageCanvasElement(
    elementId: number,
    patch: CanvasElementPatch,
  ) {
    try {
      const updated =
        await apiRequest<
          CanvasElementFromApi
        >(
          `/canvas/elements/${elementId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(patch),
          },
        )

      setPageCanvasElements(
        (current) =>
          current.map(
            (element) =>
              element.id === elementId
                ? updated
                : element,
          ),
      )
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setDrawingError(error.message)
      } else {
        setDrawingError(
          'Não foi possível atualizar o elemento.',
        )
      }
    }
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
          + event.clientX
          - drag.startClientX,
      ),
    )
    const nextY = Math.max(
      0,
      Math.min(
        drag.maxY,
        drag.startY
          + event.clientY
          - drag.startClientY,
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

    const nextWidth = Math.max(
      56,
      resize.startWidth
        + event.clientX
        - resize.startClientX,
    )
    const nextHeight = Math.max(
      42,
      resize.startHeight
        + event.clientY
        - resize.startClientY,
    )

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
      const duplicated =
        await apiRequest<
          CanvasElementFromApi
        >(
          `/canvas/elements/${elementId}/duplicate`,
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
      await apiRequest<void>(
        `/canvas/elements/${elementId}`,
        { method: 'DELETE' },
      )

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

  function showFloatingRuler() {
    setDrawingMode(null)
    setDrawingDraft(null)
    setIsRulerVisible(true)
    setSelectedCanvasElementId(null)
    setActiveTool(null)
  }

  function handleRulerPointerDown(
    event: ReactPointerEvent<HTMLElement>,
  ) {
    if (event.button !== 0) {
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

    rulerDragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: floatingRuler.x,
      startY: floatingRuler.y,
      maxX: Math.max(
        0,
        layer.clientWidth
          - floatingRuler.width,
      ),
      maxY: Math.max(
        0,
        layer.clientHeight - 58,
      ),
      currentX: floatingRuler.x,
      currentY: floatingRuler.y,
    }
  }

  function handleRulerPointerMove(
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const drag = rulerDragRef.current

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
          + event.clientX
          - drag.startClientX,
      ),
    )
    const nextY = Math.max(
      0,
      Math.min(
        drag.maxY,
        drag.startY
          + event.clientY
          - drag.startClientY,
      ),
    )

    drag.currentX = nextX
    drag.currentY = nextY

    setFloatingRuler(
      (current) => ({
        ...current,
        x: nextX,
        y: nextY,
      }),
    )
  }

  function finishRulerDrag(
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const drag = rulerDragRef.current

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

    rulerDragRef.current = null
  }

  function getDrawingPoint(
    event: ReactPointerEvent<HTMLDivElement>,
  ): DrawingPoint {
    const rect =
      event.currentTarget
        .getBoundingClientRect()

    const rawPressure =
      event.pointerType === 'mouse'
        ? 0.5
        : event.pressure > 0
          ? event.pressure
          : 0.5

    return {
      x: Math.max(
        0,
        event.clientX - rect.left,
      ),
      y: Math.max(
        0,
        event.clientY - rect.top,
      ),
      pressure: Math.max(
        0.08,
        Math.min(1, rawPressure),
      ),
    }
  }

  function distanceFromPointToSegment(
    point: DrawingPoint,
    start: DrawingPoint,
    end: DrawingPoint,
  ) {
    const dx = end.x - start.x
    const dy = end.y - start.y

    if (dx === 0 && dy === 0) {
      return Math.hypot(
        point.x - start.x,
        point.y - start.y,
      )
    }

    const lengthSquared =
      dx * dx + dy * dy

    const t = Math.max(
      0,
      Math.min(
        1,
        (
          (point.x - start.x) * dx
          + (point.y - start.y) * dy
        ) / lengthSquared,
      ),
    )

    const closestX =
      start.x + t * dx
    const closestY =
      start.y + t * dy

    return Math.hypot(
      point.x - closestX,
      point.y - closestY,
    )
  }

  async function eraseDrawingAtPoint(
    point: DrawingPoint,
  ) {
    const radius =
      Math.max(10, drawingWidth * 0.72)

    const target =
      [...drawingStrokes]
        .reverse()
        .find((stroke) => {
          for (
            let index = 1;
            index < stroke.points.length;
            index += 1
          ) {
            const start =
              stroke.points[index - 1]
            const end =
              stroke.points[index]

            if (
              distanceFromPointToSegment(
                point,
                start,
                end,
              )
              <= radius
                + stroke.width / 2
            ) {
              return true
            }
          }

          return false
        })

    if (
      !target
      || erasingStrokeIdsRef
        .current.has(target.id)
    ) {
      return
    }

    erasingStrokeIdsRef.current.add(
      target.id,
    )

    setDrawingStrokes(
      (current) =>
        current.filter(
          (stroke) =>
            stroke.id !== target.id,
        ),
    )

    try {
      await apiRequest<void>(
        `/canvas/elements/${target.id}`,
        {
          method: 'DELETE',
        },
      )
    } catch (error) {
      console.error(error)

      setDrawingStrokes(
        (current) => [
          ...current,
          target,
        ],
      )

      if (error instanceof Error) {
        setDrawingError(error.message)
      }
    } finally {
      erasingStrokeIdsRef.current.delete(
        target.id,
      )
    }
  }

  function handleDrawingPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (
      drawingMode === null
      || event.button !== 0
    ) {
      return
    }

    event.preventDefault()
    event.currentTarget
      .setPointerCapture(
        event.pointerId,
      )

    const point =
      getDrawingPoint(event)

    if (drawingMode === 'eraser') {
      setDrawingDraft(null)
      void eraseDrawingAtPoint(point)
      return
    }

    setDrawingDraft({
      tool: drawingMode,
      color: drawingColor,
      width: drawingWidth,
      opacity: drawingOpacity,
      points: [point, point],
    })
  }

  function handleDrawingPointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (drawingMode === null) {
      return
    }

    if (
      drawingMode !== 'eraser'
      && drawingDraft === null
    ) {
      return
    }

    event.preventDefault()

    const point =
      getDrawingPoint(event)

    if (drawingMode === 'eraser') {
      void eraseDrawingAtPoint(point)
      return
    }

    setDrawingDraft(
      (current) => {
        if (current === null) {
          return null
        }

        const previous =
          current.points[
            current.points.length - 1
          ]

        if (previous) {
          const distance =
            Math.hypot(
              point.x - previous.x,
              point.y - previous.y,
            )

          if (distance < 2) {
            return current
          }
        }

        return {
          ...current,
          points: [
            ...current.points,
            point,
          ],
        }
      },
    )
  }

  async function persistDrawingDraft(
    draft: DrawingDraft,
    surfaceWidth: number,
    surfaceHeight: number,
  ) {
    if (activePageId === null) {
      return
    }

    try {
      setDrawingSaving(true)
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
                `drawing:${draft.tool}`,
              x: 0,
              y: 0,
              width: Math.max(
                1,
                surfaceWidth,
              ),
              height: Math.max(
                1,
                surfaceHeight,
              ),
              rotation: 0,
              z_index: 0,
              locked: false,
              data: {
                tool: draft.tool,
                color: draft.color,
                width: draft.width,
                opacity:
                  draft.opacity,
                points: draft.points,
              },
            }),
          },
        )

      const stroke =
        convertDrawingElement(
          created,
        )

      if (stroke !== null) {
        setDrawingStrokes(
          (current) => [
            ...current,
            stroke,
          ],
        )
      }
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setDrawingError(
          error.message,
        )
      } else {
        setDrawingError(
          'Não foi possível salvar o traço.',
        )
      }
    } finally {
      setDrawingSaving(false)
    }
  }

  function finishDrawing(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
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

    if (drawingMode === 'eraser') {
      setDrawingDraft(null)
      return
    }

    if (drawingDraft === null) {
      return
    }

    const draft = drawingDraft
    setDrawingDraft(null)

    if (draft.points.length < 2) {
      return
    }

    void persistDrawingDraft(
      draft,
      event.currentTarget.clientWidth,
      event.currentTarget.clientHeight,
    )
  }

  async function handleUndoLastDrawing() {
    const lastStroke =
      drawingStrokes[
        drawingStrokes.length - 1
      ]

    if (!lastStroke) {
      return
    }

    try {
      await apiRequest<void>(
        `/canvas/elements/${lastStroke.id}`,
        {
          method: 'DELETE',
        },
      )

      setDrawingStrokes(
        (current) =>
          current.filter(
            (stroke) =>
              stroke.id !==
              lastStroke.id,
          ),
      )
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setDrawingError(
          error.message,
        )
      }
    }
  }

  async function handleClearDrawings() {
    if (drawingStrokes.length === 0) {
      return
    }

    const confirmed =
      window.confirm(
        'Apagar todos os traços desta página?',
      )

    if (!confirmed) {
      return
    }

    try {
      await Promise.all(
        drawingStrokes.map(
          (stroke) =>
            apiRequest<void>(
              `/canvas/elements/${stroke.id}`,
              {
                method: 'DELETE',
              },
            ),
        ),
      )

      setDrawingStrokes([])
      setDrawingDraft(null)
    } catch (error) {
      console.error(error)

      if (error instanceof Error) {
        setDrawingError(
          error.message,
        )
      }
    }
  }

  const paperSettings =
    normalizePaperSettings(
      activePage?.paperSettings,
    )

  const paperBackgroundColor =
    readSettingString(
      paperSettings,
      'backgroundColor',
      '#fffdf8',
    )

  const paperLineColor =
    readSettingString(
      paperSettings,
      'lineColor',
      '#d8d1ca',
    )

  const paperSpacing =
    Math.max(
      8,
      Math.min(
        80,
        readSettingNumber(
          paperSettings,
          'spacing',
          28,
        ),
      ),
    )

  const paperOpacity =
    Math.max(
      0.08,
      Math.min(
        1,
        readSettingNumber(
          paperSettings,
          'opacity',
          0.72,
        ),
      ),
    )

  const paperMargin =
    Math.max(
      16,
      Math.min(
        120,
        readSettingNumber(
          paperSettings,
          'margin',
          56,
        ),
      ),
    )

  const paperOrientation =
    readSettingString(
      paperSettings,
      'orientation',
      'portrait',
    )

  const paperSize =
    readSettingString(
      paperSettings,
      'size',
      'a4',
    )

  let sheetWidth = 820
  let sheetHeight = 1160

  if (paperSize === 'a5') {
    sheetWidth = 680
    sheetHeight = 962
  } else if (paperSize === 'letter') {
    sheetWidth = 800
    sheetHeight = 1035
  } else if (paperSize === 'custom') {
    sheetWidth = Math.max(
      420,
      Math.min(
        1400,
        readSettingNumber(
          paperSettings,
          'customWidth',
          820,
        ),
      ),
    )
    sheetHeight = Math.max(
      520,
      Math.min(
        1800,
        readSettingNumber(
          paperSettings,
          'customHeight',
          1160,
        ),
      ),
    )
  }

  if (paperOrientation === 'landscape') {
    const previousWidth =
      sheetWidth
    sheetWidth = sheetHeight
    sheetHeight = previousWidth
  }

  // A folha fica levemente ampliada na tela sem mudar o formato escolhido.
  sheetWidth =
    Math.round(sheetWidth * 1.08)
  sheetHeight =
    Math.round(sheetHeight * 1.08)

  const markColor =
    hexToRgba(
      paperLineColor,
      paperOpacity,
    )

  let backgroundImage = 'none'
  let backgroundSize = 'auto'

  if (activePage?.paperType === 'lined') {
    backgroundImage =
      `repeating-linear-gradient(to bottom, transparent 0, transparent ${paperSpacing - 1}px, ${markColor} ${paperSpacing - 1}px, ${markColor} ${paperSpacing}px)`
    backgroundSize =
      `100% ${paperSpacing}px`
  } else if (activePage?.paperType === 'grid') {
    backgroundImage =
      `linear-gradient(to right, ${markColor} 1px, transparent 1px), linear-gradient(to bottom, ${markColor} 1px, transparent 1px)`
    backgroundSize =
      `${paperSpacing}px ${paperSpacing}px`
  } else if (activePage?.paperType === 'dotted') {
    backgroundImage =
      `radial-gradient(circle, ${markColor} 1.25px, transparent 1.5px)`
    backgroundSize =
      `${paperSpacing}px ${paperSpacing}px`
  }

  const sheetStyle: CSSProperties = {
    width: `${sheetWidth}px`,
    maxWidth: '100%',
    aspectRatio:
      `${sheetWidth} / ${sheetHeight}`,
    padding: `${paperMargin}px`,
    backgroundColor:
      paperBackgroundColor,
    backgroundImage,
    backgroundSize,
  }

  function renderFreeCanvasElementContent(
    element: CanvasElementFromApi,
  ) {
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
          {variant === 'curved'
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
          onPointerDown={(event) =>
            event.stopPropagation()
          }
          onClick={(event) =>
            event.stopPropagation()
          }
          onBlur={(event) =>
            handlePostItTextBlur(
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
        ◇
      </div>
    )
  }

  function renderCanvasElementsLayer() {
    if (
      pageCanvasElements.length === 0
      && !isRulerVisible
    ) {
      return null
    }

    return (
      <div
        className="free-canvas-layer"
        onClick={() =>
          setSelectedCanvasElementId(
            null,
          )
        }
      >
        {pageCanvasElements.map(
          (element) => {
            const isSelected =
              selectedCanvasElementId
              === element.id

            return (
              <article
                key={element.id}
                className={
                  isSelected
                    ? 'free-canvas-element is-selected'
                    : 'free-canvas-element'
                }
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.width,
                  height: element.height,
                  transform:
                    `rotate(${element.rotation}deg)`,
                  zIndex: element.z_index,
                }}
                onClick={(event) => {
                  event.stopPropagation()
                  setSelectedCanvasElementId(
                    element.id,
                  )
                }}
                onPointerDown={(event) =>
                  handleCanvasElementPointerDown(
                    event,
                    element,
                  )
                }
                onPointerMove={
                  handleCanvasElementPointerMove
                }
                onPointerUp={
                  finishCanvasElementDrag
                }
                onPointerCancel={
                  finishCanvasElementDrag
                }
              >
                {renderFreeCanvasElementContent(
                  element,
                )}

                {isSelected && (
                  <>
                    <div
                      className="canvas-element-toolbar"
                      onPointerDown={(event) =>
                        event.stopPropagation()
                      }
                    >
                      <button
                        type="button"
                        title="Duplicar"
                        aria-label="Duplicar elemento"
                        onClick={(event) => {
                          event.stopPropagation()
                          void duplicatePageCanvasElement(
                            element.id,
                          )
                        }}
                      >
                        ⧉
                      </button>

                      <button
                        type="button"
                        title="Girar 15 graus"
                        aria-label="Girar elemento"
                        onClick={(event) => {
                          event.stopPropagation()
                          rotatePageCanvasElement(
                            element,
                          )
                        }}
                      >
                        ↻
                      </button>

                      <button
                        type="button"
                        className="danger"
                        title="Excluir"
                        aria-label="Excluir elemento"
                        onClick={(event) => {
                          event.stopPropagation()
                          void deletePageCanvasElement(
                            element.id,
                          )
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <button
                      type="button"
                      className="canvas-element-resize-handle"
                      aria-label="Redimensionar elemento"
                      title="Arraste para redimensionar"
                      onPointerDown={(event) =>
                        handleCanvasElementResizeStart(
                          event,
                          element,
                        )
                      }
                      onPointerMove={
                        handleCanvasElementResizeMove
                      }
                      onPointerUp={
                        finishCanvasElementResize
                      }
                      onPointerCancel={
                        finishCanvasElementResize
                      }
                    >
                      ↘
                    </button>
                  </>
                )}
              </article>
            )
          },
        )}

        {isRulerVisible && (
          <div
            className="floating-ruler"
            style={{
              left: floatingRuler.x,
              top: floatingRuler.y,
              width: floatingRuler.width,
              transform:
                `rotate(${floatingRuler.rotation}deg)`,
            }}
            onPointerDown={
              handleRulerPointerDown
            }
            onPointerMove={
              handleRulerPointerMove
            }
            onPointerUp={finishRulerDrag}
            onPointerCancel={
              finishRulerDrag
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="floating-ruler-controls">
              <button
                type="button"
                title="Girar para a esquerda"
                onPointerDown={(event) =>
                  event.stopPropagation()
                }
                onClick={(event) => {
                  event.stopPropagation()
                  setFloatingRuler(
                    (current) => ({
                      ...current,
                      rotation:
                        current.rotation - 15,
                    }),
                  )
                }}
              >
                ↺
              </button>
              <button
                type="button"
                title="Girar para a direita"
                onPointerDown={(event) =>
                  event.stopPropagation()
                }
                onClick={(event) => {
                  event.stopPropagation()
                  setFloatingRuler(
                    (current) => ({
                      ...current,
                      rotation:
                        current.rotation + 15,
                    }),
                  )
                }}
              >
                ↻
              </button>
              <button
                type="button"
                title="Diminuir régua"
                onPointerDown={(event) =>
                  event.stopPropagation()
                }
                onClick={(event) => {
                  event.stopPropagation()
                  setFloatingRuler(
                    (current) => ({
                      ...current,
                      width: Math.max(
                        220,
                        current.width - 40,
                      ),
                    }),
                  )
                }}
              >
                −
              </button>
              <button
                type="button"
                title="Aumentar régua"
                onPointerDown={(event) =>
                  event.stopPropagation()
                }
                onClick={(event) => {
                  event.stopPropagation()
                  setFloatingRuler(
                    (current) => ({
                      ...current,
                      width: Math.min(
                        620,
                        current.width + 40,
                      ),
                    }),
                  )
                }}
              >
                ＋
              </button>
              <button
                type="button"
                title="Fechar régua"
                onPointerDown={(event) =>
                  event.stopPropagation()
                }
                onClick={(event) => {
                  event.stopPropagation()
                  setIsRulerVisible(false)
                }}
              >
                ×
              </button>
            </div>

            <div
              className="floating-ruler-scale"
              aria-hidden="true"
            >
              {Array.from(
                { length: 21 },
                (_, index) => (
                  <span
                    key={index}
                    className={
                      index % 5 === 0
                        ? 'major'
                        : ''
                    }
                    style={{
                      left:
                        `${(index / 20) * 100}%`,
                    }}
                  >
                    {index % 5 === 0
                      ? index
                      : ''}
                  </span>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderStrokePath(
    stroke: DrawingDraft | DrawingStroke,
    keyPrefix: string,
    extraClass = '',
  ): ReactNode {
    const className =
      stroke.tool === 'highlighter'
        ? `drawing-stroke highlighter-stroke ${extraClass}`.trim()
        : `drawing-stroke ${stroke.tool}-stroke ${extraClass}`.trim()

    if (
      stroke.tool !== 'brush'
      && stroke.tool !== 'fountain'
    ) {
      return (
        <polyline
          key={keyPrefix}
          className={className}
          points={
            drawingPointsToString(
              stroke.points,
            )
          }
          fill="none"
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeOpacity={stroke.opacity}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    }

    const segmentCount =
      stroke.points.length - 1

    return (
      <g
        key={keyPrefix}
        className={className}
        opacity={stroke.opacity}
      >
        {stroke.points
          .slice(1)
          .map((point, index) => {
            const previous =
              stroke.points[index]
            const pressure =
              (
                (previous.pressure ?? 0.5)
                + (point.pressure ?? 0.5)
              ) / 2
            const progress =
              segmentCount <= 1
                ? 0.5
                : (index + 0.5)
                  / segmentCount

            const variableWidth =
              stroke.tool === 'brush'
                ? stroke.width
                  * (
                    0.45
                    + pressure * 1.25
                  )
                : stroke.width
                  * (
                    0.38
                    + 0.88
                      * Math.sin(
                        Math.PI
                        * progress,
                      )
                  )
                  * (
                    0.86
                    + pressure * 0.28
                  )

            return (
              <line
                key={`${keyPrefix}-${index}`}
                x1={previous.x}
                y1={previous.y}
                x2={point.x}
                y2={point.y}
                stroke={stroke.color}
                strokeWidth={
                  Math.max(
                    0.8,
                    variableWidth,
                  )
                }
                strokeLinecap="round"
              />
            )
          })}
      </g>
    )
  }

  function renderDrawingLayer() {
    return (
      <svg
        className="drawing-layer"
        aria-hidden="true"
      >
        {drawingStrokes.map(
          (stroke) =>
            renderStrokePath(
              stroke,
              `stroke-${stroke.id}`,
            ),
        )}

        {drawingDraft
          && drawingDraft.tool !== 'eraser'
          && renderStrokePath(
            drawingDraft,
            'drawing-draft',
            'drawing-draft',
          )}
      </svg>
    )
  }

  function renderMediaLayer() {
    if (mediaItems.length === 0) {
      return null
    }

    return (
      <div
        className="media-stage page-media-layer"
        onClick={() =>
          setSelectedMediaId(null)
        }
      >
        {mediaItems.map(
          (item) => (
            <article
              className={
                selectedMediaId === item.id
                  ? item.locked
                    ? 'media-canvas-item is-selected is-locked'
                    : 'media-canvas-item is-selected'
                  : item.locked
                    ? 'media-canvas-item is-locked'
                    : 'media-canvas-item'
              }
              key={item.id}
              style={{
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
                transform:
                  `rotate(${item.rotation}deg)`,
                zIndex: item.zIndex,
              }}
              onClick={(event) => {
                event.stopPropagation()
                setSelectedMediaId(
                  item.id,
                )
              }}
              onPointerDown={(event) => {
                setSelectedMediaId(
                  item.id,
                )
                handleMediaPointerDown(
                  event,
                  item,
                )
              }}
              onPointerMove={
                handleMediaPointerMove
              }
              onPointerUp={
                finishMediaDrag
              }
              onPointerCancel={
                finishMediaDrag
              }
            >
              <img
                src={getMediaUrl(
                  item.fileUrl,
                )}
                alt={item.originalName}
                draggable={false}
              />

              {selectedMediaId
                === item.id && (
                <>
                  <div className="media-layer-controls">
                    <button
                      className="media-layer-button"
                      type="button"
                      aria-label="Trazer para frente"
                      title="Trazer para frente"
                      onPointerDown={(event) =>
                        event.stopPropagation()
                      }
                      onClick={(event) => {
                        event.stopPropagation()
                        handleBringMediaToFront(
                          item,
                        )
                      }}
                    >
                      ↑
                    </button>

                    <button
                      className="media-layer-button"
                      type="button"
                      aria-label="Mandar para trás"
                      title="Mandar para trás"
                      onPointerDown={(event) =>
                        event.stopPropagation()
                      }
                      onClick={(event) => {
                        event.stopPropagation()
                        handleSendMediaToBack(
                          item,
                        )
                      }}
                    >
                      ↓
                    </button>
                  </div>

                  <button
                    className="media-lock-button"
                    type="button"
                    aria-label={
                      item.locked
                        ? 'Desbloquear mídia'
                        : 'Bloquear mídia'
                    }
                    title={
                      item.locked
                        ? 'Desbloquear'
                        : 'Bloquear'
                    }
                    onPointerDown={(event) =>
                      event.stopPropagation()
                    }
                    onClick={(event) => {
                      event.stopPropagation()
                      handleToggleMediaLocked(
                        item,
                      )
                    }}
                  >
                    {item.locked
                      ? '🔓'
                      : '🔒'}
                  </button>

                  <button
                    className="media-duplicate-button"
                    type="button"
                    aria-label="Duplicar mídia"
                    title="Duplicar"
                    onPointerDown={(event) =>
                      event.stopPropagation()
                    }
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleDuplicateMedia(
                        item,
                      )
                    }}
                  >
                    ⧉
                  </button>

                  {!item.locked && (
                    <>
                      <button
                        className="media-rotate-handle"
                        type="button"
                        aria-label="Girar mídia"
                        title="Arraste para girar"
                        onPointerDown={(event) =>
                          handleMediaRotatePointerDown(
                            event,
                            item,
                          )
                        }
                        onPointerMove={
                          handleMediaRotatePointerMove
                        }
                        onPointerUp={
                          finishMediaRotate
                        }
                        onPointerCancel={
                          finishMediaRotate
                        }
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        ↻
                      </button>

                      <button
                        className="media-resize-handle"
                        type="button"
                        aria-label="Redimensionar mídia"
                        title="Arraste para redimensionar"
                        onPointerDown={(event) =>
                          handleMediaResizePointerDown(
                            event,
                            item,
                          )
                        }
                        onPointerMove={
                          handleMediaResizePointerMove
                        }
                        onPointerUp={
                          finishMediaResize
                        }
                        onPointerCancel={
                          finishMediaResize
                        }
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        ↘
                      </button>
                    </>
                  )}

                  <button
                    className="media-delete-button"
                    type="button"
                    aria-label="Excluir mídia"
                    title="Excluir"
                    onPointerDown={(event) =>
                      event.stopPropagation()
                    }
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleDeleteMedia(
                        item.id,
                      )
                    }}
                  >
                    ×
                  </button>
                </>
              )}
            </article>
          ),
        )}
      </div>
    )
  }

  function renderLibraryPanel(
    kind: MediaType,
  ) {
    const isPhoto = kind === 'image'

    if (
      kind === 'sticker'
      && stickerCropUrl
    ) {
      return renderStickerCropPanel()
    }

    return (
      <div className="tool-panel-stack">
        <div className="tool-panel-intro">
          <strong>
            {isPhoto
              ? 'Suas fotos'
              : 'Seus stickers'}
          </strong>
          <p>
            Salve uma vez e reutilize em qualquer página.
          </p>
        </div>

        <label className="tool-primary-upload">
          {libraryUploading
            ? 'Salvando...'
            : isPhoto
              ? '+ Adicionar foto à biblioteca'
              : '+ Adicionar sticker à biblioteca'}

          <input
            className="media-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={libraryUploading}
            onChange={(event) => {
              const file =
                event.target.files?.[0]

              event.target.value = ''
              setLibraryMediaType(kind)
              setLibraryTypeFilter(kind)

              void handleUploadLibraryMedia(
                file,
                kind,
              )
            }}
          />
        </label>

        {!isPhoto && (
          <label className="tool-secondary-upload sticker-crop-upload">
            ✂ Recortar de uma cartela

            <input
              className="media-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file =
                  event.target.files?.[0]

                event.target.value = ''
                openStickerCrop(file)
              }}
            />
          </label>
        )}

        <div className="tool-compact-fields">
          <input
            type="text"
            placeholder="Nome opcional"
            value={libraryName}
            onChange={(event) =>
              setLibraryName(
                event.target.value,
              )
            }
          />

          <input
            type="text"
            placeholder="Coleção / kit"
            value={libraryKit}
            onChange={(event) =>
              setLibraryKit(
                event.target.value,
              )
            }
          />
        </div>

        <div className="tool-inline-actions">
          <label className="tool-secondary-upload">
            {mediaUploading
              ? 'Enviando...'
              : 'Adicionar só nesta página'}

            <input
              className="media-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={mediaUploading}
              onChange={(event) => {
                const file =
                  event.target.files?.[0]

                event.target.value = ''
                setMediaType(kind)
                void handleUploadMedia(
                  file,
                  kind,
                )
              }}
            />
          </label>
        </div>

        {libraryKits.length > 0 && (
          <label className="tool-field">
            <span>Coleção</span>
            <select
              value={libraryKitFilter}
              onChange={(event) =>
                setLibraryKitFilter(
                  event.target.value,
                )
              }
            >
              <option value="">
                Todas
              </option>
              {libraryKits.map(
                (kitName) => (
                  <option
                    key={kitName}
                    value={kitName}
                  >
                    {kitName}
                  </option>
                ),
              )}
            </select>
          </label>
        )}

        {libraryError && (
          <p className="tool-error-message">
            {libraryError}
          </p>
        )}

        {mediaError && (
          <p className="tool-error-message">
            {mediaError}
          </p>
        )}

        {libraryLoading
          ? (
            <p className="tool-empty-message">
              Carregando biblioteca...
            </p>
          )
          : visibleLibraryItems.length === 0
            ? (
              <p className="tool-empty-message">
                {isPhoto
                  ? 'Nenhuma foto salva ainda.'
                  : 'Nenhum sticker salvo ainda.'}
              </p>
            )
            : (
              <div className="tool-media-grid">
                {visibleLibraryItems.map(
                  (item) => (
                    <article
                      className="tool-media-card"
                      key={item.id}
                    >
                      <button
                        className="tool-media-preview"
                        type="button"
                        title="Inserir na folha"
                        onClick={() =>
                          void handleInsertLibraryMedia(
                            item,
                          )
                        }
                      >
                        <img
                          src={getMediaUrl(
                            item.file_url,
                          )}
                          alt={item.name}
                          draggable={false}
                        />
                      </button>

                      <div className="tool-media-card-footer">
                        <span title={item.name}>
                          {item.name}
                        </span>

                        <div>
                          <button
                            type="button"
                            title="Organizar nome e coleção"
                            onClick={() =>
                              void handleEditLibraryMedia(
                                item,
                              )
                            }
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            title="Excluir"
                            onClick={() =>
                              void handleDeleteLibraryMedia(
                                item,
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}

        {!isPhoto && (
          <p className="tool-helper-note">
            Para cartelas, use “Recortar de uma cartela”: você seleciona uma área e pode remover o fundo branco antes de salvar.
          </p>
        )}
      </div>
    )
  }

  function renderTextPanel() {
    return (
      <div className="tool-panel-stack">
        <p className="tool-panel-description">
          Adicione blocos à folha. Eles aparecem no centro e salvam automaticamente.
        </p>

        <div className="tool-action-grid">
          <button
            type="button"
            onClick={() =>
              void handleCreateBlock('text')
            }
          >
            <strong>T</strong>
            <span>Texto</span>
          </button>

          <button
            type="button"
            onClick={() =>
              void handleCreateBlock('heading')
            }
          >
            <strong>H</strong>
            <span>Título</span>
          </button>

          <button
            type="button"
            onClick={() =>
              void handleCreateBlock('checkbox')
            }
          >
            <strong>☑</strong>
            <span>Checkbox</span>
          </button>

          <button
            type="button"
            onClick={() =>
              void handleCreateBlock('list')
            }
          >
            <strong>•</strong>
            <span>Lista</span>
          </button>
        </div>
      </div>
    )
  }

  function renderPenPanel() {
    const isEraser =
      drawingMode === 'eraser'

    const penOptions = [
      {
        tool: 'fineliner' as const,
        label: 'Fineliner',
        subtitle: 'Traço uniforme',
        width: 3,
        opacity: 1,
      },
      {
        tool: 'fountain' as const,
        label: 'Tinteiro',
        subtitle: 'Pontas mais finas',
        width: 5,
        opacity: 0.96,
      },
      {
        tool: 'brush' as const,
        label: 'Brush Pen',
        subtitle: 'Pressão variável',
        width: 8,
        opacity: 0.92,
      },
      {
        tool: 'pencil' as const,
        label: 'Lápis',
        subtitle: 'Leve e macio',
        width: 2,
        opacity: 0.7,
      },
      {
        tool: 'eraser' as const,
        label: 'Borracha',
        subtitle: 'Apaga traços',
        width: 24,
        opacity: 1,
      },
    ]

    return (
      <div className="tool-panel-stack">
        <div className="pen-type-grid">
          {penOptions.map(
            (option) => (
              <button
                key={option.tool}
                type="button"
                className={
                  drawingMode === option.tool
                    ? 'pen-type-card active'
                    : 'pen-type-card'
                }
                onClick={() => {
                  setDrawingMode(
                    option.tool,
                  )
                  setDrawingWidth(
                    option.width,
                  )
                  setDrawingOpacity(
                    option.opacity,
                  )
                }}
              >
                <strong>
                  {option.tool === 'eraser'
                    ? '⌫'
                    : option.tool === 'brush'
                      ? '𝓑'
                      : option.tool === 'fountain'
                        ? '✒'
                        : option.tool === 'pencil'
                          ? '✎'
                          : '╱'}
                </strong>
                <span>
                  {option.label}
                </span>
                <small>
                  {option.subtitle}
                </small>
              </button>
            ),
          )}
        </div>

        {isEraser
          ? (
            <>
              <p className="tool-helper-note">
                A borracha remove o traço inteiro que você tocar — funciona tanto em desenhos quanto em marca-texto.
              </p>

              <label className="tool-field">
                <span>
                  Tamanho da borracha · {drawingWidth}px
                </span>
                <input
                  type="range"
                  min={10}
                  max={54}
                  value={drawingWidth}
                  onChange={(event) =>
                    setDrawingWidth(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>
            </>
          )
          : (
            <>
              <div className="tool-section-label">
                Cores
              </div>

              <div className="color-swatch-grid pen-swatches">
                {PEN_COLORS.map(
                  (color) => (
                    <button
                      key={color}
                      type="button"
                      className={
                        drawingColor === color
                          ? 'color-swatch selected'
                          : 'color-swatch'
                      }
                      style={{
                        backgroundColor: color,
                      }}
                      aria-label={`Cor ${color}`}
                      title={color}
                      onClick={() =>
                        setDrawingColor(color)
                      }
                    />
                  ),
                )}
              </div>

              <label className="tool-field tool-color-field">
                <span>Cor personalizada</span>
                <input
                  type="color"
                  value={drawingColor}
                  onChange={(event) =>
                    setDrawingColor(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label className="tool-field">
                <span>
                  Espessura · {drawingWidth}px
                </span>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={drawingWidth}
                  onChange={(event) =>
                    setDrawingWidth(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="tool-field">
                <span>
                  Opacidade · {Math.round(
                    drawingOpacity * 100,
                  )}%
                </span>
                <input
                  type="range"
                  min={0.15}
                  max={1}
                  step={0.05}
                  value={drawingOpacity}
                  onChange={(event) =>
                    setDrawingOpacity(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              {drawingMode === 'brush' && (
                <p className="tool-helper-note">
                  Brush Pen usa a pressão da caneta/tela quando o dispositivo fornece esse dado. Com mouse, usa uma pressão média.
                </p>
              )}

              {drawingMode === 'fountain' && (
                <p className="tool-helper-note">
                  Tinteiro afina o começo e o fim do traço para uma escrita mais elegante.
                </p>
              )}
            </>
          )}

        <button
          className="tool-primary-button"
          type="button"
          onClick={() =>
            chooseDrawingStyle(
              drawingMode === 'pencil'
                || drawingMode === 'brush'
                || drawingMode === 'fountain'
                || drawingMode === 'fineliner'
                || drawingMode === 'eraser'
                ? drawingMode
                : 'fineliner',
              drawingColor,
              drawingWidth,
              drawingOpacity,
            )
          }
        >
          {isEraser
            ? 'Usar borracha na folha'
            : 'Usar na folha'}
        </button>

        <div className="tool-inline-actions">
          <button
            type="button"
            disabled={drawingStrokes.length === 0}
            onClick={() =>
              void handleUndoLastDrawing()
            }
          >
            ↶ Último traço
          </button>

          <button
            type="button"
            disabled={drawingStrokes.length === 0}
            onClick={() =>
              void handleClearDrawings()
            }
          >
            Limpar
          </button>
        </div>

        {drawingError && (
          <p className="tool-error-message">
            {drawingError}
          </p>
        )}
      </div>
    )
  }

  function renderHighlighterPanel() {
    return (
      <div className="tool-panel-stack">
        <p className="tool-panel-description">
          Escolha uma cor e feche o menu. O marca-texto continua ativo sobre a folha até você encerrar.
        </p>

        <div className="tool-section-label">
          40 marca-textos
        </div>

        <div className="color-swatch-grid highlighter-swatches">
          {HIGHLIGHTER_PRESETS.map(
            (color) => (
              <button
                key={color}
                type="button"
                className={
                  drawingColor === color
                    ? 'color-swatch selected'
                    : 'color-swatch'
                }
                style={{
                  backgroundColor: color,
                }}
                aria-label={`Marca-texto ${color}`}
                title={color}
                onClick={() => {
                  setDrawingColor(color)
                  setDrawingWidth(18)
                  setDrawingOpacity(0.42)
                }}
              />
            ),
          )}
        </div>

        <label className="tool-field">
          <span>
            Espessura · {drawingWidth}px
          </span>
          <input
            type="range"
            min={8}
            max={42}
            value={drawingWidth}
            onChange={(event) =>
              setDrawingWidth(
                Number(
                  event.target.value,
                ),
              )
            }
          />
        </label>

        <label className="tool-field">
          <span>
            Opacidade · {Math.round(
              drawingOpacity * 100,
            )}%
          </span>
          <input
            type="range"
            min={0.12}
            max={0.75}
            step={0.03}
            value={drawingOpacity}
            onChange={(event) =>
              setDrawingOpacity(
                Number(
                  event.target.value,
                ),
              )
            }
          />
        </label>

        <button
          className="tool-primary-button"
          type="button"
          onClick={() =>
            chooseDrawingStyle(
              'highlighter',
              drawingColor,
              Math.max(
                8,
                drawingWidth,
              ),
              Math.min(
                0.75,
                drawingOpacity,
              ),
            )
          }
        >
          Usar marca-texto
        </button>

        <div className="tool-inline-actions">
          <button
            type="button"
            disabled={drawingStrokes.length === 0}
            onClick={() =>
              void handleUndoLastDrawing()
            }
          >
            ↶ Último traço
          </button>

          <button
            type="button"
            disabled={drawingStrokes.length === 0}
            onClick={() =>
              void handleClearDrawings()
            }
          >
            Limpar
          </button>
        </div>
      </div>
    )
  }

  function renderPaperPanel() {
    return (
      <div className="tool-panel-stack">
        <div className="paper-type-grid">
          {(
            [
              ['blank', 'Branco', '□'],
              ['lined', 'Pautado', '☰'],
              ['grid', 'Quadriculado', '▦'],
              ['dotted', 'Pontilhado', '⠿'],
            ] as const
          ).map(([type, label, icon]) => (
            <button
              key={type}
              type="button"
              className={
                activePage?.paperType === type
                  ? 'paper-type-card active'
                  : 'paper-type-card'
              }
              onClick={() =>
                handleChangePaperType(type)
              }
            >
              <strong>{icon}</strong>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="tool-two-column-fields">
          <label className="tool-field tool-color-field">
            <span>Cor do papel</span>
            <input
              type="color"
              value={paperBackgroundColor}
              onChange={(event) =>
                handleChangePaperSetting(
                  'backgroundColor',
                  event.target.value,
                )
              }
            />
          </label>

          <label className="tool-field tool-color-field">
            <span>Cor da marcação</span>
            <input
              type="color"
              value={paperLineColor}
              onChange={(event) =>
                handleChangePaperSetting(
                  'lineColor',
                  event.target.value,
                )
              }
            />
          </label>
        </div>

        <label className="tool-field">
          <span>
            Espaçamento · {paperSpacing}px
          </span>
          <input
            type="range"
            min={8}
            max={80}
            value={paperSpacing}
            onChange={(event) =>
              handleChangePaperSetting(
                'spacing',
                Number(
                  event.target.value,
                ),
              )
            }
          />
        </label>

        <label className="tool-field">
          <span>
            Opacidade · {Math.round(
              paperOpacity * 100,
            )}%
          </span>
          <input
            type="range"
            min={0.08}
            max={1}
            step={0.04}
            value={paperOpacity}
            onChange={(event) =>
              handleChangePaperSetting(
                'opacity',
                Number(
                  event.target.value,
                ),
              )
            }
          />
        </label>

        <label className="tool-field">
          <span>
            Margens · {paperMargin}px
          </span>
          <input
            type="range"
            min={16}
            max={120}
            value={paperMargin}
            onChange={(event) =>
              handleChangePaperSetting(
                'margin',
                Number(
                  event.target.value,
                ),
              )
            }
          />
        </label>

        <div className="tool-two-column-fields">
          <label className="tool-field">
            <span>Tamanho</span>
            <select
              value={paperSize}
              onChange={(event) =>
                handleChangePaperSetting(
                  'size',
                  event.target.value,
                )
              }
            >
              <option value="a4">A4</option>
              <option value="a5">A5</option>
              <option value="letter">Carta</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>

          <label className="tool-field">
            <span>Orientação</span>
            <select
              value={paperOrientation}
              onChange={(event) =>
                handleChangePaperSetting(
                  'orientation',
                  event.target.value,
                )
              }
            >
              <option value="portrait">Vertical</option>
              <option value="landscape">Horizontal</option>
            </select>
          </label>
        </div>

        {paperSize === 'custom' && (
          <div className="tool-two-column-fields">
            <label className="tool-field">
              <span>Largura</span>
              <input
                type="number"
                min={420}
                max={1400}
                value={
                  readSettingNumber(
                    paperSettings,
                    'customWidth',
                    820,
                  )
                }
                onChange={(event) =>
                  handleChangePaperSetting(
                    'customWidth',
                    Number(
                      event.target.value,
                    ),
                  )
                }
              />
            </label>

            <label className="tool-field">
              <span>Altura</span>
              <input
                type="number"
                min={520}
                max={1800}
                value={
                  readSettingNumber(
                    paperSettings,
                    'customHeight',
                    1160,
                  )
                }
                onChange={(event) =>
                  handleChangePaperSetting(
                    'customHeight',
                    Number(
                      event.target.value,
                    ),
                  )
                }
              />
            </label>
          </div>
        )}

        <button
          className="tool-secondary-button"
          type="button"
          onClick={handleResetPaperSettings}
        >
          Restaurar papel padrão
        </button>
      </div>
    )
  }

  function renderTemplatesPanel() {
    return (
      <div className="tool-panel-stack">
        <button
          className="tool-primary-button"
          type="button"
          disabled={
            savingTemplate
            || activePageId === null
          }
          onClick={() =>
            void handleSaveCurrentPageAsTemplate()
          }
        >
          {savingTemplate
            ? 'Salvando...'
            : '+ Salvar página como template'}
        </button>

        {templatesError && (
          <p className="tool-error-message">
            {templatesError}
          </p>
        )}

        {templatesLoading
          ? (
            <p className="tool-empty-message">
              Carregando templates...
            </p>
          )
          : pageTemplates.length === 0
            ? (
              <p className="tool-empty-message">
                Você ainda não salvou nenhum template.
              </p>
            )
            : (
              <div className="template-drawer-list">
                {pageTemplates.map(
                  (template) => {
                    const busy =
                      templateBusyId === template.id

                    return (
                      <article
                        className="template-drawer-card"
                        key={template.id}
                      >
                        <strong>
                          {template.name}
                        </strong>

                        <div className="template-drawer-actions">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void handleApplyTemplate(
                                template,
                              )
                            }
                          >
                            Aplicar
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            title="Criar nova página"
                            onClick={() =>
                              void handleCreatePageFromTemplate(
                                template,
                              )
                            }
                          >
                            + Página
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            title="Renomear"
                            onClick={() =>
                              void handleRenameTemplate(
                                template,
                              )
                            }
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            title="Excluir"
                            onClick={() =>
                              void handleDeleteTemplate(
                                template,
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      </article>
                    )
                  },
                )}
              </div>
            )}
      </div>
    )
  }

  function renderTasksPanel() {
    return (
      <div className="tool-panel-stack">
        <form
          className="drawer-task-form"
          onSubmit={(event) => {
            event.preventDefault()
            void handleAddTask()
          }}
        >
          <input
            type="text"
            value={newTaskText}
            placeholder="Adicionar tarefa..."
            onChange={(event) =>
              setNewTaskText(
                event.target.value,
              )
            }
          />

          <div className="tool-two-column-fields">
            <input
              type="date"
              value={newTaskDate}
              onChange={(event) =>
                setNewTaskDate(
                  event.target.value,
                )
              }
            />

            <select
              value={newTaskPriority}
              onChange={(event) => {
                const value =
                  event.target.value

                if (
                  value === 'low'
                  || value === 'medium'
                  || value === 'high'
                ) {
                  setNewTaskPriority(value)
                }
              }}
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <button
            className="tool-primary-button"
            type="submit"
          >
            Adicionar
          </button>
        </form>

        <div className="drawer-task-list">
          {activePage?.tasks.length === 0 && (
            <p className="tool-empty-message">
              Nenhuma tarefa nesta página.
            </p>
          )}

          {activePage?.tasks.map(
            (task) => (
              <article
                className="drawer-task-item"
                key={task.id}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() =>
                      void handleToggleTask(
                        task.id,
                      )
                    }
                  />

                  <span
                    className={
                      task.done
                        ? 'done'
                        : ''
                    }
                  >
                    {task.text}
                  </span>
                </label>

                <div className="drawer-task-meta">
                  <span>
                    {task.priority === 'high'
                      ? 'Alta'
                      : task.priority === 'medium'
                        ? 'Média'
                        : 'Baixa'}
                  </span>

                  {task.dueDate && (
                    <span>{task.dueDate}</span>
                  )}

                  <button
                    type="button"
                    title="Excluir"
                    onClick={() =>
                      void handleDeleteTask(
                        task.id,
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              </article>
            ),
          )}
        </div>
      </div>
    )
  }

  function renderMorePanel() {
    return (
      <div className="tool-panel-stack">
        <label className="tool-field">
          <span>Seção da página</span>
          <select
            value={activePage?.folderId ?? ''}
            onChange={(event) => {
              const value =
                event.target.value

              void handleMovePageToFolder(
                value === ''
                  ? null
                  : Number(value),
              )
            }}
          >
            <option value="">
              Sem seção
            </option>

            {folders.map(
              (folder) => (
                <option
                  key={folder.id}
                  value={folder.id}
                >
                  {folder.title}
                </option>
              ),
            )}
          </select>
        </label>

        <div className="tool-panel-list-actions">
          <button
            type="button"
            onClick={handleToggleFavorite}
          >
            {activePage?.favorite
              ? '★ Remover dos favoritos'
              : '☆ Favoritar página'}
          </button>

          <button
            type="button"
            disabled={isDuplicatingPage}
            onClick={() =>
              void handleDuplicatePage()
            }
          >
            {isDuplicatingPage
              ? 'Duplicando...'
              : '⧉ Duplicar página'}
          </button>
        </div>

        <details className="legacy-content-details">
          <summary>
            Texto simples antigo
          </summary>

          <p>
            Este campo preserva conteúdo criado antes do editor por blocos.
          </p>

          <textarea
            value={activePage?.content ?? ''}
            placeholder="Conteúdo antigo da página"
            onChange={(event) =>
              handleChangeContent(
                event.target.value,
              )
            }
            onBlur={() => {
              if (activePageId !== null) {
                void flushPageUpdate(
                  activePageId,
                )
              }
            }}
          />
        </details>

        <div className="tool-save-summary">
          <span>
            Página: {saveStatus === 'saving'
              ? 'salvando...'
              : saveStatus === 'saved'
                ? 'salva'
                : 'erro'}
          </span>
          <span>
            Blocos: {blockSaveStatus === 'saving'
              ? 'salvando...'
              : blockSaveStatus === 'saved'
                ? 'salvos'
                : 'erro'}
          </span>
        </div>

        <button
          className="tool-danger-button"
          type="button"
          onClick={handleDeletePage}
        >
          Excluir página
        </button>
      </div>
    )
  }

  function renderToolPanelContent() {
    if (activeTool === 'text') {
      return renderTextPanel()
    }
    if (activeTool === 'pen') {
      return renderPenPanel()
    }
    if (activeTool === 'highlighter') {
      return renderHighlighterPanel()
    }
    if (activeTool === 'paper') {
      return renderPaperPanel()
    }
    if (activeTool === 'stickers') {
      return renderLibraryPanel('sticker')
    }
    if (activeTool === 'photos') {
      return renderLibraryPanel('image')
    }
    if (activeTool === 'templates') {
      return renderTemplatesPanel()
    }
    if (activeTool === 'tasks') {
      return renderTasksPanel()
    }
    if (activeTool === 'more') {
      return renderMorePanel()
    }

    if (activeTool === 'elements') {
      if (elementLibraryCategory === 'shapes') {
        return (
          <div className="tool-panel-stack">
            <button
              type="button"
              className="element-library-back"
              onClick={() =>
                setElementLibraryCategory(null)
              }
            >
              ← Elementos
            </button>

            <div className="tool-panel-intro">
              <strong>Formas</strong>
              <p>
                Escolha a forma que você quer colocar na folha.
              </p>
            </div>

            <div className="element-library-grid">
              {SHAPE_OPTIONS.map(
                ([id, symbol, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      void createPageCanvasElement(
                        'shape',
                        id,
                      )
                    }
                  >
                    <strong>{symbol}</strong>
                    <span>{label}</span>
                  </button>
                ),
              )}
            </div>
          </div>
        )
      }

      if (elementLibraryCategory === 'arrows') {
        return (
          <div className="tool-panel-stack">
            <button
              type="button"
              className="element-library-back"
              onClick={() =>
                setElementLibraryCategory(null)
              }
            >
              ← Elementos
            </button>

            <div className="tool-panel-intro">
              <strong>Setas</strong>
              <p>
                Setas retas, curvas, duplas e de canto.
              </p>
            </div>

            <div className="element-library-grid">
              {ARROW_OPTIONS.map(
                ([id, symbol, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      void createPageCanvasElement(
                        'arrow',
                        id,
                      )
                    }
                  >
                    <strong>{symbol}</strong>
                    <span>{label}</span>
                  </button>
                ),
              )}
            </div>
          </div>
        )
      }

      if (elementLibraryCategory === 'postits') {
        return (
          <div className="tool-panel-stack">
            <button
              type="button"
              className="element-library-back"
              onClick={() =>
                setElementLibraryCategory(null)
              }
            >
              ← Elementos
            </button>

            <div className="tool-panel-intro">
              <strong>Post-its</strong>
              <p>
                20 estilos de post-it com cores e formatos diferentes. Insira e escreva direto na folha.
              </p>
            </div>

            <div className="element-library-grid color-element-grid">
              {POSTIT_OPTIONS.map(
                ([id, color, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      void createPageCanvasElement(
                        'postit',
                        id,
                      )
                    }
                  >
                    <span
                      className={`element-color-preview postit-preview postit-${id}`}
                      style={{
                        backgroundColor: color,
                      }}
                    />
                    <span>{label}</span>
                  </button>
                ),
              )}
            </div>
          </div>
        )
      }

      if (elementLibraryCategory === 'washi') {
        return (
          <div className="tool-panel-stack">
            <button
              type="button"
              className="element-library-back"
              onClick={() =>
                setElementLibraryCategory(null)
              }
            >
              ← Elementos
            </button>

            <div className="tool-panel-intro">
              <strong>Washi tapes</strong>
              <p>
                20 fitas decorativas com padrões diferentes, sempre usando cores sólidas.
              </p>
            </div>

            <div className="element-library-grid color-element-grid">
              {WASHI_OPTIONS.map(
                ([id, color, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      void createPageCanvasElement(
                        'washi',
                        id,
                      )
                    }
                  >
                    <span
                      className={`element-color-preview washi-preview washi-${id}`}
                      style={{
                        backgroundColor: color,
                      }}
                    />
                    <span>{label}</span>
                  </button>
                ),
              )}
            </div>
          </div>
        )
      }

      if (elementLibraryCategory === 'stamps') {
        return (
          <div className="tool-panel-stack">
            <button
              type="button"
              className="element-library-back"
              onClick={() =>
                setElementLibraryCategory(null)
              }
            >
              ← Elementos
            </button>

            <div className="tool-panel-intro">
              <strong>Carimbos</strong>
              <p>
                Escolha o desenho e a cor do carimbo antes de inserir.
              </p>
            </div>

            <div className="stamp-color-picker">
              <label>
                <span>Cor</span>
                <input
                  type="color"
                  value={stampColor}
                  onChange={(event) =>
                    setStampColor(event.target.value)
                  }
                />
              </label>

              <div className="stamp-color-swatches">
                {[
                  '#9CA362',
                  '#5BA881',
                  '#98C1E7',
                  '#B3DFE8',
                  '#E6E3F7',
                  '#FDD0D0',
                  '#FCD57D',
                  '#F0A351',
                  '#C62A29',
                  '#4B433D',
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Usar cor ${color}`}
                    className={
                      stampColor === color
                        ? 'active'
                        : ''
                    }
                    style={{
                      backgroundColor: color,
                    }}
                    onClick={() =>
                      setStampColor(color)
                    }
                  />
                ))}
              </div>
            </div>

            <div className="element-library-grid">
              {STAMP_OPTIONS.map(
                ([id, symbol, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      void createPageCanvasElement(
                        'stamp',
                        id,
                        stampColor,
                      )
                    }
                  >
                    <strong>{symbol}</strong>
                    <span>{label}</span>
                  </button>
                ),
              )}
            </div>
          </div>
        )
      }

      return (
        <div className="tool-panel-stack">
          <p className="tool-panel-description">
            Cada categoria abre uma pequena biblioteca. Depois de inserir, você pode arrastar, girar, duplicar, redimensionar ou excluir na própria folha.
          </p>

          <div className="tool-action-grid element-action-grid">
            <button
              type="button"
              onClick={() =>
                setElementLibraryCategory(
                  'shapes',
                )
              }
            >
              <strong>□</strong>
              <span>Formas</span>
              <small>10 opções</small>
            </button>

            <button
              type="button"
              onClick={() =>
                setElementLibraryCategory(
                  'arrows',
                )
              }
            >
              <strong>↗</strong>
              <span>Setas</span>
              <small>6 opções</small>
            </button>

            <button
              type="button"
              onClick={() =>
                setElementLibraryCategory(
                  'postits',
                )
              }
            >
              <strong>▰</strong>
              <span>Post-its</span>
              <small>6 cores</small>
            </button>

            <button
              type="button"
              onClick={() =>
                setElementLibraryCategory(
                  'washi',
                )
              }
            >
              <strong>▱</strong>
              <span>Washi</span>
              <small>6 fitas</small>
            </button>

            <button
              type="button"
              className={
                isRulerVisible
                  ? 'is-active'
                  : ''
              }
              onClick={showFloatingRuler}
            >
              <strong>⌇</strong>
              <span>
                {isRulerVisible
                  ? 'Régua ativa'
                  : 'Régua'}
              </span>
              <small>Flutuante</small>
            </button>

            <button
              type="button"
              onClick={() =>
                setElementLibraryCategory(
                  'stamps',
                )
              }
            >
              <strong>✦</strong>
              <span>Carimbos</span>
              <small>8 opções</small>
            </button>
          </div>

          <p className="tool-helper-note">
            A régua continua sendo uma ferramenta temporária: arraste para qualquer lugar da folha, gire e ajuste o tamanho.
          </p>
        </div>
      )
    }

    return null
  }

  function renderPageButton(
    page: PlannerPage,
    index: number,
    groupPages: PlannerPage[],
  ) {
    return (
      <SortablePageRow
        key={page.id}
        page={page}
        activePageId={activePageId}
        isFirst={index === 0}
        isLast={
          index ===
          groupPages.length - 1
        }
        onSelect={handleSelectPage}
        onMove={(
          pageId,
          folderId,
          direction,
        ) => {
          void handleMovePage(
            pageId,
            folderId,
            direction,
          )
        }}
      />
    )
  }

  if (Number.isNaN(agendaId)) {
    return (
      <main className="agenda-page">
        <section className="agenda-editor">
          <Link to="/">
            ← Voltar para Biblioteca
          </Link>
          <h1>
            Agenda inválida
          </h1>
        </section>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="agenda-page">
        <section className="agenda-editor">
          <p>
            Carregando agenda...
          </p>
        </section>
      </main>
    )
  }

  if (loadError || !agenda) {
    return (
      <main className="agenda-page">
        <section className="agenda-editor">
          <Link to="/">
            ← Voltar para Biblioteca
          </Link>
          <h1>
            Agenda não encontrada
          </h1>
          {loadError && (
            <p>{loadError}</p>
          )}
        </section>
      </main>
    )
  }

  const noFolderPages =
    getPagesForFolder(null)

  const favoritePages =
    pages
      .filter((page) => page.favorite)
      .sort(
        (a, b) =>
          a.position - b.position
          || a.id - b.id,
      )

  const activeToolTitle =
    activeTool === 'text'
      ? 'Texto'
      : activeTool === 'pen'
        ? 'Canetas'
        : activeTool === 'highlighter'
          ? 'Marca-texto'
          : activeTool === 'paper'
            ? 'Papel'
            : activeTool === 'stickers'
              ? 'Stickers'
              : activeTool === 'photos'
                ? 'Fotos'
                : activeTool === 'elements'
                  ? 'Elementos'
                  : activeTool === 'templates'
                    ? 'Templates'
                    : activeTool === 'tasks'
                      ? 'Tarefas'
                      : activeTool === 'more'
                        ? 'Mais opções'
                        : ''

  const saveLabel =
    saveStatus === 'error'
      || blockSaveStatus === 'error'
      ? 'Erro ao salvar'
      : saveStatus === 'saving'
        || blockSaveStatus === 'saving'
        || drawingSaving
        ? 'Salvando...'
        : 'Salvo'

  return (
    <main className="agenda-page agenda-workspace">
      <button
        className={
          isNavigationOpen
            ? 'workspace-menu-button active'
            : 'workspace-menu-button'
        }
        type="button"
        aria-label={
          isNavigationOpen
            ? 'Fechar páginas e seções'
            : 'Abrir páginas e seções'
        }
        title="Páginas e seções"
        onClick={toggleNavigation}
      >
        ☰
      </button>

      {isNavigationOpen && (
        <>
          <button
            className="workspace-drawer-backdrop"
            type="button"
            aria-label="Fechar navegação"
            onClick={() =>
              setIsNavigationOpen(false)
            }
          />

          <aside className="agenda-navigation-drawer">
            <div className="drawer-header">
              <div>
                <span className="drawer-kicker">
                  Agenda
                </span>
                <h2>{agenda.title}</h2>
              </div>

              <button
                className="drawer-close-button"
                type="button"
                aria-label="Fechar"
                onClick={() =>
                  setIsNavigationOpen(false)
                }
              >
                ×
              </button>
            </div>

            <Link
              className="drawer-library-link"
              to="/"
            >
              ← Biblioteca
            </Link>

            <div className="drawer-create-row">
              <span>
                {pages.length}/{MAX_PAGES} páginas
              </span>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    void handleCreateFolder()
                  }
                >
                  + Seção
                </button>

                <button
                  type="button"
                  onClick={handleCreatePage}
                >
                  + Página
                </button>
              </div>
            </div>

            {favoritePages.length > 0 && (
              <section className="drawer-nav-section">
                <div className="drawer-section-title">
                  Favoritas
                </div>

                <div className="favorite-page-list">
                  {favoritePages.map(
                    (page) => (
                      <button
                        key={page.id}
                        type="button"
                        className={
                          page.id === activePageId
                            ? 'favorite-page-button active'
                            : 'favorite-page-button'
                        }
                        onClick={() =>
                          handleSelectPage(
                            page.id,
                          )
                        }
                      >
                        ★ {page.title || 'Sem título'}
                      </button>
                    ),
                  )}
                </div>
              </section>
            )}

            <section className="drawer-nav-section">
              <div className="drawer-section-title">
                Seções e páginas
              </div>

              <div className="folder-list">
                {sortedFolders.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={
                      closestCenter
                    }
                    onDragEnd={(event) =>
                      void handleFolderDragEnd(
                        event,
                      )
                    }
                  >
                    <SortableContext
                      items={
                        sortedFolders.map(
                          (folder) =>
                            `folder-${folder.id}`,
                        )
                      }
                      strategy={
                        verticalListSortingStrategy
                      }
                    >
                      {sortedFolders.map(
                        (
                          folder,
                          folderIndex,
                        ) => {
                          const folderPages =
                            getPagesForFolder(
                              folder.id,
                            )

                          return (
                            <SortableFolderGroup
                              key={folder.id}
                              folder={folder}
                              isFirst={
                                folderIndex === 0
                              }
                              isLast={
                                folderIndex ===
                                sortedFolders.length - 1
                              }
                              isOpen={
                                openFolderIds.includes(
                                  folder.id,
                                )
                              }
                              onToggle={toggleFolder}
                              onMove={(
                                folderId,
                                direction,
                              ) => {
                                void handleMoveFolder(
                                  folderId,
                                  direction,
                                )
                              }}
                              onRename={(folderToRename) => {
                                void handleRenameFolder(
                                  folderToRename,
                                )
                              }}
                              onDelete={(folderToDelete) => {
                                void handleDeleteFolder(
                                  folderToDelete,
                                )
                              }}
                            >
                              <div className="folder-pages">
                                {folderPages.length > 0
                                  ? (
                                    <DndContext
                                      sensors={sensors}
                                      collisionDetection={
                                        closestCenter
                                      }
                                      onDragEnd={(event) =>
                                        void handlePageDragEnd(
                                          folder.id,
                                          event,
                                        )
                                      }
                                    >
                                      <SortableContext
                                        items={
                                          folderPages.map(
                                            (page) =>
                                              page.id,
                                          )
                                        }
                                        strategy={
                                          verticalListSortingStrategy
                                        }
                                      >
                                        {folderPages.map(
                                          (page, index) =>
                                            renderPageButton(
                                              page,
                                              index,
                                              folderPages,
                                            ),
                                        )}
                                      </SortableContext>
                                    </DndContext>
                                  )
                                  : (
                                    <span className="folder-empty-message">
                                      Seção vazia
                                    </span>
                                  )}
                              </div>
                            </SortableFolderGroup>
                          )
                        },
                      )}
                    </SortableContext>
                  </DndContext>
                )}

                <section className="folder-group loose-pages-group">
                  <div className="folder-group-header">
                    <button
                      className="folder-toggle-button"
                      type="button"
                      aria-expanded={
                        isLoosePagesOpen
                      }
                      onClick={() =>
                        setIsLoosePagesOpen(
                          (current) => !current,
                        )
                      }
                    >
                      <span
                        className="folder-chevron"
                        aria-hidden="true"
                      >
                        {isLoosePagesOpen
                          ? '⌄'
                          : '›'}
                      </span>

                      <span className="folder-group-title">
                        📄 Sem seção
                      </span>
                    </button>
                  </div>

                  {isLoosePagesOpen && (
                    <div className="folder-pages">
                      {noFolderPages.length > 0
                        ? (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={
                              closestCenter
                            }
                            onDragEnd={(event) =>
                              void handlePageDragEnd(
                                null,
                                event,
                              )
                            }
                          >
                            <SortableContext
                              items={
                                noFolderPages.map(
                                  (page) =>
                                    page.id,
                                )
                              }
                              strategy={
                                verticalListSortingStrategy
                              }
                            >
                              {noFolderPages.map(
                                (page, index) =>
                                  renderPageButton(
                                    page,
                                    index,
                                    noFolderPages,
                                  ),
                              )}
                            </SortableContext>
                          </DndContext>
                        )
                        : (
                          <span className="folder-empty-message">
                            Nenhuma página sem seção
                          </span>
                        )}
                    </div>
                  )}
                </section>
              </div>
            </section>
          </aside>
        </>
      )}

      <section className="agenda-editor minimal-editor">
        {activePage
          ? (
            <>
              <header className="minimal-editor-header">
                <div className="editor-title-cluster">
                  <input
                    className="minimal-page-title-input"
                    type="text"
                    value={activePage.title}
                    placeholder="Sem título"
                    onChange={(event) =>
                      handleChangeTitle(
                        event.target.value,
                      )
                    }
                    onBlur={handleTitleBlur}
                  />

                  <span
                    className={
                      saveLabel === 'Erro ao salvar'
                        ? 'minimal-save-status error'
                        : saveLabel === 'Salvando...'
                          ? 'minimal-save-status saving'
                          : 'minimal-save-status'
                    }
                  >
                    {saveLabel === 'Salvo'
                      ? '✓ Salvo'
                      : saveLabel}
                  </span>
                </div>

                {drawingMode !== null && (
                  <div className="active-drawing-pill">
                    <span>
                      {drawingMode === 'highlighter'
                        ? 'Marca-texto'
                        : drawingMode === 'eraser'
                          ? 'Borracha'
                          : drawingMode === 'pencil'
                            ? 'Lápis'
                            : drawingMode === 'brush'
                              ? 'Brush Pen'
                              : drawingMode === 'fountain'
                                ? 'Tinteiro'
                                : drawingMode === 'fineliner'
                                  ? 'Fineliner'
                                  : 'Caneta'} ativo
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setDrawingMode(null)
                        setDrawingDraft(null)
                      }}
                    >
                      Encerrar
                    </button>
                  </div>
                )}
              </header>

              <div className="sheet-viewport">
                <article
                  className={`planner-sheet paper-${activePage.paperType}`}
                  style={sheetStyle}
                  onClick={() =>
                    setSelectedMediaId(null)
                  }
                >
                  <div className="sheet-content-layer">
                    {blocksLoading && (
                      <p className="sheet-empty-message">
                        Carregando página...
                      </p>
                    )}

                    {!blocksLoading
                      && blockLoadError && (
                        <p className="block-error-message">
                          {blockLoadError}
                        </p>
                      )}

                    {!blocksLoading
                      && !blockLoadError
                      && sortedBlocks.length === 0 && (
                        <div className="sheet-empty-message">
                          <span>✦</span>
                          <strong>Página vazia</strong>
                          <small>
                            Abra uma ferramenta à direita para começar.
                          </small>
                        </div>
                      )}

                    {!blocksLoading
                      && !blockLoadError
                      && sortedBlocks.length > 0 && (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={
                            closestCenter
                          }
                          onDragEnd={(event) =>
                            void handleBlockDragEnd(
                              event,
                            )
                          }
                        >
                          <SortableContext
                            items={
                              sortedBlocks.map(
                                (block) =>
                                  `block-${block.id}`,
                              )
                            }
                            strategy={
                              verticalListSortingStrategy
                            }
                          >
                            <div className="block-list sheet-block-list">
                              {sortedBlocks.map(
                                (block) => (
                                  <SortableBlock
                                    key={block.id}
                                    block={block}
                                    onDataChange={
                                      handleBlockDataChange
                                    }
                                    onFlush={(blockId) => {
                                      void flushBlockUpdate(
                                        blockId,
                                      )
                                    }}
                                    onDelete={(blockId) => {
                                      void handleDeleteBlock(
                                        blockId,
                                      )
                                    }}
                                  />
                                ),
                              )}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                  </div>

                  {renderMediaLayer()}
                  {renderCanvasElementsLayer()}
                  {renderDrawingLayer()}

                  {drawingMode !== null && (
                    <div
                      className={
                        drawingMode === 'eraser'
                          ? 'drawing-input-layer eraser-mode'
                          : 'drawing-input-layer'
                      }
                      role="application"
                      aria-label="Área de desenho"
                      onPointerDown={
                        handleDrawingPointerDown
                      }
                      onPointerMove={
                        handleDrawingPointerMove
                      }
                      onPointerUp={finishDrawing}
                      onPointerCancel={finishDrawing}
                    />
                  )}
                </article>
              </div>

              {drawingError && (
                <p className="workspace-floating-error">
                  {drawingError}
                </p>
              )}
            </>
          )
          : (
            <div className="no-active-page">
              Nenhuma página selecionada.
            </div>
          )}
      </section>

      <nav
        className="editor-tool-rail"
        aria-label="Ferramentas da página"
      >
        {([
          {
            tool: 'text',
            label: 'Texto',
            icon: TypeIcon,
          },
          {
            tool: 'pen',
            label: 'Canetas',
            icon: PenTool,
          },
          {
            tool: 'highlighter',
            label: 'Marca-texto',
            icon: Highlighter,
          },
          {
            tool: 'paper',
            label: 'Papel',
            icon: FileText,
          },
          {
            tool: 'stickers',
            label: 'Stickers',
            icon: Sticker,
          },
          {
            tool: 'photos',
            label: 'Fotos',
            icon: ImageIcon,
          },
          {
            tool: 'elements',
            label: 'Elementos',
            icon: Shapes,
          },
          {
            tool: 'templates',
            label: 'Templates',
            icon: LayoutTemplate,
          },
          {
            tool: 'tasks',
            label: 'Tarefas',
            icon: ListChecks,
          },
          {
            tool: 'more',
            label: 'Mais',
            icon: Ellipsis,
          },
        ] as const).map((item) => {
          const Icon = item.icon

          return (
            <button
              key={item.tool}
              className={
                activeTool === item.tool
                  ? 'tool-rail-button active'
                  : 'tool-rail-button'
              }
              type="button"
              aria-label={item.label}
              title={item.label}
              data-label={item.label}
              onClick={() =>
                toggleTool(item.tool)
              }
            >
              <Icon
                size={19}
                strokeWidth={1.9}
                aria-hidden="true"
              />
            </button>
          )
        })}
      </nav>

      {activeTool !== null && (
        <aside className="editor-tool-drawer">
          <div className="tool-drawer-header">
            <div>
              <span className="drawer-kicker">
                Ferramenta
              </span>
              <h3>{activeToolTitle}</h3>
            </div>

            <button
              className="drawer-close-button"
              type="button"
              aria-label="Fechar ferramenta"
              onClick={() =>
                setActiveTool(null)
              }
            >
              ×
            </button>
          </div>

          <div className="tool-drawer-content">
            {renderToolPanelContent()}
          </div>
        </aside>
      )}
    </main>
  )
}

export default AgendaPage
