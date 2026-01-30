import { useState, useEffect } from 'react'
import { apiEndpoint } from '../config/api'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

// Interface for NewProductService data
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
}

// Interface for BankingMarketTrend data
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
}

// Interface for FintechNews data
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
}

interface SummaryPagesProps {
    onResetWithCleanup: () => Promise<void>
    onReportConfirmed: () => void
    startDateISO: string
    endDateISO: string
    // Page 1 content - existing summary content from parent
    page1Content: React.ReactNode
    // New products data for Page 2
    newProducts: NewProductData[]
    // Banking trends data for Page 3
    bankingTrends: BankingTrendData[]
    // Fintech news data for Page 4
    fintechNews: FintechNewsData[]
}


function SummaryPages({
    onResetWithCleanup,
    onReportConfirmed,
    startDateISO,
    endDateISO,
    page1Content,
    newProducts,
    bankingTrends,
    fintechNews
}: SummaryPagesProps) {
    // Restore current page from localStorage on mount
    const [currentMainPage, setCurrentMainPage] = useState(() => {
        const savedPage = localStorage.getItem('summaryPages_currentPage')
        return savedPage ? parseInt(savedPage) : 1
    })
    // State for editing detail content
    const [editingProductId, setEditingProductId] = useState<string | null>(null)
    const [editingTrendId, setEditingTrendId] = useState<string | null>(null)
    const [editingNewsId, setEditingNewsId] = useState<string | null>(null)
    const [editedContent, setEditedContent] = useState<string>('')
    const [crawlingIds, setCrawlingIds] = useState<Set<string>>(new Set()) // Track which items are being crawled
    const [customCrawlUrls, setCustomCrawlUrls] = useState<Record<string, string>>({}) // Custom URLs for manual crawl
    const [groupImages, setGroupImages] = useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem('summaryPages_groupImages')
            return saved ? JSON.parse(saved) : {}
        } catch {
            return {}
        }
    }) // Store multiple images per group (groupId -> array of image URLs)
    const [uploadingGroupImage, setUploadingGroupImage] = useState<string | null>(null) // Track which group is uploading image
    const [emptyGroupContent, setEmptyGroupContent] = useState<Record<string, string>>(() => {
        try {
            const saved = localStorage.getItem('summaryPages_emptyGroupContent')
            return saved ? JSON.parse(saved) : {}
        } catch {
            return {}
        }
    }) // Store content for empty groups (Tỷ giá, Giá vàng)
    const [emptyGroupSources, setEmptyGroupSources] = useState<Record<string, string>>(() => {
        try {
            const saved = localStorage.getItem('summaryPages_emptyGroupSources')
            return saved ? JSON.parse(saved) : {}
        } catch {
            return {}
        }
    }) // Store source URLs for empty groups
    const [editingEmptyGroup, setEditingEmptyGroup] = useState<string | null>(null) // Track which empty group is being edited
    const [exchangeRateChartData, setExchangeRateChartData] = useState<{
        labels: string[]
        buyRates: number[]
        sellRates: number[]
        currency: string
    } | null>(null) // Store exchange rate chart data

    const [goldPriceChartData, setGoldPriceChartData] = useState<{
        labels: string[]
        buyRates: number[]
        sellRates: number[]
        goldType: string
    } | null>(null) // Store gold price chart data

    const [xauUsdPrice, setXauUsdPrice] = useState<{
        price: string
        change: string
        changePercent: string
        direction: string // 'up' or 'down'
        timestamp: string // Real-time timestamp from investing.com
    } | null>(() => {
        try {
            const saved = localStorage.getItem('summaryPages_xauUsdPrice')
            return saved ? JSON.parse(saved) : null
        } catch {
            return null
        }
    }) // Store XAU/USD price data from investing.com

    // State for responsive design
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)

    // Effect to handle window resize
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth)
        }

        // Set initial width
        handleResize()

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Save current page to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('summaryPages_currentPage', currentMainPage.toString())
    }, [currentMainPage])

    // Save group images to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem('summaryPages_groupImages', JSON.stringify(groupImages))
        } catch (error) {
            console.error('Error saving group images to localStorage:', error)
        }
    }, [groupImages])

    // Save empty group content to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('summaryPages_emptyGroupContent', JSON.stringify(emptyGroupContent))
        } catch (error) {
            console.error('Error saving empty group content to localStorage:', error)
        }
    }, [emptyGroupContent])

    // Save empty group sources to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('summaryPages_emptyGroupSources', JSON.stringify(emptyGroupSources))
        } catch (error) {
            console.error('Error saving empty group sources to localStorage:', error)
        }
    }, [emptyGroupSources])

    // Load exchange rate chart data from localStorage on mount
    useEffect(() => {
        try {
            const savedChartData = localStorage.getItem('summaryPages_exchangeRateChartData')
            if (savedChartData) {
                setExchangeRateChartData(JSON.parse(savedChartData))
            }
        } catch (error) {
            console.error('Error loading exchange rate chart data from localStorage:', error)
        }
    }, [])

    // Save exchange rate chart data to localStorage whenever it changes
    useEffect(() => {
        try {
            if (exchangeRateChartData) {
                localStorage.setItem('summaryPages_exchangeRateChartData', JSON.stringify(exchangeRateChartData))
            }
        } catch (error) {
            console.error('Error saving exchange rate chart data to localStorage:', error)
        }
    }, [exchangeRateChartData])

    // Load gold price chart data from localStorage on mount
    useEffect(() => {
        try {
            const savedChartData = localStorage.getItem('summaryPages_goldPriceChartData')
            if (savedChartData) {
                setGoldPriceChartData(JSON.parse(savedChartData))
            }
        } catch (error) {
            console.error('Error loading gold price chart data from localStorage:', error)
        }
    }, [])

    // Save gold price chart data to localStorage whenever it changes
    useEffect(() => {
        try {
            if (goldPriceChartData) {
                localStorage.setItem('summaryPages_goldPriceChartData', JSON.stringify(goldPriceChartData))
            }
        } catch (error) {
            console.error('Error saving gold price chart data to localStorage:', error)
        }
    }, [goldPriceChartData])

    // Save XAU/USD price data to localStorage whenever it changes
    useEffect(() => {
        try {
            if (xauUsdPrice) {
                localStorage.setItem('summaryPages_xauUsdPrice', JSON.stringify(xauUsdPrice))
            }
        } catch (error) {
            console.error('Error saving XAU/USD price data to localStorage:', error)
        }
    }, [xauUsdPrice])

    // Filter selected items
    const selectedProducts = newProducts.filter(product => product.selected)
    const selectedBankingTrends = bankingTrends.filter(trend => trend.selected)
    const selectedFintechNews = fintechNews.filter(news => news.selected)

    // Helper function to render text with clickable links
    const renderTextWithLinks = (text: string) => {
        if (!text) return null

        // Split text by lines
        const lines = text.split('\n')

        return lines.map((line, lineIndex) => {
            // Check if line contains a URL pattern
            const urlPattern = /(https?:\/\/[^\s]+)/g
            const parts = line.split(urlPattern)

            return (
                <span key={lineIndex}>
                    {parts.map((part, partIndex) => {
                        // Check if this part is a URL
                        if (part.match(urlPattern)) {
                            return (
                                <a
                                    key={partIndex}
                                    href={part}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: '#007bff',
                                        textDecoration: 'underline',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {part}
                                </a>
                            )
                        }
                        return <span key={partIndex}>{part}</span>
                    })}
                    {lineIndex < lines.length - 1 && <br />}
                </span>
            )
        })
    }

    // Handle update detail content for products
    const handleUpdateDetailContent = async (productId: string) => {
        try {
            const response = await fetch(apiEndpoint(`api/data/update-field/new-products/${productId}`), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    field: 'detail_content',
                    value: editedContent
                })
            })

            const result = await response.json()
            if (result.success) {
                alert('Cập nhật thành công!')
                setEditingProductId(null)
                window.location.reload()
            } else {
                alert('Lỗi: ' + result.message)
            }
        } catch (error) {
            console.error('Error updating detail content:', error)
            alert('Có lỗi xảy ra khi cập nhật')
        }
    }

    // Handle update detail content for banking trends
    const handleUpdateBankingTrendContent = async (trendId: string) => {
        try {
            const response = await fetch(apiEndpoint(`api/data/update-field/market-trends/${trendId}`), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    field: 'detail_content',
                    value: editedContent
                })
            })

            const result = await response.json()
            if (result.success) {
                alert('Cập nhật thành công!')
                setEditingTrendId(null)
                window.location.reload()
            } else {
                alert('Lỗi: ' + result.message)
            }
        } catch (error) {
            console.error('Error updating detail content:', error)
            alert('Có lỗi xảy ra khi cập nhật')
        }
    }

    // Handle update detail content for fintech news
    const handleUpdateFintechNewsContent = async (newsId: string) => {
        try {
            const response = await fetch(apiEndpoint(`api/data/update-field/fintech-news/${newsId}`), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    field: 'detail_content',
                    value: editedContent
                })
            })

            const result = await response.json()
            if (result.success) {
                alert('Cập nhật thành công!')
                setEditingNewsId(null)
                window.location.reload()
            } else {
                alert('Lỗi: ' + result.message)
            }
        } catch (error) {
            console.error('Error updating detail content:', error)
            alert('Có lỗi xảy ra khi cập nhật')
        }
    }

    // Auto-crawl content when detail_content is null
    const handleAutoCrawl = async (itemId: string, collection: string) => {
        setCrawlingIds(prev => new Set(prev).add(itemId))

        try {
            const response = await fetch(apiEndpoint(`api/data/crawl-content/${collection}/${itemId}`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const result = await response.json()

            if (result.success) {
                alert(`Crawl thành công! Đã lấy được ${result.data.contentLength} ký tự`)
                window.location.reload()
            } else {
                alert('Lỗi crawl: ' + result.message)
            }
        } catch (error) {
            console.error('Error crawling content:', error)
            alert('Có lỗi xảy ra khi crawl')
        } finally {
            setCrawlingIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(itemId)
                return newSet
            })
        }
    }

    // Validate URL
    const isValidUrl = (url: string): boolean => {
        try {
            const urlObj = new URL(url)
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
        } catch {
            return false
        }
    }

    // Custom crawl with user-provided URL
    const handleCustomCrawl = async (itemId: string, collection: string) => {
        const customUrl = customCrawlUrls[itemId]

        // Validate URL
        if (!customUrl || customUrl.trim() === '') {
            alert('Vui lòng nhập URL để crawl')
            return
        }

        if (!isValidUrl(customUrl)) {
            alert('URL không hợp lệ! Vui lòng nhập URL bắt đầu bằng http:// hoặc https://')
            return
        }

        setCrawlingIds(prev => new Set(prev).add(itemId))

        try {
            const response = await fetch(apiEndpoint(`api/data/crawl-custom/${collection}/${itemId}`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ customUrl })
            })

            const result = await response.json()

            if (result.success) {
                alert(`Crawl thành công! Đã lấy được ${result.data.contentLength} ký tự`)
                window.location.reload()
            } else {
                alert('Lỗi crawl: ' + result.message)
            }
        } catch (error) {
            console.error('Error crawling custom URL:', error)
            alert('Có lỗi xảy ra khi crawl')
        } finally {
            setCrawlingIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(itemId)
                return newSet
            })
        }
    }

    // Handle fetching exchange rate chart for "Tỷ giá"
    const handleFetchExchangeRate = async () => {
        const groupName = "Tỷ giá"
        const groupKey = `${groupName}_empty`
        setCrawlingIds(prev => new Set(prev).add(groupKey))

        try {
            // Execute all 3 requests in parallel
            const [chartResponse, tableResponse, vovResponse] = await Promise.all([
                // 1. Original: Get chart from 24h.com.vn
                fetch(apiEndpoint(`api/data/crawl-exchange-rate`), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }),
                // 2. New: Scrape table from tygiausd.org
                fetch(apiEndpoint(`api/data/scrape-tygiausd-table`), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }),
                // 3. New: Extract VOV article with Gemini
                fetch(apiEndpoint(`api/data/extract-vov-exchange-rate`), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        date: new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })
                    })
                })
            ])

            const chartResult = await chartResponse.json()
            const tableResult = await tableResponse.json()
            const vovResult = await vovResponse.json()

            // Process chart data (original logic)
            if (chartResult.success) {
                // Store the chart data for rendering
                if (chartResult.data.chartData) {
                    setExchangeRateChartData(chartResult.data.chartData)
                }

                // Store the screenshot in gallery images for "Thêm ảnh" section
                if (chartResult.data.screenshot) {
                    const imageKey = `page3-${groupName}` // Use page3 prefix for Page 3
                    setGroupImages(prev => {
                        const existing = prev[imageKey] || []
                        // Add screenshot if not already exists
                        if (!existing.includes(chartResult.data.screenshot)) {
                            return {
                                ...prev,
                                [imageKey]: [...existing, chartResult.data.screenshot]
                            }
                        }
                        return prev
                    })
                }

                // Store the source URL
                setEmptyGroupSources(prev => ({
                    ...prev,
                    [groupName]: chartResult.data.source
                }))
            }

            // Build text content from table and VOV article
            let textContent = ''

            // Add table data
            if (tableResult.success && tableResult.data.formattedText) {
                textContent += tableResult.data.formattedText + '\n\n'
            }

            // Add VOV article content
            if (vovResult.success && vovResult.data.content) {
                textContent += '📰 Bài viết từ VOV:\n\n' + vovResult.data.content
            }

            // Step 4: Call Gemini to summarize all data
            if (chartResult.success && tableResult.success && vovResult.success) {
                try {
                    // Prepare data for summary
                    const firstTableRow = tableResult.data.rows && tableResult.data.rows.length > 0 ? tableResult.data.rows[0] : null

                    if (firstTableRow && chartResult.data.chartData) {
                        const summaryResponse = await fetch(apiEndpoint(`api/data/summarize-exchange-rate`), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                centralRateText: vovResult.data.content,
                                chartData: chartResult.data.chartData,
                                freeMarketData: {
                                    buyPrice: firstTableRow.buy.price,
                                    buyChange: firstTableRow.buy.change,
                                    sellPrice: firstTableRow.sell.price,
                                    sellChange: firstTableRow.sell.change
                                }
                            })
                        })

                        const summaryResult = await summaryResponse.json()

                        if (summaryResult.success && summaryResult.data.summary) {
                            textContent += '\n\n📝 Nhận xét:\n\n' + summaryResult.data.summary
                        }
                    }
                } catch (summaryError) {
                    console.error('Error generating summary:', summaryError)
                    // Continue without summary
                }
            }

            // Store the combined text content
            if (textContent) {
                setEmptyGroupContent(prev => ({
                    ...prev,
                    [groupName]: textContent.trim()
                }))
            }

            alert('Đã lấy tỷ giá USD thành công!')
        } catch (error) {
            console.error('Error fetching exchange rate:', error)
            alert('Có lỗi xảy ra khi lấy tỷ giá')
        } finally {
            setCrawlingIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(groupKey)
                return newSet
            })
        }
    }

    // Handle fetching gold price chart for "Giá vàng"
    const handleFetchGoldPrice = async () => {
        const groupName = "Giá vàng"
        const groupKey = `${groupName}_empty`
        setCrawlingIds(prev => new Set(prev).add(groupKey))

        try {
            const response = await fetch(apiEndpoint(`api/data/crawl-gold-price`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const result = await response.json()

            if (result.success) {
                // Store the chart data for rendering
                if (result.data.chartData) {
                    setGoldPriceChartData(result.data.chartData)
                }

                // Store XAU/USD price data
                if (result.data.xauUsdPrice) {
                    setXauUsdPrice(result.data.xauUsdPrice)
                }

                // Store the screenshot in gallery images for "Thêm ảnh" section
                if (result.data.screenshot) {
                    const imageKey = `page3-${groupName}` // Use page3 prefix for Page 3
                    setGroupImages(prev => {
                        const existing = prev[imageKey] || []
                        // Add screenshot if not already exists
                        if (!existing.includes(result.data.screenshot)) {
                            return {
                                ...prev,
                                [imageKey]: [...existing, result.data.screenshot]
                            }
                        }
                        return prev
                    })
                }

                // Store the source URL
                setEmptyGroupSources(prev => ({
                    ...prev,
                    [groupName]: result.data.source
                }))

                // Call AI to summarize gold price data
                if (result.data.xauUsdPrice && result.data.chartData) {
                    try {
                        console.log('🤖 Calling AI to summarize gold price data...')
                        const summaryResponse = await fetch(apiEndpoint(`api/data/summarize-gold-price`), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                xauUsdData: result.data.xauUsdPrice,
                                chartData: result.data.chartData
                            })
                        })

                        const summaryResult = await summaryResponse.json()
                        if (summaryResult.success && summaryResult.data.summary) {
                            setEmptyGroupContent(prev => ({
                                ...prev,
                                [groupName]: summaryResult.data.summary
                            }))
                            console.log('✅ AI summary for gold price generated successfully')
                        } else {
                            console.warn('⚠️ AI summary failed:', summaryResult.message)
                        }
                    } catch (summaryError) {
                        console.error('⚠️ Error generating AI summary for gold price (non-critical):', summaryError)
                    }
                }

                alert('Đã lấy giá vàng thành công!')
            } else {
                alert('Lỗi lấy giá vàng: ' + result.message)
            }
        } catch (error) {
            console.error('Error fetching gold price:', error)
            alert('Có lỗi xảy ra khi lấy giá vàng')
        } finally {
            setCrawlingIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(groupKey)
                return newSet
            })
        }
    }

    // Handle temporary crawl for empty groups (Giá vàng and others)
    const handleTemporaryCrawl = async (groupName: string) => {
        const customUrl = customCrawlUrls[`${groupName}_empty`]

        // Validate URL
        if (!customUrl || customUrl.trim() === '') {
            alert('Vui lòng nhập URL để crawl')
            return
        }

        if (!isValidUrl(customUrl)) {
            alert('URL không hợp lệ! Vui lòng nhập URL bắt đầu bằng http:// hoặc https://')
            return
        }

        const groupKey = `${groupName}_empty`
        setCrawlingIds(prev => new Set(prev).add(groupKey))

        try {
            const response = await fetch(apiEndpoint(`api/data/crawl-temporary`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: customUrl,
                    title: groupName
                })
            })

            const result = await response.json()

            if (result.success) {
                // Store the crawled content in emptyGroupContent state (without source prefix)
                setEmptyGroupContent(prev => ({
                    ...prev,
                    [groupName]: result.data.content
                }))

                // Store the source URL separately
                setEmptyGroupSources(prev => ({
                    ...prev,
                    [groupName]: result.data.source
                }))

                alert(`Crawl thành công cho ${groupName}!\nĐã lấy được ${result.data.content.length} ký tự`)

                // Clear the URL input
                setCustomCrawlUrls(prev => {
                    const newUrls = { ...prev }
                    delete newUrls[`${groupName}_empty`]
                    return newUrls
                })
            } else {
                alert('Lỗi crawl: ' + result.message)
            }
        } catch (error) {
            console.error('Error crawling temporary content:', error)
            alert('Có lỗi xảy ra khi crawl')
        } finally {
            setCrawlingIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(groupKey)
                return newSet
            })
        }
    }

    // Handle multiple image upload for group
    const handleGroupImageUpload = async (groupKey: string, files: FileList | File[]) => {
        setUploadingGroupImage(groupKey)

        try {
            // Convert FileList to Array if needed
            const fileArray = Array.from(files)

            // Convert all files to base64
            const base64Images = await Promise.all(
                fileArray.map(file => {
                    return new Promise<string>((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                            resolve(reader.result as string)
                        }
                        reader.onerror = reject
                        reader.readAsDataURL(file)
                    })
                })
            )

            // Add new images to existing images for this group
            setGroupImages(prev => ({
                ...prev,
                [groupKey]: [...(prev[groupKey] || []), ...base64Images]
            }))

        } catch (error) {
            console.error('Error uploading group images:', error)
            alert('Có lỗi xảy ra khi upload ảnh!')
        } finally {
            setUploadingGroupImage(null)
        }
    }

    // Remove image from group
    const handleRemoveGroupImage = (groupKey: string, imageIndex: number) => {
        setGroupImages(prev => ({
            ...prev,
            [groupKey]: prev[groupKey].filter((_, index) => index !== imageIndex)
        }))
    }

    // Render Page Navigation
    const renderPageNavigation = () => (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '2px solid #e9ecef'
        }}>
            {currentMainPage > 1 && (
                <button
                    onClick={() => setCurrentMainPage(currentMainPage - 1)}
                    style={{
                        padding: '12px 32px',
                        backgroundColor: '#FFD643',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fecf27ff'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFD643'
                        e.currentTarget.style.transform = 'translateY(0)'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Trang trước
                </button>
            )}

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '15px',
                fontWeight: '600',
                color: '#2c3e50'
            }}>
                <span>Trang {currentMainPage} / 4</span>
            </div>

            {currentMainPage < 4 && (
                <button
                    onClick={() => setCurrentMainPage(currentMainPage + 1)}
                    style={{
                        padding: '12px 32px',
                        backgroundColor: '#F00020',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#c00018'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#F00020'
                        e.currentTarget.style.transform = 'translateY(0)'
                    }}
                >
                    Trang sau
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            )}
        </div>
    )

    // Render Page 2: Product Table
    const renderPage2ProductTable = () => {
        // Check if there are no selected products
        if (selectedProducts.length === 0) {
            return (
                <div style={{
                    marginBottom: '32px',
                    padding: '40px',
                    textAlign: 'center',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6'
                }}>
                    <p style={{ fontSize: '16px', color: '#6c757d', margin: 0 }}>
                        Không có sản phẩm/dịch vụ nào được chọn.
                    </p>
                    <p style={{ fontSize: '14px', color: '#adb5bd', margin: '8px 0 0 0' }}>
                        Tổng số sản phẩm: {newProducts.length}
                    </p>
                </div>
            )
        }

        // Extract unique banks from selected products
        const uniqueBanks = Array.from(new Set(
            selectedProducts.map(p => Array.isArray(p.bank) ? p.bank.join(', ') : p.bank)
        )).filter(Boolean)

        // Group products by level 1 category (product_segment[0])
        const productsByCategory: Record<string, Array<{
            level2: string
            banks: string[]
            products?: Record<string, Array<{ product_name: string, _id: string }>>
        }>> = {}

        selectedProducts.forEach(product => {
            if (product.product_segment && product.product_segment.length >= 2) {
                const level1 = product.product_segment[0]
                const level2 = product.product_segment[1]
                const bankName = Array.isArray(product.bank) ? product.bank.join(', ') : product.bank

                if (!productsByCategory[level1]) {
                    productsByCategory[level1] = []
                }

                // Check if level2 already exists in this category
                const existingLevel2 = productsByCategory[level1].find(item => item.level2 === level2)
                if (existingLevel2) {
                    if (!existingLevel2.banks.includes(bankName)) {
                        existingLevel2.banks.push(bankName)
                    }
                    // Add product info for this bank
                    if (!existingLevel2.products) {
                        existingLevel2.products = {}
                    }
                    if (!existingLevel2.products[bankName]) {
                        existingLevel2.products[bankName] = []
                    }
                    existingLevel2.products[bankName].push({
                        product_name: product.product_name,
                        _id: product._id
                    })
                } else {
                    productsByCategory[level1].push({
                        level2,
                        banks: [bankName],
                        products: {
                            [bankName]: [{
                                product_name: product.product_name,
                                _id: product._id
                            }]
                        }
                    })
                }
            }
        })

        return (
            <div style={{ marginBottom: '32px' }}>
                {/* Product Comparison Table - Responsive with scaling */}
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
                                {uniqueBanks.map(bank => (
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
                            {Object.entries(productsByCategory).map(([level1, level2Items], catIndex) => (
                                <>
                                    {/* Level 1 Row */}
                                    <tr key={`cat-${catIndex}`} style={{ backgroundColor: '#FFF9E6' }}>
                                        <td colSpan={uniqueBanks.length + 1} style={{
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
                                            {uniqueBanks.map(bank => {
                                                const hasProduct = item.banks.includes(bank)
                                                const productNames = hasProduct && item.products?.[bank]
                                                    ? item.products[bank].map(p => p.product_name).join('\n')
                                                    : ''

                                                return (
                                                    <td key={bank} style={{
                                                        padding: windowWidth < 640 ? '8px 4px' : windowWidth < 768 ? '10px 8px' : '12px 16px',
                                                        textAlign: 'center',
                                                        borderRight: '1px solid #dee2e6'
                                                    }}>
                                                        {hasProduct && (
                                                            <span
                                                                title={productNames}
                                                                style={{
                                                                    color: '#28a745',
                                                                    fontSize: windowWidth < 640 ? '16px' : windowWidth < 768 ? '18px' : '20px',
                                                                    fontWeight: 'bold',
                                                                    cursor: 'help'
                                                                }}>✓</span>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
                ) : (
                /* Product Comparison - Mobile Card View */
                <div style={{ marginBottom: '32px' }}>
                    {Object.entries(productsByCategory).map(([level1, level2Items], catIndex) => (
                        <div key={`mobile-cat-${catIndex}`} style={{ marginBottom: '24px' }}>
                            {/* Category Header */}
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

                            {/* Products in this category */}
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

                {/* Summary List */}
                <div style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    padding: windowWidth < 768 ? '16px' : '24px',
                    marginBottom: '32px'
                }}>
                    <h3 style={{
                        fontSize: windowWidth < 768 ? '16px' : '18px',
                        fontWeight: '700',
                        color: '#2c3e50',
                        marginBottom: '16px',
                        borderBottom: '2px solid #F00020',
                        paddingBottom: '8px'
                    }}>
                       Nội dung tóm tắt
                    </h3>
                    <ul style={{
                        margin: 0,
                        paddingLeft: windowWidth < 768 ? '16px' : '20px',
                        color: '#495057',
                        lineHeight: '1.8'
                    }}>
                        {selectedProducts.map((product) => (
                            <li key={product._id} style={{
                                marginBottom: '8px',
                                fontSize: windowWidth < 768 ? '13px' : '14px'
                            }}>
                                {product.description || 'Không có mô tả'}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Content Cards - Display real data with image */}
                {selectedProducts.map((product) => (
                <div key={product._id} style={{
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff'
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: windowWidth < 640 ? '1fr' : '1fr 1fr',
                        borderBottom: '1px solid #dee2e6'
                    }}>
                        <div style={{
                            padding: '16px 20px',
                            fontWeight: '700',
                            fontSize: '14px',
                            color: '#2c3e50',
                            textAlign: 'center',
                            backgroundColor: '#fff3c5ff',
                            borderRight: windowWidth < 640 ? 'none' : '1px solid #dee2e6',
                            borderBottom: windowWidth < 640 ? '1px solid #dee2e6' : 'none'
                        }}>
                            Sản phẩm/Dịch vụ
                        </div>
                        <div style={{
                            padding: '16px 20px',
                            fontWeight: '700',
                            fontSize: '14px',
                            color: '#2c3e50',
                            textAlign: 'center',
                            backgroundColor: '#c4cfffff'
                        }}>
                            {product.product_name}
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
                            justifyContent: 'center',
                            position: 'relative'
                        }}>
                            {product.image ? (
                                <div style={{
                                    width: '100%',
                                    height: windowWidth < 768 ? '250px' : '300px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <img src={product.image} alt={product.product_name}
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
                                <div
                                    style={{
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
                                    }}
                                >
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
                            minHeight: 0
                        }}>
                                    {/* Crawl URL input and buttons */}
                                    <div style={{
                                        marginBottom: '16px',
                                        padding: '12px',
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: '6px',
                                        border: '1px solid #dee2e6'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: windowWidth < 640 ? 'column' : 'row',
                                            gap: '8px',
                                            alignItems: windowWidth < 640 ? 'stretch' : 'center',
                                            marginBottom: '8px'
                                        }}>
                                            <input
                                                type="text"
                                                placeholder="Nhập URL để crawl (http:// hoặc https://)"
                                                value={customCrawlUrls[product._id] || ''}
                                                onChange={(e) => setCustomCrawlUrls({ ...customCrawlUrls, [product._id]: e.target.value })}
                                                disabled={crawlingIds.has(product._id)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    border: '1px solid #ced4da',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    minWidth: windowWidth < 640 ? 'auto' : '200px',
                                                    opacity: crawlingIds.has(product._id) ? 0.6 : 1
                                                }}
                                            />
                                            <div style={{
                                                display: 'flex',
                                                gap: '8px',
                                                flexShrink: 0
                                            }}>
                                                <button
                                                    onClick={() => handleCustomCrawl(product._id, 'new-products')}
                                                    disabled={crawlingIds.has(product._id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: crawlingIds.has(product._id) ? '#adb5bd' : '#007bff',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: crawlingIds.has(product._id) ? 'not-allowed' : 'pointer',
                                                        whiteSpace: 'nowrap',
                                                        flex: windowWidth < 640 ? 1 : 'initial',
                                                        opacity: crawlingIds.has(product._id) ? 0.6 : 1
                                                    }}
                                                >
                                                    {crawlingIds.has(product._id) ? '⏳' : 'Crawl'}
                                                </button>
                                                <button
                                                    onClick={() => handleAutoCrawl(product._id, 'new-products')}
                                                    disabled={crawlingIds.has(product._id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: crawlingIds.has(product._id) ? '#adb5bd' : '#6c757d',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: crawlingIds.has(product._id) ? 'not-allowed' : 'pointer',
                                                        whiteSpace: 'nowrap',
                                                        flex: windowWidth < 640 ? 1 : 'initial',
                                                        opacity: crawlingIds.has(product._id) ? 0.6 : 1
                                                    }}
                                                >
                                                    {crawlingIds.has(product._id) ? '⏳ Đang crawl...' : 'Lấy nội dung gốc'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Editable content area */}
                                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                    {editingProductId === product._id ? (
                                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                            <textarea
                                                value={editedContent}
                                                onChange={(e) => setEditedContent(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    minHeight: '200px',
                                                    padding: '12px',
                                                    border: '1px solid #ced4da',
                                                    borderRadius: '4px',
                                                    fontSize: '14px',
                                                    lineHeight: '1.8',
                                                    fontFamily: 'inherit',
                                                    resize: 'vertical'
                                                }}
                                            />
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                <button
                                                    onClick={() => handleUpdateDetailContent(product._id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: '#28a745',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Lưu
                                                </button>
                                                <button
                                                    onClick={() => setEditingProductId(null)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: '#dc3545',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{
                                                marginBottom: '8px',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                overflowWrap: 'anywhere',
                                                maxHeight: '400px',
                                                overflowY: 'auto',
                                                overflowX: 'auto',
                                                padding: '8px',
                                                backgroundColor: '#f8f9fa',
                                                borderRadius: '4px',
                                                border: '1px solid #dee2e6',
                                                width: '100%',
                                                boxSizing: 'border-box'
                                            }}>
                                                {product.detail_content || 'Chưa có nội dung chi tiết'}
                                            </div>
                                            {product.source_of_detail && (
                                                <div style={{
                                                    marginBottom: '8px',
                                                    padding: '6px 8px',
                                                    backgroundColor: '#e7f3ff',
                                                    borderRadius: '4px',
                                                    border: '1px solid #b3d9ff',
                                                    fontSize: '12px',
                                                    color: '#004085'
                                                }}>
                                                    <strong>Nguồn:</strong>{' '}
                                                    <a
                                                        href={product.source_of_detail}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            color: '#0056b3',
                                                            textDecoration: 'none',
                                                            wordBreak: 'break-all'
                                                        }}
                                                    >
                                                        {product.source_of_detail}
                                                    </a>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setEditingProductId(product._id)
                                                    setEditedContent(product.detail_content || '')
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: '#ffc107',
                                                    color: '#000000',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Chỉnh sửa
                                            </button>
                                        </div>
                                    )}
                                    </div>
                        </div>
                    </div>
                </div>
                ))}
            </div>
        )
    }

    // Render Page 3: Banking Market Trends
    const renderPage3BankingTrends = () => {
        // Group trends by topic_group
        const groupedTrends = selectedBankingTrends.reduce((acc, trend) => {
            const topicGroup = trend.topic_group || 'Khác'
            if (!acc[topicGroup]) {
                acc[topicGroup] = []
            }
            acc[topicGroup].push(trend)
            return acc
        }, {} as Record<string, typeof selectedBankingTrends>)

        // Define the order for topic groups
        const topicOrder = ["Vĩ mô", "CĐS và công nghệ", "Kinh doanh", "Hợp tác", "Pháp lý", "Tỷ giá", "Giá vàng"]

        // Ensure "Tỷ giá" and "Giá vàng" always exist in groupedTrends
        if (!groupedTrends["Tỷ giá"]) {
            groupedTrends["Tỷ giá"] = []
        }
        if (!groupedTrends["Giá vàng"]) {
            groupedTrends["Giá vàng"] = []
        }

        // Sort the groups according to the defined order
        const sortedGroups = Object.entries(groupedTrends).sort(([a], [b]) => {
            const indexA = topicOrder.indexOf(a)
            const indexB = topicOrder.indexOf(b)

            // If both are in the order array, sort by their position
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB
            }
            // If only a is in the order array, it comes first
            if (indexA !== -1) return -1
            // If only b is in the order array, it comes first
            if (indexB !== -1) return 1
            // If neither is in the order array, sort alphabetically
            return a.localeCompare(b)
        })

        return (
            <div style={{ marginBottom: '32px' }}>
                {sortedGroups.map(([topicGroup, trends]) => (
                    <div key={topicGroup} style={{
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
                                {topicGroup}
                            </div>

                            {/* Right column: List of items in this topic group */}
                            <div style={{
                                flex: 1,
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px'
                            }}>
                                {trends.length > 0 ? (
                                    trends.map((trend) => (
                                    <div key={trend._id} style={{
                                        padding: '16px',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '6px',
                                        backgroundColor: '#fafbfc'
                                    }}>
                                        {/* <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#2c3e50' }}>
                                            {trend.title}
                                        </h4> */}

                                    {/* Crawl URL input and buttons */}
                                    <div style={{
                                        marginBottom: '16px',
                                        padding: '12px',
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: '6px',
                                        border: '1px solid #dee2e6'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: windowWidth < 640 ? 'column' : 'row',
                                            gap: '8px',
                                            alignItems: windowWidth < 640 ? 'stretch' : 'center',
                                            marginBottom: '8px'
                                        }}>
                                            <input
                                                type="text"
                                                placeholder="Nhập URL để crawl (http:// hoặc https://)"
                                                value={customCrawlUrls[trend._id] || ''}
                                                onChange={(e) => setCustomCrawlUrls({ ...customCrawlUrls, [trend._id]: e.target.value })}
                                                disabled={crawlingIds.has(trend._id)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    border: '1px solid #ced4da',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    minWidth: windowWidth < 640 ? 'auto' : '200px',
                                                    opacity: crawlingIds.has(trend._id) ? 0.6 : 1
                                                }}
                                            />
                                            <div style={{
                                                display: 'flex',
                                                gap: '8px',
                                                flexShrink: 0
                                            }}>
                                                <button
                                                    onClick={() => handleCustomCrawl(trend._id, 'market-trends')}
                                                    disabled={crawlingIds.has(trend._id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: crawlingIds.has(trend._id) ? '#adb5bd' : '#007bff',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: crawlingIds.has(trend._id) ? 'not-allowed' : 'pointer',
                                                        whiteSpace: 'nowrap',
                                                        flex: windowWidth < 640 ? 1 : 'initial',
                                                        opacity: crawlingIds.has(trend._id) ? 0.6 : 1
                                                    }}
                                                >
                                                    {crawlingIds.has(trend._id) ? '⏳' : 'Crawl'}
                                                </button>
                                                <button
                                                    onClick={() => handleAutoCrawl(trend._id, 'market-trends')}
                                                    disabled={crawlingIds.has(trend._id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: crawlingIds.has(trend._id) ? '#adb5bd' : '#6c757d',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: crawlingIds.has(trend._id) ? 'not-allowed' : 'pointer',
                                                        whiteSpace: 'nowrap',
                                                        flex: windowWidth < 640 ? 1 : 'initial',
                                                        opacity: crawlingIds.has(trend._id) ? 0.6 : 1
                                                    }}
                                                >
                                                    {crawlingIds.has(trend._id) ? '⏳ Đang crawl...' : 'Lấy nội dung gốc'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Editable content area */}
                                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                    {editingTrendId === trend._id ? (
                                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                            <textarea
                                                value={editedContent}
                                                onChange={(e) => setEditedContent(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    minHeight: '200px',
                                                    padding: '12px',
                                                    border: '1px solid #ced4da',
                                                    borderRadius: '4px',
                                                    fontSize: '14px',
                                                    lineHeight: '1.8',
                                                    fontFamily: 'inherit',
                                                    resize: 'vertical'
                                                }}
                                            />
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                <button
                                                    onClick={() => handleUpdateBankingTrendContent(trend._id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: '#28a745',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Lưu
                                                </button>
                                                <button
                                                    onClick={() => setEditingTrendId(null)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: '#dc3545',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{
                                                marginBottom: '8px',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                overflowWrap: 'anywhere',
                                                maxHeight: '400px',
                                                overflowY: 'auto',
                                                overflowX: 'auto',
                                                padding: '8px',
                                                backgroundColor: '#f8f9fa',
                                                borderRadius: '4px',
                                                border: '1px solid #dee2e6',
                                                width: '100%',
                                                boxSizing: 'border-box'
                                            }}>
                                                {trend.detail_content || 'Chưa có nội dung chi tiết'}
                                            </div>
                                            {trend.source_of_detail && (
                                                <div style={{
                                                    marginBottom: '8px',
                                                    padding: '6px 8px',
                                                    backgroundColor: '#e7f3ff',
                                                    borderRadius: '4px',
                                                    border: '1px solid #b3d9ff',
                                                    fontSize: '12px',
                                                    color: '#004085'
                                                }}>
                                                    <strong>Nguồn:</strong>{' '}
                                                    <a
                                                        href={trend.source_of_detail}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            color: '#0056b3',
                                                            textDecoration: 'none',
                                                            wordBreak: 'break-all'
                                                        }}
                                                    >
                                                        {trend.source_of_detail}
                                                    </a>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setEditingTrendId(trend._id)
                                                    setEditedContent(trend.detail_content || '')
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: '#ffc107',
                                                    color: '#000000',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Chỉnh sửa
                                            </button>
                                        </div>
                                    )}
                                    </div>
                                    </div>
                                ))
                                ) : (
                                    // Empty state for Tỷ giá and Giá vàng
                                    <div style={{
                                        padding: '16px',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '6px',
                                        backgroundColor: '#fafbfc'
                                    }}>
                                        {/* Action buttons */}
                                        <div style={{
                                            marginBottom: '16px',
                                            padding: '12px',
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '6px',
                                            border: '1px solid #dee2e6'
                                        }}>
                                            {topicGroup === "Tỷ giá" ? (
                                                // Special button for Tỷ giá
                                                <button
                                                    onClick={handleFetchExchangeRate}
                                                    disabled={crawlingIds.has(`${topicGroup}_empty`)}
                                                    style={{
                                                        padding: '10px 20px',
                                                        backgroundColor: crawlingIds.has(`${topicGroup}_empty`) ? '#6c757d' : '#28a745',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        cursor: crawlingIds.has(`${topicGroup}_empty`) ? 'not-allowed' : 'pointer',
                                                        opacity: crawlingIds.has(`${topicGroup}_empty`) ? 0.7 : 1,
                                                        width: '100%'
                                                    }}
                                                >
                                                    {crawlingIds.has(`${topicGroup}_empty`) ? 'Đang lấy dữ liệu...' : '📊 Lấy tỷ giá'}
                                                </button>
                                            ) : topicGroup === "Giá vàng" ? (
                                                // Special button for Giá vàng
                                                <button
                                                    onClick={handleFetchGoldPrice}
                                                    disabled={crawlingIds.has(`${topicGroup}_empty`)}
                                                    style={{
                                                        padding: '10px 20px',
                                                        backgroundColor: crawlingIds.has(`${topicGroup}_empty`) ? '#6c757d' : '#ffc107',
                                                        color: '#000000',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        cursor: crawlingIds.has(`${topicGroup}_empty`) ? 'not-allowed' : 'pointer',
                                                        opacity: crawlingIds.has(`${topicGroup}_empty`) ? 0.7 : 1,
                                                        width: '100%'
                                                    }}
                                                >
                                                    {crawlingIds.has(`${topicGroup}_empty`) ? 'Đang lấy dữ liệu...' : '💰 Lấy giá vàng'}
                                                </button>
                                            ) : (
                                                // Original input + Crawl button for other groups
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: windowWidth < 640 ? 'column' : 'row',
                                                    gap: '8px',
                                                    alignItems: windowWidth < 640 ? 'stretch' : 'center'
                                                }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Nhập URL để crawl (http:// hoặc https://)"
                                                        value={customCrawlUrls[`${topicGroup}_empty`] || ''}
                                                        onChange={(e) => setCustomCrawlUrls({ ...customCrawlUrls, [`${topicGroup}_empty`]: e.target.value })}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px 12px',
                                                            border: '1px solid #ced4da',
                                                            borderRadius: '4px',
                                                            fontSize: '13px',
                                                            minWidth: windowWidth < 640 ? 'auto' : '200px'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleTemporaryCrawl(topicGroup)}
                                                        disabled={crawlingIds.has(`${topicGroup}_empty`)}
                                                        style={{
                                                            padding: '8px 16px',
                                                            backgroundColor: crawlingIds.has(`${topicGroup}_empty`) ? '#6c757d' : '#007bff',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            cursor: crawlingIds.has(`${topicGroup}_empty`) ? 'not-allowed' : 'pointer',
                                                            whiteSpace: 'nowrap',
                                                            flex: windowWidth < 640 ? 1 : 'initial',
                                                            opacity: crawlingIds.has(`${topicGroup}_empty`) ? 0.7 : 1
                                                        }}
                                                    >
                                                        {crawlingIds.has(`${topicGroup}_empty`) ? 'Đang crawl...' : 'Crawl'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content display area (empty state) */}
                                        <div>
                                            {editingEmptyGroup === topicGroup ? (
                                                // Editing mode
                                                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                                    <textarea
                                                        value={emptyGroupContent[topicGroup] || ''}
                                                        onChange={(e) => setEmptyGroupContent({ ...emptyGroupContent, [topicGroup]: e.target.value })}
                                                        style={{
                                                            width: '100%',
                                                            minHeight: '200px',
                                                            padding: '12px',
                                                            border: '1px solid #ced4da',
                                                            borderRadius: '4px',
                                                            fontSize: '14px',
                                                            lineHeight: '1.8',
                                                            fontFamily: 'inherit',
                                                            resize: 'vertical',
                                                            marginBottom: '8px'
                                                        }}
                                                        placeholder="Nhập nội dung..."
                                                    />
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            onClick={() => setEditingEmptyGroup(null)}
                                                            style={{
                                                                padding: '8px 16px',
                                                                backgroundColor: '#28a745',
                                                                color: '#ffffff',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Lưu
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingEmptyGroup(null)
                                                                // Clear both content and source
                                                                setEmptyGroupContent({ ...emptyGroupContent, [topicGroup]: '' })
                                                                setEmptyGroupSources(prev => {
                                                                    const newSources = { ...prev }
                                                                    delete newSources[topicGroup]
                                                                    return newSources
                                                                })
                                                            }}
                                                            style={{
                                                                padding: '8px 16px',
                                                                backgroundColor: '#dc3545',
                                                                color: '#ffffff',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Hủy
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // Display mode
                                                <div>
                                                    {topicGroup === "Tỷ giá" ? (
                                                        // Two-column layout for Tỷ giá: text left, chart right
                                                        <div style={{
                                                            display: 'flex',
                                                            gap: '16px',
                                                            marginBottom: '8px',
                                                            flexDirection: windowWidth < 768 ? 'column' : 'row'
                                                        }}>
                                                            {/* Left: Text content */}
                                                            <div style={{
                                                                flex: 1,
                                                                whiteSpace: 'pre-wrap',
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'anywhere',
                                                                maxHeight: '400px',
                                                                overflowY: 'auto',
                                                                padding: '12px',
                                                                backgroundColor: '#f8f9fa',
                                                                borderRadius: '4px',
                                                                border: '1px solid #dee2e6',
                                                                color: emptyGroupContent[topicGroup] ? '#495057' : '#adb5bd',
                                                                textAlign: emptyGroupContent[topicGroup] ? 'left' : 'center',
                                                                fontStyle: emptyGroupContent[topicGroup] ? 'normal' : 'italic'
                                                            }}>
                                                                {emptyGroupContent[topicGroup] ? renderTextWithLinks(emptyGroupContent[topicGroup]) : 'Nhấn nút "Chỉnh sửa" để nhập nội dung phân tích tỷ giá.'}
                                                            </div>

                                                            {/* Right: Interactive Chart */}
                                                            <div style={{
                                                                flex: 1,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backgroundColor: '#ffffff',
                                                                borderRadius: '4px',
                                                                border: '1px solid #dee2e6',
                                                                minHeight: '250px',
                                                                padding: '12px'
                                                            }}>
                                                                {exchangeRateChartData && exchangeRateChartData.labels.length > 0 ? (
                                                                    <div style={{ width: '100%', height: '500px' }}>
                                                                        <Line
                                                                            data={{
                                                                                labels: exchangeRateChartData.labels,
                                                                                datasets: [
                                                                                    {
                                                                                        label: 'Mua vào',
                                                                                        data: exchangeRateChartData.buyRates,
                                                                                        borderColor: 'rgb(220, 53, 69)',
                                                                                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                                                                                        tension: 0.4
                                                                                    },
                                                                                    {
                                                                                        label: 'Bán ra',
                                                                                        data: exchangeRateChartData.sellRates,
                                                                                        borderColor: 'rgb(40, 167, 69)',
                                                                                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                                                                                        tension: 0.4
                                                                                    }
                                                                                ]
                                                                            }}
                                                                            options={{
                                                                                responsive: true,
                                                                                maintainAspectRatio: false,
                                                                                plugins: {
                                                                                    legend: {
                                                                                        position: 'top' as const,
                                                                                    },
                                                                                    title: {
                                                                                        display: true,
                                                                                        text: `Biểu đồ tỷ giá ${exchangeRateChartData.currency}`
                                                                                    },
                                                                                    tooltip: {
                                                                                        mode: 'index' as const,
                                                                                        intersect: false
                                                                                    }
                                                                                },
                                                                                scales: {
                                                                                    y: {
                                                                                        beginAtZero: false
                                                                                    }
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div style={{
                                                                        color: '#adb5bd',
                                                                        fontStyle: 'italic',
                                                                        textAlign: 'center'
                                                                    }}>
                                                                        Nhấn "Lấy tỷ giá" để hiển thị biểu đồ
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : topicGroup === "Giá vàng" ? (
                                                        // Two-column layout for Giá vàng: text left, chart right
                                                        <div style={{
                                                            display: 'flex',
                                                            gap: '16px',
                                                            marginBottom: '8px',
                                                            flexDirection: windowWidth < 768 ? 'column' : 'row'
                                                        }}>
                                                            {/* Left: Text content */}
                                                            <div style={{
                                                                flex: 1,
                                                                whiteSpace: 'pre-wrap',
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'anywhere',
                                                                maxHeight: '400px',
                                                                overflowY: 'auto',
                                                                padding: '12px',
                                                                backgroundColor: '#f8f9fa',
                                                                borderRadius: '4px',
                                                                border: '1px solid #dee2e6',
                                                                color: emptyGroupContent[topicGroup] ? '#495057' : '#adb5bd',
                                                                textAlign: emptyGroupContent[topicGroup] ? 'left' : 'center',
                                                                fontStyle: emptyGroupContent[topicGroup] ? 'normal' : 'italic'
                                                            }}>
                                                                {/* XAU/USD Price Display */}
                                                                {xauUsdPrice && (
                                                                    <div style={{
                                                                        marginBottom: emptyGroupContent[topicGroup] ? '12px' : '0',
                                                                        padding: '10px 14px',
                                                                        backgroundColor: '#ffffff',
                                                                        borderRadius: '6px',
                                                                        border: `1px solid ${xauUsdPrice.direction === 'down' ? '#f5c6cb' : '#c3e6cb'}`,
                                                                        fontStyle: 'normal',
                                                                        textAlign: 'left',
                                                                        color: '#495057'
                                                                    }}>
                                                                        <div style={{
                                                                            fontSize: '12px',
                                                                            color: '#6c757d',
                                                                            marginBottom: '4px',
                                                                            fontWeight: 500
                                                                        }}>
                                                                            XAU/USD (Investing.com)
                                                                        </div>
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            alignItems: 'baseline',
                                                                            gap: '10px',
                                                                            flexWrap: 'wrap'
                                                                        }}>
                                                                            <span style={{
                                                                                fontSize: '22px',
                                                                                fontWeight: 700,
                                                                                color: '#212529'
                                                                            }}>
                                                                                {xauUsdPrice.price}
                                                                            </span>
                                                                            <span style={{
                                                                                fontSize: '14px',
                                                                                fontWeight: 600,
                                                                                color: xauUsdPrice.direction === 'down' ? '#dc3545' : '#28a745'
                                                                            }}>
                                                                                {xauUsdPrice.direction === 'down' ? '▼' : '▲'}{' '}
                                                                                {xauUsdPrice.change}{' '}
                                                                                ({xauUsdPrice.changePercent})
                                                                            </span>
                                                                        </div>
                                                                        {xauUsdPrice.timestamp && (
                                                                            <div style={{
                                                                                fontSize: '11px',
                                                                                color: '#868e96',
                                                                                marginTop: '4px'
                                                                            }}>
                                                                                {xauUsdPrice.timestamp}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {emptyGroupContent[topicGroup] || (!xauUsdPrice ? 'Nhấn nút "Chỉnh sửa" để nhập nội dung phân tích giá vàng.' : '')}
                                                            </div>

                                                            {/* Right: Interactive Chart */}
                                                            <div style={{
                                                                flex: 1,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backgroundColor: '#ffffff',
                                                                borderRadius: '4px',
                                                                border: '1px solid #dee2e6',
                                                                minHeight: '250px',
                                                                padding: '12px'
                                                            }}>
                                                                {goldPriceChartData && goldPriceChartData.labels.length > 0 ? (
                                                                    <div style={{ width: '100%', height: '500px' }}>
                                                                        <Line
                                                                            data={{
                                                                                labels: goldPriceChartData.labels,
                                                                                datasets: [
                                                                                    {
                                                                                        label: 'Mua vào',
                                                                                        data: goldPriceChartData.buyRates,
                                                                                        borderColor: 'rgb(255, 193, 7)',
                                                                                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                                                                                        tension: 0.4
                                                                                    },
                                                                                    {
                                                                                        label: 'Bán ra',
                                                                                        data: goldPriceChartData.sellRates,
                                                                                        borderColor: 'rgb(255, 152, 0)',
                                                                                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                                                                        tension: 0.4
                                                                                    }
                                                                                ]
                                                                            }}
                                                                            options={{
                                                                                responsive: true,
                                                                                maintainAspectRatio: false,
                                                                                plugins: {
                                                                                    legend: {
                                                                                        position: 'top' as const,
                                                                                    },
                                                                                    title: {
                                                                                        display: true,
                                                                                        text: `Biểu đồ giá vàng ${goldPriceChartData.goldType}`
                                                                                    },
                                                                                    tooltip: {
                                                                                        mode: 'index' as const,
                                                                                        intersect: false
                                                                                    }
                                                                                },
                                                                                scales: {
                                                                                    y: {
                                                                                        beginAtZero: false
                                                                                    }
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div style={{
                                                                        color: '#adb5bd',
                                                                        fontStyle: 'italic',
                                                                        textAlign: 'center'
                                                                    }}>
                                                                        Nhấn "Lấy giá vàng" để hiển thị biểu đồ
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Original single-column layout for other groups
                                                        <div style={{
                                                            marginBottom: '8px',
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word',
                                                            overflowWrap: 'anywhere',
                                                            maxHeight: '400px',
                                                            overflowY: 'auto',
                                                            overflowX: 'auto',
                                                            padding: '8px',
                                                            backgroundColor: '#f8f9fa',
                                                            borderRadius: '4px',
                                                            border: '1px solid #dee2e6',
                                                            width: '100%',
                                                            boxSizing: 'border-box',
                                                            color: emptyGroupContent[topicGroup] ? '#495057' : '#adb5bd',
                                                            textAlign: emptyGroupContent[topicGroup] ? 'left' : 'center',
                                                            fontStyle: emptyGroupContent[topicGroup] ? 'normal' : 'italic'
                                                        }}>
                                                            {emptyGroupContent[topicGroup] || 'Chưa có nội dung. Vui lòng nhập URL và nhấn Crawl hoặc nhập thủ công.'}
                                                        </div>
                                                    )}
                                                    {/* Display source URL if available */}
                                                    {emptyGroupSources[topicGroup] && (
                                                        <div style={{
                                                            marginBottom: '8px',
                                                            padding: '6px 8px',
                                                            backgroundColor: '#e7f3ff',
                                                            borderRadius: '4px',
                                                            border: '1px solid #b3d9ff',
                                                            fontSize: '12px',
                                                            color: '#004085'
                                                        }}>
                                                            <strong>Nguồn:</strong>{' '}
                                                            <a
                                                                href={emptyGroupSources[topicGroup]}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    color: '#0056b3',
                                                                    textDecoration: 'none',
                                                                    wordBreak: 'break-all'
                                                                }}
                                                            >
                                                                {emptyGroupSources[topicGroup]}
                                                            </a>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => setEditingEmptyGroup(topicGroup)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: '#ffc107',
                                                            color: '#000000',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Chỉnh sửa
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Image Upload Section for this group */}
                                <div style={{
                                    marginTop: '20px',
                                    padding: '16px',
                                    border: '2px dashed #dee2e6',
                                    borderRadius: '8px',
                                    backgroundColor: '#f8f9fa'
                                }}>
                                    <div style={{
                                        marginBottom: '12px',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        color: '#495057'
                                    }}>
                                        Thêm ảnh cho nhóm "{topicGroup}"
                                    </div>

                                    {/* Display uploaded images */}
                                    {groupImages[`page3-${topicGroup}`]?.length > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '12px',
                                            marginBottom: '12px'
                                        }}>
                                            {groupImages[`page3-${topicGroup}`].map((imageUrl, index) => (
                                                <div key={index} style={{
                                                    position: 'relative',
                                                    width: windowWidth < 640 ? 'calc(50% - 6px)' : '150px',
                                                    height: '150px',
                                                    border: '1px solid #dee2e6',
                                                    borderRadius: '6px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <img
                                                        src={imageUrl}
                                                        alt={`Group image ${index + 1}`}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveGroupImage(`page3-${topicGroup}`, index)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '4px',
                                                            right: '4px',
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '50%',
                                                            backgroundColor: 'rgba(220, 53, 69, 0.9)',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '16px',
                                                            fontWeight: 'bold',
                                                            padding: 0
                                                        }}
                                                        title="Xóa ảnh"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Upload area */}
                                    <div
                                        style={{
                                            padding: '24px',
                                            textAlign: 'center',
                                            backgroundColor: '#ffffff',
                                            borderRadius: '6px',
                                            border: '1px solid #ced4da',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onClick={() => {
                                            const input = document.createElement('input')
                                            input.type = 'file'
                                            input.accept = 'image/*'
                                            input.multiple = true
                                            input.onchange = (e) => {
                                                const files = (e.target as HTMLInputElement).files
                                                if (files && files.length > 0) {
                                                    handleGroupImageUpload(`page3-${topicGroup}`, files)
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
                                            e.currentTarget.style.borderColor = '#ced4da'
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault()
                                            e.currentTarget.style.borderColor = '#ced4da'
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                            const files = e.dataTransfer.files
                                            if (files.length > 0) {
                                                handleGroupImageUpload(`page3-${topicGroup}`, files)
                                            }
                                        }}
                                    >
                                        {uploadingGroupImage === `page3-${topicGroup}` ? (
                                            <>
                                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                                                <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                                                    Đang upload ảnh...
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6c757d" strokeWidth="2" style={{ display: 'block', margin: '0 auto 12px' }}>
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                                    <polyline points="21 15 16 10 5 21"/>
                                                </svg>
                                                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#495057', fontWeight: '500' }}>
                                                    Kéo thả nhiều ảnh vào đây
                                                </p>
                                                <p style={{ margin: 0, fontSize: '12px', color: '#adb5bd' }}>
                                                    hoặc click để chọn files
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    // Render Page 4: Fintech News
    const renderPage4FintechNews = () => {
        // Group fintech news by area_affected
        const groupedFintech = selectedFintechNews.reduce((acc, news) => {
            // Handle area_affected as string or array
            let areaAffected: string
            if (Array.isArray(news.area_affected)) {
                // If array, join with comma or take first element
                areaAffected = news.area_affected.length > 0 ? news.area_affected[0] : 'Khác'
            } else {
                areaAffected = news.area_affected || 'Khác'
            }

            if (!acc[areaAffected]) {
                acc[areaAffected] = []
            }
            acc[areaAffected].push(news)
            return acc
        }, {} as Record<string, typeof selectedFintechNews>)

        // Define the order for area_affected: Việt Nam first, then Thế giới
        const areaOrder = ["Việt Nam", "Thế giới"]

        // Sort the groups according to the defined order
        const sortedGroups = Object.entries(groupedFintech).sort(([a], [b]) => {
            const indexA = areaOrder.indexOf(a)
            const indexB = areaOrder.indexOf(b)

            // If both are in the order array, sort by their position
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB
            }
            // If only a is in the order array, it comes first
            if (indexA !== -1) return -1
            // If only b is in the order array, it comes first
            if (indexB !== -1) return 1
            // If neither is in the order array, sort alphabetically
            return a.localeCompare(b)
        })

        return (
            <div style={{ marginBottom: '32px' }}>
                {sortedGroups.map(([areaAffected, newsList]) => (
                    <div key={areaAffected} style={{
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
                                {areaAffected}
                            </div>

                            {/* Right column: List of items in this area */}
                            <div style={{
                                flex: 1,
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px'
                            }}>
                                {newsList.map((news) => (
                                    <div key={news._id} style={{
                                        padding: '16px',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '6px',
                                        backgroundColor: '#fafbfc'
                                    }}>
                                        {/* <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#2c3e50' }}>
                                            {news.title}
                                        </h4> */}

                                    {/* Crawl URL input and buttons */}
                                    <div style={{
                                        marginBottom: '16px',
                                        padding: '12px',
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: '6px',
                                        border: '1px solid #dee2e6'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: windowWidth < 640 ? 'column' : 'row',
                                            gap: '8px',
                                            alignItems: windowWidth < 640 ? 'stretch' : 'center',
                                            marginBottom: '8px'
                                        }}>
                                            <input
                                                type="text"
                                                placeholder="Nhập URL để crawl (http:// hoặc https://)"
                                                value={customCrawlUrls[news._id] || ''}
                                                onChange={(e) => setCustomCrawlUrls({ ...customCrawlUrls, [news._id]: e.target.value })}
                                                disabled={crawlingIds.has(news._id)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    border: '1px solid #ced4da',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    minWidth: windowWidth < 640 ? 'auto' : '200px',
                                                    opacity: crawlingIds.has(news._id) ? 0.6 : 1
                                                }}
                                            />
                                            <div style={{
                                                display: 'flex',
                                                gap: '8px',
                                                flexShrink: 0
                                            }}>
                                                <button
                                                    onClick={() => handleCustomCrawl(news._id, 'fintech-news')}
                                                    disabled={crawlingIds.has(news._id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: crawlingIds.has(news._id) ? '#adb5bd' : '#007bff',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: crawlingIds.has(news._id) ? 'not-allowed' : 'pointer',
                                                        whiteSpace: 'nowrap',
                                                        flex: windowWidth < 640 ? 1 : 'initial',
                                                        opacity: crawlingIds.has(news._id) ? 0.6 : 1
                                                    }}
                                                >
                                                    {crawlingIds.has(news._id) ? '⏳' : 'Crawl'}
                                                </button>
                                                <button
                                                    onClick={() => handleAutoCrawl(news._id, 'fintech-news')}
                                                    disabled={crawlingIds.has(news._id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: crawlingIds.has(news._id) ? '#adb5bd' : '#6c757d',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: crawlingIds.has(news._id) ? 'not-allowed' : 'pointer',
                                                        whiteSpace: 'nowrap',
                                                        flex: windowWidth < 640 ? 1 : 'initial',
                                                        opacity: crawlingIds.has(news._id) ? 0.6 : 1
                                                    }}
                                                >
                                                    {crawlingIds.has(news._id) ? '⏳ Đang crawl...' : 'Lấy nội dung gốc'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Editable content area */}
                                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                    {editingNewsId === news._id ? (
                                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                            <textarea
                                                value={editedContent}
                                                onChange={(e) => setEditedContent(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    minHeight: '200px',
                                                    padding: '12px',
                                                    border: '1px solid #ced4da',
                                                    borderRadius: '4px',
                                                    fontSize: '14px',
                                                    lineHeight: '1.8',
                                                    fontFamily: 'inherit',
                                                    resize: 'vertical'
                                                }}
                                            />
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                <button
                                                    onClick={() => handleUpdateFintechNewsContent(news._id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: '#28a745',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Lưu
                                                </button>
                                                <button
                                                    onClick={() => setEditingNewsId(null)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: '#dc3545',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{
                                                marginBottom: '8px',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                overflowWrap: 'anywhere',
                                                maxHeight: '400px',
                                                overflowY: 'auto',
                                                overflowX: 'auto',
                                                padding: '8px',
                                                backgroundColor: '#f8f9fa',
                                                borderRadius: '4px',
                                                border: '1px solid #dee2e6',
                                                width: '100%',
                                                boxSizing: 'border-box'
                                            }}>
                                                {news.detail_content || 'Chưa có nội dung chi tiết'}
                                            </div>
                                            {news.source_of_detail && (
                                                <div style={{
                                                    marginBottom: '8px',
                                                    padding: '6px 8px',
                                                    backgroundColor: '#e7f3ff',
                                                    borderRadius: '4px',
                                                    border: '1px solid #b3d9ff',
                                                    fontSize: '12px',
                                                    color: '#004085'
                                                }}>
                                                    <strong>Nguồn:</strong>{' '}
                                                    <a
                                                        href={news.source_of_detail}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            color: '#0056b3',
                                                            textDecoration: 'none',
                                                            wordBreak: 'break-all'
                                                        }}
                                                    >
                                                        {news.source_of_detail}
                                                    </a>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setEditingNewsId(news._id)
                                                    setEditedContent(news.detail_content || '')
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: '#ffc107',
                                                    color: '#000000',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Chỉnh sửa
                                            </button>
                                        </div>
                                    )}
                                    </div>
                                    </div>
                                ))}

                                {/* Image Upload Section for this group */}
                                <div style={{
                                    marginTop: '20px',
                                    padding: '16px',
                                    border: '2px dashed #dee2e6',
                                    borderRadius: '8px',
                                    backgroundColor: '#f8f9fa'
                                }}>
                                    <div style={{
                                        marginBottom: '12px',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        color: '#495057'
                                    }}>
                                        Thêm ảnh cho nhóm "{areaAffected}"
                                    </div>

                                    {/* Display uploaded images */}
                                    {groupImages[`page4-${areaAffected}`]?.length > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '12px',
                                            marginBottom: '12px'
                                        }}>
                                            {groupImages[`page4-${areaAffected}`].map((imageUrl, index) => (
                                                <div key={index} style={{
                                                    position: 'relative',
                                                    width: windowWidth < 640 ? 'calc(50% - 6px)' : '150px',
                                                    height: '150px',
                                                    border: '1px solid #dee2e6',
                                                    borderRadius: '6px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <img
                                                        src={imageUrl}
                                                        alt={`Group image ${index + 1}`}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveGroupImage(`page4-${areaAffected}`, index)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '4px',
                                                            right: '4px',
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '50%',
                                                            backgroundColor: 'rgba(220, 53, 69, 0.9)',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '16px',
                                                            fontWeight: 'bold',
                                                            padding: 0
                                                        }}
                                                        title="Xóa ảnh"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Upload area */}
                                    <div
                                        style={{
                                            padding: '24px',
                                            textAlign: 'center',
                                            backgroundColor: '#ffffff',
                                            borderRadius: '6px',
                                            border: '1px solid #ced4da',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onClick={() => {
                                            const input = document.createElement('input')
                                            input.type = 'file'
                                            input.accept = 'image/*'
                                            input.multiple = true
                                            input.onchange = (e) => {
                                                const files = (e.target as HTMLInputElement).files
                                                if (files && files.length > 0) {
                                                    handleGroupImageUpload(`page4-${areaAffected}`, files)
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
                                            e.currentTarget.style.borderColor = '#ced4da'
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault()
                                            e.currentTarget.style.borderColor = '#ced4da'
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                            const files = e.dataTransfer.files
                                            if (files.length > 0) {
                                                handleGroupImageUpload(`page4-${areaAffected}`, files)
                                            }
                                        }}
                                    >
                                        {uploadingGroupImage === `page4-${areaAffected}` ? (
                                            <>
                                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                                                <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                                                    Đang upload ảnh...
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6c757d" strokeWidth="2" style={{ display: 'block', margin: '0 auto 12px' }}>
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                                    <polyline points="21 15 16 10 5 21"/>
                                                </svg>
                                                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#495057', fontWeight: '500' }}>
                                                    Kéo thả nhiều ảnh vào đây
                                                </p>
                                                <p style={{ margin: 0, fontSize: '12px', color: '#adb5bd' }}>
                                                    hoặc click để chọn files
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    // Render Action Buttons (Chọn lại & Xác nhận báo cáo) - only on page 4
    const renderActionButtons = () => (
        <div style={{
            marginTop: '48px',
            paddingTop: '32px',
            borderTop: '2px solid #e9ecef',
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            alignItems: 'center'
        }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button
                    onClick={() => {
                        // Clear all cached data from localStorage when resetting
                        localStorage.removeItem('summaryPages_groupImages')
                        localStorage.removeItem('summaryPages_emptyGroupContent')
                        localStorage.removeItem('summaryPages_emptyGroupSources')
                        localStorage.removeItem('summaryPages_exchangeRateChartData')
                        localStorage.removeItem('summaryPages_goldPriceChartData')
                        localStorage.removeItem('summaryPages_xauUsdPrice')
                        // Reset state
                        setExchangeRateChartData(null)
                        setGoldPriceChartData(null)
                        setXauUsdPrice(null)
                        onResetWithCleanup()
                    }}
                    style={{
                        padding: '16px 40px',
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
                        gap: '10px'
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Chọn lại
                </button>
                <button
                    onClick={async () => {
                        try {
                            // Prepare page3Images - group images by topic_group
                            const page3Images: Record<string, string[]> = {}
                            Object.entries(groupImages).forEach(([key, images]) => {
                                if (key.startsWith('page3-')) {
                                    const topicGroup = key.replace('page3-', '')
                                    page3Images[topicGroup] = images
                                }
                            })

                            // Prepare page4Images - group images by area_affected
                            const page4Images: Record<string, string[]> = {}
                            Object.entries(groupImages).forEach(([key, images]) => {
                                if (key.startsWith('page4-')) {
                                    const areaAffected = key.replace('page4-', '')
                                    page4Images[areaAffected] = images
                                }
                            })

                            // Create report with selected items and images
                            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reports/create`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    startDate: startDateISO,
                                    endDate: endDateISO,
                                    page3Images,
                                    page4Images,
                                    emptyGroupContent
                                })
                            })

                            const result = await response.json()

                            if (result.success) {
                                alert(`Báo cáo đã được tạo thành công!\nTổng số tin: ${result.report.totalItems}\nKhoảng thời gian: ${result.report.dateRange}`)
                                // Clear all cached data from localStorage when report is confirmed
                                localStorage.removeItem('summaryPages_groupImages')
                                localStorage.removeItem('summaryPages_emptyGroupContent')
                                localStorage.removeItem('summaryPages_emptyGroupSources')
                                localStorage.removeItem('summaryPages_exchangeRateChartData')
                                localStorage.removeItem('summaryPages_goldPriceChartData')
                                localStorage.removeItem('summaryPages_xauUsdPrice')
                                // Reset state
                                setExchangeRateChartData(null)
                                setGoldPriceChartData(null)
                                setXauUsdPrice(null)
                                onReportConfirmed()
                            } else {
                                alert('Có lỗi xảy ra khi tạo báo cáo: ' + (result.error || 'Unknown error'))
                            }
                        } catch (error) {
                            console.error('Error creating report:', error)
                            alert('Có lỗi xảy ra khi tạo báo cáo!')
                        }
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
                    Xác nhận báo cáo
                </button>
            </div>
        </div>
    )

    return (
        <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #dee2e6',
            borderRadius: '12px',
            padding: '32px',
            minHeight: '500px'
        }}>
            {/* Page Title */}
            <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#2c3e50',
                marginBottom: '24px',
                paddingBottom: '12px',
                borderBottom: '3px solid #F00020'
            }}>
                {currentMainPage === 1 && '📊 Tổng hợp nhanh tin tức'}
                {currentMainPage === 2 && '🏦 Cập nhật sản phẩm mới và nổi bật các ngân hàng'}
                {currentMainPage === 3 && '📈 Cập nhật tin tức nổi bật của thị trường ngân hàng'}
                {currentMainPage === 4 && '💡 Cập nhật tin tức nổi bật của thị trường Fintech'}
            </h2>

            {/* Page Content */}
            {currentMainPage === 1 && page1Content}
            {currentMainPage === 2 && renderPage2ProductTable()}
            {currentMainPage === 3 && renderPage3BankingTrends()}
            {currentMainPage === 4 && (
                <>
                    {renderPage4FintechNews()}
                    {renderActionButtons()}
                </>
            )}

            {/* Page Navigation - show on all pages */}
            {renderPageNavigation()}
        </div>
    )
}

export default SummaryPages
