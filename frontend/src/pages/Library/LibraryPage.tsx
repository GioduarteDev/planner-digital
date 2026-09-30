import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  Bell,
  BookOpen,
  CalendarDays,
  Database,
  Flower2,
  Folder,
  GraduationCap,
  Heart,
  Leaf,
  Library,
  ListChecks,
  LogOut,
  Menu,
  Palette,
  Plus,
  Search,
  Sparkles,
  Sun,
  UserRound,
  X,
} from 'lucide-react'

import AgendaCard from '../../components/AgendaCard/AgendaCard'
import {
  API_URL,
  PROFILE_UPDATED_EVENT,
  apiRequest,
  clearAuth,
  saveAuth,
} from '../../services/api'
import './LibraryPage.css'
import './LibraryRoom.css'
import RoomScene from './RoomScene'


const MAX_AGENDAS = 6
const MAX_COVER_FILE_SIZE = 10 * 1024 * 1024

const COVER_PALETTE = [
  { name: 'Latte', value: '#F7F1E8' },
  { name: 'Wisteria', value: '#E6E3F7' },
  { name: 'Ballet Slipper', value: '#FDD0D0' },
  { name: 'Azure Sky', value: '#B5D8FF' },
  { name: 'Green Beryl', value: '#D0DDC4' },
  { name: 'Matcha', value: '#9CA362' },
  { name: 'Sun Drenched', value: '#FCEABC' },
  { name: 'Pêssego', value: '#EDCBB9' },
]

const BOOK_ACCENTS = [
  '#A4B89D',
  '#B4BED7',
  '#B8A9C8',
  '#CDA8B8',
  '#CEC39C',
  '#A4BDC8',
]

const BOOK_MARKERS = [
  '#E9D9AD',
  '#E4BCCC',
  '#D7CBE8',
  '#D3E3DF',
  '#E1BFA9',
  '#BDCEE5',
]


type LibraryFilter =
  | 'all'
  | 'favorites'
  | 'recent'


type AgendaSettings =
  Record<string, unknown>


type Agenda = {
  id: number
  title: string
  coverColor: string
  coverImageUrl: string | null
  settings: AgendaSettings
  createdAt: string
  updatedAt: string | null
}


type AgendaFromApi = {
  id: number
  title: string
  cover_color: string
  cover_image_url: string | null
  settings: AgendaSettings
  created_at: string
  updated_at: string | null
}


type MediaLibraryFromApi = {
  id: number
  file_url: string
}


type ProfileFromApi = {
  email: string
  name: string
  username: string | null
  profile_photo_url: string | null
  profile_cover_url: string | null
}


type EventFromApi = {
  id: number
  title: string
  starts_at: string
  reminder_minutes: number | null
}


type AgendaModalMode =
  | 'create'
  | 'edit'
  | null


function convertAgendaFromApi(
  agenda: AgendaFromApi,
): Agenda {
  return {
    id: agenda.id,
    title: agenda.title,
    coverColor: agenda.cover_color,
    coverImageUrl:
      agenda.cover_image_url,
    settings:
      agenda.settings ?? {},
    createdAt:
      agenda.created_at,
    updatedAt:
      agenda.updated_at,
  }
}


function getMediaUrl(
  fileUrl: string,
) {
  if (
    fileUrl.startsWith('http://')
    || fileUrl.startsWith('https://')
    || fileUrl.startsWith('blob:')
    || fileUrl.startsWith('data:')
  ) {
    return fileUrl
  }

  return `${API_URL}${fileUrl}`
}


function isFavorite(
  agenda: Agenda,
) {
  return agenda.settings.favorite === true
}


function getAccentColor(
  agendaId: number,
) {
  return BOOK_ACCENTS[
    Math.abs(agendaId)
    % BOOK_ACCENTS.length
  ]
}


function getMarkerColor(
  agendaId: number,
) {
  return BOOK_MARKERS[
    Math.abs(agendaId + 2)
    % BOOK_MARKERS.length
  ]
}


