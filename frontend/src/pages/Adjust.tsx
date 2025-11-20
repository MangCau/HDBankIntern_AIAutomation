import { useState } from 'react'
import '../App.css'

// Dữ liệu giả cho demo
const MOCK_DATA = {
  products: [
    {
      id: 1,
      image: 'https://picsum.photos/seed/product1/300/200',
      title: 'Gói tài khoản tiết kiệm HDBank Smart Save Plus',
      summary: 'Sản phẩm tiết kiệm linh hoạt với lãi suất ưu đãi lên đến 6.5%/năm, kỳ hạn từ 1-24 tháng, rút trước hạn không mất phí.',
      bank: 'HDBank',
      publishDate: '2025-01-15',
      sourceUrl: 'https://hdbank.com.vn/san-pham'
    },
    {
      id: 2,
      image: 'https://picsum.photos/seed/product2/300/200',
      title: 'Thẻ tín dụng VietCredit Platinum Cash Back',
      summary: 'Hoàn tiền 2% cho mọi giao dịch, miễn phí thường niên năm đầu, hạn mức lên đến 500 triệu đồng.',
      bank: 'VietCredit',
      publishDate: '2025-01-14',
      sourceUrl: 'https://vietcredit.com.vn/the-tin-dung'
    },
    {
      id: 3,
      image: 'https://picsum.photos/seed/product3/300/200',
      title: 'Vay mua nhà MB Home Easy với lãi suất ưu đãi 6.9%/năm',
      summary: 'Gói vay mua nhà với lãi suất cố định 6 tháng đầu, cho vay lên đến 80% giá trị bất động sản, thời gian vay tối đa 25 năm.',
      bank: 'MBBank',
      publishDate: '2025-01-13',
      sourceUrl: 'https://mbbank.com.vn/vay-mua-nha'
    }
  ],
  bankingNews: [
    {
      id: 1,
      image: 'https://picsum.photos/seed/banking1/300/200',
      title: 'NHNN tăng room tín dụng cho các ngân hàng thương mại',
      summary: 'Ngân hàng Nhà nước quyết định tăng room tín dụng thêm 2% cho các ngân hàng đáp ứng đủ điều kiện an toàn hoạt động, nhằm hỗ trợ tăng trưởng kinh tế năm 2025.',
      bank: 'Toàn ngành',
      publishDate: '2025-01-18',
      sourceUrl: 'https://sbv.gov.vn/tin-tuc'
    },
    {
      id: 2,
      image: 'https://picsum.photos/seed/banking2/300/200',
      title: 'Techcombank công bố lợi nhuận kỷ lục trong Q4/2024',
      summary: 'Techcombank đạt lợi nhuận trước thuế 18,500 tỷ đồng trong quý 4/2024, tăng 22% so với cùng kỳ năm trước nhờ tăng trưởng dư nợ tín dụng và thu nhập phí.',
      bank: 'Techcombank',
      publishDate: '2025-01-17',
      sourceUrl: 'https://techcombank.com.vn/bao-cao-tai-chinh'
    },
    {
      id: 3,
      image: 'https://picsum.photos/seed/banking3/300/200',
      title: 'VPBank triển khai hệ thống Core Banking mới',
      summary: 'VPBank chính thức đưa vào vận hành hệ thống Core Banking thế hệ mới, nâng cao năng lực xử lý giao dịch và trải nghiệm khách hàng.',
      bank: 'VPBank',
      publishDate: '2025-01-16',
      sourceUrl: 'https://vpbank.com.vn/cong-nghe'
    }
  ],
  fintechNews: [
    {
      id: 1,
      image: 'https://picsum.photos/seed/fintech1/300/200',
      title: 'MoMo ra mắt tính năng đầu tư chứng khoán tích hợp',
      summary: 'Ví điện tử MoMo công bố tích hợp tính năng mua bán chứng khoán trực tiếp trên ứng dụng, hợp tác cùng các công ty chứng khoán hàng đầu.',
      bank: 'MoMo',
      publishDate: '2025-01-19',
      sourceUrl: 'https://momo.vn/tin-tuc'
    },
    {
      id: 2,
      image: 'https://picsum.photos/seed/fintech2/300/200',
      title: 'Startup Fintech Việt Nam nhận vốn đầu tư 50 triệu USD',
      summary: 'Nền tảng cho vay P2P Tima nhận vòng Series C trị giá 50 triệu USD từ quỹ đầu tư quốc tế, mở rộng thị trường khu vực Đông Nam Á.',
      bank: 'Tima',
      publishDate: '2025-01-18',
      sourceUrl: 'https://tima.vn/dau-tu'
    },
    {
      id: 3,
      image: 'https://picsum.photos/seed/fintech3/300/200',
      title: 'ZaloPay tích hợp thanh toán BNPL với các sàn thương mại điện tử',
      summary: 'ZaloPay ra mắt dịch vụ mua trước trả sau (BNPL) tích hợp với Shopee, Lazada và Tiki, cho phép người dùng mua hàng trả góp 0% lãi suất.',
      bank: 'ZaloPay',
      publishDate: '2025-01-17',
      sourceUrl: 'https://zalopay.vn/bnpl'
    }
  ]
}

