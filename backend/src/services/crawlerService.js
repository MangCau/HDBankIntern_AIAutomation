/**
 * Crawler Service - Auto crawl content từ URLs
 * Hỗ trợ 3 loại: SOCIAL (Facebook via Apify), NEED_TEST (Web crawler), WEB_PDF (TODO)
 */

const { chromium } = require('playwright');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Crawl Facebook post content using Apify API
 * @param {string} url - Facebook post URL
 * @returns {Promise<string>} - Post content
 */
async function crawlFacebookPost(url) {
    try {
        console.log('🔵 Crawling Facebook post via Apify:', url);

        const APIFY_API_KEY = process.env.APIFY_API_KEY;
        if (!APIFY_API_KEY) {
            throw new Error('APIFY_API_KEY not found in environment variables');
        }

        // Gọi Apify Actor để crawl Facebook post
        const response = await axios.post(
            `https://api.apify.com/v2/acts/apify~facebook-posts-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
            {
                startUrls: [{ url: url }],
                maxPosts: 1,
                resultsType: 'posts',
                extendOutputFunction: `async ({ data, item, page, request, customData }) => {
                    return item;
                }`,
                customData: {}
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 120000 // 2 minutes timeout
            }
        );

        console.log('📥 Apify response received');

        if (response.data && response.data.length > 0) {
            const post = response.data[0];

            // Trích xuất nội dung từ Facebook post
            let content = '';

            // Lấy text content
            if (post.text) {
                content += post.text + '\n\n';
            }

            // Lấy thêm metadata nếu có
            if (post.postDate) {
                content += `Ngày đăng: ${post.postDate}\n`;
            }

            if (post.authorName) {
                content += `Tác giả: ${post.authorName}\n`;
            }

            // Lấy external links (links đính kèm trong bài)
            if (post.postUrl) {
                content += `\nLink bài đăng: ${post.postUrl}\n`;
            }

            // Lấy external link từ post (nếu có share link hoặc attachment link)
            const externalLinks = [];

            if (post.url && post.url !== post.postUrl) {
                externalLinks.push(post.url);
            }

            if (post.link) {
                externalLinks.push(post.link);
            }

            if (post.externalUrl) {
                externalLinks.push(post.externalUrl);
            }

            // Kiểm tra trong text có URLs không (regex để tìm URLs)
            if (post.text) {
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const textUrls = post.text.match(urlRegex);
                if (textUrls) {
                    externalLinks.push(...textUrls);
                }
            }

            // Remove duplicates
            const uniqueExternalLinks = [...new Set(externalLinks)];

            if (uniqueExternalLinks.length > 0) {
                content += `\n--- External Links ---\n`;
                uniqueExternalLinks.forEach((link, index) => {
                    content += `${index + 1}. ${link}\n`;
                });
            }

            // Lấy image links
            const imageLinks = [];

            // Thumbnail image (thường chứa hình ảnh chính)
            if (post.thumbnail) {
                if (Array.isArray(post.thumbnail)) {
                    imageLinks.push(...post.thumbnail);
                } else if (typeof post.thumbnail === 'string') {
                    imageLinks.push(post.thumbnail);
                }
            }

            if (post.thumbnailImage) {
                if (Array.isArray(post.thumbnailImage)) {
                    imageLinks.push(...post.thumbnailImage);
                } else if (typeof post.thumbnailImage === 'string') {
                    imageLinks.push(post.thumbnailImage);
                }
            }

            if (post.thumbnailUrl) {
                imageLinks.push(post.thumbnailUrl);
            }

            // Images field
            if (post.images) {
                if (Array.isArray(post.images)) {
                    imageLinks.push(...post.images);
                } else if (typeof post.images === 'string') {
                    imageLinks.push(post.images);
                }
            }

            // Image field
            if (post.image) {
                if (Array.isArray(post.image)) {
                    imageLinks.push(...post.image);
                } else if (typeof post.image === 'string') {
                    imageLinks.push(post.image);
                }
            }

            // ImageUrl field
            if (post.imageUrl) {
                imageLinks.push(post.imageUrl);
            }

            // ImageUrls array
            if (post.imageUrls && Array.isArray(post.imageUrls)) {
                imageLinks.push(...post.imageUrls);
            }

            // Media array
            if (post.media && Array.isArray(post.media)) {
                post.media.forEach(mediaItem => {
                    // Lấy thumbnail (luôn có trong media items của Facebook)
                    if (mediaItem.thumbnail) {
                        imageLinks.push(mediaItem.thumbnail);
                    }

                    // // Lấy các URLs khác
                    // if (mediaItem.type === 'photo' || mediaItem.type === 'image' || mediaItem.__typename === 'Photo') {
                    //     if (mediaItem.url) imageLinks.push(mediaItem.url);
                    //     if (mediaItem.src) imageLinks.push(mediaItem.src);
                    // }

                    // // Lấy photo_image.uri nếu có
                    // if (mediaItem.photo_image && mediaItem.photo_image.uri) {
                    //     imageLinks.push(mediaItem.photo_image.uri);
                    // }
                });
            }

            // Remove duplicates
            const uniqueImageLinks = [...new Set(imageLinks)];

            if (uniqueImageLinks.length > 0) {
                content += `\n--- Image Links ---\n`;
                uniqueImageLinks.forEach((imgUrl, index) => {
                    content += `${index + 1}. ${imgUrl}\n`;
                });
            }

            console.log('✅ Facebook content crawled successfully');
            console.log(`📝 Content length: ${content.length} characters`);
            console.log(`🔗 External links found: ${uniqueExternalLinks.length}`);
            console.log(`🖼️  Images found: ${uniqueImageLinks.length}`);

            return content;
        } else {
            throw new Error('No data returned from Apify');
        }

    } catch (error) {
        console.error('❌ Error crawling Facebook:', error.message);
        throw new Error(`Failed to crawl Facebook post: ${error.message}`);
    }
}

/**
 * Crawl website content using Playwright (similar to test_crawler.js)
 * @param {string} url - Website URL
 * @returns {Promise<string>} - Article content
 */
async function crawlWebsiteContent(url) {
    console.log('🌐 Crawling website:', url);

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
            '--disable-web-security',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'vi-VN',
        timezoneId: 'Asia/Ho_Chi_Minh',
        extraHTTPHeaders: {
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
    });

    const page = await context.newPage();

    // Override navigator để bypass detection
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
        window.chrome = { runtime: {} };
    });

    try {
        console.log('⏳ Loading page...');

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log('✅ Page loaded');

        // Đợi Cloudflare challenge nếu có
        await page.waitForTimeout(8000);

        const pageContent = await page.content();
        if (pageContent.includes('Checking your browser') || pageContent.includes('Just a moment')) {
            console.log('⚠️  Cloudflare challenge detected, waiting...');
            await page.waitForTimeout(10000);
        }

        // Scroll để load lazy content
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight / 2);
        });
        await page.waitForTimeout(1000);
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(1000);

        console.log('📝 Extracting content...');

        // Trích xuất nội dung chính
        const articleData = await page.evaluate(() => {
            const cleanText = (text) => {
                if (!text) return '';
                return text.trim().replace(/\s+/g, ' ');
            };

            // Tìm title
            let title = '';
            const titleSelectors = [
                'article h1', 'main h1', '.article-title', '.post-title',
                '.entry-title', '.news-title', 'h1'
            ];
            for (const selector of titleSelectors) {
                const element = document.querySelector(selector);
                if (element && element.innerText.trim().length > 10) {
                    title = cleanText(element.innerText);
                    break;
                }
            }

            // Tìm main content
            let mainContent = '';
            const contentSelectors = [
                'article .content', 'article .article-content', 'article .post-content',
                '[itemprop="articleBody"]', '.article-body', 'article', 'main .content'
            ];

            let contentElement = null;
            for (const selector of contentSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    contentElement = element;
                    break;
                }
            }

            if (contentElement) {
                const clonedContent = contentElement.cloneNode(true);

                // Xóa elements không cần thiết
                const unwantedSelectors = [
                    'script', 'style', 'iframe', 'nav', 'aside', '.advertisement',
                    '.ads', '.ad', '.banner', '.social-share', '.comments', 'form'
                ];

                unwantedSelectors.forEach(selector => {
                    const elements = clonedContent.querySelectorAll(selector);
                    elements.forEach(el => el.remove());
                });

                // Lấy text từ paragraphs và headings
                const paragraphs = Array.from(clonedContent.querySelectorAll('p, h2, h3, h4'));
                mainContent = paragraphs
                    .map(p => cleanText(p.innerText))
                    .filter(text => text.length > 20)
                    .join('\n\n');
            }

            // Fallback nếu không tìm được content
            if (!mainContent || mainContent.length < 100) {
                const allParagraphs = Array.from(document.querySelectorAll('p'));
                mainContent = allParagraphs
                    .map(p => cleanText(p.innerText))
                    .filter(text => text.length > 50)
                    .slice(0, 20)
                    .join('\n\n');
            }

            return { title, mainContent };
        });

        const result = `${articleData.title}\n\n${articleData.mainContent}`;

        console.log('✅ Website content crawled successfully');
        console.log(`📝 Content length: ${result.length} characters`);

        return result;

    } catch (error) {
        console.error('❌ Error crawling website:', error.message);
        throw new Error(`Failed to crawl website: ${error.message}`);
    } finally {
        await browser.close();
    }
}

/**
 * Crawl PDF content from URL using axios and pdf-parse
 * @param {string} url - PDF URL
 * @returns {Promise<string>} - PDF text content
 */
async function crawlPDFContent(url) {
    try {
        console.log('📥 Extracting PDF via Apify:', url);

        const APIFY_API_KEY = process.env.APIFY_API_KEY;
        if (!APIFY_API_KEY) {
            throw new Error('APIFY_API_KEY not found in environment variables');
        }

        // Gọi Apify PDF Text Extractor
        const response = await axios.post(
            `https://api.apify.com/v2/acts/jirimoravcik~pdf-text-extractor/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
            {
                urls: [url],
                performChunking: false
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 120000 // 2 minutes timeout
            }
        );

        console.log('📥 Apify PDF response received');

        if (!response.data || response.data.length === 0) {
            throw new Error('No data extracted from PDF');
        }

        const pdfResult = response.data[0];

        let content = '';

        // Nội dung PDF
        content += `--- Nội dung PDF ---\n\n`;
        content += pdfResult.text || 'Không thể trích xuất nội dung';

        content += `\n\n--- Thông tin PDF ---\n`;
        content += `Nguồn: ${pdfResult.url || url}\n`;
        content += `Độ dài: ${pdfResult.text ? pdfResult.text.length : 0} ký tự\n`;

        console.log('✅ PDF Extract done!');
        console.log(`📝 Content length: ${pdfResult.text ? pdfResult.text.length : 0} characters`);

        return content;

    } catch (err) {
        console.error('❌ Lỗi extract PDF:', err.message);
        if (err.response?.data) {
            console.error('API Error:', err.response.data);
        }
        throw new Error(`Không thể crawl PDF: ${err.message}`);
    }
}

