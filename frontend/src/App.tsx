import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import AgendaPage
  from './pages/Agenda/AgendaPage'

import AuthPage
  from './pages/Auth/AuthPage'

import LibraryPage
  from './pages/Library/LibraryPage'

import TodayPage
  from './pages/Today/TodayPage'

import CalendarPage
  from './pages/Calendar/CalendarPage'

import StudiesPage
  from './pages/Studies/StudiesPage'

import SearchPage
  from './pages/Search/SearchPage'

import ReminderWatcher
  from './components/ReminderWatcher'

import {
  apiRequest,
} from './services/api'


type AuthState =
  | 'checking'
  | 'authenticated'
  | 'guest'


function ProtectedRoute({
  children,
}: {
  children: ReactNode
}) {
  const [
    authState,
    setAuthState,
  ] =
    useState<AuthState>(
      'checking',
    )

  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      try {
        await apiRequest(
          '/auth/me',
        )

        if (!cancelled) {
          setAuthState(
            'authenticated',
          )
        }
      } catch {
        if (!cancelled) {
          setAuthState(
            'guest',
          )
        }
      }
    }

    void checkSession()

    return () => {
      cancelled = true
    }
  }, [])

  if (
    authState === 'checking'
  ) {
    return (
      <main>
        Carregando...
      </main>
    )
  }

  if (
    authState === 'guest'
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return (
    <>
      <ReminderWatcher />

      {children}
    </>
  )
}


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <AuthPage />
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <LibraryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/today"
          element={
            <ProtectedRoute>
              <TodayPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/studies"
          element={
            <ProtectedRoute>
              <StudiesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/agenda/:id"
          element={
            <ProtectedRoute>
              <AgendaPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}


export default App
