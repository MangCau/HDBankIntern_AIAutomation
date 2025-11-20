import '../App.css'
import { useState } from 'react'

// Mock data cho Sản phẩm & Dịch vụ mới
const MOCK_PRODUCTS = [
    {
        id: 1,
        title: 'Ra mắt thẻ tín dụng Visa Platinum với ưu đãi hoàn tiền 10%',
        productName: 'Thẻ tín dụng Visa Platinum',
        banks: ['HDBank', 'Vietcombank', 'Techcombank'],
        productSegment: 'Thẻ tín dụng',
        productCategory: 'Bán lẻ',
        summary: 'Ra mắt thẻ tín dụng Visa Platinum với ưu đãi hoàn tiền lên đến 10% cho mọi giao dịch mua sắm, ăn uống và du lịch',
        publishDate: '2025-01-20',
        extractFrom: 'Bao_cao_san_pham_Q1_2025.pdf',
        sourceUrl: 'https://hdbank.com.vn/news/the-tin-dung-moi'
    },
    {
        id: 2,
        title: 'Gói tiết kiệm linh hoạt với lãi suất ưu đãi 6.5%/năm',
        productName: 'Tiết kiệm online HDBank',
        banks: ['HDBank'],
        productSegment: 'Tiết kiệm',
        productCategory: 'Tiết kiệm trực tuyến',
        summary: 'Gói tiết kiệm linh hoạt cho phép rút tiền bất cứ lúc nào với lãi suất ưu đãi lên đến 6.5%/năm',
        publishDate: '2025-01-20',
        extractFrom: 'tiet_kiem_online.pdf',
        sourceUrl: 'https://hdbank.com.vn/tiet-kiem-online'
    },
    {
        id: 3,
        title: 'Chương trình cho vay doanh nghiệp SME lãi suất ưu đãi',
        productName: 'Cho vay SME',
        banks: ['BIDV', 'Vietinbank', 'ACB'],
        productSegment: 'Doanh nghiệp',
        productCategory: 'Tín dụng SME',
        summary: 'Chương trình cho vay doanh nghiệp vừa và nhỏ với lãi suất ưu đãi, thủ tục đơn giản, giải ngân nhanh',
        publishDate: '2025-01-19',
        extractFrom: 'Chinh_sach_cho_vay_SME_2025.docx',
        sourceUrl: 'https://bidv.com.vn/news/cho-vay-sme'
    },
    {
        id: 4,
        title: 'Cập nhật tính năng chuyển tiền quốc tế trên Mobile Banking',
        productName: 'Mobile Banking',
        banks: ['HDBank', 'MB Bank'],
        productSegment: 'Ngân hàng số',
        productCategory: 'Chuyển tiền quốc tế',
        summary: 'Tính năng mới cho phép chuyển tiền quốc tế nhanh chóng, tiện lợi với phí thấp',
        publishDate: '2025-01-18',
        extractFrom: 'Cap_nhat_mobile_banking_012025.pdf',
        sourceUrl: 'https://hdbank.com.vn/mobile-banking'
    }
]

// Mock data cho Tin tức ngành Ngân hàng
const MOCK_BANKING_NEWS = [
    {
        id: 1,
        title: 'Ngân hàng đẩy mạnh phát hành thẻ thanh toán không tiếp xúc',
        banks: ['HDBank', 'Vietcombank', 'BIDV'],
        topicGroup: 'Thẻ thanh toán',
        impactLevel: 'Toàn ngành',
        summary: 'Các ngân hàng lớn đẩy mạnh phát hành thẻ thanh toán không tiếp xúc với công nghệ NFC, tích hợp nhiều tính năng bảo mật hiện đại',
        publishDate: '2025-01-20',
        extractFrom: 'tin_tuc_ngan_hang.pdf',
        sourceUrl: 'https://cafef.vn/ngan-hang-day-manh-the-nfc'
    },
    {
        id: 2,
        title: 'Xu hướng chuyển đổi số trong ngành ngân hàng',
        banks: ['Techcombank', 'VPBank', 'TPBank'],
        topicGroup: 'Chuyển đổi số',
        impactLevel: 'Techcombank, VPBank, TPBank',
        summary: 'Đẩy mạnh dịch vụ ngân hàng số và giảm thiểu giao dịch tại quầy, nâng cao trải nghiệm khách hàng',
        publishDate: '2025-01-20',
        extractFrom: 'Bao_cao_chuyen_doi_so_nganh_ngan_hang.pdf',
        sourceUrl: 'https://sbv.gov.vn/bao-cao-chuyen-doi-so'
    },
    {
        id: 3,
        title: 'Ngân hàng mở rộng gói tín dụng doanh nghiệp ưu đãi',
        banks: ['ACB', 'MB Bank', 'Sacombank'],
        topicGroup: 'Tín dụng doanh nghiệp',
        impactLevel: 'ACB, MB Bank, Sacombank',
        summary: 'Mở rộng gói tín dụng với điều kiện ưu đãi hỗ trợ phục hồi kinh tế sau đại dịch',
        publishDate: '2025-01-19',
        extractFrom: 'Tin_tuc_ngan_hang_012025.docx',
        sourceUrl: 'https://vietstock.vn/tin-tuc-ngan-hang'
    },
    {
        id: 4,
        title: 'Tăng cường cho vay nông nghiệp công nghệ cao',
        banks: ['Vietinbank', 'Agribank'],
        topicGroup: 'Cho vay nông nghiệp',
        impactLevel: 'Vietinbank, Agribank',
        summary: 'Chính phủ yêu cầu các ngân hàng tăng cường cho vay lĩnh vực nông nghiệp công nghệ cao với lãi suất ưu đãi',
        publishDate: '2025-01-18',
        extractFrom: 'cho_vay_nong_nghiep.pdf',
        sourceUrl: 'https://nhandan.vn/cho-vay-nong-nghiep'
    }
]

