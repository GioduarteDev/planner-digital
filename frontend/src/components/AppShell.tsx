import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import {
  Bell,
  CalendarDays,
  LogOut,
  UserRound,
  X,
} from 'lucide-react'

import {
  API_URL,
  PROFILE_UPDATED_EVENT,
  apiRequest,
  clearAuth,
  getStoredUser,
} from '../services/api'
import './AppShell.css'
import QuickCapture from './QuickCapture'


type ProfileFromApi = {
  id: number
  email: string
  name: string
  username: string | null
  profile_photo_url: string | null
}

type EventFromApi = {
  id: number
  title: string
  starts_at: string
  reminder_minutes: number | null
}

type StoredUser = {
  email?: string
  name?: string
  username?: string
}


const MATCHA_ICON = '/matcha-planner-icon.png'

const navigation = [
  { to: '/', label: 'Biblioteca', end: true },
  { to: '/inbox', label: 'Inbox' },
  { to: '/deadlines', label: 'Prazos' },
  { to: '/weekly-review', label: 'Revisão semanal' },
  { to: '/today', label: 'Hoje' },
  { to: '/calendar', label: 'Calendário' },
  { to: '/tasks', label: 'Tarefas' },
  { to: '/studies', label: 'Estudos' },
  { to: '/organization', label: 'Organização' },
  { to: '/stationery', label: 'Papelaria' },
  { to: '/data', label: 'Dados' },
  { to: '/profile', label: 'Perfil' },
]


function assetUrl(
  value: string | null | undefined,
) {
  if (!value) {
    return null
  }

  if (
    value.startsWith('http://')
    || value.startsWith('https://')
    || value.startsWith('blob:')
    || value.startsWith('data:')
  ) {
    return value
  }

  return `${API_URL}${value}`
}


