import {

  Link,

  useParams,

  useSearchParams,

} from 'react-router-dom'

import {

  useEffect,

  useRef,

  useState,

} from 'react'

import { apiRequest } from '../../services/api'

import './AgendaPage.css'



const MAX_PAGES = 400



type TaskPriority =

  | 'low'

  | 'medium'

  | 'high'



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

  tasks: PlannerTask[]

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

  created_at: string

}



type PlannerFolder = {

  id: number

  title: string

  position: number

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



type PagePatch = {

  title?: string

  content?: string

  favorite?: boolean

}



type SaveStatus =

  | 'saved'

  | 'saving'

  | 'error'



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
      : Number(
          requestedPageParam,
        )

  const [agenda, setAgenda] =

    useState<Agenda | null>(null)

  const [pages, setPages] =

    useState<PlannerPage[]>([])

  const [

    folders,

    setFolders,

  ] = useState<PlannerFolder[]>([])

  const [

    activePageId,

    setActivePageId,

  ] = useState<number | null>(null)

  const [

    newTaskText,

    setNewTaskText,

  ] = useState('')

  const [

    newTaskDate,

    setNewTaskDate,

  ] = useState('')

  const [

    newTaskPriority,

    setNewTaskPriority,

  ] =

    useState<TaskPriority>('medium')

  const [

    isLoading,

    setIsLoading,

  ] = useState(true)

  const [

    loadError,

    setLoadError,

  ] = useState('')

  const [

    saveStatus,

    setSaveStatus,

  ] = useState<SaveStatus>('saved')



  const pendingUpdatesRef =

    useRef<

      Record<number, PagePatch>

    >({})

  const saveTimersRef =

    useRef<

      Record<

        number,

        ReturnType<typeof setTimeout>

      >

    >({})



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



        const pageIds =

          new Set(

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

            pageIds.has(

              task.page_id,

            ),

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

              tasks:

                tasksByPage.get(

                  page.id,

                ) ?? [],

            }),

          )



        setPages(

          convertedPages,

        )

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



  const activePage =

    pages.find(

      (page) =>

        page.id ===

        activePageId,

    )



  const sortedFolders =

    [...folders].sort(

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

      [...currentFolders]


    const currentFolder =

      reordered[currentIndex]


    const targetFolder =

      reordered[targetIndex]


    reordered[currentIndex] =

      targetFolder


    reordered[targetIndex] =

      currentFolder


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



  async function handleMovePage(

    pageId: number,

    folderId: number | null,

    direction: 'up' | 'down',

  ) {

    const groupPages =

      getPagesForFolder(

        folderId,

      )


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

      [...groupPages]


    const currentPage =

      reordered[currentIndex]


    const targetPage =

      reordered[targetIndex]


    reordered[currentIndex] =

      targetPage


    reordered[targetIndex] =

      currentPage


    try {

      const updatedPages =

        await apiRequest<

          PageFromApi[]

        >(

          `/agendas/${agendaId}/pages/reorder`,

          {

            method: 'PATCH',

            body: JSON.stringify({

              folder_id:

                folderId,

              page_ids:

                reordered.map(

                  (page) =>

                    page.id,

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

    } catch (error) {

      console.error(error)


      alert(

        'Não foi possível reordenar as páginas.',

      )

    }

  }



  function renderPageButton(

    page: PlannerPage,

  ) {

    const groupPages =

      getPagesForFolder(

        page.folderId,

      )


    const pageIndex =

      groupPages.findIndex(

        (currentPage) =>

          currentPage.id ===

          page.id,

      )


    const isFirst =

      pageIndex === 0


    const isLast =

      pageIndex ===

      groupPages.length - 1


    return (

      <div

        className="page-row"

        key={page.id}

      >

        <button

          className={

            page.id ===

            activePageId

              ? 'page-button active'

              : 'page-button'

          }

          type="button"

          onClick={() =>

            setActivePageId(

              page.id,

            )

          }

        >

          {page.favorite &&

            '★ '}

          {page.title ||

            'Sem título'}

        </button>


        <div className="page-order-actions">

          <button

            type="button"

            aria-label="Mover página para cima"

            title="Mover página para cima"

            disabled={isFirst}

            onClick={() =>

              void handleMovePage(

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

              void handleMovePage(

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

      clearTimeout(

        currentTimer,

      )

    }



    setSaveStatus(

      'saving',

    )



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

      pendingUpdatesRef

        .current[pageId]



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

        setSaveStatus(

          'saved',

        )

      }

    } catch (error) {

      console.error(error)

      setSaveStatus(

        'error',

      )

    }

  }



  async function handleCreatePage() {

    if (

      pages.length >=

      MAX_PAGES

    ) {

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

          tasks: [],

        }



      setPages(

        (currentPages) => [

          ...currentPages,

          convertedPage,

        ],

      )



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

                  title:

                    newTitle,

                }

              : page,

        ),

    )



    if (

      newTitle.trim() !== ''

    ) {

      queuePageUpdate(

        activePageId,

        {

          title:

            newTitle,

        },

      )

    }

  }



  function handleTitleBlur() {

    if (

      !activePage ||

      activePageId === null

    ) {

      return

    }



    if (

      activePage.title.trim() ===

      ''

    ) {

      const fallbackTitle =

        'Sem título'



      setPages(

        (currentPages) =>

          currentPages.map(

            (page) =>

              page.id ===

              activePageId

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

          title:

            fallbackTitle,

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



  async function handleToggleFavorite() {

    if (

      !activePage ||

      activePageId === null

    ) {

      return

    }



    const newFavoriteValue =

      !activePage.favorite



    setPages(

      (currentPages) =>

        currentPages.map(

          (page) =>

            page.id ===

            activePageId

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



      alert(

        'Não foi possível atualizar o favorito.',

      )



      setPages(

        (currentPages) =>

          currentPages.map(

            (page) =>

              page.id ===

              activePageId

                ? {

                    ...page,

                    favorite:

                      !newFavoriteValue,

                  }

                : page,

          ),

      )

    }

  }



  async function handleAddTask() {

    if (

      newTaskText.trim() ===

        '' ||

      activePageId === null

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

                newTaskDate ||

                null,

              priority:

                newTaskPriority,

            }),

          },

        )



      const convertedTask:

        PlannerTask = {

          id: createdTask.id,

          text:

            createdTask.text,

          done:

            createdTask.done,

          dueDate:

            createdTask.due_date ??

            '',

          priority:

            createdTask.priority,

        }



      setPages(

        (currentPages) =>

          currentPages.map(

            (page) =>

              page.id ===

              activePageId

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

      setNewTaskPriority(

        'medium',

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



  async function handleToggleTask(

    taskId: number,

  ) {

    if (!activePage) {

      return

    }



    const task =

      activePage.tasks.find(

        (item) =>

          item.id ===

          taskId,

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

            page.id ===

            activePageId

              ? {

                  ...page,

                  tasks:

                    page.tasks.map(

                      (

                        currentTask,

                      ) =>

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

            done:

              newDoneValue,

          }),

        },

      )

    } catch (error) {

      console.error(error)



      setPages(

        (currentPages) =>

          currentPages.map(

            (page) =>

              page.id ===

              activePageId

                ? {

                    ...page,

                    tasks:

                      page.tasks.map(

                        (

                          currentTask,

                        ) =>

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

    if (

      activePageId === null

    ) {

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

              page.id ===

              activePageId

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



  async function handleCreateFolder() {

    const title =

      window.prompt(

        'Nome da nova pasta:',

      )



    if (

      title === null

      || title.trim() === ''

    ) {

      return

    }



    try {

      const createdFolder =

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

            id: createdFolder.id,

            title:

              createdFolder.title,

            position:

              createdFolder.position,

          },

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

          'Não foi possível criar a pasta.',

        )

      }

    }

  }



  async function handleRenameFolder(

    folder: PlannerFolder,

  ) {

    const title =

      window.prompt(

        'Novo nome da pasta:',

        folder.title,

      )



    if (

      title === null

      || title.trim() === ''

      || title.trim() ===

        folder.title

    ) {

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

      } else {

        alert(

          'Não foi possível renomear a pasta.',

        )

      }

    }

  }



  async function handleDeleteFolder(

    folder: PlannerFolder,

  ) {

    const confirmed =

      window.confirm(

        `Excluir a pasta "${folder.title}"? As páginas dela voltarão para "Sem pasta".`,

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

    if (

      activePageId === null

    ) {

      return

    }



    try {

      const updatedPage =

        await apiRequest<PageFromApi>(

          `/pages/${activePageId}/folder`,

          {

            method: 'PATCH',

            body: JSON.stringify({

              folder_id:

                folderId,

            }),

          },

        )



      setPages(

        (currentPages) =>

          currentPages.map(

            (page) =>

              page.id ===

              activePageId

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



  async function handleDeletePage() {

    if (

      activePageId === null

    ) {

      return

    }



    if (

      pages.length <= 1

    ) {

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

            page.id !==

            activePageId,

        )



      delete pendingUpdatesRef

        .current[

          activePageId

        ]



      const timer =

        saveTimersRef.current[

          activePageId

        ]



      if (timer) {

        clearTimeout(timer)

        delete saveTimersRef

          .current[

            activePageId

          ]

      }



      setPages(

        remainingPages,

      )



      setActivePageId(

        remainingPages[0]?.id ??

          null,

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



  if (

    Number.isNaN(

      agendaId,

    )

  ) {

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



  if (

    loadError ||

    !agenda

  ) {

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

            <p>

              {loadError}

            </p>

          )}

        </section>

      </main>

    )

  }



  return (

    <main className="agenda-page">

      <aside className="agenda-sidebar">

        <Link

          className="back-link"

          to="/"

        >

          ← Biblioteca

        </Link>

        <h2>

          {agenda.title}

        </h2>

        <div className="pages-header">

          <span>

            {pages.length}/

            {MAX_PAGES}

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

              onClick={

                handleCreatePage

              }

            >

              + Página

            </button>

          </div>

        </div>



        <div className="folder-list">

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

                <section

                  className="folder-group"

                  key={folder.id}

                >

                  <div className="folder-group-header">

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

                        disabled={

                          folderIndex === 0

                        }

                        onClick={() =>

                          void handleMoveFolder(

                            folder.id,

                            'up',

                          )

                        }

                      >

                        ↑

                      </button>



                      <button

                        type="button"

                        aria-label={`Mover pasta ${folder.title} para baixo`}

                        title="Mover pasta para baixo"

                        disabled={

                          folderIndex ===

                          sortedFolders.length - 1

                        }

                        onClick={() =>

                          void handleMoveFolder(

                            folder.id,

                            'down',

                          )

                        }

                      >

                        ↓

                      </button>



                      <button

                        type="button"

                        aria-label={`Renomear pasta ${folder.title}`}

                        title="Renomear pasta"

                        onClick={() =>

                          void handleRenameFolder(

                            folder,

                          )

                        }

                      >

                        ✎

                      </button>



                      <button

                        type="button"

                        aria-label={`Excluir pasta ${folder.title}`}

                        title="Excluir pasta"

                        onClick={() =>

                          void handleDeleteFolder(

                            folder,

                          )

                        }

                      >

                        ×

                      </button>

                    </div>

                  </div>



                  <div className="folder-pages">

                    {folderPages.length > 0

                      ? folderPages.map(

                          renderPageButton,

                        )

                      : (

                        <span className="folder-empty-message">

                          Pasta vazia

                        </span>

                      )}

                  </div>

                </section>

              )

            },

          )}



          <section className="folder-group">

            <div className="folder-group-header">

              <span className="folder-group-title">

                📄 Sem pasta

              </span>

            </div>



            <div className="folder-pages">

              {getPagesForFolder(

                null,

              ).length > 0

                ? getPagesForFolder(

                    null,

                  ).map(

                    renderPageButton,

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

                value={

                  activePage.title

                }

                placeholder="Título da página"

                onChange={(event) =>

                  handleChangeTitle(

                    event.target.value,

                  )

                }

                onBlur={

                  handleTitleBlur

                }

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

                      key={

                        folder.id

                      }

                      value={

                        folder.id

                      }

                    >

                      📁 {folder.title}

                    </option>

                  ),

                )}

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

                onClick={

                  handleDeletePage

                }

              >

                Excluir página

              </button>

            </div>



            <section className="tasks-section">

              <h3>

                Tarefas

              </h3>



              <form

                className="task-form"

                onSubmit={(event) => {

                  event.preventDefault()

                  void handleAddTask()

                }}

              >

                <input

                  type="text"

                  value={

                    newTaskText

                  }

                  placeholder="Adicionar tarefa..."

                  onChange={(event) =>

                    setNewTaskText(

                      event.target.value,

                    )

                  }

                />



                <input

                  type="date"

                  value={

                    newTaskDate

                  }

                  onChange={(event) =>

                    setNewTaskDate(

                      event.target.value,

                    )

                  }

                />



                <select

                  value={

                    newTaskPriority

                  }

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

                            checked={

                              task.done

                            }

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

                              📅{' '}

                              {

                                task.dueDate

                              }

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



            <textarea

              className="page-content"

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
