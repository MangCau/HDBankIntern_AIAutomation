import { useState, useEffect } from 'react'
import '../App.css'
import { apiEndpoint } from '../config/api'

// API URL - now uses environment variable for production
const API_URL = apiEndpoint('api/data')

type Category = 'products' | 'bankingNews' | 'fintechNews'

// Base interface cho tất cả items
interface BaseItem {
  id: string | number
  image?: string
  summary: string
  date: string
  source_type: string
  source_url: string
  pdf_file_name: string
}

// Product specific interface
interface ProductItem extends BaseItem {
  product_name: string
  product_segment: string
  bank: string[]
}

// Banking News specific interface
interface BankingNewsItem extends BaseItem {
  title: string
  topic_group: string
  bank: string[]
}

// Fintech News specific interface
interface FintechNewsItem extends BaseItem {
  title: string
  fintech_topic: string
  area_affected: string
  organization: string
}

// Union type for all news items
type NewsItem = ProductItem | BankingNewsItem | FintechNewsItem

function Adjust() {
  // Calculate date range: last 30 days
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  const [selectedCategory, setSelectedCategory] = useState<Category>('products')
  const [startDate, setStartDate] = useState(thirtyDaysAgoStr) // 30 days ago
  const [endDate, setEndDate] = useState(todayStr) // Today
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string | number>>(new Set())

  // State for fetched data
  const [products, setProducts] = useState<ProductItem[]>([])
  const [bankingNews, setBankingNews] = useState<BankingNewsItem[]>([])
  const [fintechNews, setFintechNews] = useState<FintechNewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to convert DD/MM/YYYY to YYYY-MM-DD
  const convertDateFormat = (dateStr: string): string => {
    if (!dateStr) return ''

    // Check if already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
    }

    // Convert DD/MM/YYYY to YYYY-MM-DD
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0')
      const month = parts[1].padStart(2, '0')
      const year = parts[2]
      return `${year}-${month}-${day}`
    }

    return dateStr
  }

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [productsRes, bankingRes, fintechRes] = await Promise.all([
          fetch(`${API_URL}/new-products`),
          fetch(`${API_URL}/market-trends`),
          fetch(`${API_URL}/fintech-news`)
        ])

        if (!productsRes.ok || !bankingRes.ok || !fintechRes.ok) {
          throw new Error('Failed to fetch data from API')
        }

        const [productsData, bankingData, fintechData] = await Promise.all([
          productsRes.json(),
          bankingRes.json(),
          fintechRes.json()
        ])

        console.log('Raw API Data:')
        console.log('Products:', productsData.data[0])
        console.log('Banking:', bankingData.data[0])
        console.log('Fintech:', fintechData.data[0])

        // Transform API data to match our interface
        const transformedProducts: ProductItem[] = productsData.data.map((item: any) => ({
          id: item._id,
          image: item.image,
          product_name: item.product_name,
          product_segment: item.product_segment || '',
          bank: Array.isArray(item.bank) ? item.bank : (item.bank ? [item.bank] : []),
          summary: item.description || '',
          date: convertDateFormat(item.date_published || ''),
          source_type: item.source_type || '',
          source_url: item.source_url || '',
          pdf_file_name: item.pdf_file_name || ''
        }))

        const transformedBanking: BankingNewsItem[] = bankingData.data.map((item: any) => ({
          id: item._id,
          image: item.image,
          title: item.title,
          topic_group: item.topic_group || '',
          bank: Array.isArray(item.bank_related) ? item.bank_related : (item.bank_related ? [item.bank_related] : []),
          summary: item.summary || '',
          date: convertDateFormat(item.published_date || ''),
          source_type: item.source_type || '',
          source_url: item.source_url || '',
          pdf_file_name: item.pdf_file_name || ''
        }))

        const transformedFintech: FintechNewsItem[] = fintechData.data.map((item: any) => ({
          id: item._id,
          image: item.image,
          title: item.title,
          fintech_topic: item.fintech_topic || '',
          area_affected: Array.isArray(item.area_affected) ? item.area_affected.join(', ') : (item.area_affected || ''),
          organization: item.organization || '',
          summary: item.summary || '',
          date: convertDateFormat(item.published_date || ''),
          source_type: item.source_type || '',
          source_url: item.source_url || '',
          pdf_file_name: item.pdf_file_name || ''
        }))

        console.log('Transformed Data:')
        console.log('Transformed Products:', transformedProducts[0])
        console.log('Transformed Banking:', transformedBanking[0])
        console.log('Transformed Fintech:', transformedFintech[0])

        setProducts(transformedProducts)
        setBankingNews(transformedBanking)
        setFintechNews(transformedFintech)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Không thể tải dữ liệu từ server.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Helper function to get title from any item type
  const getTitle = (item: NewsItem): string => {
    if ('product_name' in item) return item.product_name
    return item.title
  }

  // Helper function to get display name (bank or organization)
  const getDisplayName = (item: NewsItem): string => {
    if ('organization' in item) return item.organization
    if ('bank' in item) return Array.isArray(item.bank) ? item.bank.join(', ') : item.bank
    return ''
  }

  const getCategoryData = (): NewsItem[] => {
    if (selectedCategory === 'products') return products
    if (selectedCategory === 'bankingNews') return bankingNews
    return fintechNews
  }

  // Filter data theo date range and search query
  const getFilteredData = (): NewsItem[] => {
    const data = getCategoryData()
    let filtered = data.filter(item => {
      const itemDate = new Date(item.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      return itemDate >= start && itemDate <= end
    })

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => {
        const title = getTitle(item).toLowerCase()
        const displayName = getDisplayName(item).toLowerCase()
        return title.includes(query) ||
               item.summary.toLowerCase().includes(query) ||
               displayName.includes(query)
      })
    }

    return filtered
  }

  // Check if there's any data in the selected date range (across all categories)
  const hasDataInDateRange = (): boolean => {
    const allData = [
      ...products,
      ...bankingNews,
      ...fintechNews
    ]

    return allData.some(item => {
      const itemDate = new Date(item.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      return itemDate >= start && itemDate <= end
    })
  }

  // Get count for each category in date range
  const getCategoryCount = (category: Category): number => {
    let data: NewsItem[] = []
    if (category === 'products') data = products
    else if (category === 'bankingNews') data = bankingNews
    else data = fintechNews

    return data.filter(item => {
      const itemDate = new Date(item.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      return itemDate >= start && itemDate <= end
    }).length
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

  const toggleExpanded = (id: string | number) => {
    const newSet = new Set<string | number>(expandedItems)
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
              <span className="stat-value">{getCategoryCount('products')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tin tức ngành Ngân hàng</span>
              <span className="stat-value">{getCategoryCount('bankingNews')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tin tức ngành Fintech</span>
              <span className="stat-value">{getCategoryCount('fintechNews')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Các văn bản pháp luật</span>
              <span className="stat-value">0</span>
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
        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '60vh',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <h2 style={{ fontSize: '20px', color: '#495057' }}>Đang tải dữ liệu...</h2>
          </div>
        ) : error ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '60vh',
            textAlign: 'center',
            padding: '40px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '20px', color: '#495057', marginBottom: '12px' }}>{error}</h2>
          </div>
        ) : !hasDataInDateRange() ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '60vh',
            textAlign: 'center',
            padding: '40px'
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '24px'
            }}>📭</div>
            <h2 style={{
              fontSize: '24px',
              color: '#495057',
              marginBottom: '12px',
              fontWeight: '600'
            }}>
              Không có tin tức nào
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#6c757d',
              maxWidth: '500px'
            }}>
              Không có tin tức nào từ ngày <strong>{formatDate(startDate)}</strong> đến ngày <strong>{formatDate(endDate)}</strong>. Vui lòng chọn khoảng thời gian khác.
            </p>
          </div>
        ) : (
          <>
            <div className="content-header">
              <div>
                <h1>{getCategoryTitle()}</h1>
                <p className="content-subtitle">
                  Tổng cộng: <strong>{getFilteredData().length}</strong> mục
                </p>
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
              {getFilteredData().map((item) => (
                  <article key={item.id} className="news-card">
              {item.image && (
                <div className="news-image">
                  <img src={item.image} alt={getTitle(item)} />
                </div>
              )}
              <div className="news-content">
                <h2 className="news-title">{getTitle(item)}</h2>
                <p className="news-summary">{item.summary}</p>

                {/* Detailed information when expanded */}
                {expandedItems.has(item.id) && (
                  <div className="news-details">
                    <div className="detail-section">
                      <h4>Thông tin chi tiết</h4>

                      {/* Product specific fields */}
                      {'product_segment' in item && (
                        <p><strong>Phân khúc sản phẩm:</strong> {item.product_segment}</p>
                      )}

                      {/* Banking News specific fields */}
                      {'topic_group' in item && (
                        <p><strong>Nhóm chủ đề:</strong> {item.topic_group}</p>
                      )}

                      {/* Fintech News specific fields */}
                      {'fintech_topic' in item && (
                        <>
                          <p><strong>Chủ đề Fintech:</strong> {item.fintech_topic}</p>
                          <p><strong>Phạm vi ảnh hưởng:</strong> {item.area_affected}</p>
                        </>
                      )}

                      {/* Common fields */}
                      {'bank' in item && (
                        <p><strong>Ngân hàng:</strong> {Array.isArray(item.bank) ? item.bank.join(', ') : item.bank}</p>
                      )}
                      {'organization' in item && (
                        <p><strong>Tổ chức:</strong> {item.organization}</p>
                      )}

                      <p><strong>Loại nguồn:</strong> {item.source_type}</p>
                      <p><strong>File PDF:</strong> {item.pdf_file_name}</p>
                      <p><strong>Ngày phát hành:</strong> {formatDate(item.date)}</p>
                      <p><strong>Nguồn:</strong> <a href={item.source_url} target="_blank" rel="noopener noreferrer">{item.source_url}</a></p>
                    </div>
                  </div>
                )}

                <div className="news-meta">
                  <div className="meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>{getDisplayName(item)}</span>
                  </div>
                  <div className="meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{formatDate(item.date)}</span>
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
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="meta-item"
                      style={{
                        color: '#F5B800',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#F5B800'
                        e.currentTarget.style.textDecoration = 'underline'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#F5B800'
                        e.currentTarget.style.textDecoration = 'none'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                      <span>Xem nguồn</span>
                    </a>
                  )}
                </div>
              </div>
                  </article>
              ))}

              {getFilteredData().length === 0 && (
                <div className='no-results'>
                  <p>Không tìm thấy tin tức nào trong khoảng thời gian này</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Adjust
