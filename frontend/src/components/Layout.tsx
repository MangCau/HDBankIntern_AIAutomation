import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import '../App.css'

function Layout() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Load appMode from localStorage, default to 'report' if not found
  const [appMode, setAppMode] = useState<'report' | 'edit' | 'manage'>(() => {
    const savedMode = localStorage.getItem('appMode')
    return (savedMode === 'edit' || savedMode === 'report' || savedMode === 'manage') ? savedMode as 'report' | 'edit' | 'manage' : 'report'
  })

  const location = useLocation()
  const navigate = useNavigate()

  const notificationRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Save appMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('appMode', appMode)
  }, [appMode])

  // Toggle between report and edit mode
  const toggleMode = () => {
    const newMode = appMode === 'report' ? 'edit' : 'report'
    setAppMode(newMode)
    setShowUserMenu(false)

    // Auto-navigate to appropriate page based on mode
    if (newMode === 'report') {
      navigate('/') // Navigate to Home/Report page
    } else {
      navigate('/select-news') // Navigate to News page (default for edit mode)
    }
  }

  // Switch to manage mode (history view)
  const switchToManageMode = () => {
    setAppMode('manage')
    setShowUserMenu(false)
    navigate('/settings') // Navigate to Settings/Management page
  }

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <>
      {/* Navbar */}
      <nav className='navbar'>
        {/* Left side - Navigation links */}
        <div className="navbar-left">
          <div className='logo-img'></div>
          {appMode === 'report' ? (
            // Report mode: Only show Home page
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Báo cáo</Link>
          ) : appMode === 'manage' ? (
            // Manage mode: Only show Settings page
            <Link to="/settings" className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}>Quản lý</Link>
          ) : (
            // Edit mode: Show all other pages
            <>
              <Link to="/upload" className={`nav-link ${location.pathname === '/upload' ? 'active' : ''}`}>Tải lên file</Link>
              <Link to="/select-news" className={`nav-link ${location.pathname === '/select-news' ? 'active' : ''}`}>Tin tức</Link>
              <Link to="/analytics" className={`nav-link ${location.pathname === '/analytics' ? 'active' : ''}`}>Phân tích</Link>
            </>
          )}
        </div>

        {/* Right side - Icons */}
        <div className="navbar-right">
          {/* Notifications */}
          <div className="navbar-icon-wrapper" ref={notificationRef}>
            <button
              className="navbar-icon-button"
              onClick={() => setShowNotifications(!showNotifications)}
              title="Thông báo"
            >
              🔔
              <span className="notification-badge">3</span>
            </button>

            {showNotifications && (
              <div className="dropdown-menu notifications-dropdown">
                <div className="dropdown-header">
                  <h4>Thông báo</h4>
                </div>
                <div className="notification-item">
                  <div className="notification-icon">🔔</div>
                  <div className="notification-content">
                    <p className="notification-title">Báo cáo mới được tạo</p>
                    <p className="notification-time">5 phút trước</p>
                  </div>
                </div>
                <div className="notification-item">
                  <div className="notification-icon">📊</div>
                  <div className="notification-content">
                    <p className="notification-title">Dữ liệu đã được cập nhật</p>
                    <p className="notification-time">1 giờ trước</p>
                  </div>
                </div>
                <div className="notification-item">
                  <div className="notification-icon">✅</div>
                  <div className="notification-content">
                    <p className="notification-title">Hệ thống hoạt động bình thường</p>
                    <p className="notification-time">2 giờ trước</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="navbar-icon-wrapper" ref={userMenuRef}>
            <button
              className="navbar-icon-button user-avatar"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title="Tài khoản"
            >
              👤
            </button>

            {showUserMenu && (
              <div className="dropdown-menu user-dropdown">
                <div className="dropdown-header user-info">
                  <div className="user-avatar-large">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <h4>Nguyễn Văn A</h4>
                  <p>admin@hdbank.com</p>
                </div>
                <div className="dropdown-divider"></div>
                <a href="#profile" className="dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Thông tin tài khoản
                </a>
                <a href="#manage-account" className="dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v6m0 6v6m5.2-12.8l-4.2 4.2m0 5.2l4.2 4.2M23 12h-6m-6 0H1m18.8-5.2l-4.2 4.2m0 5.2l4.2 4.2" />
                  </svg>
                  Quản lý tài khoản
                </a>
                <button onClick={switchToManageMode} className="dropdown-item" style={{width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                  Xem lịch sử
                </button>
                <div className="dropdown-divider"></div>
                <button onClick={toggleMode} className="dropdown-item" style={{width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {appMode === 'report' ? (
                      // Edit icon
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    ) : (
                      // Report/Document icon
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />
                    )}
                  </svg>
                  {appMode === 'report' ? 'Chuyển sang chế độ Chỉnh sửa' : 'Chuyển sang chế độ Báo cáo'}
                </button>
                <div className="dropdown-divider"></div>
                <a href="#logout" className="dropdown-item logout">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Đăng xuất
                </a>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Page content will be rendered here */}
      <Outlet />
    </>
  )
}

export default Layout
