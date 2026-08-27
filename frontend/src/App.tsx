import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom'

import AgendaPage from './pages/Agenda/AgendaPage'
import LibraryPage from './pages/Library/LibraryPage'
import TodayPage from './pages/Today/TodayPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<LibraryPage />}
        />

        <Route
          path="/today"
          element={<TodayPage />}
        />

        <Route
          path="/agenda/:id"
          element={<AgendaPage />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App