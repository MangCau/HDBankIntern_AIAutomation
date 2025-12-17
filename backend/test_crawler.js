/**
 * TEST WEB CRAWLER - Standalone file for testing
 * Sử dụng Playwright với kỹ thuật bypass Cloudflare
 *
 * Cài đặt dependencies:
 * npm install playwright
 * npx playwright install chromium
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Crawl toàn bộ text từ một URL với bypass Cloudflare
 * @param {string} url - URL cần crawl
 * @param {object} options - Tùy chọn crawl
 * @returns {Promise<object>} - Kết quả crawl
 */
async function crawlWebsite(url, options = {}) {
  const {
    headless = false,
    timeout = 60000,
    waitForSelector = null,
    saveToFile = true,
    outputDir = './crawler_output'
  } = options;

  console.log('\n========================================');
  console.log('🚀 BẮT ĐẦU CRAWL WEBSITE');
  console.log('========================================');
  console.log(`📍 URL: ${url}`);
  console.log(`⏱️  Timeout: ${timeout}ms`);
  console.log(`👁️  Headless: ${headless}`);
  console.log('========================================\n');

  const browser = await chromium.launch({
    headless: headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-web-security',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    permissions: ['geolocation'],
    geolocation: { latitude: 10.8231, longitude: 106.6297 }, // Tọa độ TP.HCM
    colorScheme: 'light',
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    javaScriptEnabled: true,
    extraHTTPHeaders: {
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    }
  });

  const page = await context.newPage();

  // Override navigator properties to hide automation
  await page.addInitScript(() => {
    // Override the navigator.webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });

    // Override the navigator.plugins to appear like a real browser
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Override navigator.languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['vi-VN', 'vi', 'en-US', 'en'],
    });

    // Mock chrome object
    window.chrome = {
      runtime: {},
    };

    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });

  try {
    console.log('⏳ Đang tải trang...');

    // Goto với strategy tốt nhất cho Cloudflare
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: timeout
    });

    console.log('✅ Trang đã tải xong (DOM ready)');

    // Đợi thêm để Cloudflare challenge hoàn tất (nếu có)
    console.log('⏳ Đang đợi Cloudflare challenge...');
    await page.waitForTimeout(8000);

    // Check xem có Cloudflare challenge không
    const pageContent = await page.content();
    if (pageContent.includes('Checking your browser') || pageContent.includes('Just a moment')) {
      console.log('⚠️  Phát hiện Cloudflare challenge, đang đợi...');
      await page.waitForTimeout(10000); // Đợi thêm 10 giây
    }

    // Đợi selector nếu được chỉ định
    if (waitForSelector) {
      console.log(`⏳ Đang đợi selector: ${waitForSelector}`);
      try {
        await page.waitForSelector(waitForSelector, { timeout: 15000 });
        console.log('✅ Selector đã xuất hiện');
      } catch (e) {
        console.log('⚠️  Không tìm thấy selector, tiếp tục lấy content...');
      }
    }

    console.log('✅ Content đã load xong');
    console.log('📝 Đang trích xuất nội dung chính...\n');

    // Scroll xuống để load lazy content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    // Lấy thêm metadata
    const pageTitle = await page.title();
    const pageUrl = page.url();

    // Trích xuất nội dung CHÍNH của bài viết (bỏ qua quảng cáo, sidebar, menu...)
    const articleData = await page.evaluate(() => {
      // Helper function để clean text
      const cleanText = (text) => {
        if (!text) return '';
        return text.trim().replace(/\s+/g, ' ');
      };

      // Tìm title - ưu tiên h1 trong article hoặc main content
      let title = '';
      const titleSelectors = [
        'article h1',
        'main h1',
        '.article-title',
        '.post-title',
        '.entry-title',
        '.news-title',
        '.detail-title',
        'h1.title',
        'h1'
      ];
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText.trim().length > 10) {
          title = cleanText(element.innerText);
          break;
        }
      }

      // Tìm author
      let author = '';
      const authorSelectors = [
        '[itemprop="author"]',
        '.author',
        '.author-name',
        '.post-author',
        '.article-author',
        'meta[name="author"]',
        '.byline',
        '[rel="author"]'
      ];
      for (const selector of authorSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          author = cleanText(element.content || element.innerText);
          if (author) break;
        }
      }

      // Tìm published date/time
      let publishedDate = '';
      const dateSelectors = [
        'time[datetime]',
        '[itemprop="datePublished"]',
        '.published-date',
        '.post-date',
        '.article-date',
        '.date',
        '.time',
        'meta[property="article:published_time"]',
        'meta[name="publish_date"]'
      ];
      for (const selector of dateSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          publishedDate = cleanText(element.getAttribute('datetime') || element.content || element.innerText);
          if (publishedDate) break;
        }
      }

      // Tìm topic/category
      let topic = '';
      const topicSelectors = [
        '[itemprop="articleSection"]',
        '.category',
        '.article-category',
        '.post-category',
        '.topic',
        'meta[property="article:section"]',
        'meta[name="category"]',
        '.breadcrumb a:last-of-type'
      ];
      for (const selector of topicSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          topic = cleanText(element.content || element.innerText);
          if (topic) break;
        }
      }

      // Tìm main content - ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT
      let mainContent = '';
      const contentSelectors = [
        'article .content',
        'article .article-content',
        'article .post-content',
        'article .entry-content',
        '[itemprop="articleBody"]',
        '.article-body',
        '.post-body',
        '.content-detail',
        '.detail-content',
        'main article',
        'article',
        '.main-content article',
        'main .content'
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
        // Clone element để không ảnh hưởng DOM gốc
        const clonedContent = contentElement.cloneNode(true);

        // Xóa các thành phần không mong muốn
        const unwantedSelectors = [
          'script',
          'style',
          'iframe',
          'nav',
          'aside',
          '.advertisement',
          '.ads',
          '.ad',
          '.banner',
          '.social-share',
          '.share',
          '.related-posts',
          '.related-articles',
          '.comments',
          '.comment',
          'form',
          '.newsletter',
          '.popup',
          '.modal',
          '.sidebar',
          '.widget',
          '.breadcrumb',
          '.tags',
          '.author-box',
          '[class*="ad-"]',
          '[class*="ads-"]',
          '[id*="ad-"]',
          '[id*="ads-"]'
        ];

        unwantedSelectors.forEach(selector => {
          const elements = clonedContent.querySelectorAll(selector);
          elements.forEach(el => el.remove());
        });

        // Lấy text từ các paragraphs và headings trong content
        const paragraphs = Array.from(clonedContent.querySelectorAll('p, h2, h3, h4, blockquote'));
        mainContent = paragraphs
          .map(p => cleanText(p.innerText))
          .filter(text => text.length > 20) // Bỏ qua đoạn quá ngắn
          .join('\n\n');
      }

      // Fallback: nếu không tìm được content, thử lấy tất cả paragraphs trong body
      if (!mainContent || mainContent.length < 100) {
        const allParagraphs = Array.from(document.querySelectorAll('p'));
        mainContent = allParagraphs
          .map(p => cleanText(p.innerText))
          .filter(text => text.length > 50) // Chỉ lấy đoạn dài
          .slice(0, 20) // Giới hạn 20 đoạn đầu
          .join('\n\n');
      }

      // Tìm main image
      let mainImage = '';
      const imageSelectors = [
        'article img[src]',
        '.article-image img',
        '.featured-image img',
        '[itemprop="image"]',
        'meta[property="og:image"]'
      ];
      for (const selector of imageSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          mainImage = element.src || element.content || '';
          if (mainImage) break;
        }
      }

      return {
        title,
        author,
        publishedDate,
        topic,
        mainContent,
        mainImage,
        contentLength: mainContent.length,
        meta: {
          description: document.querySelector('meta[name="description"]')?.content || '',
          keywords: document.querySelector('meta[name="keywords"]')?.content || ''
        }
      };
    });

    const result = {
      success: true,
      url: pageUrl,
      pageTitle: pageTitle,
      timestamp: new Date().toISOString(),
      // Structured article data (chỉ nội dung chính)
      article: {
        title: articleData.title,
        author: articleData.author,
        publishedDate: articleData.publishedDate,
        topic: articleData.topic,
        mainContent: articleData.mainContent,
        mainImage: articleData.mainImage,
        meta: articleData.meta
      },
      // Statistics
      wordCount: articleData.mainContent.split(/\s+/).length,
      characterCount: articleData.contentLength
    };

    // In ra console
    console.log('========================================');
    console.log('📊 KẾT QUẢ CRAWL BÀI VIẾT');
    console.log('========================================');
    console.log(`📄 Title: ${articleData.title || pageTitle}`);
    console.log(`✍️  Author: ${articleData.author || 'N/A'}`);
    console.log(`📅 Published: ${articleData.publishedDate || 'N/A'}`);
    console.log(`🏷️  Topic: ${articleData.topic || 'N/A'}`);
    console.log(`🔗 URL: ${pageUrl}`);
    console.log(`🖼️  Image: ${articleData.mainImage ? 'Có' : 'Không'}`);
    console.log(`📝 Số từ: ${result.wordCount.toLocaleString()}`);
    console.log(`🔤 Số ký tự: ${result.characterCount.toLocaleString()}`);
    console.log('========================================\n');

    console.log('📄 NỘI DUNG CHÍNH BÀI VIẾT:');
    console.log('========================================');
    console.log(articleData.mainContent);
    console.log('========================================\n');

    // Lưu vào file nếu được yêu cầu
    if (saveToFile) {
      await saveResultToFile(result, outputDir, url);
    }

    return result;

  } catch (error) {
    console.error('\n❌ LỖI KHI CRAWL:');
    console.error(error.message);
    console.error(error.stack);

    // Thử screenshot để debug
    try {
      const screenshotPath = path.join(outputDir, 'error-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Đã lưu screenshot lỗi: ${screenshotPath}`);
    } catch (e) {
      console.log('Không thể lưu screenshot');
    }

    return {
      success: false,
      error: error.message,
      url: url,
      timestamp: new Date().toISOString()
    };

  } finally {
    await browser.close();
    console.log('\n✅ Đã đóng browser');
  }
}

