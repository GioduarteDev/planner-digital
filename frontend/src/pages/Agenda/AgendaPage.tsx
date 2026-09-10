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
  apiRequest,
  API_URL,
  getCsrfToken,
} from '../../services/api'
import './AgendaPage.css'

const MAX_PAGES = 400
const API_BASE_URL = API_URL

type TaskPriority = 'low' | 'medium' | 'high'

type PaperType =
  | 'blank'
  | 'lined'
  | 'grid'
  | 'dotted'

type BlockType =
  | 'text'
  | 'heading'
  | 'checkbox'
  | 'list'

type MediaType =
  | 'image'
  | 'sticker'

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

type LibraryTypeFilter =
  | 'all'
  | MediaType

type PagePatch = {
  title?: string
  content?: string
  favorite?: boolean
  paper_type?: PaperType
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
  children: ReactNode
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
  children,
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
          aria-label={`Arrastar pasta ${folder.title}`}
          title="Arrastar para reordenar pasta"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>

        <span
          className="folder-group-title"
          title={folder.title}
        >
          📁 {folder.title}
        </span>

        <div className="folder-group-actions">
          <button
            type="button"
            aria-label={`Mover pasta ${folder.title} para cima`}
            title="Mover pasta para cima"
            disabled={isFirst}
            onClick={() =>
              onMove(folder.id, 'up')
            }
          >
            ↑
          </button>

          <button
            type="button"
            aria-label={`Mover pasta ${folder.title} para baixo`}
            title="Mover pasta para baixo"
            disabled={isLast}
            onClick={() =>
              onMove(folder.id, 'down')
            }
          >
            ↓
          </button>

          <button
            type="button"
            aria-label={`Renomear pasta ${folder.title}`}
            title="Renomear pasta"
            onClick={() =>
              onRename(folder)
            }
          >
            ✎
          </button>

          <button
            type="button"
            aria-label={`Excluir pasta ${folder.title}`}
            title="Excluir pasta"
            onClick={() =>
              onDelete(folder)
            }
          >
            ×
          </button>
        </div>
      </div>

      {children}
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
          <div className="block-list-row">
            <span aria-hidden="true">
              •
            </span>
            <input
              className="block-line-input"
              type="text"
              value={text}
              placeholder="Item da lista..."
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
  

  const [selectedMediaId, setSelectedMediaId] =
    useState<number | null>(null)

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
      'Nome da nova pasta:',
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
      'Novo nome da pasta:',
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
        `Excluir a pasta "${folder.title}"? As páginas serão mantidas em "Sem pasta".`,
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
          'Não foi possível excluir a pasta.',
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
        'Não foi possível reordenar as pastas.',
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
        'Não foi possível reordenar a pasta.',
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
        libraryMediaType,
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
        mediaType,
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
      return
    }

    setBlocksLoading(true)
    setBlockLoadError('')
    setActivePageId(pageId)
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

  return (
    <main className="agenda-page">
      <aside className="agenda-sidebar">
        <Link
          className="back-link"
          to="/"
        >
          ← Biblioteca
        </Link>

        <h2>{agenda.title}</h2>

        <div className="pages-header">
          <span>
            {pages.length}/{MAX_PAGES}
          </span>

          <div className="sidebar-create-actions">
            <button
              type="button"
              onClick={() =>
                void handleCreateFolder()
              }
            >
              + Pasta
            </button>

            <button
              type="button"
              onClick={handleCreatePage}
            >
              + Página
            </button>
          </div>
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
                                Pasta vazia
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

          <section className="folder-group">
            <div className="folder-group-header">
              <span className="folder-group-title">
                📄 Sem pasta
              </span>
            </div>

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
                    Nenhuma página sem pasta
                  </span>
                )}
            </div>
          </section>
        </div>
      </aside>

      <section className="agenda-editor">
        {activePage && (
          <>
            <div className="editor-header">
              <input
                className="page-title-input"
                type="text"
                value={activePage.title}
                placeholder="Título da página"
                onChange={(event) =>
                  handleChangeTitle(
                    event.target.value,
                  )
                }
                onBlur={handleTitleBlur}
              />

              <select
                className="folder-select"
                value={
                  activePage.folderId
                  ?? ''
                }
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
                  📄 Sem pasta
                </option>

                {folders.map(
                  (folder) => (
                    <option
                      key={folder.id}
                      value={folder.id}
                    >
                      📁 {folder.title}
                    </option>
                  ),
                )}
              </select>

              <select
                className="folder-select paper-select"
                aria-label="Tipo de papel"
                title="Tipo de papel"
                value={
                  activePage.paperType
                }
                onChange={(event) =>
                  handleChangePaperType(
                    event.target
                      .value as PaperType,
                  )
                }
              >
                <option value="blank">
                  ⬜ Branco
                </option>
                <option value="lined">
                  ━ Pautado
                </option>
                <option value="grid">
                  ▦ Quadriculado
                </option>
                <option value="dotted">
                  ⠿ Pontilhado
                </option>
              </select>

              <button
                className="favorite-button"
                type="button"
                onClick={
                  handleToggleFavorite
                }
              >
                {activePage.favorite
                  ? '★ Favorita'
                  : '☆ Favoritar'}
              </button>

              <button
                className="delete-page-button"
                type="button"
                onClick={handleDeletePage}
              >
                Excluir página
              </button>
            </div>

            <section className="templates-section">
              <div className="templates-section-header">
                <div>
                  <h3>Templates de página</h3>
                  <p>
                    Salve a página atual como modelo e reutilize quando quiser.
                  </p>
                </div>

                <button
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
              </div>

              {templatesError && (
                <p className="templates-error-message">
                  {templatesError}
                </p>
              )}

              {templatesLoading
                ? (
                  <p className="templates-empty-message">
                    Carregando templates...
                  </p>
                )
                : pageTemplates.length === 0
                  ? (
                    <p className="templates-empty-message">
                      Você ainda não salvou nenhum template.
                    </p>
                  )
                  : (
                    <div className="templates-grid">
                      {pageTemplates.map(
                        (template) => {
                          const busy =
                            templateBusyId
                            === template.id

                          return (
                            <article
                              className="template-card"
                              key={template.id}
                            >
                              <div className="template-card-title">
                                <strong>
                                  {template.name}
                                </strong>
                              </div>

                              <div className="template-card-actions">
                                <button
                                  type="button"
                                  disabled={busy}
                                  title="Criar uma nova página usando este template"
                                  onClick={() =>
                                    void handleCreatePageFromTemplate(
                                      template,
                                    )
                                  }
                                >
                                  + Nova página
                                </button>

                                <button
                                  type="button"
                                  disabled={busy}
                                  title="Aplicar este template na página atual"
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
                                  title="Renomear template"
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
                                  title="Excluir template"
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
            </section>

            <section className="tasks-section">
              <h3>Tarefas</h3>

              <form
                className="task-form"
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
                  onChange={(event) =>
                    setNewTaskPriority(
                      event.target
                        .value as TaskPriority,
                    )
                  }
                >
                  <option value="low">
                    Baixa
                  </option>
                  <option value="medium">
                    Média
                  </option>
                  <option value="high">
                    Alta
                  </option>
                </select>

                <button type="submit">
                  Adicionar
                </button>
              </form>

              <div className="task-list">
                {activePage.tasks.map(
                  (task) => (
                    <div
                      className="task-item"
                      key={task.id}
                    >
                      <div className="task-main">
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
                                ? 'task-text done'
                                : 'task-text'
                            }
                          >
                            {task.text}
                          </span>
                        </label>

                        <div className="task-details">
                          {task.dueDate && (
                            <span>
                              📅 {task.dueDate}
                            </span>
                          )}

                          <span>
                            {task.priority ===
                              'high' &&
                              '🔴 Alta'}
                            {task.priority ===
                              'medium' &&
                              '🟡 Média'}
                            {task.priority ===
                              'low' &&
                              '🟢 Baixa'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label="Excluir tarefa"
                        onClick={() =>
                          void handleDeleteTask(
                            task.id,
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  ),
                )}
              </div>
            </section>

            <section className="media-section">
              <div className="media-toolbar">
                <strong>
                  Imagens e stickers
                </strong>

                <div className="media-toolbar-actions">
                  <select
                    value={mediaType}
                    onChange={(event) =>
                      setMediaType(
                        event.target
                          .value as MediaType,
                      )
                    }
                  >
                    <option value="image">
                      Imagem
                    </option>
                    <option value="sticker">
                      Sticker
                    </option>
                  </select>

                  <label
                    className="media-upload-button"
                  >
                    {mediaUploading
                      ? 'Enviando...'
                      : '+ Escolher arquivo'}

                    <input
                      className="media-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={mediaUploading}
                      onChange={(event) => {
                        const file =
                          event.target
                            .files?.[0]

                        event.target.value = ''

                        void handleUploadMedia(
                          file,
                        )
                      }}
                    />
                  </label>
                </div>
              </div>

              <section className="media-library-panel">
                <div className="media-library-header">
                  <div>
                    <strong>
                      Minha biblioteca
                    </strong>

                    <p>
                      Salve uma vez e reutilize em qualquer página.
                    </p>
                  </div>
                </div>

                <div className="media-library-upload-row">
                  <select
                    value={libraryMediaType}
                    onChange={(event) =>
                      setLibraryMediaType(
                        event.target
                          .value as MediaType,
                      )
                    }
                    aria-label="Tipo do item da biblioteca"
                  >
                    <option value="sticker">
                      Sticker
                    </option>
                    <option value="image">
                      Imagem
                    </option>
                  </select>

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
                    placeholder="Kit opcional"
                    value={libraryKit}
                    onChange={(event) =>
                      setLibraryKit(
                        event.target.value,
                      )
                    }
                  />

                  <label className="media-library-upload-button">
                    {libraryUploading
                      ? 'Salvando...'
                      : '+ Salvar na biblioteca'}

                    <input
                      className="media-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={libraryUploading}
                      onChange={(event) => {
                        const file =
                          event.target
                            .files?.[0]

                        event.target.value = ''

                        void handleUploadLibraryMedia(
                          file,
                        )
                      }}
                    />
                  </label>
                </div>

                <div className="media-library-filters">
                  <select
                    value={libraryTypeFilter}
                    onChange={(event) =>
                      setLibraryTypeFilter(
                        event.target
                          .value as LibraryTypeFilter,
                      )
                    }
                    aria-label="Filtrar biblioteca por tipo"
                  >
                    <option value="all">
                      Todos
                    </option>
                    <option value="sticker">
                      Stickers
                    </option>
                    <option value="image">
                      Imagens
                    </option>
                  </select>

                  <select
                    value={libraryKitFilter}
                    onChange={(event) =>
                      setLibraryKitFilter(
                        event.target.value,
                      )
                    }
                    aria-label="Filtrar biblioteca por kit"
                  >
                    <option value="">
                      Todos os kits
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
                </div>

                {libraryError && (
                  <p className="media-error-message">
                    {libraryError}
                  </p>
                )}

                {libraryLoading
                  ? (
                    <p className="media-library-empty">
                      Carregando biblioteca...
                    </p>
                  )
                  : visibleLibraryItems.length === 0
                    ? (
                      <p className="media-library-empty">
                        Nenhum item salvo nesta seleção.
                      </p>
                    )
                    : (
                      <div className="media-library-grid">
                        {visibleLibraryItems.map(
                          (item) => (
                            <article
                              className="media-library-card"
                              key={item.id}
                            >
                              <button
                                className="media-library-preview-button"
                                type="button"
                                title="Inserir na página"
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

                              <div className="media-library-card-info">
                                <strong
                                  title={item.name}
                                >
                                  {item.name}
                                </strong>

                                <span>
                                  {item.media_type
                                    === 'sticker'
                                    ? 'Sticker'
                                    : 'Imagem'}
                                  {item.kit_name
                                    ? ` · ${item.kit_name}`
                                    : ''}
                                </span>
                              </div>

                              <div className="media-library-card-actions">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleInsertLibraryMedia(
                                      item,
                                    )
                                  }
                                >
                                  Inserir
                                </button>

                                <button
                                  type="button"
                                  title="Renomear ou mudar de kit"
                                  onClick={() =>
                                    void handleEditLibraryMedia(
                                      item,
                                    )
                                  }
                                >
                                  Editar
                                </button>

                                <button
                                  type="button"
                                  title="Excluir da biblioteca"
                                  onClick={() =>
                                    void handleDeleteLibraryMedia(
                                      item,
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
                    )}
              </section>

              {mediaError && (
                <p className="media-error-message">
                  {mediaError}
                </p>
              )}

              {mediaItems.length === 0
                ? (
                  <p className="media-empty-message">
                    Nenhuma imagem ou sticker nesta página.
                  </p>
                )
                : (
                  <>
                    <p className="media-drag-hint">
                      Clique para editar. Use ↑/↓ para camadas, ⧉ para duplicar, ↘ para redimensionar, ↻ para girar e 🔒 para bloquear.
                    </p>

                    <div
                      className="media-stage"
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
                              alt={
                                item.originalName
                              }
                              draggable={false}
                            />

                            {selectedMediaId
                              === item.id && (
                              <>
                                <div
                                  className="media-layer-controls"
                                >
                                  <button
                                    className="media-layer-button"
                                    type="button"
                                    aria-label="Trazer mídia para frente"
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
                                    aria-label="Mandar mídia para trás"
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
                                  title="Arraste para aumentar ou diminuir"
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
                  </>
                )}
            </section>

            <section className="blocks-section">
              <div className="block-toolbar">
                <strong>
                  Editor da página
                </strong>

                <div className="block-toolbar-actions">
                  <button
                    type="button"
                    onClick={() =>
                      void handleCreateBlock(
                        'text',
                      )
                    }
                  >
                    + Texto
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void handleCreateBlock(
                        'heading',
                      )
                    }
                  >
                    + Título
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void handleCreateBlock(
                        'checkbox',
                      )
                    }
                  >
                    + Checkbox
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void handleCreateBlock(
                        'list',
                      )
                    }
                  >
                    + Lista
                  </button>
                </div>
              </div>

              <div
                className={`block-editor-surface paper-${activePage.paperType}`}
              >
                {blocksLoading && (
                  <p className="block-empty-message">
                    Carregando blocos...
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
                    <div className="block-empty-message">
                      <strong>
                        Página vazia
                      </strong>
                      <span>
                        Adicione um bloco de texto, título, checkbox ou lista.
                      </span>
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
                        <div className="block-list">
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

              <div className="editor-save-statuses">
                <span className="autosave-message">
                  Blocos: {' '}
                  {blockSaveStatus === 'saving'
                    && 'salvando...'}
                  {blockSaveStatus === 'saved'
                    && 'salvos'}
                  {blockSaveStatus === 'error'
                    && 'erro ao salvar'}
                </span>
              </div>
            </section>

            <textarea

              className={`page-content paper-${activePage.paperType}`}

              value={

                activePage.content

              }

              placeholder="Comece a escrever..."

              onChange={(event) =>

                handleChangeContent(

                  event.target.value,

                )

              }

              onBlur={() => {

                if (

                  activePageId !==

                  null

                ) {

                  void flushPageUpdate(

                    activePageId,

                  )

                }

              }}

            />



            <span className="autosave-message">

              {saveStatus ===

                'saving' &&

                'Salvando...'}

              {saveStatus ===

                'saved' &&

                'Salvo automaticamente'}

              {saveStatus ===

                'error' &&

                'Erro ao salvar'}

            </span>

          </>
        )}
      </section>
    </main>
  )
}

export default AgendaPage
