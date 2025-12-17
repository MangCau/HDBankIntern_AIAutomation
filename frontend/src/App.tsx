import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { NotificationProvider } from './contexts/NotificationContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import UploadFile from './pages/UploadFile'
// import ViewNews from './pages/ViewNews'
import SelectNews from './pages/SelectNews'
import Adjust from './pages/Adjust'
import Analytics from './pages/Analytics'
import HistoryReport from './pages/HistoryReport'
import ViewReport from './pages/ViewReport'
import './App.css'

function App() {
  return (
    <Router>
      <NotificationProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="upload" element={<UploadFile />} />
            <Route path="select-news" element={<SelectNews/>} />
            {/* <Route path="view-news" element={<ViewNews/>} /> */}
            <Route path="settings" element={<Adjust/>} />
            <Route path="historyreport" element={<HistoryReport/>} />
            <Route path="report/:id" element={<ViewReport/>} />
            <Route path="analytics" element={<Analytics/>} />
          </Route>
        </Routes>
      </NotificationProvider>
    </Router>
  )
}

export default App