function LibraryPage() {
  const navigate =
    useNavigate()

  const [agendas, setAgendas] =
    useState<Agenda[]>([])
  const [searchTerm, setSearchTerm] =
    useState('')
  const [activeFilter, setActiveFilter] =
    useState<LibraryFilter>('all')
  const [isLoading, setIsLoading] =
    useState(true)
  const [duplicatingAgendaId, setDuplicatingAgendaId] =
    useState<number | null>(null)
  const [isNavigationOpen, setIsNavigationOpen] =
    useState(false)

  const [profile, setProfile] =
    useState<ProfileFromApi | null>(null)
  const [upcomingReminders, setUpcomingReminders] =
    useState<EventFromApi[]>([])
  const [isReminderOpen, setIsReminderOpen] =
    useState(false)
  const [isProfileOpen, setIsProfileOpen] =
    useState(false)
  const headerActionsRef =
    useRef<HTMLDivElement | null>(null)

  const [modalMode, setModalMode] =
    useState<AgendaModalMode>(null)
  const [editingAgendaId, setEditingAgendaId] =
    useState<number | null>(null)
  const [draftTitle, setDraftTitle] =
    useState('')
  const [draftColor, setDraftColor] =
    useState('#E6E3F7')
  const [draftCoverImageUrl, setDraftCoverImageUrl] =
    useState<string | null>(null)
  const [draftCoverFile, setDraftCoverFile] =
    useState<File | null>(null)
  const [draftCoverPreview, setDraftCoverPreview] =
    useState<string | null>(null)
  const [isSavingAgenda, setIsSavingAgenda] =
    useState(false)


  useEffect(() => {
    let cancelled = false

    async function loadAgendasFromApi() {
      try {
        const data =
          await apiRequest<AgendaFromApi[]>(
            '/agendas',
          )

        if (cancelled) {
          return
        }

        setAgendas(
          data.map(
            convertAgendaFromApi,
          ),
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error(error)
        alert(
          'Não foi possível carregar as agendas.',
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadAgendasFromApi()

    return () => {
      cancelled = true
    }
  }, [])


  useEffect(() => {
    let cancelled = false

    async function loadHeaderData() {
      try {
        const [profileData, eventData] =
          await Promise.all([
            apiRequest<ProfileFromApi>('/profile'),
            apiRequest<EventFromApi[]>('/events'),
          ])

        if (cancelled) {
          return
        }

        setProfile(profileData)

        const now = Date.now()
        setUpcomingReminders(
          eventData
            .filter((event) => {
              if (event.reminder_minutes === null) {
                return false
              }

              const startsAt =
                new Date(event.starts_at).getTime()

              return !Number.isNaN(startsAt)
                && startsAt >= now
            })
            .sort(
              (first, second) =>
                new Date(first.starts_at).getTime()
                - new Date(second.starts_at).getTime(),
            ),
        )
      } catch (error) {
        if (!cancelled) {
          console.error(
            'Não foi possível atualizar o cabeçalho da biblioteca:',
            error,
          )
        }
      }
    }

    void loadHeaderData()

    function refreshProfile(event: Event) {
      const updatedProfile =
        (event as CustomEvent<ProfileFromApi>).detail

      if (updatedProfile && typeof updatedProfile === 'object') {
        setProfile(updatedProfile)
      } else {
        void loadHeaderData()
      }
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, refreshProfile)

    return () => {
      cancelled = true
      window.removeEventListener(PROFILE_UPDATED_EVENT, refreshProfile)
    }
  }, [])


  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        headerActionsRef.current !== null
        && !headerActionsRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsReminderOpen(false)
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])


  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key !== 'Escape') {
        return
      }

      setIsNavigationOpen(false)

      if (
        modalMode !== null
        && !isSavingAgenda
      ) {
        if (
          draftCoverPreview
          && draftCoverPreview.startsWith(
            'blob:',
          )
        ) {
          URL.revokeObjectURL(
            draftCoverPreview,
          )
        }

        setModalMode(null)
        setEditingAgendaId(null)
        setDraftCoverFile(null)
        setDraftCoverPreview(null)
        setDraftCoverImageUrl(null)
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [
    draftCoverPreview,
    isSavingAgenda,
    modalMode,
  ])


  useEffect(() => {
    return () => {
      if (
        draftCoverPreview
        && draftCoverPreview.startsWith(
          'blob:',
        )
      ) {
        URL.revokeObjectURL(
          draftCoverPreview,
        )
      }
    }
  }, [draftCoverPreview])


  const visibleAgendas =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase()

      const searched =
        agendas.filter(
          (agenda) =>
            agenda.title
              .toLowerCase()
              .includes(
                normalizedSearch,
              ),
        )

      if (
        activeFilter
        === 'favorites'
      ) {
        return searched.filter(
          isFavorite,
        )
      }

      if (
        activeFilter
        === 'recent'
      ) {
        return [...searched]
          .sort(
            (first, second) =>
              new Date(
                second.updatedAt
                ?? second.createdAt,
              ).getTime()
              - new Date(
                first.updatedAt
                ?? first.createdAt,
              ).getTime(),
          )
      }

      return searched
    }, [
      activeFilter,
      agendas,
      searchTerm,
    ])


  async function handleLogout() {
    const confirmed =
      window.confirm(
        'Deseja sair da sua conta?',
      )

    if (!confirmed) {
      return
    }

    try {
      await apiRequest<void>(
        '/auth/logout',
        {
          method: 'POST',
        },
      )
    } catch (error) {
      console.error(
        'Erro ao encerrar sessão:',
        error,
      )
    } finally {
      clearAuth()
      navigate(
        '/login',
        {
          replace: true,
        },
      )
    }
  }


  function openCreateModal() {
    if (
      agendas.length
      >= MAX_AGENDAS
    ) {
      alert(
        `Você pode ter no máximo ${MAX_AGENDAS} agendas ativas.`,
      )
      return
    }

    clearDraftPreview()
    setModalMode('create')
    setEditingAgendaId(null)
    setDraftTitle('')
    setDraftColor(['#D0DDC4', '#E6E3F7', '#FDD0D0', '#FCEABC', '#B5D8FF', '#EDCBB9'][agendas.length])
    setDraftCoverImageUrl(null)
    setDraftCoverFile(null)
    setDraftCoverPreview(null)
  }


  function openEditModal(
    agenda: Agenda,
  ) {
    clearDraftPreview()
    setModalMode('edit')
    setEditingAgendaId(
      agenda.id,
    )
    setDraftTitle(
      agenda.title,
    )
    setDraftColor(
      agenda.coverColor,
    )
    setDraftCoverImageUrl(
      agenda.coverImageUrl,
    )
    setDraftCoverFile(null)
    setDraftCoverPreview(
      agenda.coverImageUrl
        ? getMediaUrl(
            agenda.coverImageUrl,
          )
        : null,
    )
  }


  function clearDraftPreview() {
    if (
      draftCoverPreview
      && draftCoverPreview.startsWith(
        'blob:',
      )
    ) {
      URL.revokeObjectURL(
        draftCoverPreview,
      )
    }
  }


  function closeAgendaModal() {
    if (isSavingAgenda) {
      return
    }

    clearDraftPreview()
    setModalMode(null)
    setEditingAgendaId(null)
    setDraftCoverFile(null)
    setDraftCoverPreview(null)
    setDraftCoverImageUrl(null)
  }


  function handleSelectCoverFile(
    file: File | undefined,
  ) {
    if (!file) {
      return
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ]

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      alert(
        'Use uma imagem JPG, PNG, WEBP ou GIF.',
      )
      return
    }

    if (
      file.size
      > MAX_COVER_FILE_SIZE
    ) {
      alert(
        'A imagem da capa pode ter no máximo 10 MB.',
      )
      return
    }

    clearDraftPreview()

    const previewUrl =
      URL.createObjectURL(
        file,
      )

    setDraftCoverFile(file)
    setDraftCoverPreview(
      previewUrl,
    )
    setDraftCoverImageUrl(null)
  }

  async function handleSelectRoomImage(
    file: File | undefined,
  ) {
    if (!file) {
      return
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ]

    if (!allowedTypes.includes(file.type)) {
      alert('Use uma imagem JPG, PNG, WEBP ou GIF.')
      return
    }

    if (file.size > MAX_COVER_FILE_SIZE) {
      alert('A imagem pode ter no máximo 10 MB.')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      const updatedProfile = await apiRequest<ProfileFromApi>(
        '/profile/cover',
        {
          method: 'POST',
          body: formData,
        },
      )

      setProfile(updatedProfile)
      saveAuth(updatedProfile)
    } catch (error) {
      console.error(error)
      alert(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar a imagem do seu cantinho.',
      )
    }
  }


  function handleRemoveCoverImage() {
    clearDraftPreview()
    setDraftCoverFile(null)
    setDraftCoverPreview(null)
    setDraftCoverImageUrl(null)
  }


  async function uploadCoverImage(
    title: string,
    file: File,
  ) {
    const formData =
      new FormData()

    formData.append(
      'media_type',
      'image',
    )
    formData.append(
      'name',
      `Capa - ${title}`,
    )
    formData.append(
      'kit_name',
      'Capas de agenda',
    )
    formData.append(
      'file',
      file,
    )

    return apiRequest<MediaLibraryFromApi>(
      '/library/media',
      {
        method: 'POST',
        body: formData,
      },
    )
  }


  async function handleSaveAgenda() {
    const cleanTitle =
      draftTitle.trim()

    if (cleanTitle === '') {
      alert(
        'Digite um nome para a agenda.',
      )
      return
    }

    if (
      modalMode === 'create'
      && agendas.length
        >= MAX_AGENDAS
    ) {
      alert(
        `Você pode ter no máximo ${MAX_AGENDAS} agendas ativas.`,
      )
      return
    }

    setIsSavingAgenda(true)

    let uploadedLibraryItemId:
      number | null = null

    try {
      let coverImageUrl =
        draftCoverImageUrl

      if (draftCoverFile) {
        const uploaded =
          await uploadCoverImage(
            cleanTitle,
            draftCoverFile,
          )

        uploadedLibraryItemId =
          uploaded.id
        coverImageUrl =
          uploaded.file_url
      }

      if (modalMode === 'create') {
        const createdAgenda =
          await apiRequest<AgendaFromApi>(
            '/agendas',
            {
              method: 'POST',
              body: JSON.stringify({
                title: cleanTitle,
                cover_color:
                  draftColor,
                cover_image_url:
                  coverImageUrl,
                settings: {},
              }),
            },
          )

        setAgendas(
          (currentAgendas) => [
            ...currentAgendas,
            convertAgendaFromApi(
              createdAgenda,
            ),
          ],
        )

        if (!Number.isInteger(createdAgenda.id)) {
          throw new Error(
            'A agenda foi criada, mas a API não retornou um ID válido.',
          )
        }

        clearDraftPreview()
        setModalMode(null)
        setEditingAgendaId(null)
        setDraftCoverFile(null)
        setDraftCoverPreview(null)
        setDraftCoverImageUrl(null)
        navigate(`/agenda/${createdAgenda.id}`)
        return
      }

      if (
        modalMode === 'edit'
        && editingAgendaId
          !== null
      ) {
        const updatedAgenda =
          await apiRequest<AgendaFromApi>(
            `/agendas/${editingAgendaId}`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                title: cleanTitle,
                cover_color:
                  draftColor,
                cover_image_url:
                  coverImageUrl,
              }),
            },
          )

        setAgendas(
          (currentAgendas) =>
            currentAgendas.map(
              (agenda) =>
                agenda.id
                  === editingAgendaId
                  ? convertAgendaFromApi(
                      updatedAgenda,
                    )
                  : agenda,
            ),
        )
      }

      clearDraftPreview()
      setModalMode(null)
      setEditingAgendaId(null)
      setDraftCoverFile(null)
      setDraftCoverPreview(null)
      setDraftCoverImageUrl(null)
    } catch (error) {
      console.error(error)

      if (
        modalMode === 'create'
        && uploadedLibraryItemId
          !== null
      ) {
        try {
          await apiRequest<void>(
            `/library/media/${uploadedLibraryItemId}`,
            {
              method: 'DELETE',
            },
          )
        } catch (cleanupError) {
          console.error(
            'Não foi possível limpar a capa enviada após a falha:',
            cleanupError,
          )
        }
      }

      if (
        error instanceof Error
      ) {
        alert(error.message)
      } else {
        alert(
          modalMode === 'edit'
            ? 'Não foi possível atualizar a agenda.'
            : 'Não foi possível criar a agenda.',
        )
      }
    } finally {
      setIsSavingAgenda(false)
    }
  }


  async function handleDuplicateAgenda(
    id: number,
  ) {
    if (
      agendas.length
      >= MAX_AGENDAS
    ) {
      alert(
        `Você pode ter no máximo ${MAX_AGENDAS} agendas ativas.`,
      )
      return
    }

    if (
      duplicatingAgendaId
      !== null
    ) {
      return
    }

    try {
      setDuplicatingAgendaId(id)

      const duplicatedAgenda =
        await apiRequest<AgendaFromApi>(
          `/agendas/${id}/duplicate`,
          {
            method: 'POST',
          },
        )

      setAgendas(
        (currentAgendas) => [
          ...currentAgendas,
          convertAgendaFromApi(
            duplicatedAgenda,
          ),
        ],
      )
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error
      ) {
        alert(error.message)
      } else {
        alert(
          'Não foi possível duplicar a agenda.',
        )
      }
    } finally {
      setDuplicatingAgendaId(null)
    }
  }


  async function handleDeleteAgenda(
    id: number,
  ) {
    const confirmed =
      window.confirm(
        'Deseja realmente excluir esta agenda?',
      )

    if (!confirmed) {
      return
    }

    try {
      await apiRequest<void>(
        `/agendas/${id}`,
        {
          method: 'DELETE',
        },
      )

      setAgendas(
        (currentAgendas) =>
          currentAgendas.filter(
            (agenda) =>
              agenda.id !== id,
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
          'Não foi possível excluir a agenda.',
        )
      }
    }
  }


  async function handleToggleFavorite(
    agenda: Agenda,
  ) {
    const nextFavorite =
      !isFavorite(agenda)

    const nextSettings = {
      ...agenda.settings,
      favorite: nextFavorite,
    }

    setAgendas(
      (currentAgendas) =>
        currentAgendas.map(
          (currentAgenda) =>
            currentAgenda.id
              === agenda.id
              ? {
                  ...currentAgenda,
                  settings:
                    nextSettings,
                }
              : currentAgenda,
        ),
    )

    try {
      const updatedAgenda =
        await apiRequest<AgendaFromApi>(
          `/agendas/${agenda.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              settings:
                nextSettings,
            }),
          },
        )

      setAgendas(
        (currentAgendas) =>
          currentAgendas.map(
            (currentAgenda) =>
              currentAgenda.id
                === agenda.id
                ? convertAgendaFromApi(
                    updatedAgenda,
                  )
                : currentAgenda,
          ),
      )
    } catch (error) {
      console.error(error)

      setAgendas(
        (currentAgendas) =>
          currentAgendas.map(
            (currentAgenda) =>
              currentAgenda.id
                === agenda.id
                ? agenda
                : currentAgenda,
          ),
      )

      alert(
        'Não foi possível atualizar o favorito.',
      )
    }
  }


  function handleOpenAgenda(
    id: number,
  ) {
    navigate(
      `/agenda/${id}`,
    )
  }


  const profileName =
    profile?.name?.trim()
    || profile?.username?.trim()
    || profile?.email?.trim()
    || 'Você'

  const today = new Date()
  const recentAgenda = [...agendas].sort((a, b) =>
    new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())[0]

  const profileInitial =
    profileName.charAt(0).toUpperCase()

  const profilePhoto =
    profile?.profile_photo_url
      ? getMediaUrl(profile.profile_photo_url)
      : null

  const roomImage =
    profile?.profile_cover_url
      ? getMediaUrl(profile.profile_cover_url)
      : null


  useEffect(() => {
    const foundNote =
      document.querySelector<HTMLElement>(
        '.room-collection-note',
      )

    if (!foundNote) {
      return
    }

    const note: HTMLElement = foundNote

    const storageKey =
      'matcha-library-collection-note-position'

    let position = {
      x: 0,
      y: 0,
    }

    try {
      const saved =
        localStorage.getItem(storageKey)

      if (saved) {
        const parsed =
          JSON.parse(saved) as {
            x?: number
            y?: number
          }

        if (
          typeof parsed.x === 'number'
          && typeof parsed.y === 'number'
        ) {
          position = {
            x: parsed.x,
            y: parsed.y,
          }
        }
      }
    } catch {
      // usa a posicao padrao
    }

    function applyPosition() {
      note.style.setProperty(
        '--note-x',
        `${position.x}px`,
      )

      note.style.setProperty(
        '--note-y',
        `${position.y}px`,
      )
    }

    applyPosition()

    let dragging = false
    let startPointerX = 0
    let startPointerY = 0
    let startNoteX = position.x
    let startNoteY = position.y

    function handlePointerDown(
      event: PointerEvent,
    ) {
      const target =
        event.target as HTMLElement

      if (target.closest('button')) {
        return
      }

      dragging = true

      startPointerX =
        event.clientX
      startPointerY =
        event.clientY

      startNoteX =
        position.x
      startNoteY =
        position.y

      note.classList.add(
        'is-dragging',
      )

      note.setPointerCapture(
        event.pointerId,
      )

      event.preventDefault()
    }

    function handlePointerMove(
      event: PointerEvent,
    ) {
      if (!dragging) {
        return
      }

      position = {
        x:
          startNoteX
          + event.clientX
          - startPointerX,
        y:
          startNoteY
          + event.clientY
          - startPointerY,
      }

      applyPosition()
    }

    function handlePointerUp(
      event: PointerEvent,
    ) {
      if (!dragging) {
        return
      }

      dragging = false

      note.classList.remove(
        'is-dragging',
      )

      if (
        note.hasPointerCapture(
          event.pointerId,
        )
      ) {
        note.releasePointerCapture(
          event.pointerId,
        )
      }

      localStorage.setItem(
        storageKey,
        JSON.stringify(position),
      )
    }

    note.addEventListener(
      'pointerdown',
      handlePointerDown,
    )

    note.addEventListener(
      'pointermove',
      handlePointerMove,
    )

    note.addEventListener(
      'pointerup',
      handlePointerUp,
    )

    note.addEventListener(
      'pointercancel',
      handlePointerUp,
    )

    return () => {
      note.removeEventListener(
        'pointerdown',
        handlePointerDown,
      )

      note.removeEventListener(
        'pointermove',
        handlePointerMove,
      )

      note.removeEventListener(
        'pointerup',
        handlePointerUp,
      )

      note.removeEventListener(
        'pointercancel',
        handlePointerUp,
      )
    }
  }, [
    agendas.length,
    activeFilter,
    searchTerm,
    visibleAgendas.length,
  ])


  const modalCoverPreview =
    draftCoverPreview
    ?? (
      draftCoverImageUrl
        ? getMediaUrl(
            draftCoverImageUrl,
          )
        : null
    )


  return (
    <div className="library-page">
      {roomImage && (
        <div className="library-ambient-background" aria-hidden="true">
          <div
            className="library-ambient-back"
            style={{ backgroundImage: `url("${roomImage}")` }}
          />
          <div
            className="library-ambient-front"
            style={{ backgroundImage: `url("${roomImage}")` }}
          />
          <div className="library-ambient-wash" />
        </div>
      )}
      <header className="library-topbar">
        <div className="library-topbar-inner">
          <button
            className="library-menu-button"
            type="button"
            aria-label="Abrir navegação"
            aria-expanded={isNavigationOpen}
            onClick={() =>
              setIsNavigationOpen(
                (current) => !current,
              )
            }
          >
            <Menu
              size={21}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            className="library-brand"
            aria-label="Matcha Planner"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: 'smooth',
              })
            }
          >
            <img
              src="/matcha-planner-icon.png"
              alt=""
              aria-hidden="true"
            />

            <span className="library-brand-name">
              Matcha Planner
            </span>

          </button>

          <div
            className="library-topbar-actions"
            ref={headerActionsRef}
          >
            <div className="library-topbar-popover-wrap">
              <button
                type="button"
                className={
                  isReminderOpen
                    ? 'library-icon-button active'
                    : 'library-icon-button'
                }
                aria-label="Lembretes"
                aria-expanded={isReminderOpen}
                onClick={() => {
                  setIsReminderOpen(
                    (current) => !current,
                  )
                  setIsProfileOpen(false)
                }}
              >
                <Bell
                  size={20}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />

                {upcomingReminders.length > 0 && (
                  <span className="library-reminder-badge">
                    {upcomingReminders.length > 9
                      ? '9+'
                      : upcomingReminders.length}
                  </span>
                )}
              </button>

              {isReminderOpen && (
                <div className="library-popover library-reminder-popover">
                  <div className="library-popover-heading">
                    <div>
                      <span>LEMBRETES</span>
                      <strong>Próximos avisos</strong>
                    </div>

                    <button
                      type="button"
                      aria-label="Fechar"
                      onClick={() =>
                        setIsReminderOpen(false)
                      }
                    >
                      <X
                        size={16}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  {upcomingReminders.length === 0
                    ? (
                      <p className="library-popover-empty">
                        Tudo tranquilo por aqui. Nenhum lembrete futuro configurado.
                      </p>
                    )
                    : (
                      <div className="library-reminder-list">
                        {upcomingReminders
                          .slice(0, 4)
                          .map((event) => (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => {
                                setIsReminderOpen(false)
                                navigate('/calendar')
                              }}
                            >
                              <span className="library-reminder-dot" />
                              <span>
                                <strong>{event.title}</strong>
                                <small>
                                  {new Date(
                                    event.starts_at,
                                  ).toLocaleString(
                                    'pt-BR',
                                    {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    },
                                  )}
                                </small>
                              </span>
                            </button>
                          ))}
                      </div>
                    )}

                  <button
                    type="button"
                    className="library-popover-link"
                    onClick={() => {
                      setIsReminderOpen(false)
                      navigate('/calendar')
                    }}
                  >
                    <CalendarDays
                      size={16}
                      aria-hidden="true"
                    />
                    Abrir calendário
                  </button>
                </div>
              )}
            </div>

            <div className="library-topbar-popover-wrap">
              <button
                type="button"
                className={
                  isProfileOpen
                    ? 'library-profile-button active'
                    : 'library-profile-button'
                }
                aria-label={`Perfil de ${profileName}`}
                aria-expanded={isProfileOpen}
                onClick={() => {
                  setIsProfileOpen(
                    (current) => !current,
                  )
                  setIsReminderOpen(false)
                }}
              >
                {profilePhoto
                  ? (
                    <img
                      src={profilePhoto}
                      alt=""
                    />
                  )
                  : (
                    <span aria-hidden="true">
                      {profileInitial}
                    </span>
                  )}
              </button>

              <button
                type="button"
                className="library-profile-copy"
                aria-expanded={isProfileOpen}
                onClick={() => {
                  setIsProfileOpen(
                    (current) => !current,
                  )
                  setIsReminderOpen(false)
                }}
              >
                <span>Olá, {profileName.split(' ')[0]}!</span>
                <small>Que bom ter você aqui!</small>
              </button>

              {isProfileOpen && (
                <div className="library-popover library-profile-popover">
                  <div className="library-profile-summary">
                    <div className="library-profile-summary-avatar">
                      {profilePhoto
                        ? (
                          <img
                            src={profilePhoto}
                            alt=""
                          />
                        )
                        : profileInitial}
                    </div>

                    <div>
                      <strong>{profileName}</strong>
                      {profile?.email && (
                        <small>{profile.email}</small>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('/profile')
                    }
                  >
                    <UserRound size={16} aria-hidden="true" />
                    Meu perfil
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleLogout()
                    }
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Sair da conta
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {isNavigationOpen && (
        <>
          <button
            type="button"
            className="library-navigation-backdrop"
            aria-label="Fechar menu"
            onClick={() =>
              setIsNavigationOpen(false)
            }
          />

          <aside
            className="library-navigation-drawer"
            aria-label="Navegação do Matcha Planner"
          >
            <div className="library-navigation-brand">
              <img
                src="/matcha-planner-icon.png"
                alt=""
              />
              <div>
                <strong>Matcha Planner</strong>
                <span>seu cantinho digital</span>
              </div>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() =>
                  setIsNavigationOpen(false)
                }
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <nav className="library-navigation-links">
              <button
                type="button"
                className="is-current"
                onClick={() =>
                  setIsNavigationOpen(false)
                }
              >
                <Library size={18} aria-hidden="true" />
                Biblioteca
              </button>

              <button type="button" onClick={() => navigate('/today')}>
                <Sun size={18} aria-hidden="true" />
                Hoje
              </button>

              <button type="button" onClick={() => navigate('/calendar')}>
                <CalendarDays size={18} aria-hidden="true" />
                Calendário
              </button>

              <button type="button" onClick={() => navigate('/tasks')}>
                <ListChecks size={18} aria-hidden="true" />
                Tarefas
              </button>

              <button type="button" onClick={() => navigate('/studies')}>
                <GraduationCap size={18} aria-hidden="true" />
                Estudos
              </button>

              <button type="button" onClick={() => navigate('/organization')}>
                <Folder size={18} aria-hidden="true" />
                Organização
              </button>

              <button type="button" onClick={() => navigate('/stationery')}>
                <Palette size={18} aria-hidden="true" />
                Papelaria
              </button>

              <button type="button" onClick={() => navigate('/data')}>
                <Database size={18} aria-hidden="true" />
                Dados
              </button>

              <button type="button" onClick={() => navigate('/profile')}>
                <UserRound size={18} aria-hidden="true" />
                Perfil
              </button>
            </nav>

            <div className="library-navigation-note">
              <Leaf size={17} aria-hidden="true" />
              <p>
                Um lugar para guardar planos, memórias e pequenas coisas bonitas.
              </p>
            </div>
          </aside>
        </>
      )}

      <div className="library-room-status"><span><Flower2 size={13} /> seu pequeno universo digital</span><span>{today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}</span></div>
      <div className="library-desktop">
        <aside className="room-sidebar room-sidebar-left" aria-label="Seu dia e sua coleção">
          <div className="room-widget-title">um dia de cada vez <Sun size={13} /></div>
          <section className="room-date"><span>HOJE</span><strong>{today.getDate().toString().padStart(2, '0')}</strong><span>{today.toLocaleDateString('pt-BR', { month: 'long' })}</span><small>{today.toLocaleDateString('pt-BR', { weekday: 'long' })}</small></section>
          <div className="room-quote"><Flower2 size={25} strokeWidth={1} /><p>há dias que são feitos para começar devagar.</p><span>um lembrete gentil</span></div>
          <section className="room-collection"><span className="room-label">SUA COLEÇÃO</span><div><strong>{agendas.length.toString().padStart(2, '0')}</strong><span>/ 06 agendas</span></div><div className="room-collection-meter" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} className={i < agendas.length ? 'filled' : ''} />)}</div></section>
          <section className="room-recent"><span className="room-label">ATUALIZADA RECENTEMENTE</span>{recentAgenda ? <button onClick={() => handleOpenAgenda(recentAgenda.id)}><BookOpen size={16} /><span>{recentAgenda.title}</span></button> : <p>Sua coleção começa aqui.</p>}</section>
          <div className="room-sidebar-foot"><Leaf size={12} /> espaço para florescer</div>
        </aside>
        <main className="library-main">
          <div className="room-paper-meta"><span>MATCHA PLANNER / COLEÇÃO PESSOAL</span><span>VOL. 01</span></div>
          <div className="library-intro-row">
            <div className="library-intro-copy"><h1>Sua biblioteca</h1><p>{agendas.length} de {MAX_AGENDAS} agendas · Matcha Planner</p></div>
            <span className="room-heading-count" aria-label={`${agendas.length} de ${MAX_AGENDAS} agendas`}><strong>{agendas.length}</strong><span>/ {MAX_AGENDAS}</span></span>
          </div>
          <div className="library-controls-row">
            <label className="library-search-wrap"><Search size={16} aria-hidden="true" /><input className="library-search" type="search" placeholder="Buscar agendas..." aria-label="Pesquisar na biblioteca" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} /></label>
            <button className="new-agenda-button" type="button" onClick={openCreateModal} disabled={agendas.length >= MAX_AGENDAS}><Plus size={15} />Nova agenda</button>
          </div>
          <div className="library-filters" role="group" aria-label="Filtrar agendas">
            <button type="button" aria-pressed={activeFilter === 'all'} className={activeFilter === 'all' ? 'active' : ''} onClick={() => setActiveFilter('all')}>Todas</button>
            <button type="button" aria-pressed={activeFilter === 'favorites'} className={activeFilter === 'favorites' ? 'active' : ''} onClick={() => setActiveFilter('favorites')}>Favoritas</button>
            <button type="button" aria-pressed={activeFilter === 'recent'} className={activeFilter === 'recent' ? 'active' : ''} onClick={() => setActiveFilter('recent')}>Recentes</button>
          </div>
          <button className="room-favorite-tab" onClick={() => setActiveFilter('favorites')} aria-label="Ver favoritas"><Heart size={13} /> favoritas</button>
        <section className="library-shelf" aria-label="Sua coleção de agendas">
          {isLoading ? (
            <div className="library-state-card">
              <span className="library-loader" />
              <p>Organizando sua estante...</p>
            </div>
          ) : visibleAgendas.length === 0 ? (
            <div className="library-empty-state">
              <BookOpen size={44} strokeWidth={1.4} aria-hidden="true" />
              <h3>
                {searchTerm.trim() !== ''
                  ? 'Nenhuma agenda encontrada'
                  : activeFilter === 'favorites'
                    ? 'Nenhuma favorita ainda'
                    : 'Sua estante está esperando o primeiro livro'}
              </h3>
              <p>
                {searchTerm.trim() !== ''
                  ? 'Tente outra palavra ou confira os filtros.'
                  : 'Crie uma agenda com uma capa que tenha a sua cara.'}
              </p>

              {agendas.length < MAX_AGENDAS && (
                <button type="button" onClick={openCreateModal}>
                  <Plus size={17} aria-hidden="true" />
                  Criar agenda
                </button>
              )}
            </div>
          ) : (
            <div className={`agenda-grid${visibleAgendas.length === 1 ? ' is-single' : ''}`}>
              {visibleAgendas.map((agenda) => (
                <AgendaCard
                  key={agenda.id}
                  title={agenda.title}
                  coverColor={agenda.coverColor}
                  coverImageUrl={
                    agenda.coverImageUrl
                      ? getMediaUrl(agenda.coverImageUrl)
                      : null
                  }
                  accentColor={getAccentColor(agenda.id)}
                  bookmarkColor={getMarkerColor(agenda.id)}
                  isFavorite={isFavorite(agenda)}
                  updatedAt={agenda.updatedAt ?? agenda.createdAt}
                  onOpen={() => handleOpenAgenda(agenda.id)}
                  onEditCover={() => openEditModal(agenda)}
                  onRename={() => openEditModal(agenda)}
                  onToggleFavorite={() =>
                    void handleToggleFavorite(agenda)
                  }
                  onDuplicate={() =>
                    void handleDuplicateAgenda(agenda.id)
                  }
                  isDuplicating={duplicatingAgendaId === agenda.id}
                  onDelete={() =>
                    void handleDeleteAgenda(agenda.id)
                  }
                />
              ))}
              {agendas.length === 1 && visibleAgendas.length === 1 && activeFilter === 'all' && !searchTerm.trim() && <div className="room-collection-note"><span className="room-note-tape" /><Flower2 size={23} strokeWidth={1.2} /><h2>Comece sua coleção</h2><p>Um lugar para os planos de hoje<br />e as ideias de amanhã.</p><button onClick={openCreateModal}><Plus size={14} /> Mais uma história</button><span className="room-note-sign">com carinho, matcha</span></div>}
            </div>
          )}
        </section>
        <div className="room-paper-footer"><span>PLANOS · IDEIAS · MEMÓRIAS</span><span>{visibleAgendas.length.toString().padStart(2, '0')} / 06 <Leaf size={12} /></span></div>
        </main>
        <aside className="room-sidebar room-sidebar-right" aria-label="Seu cantinho pessoal">
          <div className="room-widget-title">seu cantinho <Heart size={12} /></div>
          <button className="room-profile" onClick={() => navigate('/profile')}><span className="room-avatar">{profilePhoto ? <img src={profilePhoto} alt="" /> : profileInitial}</span><strong>{profileName.split(' ')[0]}</strong><span>que bom ter você aqui.</span></button>
          <figure className="room-polaroid">
            <RoomScene imageUrl={roomImage} />
            <label className="room-polaroid-edit">
              <span>{roomImage ? 'Trocar imagem' : 'Escolher imagem'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  void handleSelectRoomImage(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </label>
            <figcaption>um respiro entre os planos</figcaption>
          </figure>
          <section className="room-continue"><span className="room-label">CONTINUE SEUS PLANOS</span>{recentAgenda ? <><strong>{recentAgenda.title}</strong><button onClick={() => handleOpenAgenda(recentAgenda.id)}><BookOpen size={14} /> Abrir agenda</button></> : <p>Seu próximo capítulo começa com uma agenda.</p>}</section>
          <button className="room-reminder" onClick={() => navigate('/calendar')}><Bell size={16} /><span><strong>{upcomingReminders.length ? `${upcomingReminders.length} lembrete${upcomingReminders.length === 1 ? '' : 's'}` : 'Tudo tranquilo'}</strong><small>{upcomingReminders.length ? 'no seu calendário' : 'nenhum lembrete por agora'}</small></span></button>
        </aside>
      </div>
      <nav className="room-dock" aria-label="Atalhos principais">
        <button onClick={() => navigate('/today')}><Sun /><span>Hoje</span></button>
        <button aria-current="page" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Library /><span>Biblioteca</span></button>
        <button onClick={() => navigate('/calendar')}><CalendarDays /><span>Calendário</span></button>
        <button onClick={() => navigate('/tasks')}><ListChecks /><span>Tarefas</span></button>
        <button onClick={() => recentAgenda ? handleOpenAgenda(recentAgenda.id) : openCreateModal()}><BookOpen /><span>Agenda</span></button>
        <button onClick={() => navigate('/stationery')}><Palette /><span>Papelaria</span></button>
      </nav>

      {modalMode !== null && (
        <div
          className="agenda-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAgendaModal()
            }
          }}
        >
          <section
            className="agenda-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agenda-modal-title"
          >
            <div className="agenda-modal-header">
              <div>
                <span>
                  {modalMode === 'create'
                    ? 'NOVO CADERNO'
                    : 'PERSONALIZAR'}
                </span>
                <h2 id="agenda-modal-title">
                  {modalMode === 'create'
                    ? 'Criar nova agenda'
                    : 'Editar agenda'}
                </h2>
                <p>
                  A capa é sua. O nome aparece apenas abaixo do livro na estante.
                </p>
              </div>

              <button
                type="button"
                aria-label="Fechar"
                disabled={isSavingAgenda}
                onClick={closeAgendaModal}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="agenda-modal-body">
              <div className="agenda-modal-form">
                <label className="agenda-field">
                  <span>Nome da agenda</span>
                  <input
                    type="text"
                    value={draftTitle}
                    maxLength={120}
                    placeholder="Ex.: Diário de 2027"
                    autoFocus
                    onChange={(event) =>
                      setDraftTitle(event.target.value)
                    }
                  />
                </label>

                <fieldset className="agenda-cover-fieldset">
                  <legend>Cor da capa</legend>
                  <div className="agenda-color-grid">
                    {COVER_PALETTE.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={
                          draftColor.toLowerCase()
                          === color.value.toLowerCase()
                            ? 'agenda-color-choice selected'
                            : 'agenda-color-choice'
                        }
                        title={color.name}
                        aria-label={`Usar cor ${color.name}`}
                        aria-pressed={
                          draftColor.toLowerCase()
                          === color.value.toLowerCase()
                        }
                        style={{ backgroundColor: color.value }}
                        onClick={() => setDraftColor(color.value)}
                      />
                    ))}
                  </div>

                  <label className="agenda-custom-color">
                    <span>Outra cor</span>
                    <input
                      type="color"
                      value={draftColor}
                      onChange={(event) =>
                        setDraftColor(event.target.value)
                      }
                    />
                    <code>{draftColor}</code>
                  </label>
                </fieldset>

                <div className="agenda-image-field">
                  <div>
                    <strong>Imagem de capa</strong>
                    <span>JPG, PNG, WEBP ou GIF · até 10 MB</span>
                  </div>

                  <div className="agenda-image-actions">
                    <label className="agenda-upload-button">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(event) =>
                          handleSelectCoverFile(
                            event.target.files?.[0],
                          )
                        }
                      />
                      Escolher imagem
                    </label>

                    {modalCoverPreview && (
                      <button
                        type="button"
                        className="agenda-remove-image"
                        onClick={handleRemoveCoverImage}
                      >
                        Remover imagem
                      </button>
                    )}
                  </div>
                </div>

                <div className="agenda-cover-note">
                  <Sparkles size={17} aria-hidden="true" />
                  <p>
                    Sua imagem também fica na biblioteca de mídia para você reutilizar depois.
                  </p>
                </div>
              </div>

              <div className="agenda-modal-preview">
                <span className="agenda-preview-label">PRÉVIA</span>

                <div className="agenda-preview-stage">
                  <div className="agenda-preview-book">
                    <span className="agenda-preview-pages" />
                    <span
                      className="agenda-preview-spine"
                      style={{ backgroundColor: '#707318' }}
                    />
                    <span
                      className={
                        modalCoverPreview
                          ? 'agenda-preview-cover has-image'
                          : 'agenda-preview-cover'
                      }
                      style={{
                        backgroundColor: draftColor,
                        backgroundImage: modalCoverPreview
                          ? `url(${modalCoverPreview})`
                          : 'none',
                      }}
                    >
                      {!modalCoverPreview && (
                        <span className="agenda-preview-botanical" aria-hidden="true">
                          <Leaf size={31} strokeWidth={1.25} />
                          <Flower2 size={26} strokeWidth={1.25} />
                        </span>
                      )}
                      <span className="agenda-preview-bookmark" />
                    </span>
                  </div>
                </div>

                <strong className="agenda-preview-name">
                  {draftTitle.trim() || 'Minha agenda'}
                </strong>
                <p>A capa continua totalmente livre para a sua arte.</p>
              </div>
            </div>

            <div className="agenda-modal-footer">
              <button
                type="button"
                className="agenda-modal-cancel"
                disabled={isSavingAgenda}
                onClick={closeAgendaModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="agenda-modal-save"
                disabled={isSavingAgenda}
                onClick={() => void handleSaveAgenda()}
              >
                {isSavingAgenda
                  ? 'Salvando...'
                  : modalMode === 'create'
                    ? 'Criar agenda'
                    : 'Salvar alterações'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}


export default LibraryPage
