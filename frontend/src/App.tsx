import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom'

import AgendaPage from './pages/Agenda/AgendaPage'
import LibraryPage from './pages/Library/LibraryPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<LibraryPage />}
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