/**
 * Lưu kết quả vào file
 */
async function saveResultToFile(result, outputDir, url) {
  try {
    // Tạo thư mục output nếu chưa có
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Tạo tên file từ timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '_').substring(0, 50);

    // Lưu text thuần (chỉ nội dung chính)
    const textFilePath = path.join(outputDir, `${timestamp}_${sanitizedUrl}.txt`);
    const textOutput = `
TIÊU ĐỀ: ${result.article.title}
TÁC GIẢ: ${result.article.author || 'N/A'}
NGÀY ĐĂNG: ${result.article.publishedDate || 'N/A'}
CHỦ ĐỀ: ${result.article.topic || 'N/A'}
URL: ${result.url}

========================================
NỘI DUNG CHÍNH:
========================================

${result.article.mainContent}
`.trim();

    fs.writeFileSync(textFilePath, textOutput, 'utf8');
    console.log(`💾 Đã lưu text vào: ${textFilePath}`);

    // Lưu JSON với metadata đầy đủ
    const jsonFilePath = path.join(outputDir, `${timestamp}_${sanitizedUrl}.json`);
    fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`💾 Đã lưu JSON vào: ${jsonFilePath}`);

  } catch (error) {
    console.error('❌ Lỗi khi lưu file:', error.message);
  }
}

