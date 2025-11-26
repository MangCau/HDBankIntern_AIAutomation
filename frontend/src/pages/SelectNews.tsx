import '../App.css'
import { useState, useMemo, useEffect } from 'react'

// API URL
const API_URL = 'http://localhost:5000/api/data'

// Data structure from database
interface NewsItem {
    _id: string
    category: string
    chunk: string
    source_date: string // Format from database
    source_name: string
    selected: boolean
}

// Base interface for all summary items
interface BaseSummaryItem {
    id: number
    image: string
    summary: string
    date: string
    source_type: string
    source_url: string
    pdf_file_name: string
}

// Product summary interface
interface ProductSummaryItem extends BaseSummaryItem {
    product_name: string
    product_segment: string
    bank: string[]
}

// Banking news summary interface
interface BankingNewsSummaryItem extends BaseSummaryItem {
    title: string
    topic_group: string
    bank: string[]
}

// Fintech news summary interface
interface FintechNewsSummaryItem extends BaseSummaryItem {
    title: string
    fintech_topic: string
    area_affected: string
    organization: string
}

type SummaryItem = ProductSummaryItem | BankingNewsSummaryItem | FintechNewsSummaryItem

// Summary Content Component with mocked data
function SummaryContent({ confirmedNewsCount }: { confirmedNewsCount: number }) {
    const [expandedItems, setExpandedItems] = useState<Record<string, Set<number>>>({
        'Sản phẩm & Dịch vụ mới': new Set(),
        'Tin tức ngành Ngân hàng': new Set(),
        'Tin tức ngành Fintech': new Set()
    })
    const [editingId, setEditingId] = useState<string | null>(null)
    const [tempEditValue, setTempEditValue] = useState('')

    // Helper functions
    const getTitle = (item: SummaryItem): string => {
        if ('product_name' in item) return item.product_name
        return item.title
    }

    const getDisplayName = (item: SummaryItem): string => {
        if ('organization' in item) return item.organization
        if ('bank' in item) return Array.isArray(item.bank) ? item.bank.join(', ') : item.bank
        return ''
    }

    // Mocked data for each category
    const mockedDataByCategory: Record<string, SummaryItem[]> = {
        'Sản phẩm & Dịch vụ mới': [
            {
                id: 1,
                image: 'https://picsum.photos/seed/summary-product1/300/200',
                product_name: 'Tóm tắt sản phẩm tiết kiệm HDBank Smart Save Plus và các sản phẩm tương tự',
                product_segment: 'Tiết kiệm',
                summary: 'Tổng hợp 3 sản phẩm tiết kiệm mới với lãi suất ưu đãi từ 6.0% - 6.5%/năm, kỳ hạn linh hoạt từ 1-24 tháng. Các ngân hàng đều cung cấp tính năng rút trước hạn không mất phí và hỗ trợ mở tài khoản online.',
                bank: ['HDBank', 'VietinBank', 'Techcombank'],
                date: '2025-01-15',
                source_type: 'Tự động tóm tắt',
                source_url: '#',
                pdf_file_name: 'summary_tiet_kiem_2025.pdf'
            },
            {
                id: 2,
                image: 'https://picsum.photos/seed/summary-product2/300/200',
                product_name: 'Xu hướng thẻ tín dụng hoàn tiền 2025',
                product_segment: 'Thẻ tín dụng',
                summary: 'Phân tích 5 thẻ tín dụng có chính sách hoàn tiền tốt nhất, bao gồm VietCredit Platinum (2%), TPBank EVO (1.5%) và Sacombank Priority (3% cho giao dịch quốc tế). Miễn phí thường niên năm đầu và hạn mức lên đến 500 triệu đồng.',
                bank: ['VietCredit', 'TPBank', 'Sacombank'],
                date: '2025-01-14',
                source_type: 'Tự động tóm tắt',
                source_url: '#',
                pdf_file_name: 'summary_the_tin_dung_2025.pdf'
            }
        ],
        'Tin tức ngành Ngân hàng': [
            {
                id: 3,
                image: 'https://picsum.photos/seed/summary-banking1/300/200',
                title: 'Tổng quan chính sách tín dụng Q1/2025',
                topic_group: 'Chính sách tiền tệ',
                summary: 'NHNN tăng room tín dụng 2% cho các ngân hàng đáp ứng đủ điều kiện. Techcombank và VPBank báo cáo tăng trưởng tín dụng mạnh mẽ trong quý đầu năm, đặc biệt ở phân khúc bán lẻ và SME. VPBank triển khai hệ thống Core Banking mới nâng cao năng lực xử lý.',
                bank: ['NHNN', 'Techcombank', 'VPBank'],
                date: '2025-01-18',
                source_type: 'Tự động tóm tắt',
                source_url: '#',
                pdf_file_name: 'summary_chinh_sach_tin_dung_q1_2025.pdf'
            }
        ],
        'Tin tức ngành Fintech': [
            {
                id: 4,
                image: 'https://picsum.photos/seed/summary-fintech1/300/200',
                title: 'Fintech và xu hướng thanh toán số năm 2025',
                fintech_topic: 'Thanh toán số',
                area_affected: 'Việt Nam',
                organization: 'MoMo, ZaloPay',
                summary: 'MoMo ra mắt tính năng đầu tư chứng khoán tích hợp, ZaloPay tích hợp BNPL với các sàn TMĐT lớn (Shopee, Lazada, Tiki). Người dùng có thể mua hàng trả góp 0% lãi suất. Xu hướng tích hợp AI và dịch vụ tài chính đang phát triển mạnh mẽ.',
                date: '2025-01-19',
                source_type: 'Tự động tóm tắt',
                source_url: '#',
                pdf_file_name: 'summary_thanh_toan_so_2025.pdf'
            },
            {
                id: 5,
                image: 'https://picsum.photos/seed/summary-fintech2/300/200',
                title: 'Startup Fintech Việt Nam nhận vốn đầu tư kỷ lục',
                fintech_topic: 'Đầu tư mạo hiểm',
                area_affected: 'Đông Nam Á',
                organization: 'Tima, VNPay',
                summary: 'Tổng hợp các vòng gọi vốn thành công của các startup fintech Việt. Tima nhận Series C 50 triệu USD để mở rộng thị trường Đông Nam Á. Tổng giá trị đầu tư vào fintech Việt trong Q1/2025 đạt 150 triệu USD, tăng 45% so với cùng kỳ năm trước.',
                date: '2025-01-17',
                source_type: 'Tự động tóm tắt',
                source_url: '#',
                pdf_file_name: 'summary_dau_tu_fintech_2025.pdf'
            }
        ]
    }

    const toggleExpanded = (category: string, id: number) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev[category])
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return { ...prev, [category]: newSet }
        })
    }

    const handleEditSummary = (uniqueKey: string, currentSummary: string) => {
        setEditingId(uniqueKey)
        setTempEditValue(currentSummary)
    }

    const handleSaveSummary = () => {
        // TODO: Save to backend
        alert('Lưu tóm tắt: ' + tempEditValue.substring(0, 50) + '...')
        setEditingId(null)
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setTempEditValue('')
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
        <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #dee2e6',
            borderRadius: '12px',
            padding: '32px',
            minHeight: '500px'
        }}>
            {Object.entries(mockedDataByCategory).map(([categoryTitle, items]) => (
                <div key={categoryTitle} style={{ marginBottom: '48px' }}>
                    <h2 style={{
                        fontSize: '22px',
                        color: '#2c3e50',
                        marginBottom: '20px',
                        paddingBottom: '12px',
                        borderBottom: '2px solid #F00020',
                        fontWeight: '600'
                    }}>
                        {categoryTitle}
                    </h2>

                    <div className="news-list">
                        {items.map((item) => {
                            const uniqueKey = `${categoryTitle}-${item.id}`
                            const isExpanded = expandedItems[categoryTitle]?.has(item.id) || false

                            return (
                                <article key={item.id} className="news-card">
                                    <div className="news-image">
                                        <img src={item.image} alt={getTitle(item)} />
                                    </div>
                                    <div className="news-content">
                                        <h2 className="news-title">{getTitle(item)}</h2>
                                        {editingId === uniqueKey ? (
                                            <div className="edit-summary-container">
                                                <textarea
                                                    className="edit-summary-textarea"
                                                    value={tempEditValue}
                                                    onChange={(e) => setTempEditValue(e.target.value)}
                                                    rows={4}
                                                />
                                                <div className="edit-summary-buttons">
                                                    <button className="save-summary-btn" onClick={handleSaveSummary}>
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
                                                <p className="news-summary">{item.summary}</p>
                                                <button className="edit-summary-btn" onClick={() => handleEditSummary(uniqueKey, item.summary)}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                    Chỉnh sửa
                                                </button>
                                            </div>
                                        )}

                                        {isExpanded && (
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
                                                    <p><strong>Nguồn gốc:</strong> Tự động tóm tắt từ {confirmedNewsCount} tin tức đã chọn</p>
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
                                            <button onClick={() => toggleExpanded(categoryTitle, item.id)} className="source-link detail-toggle-btn">
                                                {isExpanded ? (
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
                                        </div>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                </div>
            ))}

            {/* Nút xem chi tiết tại trang Quản lý */}
            <div style={{
                marginTop: '48px',
                paddingTop: '32px',
                borderTop: '2px solid #e9ecef',
                display: 'flex',
                justifyContent: 'center'
            }}>
                <button
                    onClick={() => {
                        // Navigate to Manage page (ViewNews)
                        window.location.href = '/view-news'
                    }}
                    style={{
                        padding: '16px 40px',
                        backgroundColor: '#F00020',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(240, 0, 32, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#c00018'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(240, 0, 32, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#F00020'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(240, 0, 32, 0.3)'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    Xem chi tiết tại trang Quản lý
                </button>
            </div>
        </div>
    )
}

function SelectNews() {
    // const triggerWorkflow = async () => {
    //     await fetch("https://hdbproductautoreport.app.n8n.cloud/webhook-test/27e9e0c2-ff8a-4390-8c9a-dc319b2c9454", {
    //         method: 'POST',
    //         headers: {
    //             "Content-Type": "application/json",
    //         },
    //         body: JSON.stringify({ 
    //             message: "Start genning AI",
    //          }),
    //     })
    // };
    // State for data from API
    const [newsData, setNewsData] = useState<NewsItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Initialize with current date range (last 7 days)
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    const [startDateISO, setStartDateISO] = useState(sevenDaysAgo.toISOString().split('T')[0])
    const [endDateISO, setEndDateISO] = useState(today.toISOString().split('T')[0])
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [isPriorityView, setIsPriorityView] = useState(false) // New state to track priority view
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [tempPriorities, setTempPriorities] = useState<Record<string, boolean>>({})
    const [confirmedPriorities, setConfirmedPriorities] = useState<Record<string, boolean>>({})

    // Workflow step state
    const [currentStep, setCurrentStep] = useState<'selection' | 'next' | 'summary'>('selection')
    const [confirmedNews, setConfirmedNews] = useState<NewsItem[]>([])

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [confirmedNewsPage, setConfirmedNewsPage] = useState(1)
    const itemsPerPage = 10 // Number of news items per page

    // Helper function to render text with clickable links
    const renderTextWithLinks = (text: string) => {
        // First, normalize the text by removing line breaks within URLs
        // This handles cases where URLs are split across multiple lines
        // Pattern: matches http(s):// followed by any non-whitespace, then a line break, then more non-whitespace
        let normalizedText = text

        // Repeatedly join URL parts that are split across lines
        // This handles cases like:
        // https://example.com/path-
        // continuation
        const iterations = 5 // Maximum iterations to handle deeply nested line breaks
        for (let i = 0; i < iterations; i++) {
            const beforeNormalize = normalizedText
            normalizedText = normalizedText.replace(/(https?:\/\/[^\s]*?)[\r\n]+([^\s\r\n]+)/g, '$1$2')
            // If no changes were made, we're done
            if (beforeNormalize === normalizedText) break
        }

        // Regular expression to match URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g
        const parts = normalizedText.split(urlRegex)

        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            color: '#007bff',
                            textDecoration: 'underline',
                            wordBreak: 'break-all'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </a>
                )
            }
            return <span key={index}>{part}</span>
        })
    }

    // Fetch data from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                setError(null)
                const response = await fetch(`${API_URL}/header-processing`)
                const result = await response.json()

                if (result.success) {
                    setNewsData(result.data)
                    // Initialize priorities from fetched data
                    const priorities = result.data.reduce((acc: Record<string, boolean>, item: NewsItem) => {
                        acc[item._id] = item.selected || false
                        return acc
                    }, {})
                    setTempPriorities(priorities)
                    setConfirmedPriorities(priorities)
                } else {
                    setError('Failed to fetch data')
                }
            } catch (err) {
                setError('Error connecting to server')
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    // Convert ISO date (YYYY-MM-DD) to Vietnamese format (DD/MM/YYYY)
    const convertISOToVN = (isoDate: string): string => {
        const [year, month, day] = isoDate.split('-')
        return `${day}/${month}/${year}`
    }

    // Parse source_date to DD/MM/YYYY format
    const parseSourceDate = (sourceDate: string): string => {
        // source_date is in ISO format: "2025-11-17T10:38:40+07:00"
        // Convert to DD/MM/YYYY format
        try {
            const date = new Date(sourceDate)
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
        } catch (error) {
            console.error('Error parsing date:', sourceDate, error)
            return sourceDate
        }
    }

    // Check if a date is within the selected range
    const isDateInRange = (sourceDate: string): boolean => {
        try {
            const date = new Date(sourceDate)
            const startDate = new Date(startDateISO)
            const endDate = new Date(endDateISO)

            // Set time to start of day for accurate comparison
            date.setHours(0, 0, 0, 0)
            startDate.setHours(0, 0, 0, 0)
            endDate.setHours(23, 59, 59, 999)

            return date >= startDate && date <= endDate
        } catch (error) {
            console.error('Error checking date range:', sourceDate, error)
            return false
        }
    }

    // Get news filtered by selected date range
    const newsInDateRange = useMemo(() => {
        return newsData.filter(item => isDateInRange(item.source_date))
    }, [newsData, startDateISO, endDateISO])

    // Get unique categories from news in date range
    const availableCategories = useMemo(() => {
        const categories = newsInDateRange.map((item: NewsItem) => item.category)
        return Array.from(new Set(categories))
    }, [newsInDateRange])

    // Auto-select first category when date changes
    useMemo(() => {
        if (availableCategories.length > 0 && !availableCategories.includes(selectedCategory) && !isPriorityView) {
            setSelectedCategory(availableCategories[0] as string)
        }
    }, [availableCategories, selectedCategory, isPriorityView])

    // Get news filtered by both date range and category, sorted by selected status
    const filteredNews = useMemo(() => {
        let filtered: NewsItem[]

        if (isPriorityView) {
            // Show all selected news from all categories in this date range
            filtered = newsInDateRange.filter((item: NewsItem) => confirmedPriorities[item._id])
        } else {
            // Normal category view
            filtered = newsInDateRange.filter((item: NewsItem) => item.category === selectedCategory)
        }

        // Sort: selected items first (true > false)
        return filtered.sort((a, b) => {
            const aSelected = confirmedPriorities[a._id] || false
            const bSelected = confirmedPriorities[b._id] || false
            // Sort descending: true comes before false
            return (bSelected ? 1 : 0) - (aSelected ? 1 : 0)
        })
    }, [newsInDateRange, selectedCategory, confirmedPriorities, isPriorityView])

    // Pagination calculations
    const totalPages = Math.ceil(filteredNews.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedNews = filteredNews.slice(startIndex, endIndex)

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [selectedCategory, isPriorityView, startDateISO, endDateISO])

    // Xử lý chọn tin tức
    const handleToggleSelectionMode = () => {
        if (isSelectionMode) {
            // Nếu đang tắt chế độ chọn, reset tempPriorities về confirmedPriorities
            setTempPriorities({ ...confirmedPriorities })
        }
        setIsSelectionMode(!isSelectionMode)
    }

    const handleCheckboxChange = (id: string) => {
        setTempPriorities(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    const handleUpdateSelection = async () => {
        const message = 'Bạn có chắc chắn muốn cập nhật ưu tiên tin tức này không?'
        if (window.confirm(message)) {
            try {
                // Prepare updates array
                const updates = Object.entries(tempPriorities).map(([id, selected]) => ({
                    id,
                    selected
                }))

                // Send batch update to server
                const response = await fetch(`${API_URL}/header-processing`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ updates })
                })

                const result = await response.json()

                if (result.success) {
                    setConfirmedPriorities({ ...tempPriorities })
                    // Update local newsData state
                    setNewsData(prev => prev.map(item => ({
                        ...item,
                        selected: tempPriorities[item._id] || false
                    })))
                    setIsSelectionMode(false)
                    alert('Đã cập nhật ưu tiên tin tức thành công!')
                } else {
                    alert('Cập nhật thất bại. Vui lòng thử lại.')
                }
            } catch (error) {
                console.error('Error updating selection:', error)
                alert('Lỗi kết nối. Vui lòng thử lại.')
            }
        }
    }

    // Đếm số lượng tin được đánh dấu ưu tiên
    // const getPriorityCount = () => {
    //     return Object.values(confirmedPriorities).filter(p => p === true).length
    // }

    // Show loading state
    if (loading) {
        return (
            <div className='page-container'>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    fontSize: '18px',
                    color: '#6c757d'
                }}>
                    Đang tải dữ liệu...
                </div>
            </div>
        )
    }

    // Show error state
    if (error) {
        return (
            <div className='page-container'>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
                    <h2 style={{ fontSize: '24px', color: '#dc3545', marginBottom: '12px' }}>
                        Lỗi kết nối
                    </h2>
                    <p style={{ fontSize: '16px', color: '#6c757d' }}>
                        {error}. Vui lòng kiểm tra kết nối server.
                    </p>
                </div>
            </div>
        )
    }

    // Render summary step
    if (currentStep === 'summary') {
        return (
            <div className='page-container'>
                <div style={{
                    padding: '40px',
                    maxWidth: '1400px',
                    margin: '0 auto'
                }}>
                    {/* Header */}
                    <div style={{
                        marginBottom: '32px'
                    }}>
                        <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50' }}>
                            📊 Tóm Tắt Tin Tức
                        </h1>
                        <p style={{ margin: '8px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
                            Tóm tắt {confirmedNews.length} tin tức ưu tiên
                        </p>
                    </div>

                    {/* Content area for summary step - Mocked data theo 3 categories */}
                    <SummaryContent confirmedNewsCount={confirmedNews.length} />
                </div>
            </div>
        )
    }

    // Render next step after confirmation
    if (currentStep === 'next') {
        return (
            <div className='page-container'>
                <div style={{
                    padding: '40px',
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}>
                    {/* Header with back button */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '32px',
                        gap: '16px'
                    }}>
                        <button
                            onClick={() => setCurrentStep('selection')}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #dee2e6',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#495057',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#e2e6ea'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8f9fa'
                            }}
                        >
                            ← Quay lại
                        </button>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50' }}>
                                Xác nhận
                            </h1>
                            <p style={{ margin: '8px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
                                Đã xác nhận {confirmedNews.length} tin tức ưu tiên
                            </p>
                        </div>
                    </div>

                    {/* Content area for next step */}
                    <div style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #dee2e6',
                        borderRadius: '12px',
                        padding: '32px',
                        minHeight: '400px'
                    }}>
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: '#6c757d'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '24px' }}>📝</div>
                            <h2 style={{ fontSize: '24px', color: '#495057', marginBottom: '16px' }}>
                                Sẵn sàng cho bước tiếp theo
                            </h2>
                            <p style={{ fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
                                Bạn đã xác nhận {confirmedNews.length} tin tức ưu tiên từ khoảng thời gian{' '}
                                <strong>{convertISOToVN(startDateISO)}</strong> đến{' '}
                                <strong>{convertISOToVN(endDateISO)}</strong>.
                            </p>
                            <div style={{
                                marginTop: '32px',
                                padding: '20px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                display: 'inline-block'
                            }}>
                                <p style={{ margin: 0, fontSize: '14px', color: '#495057' }}>
                                    💡 <strong>Lưu ý:</strong> Vui lòng kiểm tra thật kĩ, bạn sẽ không được hoàn tác/chọn lại các tin tức. Bạn chỉ có thể bổ sung sau khi hiện thực tóm tắt tin tức.
                                </p>
                            </div>

                            {/* Nút TÓM TẮT */}
                            <div style={{
                                marginTop: '32px',
                                display: 'flex',
                                justifyContent: 'center'
                            }}>
                                {/* <button
                                    onClick={() => setCurrentStep('summary')}
                                    style={{
                                        padding: '14px 40px',
                                        backgroundColor: '#F00020',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 2px 8px rgba(240, 0, 32, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#c00018'
                                        e.currentTarget.style.transform = 'translateY(-2px)'
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(240, 0, 32, 0.4)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#F00020'
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(240, 0, 32, 0.3)'
                                    }}
                                >
                                    📊 TÓM TẮT
                                </button> */
                                <button
                                    onClick={async (e) => {
                                        const button = e.currentTarget as HTMLButtonElement
                                        const originalText = button.textContent

                                        try {
                                            // Show loading state on THIS button only
                                            button.disabled = true
                                            button.textContent = '⏳ Đang xử lý...'
                                            button.style.cursor = 'not-allowed'
                                            button.style.opacity = '0.7'

                                            // 1. Call n8n webhook directly and WAIT
                                            const response = await fetch("https://hdbproductautoreport.app.n8n.cloud/webhook-test/4291406d-c1d0-4663-80f3-7f6b4f8fc188", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    startDate: startDateISO,
                                                    endDate: endDateISO,
                                                })
                                            });

                                            if (!response.ok) {
                                                throw new Error(`HTTP error! status: ${response.status}`)
                                            }

                                            const result = await response.json()
                                            console.log('N8N workflow response:', result)

                                            // 2. Only AFTER n8n finishes successfully, move to summary step
                                            setCurrentStep('summary')

                                            // Reset button state
                                            button.disabled = false
                                            button.textContent = originalText || '📊 TÓM TẮT'
                                            button.style.cursor = 'pointer'
                                            button.style.opacity = '1'
                                        } catch (error) {
                                            console.error('Error calling n8n webhook:', error)
                                            alert('Lỗi khi gọi workflow n8n. Vui lòng thử lại.\n\nChi tiết: ' + (error as Error).message)

                                            // Reset button state on error
                                            button.disabled = false
                                            button.textContent = originalText || '📊 TÓM TẮT'
                                            button.style.cursor = 'pointer'
                                            button.style.opacity = '1'
                                        }
                                    }}
                                    style={{
                                        padding: '14px 40px',
                                        backgroundColor: '#F00020',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 2px 8px rgba(240, 0, 32, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#c00018'
                                        e.currentTarget.style.transform = 'translateY(-2px)'
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(240, 0, 32, 0.4)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#F00020'
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(240, 0, 32, 0.3)'
                                    }}
                                >
                                    📊 TÓM TẮT
                                </button>}
                            </div>
                        </div>

                        {/* Preview of confirmed news with pagination */}
                        <div style={{ marginTop: '32px' }}>
                            <h3 style={{ fontSize: '18px', color: '#2c3e50', marginBottom: '16px' }}>
                                Danh sách tin đã xác nhận:
                            </h3>
                            <div style={{
                                display: 'grid',
                                gap: '12px'
                            }}>
                                {(() => {
                                    // Calculate pagination for confirmed news
                                    // const totalPagesConfirmed = Math.ceil(confirmedNews.length / itemsPerPage)
                                    const startIndexConfirmed = (confirmedNewsPage - 1) * itemsPerPage
                                    const endIndexConfirmed = startIndexConfirmed + itemsPerPage
                                    const paginatedConfirmedNews = confirmedNews.slice(startIndexConfirmed, endIndexConfirmed)

                                    return paginatedConfirmedNews.map((item, index) => {
                                        const actualIndex = startIndexConfirmed + index
                                        return (
                                            <div
                                                key={item._id}
                                                style={{
                                                    padding: '16px',
                                                    backgroundColor: '#f8f9fa',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e9ecef'
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '12px',
                                                    alignItems: 'flex-start'
                                                }}>
                                                    <span style={{
                                                        backgroundColor: '#F00020',
                                                        color: '#ffffff',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        flexShrink: 0
                                                    }}>
                                                        {actualIndex + 1}
                                                    </span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{
                                                            display: 'inline-block',
                                                            backgroundColor: '#F00020',
                                                            color: '#ffffff',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            marginBottom: '8px'
                                                        }}>
                                                            {item.category}
                                                        </div>
                                                        <p style={{
                                                            margin: '0 0 8px 0',
                                                            fontSize: '14px',
                                                            color: '#2c3e50',
                                                            whiteSpace: 'pre-line',
                                                            lineHeight: '1.5'
                                                        }}>
                                                            {renderTextWithLinks(item.chunk)}
                                                        </p>
                                                        <div style={{
                                                            fontSize: '12px',
                                                            color: '#6c757d',
                                                            display: 'flex',
                                                            gap: '16px'
                                                        }}>
                                                            <span>📅 {parseSourceDate(item.source_date)}</span>
                                                            <span>📰 {item.source_name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                })()}
                            </div>

                            {/* Pagination for confirmed news */}
                            {confirmedNews.length > itemsPerPage && (() => {
                                const totalPagesConfirmed = Math.ceil(confirmedNews.length / itemsPerPage)
                                return (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginTop: '24px'
                                    }}>
                                        <button
                                            onClick={() => setConfirmedNewsPage(prev => Math.max(1, prev - 1))}
                                            disabled={confirmedNewsPage === 1}
                                            style={{
                                                padding: '8px 16px',
                                                border: '1px solid #dee2e6',
                                                borderRadius: '6px',
                                                backgroundColor: confirmedNewsPage === 1 ? '#f8f9fa' : '#ffffff',
                                                color: confirmedNewsPage === 1 ? '#adb5bd' : '#495057',
                                                cursor: confirmedNewsPage === 1 ? 'not-allowed' : 'pointer',
                                                fontWeight: '500',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            ← Trước
                                        </button>

                                        <div style={{
                                            display: 'flex',
                                            gap: '4px',
                                            alignItems: 'center'
                                        }}>
                                            {Array.from({ length: totalPagesConfirmed }, (_, i) => i + 1).map(page => {
                                                const showPage = page === 1 ||
                                                                page === totalPagesConfirmed ||
                                                                (page >= confirmedNewsPage - 1 && page <= confirmedNewsPage + 1)

                                                const showEllipsisBefore = page === confirmedNewsPage - 2 && confirmedNewsPage > 3
                                                const showEllipsisAfter = page === confirmedNewsPage + 2 && confirmedNewsPage < totalPagesConfirmed - 2

                                                if (showEllipsisBefore || showEllipsisAfter) {
                                                    return <span key={page} style={{ padding: '0 4px', color: '#adb5bd' }}>...</span>
                                                }

                                                if (!showPage) return null

                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setConfirmedNewsPage(page)}
                                                        style={{
                                                            padding: '8px 12px',
                                                            border: '1px solid #dee2e6',
                                                            borderRadius: '6px',
                                                            backgroundColor: confirmedNewsPage === page ? '#F00020' : '#ffffff',
                                                            color: confirmedNewsPage === page ? '#ffffff' : '#495057',
                                                            cursor: 'pointer',
                                                            fontWeight: confirmedNewsPage === page ? '600' : '500',
                                                            minWidth: '40px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (confirmedNewsPage !== page) {
                                                                e.currentTarget.style.backgroundColor = '#f8f9fa'
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (confirmedNewsPage !== page) {
                                                                e.currentTarget.style.backgroundColor = '#ffffff'
                                                            }
                                                        }}
                                                    >
                                                        {page}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        <button
                                            onClick={() => setConfirmedNewsPage(prev => Math.min(totalPagesConfirmed, prev + 1))}
                                            disabled={confirmedNewsPage === totalPagesConfirmed}
                                            style={{
                                                padding: '8px 16px',
                                                border: '1px solid #dee2e6',
                                                borderRadius: '6px',
                                                backgroundColor: confirmedNewsPage === totalPagesConfirmed ? '#f8f9fa' : '#ffffff',
                                                color: confirmedNewsPage === totalPagesConfirmed ? '#adb5bd' : '#495057',
                                                cursor: confirmedNewsPage === totalPagesConfirmed ? 'not-allowed' : 'pointer',
                                                fontWeight: '500',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            Sau →
                                        </button>

                                        <span style={{
                                            marginLeft: '16px',
                                            color: '#6c757d',
                                            fontSize: '14px'
                                        }}>
                                            Trang {confirmedNewsPage} / {totalPagesConfirmed} (Tổng {confirmedNews.length} tin)
                                        </span>
                                    </div>
                                )
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Main selection view
    return (
        <div className='page-container'>
            {/* Sidebar */}
            <aside className='sidebar'>
                {/* TRẠNG THÁI */}
                <div className='sidebar-section'>
                    <h3 className='section-title'>TRẠNG THÁI</h3>
                    <div className='section-content'>
                        <p className='date-range'>
                            Từ <strong>{convertISOToVN(startDateISO)}</strong> đến <strong>{convertISOToVN(endDateISO)}</strong> có tổng cộng <strong>{newsInDateRange.length}</strong> tin tức
                        </p>
                    </div>
                </div>

                {/* THỜI GIAN */}
                <div className='sidebar-section'>
                    <h3 className='section-title'>THỜI GIAN</h3>
                    <div className='section-content'>
                        <p className='date-range' style={{ marginBottom: '12px' }}>
                            Chọn khoảng thời gian để xem tin tức
                        </p>
                        <div className='date-input-wrapper' style={{ marginBottom: '12px' }}>
                            <label htmlFor='start-date'>Từ ngày:</label>
                            <input
                                type='date'
                                id='start-date'
                                value={startDateISO}
                                onChange={(e) => setStartDateISO(e.target.value)}
                                className='date-input'
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className='date-input-wrapper'>
                            <label htmlFor='end-date'>Đến ngày:</label>
                            <input
                                type='date'
                                id='end-date'
                                value={endDateISO}
                                onChange={(e) => setEndDateISO(e.target.value)}
                                className='date-input'
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                </div>

                {/* DANH MỤC */}
                {newsInDateRange.length > 0 ? (
                    <div className='sidebar-section'>
                        <h3 className='section-title'>DANH MỤC</h3>
                        <div className='section-content'>
                            {/* Tin ưu tiên - moved to top */}
                            <div
                                className='stat-item'
                                onClick={() => {
                                    setIsPriorityView(true)
                                    setSelectedCategory('')
                                }}
                                style={{
                                    cursor: 'pointer',
                                    backgroundColor: isPriorityView ? '#F00020' : 'transparent',
                                    color: isPriorityView ? '#ffffff' : '#F00020',
                                    padding: '8px 12px',
                                    margin: '4px -12px',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s ease',
                                    fontWeight: '600',
                                    marginBottom: '8px'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isPriorityView) {
                                        e.currentTarget.style.backgroundColor = '#fff5f5'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isPriorityView) {
                                        e.currentTarget.style.backgroundColor = 'transparent'
                                    }
                                }}
                            >
                                <span className='stat-label' style={{ fontSize: '13px', color: isPriorityView ? '#ffffff' : '#F00020' }}>
                                    Tin ưu tiên
                                </span>
                                {/* get total number priority news */}
                                {/* <span className='stat-value' style={{ color: isPriorityView ? '#ffffff' : '#F00020' }}>{getPriorityCount()}</span> */}
                            </div>

                            {/* Separator */}
                            <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px -12px 8px -12px' }}></div>

                            {/* Category list */}
                            {availableCategories.map((category) => {
                                // const count = newsInDateRange.filter((item: NewsItem) => item.category === category).length
                                const isActive = selectedCategory === category && !isPriorityView
                                return (
                                    <div
                                        key={category}
                                        className='stat-item'
                                        onClick={() => {
                                            setIsPriorityView(false)
                                            setSelectedCategory(category)
                                        }}
                                        style={{
                                            cursor: 'pointer',
                                            backgroundColor: isActive ? '#F00020' : 'transparent',
                                            color: isActive ? '#ffffff' : 'inherit',
                                            padding: '8px 12px',
                                            margin: '4px -12px',
                                            borderRadius: '6px',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.backgroundColor = '#f8f9fa'
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.backgroundColor = 'transparent'
                                            }
                                        }}
                                    >
                                        <span className='stat-label' style={{ fontSize: '13px', color: isActive ? '#ffffff' : 'inherit' }}>
                                            {category}
                                        </span>
                                        {/* get total number news */}
                                        {/*   */}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : null}
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {newsInDateRange.length === 0 ? (
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
                            Không có tin tức nào trong khoảng thời gian từ <strong>{convertISOToVN(startDateISO)}</strong> đến <strong>{convertISOToVN(endDateISO)}</strong>. Vui lòng chọn khoảng thời gian khác.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="content-header">
                            <div>
                                <h1>{isPriorityView ? 'Tin ưu tiên' : (selectedCategory || 'Chọn danh mục')}</h1>
                                <p className="content-subtitle">
                                    Từ <strong>{convertISOToVN(startDateISO)}</strong> đến <strong>{convertISOToVN(endDateISO)}</strong> - Tổng cộng: <strong>{filteredNews.length}</strong> tin tức
                                </p>
                            </div>
                        </div>

                        {/* Selection buttons below header */}
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            marginBottom: '20px',
                            justifyContent: 'center'
                        }}>
                            {/* Nút chọn tin tức - hiển thị cho tất cả */}
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

                            {/* Nút "Xác nhận" - chỉ hiển thị khi ở chế độ Tin ưu tiên */}
                            {isPriorityView && (
                                <button
                                    style={{
                                        padding: '12px 32px',
                                        backgroundColor: '#28a745',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)'
                                    }}
                                    onClick={() => {
                                        // Get all selected priority news
                                        const selectedNews = newsInDateRange.filter((item: NewsItem) => confirmedPriorities[item._id])

                                        if (selectedNews.length === 0) {
                                            alert('Vui lòng chọn ít nhất một tin tức ưu tiên trước khi xác nhận!')
                                            return
                                        }

                                        // Save confirmed news and move to next step
                                        setConfirmedNews(selectedNews)
                                        setCurrentStep('next')
                                        console.log('Đã xác nhận', selectedNews.length, 'tin ưu tiên')
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#218838'
                                        e.currentTarget.style.transform = 'translateY(-2px)'
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#28a745'
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.3)'
                                    }}
                                >
                                    ✓ Xác nhận
                                </button>
                            )}
                        </div>

                        <div className="news-list">
                            {paginatedNews.length > 0 ? (
                                paginatedNews.map((item) => (
                                    <article key={item._id} className={`news-card ${confirmedPriorities[item._id] ? 'selected' : ''}`}>
                                        {isSelectionMode && (
                                            <div className="news-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={tempPriorities[item._id]}
                                                    onChange={() => handleCheckboxChange(item._id)}
                                                />
                                            </div>
                                        )}
                                        {!isSelectionMode && confirmedPriorities[item._id] && (
                                            <div className="news-selected-badge">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="news-content">
                                            {/* Show category header if in priority view */}
                                            {isPriorityView && (
                                                <div style={{
                                                    display: 'inline-block',
                                                    backgroundColor: '#F00020',
                                                    color: '#ffffff',
                                                    padding: '4px 12px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    marginBottom: '12px'
                                                }}>
                                                    {item.category}
                                                </div>
                                            )}
                                            <p className="news-summary" style={{
                                                fontSize: '15px',
                                                lineHeight: '1.6',
                                                marginBottom: '12px',
                                                color: '#2c3e50',
                                                whiteSpace: 'pre-line'
                                            }}>
                                                {renderTextWithLinks(item.chunk)}
                                            </p>
                                            <div className="news-meta">
                                                <div className="meta-item">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                    <span>{parseSourceDate(item.source_date)}</span>
                                                </div>
                                                <div className='meta-item'>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                        <polyline points="15 3 21 3 21 9" />
                                                        <line x1="10" y1="14" x2="21" y2="3" />
                                                    </svg>
                                                    <span>Nguồn: {item.source_name}</span>

                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                ))
                            ) : (
                                <div className='no-results'>
                                    <p>Không có tin tức nào trong danh mục này</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {filteredNews.length > itemsPerPage && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px',
                                marginTop: '32px',
                                paddingBottom: '24px'
                            }}>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '8px 16px',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '6px',
                                        backgroundColor: currentPage === 1 ? '#f8f9fa' : '#ffffff',
                                        color: currentPage === 1 ? '#adb5bd' : '#495057',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        fontWeight: '500',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    ← Trước
                                </button>

                                <div style={{
                                    display: 'flex',
                                    gap: '4px',
                                    alignItems: 'center'
                                }}>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                        // Show first page, last page, current page, and pages around current
                                        const showPage = page === 1 ||
                                                        page === totalPages ||
                                                        (page >= currentPage - 1 && page <= currentPage + 1)

                                        // Show ellipsis
                                        const showEllipsisBefore = page === currentPage - 2 && currentPage > 3
                                        const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2

                                        if (showEllipsisBefore || showEllipsisAfter) {
                                            return <span key={page} style={{ padding: '0 4px', color: '#adb5bd' }}>...</span>
                                        }

                                        if (!showPage) return null

                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                style={{
                                                    padding: '8px 12px',
                                                    border: '1px solid #dee2e6',
                                                    borderRadius: '6px',
                                                    backgroundColor: currentPage === page ? '#F00020' : '#ffffff',
                                                    color: currentPage === page ? '#ffffff' : '#495057',
                                                    cursor: 'pointer',
                                                    fontWeight: currentPage === page ? '600' : '500',
                                                    minWidth: '40px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (currentPage !== page) {
                                                        e.currentTarget.style.backgroundColor = '#f8f9fa'
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (currentPage !== page) {
                                                        e.currentTarget.style.backgroundColor = '#ffffff'
                                                    }
                                                }}
                                            >
                                                {page}
                                            </button>
                                        )
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '8px 16px',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '6px',
                                        backgroundColor: currentPage === totalPages ? '#f8f9fa' : '#ffffff',
                                        color: currentPage === totalPages ? '#adb5bd' : '#495057',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        fontWeight: '500',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Sau →
                                </button>

                                <span style={{
                                    marginLeft: '16px',
                                    color: '#6c757d',
                                    fontSize: '14px'
                                }}>
                                    Trang {currentPage} / {totalPages} (Tổng {filteredNews.length} tin)
                                </span>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}

export default SelectNews
