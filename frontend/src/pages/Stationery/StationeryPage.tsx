import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  API_URL,
  apiRequest,
} from '../../services/api'

import StickerPicker
  from './StickerPicker'

import {
  normalizeSticker,
  type ReusableSticker,
} from './stickerTypes'

import './StationeryPage.css'


type LibraryMedia = {
  id: number
  name: string
  media_type: string
  file_url: string
  kit_name?: string | null
  mime_type?: string
  created_at?: string
}


function mediaUrl(
  value: string,
) {
  if (
    /^(https?:|data:|blob:)/
      .test(value)
  ) {
    return value
  }

  return `${API_URL}${value}`
}


function StationeryPage() {
  const navigate =
    useNavigate()

  const [
    stickers,
    setStickers,
  ] =
    useState<
      ReusableSticker[]
    >([])

  const [
    photos,
    setPhotos,
  ] =
    useState<
      LibraryMedia[]
    >([])

  const [
    selectedStickerId,
    setSelectedStickerId,
  ] =
    useState<
      number | null
    >(null)

  const [
    photoQuery,
    setPhotoQuery,
  ] =
    useState('')

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState('')


  useEffect(() => {
    let cancelled =
      false

    async function loadLibrary() {
      try {
        setError('')

        const [
          stickerData,
          photoData,
        ] =
          await Promise.all([
            apiRequest<
              LibraryMedia[]
            >(
              '/library/media?media_type=sticker',
            ),

            apiRequest<
              LibraryMedia[]
            >(
              '/library/media?media_type=image',
            ),
          ])

        if (cancelled) {
          return
        }

        setStickers(
          stickerData.map(
            normalizeSticker,
          ),
        )

        setPhotos(
          photoData,
        )
      } catch (caughtError) {
        if (cancelled) {
          return
        }

        console.error(
          caughtError,
        )

        setError(
          caughtError
            instanceof Error
            ? caughtError.message
            : 'Não foi possível carregar sua biblioteca.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadLibrary()

    return () => {
      cancelled = true
    }
  }, [])


  const visiblePhotos =
    useMemo(
      () => {
        const query =
          photoQuery
            .trim()
            .toLocaleLowerCase(
              'pt-BR',
            )

        if (!query) {
          return photos
        }

        return photos.filter(
          photo =>
            photo.name
              .toLocaleLowerCase(
                'pt-BR',
              )
              .includes(
                query,
              ),
        )
      },
      [
        photoQuery,
        photos,
      ],
    )


  return (
    <main className="stationery-page">
      <section className="stationery-hero">
        <div>
          <span>
            Minha coleção
          </span>

          <h1>
            Papelaria
          </h1>

          <p>
            Seus stickers e fotos
            reutilizáveis ficam aqui.
            Templates continuam dentro
            da Agenda, onde podem ser
            aplicados diretamente às páginas.
          </p>
        </div>
      </section>


      {error && (
        <div className="stationery-error">
          {error}
        </div>
      )}


      <div className="stationery-simple-library">
        <section
          className="stationery-sticker-library-section"
        >
          <div className="stationery-section-heading">
            <div>
              <span>
                Biblioteca reutilizável
              </span>

              <h2>
                Meus stickers
              </h2>
            </div>

            <strong>
              {stickers.length}
            </strong>
          </div>

          <p className="stationery-sticker-source-note">
            Adicione stickers pelo Editor da Agenda.
            Depois eles ficam disponíveis para
            reutilização no Editor e no Calendário.
          </p>

          <StickerPicker
            stickers={
              stickers
            }
            loading={
              loading
            }
            selectedId={
              selectedStickerId
            }
            onSelect={(
              sticker,
            ) =>
              setSelectedStickerId(
                sticker.id,
              )
            }
          />
        </section>


        <section>
          <div className="stationery-section-heading">
            <div>
              <span>
                Biblioteca reutilizável
              </span>

              <h2>
                Minhas fotos
              </h2>
            </div>

            <strong>
              {photos.length}
            </strong>
          </div>

          <p className="stationery-sticker-source-note">
            Fotos salvas na biblioteca podem ser
            reutilizadas em diferentes páginas
            da Agenda.
          </p>

          <div className="sticker-picker">
            <div className="sticker-picker-tools">
              <label>
                <span>
                  Buscar fotos
                </span>

                <input
                  type="search"
                  value={
                    photoQuery
                  }
                  placeholder="Buscar pelo nome"
                  onChange={(
                    event,
                  ) =>
                    setPhotoQuery(
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>


            {loading && (
              <p className="sticker-picker-state">
                Carregando suas fotos...
              </p>
            )}


            {!loading
              && photos.length
                === 0 && (
              <p className="sticker-picker-state">
                Nenhuma foto salva ainda.
                Adicione uma foto pelo Editor.
              </p>
            )}


            {!loading
              && photos.length
                > 0
              && visiblePhotos.length
                === 0 && (
              <p className="sticker-picker-state">
                Nenhuma foto combina com essa busca.
              </p>
            )}


            <div className="sticker-picker-grid">
              {visiblePhotos.map(
                photo => (
                  <article
                    key={
                      photo.id
                    }
                    className="sticker-picker-item"
                  >
                    <span className="sticker-picker-image">
                      <img
                        src={
                          mediaUrl(
                            photo.file_url,
                          )
                        }
                        alt={
                          photo.name
                        }
                        draggable={
                          false
                        }
                      />
                    </span>

                    <strong>
                      {
                        photo.name
                      }
                    </strong>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>


        <section className="stationery-templates-note">
          <div className="stationery-section-heading">
            <div>
              <span>
                Agenda
              </span>

              <h2>
                Templates
              </h2>
            </div>
          </div>

          <div className="stationery-empty">
            Templates são escolhidos e aplicados
            dentro da própria Agenda, porque eles
            precisam saber em qual página serão usados.

            <div className="stationery-template-action">
              <button
                type="button"
                className="stationery-primary-button"
                onClick={() =>
                  navigate('/')
                }
              >
                Abrir minhas agendas
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}


export default StationeryPage