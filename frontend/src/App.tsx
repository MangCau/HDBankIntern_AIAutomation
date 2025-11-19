import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import UploadFile from './pages/UploadFile'
import Manage from './pages/Manage'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="upload" element={<UploadFile />} />
          <Route path="manage" element={<Manage/>} />
          <Route path="settings" element={<div style={{ padding: '40px', fontSize: '24px' }}>Điều chỉnh Page</div>} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
