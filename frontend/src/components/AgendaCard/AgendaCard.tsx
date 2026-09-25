import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Copy,
  Heart,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from 'lucide-react'

import './AgendaCard.css'


type AgendaCardProps = {
  title: string
  coverColor: string
  coverImageUrl?: string | null
  accentColor?: string
  bookmarkColor?: string
  isFavorite?: boolean
  updatedAt?: string | null
  onOpen: () => void
  onEditCover?: () => void
  onRename?: () => void
  onToggleFavorite?: () => void
  onDuplicate: () => void
  onDelete: () => void
  isDuplicating?: boolean
}


function formatUpdatedAt(
  updatedAt: string | null | undefined,
) {
  if (!updatedAt) {
    return 'Sua agenda'
  }

  const date = new Date(updatedAt)

  if (Number.isNaN(date.getTime())) {
    return 'Sua agenda'
  }

  return `Atualizada em ${date.toLocaleDateString(
    'pt-BR',
    {
      day: '2-digit',
      month: 'short',
    },
  )}`
}


function AgendaCard({
  title,
  coverColor,
  coverImageUrl = null,
  accentColor = '#707318',
  bookmarkColor = '#FCD57D',
  isFavorite = false,
  updatedAt = null,
  onOpen,
  onEditCover,
  onRename,
  onToggleFavorite,
  onDuplicate,
  onDelete,
  isDuplicating = false,
}: AgendaCardProps) {
  const [isMenuOpen, setIsMenuOpen] =
    useState(false)

  const menuRef =
    useRef<HTMLDivElement | null>(null)


  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent,
    ) {
      if (
        menuRef.current !== null
        && !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsMenuOpen(false)
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handlePointerDown,
    )
    document.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointerDown,
      )
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [])


  function closeAndRun(
    action: () => void,
  ) {
    setIsMenuOpen(false)
    action()
  }


  return (
    <article className="agenda-book-card">
      <div className="agenda-book-scene">
        <button
          type="button"
          className="agenda-book"
          onClick={onOpen}
          aria-label={`Abrir agenda ${title}`}
        >
          <span
            className="agenda-book-floor-shadow"
            aria-hidden="true"
          />

          <span
            className="agenda-book-page-block"
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
            <i />
          </span>

          <span
            className="agenda-book-spine-edge"
            aria-hidden="true"
            style={{
              backgroundColor: accentColor,
            }}
          />

          <span
            className={
              coverImageUrl
                ? 'agenda-book-cover has-image'
                : 'agenda-book-cover'
            }
            style={{
              backgroundColor: coverColor,
              backgroundImage:
                coverImageUrl
                  ? `url(${coverImageUrl})`
                  : 'none',
            }}
          >
            {!coverImageUrl && <span className="agenda-book-cover-grain" aria-hidden="true" />}

            <span
              className="agenda-book-bookmark"
              aria-hidden="true"
              style={{
                backgroundColor: bookmarkColor,
              }}
            />
          </span>
        </button>

        {isFavorite && (
          <span
            className="agenda-book-favorite-badge"
            aria-label="Agenda favorita"
            title="Agenda favorita"
          >
            <Star
              size={14}
              fill="currentColor"
              strokeWidth={1.6}
              aria-hidden="true"
            />
          </span>
        )}

        <div
          className="agenda-book-menu-wrap"
          ref={menuRef}
        >
          <button
            type="button"
            className="agenda-book-menu-button"
            aria-label={`Opções da agenda ${title}`}
            aria-expanded={isMenuOpen}
            onClick={() =>
              setIsMenuOpen(
                (current) => !current,
              )
            }
          >
            <MoreHorizontal
              size={19}
              strokeWidth={1.9}
              aria-hidden="true"
            />
          </button>

          {isMenuOpen && (
            <div
              className="agenda-book-menu"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  closeAndRun(onOpen)
                }
              >
                Abrir agenda
              </button>

              {onEditCover && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    closeAndRun(onEditCover)
                  }
                >
                  <Pencil
                    size={15}
                    aria-hidden="true"
                  />
                  Editar capa
                </button>
              )}

              {onRename && (
                <button type="button" role="menuitem" onClick={() => closeAndRun(onRename)}><Pencil size={15} aria-hidden="true" />Renomear</button>
              )}

              {onToggleFavorite && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    closeAndRun(
                      onToggleFavorite,
                    )
                  }
                >
                  <Heart
                    size={15}
                    fill={
                      isFavorite
                        ? 'currentColor'
                        : 'none'
                    }
                    aria-hidden="true"
                  />
                  {isFavorite
                    ? 'Remover dos favoritos'
                    : 'Adicionar aos favoritos'}
                </button>
              )}

              <button
                type="button"
                role="menuitem"
                disabled={isDuplicating}
                onClick={() =>
                  closeAndRun(onDuplicate)
                }
              >
                <Copy
                  size={15}
                  aria-hidden="true"
                />
                {isDuplicating
                  ? 'Duplicando...'
                  : 'Duplicar'}
              </button>

              <span
                className="agenda-book-menu-separator"
                aria-hidden="true"
              />

              <button
                type="button"
                role="menuitem"
                className="agenda-book-menu-danger"
                onClick={() =>
                  closeAndRun(onDelete)
                }
              >
                <Trash2
                  size={15}
                  aria-hidden="true"
                />
                Excluir agenda
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="agenda-book-info">
        <button
          type="button"
          className="agenda-book-title-button"
          onClick={onOpen}
          title={title}
        >
          {title}
        </button>

        <span className="agenda-book-caption">
          {formatUpdatedAt(updatedAt)}
        </span>
      </div>
    </article>
  )
}


export default AgendaCard