// Mock data cho Tin tức ngành Fintech
const MOCK_FINTECH_NEWS = [
    {
        id: 1,
        title: 'Ngân hàng Nhà nước thí điểm triển khai tiền kỹ thuật số CBDC',
        banks: ['SBV'],
        fintechTopic: 'Tiền kỹ thuật số',
        organization: 'Ngân hàng Nhà nước Việt Nam',
        impactArea: 'Hệ thống thanh toán quốc gia',
        summary: 'SBV công bố kế hoạch thí điểm đồng tiền kỹ thuật số của ngân hàng trung ương (CBDC) trong năm 2025',
        publishDate: '2025-01-20',
        extractFrom: 'Ke_hoach_thi_diem_CBDC_2025.pdf',
        sourceUrl: 'https://sbv.gov.vn/cbdc-pilot-2025'
    },
    {
        id: 2,
        title: 'Ứng dụng AI trong phát hiện gian lận tài chính tại Việt Nam',
        banks: ['Vietnam Fintech Association'],
        fintechTopic: 'AI & Bảo mật',
        organization: 'Hiệp hội Fintech Việt Nam',
        impactArea: 'An ninh mạng và chống gian lận',
        summary: 'Các công ty fintech và ngân hàng đang tích cực triển khai hệ thống AI để phát hiện và ngăn chặn gian lận',
        publishDate: '2025-01-20',
        extractFrom: 'ai_fintech_fraud_detection.pdf',
        sourceUrl: 'https://vinasa.org.vn/ai-fintech-fraud-detection'
    },
    {
        id: 3,
        title: 'Nền tảng cho vay P2P tăng trưởng mạnh tại Việt Nam',
        banks: ['Fiin Group', 'Tima', 'MoMo'],
        fintechTopic: 'Digital Lending',
        organization: 'Các nền tảng fintech',
        impactArea: 'Tài chính cá nhân và SME',
        summary: 'Các nền tảng cho vay ngang hàng ghi nhận tăng trưởng 45% về số lượng người dùng trong năm 2024',
        publishDate: '2025-01-19',
        extractFrom: 'Bao_cao_P2P_lending_2024.docx',
        sourceUrl: 'https://cafef.vn/p2p-lending-growth-vietnam'
    },
    {
        id: 4,
        title: 'Chính phủ ban hành khung pháp lý cho Open Banking',
        banks: ['Bộ Tài chính', 'SBV'],
        fintechTopic: 'Open Banking',
        organization: 'Bộ Tài chính - Ngân hàng Nhà nước',
        impactArea: 'Toàn hệ thống ngân hàng',
        summary: 'Dự thảo quy định về Open Banking cho phép chia sẻ dữ liệu tài chính giữa các tổ chức với sự đồng ý của khách hàng',
        publishDate: '2025-01-18',
        extractFrom: 'Du_thao_Open_Banking_VN.pdf',
        sourceUrl: 'https://mof.gov.vn/open-banking-framework'
    }
]

const CATEGORIES = [
    { value: 'products', label: 'Sản phẩm & Dịch vụ mới' },
    { value: 'banking', label: 'Tin tức ngành Ngân hàng' },
    { value: 'fintech', label: 'Tin tức ngành Fintech' }
]

