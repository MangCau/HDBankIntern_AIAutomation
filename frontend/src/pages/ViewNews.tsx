import '../App.css'
import { useState, useEffect, useMemo } from 'react'
import { apiEndpoint } from '../config/api'

const CATEGORIES = [
    { value: 'products', label: 'Sản phẩm & Dịch vụ mới' },
    { value: 'banking', label: 'Tin tức ngành Ngân hàng' },
    { value: 'fintech', label: 'Tin tức ngành Fintech' }
]

type CategoryValue = 'products' | 'banking' | 'fintech'

// Database model interfaces
interface NewProduct {
    _id: string
    bank: string[] | string
    product_name: string
    product_segment?: string
    description?: string
    date_published?: Date | string
    source_type?: string
    source_url?: string
    pdf_file_name?: string
}

interface BankingTrend {
    _id: string
    topic_group?: string
    title: string
    summary?: string
    bank_related: string[] | string
    source_type?: string
    source_url?: string
    published_date?: Date | string
    pdf_file_name?: string
}

interface FintechNews {
    _id: string
    fintech_topic?: string
    area_affected: string[] | string
    title: string
    summary?: string
    organization?: string
    source_type?: string
    source_url?: string
    published_date?: Date | string
    pdf_file_name?: string
}

function ViewNews() {
    const today = new Date().toISOString().split('T')[0]
    const [selectedCategory, setSelectedCategory] = useState<CategoryValue>('products')
    const [startDate, setStartDate] = useState(today)
    const [endDate, setEndDate] = useState(today)
    const [searchQuery, setSearchQuery] = useState('')

    const [products, setProducts] = useState<NewProduct[]>([])
    const [bankingTrends, setBankingTrends] = useState<BankingTrend[]>([])
    const [fintechNews, setFintechNews] = useState<FintechNews[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Helper function to normalize array fields (handle both string and array)
    const normalizeArray = (value: string | string[] | undefined): string[] => {
        if (!value) return []
        if (Array.isArray(value)) return value
        if (typeof value === 'string') {
            // Try to parse if it's a JSON string
            try {
                const parsed = JSON.parse(value)
                return Array.isArray(parsed) ? parsed : [value]
            } catch {
                return [value]
            }
        }
        return []
    }

    // Helper function to normalize date fields (handle both Date and string)
    const normalizeDate = (value: Date | string | undefined, fallback: string): string => {
        if (!value) return fallback
        try {
            if (typeof value === 'string') {
                // Handle date range format: "08 - 10/11/2025" or "8-10/11/2025"
                if (value.includes('-') && value.includes('/')) {
                    // Extract the end date from range
                    const rangeParts = value.split('-')
                    if (rangeParts.length === 2) {
                        const endPart = rangeParts[1].trim()
                        // endPart could be "10/11/2025"
                        const dateParts = endPart.split('/')
                        if (dateParts.length === 3) {
                            const day = dateParts[0]
                            const month = dateParts[1]
                            const year = dateParts[2]
                            const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                            return isoDate
                        }
                    }
                }
                // Handle single date DD/MM/YYYY format
                else if (value.includes('/')) {
                    const parts = value.split('/')
                    if (parts.length === 3) {
                        const day = parts[0]
                        const month = parts[1]
                        const year = parts[2]
                        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                        return isoDate
                    }
                }
            }
            // Otherwise, try to parse as Date object
            const date = new Date(value)
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0]
            }
        } catch (e) {
            console.error('Error parsing date:', value, e)
        }
        return fallback
    }

    // Fetch data from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                setError(null)

                const response = await fetch(apiEndpoint('api/data/all'))
                const result = await response.json()

                if (result.success) {
                    console.log('Data fetched successfully:', {
                        products: result.data.newProducts?.length || 0,
                        banking: result.data.marketTrends?.length || 0,
                        fintech: result.data.fintechNews?.length || 0
                    })
                    console.log('Sample data:', {
                        product: result.data.newProducts?.[0],
                        banking: result.data.marketTrends?.[0],
                        fintech: result.data.fintechNews?.[0]
                    })
                    setProducts(result.data.newProducts || [])
                    setBankingTrends(result.data.marketTrends || [])
                    setFintechNews(result.data.fintechNews || [])
                } else {
                    setError(result.message || 'Không thể tải dữ liệu')
                }
            } catch (err: any) {
                if (err.message) {
                    setError(err.message)
                } else {
                    setError('Lỗi kết nối đến server')
                }
                console.error('Error fetching data:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    // Get data based on category
    const getCategoryData = () => {
        switch (selectedCategory) {
            case 'products':
                return products.map(p => ({
                    id: p._id,
                    title: p.product_name,
                    productName: p.product_name,
                    banks: normalizeArray(p.bank),
                    productSegment: p.product_segment || '',
                    summary: p.description || '',
                    publishDate: normalizeDate(p.date_published, today),
                    extractFrom: p.pdf_file_name || p.source_type || 'N/A',
                    sourceUrl: p.source_url || '#'
                }))
            case 'banking':
                return bankingTrends.map(t => ({
                    id: t._id,
                    title: t.title,
                    banks: normalizeArray(t.bank_related),
                    topicGroup: t.topic_group || 'N/A',
                    summary: t.summary || '',
                    publishDate: normalizeDate(t.published_date, today),
                    extractFrom: t.pdf_file_name || t.source_type || 'N/A',
                    sourceUrl: t.source_url || '#'
                }))
            case 'fintech':
                return fintechNews.map(f => ({
                    id: f._id,
                    title: f.title,
                    banks: normalizeArray(f.area_affected),
                    fintechTopic: f.fintech_topic || 'N/A',
                    organization: f.organization || 'N/A',
                    summary: f.summary || '',
                    publishDate: normalizeDate(f.published_date, today),
                    extractFrom: f.pdf_file_name || f.source_type || 'N/A',
                    sourceUrl: f.source_url || '#'
                }))
            default:
                return []
        }
    }

    // Filter data by date range and search query
    const getFilteredData = () => {
        const data = getCategoryData()
        let filtered = data.filter(item => {
            const itemDate = new Date(item.publishDate)
            const start = new Date(startDate)
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999) // Include the entire end date
            return itemDate >= start && itemDate <= end
        })

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(query) ||
                (item.summary && item.summary.toLowerCase().includes(query)) ||
                item.banks.some(bank => bank.toLowerCase().includes(query))
            )
        }

        return filtered
    }

    // Helper function to filter data by date range only
    const filterByDateRange = (data: any[]) => {
        return data.filter(item => {
            const itemDate = new Date(item.publishDate)
            const start = new Date(startDate)
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)
            return itemDate >= start && itemDate <= end
        })
    }

    const filteredData = getFilteredData()

    // Check if there's any data in the selected date range
    const hasDataInDateRange = useMemo(() => {
        const productsData = products.map(p => ({
            publishDate: normalizeDate(p.date_published, today)
        }))
        const bankingData = bankingTrends.map(t => ({
            publishDate: normalizeDate(t.published_date, today)
        }))
        const fintechData = fintechNews.map(f => ({
            publishDate: normalizeDate(f.published_date, today)
        }))

        const allData = [...productsData, ...bankingData, ...fintechData]
        return filterByDateRange(allData).length > 0
    }, [products, bankingTrends, fintechNews, startDate, endDate])

    // Get filtered counts for each category based on date range
    const getFilteredCounts = () => {
        const productsData = products.map(p => ({
            publishDate: normalizeDate(p.date_published, today)
        }))
        const bankingData = bankingTrends.map(t => ({
            publishDate: normalizeDate(t.published_date, today)
        }))
        const fintechData = fintechNews.map(f => ({
            publishDate: normalizeDate(f.published_date, today)
        }))

        return {
            products: filterByDateRange(productsData).length,
            banking: filterByDateRange(bankingData).length,
            fintech: filterByDateRange(fintechData).length
        }
    }

    const filteredCounts = getFilteredCounts()
    const totalSources = filteredCounts.products + filteredCounts.banking + filteredCounts.fintech

    const getCategoryTitle = () => {
        const category = CATEGORIES.find(cat => cat.value === selectedCategory)
        return category ? category.label : ''
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    if (loading) {
        return (
            <div className='page-container'>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    fontSize: '18px',
                    color: '#F00020'
                }}>
                    Đang tải dữ liệu...
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className='page-container'>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        fontSize: '48px',
                        marginBottom: '20px'
                    }}>⚠️</div>
                    <div style={{
                        fontSize: '18px',
                        color: '#dc3545',
                        marginBottom: '10px',
                        fontWeight: 'bold'
                    }}>
                        Lỗi kết nối cơ sở dữ liệu
                    </div>
                    <div style={{
                        fontSize: '15px',
                        color: '#6c757d',
                        marginBottom: '20px'
                    }}>
                        {error}
                    </div>
                    <div style={{
                        fontSize: '14px',
                        color: '#495057',
                        backgroundColor: '#f8f9fa',
                        padding: '15px',
                        borderRadius: '8px',
                        maxWidth: '600px',
                        textAlign: 'left',
                        border: '1px solid #dee2e6'
                    }}>
                        <strong>Hướng dẫn khắc phục:</strong>
                        <ol style={{ margin: '10px 0 0 20px', padding: 0 }}>
                            <li>Kiểm tra kết nối MongoDB Atlas</li>
                            <li>Đảm bảo IP của bạn đã được thêm vào whitelist</li>
                            <li>Xác nhận thông tin đăng nhập MongoDB đúng</li>
                            <li>Khởi động lại backend server</li>
                        </ol>
                    </div>
                </div>
            </div>
        )
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
                            Có <strong>{totalSources}</strong> tin tức trong khoảng thời gian này
                        </p>
                    </div>
                </div>

                {/* THỜI GIAN */}
                <div className='sidebar-section'>
                    <h3 className='section-title'>THỜI GIAN</h3>
                    <div className='section-content'>
                        <p className='date-range'>
                            Lọc tin tức từ ngày <strong>{formatDate(startDate)}</strong> đến ngày <strong>{formatDate(endDate)}</strong>
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

                {/* THỐNG KÊ */}
                <div className='sidebar-section'>
                    <h3 className='section-title'>THỐNG KÊ</h3>
                    <div className='section-content'>
                        <div className='stat-item'>
                            <span className='stat-label'>Sản phẩm & Dịch vụ</span>
                            <span className='stat-value'>{filteredCounts.products}</span>
                        </div>
                        <div className='stat-item'>
                            <span className='stat-label'>Tin ngành Ngân hàng</span>
                            <span className='stat-value'>{filteredCounts.banking}</span>
                        </div>
                        <div className='stat-item'>
                            <span className='stat-label'>Tin ngành Fintech</span>
                            <span className='stat-value'>{filteredCounts.fintech}</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {!hasDataInDateRange ? (
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
                                <div className='news-meta' style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px' }}>
                                    {selectedCategory === 'products' && 'productName' in item && (
                                        <>
                                            <p style={{ margin: 0 }}>Tên sản phẩm/dịch vụ: <strong style={{ color: '#F5B800' }}>{item.productName}</strong></p>
                                            {item.productSegment && (
                                                <p style={{ margin: 0 }}>Phân khúc sản phẩm: <strong style={{ color: '#F5B800' }}>{item.productSegment}</strong></p>
                                            )}
                                        </>
                                    )}
                                    {selectedCategory === 'banking' && 'topicGroup' in item && (
                                        <p style={{ margin: 0 }}>Nhóm chủ đề: <strong style={{ color: '#F5B800' }}>{item.topicGroup}</strong></p>
                                    )}
                                    {selectedCategory === 'fintech' && 'fintechTopic' in item && (
                                        <>
                                            <p style={{ margin: 0 }}>Chủ đề Fintech: <strong style={{ color: '#F5B800' }}>{item.fintechTopic}</strong></p>
                                            {'organization' in item && item.organization && (
                                                <p style={{ margin: 0 }}>Tổ chức: <strong style={{ color: '#F5B800' }}>{item.organization}</strong></p>
                                            )}
                                        </>
                                    )}
                                    {item.banks && item.banks.length > 0 && (
                                        <p style={{ margin: 0 }}>
                                            {selectedCategory === 'fintech' ? 'Lĩnh vực tác động' : 'Ngân hàng liên quan'}: <strong style={{ color: '#F5B800' }}>{item.banks.join(', ')}</strong>
                                        </p>
                                    )}
                                </div>
                                {item.summary && <p className="news-summary">{item.summary}</p>}
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
                                        <span>Nguồn: {item.extractFrom}</span>
                                    </div>
                                    {item.sourceUrl && item.sourceUrl !== '#' && (
                                        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                <polyline points="15 3 21 3 21 9" />
                                                <line x1="10" y1="14" x2="21" y2="3" />
                                            </svg>
                                            <span>Xem nguồn</span>
                                        </a>
                                    )}
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
                    </>
                )}
            </main>
        </div>
    )
}

export default ViewNews
