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

import ProfilePage
  from './pages/Profile/ProfilePage'

import OrganizationPage
  from './pages/Organization/OrganizationPage'

import TasksPage
  from './pages/Tasks/TasksPage'

import DataPage
  from './pages/Data/DataPage'

import StationeryPage
  from './pages/Stationery/StationeryPage'

import ReminderWatcher
  from './components/ReminderWatcher'

import AppShell
  from './components/AppShell'

import {
  apiRequest,
} from './services/api'


import InboxPage from './pages/Inbox/InboxPage'
import DeadlinesPage from './pages/Planning/DeadlinesPage'
import WeeklyReviewPage from './pages/Planning/WeeklyReviewPage'

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
  ] = useState<AuthState>(
    'checking',
  )


  useEffect(() => {
    let cancelled = false

    apiRequest(
      '/auth/me',
    )
      .then(() => {
        if (!cancelled) {
          setAuthState(
            'authenticated',
          )
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthState(
            'guest',
          )
        }
      })


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

      <AppShell>
        {children}
      </AppShell>
    </>
  )
}


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/deadlines" element={<ProtectedRoute><DeadlinesPage /></ProtectedRoute>} />
        <Route path="/weekly-review" element={<ProtectedRoute><WeeklyReviewPage /></ProtectedRoute>} />
        <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
        <Route
          path="/login"
          element={
            <AuthPage key="login" />
          }
        />

        <Route
          path="/register"
          element={
            <AuthPage key="register" />
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
          path="/tasks"
          element={
            <ProtectedRoute>
              <TasksPage />
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
          path="/organization"
          element={
            <ProtectedRoute>
              <OrganizationPage />
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
          path="/stationery"
          element={
            <ProtectedRoute>
              <StationeryPage />
            </ProtectedRoute>
          }
        />


        <Route
          path="/data"
          element={
            <ProtectedRoute>
              <DataPage />
            </ProtectedRoute>
          }
        />


        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
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