type CategoryValue = 'products' | 'banking' | 'fintech'

function Manage() {
    const today = new Date().toISOString().split('T')[0]
    const [selectedCategory, setSelectedCategory] = useState<CategoryValue>('products')
    const [startDate, setStartDate] = useState(today)
    const [endDate, setEndDate] = useState(today)
    const [searchQuery, setSearchQuery] = useState('')

    // Get data dựa vào category
    const getCategoryData = () => {
        switch (selectedCategory) {
            case 'products':
                return MOCK_PRODUCTS
            case 'banking':
                return MOCK_BANKING_NEWS
            case 'fintech':
                return MOCK_FINTECH_NEWS
            default:
                return []
        }
    }

    // Filter data theo date range and search query
    const getFilteredData = () => {
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
                item.banks.some(bank => bank.toLowerCase().includes(query))
            )
        }

        return filtered
    }

    const filteredData = getFilteredData()
    const totalSources = MOCK_PRODUCTS.length + MOCK_BANKING_NEWS.length + MOCK_FINTECH_NEWS.length

    const getCategoryTitle = () => {
        const category = CATEGORIES.find(cat => cat.value === selectedCategory)
        return category ? category.label : ''
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    return (
        <div className='page-container'>
            {/* Sidebar */}
            <aside className='sidebar'>
                {/* TRẠNG THÁI */}
                <div className='sidebar-section'>
                    <h3 className='section-title'>TRẠNG THÁI</h3>
                    <div className='section-content'>
                        <p className='status-text'>
                            Hôm nay đã thu thập tin tức mới từ <strong>{totalSources}</strong> nguồn
                        </p>
                    </div>
                </div>

                {/* THỜI GIAN */}
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

                {/* CHỌN DANH MỤC */}
                <div className='sidebar-section'>
                    <h3 className='section-title'>CHỌN DANH MỤC</h3>
                    <div className='section-content'>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as CategoryValue)}
                            className='category-select'
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <div className="content-header">
                    <h1>{getCategoryTitle()}</h1>
                    <p className="content-subtitle">
                        Tổng cộng: <strong>{filteredData.length}</strong> mục
                    </p>
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
                    {filteredData.map((item) => (
                        <article key={item.id} className="news-card">
                            <div className="news-content">
                                <h2 className="news-title">{item.title}</h2>
                                <div className='news-meta'>
                                    {selectedCategory === 'products' && 'productName' in item && (
                                        <p>Tên sản phẩm/dịch vụ: <strong style={{ color: '#F5B800' }}>{item.productName}</strong></p>
                                    )}
                                    {selectedCategory === 'banking' && 'topicGroup' in item && (
                                        <>
                                            <p>Nhóm chủ đề: <strong style={{ color: '#F5B800' }}>{item.topicGroup}</strong></p>
                                            <p>Mức độ tác động: <strong style={{ color: '#F5B800' }}>{item.impactLevel}</strong></p>
                                        </>
                                    )}
                                    {selectedCategory === 'fintech' && 'fintechTopic' in item && (
                                        <>
                                            <p>Chủ đề Fintech: <strong style={{ color: '#F5B800' }}>{item.fintechTopic}</strong></p>
                                            <p>Tổ chức: <strong style={{ color: '#F5B800' }}>{item.organization}</strong></p>
                                            <p>Lĩnh vực tác động: <strong style={{ color: '#F5B800' }}>{item.impactArea}</strong></p>
                                        </>
                                    )}
                                    <p>Danh sách các bank: <strong style={{ color: '#F5B800' }}>{item.banks.join(', ')}</strong></p>
                                    {selectedCategory === 'products' && 'productSegment' in item && (
                                        <>
                                            <p>Product segment: <strong style={{ color: '#F5B800' }}>{item.productSegment}</strong></p>
                                            <p>Product Category: <strong style={{ color: '#F5B800' }}>{item.productCategory}</strong></p>
                                        </>
                                    )}
                                </div>
                                <p className="news-summary">{item.summary}</p>
                                <div className="news-meta">
                                    <div className="meta-item">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                            <line x1="16" y1="2" x2="16" y2="6" />
                                            <line x1="8" y1="2" x2="8" y2="6" />
                                            <line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        <span>Ngày đăng: {formatDate(item.publishDate)}</span>
                                    </div>
                                    <div className="meta-item">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                        </svg>
                                        <span>Trích xuất từ: {item.extractFrom}</span>
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

                    {filteredData.length === 0 && (
                        <div className='no-results'>
                            <p>Không tìm thấy tin tức nào trong khoảng thời gian này</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default Manage
