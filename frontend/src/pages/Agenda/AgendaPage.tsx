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

import { apiRequest } from '../../services/api'
import './AgendaPage.css'

const MAX_PAGES = 400

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

  const [isLoading, setIsLoading] =
    useState(true)
  const [loadError, setLoadError] =
    useState('')
  const [saveStatus, setSaveStatus] =
    useState<SaveStatus>('saved')
  const [blockSaveStatus, setBlockSaveStatus] =
    useState<SaveStatus>('saved')

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
