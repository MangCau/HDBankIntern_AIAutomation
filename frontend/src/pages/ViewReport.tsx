import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiEndpoint } from '../config/api'
import '../App.css'

type Section = 'overview' | 'products' | 'banking' | 'fintech'

// Interfaces for Page 1 items
interface Page1Item {
  _id: string
  category: 'new-products' | 'market-trends' | 'fintech-news'
  image?: string
  source_type?: string
  source_url?: string
  pdf_file_name?: string
  selected?: boolean
  reportSelected?: boolean
  detail_content?: string
  source_of_detail?: string
  topic_classification?: string
  // NewProductService fields
  bank?: string | string[]
  product_name?: string
  product_segment?: string[]
  description?: string
  date_published?: string | Date
  // BankingMarketTrend fields
  topic_group?: string
  title?: string
  summary?: string
  bank_related?: string | string[]
  published_date?: string | Date
  // FintechNews fields
  fintech_topic?: string
  area_affected?: string | string[]
  organization?: string
}

// Interface for Page 2
interface ContentCard {
  _id: string
  product_name: string
  image: string
  detail_content: string
  source_of_detail: string
}

interface ComparisonTable {
  uniqueBanks: string[]
  productsByCategory: Record<string, Array<{
    level2: string
    banks: string[]
  }>>
}

interface Page2Data {
  comparisonTable: ComparisonTable
  summaryList: string[]
  contentCards: ContentCard[]
}

// Interface for Page 3
interface Page3Group {
  topic_group: string
  items: {
    _id: string
    title: string
    detail_content: string
    source_of_detail: string
  }[]
  images: string[]
  manualContent: string
}

// Interface for Page 4
interface Page4Group {
  area_affected: string
  items: {
    _id: string
    title: string
    detail_content: string
    source_of_detail: string
  }[]
  images: string[]
}

// Report interface
interface Report {
  _id: string
  startDate: string
  endDate: string
  dateRange: string
  page1: Page1Item[]
  page2: Page2Data
  page3: Page3Group[]
  page4: Page4Group[]
  totalItems: number
  createdAt: string
}

function ViewReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  const overviewRef = useRef<HTMLElement>(null)
  const productsRef = useRef<HTMLElement>(null)
  const bankingRef = useRef<HTMLElement>(null)
  const fintechRef = useRef<HTMLElement>(null)

  // Window resize listener
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch report by ID on component mount
  useEffect(() => {
    const fetchReport = async () => {
      if (!id) {
        setError('Report ID not provided')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(apiEndpoint(`api/reports/${id}`))
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch report')
        }

        setReport(result.data)
        setError(null)
      } catch (err) {
        console.error('Error fetching report:', err)
        setError(err instanceof Error ? err.message : 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [id])

  const scrollToSection = (section: Section) => {
    const refs = {
      overview: overviewRef,
      products: productsRef,
      banking: bankingRef,
      fintech: fintechRef
    }
    refs[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(section)
  }

  // Detect which section is in view
  useEffect(() => {
    if (loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        const intersectingEntries = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (intersectingEntries.length > 0) {
          const id = intersectingEntries[0].target.id as Section
          setActiveSection(id)
        }
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '-100px 0px -60% 0px'
      }
    )

    const sections = [overviewRef.current, productsRef.current, bankingRef.current, fintechRef.current]
    sections.forEach((section) => {
      if (section) observer.observe(section)
    })

    return () => {
      sections.forEach((section) => {
        if (section) observer.unobserve(section)
      })
    }
  }, [loading])

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

  if (error || !report) {
    return (
      <div className="report-container" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        gap: '16px'
      }}>
        <p style={{ fontSize: '18px', color: '#F00020' }}>Lỗi: {error || 'Không có báo cáo'}</p>
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
          Quay lại
        </button>
      </div>
    )
  }

  // Categorize page1 items by category
  // Only show items with reportSelected = true (double-check filter)
  const productsData = report.page1?.filter(item => item.category === 'new-products' && item.reportSelected === true) || []
  const bankingData = report.page1?.filter(item => item.category === 'market-trends' && item.reportSelected === true) || []
  const fintechData = report.page1?.filter(item => item.category === 'fintech-news' && item.reportSelected === true) || []

  return (
    <div className="report-container">
      {/* Back Button */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1001
      }}>
        <button
          onClick={() => navigate('/historyreport')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#F00020',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#d00018'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F00020'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Quay lại
        </button>
      </div>

      {/* Sticky Navigation Bar */}
      <nav className="report-nav">
        <div className="nav-content">
          <button
            className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => scrollToSection('overview')}
          >
            <span className="nav-number">1</span>
            <span className="nav-label">Tổng hợp nhanh tin tức</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'products' ? 'active' : ''}`}
            onClick={() => scrollToSection('products')}
          >
            <span className="nav-number">2</span>
            <span className="nav-label">Cập nhật sản phẩm mới và nổi bật các ngân hàng</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'banking' ? 'active' : ''}`}
            onClick={() => scrollToSection('banking')}
          >
            <span className="nav-number">3</span>
            <span className="nav-label">Cập nhật tin tức nổi bật của thị trường ngân hàng</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'fintech' ? 'active' : ''}`}
            onClick={() => scrollToSection('fintech')}
          >
            <span className="nav-number">4</span>
            <span className="nav-label">Cập nhật tin tức nổi bật của thị trường fintech</span>
          </button>
        </div>
      </nav>

      {/* Main Report Content */}
      <main className="report-main">
        {/* Hero Section */}
        <div className="report-hero">
          <h1 className="report-title">Báo cáo Tổng hợp</h1>
          <p className="report-subtitle">Thời gian: {report.dateRange || 'Không có dữ liệu'}</p>
        </div>

        {/* Section 1: Overview - Page 1 data grouped by 3 categories */}
        <section id="overview" ref={overviewRef} className="report-section">
          <div className="section-header">
            <h2 className="section-title-large">Tổng hợp nhanh tin tức</h2>
            <div className="section-divider"></div>
          </div>

          {/* Products Category */}
          <div style={{ marginBottom: '48px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', color: '#333' }}>
              Sản phẩm & Dịch vụ mới
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: windowWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              {productsData.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px 0', gridColumn: '1 / -1' }}>
                  Không có dữ liệu
                </p>
              ) : (
                productsData.map((item) => (
                  <article key={item._id} style={{
                    display: 'flex',
                    flexDirection: windowWidth < 480 ? 'column' : 'row',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    overflow: 'visible',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'pointer',
                    minHeight: windowWidth < 480 ? 'auto' : '180px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {/* Image Section - Left */}
                    <div style={{
                      width: windowWidth < 480 ? '100%' : '200px',
                      minWidth: windowWidth < 480 ? 'auto' : '200px',
                      height: windowWidth < 480 ? '180px' : '100%',
                      flexShrink: 0,
                      overflow: 'hidden',
                      backgroundColor: '#f0f0f0',
                      borderRadius: windowWidth < 480 ? '8px 8px 0 0' : '8px 0 0 8px'
                    }}>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.product_name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#999',
                          fontSize: '12px'
                        }}>
                          Không có hình ảnh
                        </div>
                      )}
                    </div>
                    {/* Content Section - Right */}
                    <div style={{
                      flex: 1,
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0
                    }}>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '8px',
                        lineHeight: '1.4'
                      }}>
                        {item.product_name || 'Không có tiêu đề'}
                      </h4>
                      <p style={{
                        fontSize: '14px',
                        color: '#666',
                        lineHeight: '1.6'
                      }}>
                        {item.description || ''}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          {/* Banking News Category */}
          <div style={{ marginBottom: '48px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', color: '#333' }}>
              Tin tức ngành Ngân hàng
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: windowWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              {bankingData.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px 0', gridColumn: '1 / -1' }}>
                  Không có dữ liệu
                </p>
              ) : (
                bankingData.map((item) => (
                  <article key={item._id} style={{
                    display: 'flex',
                    flexDirection: windowWidth < 480 ? 'column' : 'row',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    overflow: 'visible',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'pointer',
                    minHeight: windowWidth < 480 ? 'auto' : '180px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {/* Image Section - Left */}
                    <div style={{
                      width: windowWidth < 480 ? '100%' : '200px',
                      minWidth: windowWidth < 480 ? 'auto' : '200px',
                      height: windowWidth < 480 ? '180px' : '100%',
                      flexShrink: 0,
                      overflow: 'hidden',
                      backgroundColor: '#f0f0f0',
                      borderRadius: windowWidth < 480 ? '8px 8px 0 0' : '8px 0 0 8px'
                    }}>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#999',
                          fontSize: '12px'
                        }}>
                          Không có hình ảnh
                        </div>
                      )}
                    </div>
                    {/* Content Section - Right */}
                    <div style={{
                      flex: 1,
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0
                    }}>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '8px',
                        lineHeight: '1.4'
                      }}>
                        {item.title || 'Không có tiêu đề'}
                      </h4>
                      <p style={{
                        fontSize: '14px',
                        color: '#666',
                        lineHeight: '1.6'
                      }}>
                        {item.summary || ''}
                      </p>
                      {/* {item.source_of_detail && (
                        <p style={{
                          fontSize: '12px',
                          color: '#6c757d',
                          fontStyle: 'italic',
                          marginTop: 'auto'
                        }}>
                          Nguồn: {item.source_of_detail}
                        </p>
                      )} */}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          {/* Fintech News Category */}
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', color: '#333' }}>
              Tin tức ngành Fintech
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: windowWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
              gap: '20px'
            }}>
              {fintechData.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px 0', gridColumn: '1 / -1' }}>
                  Không có dữ liệu
                </p>
              ) : (
                fintechData.map((item) => (
                  <article key={item._id} style={{
                    display: 'flex',
                    flexDirection: windowWidth < 480 ? 'column' : 'row',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    overflow: 'visible',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'pointer',
                    minHeight: windowWidth < 480 ? 'auto' : '180px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {/* Image Section - Left */}
                    <div style={{
                      width: windowWidth < 480 ? '100%' : '200px',
                      minWidth: windowWidth < 480 ? 'auto' : '200px',
                      height: windowWidth < 480 ? '180px' : '100%',
                      flexShrink: 0,
                      overflow: 'hidden',
                      backgroundColor: '#f0f0f0',
                      borderRadius: windowWidth < 480 ? '8px 8px 0 0' : '8px 0 0 8px'
                    }}>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#999',
                          fontSize: '12px'
                        }}>
                          Không có hình ảnh
                        </div>
                      )}
                    </div>
                    {/* Content Section - Right */}
                    <div style={{
                      flex: 1,
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0
                    }}>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '8px',
                        lineHeight: '1.4'
                      }}>
                        {item.title || 'Không có tiêu đề'}
                      </h4>
                      <p style={{
                        fontSize: '14px',
                        color: '#666',
                        lineHeight: '1.6'
                      }}>
                        {item.summary || ''}
                      </p>
                      {/* {item.source_of_detail && (
                        <p style={{
                          fontSize: '12px',
                          color: '#6c757d',
                          fontStyle: 'italic',
                          marginTop: 'auto'
                        }}>
                          Nguồn: {item.source_of_detail}
                        </p>
                      )} */}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Products - Page 2 data */}
        <section id="products" ref={productsRef} className="report-section">
          <div className="section-header">
            <h2 className="section-title-large">Cập nhật sản phẩm mới và nổi bật các ngân hàng</h2>
            <div className="section-divider"></div>
          </div>

          {/* Product Comparison Table */}
          {report.page2?.comparisonTable?.productsByCategory && Object.keys(report.page2.comparisonTable.productsByCategory).length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              {windowWidth >= 480 ? (
                <div style={{
                  overflowX: 'auto',
                  marginBottom: '32px',
                  border: '2px solid #F00020',
                  borderRadius: '8px',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    backgroundColor: '#ffffff',
                    minWidth: windowWidth < 640 ? '500px' : '600px',
                    fontSize: windowWidth < 640 ? '11px' : windowWidth < 768 ? '12px' : '14px'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F00020' }}>
                        <th style={{
                          padding: windowWidth < 640 ? '8px' : windowWidth < 768 ? '12px' : '16px',
                          textAlign: 'left',
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: windowWidth < 640 ? '11px' : windowWidth < 768 ? '12px' : '14px',
                          borderRight: '1px solid rgba(255,255,255,0.2)',
                          minWidth: windowWidth < 640 ? '140px' : windowWidth < 768 ? '180px' : '250px'
                        }}>
                          Sản phẩm / Dịch vụ
                        </th>
                        {report.page2.comparisonTable.uniqueBanks.map(bank => (
                          <th key={bank} style={{
                            padding: windowWidth < 640 ? '8px 4px' : windowWidth < 768 ? '10px 8px' : '16px',
                            textAlign: 'center',
                            color: '#ffffff',
                            fontWeight: '700',
                            fontSize: windowWidth < 640 ? '10px' : windowWidth < 768 ? '11px' : '14px',
                            borderRight: '1px solid rgba(255,255,255,0.2)',
                            minWidth: windowWidth < 640 ? '60px' : windowWidth < 768 ? '75px' : '100px'
                          }}>
                            {bank}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(report.page2.comparisonTable.productsByCategory).map(([level1, level2Items], catIndex) => (
                        <>
                          {/* Level 1 Row */}
                          <tr key={`cat-${catIndex}`} style={{ backgroundColor: '#FFF9E6' }}>
                            <td colSpan={report.page2.comparisonTable.uniqueBanks.length + 1} style={{
                              padding: windowWidth < 640 ? '8px 12px' : windowWidth < 768 ? '10px 14px' : '12px 16px',
                              fontWeight: '700',
                              fontSize: windowWidth < 640 ? '12px' : windowWidth < 768 ? '13px' : '15px',
                              color: '#2c3e50',
                              borderBottom: '1px solid #dee2e6'
                            }}>
                              {level1}
                            </td>
                          </tr>
                          {/* Level 2 Rows */}
                          {level2Items.map((item, itemIndex) => (
                            <tr key={`item-${catIndex}-${itemIndex}`} style={{
                              backgroundColor: itemIndex % 2 === 0 ? '#ffffff' : '#f8f9fa',
                              borderBottom: '1px solid #dee2e6'
                            }}>
                              <td style={{
                                padding: windowWidth < 640 ? '8px' : windowWidth < 768 ? '10px 12px' : '12px 16px',
                                fontSize: windowWidth < 640 ? '11px' : windowWidth < 768 ? '12px' : '14px',
                                color: '#0066cc',
                                paddingLeft: windowWidth < 640 ? '16px' : windowWidth < 768 ? '24px' : '32px',
                                borderRight: '1px solid #dee2e6'
                              }}>
                                {item.level2}
                              </td>
                              {report.page2.comparisonTable.uniqueBanks.map(bank => (
                                <td key={bank} style={{
                                  padding: windowWidth < 640 ? '8px 4px' : windowWidth < 768 ? '10px 8px' : '12px 16px',
                                  textAlign: 'center',
                                  borderRight: '1px solid #dee2e6'
                                }}>
                                  {item.banks.includes(bank) && (
                                    <span style={{
                                      color: '#28a745',
                                      fontSize: windowWidth < 640 ? '16px' : windowWidth < 768 ? '18px' : '20px',
                                      fontWeight: 'bold'
                                    }}>✓</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Mobile Card View */
                <div style={{ marginBottom: '32px' }}>
                  {Object.entries(report.page2.comparisonTable.productsByCategory).map(([level1, level2Items], catIndex) => (
                    <div key={`mobile-cat-${catIndex}`} style={{ marginBottom: '24px' }}>
                      <div style={{
                        backgroundColor: '#F00020',
                        color: '#ffffff',
                        padding: '12px 16px',
                        fontWeight: '700',
                        fontSize: '14px',
                        borderRadius: '8px 8px 0 0'
                      }}>
                        {level1}
                      </div>
                      {level2Items.map((item, itemIndex) => (
                        <div key={`mobile-item-${catIndex}-${itemIndex}`} style={{
                          border: '1px solid #dee2e6',
                          borderTop: itemIndex === 0 ? 'none' : '1px solid #dee2e6',
                          padding: '12px 16px',
                          backgroundColor: '#ffffff'
                        }}>
                          <div style={{
                            fontWeight: '600',
                            fontSize: '13px',
                            color: '#0066cc',
                            marginBottom: '8px'
                          }}>
                            {item.level2}
                          </div>
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            {item.banks.map(bank => (
                              <span key={bank} style={{
                                backgroundColor: '#28a745',
                                color: '#ffffff',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                {bank}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary List */}
          {report.page2?.summaryList && report.page2.summaryList.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: windowWidth < 480 ? '18px' : '20px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#333'
              }}>
                Danh sách tổng hợp
              </h3>
              <ul style={{
                listStyle: 'disc inside',
                padding: windowWidth < 480 ? '16px' : '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                lineHeight: '1.8'
              }}>
                {report.page2.summaryList.map((item, index) => (
                  <li key={index} style={{
                    padding: windowWidth < 480 ? '6px 0' : '8px 0',
                    fontSize: windowWidth < 480 ? '14px' : '16px',
                    color: '#495057',
                    wordBreak: 'break-word'
                  }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Content Cards - Similar to SummaryPages Page 2 */}
          {report.page2?.contentCards?.map((card) => (
            <div key={card._id} style={{
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              marginBottom: '24px',
              overflow: 'hidden',
              backgroundColor: '#ffffff'
            }}>
              {/* Product Name Header - Two Column Layout */}
              <div style={{
                display: 'flex',
                flexDirection: windowWidth < 768 ? 'column' : 'row',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '16px'
              }}>
                {/* Left Column - Label */}
                <div style={{
                  width: windowWidth < 768 ? '100%' : '50%',
                  padding: '16px 20px',
                  backgroundColor: '#fff3c5ff',
                  color: '#2c3e50',
                  textAlign: 'center',
                  borderRight: windowWidth < 768 ? 'none' : '1px solid rgba(255,255,255,0.3)',
                  borderBottom: windowWidth < 768 ? '1px solid rgba(255,255,255,0.3)' : 'none'
                }}>
                  Sản phẩm/Dịch vụ
                </div>
                {/* Right Column - Product Name */}
                <div style={{
                  width: windowWidth < 768 ? '100%' : '50%',
                  padding: '16px 20px',
                  backgroundColor: '#c4cfffff',
                  textAlign: 'center',
                  color: '#2c3e50',
                }}>
                  {card.product_name}
                </div>
              </div>

              {/* Content */}
              <div style={{
                display: 'flex',
                flexDirection: windowWidth < 768 ? 'column' : 'row'
              }}>
                {/* Image Section - 50% width */}
                <div style={{
                  width: windowWidth < 768 ? '100%' : '50%',
                  flex: windowWidth < 768 ? 'none' : '1',
                  padding: '20px',
                  borderRight: windowWidth < 768 ? 'none' : '1px solid #dee2e6',
                  borderBottom: windowWidth < 768 ? '1px solid #dee2e6' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {card.image ? (
                    <div style={{
                      width: '100%',
                      height: windowWidth < 768 ? '250px' : '300px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img src={card.image} alt={card.product_name}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          width: 'auto',
                          height: 'auto',
                          display: 'block',
                          borderRadius: '6px',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      width: '100%',
                      height: windowWidth < 768 ? '250px' : '300px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px',
                      border: '2px dashed #dee2e6',
                      color: '#adb5bd',
                      fontSize: '14px'
                    }}>
                      <p style={{ margin: 0, fontWeight: '500' }}>Chưa có ảnh</p>
                    </div>
                  )}
                </div>

                {/* Detail Section - 50% width */}
                <div style={{
                  width: windowWidth < 768 ? '100%' : '50%',
                  flex: windowWidth < 768 ? 'none' : '1',
                  padding: '20px',
                  fontSize: '14px',
                  color: '#495057',
                  lineHeight: '1.8',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    border: '1px solid #dee2e6',
                    marginBottom: '16px',
                    width: '100%',
                    whiteSpace: 'pre-wrap',
                    textAlign: 'left'
                  }}>
                    {card.detail_content || 'Chưa có nội dung chi tiết'}
                  </div>
                  {card.source_of_detail && (
                    <div style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#6c757d',
                      fontStyle: 'italic',
                      textAlign: 'left',
                      width: '100%'
                    }}>
                      Nguồn: {card.source_of_detail}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Section 3: Banking - Page 3 data - Similar to SummaryPages Page 3 */}
        <section id="banking" ref={bankingRef} className="report-section">
          <div className="section-header">
            <h2 className="section-title-large">Cập nhật tin tức nổi bật của thị trường ngân hàng</h2>
            <div className="section-divider"></div>
          </div>

          {!report.page3 || report.page3.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>
              Không có dữ liệu
            </p>
          ) : (
            report.page3.map((group, index) => (
              <div key={index} style={{
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                marginBottom: '24px',
                overflow: 'hidden',
                backgroundColor: '#ffffff'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: windowWidth < 768 ? 'column' : 'row'
                }}>
                  {/* Left column: Topic Group */}
                  <div style={{
                    width: windowWidth < 768 ? '100%' : '200px',
                    minWidth: windowWidth < 768 ? 'auto' : '200px',
                    padding: '20px',
                    backgroundColor: '#fff3c5ff',
                    borderRight: windowWidth < 768 ? 'none' : '1px solid #dee2e6',
                    borderBottom: windowWidth < 768 ? '1px solid #dee2e6' : 'none',
                    fontWeight: '700',
                    fontSize: '14px',
                    color: '#2c3e50',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {group.topic_group}
                  </div>

                  {/* Right column: Items */}
                  <div style={{
                    flex: 1,
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                  }}>
                    {/* Manual Content for Tỷ giá, Giá vàng */}
                    {group.manualContent && (
                      <div style={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.6',
                        fontSize: '14px',
                        color: '#495057'
                      }}>
                        {group.manualContent}
                      </div>
                    )}

                    {/* Separator between manual content and items */}
                    {group.manualContent && group.items.length > 0 && (
                      <hr style={{
                        border: 'none',
                        borderTop: '1px solid #dee2e6',
                        margin: '16px 0'
                      }} />
                    )}

                    {/* Items */}
                    {group.items.length > 0 ? (
                      group.items.map((item, itemIndex) => (
                        <div key={item._id}>
                          {itemIndex > 0 && (
                            <hr style={{
                              border: 'none',
                              borderTop: '1px solid #dee2e6',
                              margin: '16px 0'
                            }} />
                          )}
                          <div style={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.6',
                            fontSize: '14px',
                            color: '#495057'
                          }}>
                            {item.detail_content || 'Chưa có nội dung chi tiết'}
                          </div>
                        </div>
                      ))
                    ) : (
                      !group.manualContent && (
                        <p style={{ color: '#adb5bd', fontStyle: 'italic', margin: 0 }}>
                          Chưa có nội dung
                        </p>
                      )
                    )}

                    {/* Images Gallery */}
                    {group.images && group.images.length > 0 && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '16px',
                        marginTop: '12px'
                      }}>
                        {group.images.map((image, imgIndex) => (
                          <div key={imgIndex} style={{
                            position: 'relative',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #dee2e6'
                          }}>
                            <img
                              src={image}
                              alt={`${group.topic_group} - ${imgIndex + 1}`}
                              style={{
                                width: '100%',
                                height: '200px',
                                objectFit: 'cover'
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Section 4: Fintech - Page 4 data - Similar to SummaryPages Page 4 */}
        <section id="fintech" ref={fintechRef} className="report-section">
          <div className="section-header">
            <h2 className="section-title-large">Cập nhật tin tức nổi bật của thị trường fintech</h2>
            <div className="section-divider"></div>
          </div>

          {!report.page4 || report.page4.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>
              Không có dữ liệu
            </p>
          ) : (
            report.page4.map((group, index) => (
              <div key={index} style={{
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                marginBottom: '24px',
                overflow: 'hidden',
                backgroundColor: '#ffffff'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: windowWidth < 768 ? 'column' : 'row'
                }}>
                  {/* Left column: Area Affected */}
                  <div style={{
                    width: windowWidth < 768 ? '100%' : '200px',
                    minWidth: windowWidth < 768 ? 'auto' : '200px',
                    padding: '20px',
                    backgroundColor: '#fff3c5ff',
                    borderRight: windowWidth < 768 ? 'none' : '1px solid #dee2e6',
                    borderBottom: windowWidth < 768 ? '1px solid #dee2e6' : 'none',
                    fontWeight: '700',
                    fontSize: '14px',
                    color: '#2c3e50',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {group.area_affected}
                  </div>

                  {/* Right column: Items */}
                  <div style={{
                    flex: 1,
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                  }}>
                    {group.items.length > 0 ? (
                      group.items.map((item, itemIndex) => (
                        <div key={item._id}>
                          {itemIndex > 0 && (
                            <hr style={{
                              border: 'none',
                              borderTop: '1px solid #dee2e6',
                              margin: '16px 0'
                            }} />
                          )}
                          <div style={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.6',
                            fontSize: '14px',
                            color: '#495057'
                          }}>
                            {item.detail_content || 'Chưa có nội dung chi tiết'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: '#adb5bd', fontStyle: 'italic', margin: 0 }}>
                        Chưa có nội dung
                      </p>
                    )}

                    {/* Images Gallery */}
                    {group.images && group.images.length > 0 && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '16px',
                        marginTop: '12px'
                      }}>
                        {group.images.map((image, imgIndex) => (
                          <div key={imgIndex} style={{
                            position: 'relative',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #dee2e6'
                          }}>
                            <img
                              src={image}
                              alt={`${group.area_affected} - ${imgIndex + 1}`}
                              style={{
                                width: '100%',
                                height: '200px',
                                objectFit: 'cover'
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

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
