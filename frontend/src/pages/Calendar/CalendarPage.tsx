import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import {
  apiRequest,
  API_URL,
} from '../../services/api'

import './CalendarPage.css'
import SubjectPicker from '../../components/SubjectPicker'


type EventFromApi = {
  subject_id: number | null
  id: number
  user_id: number
  title: string
  description: string
  starts_at: string
  ends_at: string | null
  all_day: boolean
  reminder_minutes: number | null
  created_at: string
}


type TaskFromApi = {
  id: number
  user_id: number
  page_id: number | null
  project_id: number | null
  category_id: number | null
  text: string
  description: string
  done: boolean
  due_date: string | null
  due_at: string | null
  priority:
    | 'low'
    | 'medium'
    | 'high'
  show_in_calendar: boolean
  created_at: string
  updated_at: string | null
}


type CalendarEvent = {
  subject_id: number | null
  id: number
  title: string
  description: string
  startsAt: string
  endsAt: string | null
  allDay: boolean
  reminderMinutes: number | null
}


type CalendarTask = {
  id: number
  text: string
  done: boolean
  dueDate: string
  priority:
    | 'low'
    | 'medium'
    | 'high'
}

type CreativeText = {
  id: string
  text: string
  x: number
  y: number
  plain?: boolean
}

type CreativeSticker = {
  id: string
  mediaId: number
  fileUrl: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

type MonthCreative = {
  texts: CreativeText[]
  stickers: CreativeSticker[]
}

type CreativeSettings = Record<string, MonthCreative>

type ProfileSettingsResponse = {
  settings?: Record<string, unknown>
}

type StickerMedia = {
  id: number
  file_url: string
  name: string
}


type PushStatus =
  | 'checking'
  | 'disabled'
  | 'enabling'
  | 'enabled'
  | 'disabling'
  | 'error'


type VapidKeyResponse = {
  public_key: string
}


const WEEK_DAYS = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
]


const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]


function formatDateKey(
  date: Date,
) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    )

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    )

  return `${year}-${month}-${day}`
}


function isDateKey(
  value: string | null,
) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
}


function dateFromKey(
  value: string,
) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}


function getEventDateKey(
  event: CalendarEvent,
) {
  if (event.allDay) {
    return event.startsAt.slice(0, 10)
  }

  return formatDateKey(new Date(event.startsAt))
}

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function mediaUrl(fileUrl: string) {
  if (/^(https?:|data:|blob:)/.test(fileUrl)) return fileUrl
  return `${API_URL}${fileUrl}`
}

function emptyMonthCreative(): MonthCreative {
  return { texts: [], stickers: [] }
}


function convertVapidKey(
  base64String: string,
): ArrayBuffer {
  const padding =
    '='.repeat(
      (
        4
        - (
          base64String.length
          % 4
        )
      ) % 4,
    )

  const base64 =
    (
      base64String
      + padding
    )
      .replace(
        /-/g,
        '+',
      )
      .replace(
        /_/g,
        '/',
      )

  const rawData =
    window.atob(
      base64,
    )

  const bytes =
    new Uint8Array(
      rawData.length,
    )

  for (
    let index = 0;
    index < rawData.length;
    index += 1
  ) {
    bytes[index] =
      rawData.charCodeAt(
        index,
      )
  }

  return bytes.buffer
}