/**
 * Summarize content using Gemini AI
 * @param {string} content - Content to summarize
 * @returns {Promise<string>} - Summarized content
 */
async function summarizeWithGemini(content) {
    try {
        console.log('🤖 Starting AI summarization with Gemini Pro...');

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not found in environment variables');
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });

        const prompt = `Bạn là chuyên gia thuyết trình và báo cáo sản phẩm, tin tức ngành ngân hàng và fintech nói chung.
 
Bạn cần tóm tắt toàn bộ nội dung tài liệu, trình bày các ý chính của từng phần theo từng chủ đề hoặc sản phẩm để báo cáo. Không tạo ra thông tin mới mà hoàn toàn vào nội dung input để tóm tắt.
 
Đối với mỗi sản phẩm, dịch vụ hoặc chương trình, hãy nêu rõ đặc điểm nổi bật, điều kiện tham gia, giá trị ưu đãi, thời gian áp dụng, đối tượng hưởng lợi và ý nghĩa đối với khách hàng hoặc ngành. Không tạo ra thông tin mới mà hoàn toàn vào nội dung input. Đối với tin tức thị trường ngân hàng, tin tức fintech, hãy nêu ra đặc điểm nổi bật dựa trên cập nhật, những yếu tố trending từ tin tức mạng.
 
Trích nguyên văn các đường link nguồn. Loại bỏ các thông tin không liên quan như hashtag, hình ảnh minh họa, hoặc các chi tiết phụ không ảnh hưởng đến nội dung chính.
 
Đảm bảo bản tóm tắt giữ nguyên đầy đủ các thông tin quan trọng, đặc trưng sản phẩm/dịch vụ theo ngành, và trình bày rõ ràng, mạch lạc từng nội dung.
 
Cần cấu trúc thành các đoạn hoặc các gạch đầu dòng để làm rõ các ý, đặc trưng của nội dung. 
 
Kết quả trả ra chỉ có nội dung được tóm tắt. Giới hạn 150 cộng trừ 10 chữ, giới hạn này không áp dụng cho đường link, link trích nguyên văn để có thể truy cập được. Bỏ qua tất cả định dạng, trả về ký tự thuần túy.
Nếu là * thì sẽ là gạch đầu dòng -.

Nội dung cần tóm tắt:
${content}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summarizedText = response.text();

        console.log('✅ AI summarization completed');
        console.log(`📝 Original length: ${content.length} characters`);
        console.log(`📝 Summarized length: ${summarizedText.length} characters`);

        return summarizedText;

    } catch (error) {
        console.error('❌ Error during AI summarization:', error.message);
        console.warn('⚠️  Returning original content without summarization');
        // Return original content if AI fails
        return content;
    }
}

/**
 * Main crawl function - routes to appropriate crawler based on category
 * @param {string} url - URL to crawl
 * @param {string} category - URL category: SOCIAL, NEED_TEST, WEB_PDF
 * @returns {Promise<string>} - Crawled content
 */
async function crawlContent(url, category) {
    console.log(`\n🚀 Starting crawl for ${category} category`);
    console.log(`📍 URL: ${url}`);

    try {
        let content = '';

        switch (category) {
            case 'SOCIAL':
                // Facebook crawl via Apify
                content = await crawlFacebookPost(url);
                break;

            case 'NEED_TEST':
                // Website crawl via Playwright
                content = await crawlWebsiteContent(url);
                break;

            case 'WEB_PDF':
                // PDF crawl via Playwright + pdf-parse
                content = await crawlPDFContent(url);
                break;

            default:
                throw new Error(`Unknown category: ${category}`);
        }

        console.log('✅ Crawl completed successfully');

        // Summarize content with Gemini AI
        const summarizedContent = await summarizeWithGemini(content);

        console.log('✅ Full crawl process completed\n');
        return summarizedContent;

    } catch (error) {
        console.error('❌ Crawl failed:', error.message);
        throw error;
    }
}

/**
 * Detect URL category automatically
 * @param {string} url - URL to analyze
 * @returns {Promise<string>} - Category ('SOCIAL', 'WEB_PDF', or 'NEED_TEST')
 */
async function detectUrlCategory(url) {
    try {
        const urlLower = url.toLowerCase();

        // Check for Facebook/Social Media
        if (urlLower.includes('facebook.com') ||
            urlLower.includes('fb.com') ||
            urlLower.includes('m.facebook.com')) {
            return 'SOCIAL';
        }

        // Check for PDF URLs
        if (urlLower.endsWith('.pdf') ||
            urlLower.includes('.pdf?') ||
            urlLower.includes('pdf') && (urlLower.includes('drive.google') || urlLower.includes('storage.googleapis'))) {
            return 'WEB_PDF';
        }

        // Default to website crawl
        return 'NEED_TEST';

    } catch (error) {
        console.error('Error detecting URL category:', error);
        return 'NEED_TEST'; // Default fallback
    }
}

module.exports = {
    crawlContent,
    crawlFacebookPost,
    crawlWebsiteContent,
    crawlPDFContent,
    detectUrlCategory,
    summarizeWithGemini
};
