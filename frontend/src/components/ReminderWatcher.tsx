import {
  useEffect,
} from 'react'

import {
  apiRequest,
} from '../services/api'


type EventFromApi = {
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


const CHECK_INTERVAL =
  10 * 1000


const GRACE_PERIOD =
  5 * 60 * 1000


function getReminderKey(
  event: EventFromApi,
) {
  return [
    'planner-reminder',
    event.user_id,
    event.id,
    event.starts_at,
    event.reminder_minutes,
  ].join('-')
}


function ReminderWatcher() {
  useEffect(() => {
    let active = true


    async function checkReminders() {
      if (
        !('Notification' in window)
      ) {
        return
      }


      if (
        Notification.permission
        !== 'granted'
      ) {
        return
      }


      try {
        const events =
          await apiRequest<
            EventFromApi[]
          >(
            '/events',
          )


        if (!active) {
          return
        }


        const now =
          Date.now()


        for (
          const event
          of events
        ) {
          if (
            event.reminder_minutes
            === null
          ) {
            continue
          }


          const startsAt =
            new Date(
              event.starts_at,
            ).getTime()


          if (
            Number.isNaN(
              startsAt,
            )
          ) {
            continue
          }


          const reminderAt =
            startsAt
            - (
              event.reminder_minutes
              * 60
              * 1000
            )


          const notificationLimit =
            startsAt
            + GRACE_PERIOD


          const reminderKey =
            getReminderKey(
              event,
            )


          const wasNotified =
            localStorage.getItem(
              reminderKey,
            )


          if (wasNotified) {
            continue
          }


          const reminderReached =
            now >= reminderAt


          const stillUseful =
            now <= notificationLimit


          if (
            reminderReached
            && stillUseful
          ) {
            const startsAtDate =
              new Date(
                event.starts_at,
              )


            const timeText =
              startsAtDate
                .toLocaleTimeString(
                  'pt-BR',
                  {
                    hour:
                      '2-digit',

                    minute:
                      '2-digit',
                  },
                )


            try {
              new Notification(
                event.title,
                {
                  body:
                    event.all_day
                      ? 'Você tem um evento hoje.'
                      : `Começa às ${timeText}.`,
                },
              )


              localStorage.setItem(
                reminderKey,
                'sent',
              )
            } catch (
              error
            ) {
              console.error(
                'Erro ao mostrar notificação:',
                error,
              )
            }
          }
        }
      } catch (error) {
        console.error(
          'Erro ao verificar lembretes:',
          error,
        )
      }
    }


    void checkReminders()


    const intervalId =
      window.setInterval(
        () => {
          void checkReminders()
        },
        CHECK_INTERVAL,
      )


    function handleFocus() {
      void checkReminders()
    }


    function handleVisibilityChange() {
      if (
        document.visibilityState
        === 'visible'
      ) {
        void checkReminders()
      }
    }


    window.addEventListener(
      'focus',
      handleFocus,
    )


    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )


    return () => {
      active = false


      window.clearInterval(
        intervalId,
      )


      window.removeEventListener(
        'focus',
        handleFocus,
      )


      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [])


  return null
}


export default ReminderWatcher