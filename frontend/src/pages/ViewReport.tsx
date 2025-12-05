import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../App.css'

type Category = 'products' | 'bankingNews' | 'fintechNews'

interface NewsItem {
  _id: string
  category: string
  image: string
  title: string
  summary: string
  bank: string
  publishDate: string
  sourceUrl: string
  sourceType: string
  pdfFileName: string
  // Product-specific fields
  productSegment?: string
  // Banking/Fintech fields
  topicGroup?: string
  fintechTopic?: string
  areaAffected?: string
  organization?: string
}

function ViewReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [activeSection, setActiveSection] = useState<Category>('products')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data from API
  const [dateRange, setDateRange] = useState('')
  const [products, setProducts] = useState<NewsItem[]>([])
  const [bankingNews, setBankingNews] = useState<NewsItem[]>([])
  const [fintechNews, setFintechNews] = useState<NewsItem[]>([])

  const productsRef = useRef<HTMLElement>(null)
  const bankingNewsRef = useRef<HTMLElement>(null)
  const fintechNewsRef = useRef<HTMLElement>(null)

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedItems)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedItems(newSet)
  }

  // Fetch report by ID on component mount
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        const response = await fetch(`http://localhost:5000/api/reports/${id}`)
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch report')
        }

        const report = result.data
        setDateRange(report.dateRange)

        // Transform items to NewsItem format and categorize
        const productsData: NewsItem[] = []
        const bankingData: NewsItem[] = []
        const fintechData: NewsItem[] = []

        report.items.forEach((item: any) => {
          const newsItem: NewsItem = {
            _id: item._id || Math.random().toString(),
            category: item.category || '',
            image: item.image || '',
            title: item.product_name || item.title || 'Không có tiêu đề',
            summary: item.description || item.summary || '',
            bank: Array.isArray(item.bank) ? item.bank.join(', ') : (item.bank || item.bank_related || item.organization || ''),
            publishDate: item.date_published || item.published_date || '',
            sourceUrl: item.source_url || '',
            sourceType: item.source_type || '',
            pdfFileName: item.pdf_file_name || '',
            // Product-specific fields
            productSegment: item.product_segment || '',
            // Banking/Fintech fields
            topicGroup: item.topic_group || '',
            fintechTopic: item.fintech_topic || '',
            areaAffected: Array.isArray(item.area_affected) ? item.area_affected.join(', ') : (item.area_affected || ''),
            organization: item.organization || ''
          }

          if (item.category === 'Sản phẩm & dịch vụ mới') {
            productsData.push(newsItem)
          } else if (item.category === 'Xu hướng thị trường ngân hàng') {
            bankingData.push(newsItem)
          } else if (item.category === 'Tin tức ngành fintech') {
            fintechData.push(newsItem)
          }
        })

        setProducts(productsData)
        setBankingNews(bankingData)
        setFintechNews(fintechData)
        setError(null)
      } catch (err) {
        console.error('Error fetching report:', err)
        setError(err instanceof Error ? err.message : 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchReport()
    }
  }, [id])

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const scrollToSection = (section: Category) => {
    const refs = {
      products: productsRef,
      bankingNews: bankingNewsRef,
      fintechNews: fintechNewsRef
    }
    refs[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(section)
  }

  // Detect which section is in view
  useEffect(() => {
    // Wait for data to load before setting up observer
    if (loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Sort entries by their position to handle multiple intersecting sections
        const intersectingEntries = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (intersectingEntries.length > 0) {
          const id = intersectingEntries[0].target.id as Category
          setActiveSection(id)
        }
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '-100px 0px -60% 0px' // Offset for sticky nav
      }
    )

    const sections = [productsRef.current, bankingNewsRef.current, fintechNewsRef.current]
    sections.forEach((section) => {
      if (section) observer.observe(section)
    })

    return () => {
      sections.forEach((section) => {
        if (section) observer.unobserve(section)
      })
    }
  }, [loading])

  const renderNewsSection = (title: string, data: NewsItem[], sectionId: Category, ref: React.RefObject<HTMLElement>) => (
    <section id={sectionId} ref={ref} className="report-section">
      <div className="section-header">
        <h2 className="section-title-large">{title}</h2>
        <div className="section-divider"></div>
      </div>

      <div className="news-grid">
        {data.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>
            Không có dữ liệu trong mục này
          </p>
        ) : (
          data.map((item) => (
            <article key={item._id} className="news-card-modern">
              <div className="news-image-wrapper">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="news-image-modern" />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '200px',
                    backgroundColor: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999'
                  }}>
                    Không có hình ảnh
                  </div>
                )}
              </div>
              <div className="news-content-modern">
                <h3 className="news-title-modern">{item.title}</h3>
                <p className="news-summary-modern">{item.summary}</p>

                {expandedItems.has(item._id) && (
                  <div className="news-details-modern">
                    {item.category === 'Sản phẩm & dịch vụ mới' && (
                      <>
                        {item.bank && (
                          <div className="detail-row">
                            <span className="detail-label">Ngân hàng:</span>
                            <span className="detail-value">{item.bank}</span>
                          </div>
                        )}
                        {item.productSegment && (
                          <div className="detail-row">
                            <span className="detail-label">Phân khúc:</span>
                            <span className="detail-value">{item.productSegment}</span>
                          </div>
                        )}
                      </>
                    )}

                    {item.category === 'Xu hướng thị trường ngân hàng' && (
                      <>
                        {item.topicGroup && (
                          <div className="detail-row">
                            <span className="detail-label">Nhóm chủ đề:</span>
                            <span className="detail-value">{item.topicGroup}</span>
                          </div>
                        )}
                        {item.bank && (
                          <div className="detail-row">
                            <span className="detail-label">Ngân hàng liên quan:</span>
                            <span className="detail-value">{item.bank}</span>
                          </div>
                        )}
                      </>
                    )}

                    {item.category === 'Tin tức ngành fintech' && (
                      <>
                        {item.fintechTopic && (
                          <div className="detail-row">
                            <span className="detail-label">Chủ đề Fintech:</span>
                            <span className="detail-value">{item.fintechTopic}</span>
                          </div>
                        )}
                        {item.areaAffected && (
                          <div className="detail-row">
                            <span className="detail-label">Lĩnh vực ảnh hưởng:</span>
                            <span className="detail-value">{item.areaAffected}</span>
                          </div>
                        )}
                        {item.organization && (
                          <div className="detail-row">
                            <span className="detail-label">Tổ chức:</span>
                            <span className="detail-value">{item.organization}</span>
                          </div>
                        )}
                      </>
                    )}

                    {item.publishDate && (
                      <div className="detail-row">
                        <span className="detail-label">Ngày đăng:</span>
                        <span className="detail-value">{formatDate(item.publishDate)}</span>
                      </div>
                    )}

                    {item.sourceType && (
                      <div className="detail-row">
                        <span className="detail-label">Loại nguồn:</span>
                        <span className="detail-value">{item.sourceType}</span>
                      </div>
                    )}

                    {item.sourceUrl && (
                      <div className="detail-row">
                        <span className="detail-label">Nguồn:</span>
                        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="detail-link">
                          {item.sourceUrl}
                        </a>
                      </div>
                    )}

                    {item.pdfFileName && (
                      <div className="detail-row">
                        <span className="detail-label">File PDF:</span>
                        <span className="detail-value">{item.pdfFileName}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="news-actions">
                  <button onClick={() => toggleExpanded(item._id)} className="action-btn">
                    {expandedItems.has(item._id) ? 'Thu gọn' : 'Xem chi tiết'}
                  </button>
                  {item.sourceUrl && (
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="action-btn secondary">
                      Xem nguồn
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )

  if (loading) {
    return (
      <div className="report-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Đang tải báo cáo...
      </div>
    )
  }

  if (error) {
    return (
      <div className="report-container" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        gap: '16px'
      }}>
        <p style={{ fontSize: '18px', color: '#F00020' }}>Lỗi: {error}</p>
        <button
          onClick={() => navigate('/historyreport')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#F00020',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Quay lại lịch sử báo cáo
        </button>
      </div>
    )
  }

  return (
    <div className="report-container">
      {/* Back Button */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '20px 40px 0'
      }}>
        <button
          onClick={() => navigate('/historyreport')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: '#F00020',
            border: '2px solid #F00020',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F00020'
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#F00020'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Quay lại
        </button>
      </div>

      {/* Sticky Navigation Bar */}
      <nav className="report-nav">
        <div className="nav-content">
          <button
            className={`nav-item ${activeSection === 'products' ? 'active' : ''}`}
            onClick={() => scrollToSection('products')}
          >
            <span className="nav-number">1</span>
            <span className="nav-label">Sản phẩm & Dịch vụ</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'bankingNews' ? 'active' : ''}`}
            onClick={() => scrollToSection('bankingNews')}
          >
            <span className="nav-number">2</span>
            <span className="nav-label">Tin tức Ngân hàng</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'fintechNews' ? 'active' : ''}`}
            onClick={() => scrollToSection('fintechNews')}
          >
            <span className="nav-number">3</span>
            <span className="nav-label">Tin tức Fintech</span>
          </button>
        </div>
      </nav>

      {/* Main Report Content */}
      <main className="report-main">
        {/* Hero Section */}
        <div className="report-hero">
          <h1 className="report-title">Báo cáo Tổng hợp</h1>
          <p className="report-subtitle">Thời gian: {dateRange || 'Không có dữ liệu'}</p>
        </div>

        {/* Content Sections */}
        {renderNewsSection('Sản phẩm & Dịch vụ mới', products, 'products', productsRef)}
        {renderNewsSection('Tin tức ngành Ngân hàng', bankingNews, 'bankingNews', bankingNewsRef)}
        {renderNewsSection('Tin tức ngành Fintech', fintechNews, 'fintechNews', fintechNewsRef)}

        {/* Export Button at Bottom */}
        <div className="report-footer">
          <button className="export-button-modern">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Xuất báo cáo
          </button>
        </div>
      </main>
    </div>
  )
}

export default ViewReport
