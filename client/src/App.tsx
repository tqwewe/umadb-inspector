import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { TimestampProvider } from './contexts/TimestampContext'
import { Home } from './pages/Home'
import { EventSearch } from './pages/EventSearch'
import { EventLookup } from './pages/EventLookup'
import { ProjectionRunner } from './pages/ProjectionRunner'
import { SavedProjectionsPage } from './pages/SavedProjectionsPage'
import { ProjectionViewPage } from './pages/ProjectionViewPage'

function App() {
  return (
    <TimestampProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<EventSearch />} />
          <Route path="/search/:tags" element={<EventSearch />} />
          <Route path="/events" element={<EventLookup />} />
          <Route path="/events/:eventId" element={<EventLookup />} />
          <Route path="/projections" element={<ProjectionRunner />} />
          <Route path="/projections/saved" element={<SavedProjectionsPage />} />
          <Route path="/projections/view/:id" element={<ProjectionViewPage />} />
        </Routes>
      </Layout>
    </TimestampProvider>
  )
}

export default App