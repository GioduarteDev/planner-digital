import { API_URL as API_BASE_URL } from '../../services/api'

export type TaskPriority = 'low' | 'medium' | 'high'

export type PaperType =
  | 'blank'
  | 'lined'
  | 'grid'
  | 'dotted'

export type EditorTool =
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

export type DrawingTool =
  | 'pen'
  | 'fineliner'
  | 'fountain'
  | 'pencil'
  | 'brush'
  | 'highlighter'
  | 'eraser'

export type ElementLibraryCategory =
  | 'shapes'
  | 'arrows'
  | 'postits'
  | 'washi'
  | 'stamps'
  | null

export type PaperSettings = Record<string, unknown>

export type DrawingPoint = {
  x: number
  y: number
  pressure?: number
}

export type DrawingStroke = {
  id: number
  tool: DrawingTool
  color: string
  width: number
  opacity: number
  points: DrawingPoint[]
}

export type DrawingDraft = Omit<DrawingStroke, 'id'>

export type CanvasElementDragState = {
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

export type CanvasElementResizeState = {
  elementId: number
  pointerId: number
  startClientX: number
  startClientY: number
  maxWidth: number
  maxHeight: number
  startWidth: number
  startHeight: number
  currentWidth: number
  currentHeight: number
}

export type FloatingRulerState = {
  x: number
  y: number
  width: number
  rotation: number
}

export type RulerDragState = {
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

export type BlockType =
  | 'text'
  | 'heading'
  | 'checkbox'
  | 'list'

export type MediaType =
  | 'image'
  | 'sticker'

export type StickerCropSelection = {
  x: number
  y: number
  width: number
  height: number
}

export type StickerCropDragState = {
  pointerId: number
  startX: number
  startY: number
}

export type SaveStatus =
  | 'saved'
  | 'saving'
  | 'error'

export type BlockData = Record<string, unknown>

export type PlannerTask = {
  id: number
  text: string
  done: boolean
  dueDate: string
  priority: TaskPriority
}

export type PlannerPage = {
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

export type PlannerFolder = {
  id: number
  title: string
  position: number
}

export type PlannerBlock = {
  id: number
  pageId: number
  blockType: BlockType
  data: BlockData
  position: number
  createdAt: string
  updatedAt: string
}

export type PlannerMedia = {
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

export type Agenda = {
  id: number
  title: string
  coverColor: string
}

export type AgendaFromApi = {
  id: number
  title: string
  cover_color: string
  created_at: string
}

export type PageFromApi = {
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

export type FolderFromApi = {
  id: number
  agenda_id: number
  title: string
  position: number
  created_at: string
}

export type TaskFromApi = {
  id: number
  page_id: number
  text: string
  done: boolean
  due_date: string | null
  priority: TaskPriority
  created_at: string
}

export type BlockFromApi = {
  id: number
  page_id: number
  block_type: BlockType
  data: BlockData
  position: number
  created_at: string
  updated_at: string
}

export type MediaFromApi = {
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

export type MediaLibraryItem = {
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

export type PageTemplateItem = {
  id: number
  user_id: number
  name: string
  created_at: string
  updated_at: string
}

export type CanvasElementFromApi = {
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

export type CanvasElementPatch = {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  z_index?: number
  locked?: boolean
  data?: Record<string, unknown>
}

export type LibraryTypeFilter =
  | 'all'
  | MediaType

export type PagePatch = {
  title?: string
  content?: string
  favorite?: boolean
  paper_type?: PaperType
  paper_settings?: PaperSettings
}

export type BlockPatch = {
  block_type?: BlockType
  data?: BlockData
}

export type MediaPatch = {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  z_index?: number
  locked?: boolean
}

export type MediaDragState = {
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

export type MediaResizeState = {
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

export type MediaRotateState = {
  mediaId: number
  pointerId: number
  centerX: number
  centerY: number
  startPointerAngle: number
  startRotation: number
  zIndex: number
}

export function readSettingString(
  settings: PaperSettings,
  key: string,
  fallback: string,
) {
  const value = settings[key]
  return typeof value === 'string'
    ? value
    : fallback
}

export function readSettingNumber(
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

export function normalizePaperSettings(
  settings: PaperSettings | undefined,
): PaperSettings {
  return {
    ...DEFAULT_PAPER_SETTINGS,
    ...(settings ?? {}),
  }
}

export function hexToRgba(
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

export function getDrawingTool(
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

export function getDrawingPoints(
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

export function convertDrawingElement(
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

export function drawingPointsToString(
  points: DrawingPoint[],
) {
  return points
    .map(
      (point) =>
        `${point.x},${point.y}`,
    )
    .join(' ')
}

export function convertBlock(
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

export function convertMedia(
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

export function getMediaUrl(
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

export function getBlockText(
  block: PlannerBlock,
) {
  const value = block.data.text
  return typeof value === 'string'
    ? value
    : ''
}

export function getBlockChecked(
  block: PlannerBlock,
) {
  return block.data.checked === true
}


export function getBlockListItems(
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


export const DEFAULT_PAPER_SETTINGS: PaperSettings = {
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

