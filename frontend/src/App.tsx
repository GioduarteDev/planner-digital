import type {
  ReactNode,
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

import {
  getAccessToken,
} from './services/api'

import CalendarPage
  from './pages/Calendar/CalendarPage'

  import ReminderWatcher
  from './components/ReminderWatcher'

import StudiesPage
  from './pages/Studies/StudiesPage'  


function ProtectedRoute({
  children,
}: {
  children: ReactNode
}) {
  const token =
    getAccessToken()


  if (!token) {
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