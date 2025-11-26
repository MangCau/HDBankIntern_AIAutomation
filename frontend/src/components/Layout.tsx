import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import '../App.css'

function Layout() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const location = useLocation()

  const notificationRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

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
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Trang chủ</Link>
          <Link to="/upload" className={`nav-link ${location.pathname === '/upload' ? 'active' : ''}`}>Tải lên file</Link>
          <Link to="/select-news" className={`nav-link ${location.pathname === '/select-news' ? 'active' : ''}`}>Tin tức</Link>
          <Link to="/settings" className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}>Quản lý</Link>
          <Link to="/analytics" className={`nav-link ${location.pathname === '/analytics' ? 'active' : ''}`}>Phân tích</Link>
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