type Category = 'products' | 'bankingNews' | 'fintechNews'

interface NewsItem {
  id: number
  image: string
  title: string
  summary: string
  bank: string
  publishDate: string
  sourceUrl: string
}

function Adjust() {
    const today = new Date().toISOString().split('T')[0]
  const [selectedCategory, setSelectedCategory] = useState<Category>('products')
    const [startDate, setStartDate] = useState(today)
    const [endDate, setEndDate] = useState(today)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(new Set())
  const [confirmedSelectedIds, setConfirmedSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedSummaries, setEditedSummaries] = useState<Record<string, string>>({})
  const [tempEditValue, setTempEditValue] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const getCategoryData = (): NewsItem[] => {
    return MOCK_DATA[selectedCategory]
  }

  // Filter data theo date range and search query
  const getFilteredData = (): NewsItem[] => {
    const data = getCategoryData()
    let filtered = data.filter(item => {
      const itemDate = new Date(item.publishDate)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return itemDate >= start && itemDate <= end
    })

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.bank.toLowerCase().includes(query)
      )
    }

    return filtered
  }

  const getCategoryTitle = (): string => {
    const titles = {
      products: 'Sản phẩm & Dịch vụ mới',
      bankingNews: 'Tin tức ngành Ngân hàng',
      fintechNews: 'Tin tức ngành Fintech'
    }
    return titles[selectedCategory]
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Tạo unique key cho mỗi tin tức
  const getUniqueKey = (category: Category, id: number): string => {
    return `${category}-${id}`
  }

  // Xử lý chọn tin tức
  const handleToggleSelectionMode = () => {
    if (isSelectionMode) {
      // Nếu đang tắt chế độ chọn, reset tempSelectedIds về confirmedSelectedIds
      setTempSelectedIds(new Set(confirmedSelectedIds))
    }
    setIsSelectionMode(!isSelectionMode)
  }

  const handleCheckboxChange = (id: number) => {
    const uniqueKey = getUniqueKey(selectedCategory, id)
    const newSet = new Set(tempSelectedIds)
    if (newSet.has(uniqueKey)) {
      newSet.delete(uniqueKey)
    } else {
      newSet.add(uniqueKey)
    }
    setTempSelectedIds(newSet)
  }

  const handleUpdateSelection = () => {
    const message = 'Bạn có chắc chắn muốn cập nhật lựa chọn tin tức này không?'
    if (window.confirm(message)) {
      setConfirmedSelectedIds(new Set(tempSelectedIds))
      setIsSelectionMode(false)
      alert('Đã cập nhật lựa chọn tin tức thành công!')
    }
  }

  // Tính số lượng tin được chọn cho mỗi danh mục
  const getSelectedCount = (category: Category): number => {
    const categoryData = MOCK_DATA[category]
    return categoryData.filter(item => confirmedSelectedIds.has(getUniqueKey(category, item.id))).length
  }

  // Xử lý chỉnh sửa summary
  const handleEditSummary = (id: number, currentSummary: string) => {
    const uniqueKey = getUniqueKey(selectedCategory, id)
    setEditingId(uniqueKey)
    setTempEditValue(editedSummaries[uniqueKey] || currentSummary)
  }

  const handleSaveSummary = (id: number) => {
    const uniqueKey = getUniqueKey(selectedCategory, id)
    const message = 'Bạn có chắc chắn muốn lưu thay đổi nội dung này không?'
    if (window.confirm(message)) {
      setEditedSummaries({
        ...editedSummaries,
        [uniqueKey]: tempEditValue
      })
      setEditingId(null)
      setTempEditValue('')
      alert('Đã lưu thay đổi thành công!')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setTempEditValue('')
  }

  const getSummary = (item: NewsItem): string => {
    const uniqueKey = getUniqueKey(selectedCategory, item.id)
    return editedSummaries[uniqueKey] || item.summary
  }

    const toggleExpanded = (id: number) => {
    const newSet = new Set(expandedItems)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedItems(newSet)
  }

  return (
    <div className="page-container">
      {/* Sidebar Menu */}
      <aside className="sidebar">
        <div className='logo-img'></div>

        {/* Thời gian */}
                <div className='sidebar-section'>
                    <h3 className='section-title'>THỜI GIAN</h3>
                    <div className='section-content'>
                        <p className='date-range'>
                            Tin tức được cập nhật từ ngày <strong>{formatDate(startDate)}</strong> đến ngày <strong>{formatDate(endDate)}</strong>
                        </p>
                        <div className='date-selectors'>
                            <div className='date-input-wrapper'>
                                <label htmlFor='start-date'>Từ ngày:</label>
                                <input
                                    type='date'
                                    id='start-date'
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className='date-input'
                                />
                            </div>
                            <div className='date-input-wrapper'>
                                <label htmlFor='end-date'>Đến ngày:</label>
                                <input
                                    type='date'
                                    id='end-date'
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className='date-input'
                                />
                            </div>
                        </div>
                    </div>
                </div>

        {/* Thống kê nhanh */}
        <div className="sidebar-section">
          <h3 className="section-title">THỐNG KÊ NHANH</h3>
          <div className="section-content">
            <div className="stat-item">
              <span className="stat-label">Sản phẩm & công nghệ mới</span>
              <span className="stat-value">3</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tin tức ngành Ngân hàng</span>
              <span className="stat-value">3</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tin tức ngành Fintech</span>
              <span className="stat-value">3</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Các văn bản pháp luật</span>
              <span className="stat-value">0</span>
            </div>
          </div>

          <div className="section-content">
            <div className="stat-item">
              <span className="stat-label">Sản phẩm & công nghệ mới - được chọn</span>
              <span className="stat-value">{getSelectedCount('products')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tin tức ngành Ngân hàng - được chọn</span>
              <span className="stat-value">{getSelectedCount('bankingNews')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tin tức ngành Fintech - được chọn</span>
              <span className="stat-value">{getSelectedCount('fintechNews')}</span>
            </div>
          </div>
        </div>

        {/* Chọn danh mục */}
        <div className="sidebar-section">
          <h3 className="section-title">CHỌN DANH MỤC</h3>
          <div className="section-content">
            <select
              className="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as Category)}
            >
              <option value="products">Sản phẩm & Dịch vụ mới</option>
              <option value="bankingNews">Tin tức ngành Ngân hàng</option>
              <option value="fintechNews">Tin tức ngành Fintech</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-header">
          <div>
            <h1>{getCategoryTitle()}</h1>
            <p className="content-subtitle">
              Tổng cộng: <strong>{getFilteredData().length}</strong> mục
            </p>
          </div>
          <div className="header-actions">
            <button
              className={`selection-mode-btn ${isSelectionMode ? 'active' : ''}`}
              onClick={handleToggleSelectionMode}
            >
              {isSelectionMode ? 'Hủy chọn' : 'Chọn tin tức'}
            </button>
            {isSelectionMode && (
              <button
                className="update-selection-btn"
                onClick={handleUpdateSelection}
              >
                Cập nhật
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-bar-container">
          <div className="search-bar">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề, nội dung hoặc ngân hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="news-list">
          {getFilteredData().map((item) => {
            const uniqueKey = getUniqueKey(selectedCategory, item.id)
            return (
            <article key={item.id} className={`news-card ${confirmedSelectedIds.has(uniqueKey) ? 'selected' : ''}`}>
              {isSelectionMode && (
                <div className="news-checkbox">
                  <input
                    type="checkbox"
                    checked={tempSelectedIds.has(uniqueKey)}
                    onChange={() => handleCheckboxChange(item.id)}
                  />
                </div>
              )}
              {!isSelectionMode && confirmedSelectedIds.has(uniqueKey) && (
                <div className="news-selected-badge">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
              <div className="news-image">
                <img src={item.image} alt={item.title} />
              </div>
              <div className="news-content">
                <h2 className="news-title">{item.title}</h2>
                {editingId === uniqueKey ? (
                  <div className="edit-summary-container">
                    <textarea
                      className="edit-summary-textarea"
                      value={tempEditValue}
                      onChange={(e) => setTempEditValue(e.target.value)}
                      rows={4}
                    />
                    <div className="edit-summary-buttons">
                      <button className="save-summary-btn" onClick={() => handleSaveSummary(item.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Lưu
                      </button>
                      <button className="cancel-summary-btn" onClick={handleCancelEdit}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="summary-with-edit">
                    <p className="news-summary">{getSummary(item)}</p>
                    <button className="edit-summary-btn" onClick={() => handleEditSummary(item.id, item.summary)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Chỉnh sửa
                    </button>
                  </div>
                )}

                {/* edit this to match the structure detail */}
                {expandedItems.has(item.id) && (
                  <div className="news-details">
                    <div className="detail-section">
                      <h4>Thông tin chi tiết</h4>
                      <p><strong>Ngân hàng:</strong> {item.bank}</p>
                      <p><strong>Ngày phát hành:</strong> {formatDate(item.publishDate)}</p>
                      <p><strong>Nguồn:</strong> <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceUrl}</a></p>
                    </div>
                  </div>
                )}

                <div className="news-meta">
                  <div className="meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>{item.bank}</span>
                  </div>
                  <div className="meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{formatDate(item.publishDate)}</span>
                  </div>
                  <button onClick={() => toggleExpanded(item.id)} className="source-link detail-toggle-btn">
                    {expandedItems.has(item.id) ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                        <span>Thu gọn</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                        <span>Xem chi tiết</span>
                      </>
                    )}
                  </button>
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    <span>Xem nguồn</span>
                  </a>
                </div>
              </div>
            </article>
            )
          })}

          {getFilteredData().length === 0 && (
            <div className='no-results'>
              <p>Không tìm thấy tin tức nào trong khoảng thời gian này</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Adjust
