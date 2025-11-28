import { useState, useEffect, useRef } from 'react'
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

function HomePage() {
  const [activeSection, setActiveSection] = useState<Category>('products')
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const productsRef = useRef<HTMLElement>(null)
  const bankingNewsRef = useRef<HTMLElement>(null)
  const fintechNewsRef = useRef<HTMLElement>(null)

  const toggleExpanded = (id: number) => {
    const newSet = new Set(expandedItems)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedItems(newSet)
  }

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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id as Category
            setActiveSection(id)
          }
        })
      },
      { threshold: 0.3 }
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
  }, [])

  const renderNewsSection = (title: string, data: NewsItem[], sectionId: Category, ref: React.RefObject<HTMLElement>) => (
    <section id={sectionId} ref={ref} className="report-section">
      <div className="section-header">
        <h2 className="section-title-large">{title}</h2>
        <div className="section-divider"></div>
      </div>

      <div className="news-grid">
        {data.map((item) => (
          <article key={item.id} className="news-card-modern">
            <div className="news-image-wrapper">
              <img src={item.image} alt={item.title} className="news-image-modern" />
            </div>
            <div className="news-content-modern">
              <h3 className="news-title-modern">{item.title}</h3>
              <p className="news-summary-modern">{item.summary}</p>

              {expandedItems.has(item.id) && (
                <div className="news-details-modern">
                  <div className="detail-row">
                    <span className="detail-label">Ngân hàng:</span>
                    <span className="detail-value">{item.bank}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Ngày phát hành:</span>
                    <span className="detail-value">{formatDate(item.publishDate)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Nguồn:</span>
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="detail-link">
                      {item.sourceUrl}
                    </a>
                  </div>
                </div>
              )}

              <div className="news-actions">
                <button onClick={() => toggleExpanded(item.id)} className="action-btn">
                  {expandedItems.has(item.id) ? 'Thu gọn' : 'Xem chi tiết'}
                </button>
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="action-btn secondary">
                  Xem nguồn
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )

  return (
    <div className="report-container">
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
          <p className="report-subtitle">Thời gian: 01/01/2025 - 19/01/2025</p>
        </div>

        {/* Content Sections */}
        {renderNewsSection('Sản phẩm & Dịch vụ mới', MOCK_DATA.products, 'products', productsRef)}
        {renderNewsSection('Tin tức ngành Ngân hàng', MOCK_DATA.bankingNews, 'bankingNews', bankingNewsRef)}
        {renderNewsSection('Tin tức ngành Fintech', MOCK_DATA.fintechNews, 'fintechNews', fintechNewsRef)}

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

export default HomePage