/**
 * Test với nhiều URL
 */
async function testMultipleUrls(urls) {
  console.log(`\n🔄 Sẽ crawl ${urls.length} URLs...\n`);

  const results = [];

  for (let i = 0; i < urls.length; i++) {
    console.log(`\n[${i + 1}/${urls.length}] Crawling: ${urls[i]}`);
    const result = await crawlWebsite(urls[i], {
      headless: false,
      timeout: 60000,
      saveToFile: true
    });
    results.push(result);

    // Đợi 3 giây giữa các request để tránh bị block
    if (i < urls.length - 1) {
      console.log('\n⏳ Đợi 3 giây trước khi crawl tiếp...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Tổng kết
  console.log('\n========================================');
  console.log('📊 TỔNG KẾT');
  console.log('========================================');
  const successful = results.filter(r => r.success).length;
  console.log(`✅ Thành công: ${successful}/${urls.length}`);
  console.log(`❌ Thất bại: ${urls.length - successful}/${urls.length}`);
  console.log('========================================\n');

  return results;
}

// ============================================================================
// MAIN - Chạy test
// ============================================================================

(async () => {
  try {
    // Danh sách URL test
    const testUrls = [
      // Ví dụ 1: CafeF
      //"https://cafef.vn/uob-viet-nam-nang-tam-trai-nghiem-ngan-hang-ban-le-voi-bo-the-tin-dung-cai-tien-moi-va-hang-loat-uu-dai-doc-quyen-khap-asean-188251022191508196.chn",

      // Ví dụ 2: Người Quan Sát (thường có Cloudflare)
      //"https://nguoiquansat.vn/ty-phu-pham-nhat-vuong-rot-80-000-ty-vao-du-an-thep-dau-tay-so-ke-truc-dien-voi-dung-quat-2-cua-hoa-phat-259740.html",

      // Thêm URL khác ở đây nếu muốn test
      "https://baochinhphu.vn/trien-khai-thanh-toan-qr-xuyen-bien-gioi-viet-nam-trung-quoc-102251202142234548.htm",
      //"https://storage.googleapis.com/cake-prd-website/homepage/02_The_le_chuong_trinh_GTBB_TD_11_2025_16616b35e3/02_The_le_chuong_trinh_GTBB_TD_11_2025_16616b35e3.pdf",
    ];

    // CÁCH 1: Crawl một URL đơn
    console.log('\n🎯 TEST CRAWL ĐƠN URL\n');
    await crawlWebsite(testUrls[0], {  // Test với URL đầu tiên (index 0)
      headless: false,       // false = hiện browser để xem quá trình
      timeout: 60000,        // 60 giây timeout
      saveToFile: true,      // Lưu vào file
      outputDir: './crawler_output'  // Thư mục output
    });

    // CÁCH 2: Crawl nhiều URL (uncomment để dùng)
    // console.log('\n🎯 TEST CRAWL NHIỀU URL\n');
    // await testMultipleUrls(testUrls);

  } catch (error) {
    console.error('\n❌ LỖI NGHIÊM TRỌNG:');
    console.error(error);
    process.exit(1);
  }
})();
