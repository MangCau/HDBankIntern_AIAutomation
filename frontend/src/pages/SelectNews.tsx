import '../App.css'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiEndpoint } from '../config/api'
import { useNotification } from '../contexts/NotificationContext'
import SummaryPages from './SummaryPages'

// API URL - now uses environment variable for production
const API_URL = apiEndpoint('api/data')

// Data structure from database
interface NewsItem {
    _id: string
    category: string
    chunk: string
    source_date: string // Format from database
    source_name: string
    selected: boolean
    topic_classification?: string
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
    product_segment: string[]
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

// API data interfaces matching backend models
interface NewProductData {
    _id: string
    bank: string | string[]
    product_name: string
    product_segment?: string[]
    description?: string
    image?: string
    selected: boolean
    source_of_detail?: string
    reportSelected?: boolean
    detail_content?: string
    url_category_precheck?: string
    date_published: string
    source_type?: string
    source_url?: string
    pdf_file_name?: string
    id_processed?: string
}

interface BankingTrendData {
    _id: string
    topic_group?: string
    title: string
    summary?: string
    bank_related: string | string[]
    image?: string
    selected: boolean
    reportSelected?: boolean
    source_of_detail?: string
    detail_content?: string
    url_category_precheck?: string
    source_type?: string
    source_url?: string
    published_date: string
    pdf_file_name?: string
    id_processed?: string
}

interface FintechNewsData {
    _id: string
    fintech_topic?: string
    area_affected: string | string[]
    title: string
    summary?: string
    organization?: string
    image?: string
    selected: boolean
    source_of_detail?: string
    reportSelected?: boolean
    detail_content?: string
    url_category_precheck?: string
    source_type?: string
    source_url?: string
    published_date: string
    pdf_file_name?: string
    id_processed?: string
}

// Summary Content Component with real data from API
function SummaryContent({
    confirmedNewsCount
}: {
    confirmedNewsCount: number
}) {
    const [expandedItems, setExpandedItems] = useState<Record<string, Set<string>>>({
        'Sản phẩm & Dịch vụ mới': new Set(),
        'Tin tức ngành Ngân hàng': new Set(),
        'Tin tức ngành Fintech': new Set()
    })
    const [editingId, setEditingId] = useState<string | null>(null)
    const [tempTitleValue, setTempTitleValue] = useState('')
    const [tempSummaryValue, setTempSummaryValue] = useState('')
    const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null)

    // Pagination state - track current page per category (default page 1)
    const [currentPage, setCurrentPage] = useState<Record<string, number>>({
        'Sản phẩm & Dịch vụ mới': 1,
        'Tin tức ngành Ngân hàng': 1,
        'Tin tức ngành Fintech': 1
    })
    const itemsPerPage = 5

    // Refs for scrolling to top of each category when page changes
    const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({
        'Sản phẩm & Dịch vụ mới': null,
        'Tin tức ngành Ngân hàng': null,
        'Tin tức ngành Fintech': null
    })

    // Real data from API
    const [newProducts, setNewProducts] = useState<NewProductData[]>([])
    const [sortedNewProducts, setSortedNewProducts] = useState<NewProductData[]>([])
    const [marketTrends, setMarketTrends] = useState<BankingTrendData[]>([])
    const [fintechNews, setFintechNews] = useState<FintechNewsData[]>([])
    const [loading, setLoading] = useState(true)

    // Track pending selection changes (not yet saved to database)
    const [pendingSelectionChanges, setPendingSelectionChanges] = useState<Map<string, { collection: string, selected: boolean }>>(new Map())

    // Reprocess popup state
    const [showReprocessPopup, setShowReprocessPopup] = useState(false)
    const [reprocessData, setReprocessData] = useState<{
        collection: string
        itemId: string
        idProcessed: string
        headerProcessingId: string
        currentTopicClassification: string | null
    } | null>(null)
    const [selectedTopicClassification, setSelectedTopicClassification] = useState<string>('')
    const [isReprocessing, setIsReprocessing] = useState(false)

