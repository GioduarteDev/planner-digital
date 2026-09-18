import {
  useEffect,
  useState,
} from 'react'

import {
  apiRequest,
} from '../../services/api'

import './DataPage.css'


type StorageSummary = {
  upload_bytes: number
  upload_megabytes: number
  media_library_items: number
  page_media_items: number
  templates: number
  agendas: number
  pages: number
}


function DataPage() {
  const [
    storage,
    setStorage,
  ] =
    useState<
      StorageSummary | null
    >(null)


  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)


  const [
    loadError,
    setLoadError,
  ] =
    useState('')


  const [
    isExporting,
    setIsExporting,
  ] =
    useState(false)


  useEffect(() => {
    let cancelled =
      false


    async function loadStorage() {
      try {
        setLoadError('')

        const data =
          await apiRequest<
            StorageSummary
          >(
            '/data/storage',
          )


        if (!cancelled) {
          setStorage(
            data,
          )
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error(
          error,
        )

        if (
          error instanceof Error
        ) {
          setLoadError(
            error.message,
          )
        } else {
          setLoadError(
            'Não foi possível carregar os dados de armazenamento.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(
            false,
          )
        }
      }
    }


    void loadStorage()


    return () => {
      cancelled =
        true
    }
  }, [])


  async function handleExportData() {
    try {
      setIsExporting(
        true,
      )


      const data =
        await apiRequest<
          Record<
            string,
            unknown
          >
        >(
          '/data/export',
        )


      const content =
        JSON.stringify(
          data,
          null,
          2,
        )


      const blob =
        new Blob(
          [
            content,
          ],
          {
            type:
              'application/json;charset=utf-8',
          },
        )


      const url =
        URL.createObjectURL(
          blob,
        )


      const link =
        document.createElement(
          'a',
        )


      const today =
        new Date()
          .toISOString()
          .slice(
            0,
            10,
          )


      link.href =
        url

      link.download =
        `super-planner-backup-${today}.json`


      document.body
        .appendChild(
          link,
        )


      link.click()
      link.remove()


      URL.revokeObjectURL(
        url,
      )
    } catch (error) {
      console.error(
        error,
      )


      if (
        error instanceof Error
      ) {
        alert(
          error.message,
        )
      } else {
        alert(
          'Não foi possível exportar seus dados.',
        )
      }
    } finally {
      setIsExporting(
        false,
      )
    }
  }


  return (
    <main className="data-page">
      <section className="data-hero">
        <div>
          <span className="data-eyebrow">
            Meu planner
          </span>

          <h1>
            Dados e armazenamento
          </h1>

          <p>
            Veja o que está salvo no seu
            planner e faça uma cópia dos
            seus dados quando quiser.
          </p>
        </div>

        <div
          className="data-hero-decoration"
          aria-hidden="true"
        >
          ✿
        </div>
      </section>


      {isLoading && (
        <section className="data-panel">
          <p>
            Carregando informações...
          </p>
        </section>
      )}


      {loadError && (
        <section className="data-panel data-error">
          <strong>
            Não foi possível carregar.
          </strong>

          <p>
            {loadError}
          </p>
        </section>
      )}


      {!isLoading
        && storage && (
          <>
            <section className="data-section">
              <div className="data-section-heading">
                <div>
                  <span>
                    Visão geral
                  </span>

                  <h2>
                    Seu espaço
                  </h2>
                </div>

                <div className="data-storage-total">
                  <strong>
                    {
                      storage
                        .upload_megabytes
                    } MB
                  </strong>

                  <small>
                    arquivos enviados
                  </small>
                </div>
              </div>


              <div className="data-grid">
                <article className="data-stat-card data-stat-pink">
                  <span>
                    Agendas
                  </span>

                  <strong>
                    {
                      storage
                        .agendas
                    }
                  </strong>

                  <small>
                    até 6 ativas
                  </small>
                </article>


                <article className="data-stat-card data-stat-blue">
                  <span>
                    Páginas
                  </span>

                  <strong>
                    {
                      storage
                        .pages
                    }
                  </strong>

                  <small>
                    conteúdo criado
                  </small>
                </article>


                <article className="data-stat-card data-stat-mint">
                  <span>
                    Biblioteca
                  </span>

                  <strong>
                    {
                      storage
                        .media_library_items
                    }
                  </strong>

                  <small>
                    itens salvos
                  </small>
                </article>


                <article className="data-stat-card data-stat-lilac">
                  <span>
                    Mídias nas páginas
                  </span>

                  <strong>
                    {
                      storage
                        .page_media_items
                    }
                  </strong>

                  <small>
                    fotos e stickers
                  </small>
                </article>


                <article className="data-stat-card data-stat-yellow">
                  <span>
                    Templates
                  </span>

                  <strong>
                    {
                      storage
                        .templates
                    }
                  </strong>

                  <small>
                    modelos pessoais
                  </small>
                </article>


                <article className="data-stat-card data-stat-paper">
                  <span>
                    Arquivos
                  </span>

                  <strong>
                    {
                      storage
                        .upload_megabytes
                    } MB
                  </strong>

                  <small>
                    {
                      storage
                        .upload_bytes
                        .toLocaleString(
                          'pt-BR',
                        )
                    } bytes
                  </small>
                </article>
              </div>
            </section>


            <section className="data-section">
              <div className="data-backup-card">
                <div className="data-backup-icon">
                  ↓
                </div>

                <div className="data-backup-content">
                  <span className="data-backup-label">
                    Backup
                  </span>

                  <h2>
                    Exportar meus dados
                  </h2>

                  <p>
                    Baixe um arquivo JSON
                    com seus dados do
                    planner, incluindo
                    agendas, páginas,
                    tarefas, eventos,
                    estudos, projetos,
                    templates e
                    configurações.
                  </p>

                  <div className="data-backup-note">
                    <strong>
                      Importante:
                    </strong>

                    <span>
                      imagens e outros
                      arquivos enviados
                      não ficam incorporados
                      dentro do JSON.
                    </span>
                  </div>
                </div>


                <button
                  type="button"
                  className="data-export-button"
                  disabled={
                    isExporting
                  }
                  onClick={() => {
                    void handleExportData()
                  }}
                >
                  {isExporting
                    ? 'Preparando...'
                    : 'Baixar backup'}
                </button>
              </div>
            </section>
          </>
        )}
    </main>
  )
}


export default DataPage