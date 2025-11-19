import { useState } from 'react'
import '../App.css'

// Dữ liệu giả cho demo
const MOCK_DATA = {
  products: [
    {
      id: 1,
      image: 'https://via.placeholder.com/300x200/0066cc/ffffff?text=Product+1',
      title: 'Gói tài khoản tiết kiệm HDBank Smart Save Plus',
      summary: 'Sản phẩm tiết kiệm linh hoạt với lãi suất ưu đãi lên đến 6.5%/năm, kỳ hạn từ 1-24 tháng, rút trước hạn không mất phí.',
      bank: 'HDBank',
      publishDate: '2025-01-15',
      sourceUrl: 'https://hdbank.com.vn/san-pham'
    },
    {
      id: 2,
      image: 'https://via.placeholder.com/300x200/0066cc/ffffff?text=Product+2',
      title: 'Thẻ tín dụng VietCredit Platinum Cash Back',
      summary: 'Hoàn tiền 2% cho mọi giao dịch, miễn phí thường niên năm đầu, hạn mức lên đến 500 triệu đồng.',
      bank: 'VietCredit',
      publishDate: '2025-01-14',
      sourceUrl: 'https://vietcredit.com.vn/the-tin-dung'
    },
    {
      id: 3,
      image: 'https://via.placeholder.com/300x200/0066cc/ffffff?text=Product+3',
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
      image: 'https://via.placeholder.com/300x200/28a745/ffffff?text=Banking+News+1',
      title: 'NHNN tăng room tín dụng cho các ngân hàng thương mại',
      summary: 'Ngân hàng Nhà nước quyết định tăng room tín dụng thêm 2% cho các ngân hàng đáp ứng đủ điều kiện an toàn hoạt động, nhằm hỗ trợ tăng trưởng kinh tế năm 2025.',
      bank: 'Toàn ngành',
      publishDate: '2025-01-18',
      sourceUrl: 'https://sbv.gov.vn/tin-tuc'
    },
    {
      id: 2,
      image: 'https://via.placeholder.com/300x200/28a745/ffffff?text=Banking+News+2',
      title: 'Techcombank công bố lợi nhuận kỷ lục trong Q4/2024',
      summary: 'Techcombank đạt lợi nhuận trước thuế 18,500 tỷ đồng trong quý 4/2024, tăng 22% so với cùng kỳ năm trước nhờ tăng trưởng dư nợ tín dụng và thu nhập phí.',
      bank: 'Techcombank',
      publishDate: '2025-01-17',
      sourceUrl: 'https://techcombank.com.vn/bao-cao-tai-chinh'
    },
    {
      id: 3,
      image: 'https://via.placeholder.com/300x200/28a745/ffffff?text=Banking+News+3',
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
      image: 'https://via.placeholder.com/300x200/ff6347/ffffff?text=Fintech+1',
      title: 'MoMo ra mắt tính năng đầu tư chứng khoán tích hợp',
      summary: 'Ví điện tử MoMo công bố tích hợp tính năng mua bán chứng khoán trực tiếp trên ứng dụng, hợp tác cùng các công ty chứng khoán hàng đầu.',
      bank: 'MoMo',
      publishDate: '2025-01-19',
      sourceUrl: 'https://momo.vn/tin-tuc'
    },
    {
      id: 2,
      image: 'https://via.placeholder.com/300x200/ff6347/ffffff?text=Fintech+2',
      title: 'Startup Fintech Việt Nam nhận vốn đầu tư 50 triệu USD',
      summary: 'Nền tảng cho vay P2P Tima nhận vòng Series C trị giá 50 triệu USD từ quỹ đầu tư quốc tế, mở rộng thị trường khu vực Đông Nam Á.',
      bank: 'Tima',
      publishDate: '2025-01-18',
      sourceUrl: 'https://tima.vn/dau-tu'
    },
    {
      id: 3,
      image: 'https://via.placeholder.com/300x200/ff6347/ffffff?text=Fintech+3',
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
  const [selectedCategory, setSelectedCategory] = useState<Category>('products')

  const getCategoryData = (): NewsItem[] => {
    return MOCK_DATA[selectedCategory]
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

  return (
    <div className="page-container">
      {/* Sidebar Menu */}
      <aside className="sidebar">
        <div className='logo-img'></div>

        {/* Nút xuất báo cáo */}
        <button className="export-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Xuất báo cáo
        </button>

        {/* Thời gian */}
        <div className="sidebar-section">
          <h3 className="section-title">THỜI GIAN</h3>
          <div className="section-content">
            <p className="date-range">
              Báo cáo được tổng hợp từ ngày <strong>01/01/2025</strong> đến ngày <strong>19/01/2025</strong>
            </p>
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
          <h1>{getCategoryTitle()}</h1>
          <p className="content-subtitle">
            Tổng cộng: <strong>{getCategoryData().length}</strong> mục
          </p>
        </div>

        <div className="news-list">
          {getCategoryData().map((item) => (
            <article key={item.id} className="news-card">
              <div className="news-image">
                <img src={item.image} alt={item.title} />
              </div>
              <div className="news-content">
                <h2 className="news-title">{item.title}</h2>
                <p className="news-summary">{item.summary}</p>
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
          ))}
        </div>
      </main>
    </div>
  )
}

export default HomePage