    // AI sorting function for new products
    const sortProductsWithAI = async (products: NewProductData[]): Promise<NewProductData[]> => {
        if (products.length === 0) return products

        try {
            console.log('🤖 Sorting products with AI Gemini...')

            // Extract product_name and product_segment for AI
            const productsForSorting = products.map(p => ({
                _id: p._id,
                product_name: p.product_name,
                product_segment: p.product_segment || []
            }))

            const apiKey = import.meta.env.VITE_GEMINI_API_KEY
            if (!apiKey) {
                console.warn('GEMINI_API_KEY not found, returning unsorted products')
                return products
            }

            const prompt = `Vai trò: Bạn là một chuyên gia sắp xếp và phân loại dữ liệu ngân hàng.
Nhiệm vụ: Sắp xếp lại mảng JSON đầu vào (Input Data) dựa trên mức độ ưu tiên của trường product_segment.

QUY TẮC SẮP XẾP (PRIORITY LOGIC):

Hãy duyệt qua trường product_segment của từng bản ghi và xếp hạng theo thứ tự từ cao xuống thấp (1 là cao nhất) như sau:

Ưu tiên 1 (Cao nhất): Các sản phẩm về Thẻ.
Điều kiện: product_segment chứa từ khóa "Thẻ", "Thẻ tín dụng", "Thẻ ghi nợ".

Ưu tiên 2: Các sản phẩm Ngân hàng điện tử & Tiện ích.
Điều kiện: product_segment chứa từ khóa "Ngân hàng Điện tử", "eBanking", "Tiện ích chức năng".

Ưu tiên 3: Các sản phẩm Tiền gửi (Huy động vốn).
Điều kiện: product_segment chứa từ khóa "Sản phẩm Tiền gửi", "Tiền gửi tiết kiệm", "Chứng chỉ tiền gửi".

Ưu tiên 4: Các sản phẩm Vay (Tín dụng).
Điều kiện: product_segment chứa từ khóa "Sản phẩm Vay", "Vay tiêu dùng", "Vay mua nhà/xe".

Ưu tiên 5 (Thấp nhất): Các sản phẩm và dịch vụ Khác.
Điều kiện: Các trường hợp còn lại (Ví dụ: "Dịch vụ KHCN Khác", "Bảo hiểm", "Hoạt động thương hiệu"...).

Kết quả trả ra:
Chỉ trả về một mảng JSON chứa các object với 2 trường "_id" và thứ tự ưu tiên đã được sắp xếp. KHÔNG thêm bất kỳ text nào khác.
Format: [{"_id": "xxx"}, {"_id": "yyy"}, ...]

Input Data:
${JSON.stringify(productsForSorting, null, 2)}`

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: prompt }]
                        }]
                    })
                }
            )

            const data = await response.json()
            const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text

            if (!aiResponse) {
                console.warn('No AI response, returning unsorted products')
                return products
            }

            // Parse AI response (remove markdown code blocks if present)
            let sortedIds: { _id: string }[] = []
            try {
                const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim()
                sortedIds = JSON.parse(cleanedResponse)
            } catch (parseError) {
                console.error('Error parsing AI response:', parseError)
                return products
            }

            // Map sorted IDs back to full product objects
            const sortedProducts: NewProductData[] = []
            sortedIds.forEach(({ _id }) => {
                const product = products.find(p => p._id === _id)
                if (product) {
                    sortedProducts.push(product)
                }
            })

            // Add any products that weren't in the sorted list (shouldn't happen)
            products.forEach(p => {
                if (!sortedProducts.find(sp => sp._id === p._id)) {
                    sortedProducts.push(p)
                }
            })

            console.log('✅ Products sorted successfully by AI')
            return sortedProducts

        } catch (error) {
            console.error('Error sorting products with AI:', error)
            return products // Return unsorted on error
        }
    }

    // Fetch selected items from API
    useEffect(() => {
        const fetchSummaryData = async () => {
            try {
                setLoading(true)
                const response = await fetch(apiEndpoint('api/data/summary-selected'))
                const result = await response.json()

                if (result.success) {
                    const fetchedProducts = result.data.newProducts || []
                    setNewProducts(fetchedProducts)

                    // Sort products with AI
                    const sorted = await sortProductsWithAI(fetchedProducts)
                    setSortedNewProducts(sorted)

                    setMarketTrends(result.data.marketTrends || [])
                    setFintechNews(result.data.fintechNews || [])
                }
            } catch (error) {
                console.error('Error fetching summary data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchSummaryData()
    }, [])

    // Convert data to categories
    const dataByCategory: Record<string, any[]> = {
        'Sản phẩm & Dịch vụ mới': sortedNewProducts.length > 0 ? sortedNewProducts : newProducts,
        'Tin tức ngành Ngân hàng': marketTrends,
        'Tin tức ngành Fintech': fintechNews
    }

    // Auto-adjust current page when items change (e.g., after deletion)
    useEffect(() => {
        setCurrentPage(prev => {
            const updated = { ...prev }
            let hasChanges = false

            Object.entries(dataByCategory).forEach(([categoryTitle, items]) => {
                const totalPages = Math.ceil(items.length / itemsPerPage)
                const currentPageNum = prev[categoryTitle] || 1

                // If current page exceeds total pages, reset to last valid page
                if (currentPageNum > totalPages && totalPages > 0) {
                    updated[categoryTitle] = totalPages
                    hasChanges = true
                }
                // If no items, reset to page 1
                else if (items.length === 0) {
                    updated[categoryTitle] = 1
                    hasChanges = true
                }
            })

            return hasChanges ? updated : prev
        })
    }, [newProducts.length, sortedNewProducts.length, marketTrends.length, fintechNews.length])

    // Track previous page values to detect actual changes (not initial mount)
    const prevPageRef = useRef<Record<string, number>>(currentPage)

    // Scroll to top of category when page changes
    useEffect(() => {
        // Find which category's page changed by comparing with previous values
        Object.entries(currentPage).forEach(([categoryTitle, pageNum]) => {
            const prevPage = prevPageRef.current[categoryTitle]
            // Only scroll if page actually changed (not initial mount)
            if (prevPage !== undefined && prevPage !== pageNum) {
                const ref = categoryRefs.current[categoryTitle]
                if (ref) {
                    // Scroll to category title when page changes
                    ref.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            }
        })
        // Update previous page values
        prevPageRef.current = currentPage
    }, [currentPage])

    // Helper functions
    const getTitle = (item: any): string => {
        if ('product_name' in item) return item.product_name
        return item.title || ''
    }

    const getDisplayName = (item: any): string => {
        if ('organization' in item) return item.organization || ''
        if ('bank' in item) return Array.isArray(item.bank) ? item.bank.join(', ') : (item.bank || '')
        if ('bank_related' in item) return Array.isArray(item.bank_related) ? item.bank_related.join(', ') : (item.bank_related || '')
        return ''
    }

    const getDate = (item: any): string => {
        if ('date_published' in item) return item.date_published
        if ('published_date' in item) return item.published_date
        return ''
    }

    const toggleExpanded = (category: string, id: string) => {
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

    const handleEdit = (uniqueKey: string, item: any) => {
        setEditingId(uniqueKey)
        setTempTitleValue(getTitle(item))
        setTempSummaryValue(item.summary || item.description || '')
    }

    const handleSave = async (categoryTitle: string, itemId: string, item: any) => {
        try {
            let collection = ''
            let titleField = ''
            let summaryField = ''

            if (categoryTitle === 'Sản phẩm & Dịch vụ mới') {
                collection = 'new-products'
                titleField = 'product_name'
                summaryField = 'description'
            } else if (categoryTitle === 'Tin tức ngành Ngân hàng') {
                collection = 'market-trends'
                titleField = 'title'
                summaryField = 'summary'
            } else if (categoryTitle === 'Tin tức ngành Fintech') {
                collection = 'fintech-news'
                titleField = 'title'
                summaryField = 'summary'
            }

            // Update title if changed
            const originalTitle = getTitle(item)
            const originalSummary = item.summary || item.description || ''

            const updates = []
            const changedFields = []

            if (tempTitleValue !== originalTitle) {
                changedFields.push('tiêu đề')
                updates.push(
                    fetch(apiEndpoint(`api/data/update-field/${collection}/${itemId}`), {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            field: titleField,
                            value: tempTitleValue
                        })
                    })
                )
            }

            if (tempSummaryValue !== originalSummary) {
                changedFields.push('nội dung')
                updates.push(
                    fetch(apiEndpoint(`api/data/update-field/${collection}/${itemId}`), {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            field: summaryField,
                            value: tempSummaryValue
                        })
                    })
                )
            }

            if (updates.length === 0) {
                alert('Không có thay đổi nào!')
                setEditingId(null)
                return
            }

            // Confirmation dialog
            const confirmMessage = `Bạn có chắc chắn muốn thay đổi ${changedFields.join(' và ')} không?`
            if (!confirm(confirmMessage)) {
                return
            }

            const results = await Promise.all(updates)
            const allSuccess = results.every(async (res) => {
                const data = await res.json()
                return data.success
            })

            if (allSuccess) {
                // Update local state
                if (collection === 'new-products') {
                    setNewProducts(prev => prev.map(i => i._id === itemId ? {
                        ...i,
                        product_name: tempTitleValue,
                        description: tempSummaryValue
                    } : i))
                } else if (collection === 'market-trends') {
                    setMarketTrends(prev => prev.map(i => i._id === itemId ? {
                        ...i,
                        title: tempTitleValue,
                        summary: tempSummaryValue
                    } : i))
                } else if (collection === 'fintech-news') {
                    setFintechNews(prev => prev.map(i => i._id === itemId ? {
                        ...i,
                        title: tempTitleValue,
                        summary: tempSummaryValue
                    } : i))
                }
                alert('Đã cập nhật thành công!')
                setEditingId(null)
                setTempTitleValue('')
                setTempSummaryValue('')
            } else {
                alert('Có lỗi xảy ra khi cập nhật!')
            }
        } catch (error) {
            console.error('Error updating:', error)
            alert('Có lỗi xảy ra!')
        }
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setTempTitleValue('')
        setTempSummaryValue('')
    }

    // // Toggle selection status (not saved to DB yet)
    // const handleToggleSelection = (categoryTitle: string, itemId: string, currentSelected: boolean) => {
    //     let collection = ''
    //     if (categoryTitle === 'Sản phẩm & Dịch vụ mới') collection = 'new-products'
    //     else if (categoryTitle === 'Tin tức ngành Ngân hàng') collection = 'market-trends'
    //     else if (categoryTitle === 'Tin tức ngành Fintech') collection = 'fintech-news'

    //     // Update local state immediately
    //     if (collection === 'new-products') {
    //         setNewProducts(prev => prev.map(i => i._id === itemId ? { ...i, selected: !currentSelected } : i))
    //     } else if (collection === 'market-trends') {
    //         setMarketTrends(prev => prev.map(i => i._id === itemId ? { ...i, selected: !currentSelected } : i))
    //     } else if (collection === 'fintech-news') {
    //         setFintechNews(prev => prev.map(i => i._id === itemId ? { ...i, selected: !currentSelected } : i))
    //     }

    //     // Track the change for later batch update
    //     setPendingSelectionChanges(prev => {
    //         const newMap = new Map(prev)
    //         newMap.set(itemId, { collection, selected: !currentSelected })
    //         return newMap
    //     })
    // }

    // Toggle reportSelected status and save to DB immediately
    const handleToggleReportSelected = async (categoryTitle: string, itemId: string, currentReportSelected: boolean) => {
        let collection = ''
        if (categoryTitle === 'Sản phẩm & Dịch vụ mới') collection = 'new-products'
        else if (categoryTitle === 'Tin tức ngành Ngân hàng') collection = 'market-trends'
        else if (categoryTitle === 'Tin tức ngành Fintech') collection = 'fintech-news'

        try {
            // Update database immediately
            const response = await fetch(apiEndpoint(`api/data/update-field/${collection}/${itemId}`), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    field: 'reportSelected',
                    value: !currentReportSelected
                })
            })

            const result = await response.json()
            if (result.success) {
                // Update local state after successful DB update
                if (collection === 'new-products') {
                    setNewProducts(prev => prev.map(i => i._id === itemId ? { ...i, reportSelected: !currentReportSelected } : i))
                    setSortedNewProducts(prev => prev.map(i => i._id === itemId ? { ...i, reportSelected: !currentReportSelected } : i))
                } else if (collection === 'market-trends') {
                    setMarketTrends(prev => prev.map(i => i._id === itemId ? { ...i, reportSelected: !currentReportSelected } : i))
                } else if (collection === 'fintech-news') {
                    setFintechNews(prev => prev.map(i => i._id === itemId ? { ...i, reportSelected: !currentReportSelected } : i))
                }
            } else {
                alert('Có lỗi xảy ra khi cập nhật!')
            }
        } catch (error) {
            console.error('Error toggling reportSelected:', error)
            alert('Có lỗi xảy ra!')
        }
    }

    // Remove item from report (set selected=false and reportSelected=false)
    const handleRemoveFromReport = async (categoryTitle: string, itemId: string) => {
        if (!window.confirm('Bạn có chắc muốn xóa tin này khỏi báo cáo?')) {
            return
        }

        let collection = ''
        if (categoryTitle === 'Sản phẩm & Dịch vụ mới') collection = 'new-products'
        else if (categoryTitle === 'Tin tức ngành Ngân hàng') collection = 'market-trends'
        else if (categoryTitle === 'Tin tức ngành Fintech') collection = 'fintech-news'

        try {
            // Update both selected and reportSelected to false
            await Promise.all([
                fetch(apiEndpoint(`api/data/update-field/${collection}/${itemId}`), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        field: 'selected',
                        value: false
                    })
                }),
                fetch(apiEndpoint(`api/data/update-field/${collection}/${itemId}`), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        field: 'reportSelected',
                        value: false
                    })
                })
            ])

            // Reload page to reflect changes
            window.location.reload()
        } catch (error) {
            console.error('Error removing from report:', error)
            alert('Có lỗi xảy ra khi xóa tin!')
        }
    }

    // Send item to n8n for reprocessing with new flow
    const handleReprocess = async (categoryTitle: string, itemId: string, item: any) => {
        let collection = ''
        if (categoryTitle === 'Sản phẩm & Dịch vụ mới') collection = 'new-products'
        else if (categoryTitle === 'Tin tức ngành Ngân hàng') collection = 'market-trends'
        else if (categoryTitle === 'Tin tức ngành Fintech') collection = 'fintech-news'

        try {
            // Step 1: Get id_processed from the item
            const idProcessed = item.id_processed

            if (!idProcessed) {
                alert('Tin tức này chưa có id_processed!')
                return
            }

            // Step 2: Get HeaderProcessing document using id_processed
            const headerResponse = await fetch(apiEndpoint('api/n8n/get-header-processing'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id_processed: idProcessed })
            })

            const headerData = await headerResponse.json()

            if (!headerData.success || !headerData.data) {
                alert('Không tìm thấy thông tin HeaderProcessing!')
                return
            }

            const headerDoc = headerData.data

            // Debug: Log the topic_classification value
            console.log('📋 HeaderProcessing data:', {
                _id: headerDoc._id,
                topic_classification: headerDoc.topic_classification,
                collection,
                itemId
            })

            // Step 3: Show popup with topic_classification options
            setReprocessData({
                collection,
                itemId,
                idProcessed,
                headerProcessingId: headerDoc._id,
                currentTopicClassification: headerDoc.topic_classification || null
            })
            setSelectedTopicClassification(headerDoc.topic_classification || '')
            setShowReprocessPopup(true)

        } catch (error) {
            console.error('Error in handleReprocess:', error)
            alert('Có lỗi xảy ra khi xử lý!')
        }
    }

    // Handle confirmation of reprocessing in popup
    const handleConfirmReprocess = async () => {
        if (!reprocessData || !selectedTopicClassification) {
            alert('Vui lòng chọn phân loại!')
            return
        }

        setIsReprocessing(true)

        try {
            // Step 1: Update topic_classification in HeaderProcessing
            const updateResponse = await fetch(apiEndpoint('api/n8n/update-topic-classification'), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_processed: reprocessData.idProcessed,
                    topic_classification: selectedTopicClassification
                })
            })

            const updateResult = await updateResponse.json()

            if (!updateResult.success) {
                alert('Không thể cập nhật phân loại!')
                setIsReprocessing(false)
                return
            }

            // Step 2: Send to n8n and get jobId (using job-based pattern)
            const reprocessResponse = await fetch(apiEndpoint('api/n8n/reprocess-with-callback'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_processed: reprocessData.idProcessed,
                    collection: reprocessData.collection,
                    itemId: reprocessData.itemId
                })
            })

            const reprocessResult = await reprocessResponse.json()

            if (reprocessResult.jobId) {
                alert('Đã gửi yêu cầu tóm tắt lại! Trang sẽ được tải lại khi n8n hoàn thành.')
                // Close popup
                setShowReprocessPopup(false)
                setReprocessData(null)
                setSelectedTopicClassification('')

                // Start polling for job completion
                startPollingForReprocess(reprocessResult.jobId)
            } else {
                alert(reprocessResult.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.')
                setIsReprocessing(false)
            }

        } catch (error) {
            console.error('Error confirming reprocess:', error)
            alert('Có lỗi xảy ra!')
            setIsReprocessing(false)
        }
    }

    // Poll for reprocess job status
    const startPollingForReprocess = (jobId: string) => {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(apiEndpoint(`api/n8n/job/${jobId}`))
                const job = await response.json()

                if (job.status === 'completed') {
                    clearInterval(pollInterval)
                    setIsReprocessing(false)
                    // Reload page to show updated data
                    window.location.reload()
                } else if (job.status === 'failed') {
                    clearInterval(pollInterval)
                    setIsReprocessing(false)
                    alert('Tóm tắt lại thất bại! Vui lòng thử lại.')
                }
            } catch (error) {
                console.error('Error polling reprocess job:', error)
            }
        }, 3000) // Poll every 3 seconds
    }

    // Handle closing popup
    const handleCloseReprocessPopup = () => {
        if (isReprocessing) {
            alert('Đang xử lý, vui lòng đợi!')
            return
        }
        setShowReprocessPopup(false)
        setReprocessData(null)
        setSelectedTopicClassification('')
    }

    // // Save all pending selection changes to database
    // const handleSaveSelectionChanges = async () => {
    //     if (pendingSelectionChanges.size === 0) {
    //         alert('Không có thay đổi nào!')
    //         return
    //     }

    //     if (!confirm(`Bạn có chắc chắn muốn cập nhật ${pendingSelectionChanges.size} thay đổi?`)) {
    //         return
    //     }

    //     try {
    //         // Group changes by collection
    //         const changesByCollection: Record<string, Array<{ id: string, selected: boolean }>> = {}

    //         pendingSelectionChanges.forEach((value, id) => {
    //             if (!changesByCollection[value.collection]) {
    //                 changesByCollection[value.collection] = []
    //             }
    //             changesByCollection[value.collection].push({ id, selected: value.selected })
    //         })

    //         // Send updates for each collection
    //         const updatePromises = Object.entries(changesByCollection).map(([collection, changes]) => {
    //             return Promise.all(changes.map(({ id, selected }) =>
    //                 fetch(apiEndpoint(`api/data/update-field/${collection}/${id}`), {
    //                     method: 'PATCH',
    //                     headers: { 'Content-Type': 'application/json' },
    //                     body: JSON.stringify({
    //                         field: 'selected',
    //                         value: selected
    //                     })
    //                 })
    //             ))
    //         })

    //         await Promise.all(updatePromises)

    //         alert('Đã cập nhật thành công!')
    //         setPendingSelectionChanges(new Map())
    //     } catch (error) {
    //         console.error('Error updating selections:', error)
    //         alert('Có lỗi xảy ra khi cập nhật!')
    //     }
    // }


    const formatDate = (dateString: string): string => {
        if (!dateString) return 'N/A'

        // Check if already in dd/mm/yyyy format
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
            return dateString
        }

        // Try to parse as ISO date
        const date = new Date(dateString)
        if (isNaN(date.getTime())) {
            return 'N/A'
        }

        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    const handleImageUpload = async (categoryTitle: string, itemId: string, file: File) => {
        try {
            // Convert image to base64
            const reader = new FileReader()
            reader.onloadend = async () => {
                const base64Image = reader.result as string

                // Determine collection name
                let collection = ''
                if (categoryTitle === 'Sản phẩm & Dịch vụ mới') collection = 'new-products'
                else if (categoryTitle === 'Tin tức ngành Ngân hàng') collection = 'market-trends'
                else if (categoryTitle === 'Tin tức ngành Fintech') collection = 'fintech-news'

                // Update image in backend
                const response = await fetch(apiEndpoint(`api/data/update-image/${collection}/${itemId}`), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64Image })
                })

                const result = await response.json()
                if (result.success) {
                    // Update local state with data from backend
                    if (collection === 'new-products') {
                        setNewProducts(prev => prev.map(item =>
                            item._id === itemId ? result.data : item
                        ))
                        // Also update sortedNewProducts to reflect changes immediately
                        setSortedNewProducts(prev => prev.map(item =>
                            item._id === itemId ? result.data : item
                        ))
                    } else if (collection === 'market-trends') {
                        setMarketTrends(prev => prev.map(item =>
                            item._id === itemId ? result.data : item
                        ))
                    } else if (collection === 'fintech-news') {
                        setFintechNews(prev => prev.map(item =>
                            item._id === itemId ? result.data : item
                        ))
                    }
                    alert('Đã upload ảnh thành công!')
                } else {
                    alert('Upload ảnh thất bại!')
                }
            }
            reader.readAsDataURL(file)
        } catch (error) {
            console.error('Error uploading image:', error)
            alert('Có lỗi xảy ra khi upload ảnh!')
        }
    }

    const handleGenerateImage = async (categoryTitle: string, itemId: string, item: any) => {
        try {
            setUploadingImageFor(itemId)

            // Determine collection name
            let collection = ''
            if (categoryTitle === 'Sản phẩm & Dịch vụ mới') collection = 'new-products'
            else if (categoryTitle === 'Tin tức ngành Ngân hàng') collection = 'market-trends'
            else if (categoryTitle === 'Tin tức ngành Fintech') collection = 'fintech-news'

            // Get summary (use description for products, summary for others)
            const summary = item.summary || item.description || getTitle(item)

            // Generate image
            const response = await fetch(apiEndpoint(`api/data/generate-image/${collection}/${itemId}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summary,
                    category: categoryTitle
                })
            })

            const result = await response.json()
            if (result.success) {
                // Update local state with generated image
                if (collection === 'new-products') {
                    setNewProducts(prev => prev.map(i =>
                        i._id === itemId ? result.data : i
                    ))
                    // Also update sortedNewProducts to reflect changes immediately
                    setSortedNewProducts(prev => prev.map(i =>
                        i._id === itemId ? result.data : i
                    ))
                } else if (collection === 'market-trends') {
                    setMarketTrends(prev => prev.map(i =>
                        i._id === itemId ? result.data : i
                    ))
                } else if (collection === 'fintech-news') {
                    setFintechNews(prev => prev.map(i =>
                        i._id === itemId ? result.data : i
                    ))
                }
                alert('Đã tạo ảnh thành công!')
            } else {
                alert(`Tạo ảnh thất bại: ${result.message}`)
            }
        } catch (error) {
            console.error('Error generating image:', error)
            alert('Có lỗi xảy ra khi tạo ảnh!')
        } finally {
            setUploadingImageFor(null)
        }
    }

    if (loading) {
        return (
            <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #dee2e6',
                borderRadius: '12px',
                padding: '32px',
                minHeight: '500px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                    <p style={{ fontSize: '16px', color: '#6c757d' }}>Đang tải dữ liệu...</p>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #dee2e6',
            borderRadius: '12px',
            padding: '32px',
            minHeight: '500px'
        }}>
            {Object.entries(dataByCategory).map(([categoryTitle, items]) => (
                <div key={categoryTitle} style={{ marginBottom: '48px' }}>
                    <h2
                        ref={(el) => { categoryRefs.current[categoryTitle] = el }}
                        style={{
                            fontSize: '22px',
                            color: '#2c3e50',
                            marginBottom: '20px',
                            paddingBottom: '12px',
                            borderBottom: '2px solid #F00020',
                            fontWeight: '600',
                            scrollMarginTop: '100px'
                        }}>
                        {categoryTitle}
                    </h2>

                    <div className="news-list">
                        {items.slice(
                            (currentPage[categoryTitle] - 1) * itemsPerPage,
                            currentPage[categoryTitle] * itemsPerPage
                        ).map((item: any) => {
                            const uniqueKey = `${categoryTitle}-${item._id}`
                            const isExpanded = expandedItems[categoryTitle]?.has(item._id) || false

                            return (
                                <article key={item._id} className="news-card">
                                    <div className="news-image" style={{ position: 'relative' }}>
                                        {item.image ? (
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ position: 'relative', cursor: 'pointer' }}
                                                    onClick={() => {
                                                        const input = document.createElement('input')
                                                        input.type = 'file'
                                                        input.accept = 'image/*'
                                                        input.onchange = (e) => {
                                                            const file = (e.target as HTMLInputElement).files?.[0]
                                                            if (file) {
                                                                if (window.confirm('Bạn có muốn thay đổi ảnh này?')) {
                                                                    handleImageUpload(categoryTitle, item._id, file)
                                                                }
                                                            }
                                                        }
                                                        input.click()
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        const overlay = e.currentTarget.querySelector('[data-overlay]') as HTMLElement
                                                        if (overlay) {
                                                            overlay.style.backgroundColor = 'rgba(240, 0, 32, 0.7)'
                                                            overlay.style.opacity = '1'
                                                        }
                                                    }}
                                                    onDragLeave={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        const overlay = e.currentTarget.querySelector('[data-overlay]') as HTMLElement
                                                        if (overlay) {
                                                            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0)'
                                                            overlay.style.opacity = '0'
                                                        }
                                                    }}
                                                    onDrop={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        const overlay = e.currentTarget.querySelector('[data-overlay]') as HTMLElement
                                                        if (overlay) {
                                                            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0)'
                                                            overlay.style.opacity = '0'
                                                        }
                                                        const file = e.dataTransfer.files[0]
                                                        if (file && file.type.startsWith('image/')) {
                                                            if (window.confirm('Bạn có muốn thay đổi ảnh này?')) {
                                                                handleImageUpload(categoryTitle, item._id, file)
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <img src={item.image} alt={getTitle(item)} style={{ display: 'block', width: '100%' }} />
                                                    <div
                                                        data-overlay
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            bottom: 0,
                                                            backgroundColor: 'rgba(0, 0, 0, 0)',
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            opacity: 0,
                                                            transition: 'all 0.3s ease',
                                                            pointerEvents: 'none'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
                                                            e.currentTarget.style.opacity = '1'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0)'
                                                            e.currentTarget.style.opacity = '0'
                                                        }}
                                                    >
                                                        <div style={{ color: '#ffffff', textAlign: 'center' }}>
                                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 8px' }}>
                                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                                                <polyline points="21 15 16 10 5 21"/>
                                                            </svg>
                                                            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Click hoặc kéo thả để thay đổi ảnh</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                {uploadingImageFor !== item._id && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleGenerateImage(categoryTitle, item._id, item)
                                                        }}
                                                        style={{
                                                            position: 'absolute',
                                                            bottom: '12px',
                                                            right: '12px',
                                                            padding: '8px 16px',
                                                            backgroundColor: '#F00020',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.2s ease',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#c00018'
                                                            e.currentTarget.style.transform = 'translateY(-1px)'
                                                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#F00020'
                                                            e.currentTarget.style.transform = 'translateY(0)'
                                                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                                                        }}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                            <polyline points="7 10 12 15 17 10"></polyline>
                                                            <line x1="12" y1="15" x2="12" y2="3"></line>
                                                        </svg>
                                                        Gen ảnh
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ position: 'relative' }}>
                                                <div style={{
                                                    width: '100%',
                                                    height: '200px',
                                                    border: '2px dashed #dee2e6',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    backgroundColor: '#f8f9fa',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onClick={() => {
                                                    const input = document.createElement('input')
                                                    input.type = 'file'
                                                    input.accept = 'image/*'
                                                    input.onchange = (e) => {
                                                        const file = (e.target as HTMLInputElement).files?.[0]
                                                        if (file) {
                                                            handleImageUpload(categoryTitle, item._id, file)
                                                        }
                                                    }
                                                    input.click()
                                                }}
                                                onDragOver={(e) => {
                                                    e.preventDefault()
                                                    e.currentTarget.style.borderColor = '#F00020'
                                                    e.currentTarget.style.backgroundColor = '#fff5f5'
                                                }}
                                                onDragLeave={(e) => {
                                                    e.currentTarget.style.borderColor = '#dee2e6'
                                                    e.currentTarget.style.backgroundColor = '#f8f9fa'
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault()
                                                    e.currentTarget.style.borderColor = '#dee2e6'
                                                    e.currentTarget.style.backgroundColor = '#f8f9fa'
                                                    const file = e.dataTransfer.files[0]
                                                    if (file && file.type.startsWith('image/')) {
                                                        handleImageUpload(categoryTitle, item._id, file)
                                                    }
                                                }}
                                                >
                                                    {uploadingImageFor === item._id ? (
                                                        <>
                                                            <div style={{ fontSize: '48px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>⏳</div>
                                                            <p style={{ margin: 0, fontSize: '14px', color: '#6c757d', fontWeight: '500' }}>
                                                                Đang tạo ảnh...
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6c757d" strokeWidth="2" style={{ display: 'block', margin: '0 auto' }}>
                                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                                                <polyline points="21 15 16 10 5 21"/>
                                                            </svg>
                                                            <p style={{ margin: '12px 0 4px 0', fontSize: '14px', color: '#6c757d', fontWeight: '500', textAlign: 'center' }}>
                                                                Kéo thả ảnh vào đây
                                                            </p>
                                                            <p style={{ margin: 0, fontSize: '12px', color: '#adb5bd', textAlign: 'center' }}>
                                                                hoặc click để chọn file
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                                {uploadingImageFor !== item._id && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleGenerateImage(categoryTitle, item._id, item)
                                                        }}
                                                        style={{
                                                            position: 'absolute',
                                                            bottom: '12px',
                                                            right: '12px',
                                                            padding: '8px 16px',
                                                            backgroundColor: '#F00020',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.2s ease',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#c00018'
                                                            e.currentTarget.style.transform = 'translateY(-1px)'
                                                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#F00020'
                                                            e.currentTarget.style.transform = 'translateY(0)'
                                                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                                                        }}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                            <polyline points="7 10 12 15 17 10"></polyline>
                                                            <line x1="12" y1="15" x2="12" y2="3"></line>
                                                        </svg>
                                                        Gen ảnh
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="news-content">
                                        {editingId === uniqueKey ? (
                                            <div className="edit-container" style={{ marginBottom: '16px' }}>
                                                <div style={{ marginBottom: '12px' }}>
                                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                                                        Tiêu đề
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="edit-title-input"
                                                        value={tempTitleValue}
                                                        onChange={(e) => setTempTitleValue(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            fontSize: '16px',
                                                            fontWeight: '600',
                                                            border: '2px solid #F00020',
                                                            borderRadius: '6px'
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ marginBottom: '12px' }}>
                                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                                                        Nội dung
                                                    </label>
                                                    <textarea
                                                        className="edit-summary-textarea"
                                                        value={tempSummaryValue}
                                                        onChange={(e) => setTempSummaryValue(e.target.value)}
                                                        rows={4}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            fontSize: '14px',
                                                            border: '2px solid #F00020',
                                                            borderRadius: '6px',
                                                            resize: 'vertical'
                                                        }}
                                                    />
                                                </div>
                                                <div className="edit-buttons" style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        className="save-btn"
                                                        onClick={() => handleSave(categoryTitle, item._id, item)}
                                                        style={{
                                                            padding: '8px 16px',
                                                            backgroundColor: '#F00020',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '14px',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                        Lưu
                                                    </button>
                                                    <button
                                                        className="cancel-btn"
                                                        onClick={handleCancelEdit}
                                                        style={{
                                                            padding: '8px 16px',
                                                            backgroundColor: '#6c757d',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '14px',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <line x1="18" y1="6" x2="6" y2="18" />
                                                            <line x1="6" y1="6" x2="18" y2="18" />
                                                        </svg>
                                                        Hủy
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                    <h2 className="news-title" style={{ flex: 1, margin: 0 }}>{getTitle(item)}</h2>
                                                    <button
                                                        onClick={() => handleToggleReportSelected(categoryTitle, item._id, item.reportSelected || false)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: item.reportSelected ? '#28a745' : '#dc3545',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        {item.reportSelected ? (
                                                            <>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                                <span>Đã chọn báo cáo</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                                </svg>
                                                                <span>Không chọn báo cáo</span>
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveFromReport(categoryTitle, item._id)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: '#dc3545',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#c82333'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#dc3545'
                                                        }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                            <line x1="10" y1="11" x2="10" y2="17" />
                                                            <line x1="14" y1="11" x2="14" y2="17" />
                                                        </svg>
                                                        <span>Xóa tin</span>
                                                    </button>
                                                    <button
                                                        className="edit-btn"
                                                        onClick={() => handleEdit(uniqueKey, item)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: 'transparent',
                                                            color: '#F00020',
                                                            border: '1px solid #F00020',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                        Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => handleReprocess(categoryTitle, item._id, item)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: '#17a2b8',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#138496'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#17a2b8'
                                                        }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="23 4 23 10 17 10"></polyline>
                                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                                        </svg>
                                                        Tóm tắt lại
                                                    </button>
                                                </div>
                                                <p className="news-summary">{item.summary || item.description || 'Chưa có tóm tắt'}</p>
                                            </>
                                        )}

                                        {isExpanded && (
                                            <div className="news-details">
                                                <div className="detail-section">
                                                    <h4>Thông tin chi tiết</h4>

                                                    {/* Product specific fields */}
                                                    {item.product_segment && (
                                                        <p><strong>Phân khúc sản phẩm:</strong> {item.product_segment[0]} - {item.product_segment[1]}</p>
                                                    )}

                                                    {/* Banking News specific fields */}
                                                    {item.topic_group && (
                                                        <p><strong>Nhóm chủ đề:</strong> {item.topic_group}</p>
                                                    )}

                                                    {/* Fintech News specific fields */}
                                                    {item.fintech_topic && (
                                                        <p><strong>Chủ đề Fintech:</strong> {item.fintech_topic}</p>
                                                    )}
                                                    {item.area_affected && (
                                                        <p><strong>Phạm vi ảnh hưởng:</strong> {
                                                            Array.isArray(item.area_affected)
                                                                ? item.area_affected.join(', ')
                                                                : item.area_affected
                                                        }</p>
                                                    )}

                                                    {/* Common fields */}
                                                    {item.bank && (
                                                        <p><strong>Ngân hàng:</strong> {Array.isArray(item.bank) ? item.bank.join(', ') : item.bank}</p>
                                                    )}
                                                    {item.bank_related && (
                                                        <p><strong>Ngân hàng liên quan:</strong> {Array.isArray(item.bank_related) ? item.bank_related.join(', ') : item.bank_related}</p>
                                                    )}
                                                    {item.organization && (
                                                        <p><strong>Tổ chức:</strong> {item.organization}</p>
                                                    )}

                                                    {item.source_type && <p><strong>Loại nguồn:</strong> {item.source_type}</p>}
                                                    {item.pdf_file_name && <p><strong>File PDF:</strong> {item.pdf_file_name}</p>}
                                                    <p><strong>Ngày phát hành:</strong> {formatDate(getDate(item))}</p>
                                                    {item.source_url && (
                                                        <p><strong>Nguồn:</strong> <a href={item.source_url} target="_blank" rel="noopener noreferrer">{item.source_url}</a></p>
                                                    )}
                                                    {/* <p><strong>Nguồn gốc:</strong> Tự động tóm tắt từ {confirmedNewsCount} tin tức đã chọn</p> */}
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
                                                <span>{formatDate(getDate(item))}</span>
                                            </div>
                                            
                                            <button onClick={() => toggleExpanded(categoryTitle, item._id)} className="source-link detail-toggle-btn">
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
                            )
                        })}
                    </div>

                    {/* Pagination controls */}
                    {items.length > itemsPerPage && (() => {
                        const totalPages = Math.ceil(items.length / itemsPerPage)
                        const currentPageNum = currentPage[categoryTitle] || 1

                        return (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px',
                                marginTop: '24px'
                            }}>
                                {/* Previous button */}
                                <button
                                    onClick={() => {
                                        if (currentPageNum > 1) {
                                            setCurrentPage(prev => ({
                                                ...prev,
                                                [categoryTitle]: currentPageNum - 1
                                            }))
                                        }
                                    }}
                                    disabled={currentPageNum === 1}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: currentPageNum === 1 ? '#f0f0f0' : '#ffffff',
                                        color: currentPageNum === 1 ? '#999' : '#F00020',
                                        border: '2px solid ' + (currentPageNum === 1 ? '#ddd' : '#F00020'),
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: currentPageNum === 1 ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (currentPageNum > 1) {
                                            e.currentTarget.style.backgroundColor = '#F00020'
                                            e.currentTarget.style.color = '#ffffff'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (currentPageNum > 1) {
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                            e.currentTarget.style.color = '#F00020'
                                        }
                                    }}
                                >
                                    ‹ Trước
                                </button>

                                {/* Page numbers */}
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                        <button
                                            key={pageNum}
                                            onClick={() => {
                                                setCurrentPage(prev => ({
                                                    ...prev,
                                                    [categoryTitle]: pageNum
                                                }))
                                            }}
                                            style={{
                                                padding: '8px 12px',
                                                backgroundColor: currentPageNum === pageNum ? '#F00020' : '#ffffff',
                                                color: currentPageNum === pageNum ? '#ffffff' : '#F00020',
                                                border: '2px solid #F00020',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                minWidth: '40px'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (currentPageNum !== pageNum) {
                                                    e.currentTarget.style.backgroundColor = '#F00020'
                                                    e.currentTarget.style.color = '#ffffff'
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (currentPageNum !== pageNum) {
                                                    e.currentTarget.style.backgroundColor = '#ffffff'
                                                    e.currentTarget.style.color = '#F00020'
                                                }
                                            }}
                                        >
                                            {pageNum}
                                        </button>
                                    ))}
                                </div>

                                {/* Next button */}
                                <button
                                    onClick={() => {
                                        if (currentPageNum < totalPages) {
                                            setCurrentPage(prev => ({
                                                ...prev,
                                                [categoryTitle]: currentPageNum + 1
                                            }))
                                        }
                                    }}
                                    disabled={currentPageNum === totalPages}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: currentPageNum === totalPages ? '#f0f0f0' : '#ffffff',
                                        color: currentPageNum === totalPages ? '#999' : '#F00020',
                                        border: '2px solid ' + (currentPageNum === totalPages ? '#ddd' : '#F00020'),
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: currentPageNum === totalPages ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (currentPageNum < totalPages) {
                                            e.currentTarget.style.backgroundColor = '#F00020'
                                            e.currentTarget.style.color = '#ffffff'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (currentPageNum < totalPages) {
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                            e.currentTarget.style.color = '#F00020'
                                        }
                                    }}
                                >
                                    Sau ›
                                </button>
                            </div>
                        )
                    })()}
                </div>
            ))}

            {/* Reprocess Popup Modal */}
            {showReprocessPopup && reprocessData && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        padding: '32px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
                    }}>
                        <h3 style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#2c3e50',
                            marginBottom: '24px',
                            textAlign: 'center'
                        }}>
                            Hãy xác nhận lại phân loại
                        </h3>

                        <div style={{ marginBottom: '24px' }}>
                            <p style={{
                                fontSize: '14px',
                                color: '#6c757d',
                                marginBottom: '8px'
                            }}>
                                Chọn phân loại cho tin tức này:
                            </p>

                            {reprocessData?.currentTopicClassification && (
                                <p style={{
                                    fontSize: '13px',
                                    color: '#F00020',
                                    marginBottom: '16px',
                                    fontWeight: '600',
                                    backgroundColor: '#fff5f5',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #ffe0e0'
                                }}>
                                    Hiện tại: {reprocessData.currentTopicClassification}
                                </p>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Radio option 1: SPDV_NGAN_HANG_FINTECH */}
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    border: `2px solid ${selectedTopicClassification === 'SPDV_NGAN_HANG_FINTECH' ? '#F00020' : '#dee2e6'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: selectedTopicClassification === 'SPDV_NGAN_HANG_FINTECH' ? '#fff5f5' : '#ffffff',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedTopicClassification !== 'SPDV_NGAN_HANG_FINTECH') {
                                        e.currentTarget.style.backgroundColor = '#f8f9fa'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedTopicClassification !== 'SPDV_NGAN_HANG_FINTECH') {
                                        e.currentTarget.style.backgroundColor = '#ffffff'
                                    }
                                }}
                                >
                                    <input
                                        type="radio"
                                        name="topic_classification"
                                        value="SPDV_NGAN_HANG_FINTECH"
                                        checked={selectedTopicClassification === 'SPDV_NGAN_HANG_FINTECH'}
                                        onChange={(e) => setSelectedTopicClassification(e.target.value)}
                                        style={{
                                            marginRight: '12px',
                                            width: '18px',
                                            height: '18px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: selectedTopicClassification === 'SPDV_NGAN_HANG_FINTECH' ? '600' : '500',
                                        color: selectedTopicClassification === 'SPDV_NGAN_HANG_FINTECH' ? '#F00020' : '#495057'
                                    }}>
                                        Sản phẩm & dịch vụ
                                    </span>
                                </label>

                                {/* Radio option 2: THI_TRUONG_NGAN_HANG */}
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    border: `2px solid ${selectedTopicClassification === 'THI_TRUONG_NGAN_HANG' ? '#F00020' : '#dee2e6'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: selectedTopicClassification === 'THI_TRUONG_NGAN_HANG' ? '#fff5f5' : '#ffffff',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedTopicClassification !== 'THI_TRUONG_NGAN_HANG') {
                                        e.currentTarget.style.backgroundColor = '#f8f9fa'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedTopicClassification !== 'THI_TRUONG_NGAN_HANG') {
                                        e.currentTarget.style.backgroundColor = '#ffffff'
                                    }
                                }}
                                >
                                    <input
                                        type="radio"
                                        name="topic_classification"
                                        value="THI_TRUONG_NGAN_HANG"
                                        checked={selectedTopicClassification === 'THI_TRUONG_NGAN_HANG'}
                                        onChange={(e) => setSelectedTopicClassification(e.target.value)}
                                        style={{
                                            marginRight: '12px',
                                            width: '18px',
                                            height: '18px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: selectedTopicClassification === 'THI_TRUONG_NGAN_HANG' ? '600' : '500',
                                        color: selectedTopicClassification === 'THI_TRUONG_NGAN_HANG' ? '#F00020' : '#495057'
                                    }}>
                                        Thị trường Ngân hàng
                                    </span>
                                </label>

                                {/* Radio option 3: THI_TRUONG_FINTECH */}
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    border: `2px solid ${selectedTopicClassification === 'THI_TRUONG_FINTECH' ? '#F00020' : '#dee2e6'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: selectedTopicClassification === 'THI_TRUONG_FINTECH' ? '#fff5f5' : '#ffffff',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedTopicClassification !== 'THI_TRUONG_FINTECH') {
                                        e.currentTarget.style.backgroundColor = '#f8f9fa'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedTopicClassification !== 'THI_TRUONG_FINTECH') {
                                        e.currentTarget.style.backgroundColor = '#ffffff'
                                    }
                                }}
                                >
                                    <input
                                        type="radio"
                                        name="topic_classification"
                                        value="THI_TRUONG_FINTECH"
                                        checked={selectedTopicClassification === 'THI_TRUONG_FINTECH'}
                                        onChange={(e) => setSelectedTopicClassification(e.target.value)}
                                        style={{
                                            marginRight: '12px',
                                            width: '18px',
                                            height: '18px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: selectedTopicClassification === 'THI_TRUONG_FINTECH' ? '600' : '500',
                                        color: selectedTopicClassification === 'THI_TRUONG_FINTECH' ? '#F00020' : '#495057'
                                    }}>
                                        Thị trường Fintech
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleCloseReprocessPopup}
                                disabled={isReprocessing}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#6c757d',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: isReprocessing ? 'not-allowed' : 'pointer',
                                    opacity: isReprocessing ? 0.6 : 1,
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isReprocessing) {
                                        e.currentTarget.style.backgroundColor = '#5a6268'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isReprocessing) {
                                        e.currentTarget.style.backgroundColor = '#6c757d'
                                    }
                                }}
                            >
                                Hủy
                            </button>

                            <button
                                onClick={handleConfirmReprocess}
                                disabled={isReprocessing || !selectedTopicClassification}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#F00020',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: (isReprocessing || !selectedTopicClassification) ? 'not-allowed' : 'pointer',
                                    opacity: (isReprocessing || !selectedTopicClassification) ? 0.6 : 1,
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isReprocessing && selectedTopicClassification) {
                                        e.currentTarget.style.backgroundColor = '#c00018'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isReprocessing && selectedTopicClassification) {
                                        e.currentTarget.style.backgroundColor = '#F00020'
                                    }
                                }}
                            >
                                {isReprocessing && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                    </svg>
                                )}
                                {isReprocessing ? 'Đang xử lý...' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

// Wrapper component to fetch data and pass to SummaryPages
function SummaryPagesWrapper({
    onResetWithCleanup,
    onReportConfirmed,
    startDateISO,
    endDateISO,
    confirmedNewsCount
}: {
    onResetWithCleanup: () => Promise<void>
    onReportConfirmed: () => void
    startDateISO: string
    endDateISO: string
    confirmedNewsCount: number
}) {
    const [newProducts, setNewProducts] = useState<NewProductData[]>([])
    const [bankingTrends, setBankingTrends] = useState<BankingTrendData[]>([])
    const [fintechNews, setFintechNews] = useState<FintechNewsData[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch selected items from API
    useEffect(() => {
        const fetchSummaryData = async () => {
            try {
                setLoading(true)
                const response = await fetch(apiEndpoint('api/data/summary-selected'))
                const result = await response.json()

                console.log('SummaryPagesWrapper - API Response:', result)

                if (result.success) {
                    const products = result.data.newProducts || []
                    const trends = result.data.marketTrends || []
                    const news = result.data.fintechNews || []

                    console.log('SummaryPagesWrapper - Setting newProducts:', products)
                    console.log('SummaryPagesWrapper - Setting bankingTrends:', trends)
                    console.log('SummaryPagesWrapper - Setting fintechNews:', news)

                    setNewProducts(products)
                    setBankingTrends(trends)
                    setFintechNews(news)
                }
            } catch (error) {
                console.error('Error fetching summary data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchSummaryData()
    }, [])

    if (loading) {
        return <div>Đang tải dữ liệu...</div>
    }

    return (
        <SummaryPages
            onResetWithCleanup={onResetWithCleanup}
            onReportConfirmed={onReportConfirmed}
            startDateISO={startDateISO}
            endDateISO={endDateISO}
            newProducts={newProducts}
            bankingTrends={bankingTrends}
            fintechNews={fintechNews}
            page1Content={
                <SummaryContent
                    confirmedNewsCount={confirmedNewsCount}
                />
            }
        />
    )
}

function SelectNews() {
    // Navigation
    const navigate = useNavigate()

    // Global notification context
    const { startMonitoringWorkflow, stopMonitoringWorkflow } = useNotification()

    // State for data from API
    const [newsData, setNewsData] = useState<NewsItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Initialize with current month date range (from 1st of current month to today)
    // WITH localStorage persistence to maintain date range across steps
    const today = new Date()
    const threeWeeksAgo = new Date(today)
    threeWeeksAgo.setDate(today.getDate() - 21) // 3 weeks = 21 days

    const [startDateISO, setStartDateISO] = useState(() => {
        const saved = localStorage.getItem('selectNews_startDateISO')
        return saved || threeWeeksAgo.toISOString().split('T')[0]
    })
    const [endDateISO, setEndDateISO] = useState(() => {
        const saved = localStorage.getItem('selectNews_endDateISO')
        return saved || today.toISOString().split('T')[0]
    })
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [isPriorityView, setIsPriorityView] = useState(false) // New state to track priority view
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [tempPriorities, setTempPriorities] = useState<Record<string, boolean>>({})
    const [confirmedPriorities, setConfirmedPriorities] = useState<Record<string, boolean>>({})

    // n8n workflow state with localStorage persistence
    const [isProcessing, setIsProcessing] = useState(() => {
        const saved = localStorage.getItem('selectNews_isProcessing')
        return saved === 'true'
    })
    const [jobId, setJobId] = useState<string | null>(() => {
        return localStorage.getItem('selectNews_jobId')
    })
    const [workflowCompleted, setWorkflowCompleted] = useState(() => {
        const saved = localStorage.getItem('selectNews_workflowCompleted')
        return saved === 'true'
    })

    // Workflow step state with localStorage persistence
    // IMPORTANT: If workflowCompleted=true, stay at 'next' step to show success message and buttons
    // Only go to 'summary' when user explicitly clicks "Xem báo cáo"
    const [currentStep, setCurrentStep] = useState<'selection' | 'next' | 'summary'>(() => {
        const saved = localStorage.getItem('selectNews_currentStep')
        return (saved as 'selection' | 'next' | 'summary') || 'selection'
    })
    const [confirmedNews, setConfirmedNews] = useState<NewsItem[]>(() => {
        const saved = localStorage.getItem('selectNews_confirmedNews')
        return saved ? JSON.parse(saved) : []
    })

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [confirmedNewsPage, setConfirmedNewsPage] = useState(1)
    const itemsPerPage = 10 // Number of news items per page

    // Ref for scrolling to top of news list when page changes
    const newsListTopRef = useRef<HTMLDivElement>(null)

    // Pagination state for each topic group in Priority View
    const [topicPages, setTopicPages] = useState<Record<string, number>>({
        'SPDV_NGAN_HANG_FINTECH': 1,
        'THI_TRUONG_NGAN_HANG': 1,
        'THI_TRUONG_FINTECH': 1,
        'UNCLASSIFIED': 1
    })
    const itemsPerTopicPage = 5 // 5 items per page for each topic group

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

    // Persist workflow state to localStorage
    useEffect(() => {
        localStorage.setItem('selectNews_currentStep', currentStep)
        localStorage.setItem('selectNews_confirmedNews', JSON.stringify(confirmedNews))
        localStorage.setItem('selectNews_isProcessing', isProcessing.toString())
        localStorage.setItem('selectNews_jobId', jobId || '')
        localStorage.setItem('selectNews_workflowCompleted', workflowCompleted.toString())
        localStorage.setItem('selectNews_startDateISO', startDateISO)
        localStorage.setItem('selectNews_endDateISO', endDateISO)
    }, [currentStep, confirmedNews, isProcessing, jobId, workflowCompleted, startDateISO, endDateISO])

    // Resume polling if page was refreshed during processing
    useEffect(() => {
        if (isProcessing && jobId && currentStep === 'next') {
            console.log('Resuming polling for job:', jobId)
            startPolling(jobId)
        }
    }, []) // Run only once on mount

    // NOTE: Removed auto-navigate to summary - now user must click "Xem báo cáo" button
    // This allows user to see success message and choose between viewing report or reselecting

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

    // State for sorted categories
    const [sortedCategories, setSortedCategories] = useState<string[]>([])

    // Cache for AI-sorted categories (key: JSON string of categories, value: sorted array)
    const sortCacheRef = useRef<Map<string, string[]>>(new Map())

    // Previous categories to detect changes
    const prevCategoriesRef = useRef<string>('')

    // Clear cache on component mount (page reload) để sort lại categories
    useEffect(() => {
        // Cleanup: Clear cache khi component unmount
        return () => {
            sortCacheRef.current.clear()
            prevCategoriesRef.current = ''
            console.log('🗑️ Cleared category sort cache on unmount')
        }
    }, [])

    // Sort categories using Gemini API (with caching)
    useEffect(() => {
        const sortCategories = async () => {
            if (availableCategories.length === 0) {
                setSortedCategories([])
                return
            }

            // If only 1 category, no need to sort
            if (availableCategories.length === 1) {
                setSortedCategories(availableCategories)
                return
            }

            // Create cache key from sorted category list (for consistent comparison)
            const cacheKey = JSON.stringify([...availableCategories].sort())

            // Check if categories actually changed
            if (prevCategoriesRef.current === cacheKey) {
                // No change, keep current sorted categories
                return
            }

            // Check cache first
            if (sortCacheRef.current.has(cacheKey)) {
                console.log('📦 Using cached sorted categories')
                const cachedResult = sortCacheRef.current.get(cacheKey)!
                setSortedCategories(cachedResult)
                prevCategoriesRef.current = cacheKey
                return
            }

            try {
                const apiKey = import.meta.env.VITE_GEMINI_API_KEY
                if (!apiKey) {
                    console.warn('VITE_GEMINI_API_KEY not found, using original order')
                    setSortedCategories(availableCategories)
                    prevCategoriesRef.current = cacheKey
                    return
                }

                console.log('🤖 Sorting categories with AI Gemini...')
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`

                const prompt = `Role: Bạn là một Chuyên gia Phân tích Chiến lược Ngân hàng & Fintech.

Task: Sắp xếp lại danh sách các category đầu vào theo thứ tự ưu tiên giảm dần (từ quan trọng nhất đến ít quan trọng nhất).

Priority Logic (Hệ tư duy sắp xếp):

Tier 1 - Thị trường & Thương hiệu (Market & Brand Health): Ưu tiên cao nhất cho các thông tin liên quan trực tiếp đến Sản phẩm/Dịch vụ, Ưu đãi, và Sức khỏe thương hiệu (các bài đăng tương tác MXH về HDBank, Vikki, và Đối thủ cạnh tranh).

Tier 2 - Vĩ mô & Ngành liên quan (Macro): Tin tức kinh tế vĩ mô, chính sách, nghị định và văn bản pháp luật.

Tier 3 - Công nghệ & Đổi mới (Tech & Innovation): Tiếp theo là các xu hướng về Ứng dụng Công nghệ, Fintech, và Trí tuệ nhân tạo (AI) trong tài chính ngân hàng.

Tier 4 - Khách hàng & Xã hội & Ecosystem (Consumer Context): Xu hướng tiêu dùng, Đời sống, Việc làm, Sức khỏe, Giáo dục, và các ngành trong hệ sinh thái liên kết (Hàng không).

Tier 5 - Thông tin bổ trợ: Giải trí, Du lịch chung, Bất động sản, null.

Input Categories: ${JSON.stringify(availableCategories)}

Output Format: Trả về kết quả duy nhất là một JSON Array chứa các tên category đã được sắp xếp. Loại bỏ các giá trị null hoặc rỗng. CHỈ TRẢ VỀ JSON ARRAY, KHÔNG CÓ TEXT GIẢI THÍCH KHÁC.`

                const response = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: prompt }]
                        }]
                    })
                })

                const result = await response.json()

                if (result.candidates && result.candidates[0]) {
                    const text = result.candidates[0].content.parts[0].text

                    // Extract JSON array from response
                    const jsonMatch = text.match(/\[[\s\S]*\]/)
                    if (jsonMatch) {
                        const sorted = JSON.parse(jsonMatch[0])
                        const filteredSorted = sorted.filter((cat: string) => cat && availableCategories.includes(cat))

                        // Save to cache
                        sortCacheRef.current.set(cacheKey, filteredSorted)
                        setSortedCategories(filteredSorted)
                        console.log('✅ Categories sorted and cached successfully')
                    } else {
                        // Fallback to original order if parsing fails
                        setSortedCategories(availableCategories)
                    }
                } else {
                    setSortedCategories(availableCategories)
                }

                prevCategoriesRef.current = cacheKey
            } catch (error) {
                console.error('Error sorting categories:', error)
                // Fallback to original order on error
                setSortedCategories(availableCategories)
                prevCategoriesRef.current = cacheKey
            }
        }

        sortCategories()
    }, [availableCategories])

    // Trigger n8n workflow
    const handleTriggerWorkflow = async () => {
        // Validate that all selected news have topic_classification
        const newsWithoutTopic = confirmedNews.filter((item: NewsItem) => !item.topic_classification)

        if (newsWithoutTopic.length > 0) {
            alert(
                `Bạn có ${newsWithoutTopic.length} tin tức đã chọn chưa được phân loại!\n\n` +
                `Bạn cần chọn một trong ba chủ đề:\n` +
                `• Sản phẩm dịch vụ\n` +
                `• Tin tức ngân hàng\n` +
                `• Tin tức fintech\n\n` +
                `Nhấp "Quay lại" để phân loại các tin tức chưa có chủ đề.`
            )
            return // Stop execution if validation fails
        }

        try {
            setIsProcessing(true)
            setWorkflowCompleted(false)

            // Calculate endDate + 1 day for webhook (but keep original endDateISO for report)
            const endDateObj = new Date(endDateISO)
            endDateObj.setDate(endDateObj.getDate() + 1)
            const endDateForWebhook = endDateObj.toISOString().split('T')[0] // Format: YYYY-MM-DD

            const response = await fetch(apiEndpoint('api/n8n/trigger-workflow'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: startDateISO,
                    endDate: endDateForWebhook // Send endDate + 1 day to webhook
                })
            })

            const data = await response.json()
            setJobId(data.jobId)

            // Start global notification monitoring (works across all pages)
            startMonitoringWorkflow(data.jobId)

            // Start polling for job status (for current page)
            startPolling(data.jobId)
        } catch (error) {
            console.error('Error triggering workflow:', error)
            alert('Có lỗi xảy ra khi khởi chạy workflow!')
            setIsProcessing(false)
        }
    }

    // Poll job status
    const startPolling = (jobId: string) => {
        const intervalId = setInterval(async () => {
            try {
                const response = await fetch(apiEndpoint(`api/n8n/job/${jobId}`))
                const job = await response.json()

                if (job.status === 'completed') {
                    clearInterval(intervalId)
                    setIsProcessing(false)
                    setWorkflowCompleted(true)
                } else if (job.status === 'failed') {
                    clearInterval(intervalId)
                    setIsProcessing(false)
                    alert('Workflow thất bại! Vui lòng thử lại.')
                }
            } catch (error) {
                console.error('Error polling job status:', error)
            }
        }, 3000) // Poll every 3 seconds

        // Store interval ID to clean up later
        return intervalId
    }

    // Reset to selection step (only reset state, not database)
    const handleResetToSelection = () => {
        setCurrentStep('selection')
        setIsProcessing(false)
        setWorkflowCompleted(false)
        setJobId(null)
        setConfirmedNews([])
        setConfirmedPriorities({})
        setTempPriorities({})

        // Stop global notification monitoring
        stopMonitoringWorkflow()

        // Clear localStorage
        localStorage.removeItem('selectNews_currentStep')
        localStorage.removeItem('selectNews_confirmedNews')
        localStorage.removeItem('selectNews_isProcessing')
        localStorage.removeItem('selectNews_jobId')
        localStorage.removeItem('selectNews_workflowCompleted')
        localStorage.removeItem('selectNews_startDateISO')
        localStorage.removeItem('selectNews_endDateISO')
    }

    // Handle report confirmed: Reset to selection step and navigate to HomePage
    const handleReportConfirmed = () => {
        // Clear the saved page number
        localStorage.removeItem('summaryPages_currentPage')
        // Reset to selection step (so when user returns to SelectNews, it's at selection step)
        handleResetToSelection()
        // Navigate to HomePage
        navigate('/')
    }

    // Reset with database cleanup (set all selected = false in ALL 4 collections)
    const handleResetWithDatabaseCleanup = async () => {
        if (window.confirm('Bạn có chắc muốn chọn lại? Tất cả tin tức đã chọn sẽ bị bỏ chọn.')) {
            try {
                // Get all selected items from API
                const response = await fetch(apiEndpoint('api/data/summary-selected'))
                const result = await response.json()

                if (result.success) {
                    // Only reset selected=false for 3 main collections (NOT header_processing)
                    const allItems = [
                        ...result.data.newProducts.map((item: any) => ({ id: item._id, collection: 'new-products' })),
                        ...result.data.marketTrends.map((item: any) => ({ id: item._id, collection: 'market-trends' })),
                        ...result.data.fintechNews.map((item: any) => ({ id: item._id, collection: 'fintech-news' }))
                        // Intentionally exclude headerProcessing to keep selected=true
                    ]

                    // Update all items to selected = false and reportSelected = false
                    await Promise.all(allItems.flatMap(({ id, collection }) => [
                        fetch(apiEndpoint(`api/data/update-field/${collection}/${id}`), {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                field: 'selected',
                                value: false
                            })
                        }),
                        fetch(apiEndpoint(`api/data/update-field/${collection}/${id}`), {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                field: 'reportSelected',
                                value: false
                            })
                        })
                    ]))
                }

                // Clear the saved page number
                localStorage.removeItem('summaryPages_currentPage')
                // Reset state and go back to selection
                handleResetToSelection()
            } catch (error) {
                console.error('Error resetting selections:', error)
                alert('Có lỗi xảy ra khi reset!')
            }
        }
    }

    // Auto-select first category when date changes
    useMemo(() => {
        const categoriesToUse = sortedCategories.length > 0 ? sortedCategories : availableCategories
        if (categoriesToUse.length > 0 && !categoriesToUse.includes(selectedCategory) && !isPriorityView) {
            setSelectedCategory(categoriesToUse[0] as string)
        }
    }, [sortedCategories, availableCategories, selectedCategory, isPriorityView])

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

    // Group news by topic_classification for priority view with pagination per topic
    const groupedByTopic = useMemo(() => {
        if (!isPriorityView) return null;

        const groups: Record<string, NewsItem[]> = {
            'SPDV_NGAN_HANG_FINTECH': [],
            'THI_TRUONG_NGAN_HANG': [],
            'THI_TRUONG_FINTECH': [],
            'UNCLASSIFIED': [] // For items without topic_classification
        };

        // Group all filtered news by topic first
        filteredNews.forEach((item: NewsItem) => {
            const topic = item.topic_classification || 'UNCLASSIFIED';
            if (groups[topic]) {
                groups[topic].push(item);
            } else {
                groups['UNCLASSIFIED'].push(item);
            }
        });

        return groups;
    }, [isPriorityView, filteredNews]);

    // Topic labels
    const topicLabels: Record<string, string> = {
        'SPDV_NGAN_HANG_FINTECH': 'SẢN PHẨM DỊCH VỤ',
        'THI_TRUONG_NGAN_HANG': 'TIN TỨC NGÂN HÀNG',
        'THI_TRUONG_FINTECH': 'TIN TỨC FINTECH',
        'UNCLASSIFIED': 'Chưa phân loại'
    };

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
        // Reset all topic pages to 1 when switching to priority view or changing date
        if (isPriorityView) {
            setTopicPages({
                'SPDV_NGAN_HANG_FINTECH': 1,
                'THI_TRUONG_NGAN_HANG': 1,
                'THI_TRUONG_FINTECH': 1,
                'UNCLASSIFIED': 1
            })
        }
    }, [selectedCategory, isPriorityView, startDateISO, endDateISO])

    // Scroll to top of news list when page changes
    useEffect(() => {
        if (newsListTopRef.current) {
            newsListTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }, [currentPage])

    // Check if there are unsaved changes
    const hasUnsavedChanges = () => {
        if (!isSelectionMode) return false

        const tempKeys = Object.keys(tempPriorities)
        const confirmedKeys = Object.keys(confirmedPriorities)

        // Check if keys are different
        if (tempKeys.length !== confirmedKeys.length) return true

        // Check if values are different
        for (const key of tempKeys) {
            if (tempPriorities[key] !== confirmedPriorities[key]) {
                return true
            }
        }

        return false
    }

    // Prompt user to save changes if there are unsaved changes
    const promptSaveChanges = (): boolean => {
        if (hasUnsavedChanges()) {
            const userChoice = window.confirm(
                'Bạn có thay đổi chưa lưu. Bạn có muốn lưu các thay đổi này không?\n\n' +
                'Nhấn "OK" để lưu thay đổi.\n' +
                'Nhấn "Hủy" để bỏ qua thay đổi.'
            )

            if (userChoice) {
                // User wants to save - trigger update
                handleUpdateSelection()
                return false // Cancel the action until save completes
            } else {
                // User wants to discard changes
                setTempPriorities({ ...confirmedPriorities })
                return true // Continue with the action
            }
        }
        return true // No unsaved changes, continue
    }

    // Xử lý chọn tin tức
    const handleToggleSelectionMode = () => {
        if (isSelectionMode) {
            // Khi bấm "Hủy chọn", luôn reset về trạng thái ban đầu mà không cần confirm
            // Reset tempPriorities về confirmedPriorities (hoàn tác tất cả thay đổi)
            setTempPriorities({ ...confirmedPriorities })
            console.log('✅ Đã hoàn tác tất cả thay đổi chưa lưu')
        }
        setIsSelectionMode(!isSelectionMode)
    }

    const handleCheckboxChange = (id: string) => {
        setTempPriorities(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    const handleTopicClassificationChange = async (id: string, classification: string) => {
        try {
            // Kiểm tra xem tin tức này đã được chọn chưa
            const currentItem = newsData.find(item => item._id === id)
            const needsSelection = currentItem && !currentItem.selected

            // Update topic_classification
            const response = await fetch(`${API_URL}/header-processing/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ topic_classification: classification })
            })

            const result = await response.json()

            if (result.success) {
                // Nếu tin chưa được chọn, tự động chọn luôn
                if (needsSelection) {
                    const selectResponse = await fetch(`${API_URL}/header-processing/${id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ selected: true })
                    })

                    const selectResult = await selectResponse.json()

                    if (selectResult.success) {
                        // Update local state với cả topic_classification và selected
                        setNewsData(prev => prev.map(item =>
                            item._id === id ? { ...item, topic_classification: classification, selected: true } : item
                        ))

                        // Update confirmedPriorities để UI hiển thị badge ngay lập tức
                        setConfirmedPriorities(prev => ({
                            ...prev,
                            [id]: true
                        }))

                        // Nếu đang ở selection mode, cũng update tempPriorities
                        if (isSelectionMode) {
                            setTempPriorities(prev => ({
                                ...prev,
                                [id]: true
                            }))
                        }

                        console.log('✅ Đã chọn phân loại và tự động chọn tin tức')
                    } else {
                        // Chỉ update topic_classification nếu không set được selected
                        setNewsData(prev => prev.map(item =>
                            item._id === id ? { ...item, topic_classification: classification } : item
                        ))
                    }
                } else {
                    // Tin đã được chọn rồi, chỉ update topic_classification
                    setNewsData(prev => prev.map(item =>
                        item._id === id ? { ...item, topic_classification: classification } : item
                    ))
                    console.log('✅ Đã cập nhật phân loại (tin đã được chọn từ trước)')
                }
            } else {
                alert('Lỗi khi cập nhật phân loại: ' + result.message)
            }
        } catch (error) {
            console.error('Error updating topic classification:', error)
            alert('Có lỗi xảy ra khi cập nhật phân loại')
        }
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
                            {/* 📊  */}
                            Bảng tin sản phẩm dịch vụ và tin tức thị trường ngân hàng & Fintech
                        </h1>
                        {/* <p style={{ margin: '8px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
                            Tóm tắt {confirmedNews.length} tin tức ưu tiên
                        </p> */}
                    </div>

                    {/* Content area for summary step - Now with 4-page pagination */}
                    <SummaryPagesWrapper
                        onResetWithCleanup={handleResetWithDatabaseCleanup}
                        onReportConfirmed={handleReportConfirmed}
                        startDateISO={startDateISO}
                        endDateISO={endDateISO}
                        confirmedNewsCount={confirmedNews.length}
                    />
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

                            {/* Button to proceed to summary */}
                            <div style={{
                                marginTop: '32px',
                                display: 'flex',
                                justifyContent: 'center',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '16px'
                            }}>
                                {!isProcessing && !workflowCompleted && (
                                    <button
                                        onClick={handleTriggerWorkflow}
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
                                        📊 Tóm tắt
                                    </button>
                                )}

                                {isProcessing && (
                                    <div style={{
                                        padding: '20px',
                                        backgroundColor: '#fff3cd',
                                        border: '2px solid #ffc107',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        maxWidth: '400px'
                                    }}>
                                        <div style={{ marginBottom: '12px', fontSize: '32px' }}>⏳</div>
                                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#856404', marginBottom: '8px' }}>
                                            Đang xử lý...
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#856404' }}>
                                            Hệ thống đang tóm tắt tin tức. Vui lòng chờ trong giây lát.
                                        </div>
                                        {jobId && (
                                            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                                                Job ID: {jobId}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {workflowCompleted && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '20px'
                                    }}>
                                        {/* Success Message */}
                                        <div style={{
                                            padding: '24px 32px',
                                            backgroundColor: '#d4edda',
                                            border: '2px solid #28a745',
                                            borderRadius: '12px',
                                            textAlign: 'center',
                                            maxWidth: '500px',
                                            boxShadow: '0 4px 12px rgba(40, 167, 69, 0.2)'
                                        }}>
                                            <div style={{ marginBottom: '12px', fontSize: '48px' }}>✅</div>
                                            <div style={{

                                                fontWeight: '700',                                                fontSize: '20px',
                                                color: '#155724',
                                                marginBottom: '8px'
                                            }}>
                                                Tóm tắt thành công!
                                            </div>
                                            <div style={{ fontSize: '15px', color: '#155724', lineHeight: '1.5' }}>
                                                Hệ thống đã hoàn tất việc tóm tắt tin tức.<br/>
                                                Bạn có thể xem báo cáo hoặc chọn lại tin tức.
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button
                                                onClick={() => setCurrentStep('summary')}
                                                style={{
                                                    padding: '14px 40px',
                                                    backgroundColor: '#28a745',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
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
                                                📊 Xem báo cáo
                                            </button>
                                            <button
                                                onClick={handleResetWithDatabaseCleanup}
                                                style={{
                                                    padding: '14px 40px',
                                                    backgroundColor: '#6c757d',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: '0 2px 8px rgba(108, 117, 125, 0.3)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#5a6268'
                                                    e.currentTarget.style.transform = 'translateY(-2px)'
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.4)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#6c757d'
                                                    e.currentTarget.style.transform = 'translateY(0)'
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(108, 117, 125, 0.3)'
                                                }}
                                            >
                                                🔄 Chọn lại
                                            </button>
                                        </div>
                                    </div>
                                )}
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
                                onChange={(e) => {
                                    if (promptSaveChanges()) {
                                        setStartDateISO(e.target.value)
                                    }
                                }}
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
                                onChange={(e) => {
                                    if (promptSaveChanges()) {
                                        setEndDateISO(e.target.value)
                                    }
                                }}
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
                                    if (promptSaveChanges()) {
                                        setIsPriorityView(true)
                                        setSelectedCategory('')
                                    }
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
                                    Tin đã chọn
                                </span>
                                {/* get total number priority news */}
                                {/* <span className='stat-value' style={{ color: isPriorityView ? '#ffffff' : '#F00020' }}>{getPriorityCount()}</span> */}
                            </div>

                            {/* Separator */}
                            <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px -12px 8px -12px' }}></div>

                            {/* Category list */}
                            {(sortedCategories.length > 0 ? sortedCategories : availableCategories).map((category) => {
                                // const count = newsInDateRange.filter((item: NewsItem) => item.category === category).length
                                const isActive = selectedCategory === category && !isPriorityView
                                return (
                                    <div
                                        key={category}
                                        className='stat-item'
                                        onClick={() => {
                                            if (promptSaveChanges()) {
                                                setIsPriorityView(false)
                                                setSelectedCategory(category)
                                            }
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
                                        // Check for unsaved changes first
                                        if (hasUnsavedChanges()) {
                                            alert('Bạn có thay đổi chưa lưu. Vui lòng nhấn "Cập nhật" để lưu thay đổi trước khi xác nhận!')
                                            return
                                        }

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

                        {/* Scroll anchor for pagination */}
                        <div ref={newsListTopRef} style={{ scrollMarginTop: '100px' }}></div>

                        {/* Pagination - Top (only show in non-priority view) */}
                        {!isPriorityView && filteredNews.length > itemsPerPage && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '24px',
                                paddingTop: '16px'
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

                        <div className="news-list">
                            {paginatedNews.length > 0 ? (
                                isPriorityView && groupedByTopic ? (
                                    // Grouped view for Priority News
                                    Object.entries(groupedByTopic).map(([topicKey, items]) => {
                                        // Skip empty groups
                                        if (items.length === 0) return null;

                                        // Pagination for this topic group
                                        const currentTopicPage = topicPages[topicKey] || 1;
                                        const totalTopicPages = Math.ceil(items.length / itemsPerTopicPage);
                                        const startIdx = (currentTopicPage - 1) * itemsPerTopicPage;
                                        const endIdx = startIdx + itemsPerTopicPage;
                                        const paginatedItems = items.slice(startIdx, endIdx);

                                        return (
                                            <div key={topicKey} style={{ marginBottom: '32px' }}>
                                                {/* Topic Section Header */}
                                                <div style={{
                                                    backgroundColor: '#FFD643',
                                                    padding: '12px 16px',
                                                    borderRadius: '8px',
                                                    marginBottom: '16px',
                                                    borderLeft: '4px solid #ffffffff'
                                                }}>
                                                    <h3 style={{
                                                        margin: 0,
                                                        fontSize: '16px',
                                                        fontWeight: '600',
                                                        color: '#2c3e50'
                                                    }}>
                                                        {topicLabels[topicKey]} ({items.length})
                                                    </h3>
                                                </div>

                                                {/* News cards in this topic group */}
                                                {paginatedItems.map((item) => (
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
                                                            {/* Show category header */}
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

                                                            {/* Topic Classification Radio Buttons */}
                                                            <div style={{
                                                                marginTop: '12px',
                                                                paddingTop: '12px',
                                                                borderTop: '1px solid #e9ecef',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '8px'
                                                            }}>
                                                                <label style={{
                                                                    fontSize: '13px',
                                                                    fontWeight: '600',
                                                                    color: '#495057',
                                                                    marginBottom: '4px'
                                                                }}>
                                                                    Phân loại chủ đề:
                                                                </label>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    gap: '16px',
                                                                    flexWrap: 'wrap'
                                                                }}>
                                                                    <label style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '13px',
                                                                        color: '#495057'
                                                                    }}>
                                                                        <input
                                                                            type="radio"
                                                                            name={`topic-${item._id}`}
                                                                            checked={item.topic_classification === 'SPDV_NGAN_HANG_FINTECH'}
                                                                            onChange={() => handleTopicClassificationChange(item._id, 'SPDV_NGAN_HANG_FINTECH')}
                                                                            style={{
                                                                                cursor: 'pointer',
                                                                                width: '16px',
                                                                                height: '16px'
                                                                            }}
                                                                        />
                                                                        <span>Sản phẩm dịch vụ</span>
                                                                    </label>
                                                                    <label style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '13px',
                                                                        color: '#495057'
                                                                    }}>
                                                                        <input
                                                                            type="radio"
                                                                            name={`topic-${item._id}`}
                                                                            checked={item.topic_classification === 'THI_TRUONG_NGAN_HANG'}
                                                                            onChange={() => handleTopicClassificationChange(item._id, 'THI_TRUONG_NGAN_HANG')}
                                                                            style={{
                                                                                cursor: 'pointer',
                                                                                width: '16px',
                                                                                height: '16px'
                                                                            }}
                                                                        />
                                                                        <span>Tin tức ngân hàng</span>
                                                                    </label>
                                                                    <label style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '13px',
                                                                        color: '#495057'
                                                                    }}>
                                                                        <input
                                                                            type="radio"
                                                                            name={`topic-${item._id}`}
                                                                            checked={item.topic_classification === 'THI_TRUONG_FINTECH'}
                                                                            onChange={() => handleTopicClassificationChange(item._id, 'THI_TRUONG_FINTECH')}
                                                                            style={{
                                                                                cursor: 'pointer',
                                                                                width: '16px',
                                                                                height: '16px'
                                                                            }}
                                                                        />
                                                                        <span>Tin tức fintech</span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </article>
                                                ))}

                                                {/* Pagination controls for this topic */}
                                                {totalTopicPages > 1 && (
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        marginTop: '20px',
                                                        paddingBottom: '16px'
                                                    }}>
                                                        <button
                                                            onClick={() => setTopicPages(prev => ({
                                                                ...prev,
                                                                [topicKey]: Math.max(1, currentTopicPage - 1)
                                                            }))}
                                                            disabled={currentTopicPage === 1}
                                                            style={{
                                                                padding: '6px 12px',
                                                                border: '1px solid #dee2e6',
                                                                borderRadius: '6px',
                                                                backgroundColor: currentTopicPage === 1 ? '#f8f9fa' : '#ffffff',
                                                                color: currentTopicPage === 1 ? '#6c757d' : '#495057',
                                                                cursor: currentTopicPage === 1 ? 'not-allowed' : 'pointer',
                                                                fontSize: '14px',
                                                                fontWeight: '500',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                        >
                                                            ← Trước
                                                        </button>

                                                        <span style={{
                                                            padding: '6px 12px',
                                                            fontSize: '14px',
                                                            color: '#495057',
                                                            fontWeight: '500'
                                                        }}>
                                                            Trang {currentTopicPage} / {totalTopicPages}
                                                        </span>

                                                        <button
                                                            onClick={() => setTopicPages(prev => ({
                                                                ...prev,
                                                                [topicKey]: Math.min(totalTopicPages, currentTopicPage + 1)
                                                            }))}
                                                            disabled={currentTopicPage === totalTopicPages}
                                                            style={{
                                                                padding: '6px 12px',
                                                                border: '1px solid #dee2e6',
                                                                borderRadius: '6px',
                                                                backgroundColor: currentTopicPage === totalTopicPages ? '#f8f9fa' : '#ffffff',
                                                                color: currentTopicPage === totalTopicPages ? '#6c757d' : '#495057',
                                                                cursor: currentTopicPage === totalTopicPages ? 'not-allowed' : 'pointer',
                                                                fontSize: '14px',
                                                                fontWeight: '500',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                        >
                                                            Tiếp →
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    // Regular non-grouped view
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

                                            {/* Topic Classification Radio Buttons */}
                                            <div style={{
                                                marginTop: '12px',
                                                paddingTop: '12px',
                                                borderTop: '1px solid #e9ecef',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}>
                                                <label style={{
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    color: '#495057',
                                                    marginBottom: '4px'
                                                }}>
                                                    Phân loại chủ đề:
                                                </label>
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '16px',
                                                    flexWrap: 'wrap'
                                                }}>
                                                    <label style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        color: '#495057'
                                                    }}>
                                                        <input
                                                            type="radio"
                                                            name={`topic-${item._id}`}
                                                            checked={item.topic_classification === 'SPDV_NGAN_HANG_FINTECH'}
                                                            onChange={() => handleTopicClassificationChange(item._id, 'SPDV_NGAN_HANG_FINTECH')}
                                                            style={{
                                                                cursor: 'pointer',
                                                                width: '16px',
                                                                height: '16px'
                                                            }}
                                                        />
                                                        <span>Sản phẩm dịch vụ</span>
                                                    </label>
                                                    <label style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        color: '#495057'
                                                    }}>
                                                        <input
                                                            type="radio"
                                                            name={`topic-${item._id}`}
                                                            checked={item.topic_classification === 'THI_TRUONG_NGAN_HANG'}
                                                            onChange={() => handleTopicClassificationChange(item._id, 'THI_TRUONG_NGAN_HANG')}
                                                            style={{
                                                                cursor: 'pointer',
                                                                width: '16px',
                                                                height: '16px'
                                                            }}
                                                        />
                                                        <span>Tin tức ngân hàng</span>
                                                    </label>
                                                    <label style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        color: '#495057'
                                                    }}>
                                                        <input
                                                            type="radio"
                                                            name={`topic-${item._id}`}
                                                            checked={item.topic_classification === 'THI_TRUONG_FINTECH'}
                                                            onChange={() => handleTopicClassificationChange(item._id, 'THI_TRUONG_FINTECH')}
                                                            style={{
                                                                cursor: 'pointer',
                                                                width: '16px',
                                                                height: '16px'
                                                            }}
                                                        />
                                                        <span>Tin tức fintech</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                    ))
                                )
                            ) : (
                                <div className='no-results'>
                                    <p>Không có tin tức nào trong danh mục này</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination - only show in non-priority view */}
                        {!isPriorityView && filteredNews.length > itemsPerPage && (
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
