import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import UploadFile from './pages/UploadFile'
import ViewNews from './pages/ViewNews'
import SelectNews from './pages/SelectNews'
import Adjust from './pages/Adjust'
import Analytics from './pages/Analytics'
import { JobProvider } from './contexts/JobContext'
import './App.css'

function App() {
  return (
    <JobProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="upload" element={<UploadFile />} />
            <Route path="select-news" element={<SelectNews/>} />
            <Route path="view-news" element={<ViewNews/>} />
            <Route path="settings" element={<Adjust/>} />
            <Route path="analytics" element={<Analytics/>} />
          </Route>
        </Routes>
      </Router>
    </JobProvider>
  )
}

export default App