function AppShell({
  children,
}: {
  children: ReactNode
}) {
  const location = useLocation()
  const navigate = useNavigate()

  const storedUser =
    getStoredUser() as StoredUser | null

  const [profile, setProfile] =
    useState<ProfileFromApi | null>(null)
  const [
    upcomingReminders,
    setUpcomingReminders,
  ] = useState<EventFromApi[]>([])
  const [profileOpen, setProfileOpen] =
    useState(false)
  const [remindersOpen, setRemindersOpen] =
    useState(false)
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | 'unsupported'>(
      typeof window !== 'undefined'
      && 'Notification' in window
        ? Notification.permission
        : 'unsupported',
    )
  const shellActionsRef = useRef<HTMLDivElement | null>(null)

  const isLibrary =
    location.pathname === '/'

  useEffect(() => {
    let cancelled = false

    async function loadShellData() {
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
              if (
                event.reminder_minutes
                === null
              ) {
                return false
              }

              const startsAt =
                new Date(
                  event.starts_at,
                ).getTime()

              return !Number.isNaN(
                startsAt,
              )
                && startsAt >= now
            })
            .sort(
              (a, b) =>
                new Date(
                  a.starts_at,
                ).getTime()
                - new Date(
                  b.starts_at,
                ).getTime(),
            ),
        )
      } catch (error) {
        if (!cancelled) {
          console.error(
            'Não foi possível atualizar os dados do cabeçalho:',
            error,
          )
        }
      }
    }

    void loadShellData()

    function refreshOnReturn() {
      void loadShellData()
    }

    function refreshProfile(event: Event) {
      const updatedProfile =
        (event as CustomEvent<ProfileFromApi>).detail

      if (updatedProfile && typeof updatedProfile === 'object') {
        setProfile(updatedProfile)
      } else {
        void loadShellData()
      }
    }

    function closeMenus(event: MouseEvent) {
      if (
        shellActionsRef.current
        && !shellActionsRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false)
        setRemindersOpen(false)
      }
    }

    function closeMenusOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileOpen(false)
        setRemindersOpen(false)
      }
    }

    window.addEventListener('focus', refreshOnReturn)
    window.addEventListener(PROFILE_UPDATED_EVENT, refreshProfile)
    document.addEventListener('visibilitychange', refreshOnReturn)
    document.addEventListener('mousedown', closeMenus)
    document.addEventListener('keydown', closeMenusOnEscape)

    return () => {
      cancelled = true
      window.removeEventListener('focus', refreshOnReturn)
      window.removeEventListener(PROFILE_UPDATED_EVENT, refreshProfile)
      document.removeEventListener('visibilitychange', refreshOnReturn)
      document.removeEventListener('mousedown', closeMenus)
      document.removeEventListener('keydown', closeMenusOnEscape)
    }
  }, [location.pathname])

  const displayName =
    profile?.name?.trim()
    || profile?.username?.trim()
    || profile?.email?.trim()
    || storedUser?.name?.trim()
    || storedUser?.username?.trim()
    || storedUser?.email?.trim()
    || 'Planner'

  const email =
    profile?.email
    || storedUser?.email
    || ''

  const initial =
    displayName.charAt(0).toUpperCase()

  const profilePhoto =
    assetUrl(profile?.profile_photo_url)

  async function handleEnableNotifications() {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported')
      return
    }

    try {
      const permission =
        await Notification.requestPermission()

      setNotificationPermission(permission)
    } catch (error) {
      console.error('Não foi possível ativar as notificações:', error)
      setNotificationPermission('denied')
    }
  }

  function getReminderDate(event: EventFromApi) {
    const date = new Date(event.starts_at)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  async function handleLogout() {
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
      navigate('/login', {
        replace: true,
      })
    }
  }

  return (
    <div className="app-shell">
      {!isLibrary && (
        <header className="app-shell-header">
          <NavLink
            to="/"
            className="app-shell-brand"
            aria-label="Ir para a Biblioteca do Matcha Planner"
          >
            <img
              className="app-shell-brand-icon"
              src={MATCHA_ICON}
              alt=""
              aria-hidden="true"
            />

            <span className="app-shell-brand-lockup">
              <strong>Matcha</strong>
              <em>Planner</em>
            </span>
          </NavLink>

          <nav
            className="app-shell-nav"
            aria-label="Navegação principal"
          >
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive
                    ? 'app-shell-link active'
                    : 'app-shell-link'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="app-shell-actions" ref={shellActionsRef}>
            <QuickCapture />
            <div className="app-shell-popover-wrap">
              <button
                type="button"
                className={
                  remindersOpen
                    ? 'app-shell-icon-button active'
                    : 'app-shell-icon-button'
                }
                aria-label="Lembretes"
                aria-expanded={remindersOpen}
                aria-haspopup="dialog"
                title="Lembretes"
                onClick={() => {
                  setRemindersOpen(
                    (current) => !current,
                  )
                  setProfileOpen(false)
                }}
              >
                <Bell
                  size={19}
                  strokeWidth={1.9}
                  aria-hidden="true"
                />

                {upcomingReminders.length > 0 && (
                  <span className="app-shell-reminder-badge">
                    {upcomingReminders.length > 9
                      ? '9+'
                      : upcomingReminders.length}
                  </span>
                )}
              </button>

              {remindersOpen && (
                <div className="app-shell-popover app-shell-reminders-popover" role="dialog" aria-label="Lembretes futuros">
                  <div className="app-shell-popover-heading">
                    <div>
                      <span>Lembretes</span>
                      <strong>
                        Próximos avisos
                      </strong>
                    </div>

                    <button
                      type="button"
                      aria-label="Fechar lembretes"
                      onClick={() =>
                        setRemindersOpen(false)
                      }
                    >
                      <X
                        size={16}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  {upcomingReminders.length === 0
                    ? (
                      <p className="app-shell-empty-popover">
                        Nenhum lembrete futuro configurado.
                      </p>
                    )
                    : (
                      <div className="app-shell-reminder-list">
                        {upcomingReminders
                          .slice(0, 4)
                          .map((event) => (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => {
                                setRemindersOpen(false)
                                navigate(`/calendar?date=${getReminderDate(event)}`)
                              }}
                            >
                              <span>●</span>
                              <div>
                                <strong>
                                  {event.title}
                                </strong>
                                <small>
                                  {new Date(
                                    event.starts_at,
                                  ).toLocaleString(
                                    'pt-BR',
                                    {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    },
                                  )}
                                </small>
                              </div>
                            </button>
                          ))}
                        {upcomingReminders.length > 4 && (
                          <span className="app-shell-reminder-more">
                            +{upcomingReminders.length - 4} lembrete(s) no calendário
                          </span>
                        )}
                      </div>
                    )}

                  {notificationPermission !== 'granted'
                    && notificationPermission !== 'unsupported'
                    && (
                      <button
                        type="button"
                        className="app-shell-popover-primary"
                        onClick={() =>
                          void handleEnableNotifications()
                        }
                      >
                        Ativar notificações
                      </button>
                    )}

                  <button
                    type="button"
                    className="app-shell-popover-link"
                    onClick={() => {
                      setRemindersOpen(false)
                      navigate('/calendar')
                    }}
                  >
                    <CalendarDays
                      size={15}
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />
                    Abrir calendário
                  </button>
                </div>
              )}
            </div>

            <div className="app-shell-popover-wrap">
              <button
                type="button"
                className={
                  profileOpen
                    ? 'app-shell-profile-button active'
                    : 'app-shell-profile-button'
                }
                aria-label={`Perfil de ${displayName}`}
                aria-expanded={profileOpen}
                aria-haspopup="dialog"
                onClick={() => {
                  setProfileOpen(
                    (current) => !current,
                  )
                  setRemindersOpen(false)
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
                      {initial}
                    </span>
                  )}
              </button>

              {profileOpen && (
                <div className="app-shell-popover app-shell-profile-popover" role="dialog" aria-label={`Perfil de ${displayName}`}>
                  <div className="app-shell-profile-summary">
                    {profilePhoto
                      ? (
                        <img
                          src={profilePhoto}
                          alt=""
                        />
                      )
                      : (
                        <span aria-hidden="true">
                          {initial}
                        </span>
                      )}

                    <div>
                      <strong>{displayName}</strong>
                      {email && (
                        <small>{email}</small>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      navigate('/profile')
                    }}
                  >
                    <UserRound
                      size={15}
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />
                    Meu perfil
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleLogout()
                    }
                  >
                    <LogOut
                      size={15}
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />
                    Sair da conta
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="app-shell-content">
        {children}
      </main>

      <footer className="app-shell-footer">
        <div className="app-shell-footer-inner">
          <section className="app-shell-footer-intro">
            <span className="app-shell-footer-kicker">
              MATCHA PLANNER
            </span>

            <h2>
              Seu espaço para planejar,
              registrar e criar do seu jeito.
            </h2>

            <p>
              Um planner digital autoral pensado para
              reunir organização, escrita, estudos e
              criatividade em um só lugar.
            </p>
          </section>

          <section
            className="app-shell-footer-credits"
            aria-label="Créditos do projeto"
          >
            <span className="app-shell-footer-kicker">
              SOBRE A CRIADORA
            </span>

            <strong>
              Giovanna Duarte
            </strong>

            <p>
              Criação, identidade, produto e
              desenvolvimento do Matcha Planner.
            </p>

            <div className="app-shell-footer-links">
              <a
                href="https://github.com/GioduarteDev"
                target="_blank"
                rel="noreferrer"
              >
                GitHub · @GioduarteDev
              </a>

              <a
                href="https://github.com/GioduarteDev/planner-digital"
                target="_blank"
                rel="noreferrer"
              >
                Código do projeto
              </a>
            </div>
          </section>
        </div>

        <div className="app-shell-footer-bottom">
          <span>
            © 2026 Matcha Planner
          </span>

          <span>
            Projeto autoral de Giovanna Duarte.
          </span>
        </div>
      </footer>
    </div>
  )
}


export default AppShell