function CalendarPage() {
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const navigate =
    useNavigate()
  const [searchParams] =
    useSearchParams()


  const today =
    useMemo(
      () => new Date(),
      [],
    )

  const requestedDate =
    searchParams.get('date')

  const initialDate =
    isDateKey(requestedDate)
      ? dateFromKey(requestedDate as string)
      : today


  const [
    currentDate,
    setCurrentDate,
  ] = useState(
    new Date(
      initialDate.getFullYear(),
      initialDate.getMonth(),
      1,
    ),
  )


  const [
    events,
    setEvents,
  ] =
    useState<
      CalendarEvent[]
    >([])


  const [
    tasks,
    setTasks,
  ] =
    useState<
      CalendarTask[]
    >([])

  const [creativeByMonth, setCreativeByMonth] =
    useState<CreativeSettings>({})
  const [stickerMedia, setStickerMedia] =
    useState<StickerMedia[]>([])
  const [creativeText, setCreativeText] =
    useState('')
  const [isSavingCreative, setIsSavingCreative] =
    useState(false)
  const creativeDragRef =
    useRef<{ kind: 'text' | 'sticker'; id: string; offsetX: number; offsetY: number; x: number; y: number } | null>(null)


  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    formatDateKey(initialDate),
  )


  const [
    editingEventId,
    setEditingEventId,
  ] =
    useState<
      number | null
    >(null)


  const [
    title,
    setTitle,
  ] =
    useState('')


  const [
    description,
    setDescription,
  ] =
    useState('')


  const [
    time,
    setTime,
  ] =
    useState(
      '09:00',
    )


  const [
    allDay,
    setAllDay,
  ] =
    useState(false)


  const [
    reminderMinutes,
    setReminderMinutes,
  ] =
    useState('')


  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)


  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false)


  const [
    pushStatus,
    setPushStatus,
  ] =
    useState<PushStatus>(
      'checking',
    )


  const getPushRegistration =
    useCallback(
      async () => {
        const registration =
          await navigator
            .serviceWorker
            .register(
              '/push-sw.js',
            )

        await navigator
          .serviceWorker
          .ready

        return registration
      },
      [],
    )


  const refreshPushStatus =
    useCallback(
      async () => {
        if (
          !(
            'serviceWorker'
            in navigator
          )
          || !(
            'PushManager'
            in window
          )
          || !(
            'Notification'
            in window
          )
        ) {
          setPushStatus(
            'error',
          )

          return
        }

        try {
          const registration =
            await getPushRegistration()

          const subscription =
            await registration
              .pushManager
              .getSubscription()

          if (
            Notification.permission
              === 'granted'
            && subscription
          ) {
            setPushStatus(
              'enabled',
            )
          } else {
            setPushStatus(
              'disabled',
            )
          }
        } catch (error) {
          console.error(
            error,
          )

          setPushStatus(
            'error',
          )
        }
      },
      [
        getPushRegistration,
      ],
    )


  useEffect(() => {
    const timeoutId =
      window.setTimeout(
        () => {
          void refreshPushStatus()
        },
        0,
      )

    return () => {
      window.clearTimeout(
        timeoutId,
      )
    }
  }, [
    refreshPushStatus,
  ])


  useEffect(() => {
    let cancelled =
      false


    async function loadCalendar() {
      try {
        const [
          eventsData,
          tasksData,
          profileData,
          stickersData,
        ] =
          await Promise.all([
            apiRequest<
              EventFromApi[]
            >(
              '/events',
            ),

            apiRequest<
              TaskFromApi[]
            >(
              '/tasks',
            ),

            apiRequest<ProfileSettingsResponse>('/profile'),
            apiRequest<StickerMedia[]>('/library/media?media_type=sticker'),
          ])


        if (cancelled) {
          return
        }


        const convertedEvents =
          eventsData.map(
            (
              event,
            ): CalendarEvent => ({
              id:
                event.id,
              subject_id: event.subject_id,

              title:
                event.title,

              description:
                event.description,

              startsAt:
                event.starts_at,

              endsAt:
                event.ends_at,

              allDay:
                event.all_day,

              reminderMinutes:
                event.reminder_minutes,
            }),
          )


        const calendarTasks =
          tasksData
            .filter(
              (
                task,
              ): task is (
                TaskFromApi
                & {
                  due_date: string
                }
              ) =>
                task.show_in_calendar
                && task.due_date
                  !== null,
            )
            .map(
              (
                task,
              ): CalendarTask => ({
                id:
                  task.id,

                text:
                  task.text,

                done:
                  task.done,

                dueDate:
                  task.due_date,

                priority:
                  task.priority,
              }),
            )


        setEvents(
          convertedEvents,
        )

        setTasks(
          calendarTasks,
        )

        const storedCreative =
          profileData.settings?.calendar_creative

        if (storedCreative && typeof storedCreative === 'object') {
          setCreativeByMonth(storedCreative as CreativeSettings)
        }
        setStickerMedia(stickersData)
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
          alert(
            error.message,
          )
        } else {
          alert(
            'Não foi possível carregar o calendário.',
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


    void loadCalendar()


    return () => {
      cancelled = true
    }
  }, [])


  async function enableNotifications() {
    if (
      !(
        'serviceWorker'
        in navigator
      )
      || !(
        'PushManager'
        in window
      )
      || !(
        'Notification'
        in window
      )
    ) {
      alert(
        'Este navegador não suporta notificações push.',
      )

      setPushStatus(
        'error',
      )

      return
    }


    try {
      setPushStatus(
        'enabling',
      )


      const permission =
        await Notification
          .requestPermission()


      if (
        permission
        !== 'granted'
      ) {
        setPushStatus(
          'disabled',
        )

        alert(
          'As notificações não foram autorizadas no navegador.',
        )

        return
      }


      const registration =
        await getPushRegistration()


      let subscription =
        await registration
          .pushManager
          .getSubscription()


      if (!subscription) {
        const vapid =
          await apiRequest<
            VapidKeyResponse
          >(
            '/notifications/vapid-public-key',
          )


        subscription =
          await registration
            .pushManager
            .subscribe({
              userVisibleOnly:
                true,

              applicationServerKey:
                convertVapidKey(
                  vapid.public_key,
                ),
            })
      }


      const subscriptionJson =
        subscription
          .toJSON()


      if (
        !subscriptionJson.endpoint
        || !subscriptionJson.keys
        || !subscriptionJson
          .keys.p256dh
        || !subscriptionJson
          .keys.auth
      ) {
        throw new Error(
          'O navegador não forneceu uma inscrição push válida.',
        )
      }


      await apiRequest(
        '/notifications/subscribe',
        {
          method:
            'POST',

          body:
            JSON.stringify({
              endpoint:
                subscriptionJson
                  .endpoint,

              keys: {
                p256dh:
                  subscriptionJson
                    .keys
                    .p256dh,

                auth:
                  subscriptionJson
                    .keys
                    .auth,
              },
            }),
        },
      )


      setPushStatus(
        'enabled',
      )


      await apiRequest(
        '/notifications/test',
        {
          method:
            'POST',
        },
      )


      alert(
        'Lembretes reais ativados! Enviei uma notificação de teste. 🔔',
      )
    } catch (error) {
      console.error(
        error,
      )

      setPushStatus(
        'error',
      )

      if (
        error instanceof Error
      ) {
        alert(
          error.message,
        )
      } else {
        alert(
          'Não foi possível ativar as notificações.',
        )
      }
    }
  }


  async function disableNotifications() {
    if (
      !(
        'serviceWorker'
        in navigator
      )
    ) {
      return
    }


    try {
      setPushStatus(
        'disabling',
      )


      const registration =
        await getPushRegistration()


      const subscription =
        await registration
          .pushManager
          .getSubscription()


      if (subscription) {
        await apiRequest<void>(
          '/notifications/subscribe',
          {
            method:
              'DELETE',

            body:
              JSON.stringify({
                endpoint:
                  subscription.endpoint,
              }),
          },
        )


        await subscription
          .unsubscribe()
      }


      setPushStatus(
        'disabled',
      )


      alert(
        'Lembretes desativados neste navegador.',
      )
    } catch (error) {
      console.error(
        error,
      )

      setPushStatus(
        'error',
      )

      if (
        error instanceof Error
      ) {
        alert(
          error.message,
        )
      } else {
        alert(
          'Não foi possível desativar as notificações.',
        )
      }
    }
  }


  const year =
    currentDate
      .getFullYear()


  const month =
    currentDate
      .getMonth()


  const firstDay =
    new Date(
      year,
      month,
      1,
    ).getDay()


  const daysInMonth =
    new Date(
      year,
      month + 1,
      0,
    ).getDate()


  const calendarCells =
    Array.from(
      {
        length:
          firstDay
          + daysInMonth,
      },
      (
        _,
        index,
      ) => {
        if (
          index < firstDay
        ) {
          return null
        }

        return (
          index
          - firstDay
          + 1
        )
      },
    )

  const monthKey = getMonthKey(year, month)
  const currentCreative = creativeByMonth[monthKey] ?? emptyMonthCreative()
  const [freeWriting, setFreeWriting] = useState(false)
  const [focusedCreativeId, setFocusedCreativeId] = useState<string | null>(null)
  const creativeInputRef = useRef<HTMLSpanElement | null>(null)
  const creativePress = useRef<{ x: number; y: number } | null>(null)
  const creativeSaveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const creativeSaveCount = useRef(0)

  useEffect(() => {
    creativeInputRef.current?.focus()
  }, [focusedCreativeId])

  function writeAtCalendarPoint(event: ReactMouseEvent<HTMLDivElement>) {
    if (!freeWriting || (event.target as Element).closest('.calendar-creative-note, .calendar-creative-sticker')) return
    event.preventDefault()
    event.stopPropagation()
    if (creativePress.current && Math.hypot(event.clientX - creativePress.current.x, event.clientY - creativePress.current.y) > 5) return
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    const rect = event.currentTarget.getBoundingClientRect()
    const id = crypto.randomUUID()
    const item: CreativeText = {
      id, text: '', plain: true,
      x: Math.max(0, Math.min(96, (event.clientX - rect.left) / rect.width * 100)),
      y: Math.max(0, Math.min(96, (event.clientY - rect.top) / rect.height * 100)),
    }
    setCreativeByMonth(current => {
      const monthData = current[monthKey] ?? emptyMonthCreative()
      return { ...current, [monthKey]: { ...monthData, texts: [...monthData.texts, item] } }
    })
    setFocusedCreativeId(id)
  }

  async function persistCreative(next: MonthCreative) {
    const nextCreative = { ...creativeByMonth, [monthKey]: next }
    setCreativeByMonth(nextCreative)
    setIsSavingCreative(true)
    creativeSaveCount.current += 1
    try {
      const save = creativeSaveQueue.current.catch(() => undefined).then(() => apiRequest('/profile/settings', {
        method: 'PATCH',
        body: JSON.stringify({ settings: { calendar_creative: nextCreative } }),
      }))
      creativeSaveQueue.current = save
      await save
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Não foi possível salvar a decoração.')
    } finally {
      creativeSaveCount.current -= 1
      setIsSavingCreative(creativeSaveCount.current > 0)
    }
  }

  function addCreativeText() {
    const value = creativeText.trim()
    if (!value) return
    const day = Number(selectedDate.slice(-2))
    const index = firstDay + day - 1
    void persistCreative({
      ...currentCreative,
      texts: [...currentCreative.texts, { id: crypto.randomUUID(), text: value, x: ((index % 7) / 7) * 100 + 1, y: (Math.floor(index / 7) / 6) * 100 + 8 }],
    })
    setCreativeText('')
  }

  function addSticker(media: StickerMedia) {
    void persistCreative({
      ...currentCreative,
      stickers: [...currentCreative.stickers, { id: crypto.randomUUID(), mediaId: media.id, fileUrl: media.file_url, x: 12, y: 12, width: 52, height: 52, zIndex: currentCreative.stickers.length + 1 }],
    })
  }

  function removeCreativeText(id: string) {
    void persistCreative({ ...currentCreative, texts: currentCreative.texts.filter(item => item.id !== id) })
  }

  function removeSticker(id: string) {
    void persistCreative({ ...currentCreative, stickers: currentCreative.stickers.filter(item => item.id !== id) })
  }

  function startCreativeDrag(kind: 'text' | 'sticker', id: string, event: ReactPointerEvent<HTMLElement>) {
    event.stopPropagation()
    if ((event.target as Element).closest('button')) return

    const item = kind === 'text'
      ? currentCreative.texts.find(candidate => candidate.id === id)
      : currentCreative.stickers.find(candidate => candidate.id === id)

    const layer = event.currentTarget.parentElement
    if (!item || !layer) return

    const rect = layer.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const pointerX = ((event.clientX - rect.left) / rect.width) * 100
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100

    creativeDragRef.current = {
      kind,
      id,
      offsetX: pointerX - item.x,
      offsetY: pointerY - item.y,
      x: item.x,
      y: item.y,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveCreative(event: ReactPointerEvent<HTMLElement>) {
    const drag = creativeDragRef.current
    if (!drag) return

    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const pointerX = ((event.clientX - rect.left) / rect.width) * 100
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100
    const x = Math.max(0, Math.min(94, pointerX - drag.offsetX))
    const y = Math.max(0, Math.min(94, pointerY - drag.offsetY))

    drag.x = x
    drag.y = y

    setCreativeByMonth(current => {
      const monthData = current[monthKey] ?? emptyMonthCreative()

      return {
        ...current,
        [monthKey]: {
          ...monthData,
          ...(drag.kind === 'text'
            ? {
                texts: monthData.texts.map(item =>
                  item.id === drag.id ? { ...item, x, y } : item,
                ),
              }
            : {
                stickers: monthData.stickers.map(item =>
                  item.id === drag.id ? { ...item, x, y } : item,
                ),
              }),
        },
      }
    })
  }

  function finishCreativeDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = creativeDragRef.current
    if (!drag) return

    creativeDragRef.current = null

    const next = drag.kind === 'text'
      ? {
          ...currentCreative,
          texts: currentCreative.texts.map(item =>
            item.id === drag.id
              ? { ...item, x: drag.x, y: drag.y }
              : item,
          ),
        }
      : {
          ...currentCreative,
          stickers: currentCreative.stickers.map(item =>
            item.id === drag.id
              ? { ...item, x: drag.x, y: drag.y }
              : item,
          ),
        }

    void persistCreative(next)
    event.stopPropagation()
  }


  function resetEventForm() {
    setEditingEventId(
      null,
    )

    setTitle('')
    setSubjectId(null)
    setDescription('')
    setTime('09:00')
    setAllDay(false)
    setReminderMinutes('')
  }


  function previousMonth() {
    const nextMonthDate =
      new Date(
        year,
        month - 1,
        1,
      )

    setCurrentDate(
      nextMonthDate,
    )

    setSelectedDate(
      formatDateKey(nextMonthDate),
    )

    resetEventForm()
  }


  function nextMonth() {
    const nextMonthDate =
      new Date(
        year,
        month + 1,
        1,
      )

    setCurrentDate(
      nextMonthDate,
    )

    setSelectedDate(
      formatDateKey(nextMonthDate),
    )

    resetEventForm()
  }


  function goToToday() {
    setCurrentDate(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ),
    )

    setSelectedDate(
      formatDateKey(
        today,
      ),
    )

    resetEventForm()
  }


  function selectDay(
    day: number,
  ) {
    const date =
      new Date(
        year,
        month,
        day,
      )

    setSelectedDate(
      formatDateKey(
        date,
      ),
    )

    resetEventForm()
  }


  function getEventsForDay(
    day: number,
  ) {
    const date =
      new Date(
        year,
        month,
        day,
      )

    const dateKey =
      formatDateKey(
        date,
      )

    return events.filter(
      (event) => {
        return (
          getEventDateKey(event)
          === dateKey
        )
      },
    )
  }


  function getTasksForDay(
    day: number,
  ) {
    const date =
      new Date(
        year,
        month,
        day,
      )

    const dateKey =
      formatDateKey(
        date,
      )

    return tasks.filter(
      (task) =>
        task.dueDate
        === dateKey,
    )
  }


  async function saveEvent() {
    if (
      title.trim()
      === ''
    ) {
      alert(
        'Digite o título do evento.',
      )

      return
    }


    try {
      setIsSaving(
        true,
      )


      const localDateTime =
        allDay
          ? `${selectedDate}T12:00`
          : `${selectedDate}T${time}`


      const startsAt =
        new Date(
          localDateTime,
        ).toISOString()

      const existingEvent = events.find(event => event.id === editingEventId)
      const endsAt = existingEvent?.endsAt
        ? new Date(new Date(startsAt).getTime() + new Date(existingEvent.endsAt).getTime() - new Date(existingEvent.startsAt).getTime()).toISOString()
        : null


      const body =
        JSON.stringify({
          title:
            title.trim(),

          description:
            description.trim(),

          starts_at:
            startsAt,
          subject_id: subjectId,

          ends_at:
            endsAt,

          all_day:
            allDay,

          reminder_minutes:
            reminderMinutes === ''
              ? null
              : Number(
                  reminderMinutes,
                ),
        })


      if (
        editingEventId
        !== null
      ) {
        const updated =
          await apiRequest<
            EventFromApi
          >(
            `/events/${editingEventId}`,
            {
              method:
                'PATCH',

              body,
            },
          )


        setEvents(
          (
            currentEvents,
          ) =>
            currentEvents.map(
              (event) =>
                event.id
                  === updated.id
                  ? {
                      id:
                        updated.id,
              subject_id: updated.subject_id,

                      title:
                        updated.title,

                      description:
                        updated.description,

                      startsAt:
                        updated.starts_at,

                      endsAt:
                        updated.ends_at,

                      allDay:
                        updated.all_day,

                      reminderMinutes:
                        updated
                          .reminder_minutes,
                    }
                  : event,
            ),
        )
      } else {
        const created =
          await apiRequest<
            EventFromApi
          >(
            '/events',
            {
              method:
                'POST',

              body,
            },
          )


        setEvents(
          (
            currentEvents,
          ) => [
            ...currentEvents,
            {
              id:
                created.id,
              subject_id: created.subject_id,

              title:
                created.title,

              description:
                created.description,

              startsAt:
                created.starts_at,

              endsAt:
                created.ends_at,

              allDay:
                created.all_day,

              reminderMinutes:
                created
                  .reminder_minutes,
            },
          ],
        )
      }


      resetEventForm()
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
          'Não foi possível salvar o evento.',
        )
      }
    } finally {
      setIsSaving(
        false,
      )
    }
  }


  function startEditingEvent(
    event: CalendarEvent,
  ) {
    setSubjectId(event.subject_id ?? null)
    const eventDate =
      new Date(
        event.startsAt,
      )


    setEditingEventId(
      event.id,
    )


    setSelectedDate(
      formatDateKey(
        eventDate,
      ),
    )


    setCurrentDate(
      new Date(
        eventDate
          .getFullYear(),

        eventDate
          .getMonth(),

        1,
      ),
    )


    setTitle(
      event.title,
    )


    setDescription(
      event.description,
    )


    setAllDay(
      event.allDay,
    )


    setReminderMinutes(
      event.reminderMinutes
        === null
        ? ''
        : String(
            event.reminderMinutes,
          ),
    )


    const hours =
      String(
        eventDate
          .getHours(),
      ).padStart(
        2,
        '0',
      )


    const minutes =
      String(
        eventDate
          .getMinutes(),
      ).padStart(
        2,
        '0',
      )


    setTime(
      `${hours}:${minutes}`,
    )
  }


  async function deleteEvent(
    eventId: number,
  ) {
    const confirmed =
      window.confirm(
        'Excluir este evento?',
      )


    if (!confirmed) {
      return
    }


    try {
      await apiRequest<void>(
        `/events/${eventId}`,
        {
          method:
            'DELETE',
        },
      )


      setEvents(
        (
          currentEvents,
        ) =>
          currentEvents.filter(
            (event) =>
              event.id
              !== eventId,
          ),
      )


      if (
        editingEventId
        === eventId
      ) {
        resetEventForm()
      }
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
          'Não foi possível excluir o evento.',
        )
      }
    }
  }


  async function toggleTask(
    task: CalendarTask,
  ) {
    const nextDone =
      !task.done


    setTasks(
      (
        currentTasks,
      ) =>
        currentTasks.map(
          (
            currentTask,
          ) =>
            currentTask.id
              === task.id
              ? {
                  ...currentTask,
                  done:
                    nextDone,
                }
              : currentTask,
        ),
    )


    try {
      const updated =
        await apiRequest<
          TaskFromApi
        >(
          `/tasks/${task.id}`,
          {
            method:
              'PATCH',

            body:
              JSON.stringify({
                done:
                  nextDone,
              }),
          },
        )


      setTasks(
        (
          currentTasks,
        ) =>
          currentTasks.map(
            (
              currentTask,
            ) =>
              currentTask.id
                === updated.id
                ? {
                    ...currentTask,

                    done:
                      updated.done,
                  }
                : currentTask,
          ),
      )
    } catch (error) {
      console.error(
        error,
      )


      setTasks(
        (
          currentTasks,
        ) =>
          currentTasks.map(
            (
              currentTask,
            ) =>
              currentTask.id
                === task.id
                ? task
                : currentTask,
          ),
      )


      if (
        error instanceof Error
      ) {
        alert(
          error.message,
        )
      } else {
        alert(
          'Não foi possível atualizar a tarefa.',
        )
      }
    }
  }


  const selectedEvents =
    events.filter(
      (event) => {
        return (
          getEventDateKey(event)
          === selectedDate
        )
      },
    )


  const selectedTasks =
    tasks.filter(
      (task) =>
        task.dueDate
        === selectedDate,
    )


  return (
    <main className="calendar-page">
      <header className="calendar-topbar">
        <button
          type="button"
          onClick={() =>
            navigate('/')
          }
        >
          ← Biblioteca
        </button>


        <h1>
          Calendário
        </h1>


        <div className="calendar-topbar-actions">
          <button
            type="button"
            disabled={
              pushStatus
                === 'checking'
              || pushStatus
                === 'enabling'
              || pushStatus
                === 'disabling'
            }
            onClick={() => {
              if (
                pushStatus
                === 'enabled'
              ) {
                void disableNotifications()
              } else {
                void enableNotifications()
              }
            }}
            title={
              pushStatus
                === 'enabled'
                ? 'Clique para desativar neste navegador'
                : 'Receber lembretes mesmo com a aba fechada'
            }
          >
            {
              pushStatus
                === 'checking'
                ? '🔔 Verificando...'
                : pushStatus
                    === 'enabling'
                  ? '🔔 Ativando...'
                  : pushStatus
                      === 'disabling'
                    ? '🔕 Desativando...'
                    : pushStatus
                        === 'enabled'
                      ? '🔔 Lembretes ativos'
                      : pushStatus
                          === 'error'
                        ? '⚠️ Ativar lembretes'
                        : '🔔 Ativar lembretes'
            }
          </button>


          <button
            type="button"
            onClick={
              goToToday
            }
          >
            Hoje
          </button>
        </div>
      </header>


      <section className="calendar-layout">
        <div className="calendar-main">
          <div className="calendar-month-header">
            <button
              type="button"
              onClick={
                previousMonth
              }
            >
              ‹
            </button>


            <h2>
              {
                MONTH_NAMES[
                  month
                ]
              }{' '}
              {year}
            </h2>


            <button
              type="button"
              onClick={
                nextMonth
              }
            >
              ›
            </button>
          </div>


          <div className="calendar-grid calendar-week">
            {WEEK_DAYS.map(
              (day) => (
                <div
                  key={day}
                  className="calendar-weekday"
                >
                  {day}
                </div>
              ),
            )}
          </div>


          <div className={`calendar-grid calendar-days ${freeWriting ? 'is-free-writing' : ''}`}
            onClickCapture={writeAtCalendarPoint}
            onPointerDownCapture={event => {
              creativePress.current = { x: event.clientX, y: event.clientY }
              if (freeWriting && !(event.target as Element).closest('.calendar-creative-note, .calendar-creative-sticker')) {
                event.preventDefault()
                event.stopPropagation()
              }
            }}>
            {calendarCells.map(
              (
                day,
                index,
              ) => {
                if (
                  day === null
                ) {
                  return (
                    <div
                      key={
                        `empty-${index}`
                      }
                      className="calendar-day empty"
                    />
                  )
                }


                const date =
                  new Date(
                    year,
                    month,
                    day,
                  )


                const dateKey =
                  formatDateKey(
                    date,
                  )


                const dayEvents =
                  getEventsForDay(
                    day,
                  )


                const dayTasks =
                  getTasksForDay(
                    day,
                  )


                const isToday =
                  dateKey
                  === formatDateKey(
                    today,
                  )


                const isSelected =
                  dateKey
                  === selectedDate


                return (
                  <button
                    key={
                      dateKey
                    }
                    type="button"
                    className={
                      [
                        'calendar-day',

                        isToday
                          ? 'today'
                          : '',

                        isSelected
                          ? 'selected'
                          : '',
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(' ')
                    }
                    onClick={() =>
                      selectDay(
                        day,
                      )
                    }
                  >
                    <span className="day-number">
                      {day}
                    </span>


                    <div className="day-events">
                      {dayEvents
                        .slice(
                          0,
                          2,
                        )
                        .map(
                          (
                            event,
                          ) => (
                            <span
                              key={
                                `event-${event.id}`
                              }
                              className="day-event"
                            >
                              {event.allDay
                                ? ''
                                : `${new Date(
                                    event.startsAt,
                                  ).toLocaleTimeString(
                                    'pt-BR',
                                    {
                                      hour:
                                        '2-digit',

                                      minute:
                                        '2-digit',
                                    },
                                  )} `}

                              {
                                event.title
                              }
                            </span>
                          ),
                        )}


                      {dayTasks
                        .slice(
                          0,
                          Math.max(
                            0,
                            3
                            - dayEvents.length,
                          ),
                        )
                        .map(
                          (
                            task,
                          ) => (
                            <span
                              key={
                                `task-${task.id}`
                              }
                              className={
                                task.done
                                  ? 'day-event task-event done'
                                  : 'day-event task-event'
                              }
                            >
                              ✓ {task.text}
                            </span>
                          ),
                        )}


                      {(
                        dayEvents.length
                        + dayTasks.length
                      ) > 3 && (
                        <small>
                          +
                          {
                            dayEvents.length
                            + dayTasks.length
                            - 3
                          } itens
                        </small>
                      )}
                    </div>
                  </button>
                )
              },
            )}
            <div
              className="calendar-creative-layer"
              onPointerMove={moveCreative}
              onPointerUp={finishCreativeDrag}
              onPointerCancel={finishCreativeDrag}
            >
              {currentCreative.texts.map(item => (
                <div
                  key={item.id}
                  className={`calendar-creative-note ${item.plain ? 'calendar-free-text' : ''}`}
                  style={{ left: `${item.x}%`, top: `${item.y}%`, zIndex: Math.max(0, ...currentCreative.stickers.map(sticker => sticker.zIndex)) + 1 }}
                  onPointerDown={event => startCreativeDrag('text', item.id, event)}
                >
                  <span
                    ref={item.id === focusedCreativeId ? creativeInputRef : undefined}
                    role="textbox"
                    aria-label="Texto livre do calendário"
                    aria-multiline="true"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={event => {
                      const text = event.currentTarget.innerText
                      if (!text.trim()) removeCreativeText(item.id)
                      else if (text !== item.text) void persistCreative({ ...currentCreative, texts: currentCreative.texts.map(candidate => candidate.id === item.id ? { ...candidate, text } : candidate) })
                    }}
                    onPointerDown={event => event.stopPropagation()}
                    onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') event.currentTarget.blur() }}
                  >{item.text}</span>
                  <button type="button" aria-label="Excluir anotação" onClick={event => { event.stopPropagation(); removeCreativeText(item.id) }}>×</button>
                </div>
              ))}
              {currentCreative.stickers.map(item => (
                <div
                  key={item.id}
                  className="calendar-creative-sticker"
                  style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}px`, height: `${item.height}px`, zIndex: item.zIndex }}
                  onPointerDown={event => startCreativeDrag('sticker', item.id, event)}
                >
                  <img src={mediaUrl(item.fileUrl)} alt="" draggable={false} />
                  <button type="button" aria-label="Reduzir sticker" onClick={event => { event.stopPropagation(); void persistCreative({ ...currentCreative, stickers: currentCreative.stickers.map(candidate => candidate.id === item.id ? { ...candidate, width: Math.max(28, candidate.width - 12), height: Math.max(28, candidate.height - 12) } : candidate) }) }}>−</button>
                  <button type="button" aria-label="Aumentar sticker" onClick={event => { event.stopPropagation(); void persistCreative({ ...currentCreative, stickers: currentCreative.stickers.map(candidate => candidate.id === item.id ? { ...candidate, width: Math.min(120, candidate.width + 12), height: Math.min(120, candidate.height + 12) } : candidate) }) }}>+</button>
                  <button type="button" aria-label="Excluir sticker" onClick={event => { event.stopPropagation(); removeSticker(item.id) }}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>


        <aside className="calendar-sidebar">
          <h2>
            {new Date(
              `${selectedDate}T12:00`,
            ).toLocaleDateString(
              'pt-BR',
              {
                day:
                  '2-digit',

                month:
                  'long',

                year:
                  'numeric',
              },
            )}
          </h2>

          <section className="calendar-creative-panel" aria-label="Decoração do mês">
            <div className="creative-panel-heading">
              <div>
                <span>PLANNER LIVRE</span>
                <h3>Decorar {MONTH_NAMES[month]}</h3>
              </div>
              <small>{isSavingCreative ? 'Salvando...' : `${currentCreative.texts.length + currentCreative.stickers.length} elementos`}</small>
            </div>
            <div className="creative-note-create">
              <button type="button" aria-pressed={freeWriting} onClick={() => setFreeWriting(value => !value)}>
                {freeWriting ? 'Concluir escrita livre' : 'Escrever em qualquer lugar'}
              </button>
            </div>
            {freeWriting && <p>Clique no calendário ou sobre um adesivo e escreva. O texto é salvo ao sair do campo.</p>}
            <div className="creative-note-create">
              <input value={creativeText} placeholder="Escreva uma nota..." onChange={event => setCreativeText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addCreativeText() }} />
              <button type="button" onClick={addCreativeText}>Adicionar</button>
            </div>
            <div className="creative-sticker-picker">
              <span>Adesivos salvos</span>
              {stickerMedia.length === 0 && <small>Nenhum sticker na biblioteca ainda.</small>}
              {stickerMedia.map(media => <button type="button" key={media.id} title={`Adicionar ${media.name}`} onClick={() => addSticker(media)}><img src={mediaUrl(media.file_url)} alt={media.name} /></button>)}
            </div>
          </section>


          <div className="event-form">
            <SubjectPicker value={subjectId} onChange={setSubjectId} />
            <h3>
              {editingEventId
                !== null
                ? 'Editar evento'
                : 'Novo evento'}
            </h3>


            {editingEventId
              !== null && (
              <p className="editing-banner">
                Você está editando um evento.
              </p>
            )}


            <label>
              Título

              <input
                type="text"
                value={
                  title
                }
                maxLength={
                  200
                }
                onChange={(
                  event,
                ) =>
                  setTitle(
                    event.target.value,
                  )
                }
              />
            </label>


            <label>
              Descrição

              <textarea
                value={
                  description
                }
                maxLength={
                  2000
                }
                onChange={(
                  event,
                ) =>
                  setDescription(
                    event.target.value,
                  )
                }
              />
            </label>


            <label className="event-checkbox">
              <input
                type="checkbox"
                checked={
                  allDay
                }
                onChange={(
                  event,
                ) =>
                  setAllDay(
                    event.target.checked,
                  )
                }
              />

              Dia inteiro
            </label>


            {!allDay && (
              <label>
                Horário

                <input
                  type="time"
                  value={
                    time
                  }
                  onChange={(
                    event,
                  ) =>
                    setTime(
                      event.target.value,
                    )
                  }
                />
              </label>
            )}


            <label>
              Lembrete

              <select
                value={
                  reminderMinutes
                }
                onChange={(
                  event,
                ) =>
                  setReminderMinutes(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Sem lembrete
                </option>

                <option value="0">
                  Na hora do evento
                </option>

                <option value="10">
                  10 minutos antes
                </option>

                <option value="30">
                  30 minutos antes
                </option>

                <option value="60">
                  1 hora antes
                </option>

                <option value="1440">
                  1 dia antes
                </option>

                <option value="10080">
                  1 semana antes
                </option>
              </select>
            </label>


            <button
              type="button"
              className="create-event-button"
              disabled={
                isSaving
              }
              onClick={() => {
                void saveEvent()
              }}
            >
              {isSaving
                ? 'Salvando...'
                : editingEventId
                    !== null
                  ? 'Salvar alterações'
                  : 'Criar evento'}
            </button>


            {editingEventId
              !== null && (
              <button
                type="button"
                onClick={
                  resetEventForm
                }
              >
                Cancelar edição
              </button>
            )}
          </div>


          <div className="selected-events">
            <h3>
              Eventos do dia
            </h3>


            {isLoading && (
              <p>
                Carregando...
              </p>
            )}


            {!isLoading
              && selectedEvents.length
                === 0 && (
                <p className="no-events">
                  Nenhum evento.
                </p>
              )}


            {selectedEvents.map(
              (
                event,
              ) => (
                <article
                  key={
                    event.id
                  }
                  className="event-card"
                >
                  <div>
                    <strong>
                      {
                        event.title
                      }
                    </strong>

                    <span>
                      {event.allDay
                        ? 'Dia inteiro'
                        : new Date(
                            event.startsAt,
                          ).toLocaleTimeString(
                            'pt-BR',
                            {
                              hour:
                                '2-digit',

                              minute:
                                '2-digit',
                            },
                          )}
                    </span>

                    {event.description && (
                      <p>
                        {
                          event.description
                        }
                      </p>
                    )}
                  </div>


                  <div className="event-actions">
                    <button
                      type="button"
                      onClick={() =>
                        startEditingEvent(
                          event,
                        )
                      }
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void deleteEvent(
                          event.id,
                        )
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>


          <div className="selected-events">
            <h3>
              Tarefas do dia
            </h3>


            {isLoading && (
              <p>
                Carregando...
              </p>
            )}


            {!isLoading
              && selectedTasks.length
                === 0 && (
                <p className="no-events">
                  Nenhuma tarefa.
                </p>
              )}


            {selectedTasks.map(
              (
                task,
              ) => (
                <article
                  key={
                    task.id
                  }
                  className={
                    task.done
                      ? 'task-card done'
                      : 'task-card'
                  }
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={
                        task.done
                      }
                      onChange={() => {
                        void toggleTask(
                          task,
                        )
                      }}
                    />

                    <span>
                      {
                        task.text
                      }
                    </span>
                  </label>

                  <small>
                    Prioridade:{' '}
                    {task.priority
                      === 'high'
                      ? 'Alta'
                      : task.priority
                          === 'low'
                        ? 'Baixa'
                        : 'Média'}
                  </small>
                </article>
              ),
            )}
          </div>
        </aside>
      </section>
    </main>
  )
}


export default CalendarPage
