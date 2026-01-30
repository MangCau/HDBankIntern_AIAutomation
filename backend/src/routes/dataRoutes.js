const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const NewProductService = require('../models/NewProductService');
const BankingMarketTrend = require('../models/BankingMarketTrend');
const FintechNews = require('../models/FintechNews');
const HeaderProcessing = require('../models/HeaderProcessing');
const { crawlContent } = require('../services/crawlerService');
const { uploadBase64Image, deleteImage } = require('../utils/gcs');

// Middleware to check database connection
const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database is not connected. Please check MongoDB connection.'
    });
  }
  next();
};

// Get all new products and services
router.get('/new-products', checkDbConnection, async (req, res) => {
  try {
    const data = await NewProductService.find().sort({ date_published: -1 }).limit(50);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all banking market trends
router.get('/market-trends', checkDbConnection, async (req, res) => {
  try {
    const data = await BankingMarketTrend.find().sort({ published_date: -1 }).limit(50);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all fintech news
router.get('/fintech-news', checkDbConnection, async (req, res) => {
  try {
    const data = await FintechNews.find().sort({ published_date: -1 }).limit(50);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all data from all collections
router.get('/all', checkDbConnection, async (req, res) => {
  try {
    const [newProducts, marketTrends, fintechNews] = await Promise.all([
      NewProductService.find().sort({ date_published: -1 }),
      BankingMarketTrend.find().sort({ published_date: -1 }),
      FintechNews.find().sort({ published_date: -1 })
    ]);

    res.json({
      success: true,
      data: {
        newProducts,
        marketTrends,
        fintechNews
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all header processing news
router.get('/header-processing', checkDbConnection, async (req, res) => {
  try {
    const data = await HeaderProcessing.find().sort({ source_date: -1 });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update selected status for header processing items
router.patch('/header-processing/:id', checkDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const { selected, topic_classification } = req.body;

    // Build update object dynamically
    const updateData = {};
    if (selected !== undefined) updateData.selected = selected;
    if (topic_classification !== undefined) updateData.topic_classification = topic_classification;

    console.log('Updating ID:', id);
    console.log('Update Data:', updateData);

    const updated = await HeaderProcessing.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: false }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    console.log('Updated result:', updated.topic_classification);

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Batch update selected status for multiple header processing items
router.patch('/header-processing', checkDbConnection, async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, selected }

    const promises = updates.map(({ id, selected }) =>
      HeaderProcessing.findByIdAndUpdate(id, { selected }, { new: true })
    );

    const results = await Promise.all(promises);

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all selected items from all 4 summary tables for summary view
router.get('/summary-selected', checkDbConnection, async (req, res) => {
  try {
    const [newProducts, marketTrends, fintechNews, headerProcessing] = await Promise.all([
      NewProductService.find({ selected: true }).sort({ date_published: -1 }),
      BankingMarketTrend.find({ selected: true }).sort({ published_date: -1 }),
      FintechNews.find({ selected: true }).sort({ published_date: -1 }),
      HeaderProcessing.find({ selected: true }).sort({ published_date: -1 })
    ]);

    res.json({
      success: true,
      data: {
        newProducts,
        marketTrends,
        fintechNews,
        headerProcessing
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update image for a specific item in any of the 3 tables
router.patch('/update-image/:collection/:id', checkDbConnection, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const { image } = req.body; // base64 image string

    let Model;
    switch (collection) {
      case 'new-products':
        Model = NewProductService;
        break;
      case 'market-trends':
        Model = BankingMarketTrend;
        break;
      case 'fintech-news':
        Model = FintechNews;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid collection' });
    }

    // Get current item to delete old image if exists
    const item = await Model.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Upload new image to Google Cloud Storage
    const imageUrl = await uploadBase64Image(image, `news-images/${collection}`);

    // Delete old image from GCS if it exists and is a GCS URL
    if (item.image && item.image.includes('storage.googleapis.com')) {
      await deleteImage(item.image);
    }

    // Update image URL in MongoDB
    const updated = await Model.findByIdAndUpdate(
      id,
      { image: imageUrl },
      { new: true }
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload and update image for an item
router.post('/upload-image/:collection/:id', checkDbConnection, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const { image } = req.body; // base64 image string

    if (!image) {
      return res.status(400).json({ success: false, message: 'Image data is required' });
    }

    let Model;
    switch (collection) {
      case 'new-products':
        Model = NewProductService;
        break;
      case 'market-trends':
        Model = BankingMarketTrend;
        break;
      case 'fintech-news':
        Model = FintechNews;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid collection' });
    }

    // Get current item to delete old image if exists
    const item = await Model.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Upload new image to Google Cloud Storage
    const imageUrl = await uploadBase64Image(image, `news-images/${collection}`);

    // Delete old image from GCS if it exists and is a GCS URL
    if (item.image && item.image.includes('storage.googleapis.com')) {
      await deleteImage(item.image);
    }

    // Update image URL in MongoDB
    const updated = await Model.findByIdAndUpdate(
      id,
      { image: imageUrl },
      { new: true }
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a specific field for an item in any of the 3 tables
router.patch('/update-field/:collection/:id', checkDbConnection, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const { field, value } = req.body;

    // Validate field and value are provided
    if (!field || value === undefined) {
      return res.status(400).json({ success: false, message: 'Field and value are required' });
    }

    // Determine which model to use
    let Model;
    let allowedFields;
    switch (collection) {
      case 'new-products':
        Model = NewProductService;
        allowedFields = ['product_name', 'description', 'selected', 'reportSelected', 'source_of_detail', 'detail_content', 'url_category_precheck'];
        break;
      case 'market-trends':
        Model = BankingMarketTrend;
        allowedFields = ['title', 'summary', 'selected', 'reportSelected', 'source_of_detail', 'detail_content', 'url_category_precheck'];
        break;
      case 'fintech-news':
        Model = FintechNews;
        allowedFields = ['title', 'summary', 'selected', 'reportSelected', 'source_of_detail', 'detail_content', 'url_category_precheck'];
        break;
      case 'header-processing':
        Model = HeaderProcessing;
        allowedFields = ['title', 'summary', 'selected'];
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid collection' });
    }

    // Validate field is allowed for this collection
    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: `Invalid field. Allowed fields for ${collection}: ${allowedFields.join(', ')}`
      });
    }

    // Update the field
    const updated = await Model.findByIdAndUpdate(
      id,
      { [field]: value },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate image using Imagen 4.0 API
router.post('/generate-image/:collection/:id', checkDbConnection, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const { summary, category } = req.body;

    // Determine which model to use
    let Model;
    switch (collection) {
      case 'new-products':
        Model = NewProductService;
        break;
      case 'market-trends':
        Model = BankingMarketTrend;
        break;
      case 'fintech-news':
        Model = FintechNews;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid collection' });
    }

    // Get the item to verify it exists
    const item = await Model.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Build the prompt
    const prompt = `Tạo một graphic dạng logo–tóm tắt theo phong cách hiện đại với chi tiết như sau:

Design hình ảnh minh họa cho nội dung: ${summary}

Dạng hình: Hình vuông

Phong cách: Màu sắc tươi sáng, dùng trong slide trình bày

Yếu tố thể hiện: nội dung dành cho lĩnh vực ${category}

Nội dung chữ: chỉ cần tiêu đề ngắn gọn`;

    // Call Gemini 2.5 Flash Image for image generation
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'GEMINI_API_KEY not configured' });
    }
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const response = await axios.post(geminiUrl, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Extract generated image from Gemini response
    if (!response.data.candidates || response.data.candidates.length === 0) {
      return res.status(500).json({ success: false, message: 'No image generated from Gemini' });
    }

    const candidate = response.data.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      return res.status(500).json({ success: false, message: 'No image data in response' });
    }

    // Find the image part (inlineData)
    const imagePart = candidate.content.parts.find(part => part.inlineData);
    if (!imagePart || !imagePart.inlineData) {
      return res.status(500).json({ success: false, message: 'No image data found in response' });
    }

    const base64Image = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

    // Upload generated image to Google Cloud Storage
    const imageUrl = await uploadBase64Image(base64Image, `news-images/${collection}`);

    // Delete old image from GCS if it exists and is a GCS URL
    if (item.image && item.image.includes('storage.googleapis.com')) {
      await deleteImage(item.image);
    }

    // Update the item with the GCS image URL
    const updated = await Model.findByIdAndUpdate(
      id,
      { image: imageUrl },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Image generated and uploaded successfully',
      data: updated
    });

  } catch (error) {
    console.error('Error generating image:');
    console.error('Error message:', error.message);
    console.error('Error response data:', error.response?.data);
    console.error('Error response JSON:', JSON.stringify(error.response?.data, null, 2));
    console.error('Error status:', error.response?.status);

    res.status(500).json({
      success: false,
      message: error.message,
      details: error.response?.data,
      statusCode: error.response?.status
    });
  }
});

// Auto-crawl content for item with null detail_content
router.post('/crawl-content/:collection/:id', checkDbConnection, async (req, res) => {
  try {
    const { collection, id } = req.params;

    // Determine which model to use
    let Model;
    switch (collection) {
      case 'new-products':
        Model = NewProductService;
        break;
      case 'market-trends':
        Model = BankingMarketTrend;
        break;
      case 'fintech-news':
        Model = FintechNews;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid collection' });
    }

    // Find the item
    const item = await Model.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Không cần check detail_content - cho phép crawl lại bất cứ lúc nào
    // User có thể muốn crawl lại để cập nhật nội dung mới

    // Check if source_url exists
    if (!item.source_url) {
      return res.status(400).json({
        success: false,
        message: 'source_url is required for crawling'
      });
    }

    // Check url_category_precheck
    const category = item.url_category_precheck;
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'url_category_precheck is required'
      });
    }

    console.log(`\n🔄 Auto-crawling content for ${collection}/${id}`);
    console.log(`📍 URL: ${item.source_url}`);
    console.log(`🏷️  Category: ${category}`);

    // Crawl content based on category
    let crawledContent = '';

    try {
      crawledContent = await crawlContent(item.source_url, category);
    } catch (crawlError) {
      console.error('❌ Crawl error:', crawlError.message);
      return res.status(500).json({
        success: false,
        message: `Crawl failed: ${crawlError.message}`,
        category: category
      });
    }

    // Update source_of_detail and detail_content in database
    console.log(`🔍 Before update - source_of_detail: ${item.source_of_detail}`);
    console.log(`🔍 Setting source_of_detail to: ${item.source_url}`);

    item.source_of_detail = item.source_url; // Set source_of_detail to source_url for auto-crawl
    item.detail_content = crawledContent;

    // Mark fields as modified to ensure Mongoose saves them
    item.markModified('source_of_detail');
    item.markModified('detail_content');

    await item.save();

    console.log('✅ Content crawled and saved successfully');
    console.log(`📝 After save - source_of_detail: ${item.source_of_detail}`);
    console.log(`📝 After save - detail_content length: ${item.detail_content?.length || 0}`);

    res.json({
      success: true,
      message: 'Content crawled successfully',
      data: {
        id: item._id,
        source_of_detail: item.source_url,
        contentLength: crawledContent.length,
        category: category
      }
    });

  } catch (error) {
    console.error('❌ Error in crawl-content endpoint:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Custom crawl with user-provided URL
router.post('/crawl-custom/:collection/:id', checkDbConnection, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const { customUrl } = req.body;

    // Validate customUrl
    if (!customUrl || typeof customUrl !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'customUrl is required and must be a string'
      });
    }

    // Validate URL format
    try {
      const urlObj = new URL(customUrl);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return res.status(400).json({
          success: false,
          message: 'URL must start with http:// or https://'
        });
      }
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format'
      });
    }

    // Determine which model to use
    let Model;
    switch (collection) {
      case 'new-products':
        Model = NewProductService;
        break;
      case 'market-trends':
        Model = BankingMarketTrend;
        break;
      case 'fintech-news':
        Model = FintechNews;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid collection' });
    }

    // Find the item
    const item = await Model.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    console.log(`\n🔄 Custom crawl for ${collection}/${id}`);
    console.log(`📍 Custom URL: ${customUrl}`);

    // Determine category by analyzing URL
    const { detectUrlCategory } = require('../services/crawlerService');
    const category = await detectUrlCategory(customUrl);

    console.log(`🏷️  Detected Category: ${category}`);

    // Crawl content based on detected category
    let crawledContent = '';

    try {
      crawledContent = await crawlContent(customUrl, category);
    } catch (crawlError) {
      console.error('❌ Crawl error:', crawlError.message);
      return res.status(500).json({
        success: false,
        message: `Crawl failed: ${crawlError.message}`,
        category: category
      });
    }

    // Update source_of_detail and detail_content in database
    item.source_of_detail = customUrl;
    item.detail_content = crawledContent;
    await item.save();

    console.log('✅ Custom crawl completed and saved successfully');
    console.log(`📝 Saved to source_of_detail: ${customUrl}`);

    res.json({
      success: true,
      message: 'Content crawled successfully from custom URL',
      data: {
        id: item._id,
        source_of_detail: customUrl,
        contentLength: crawledContent.length,
        category: category
      }
    });

  } catch (error) {
    console.error('❌ Error in crawl-custom endpoint:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Temporary crawl - does NOT save to database, only returns result
// Used for special groups like "Tỷ giá" and "Giá vàng" in Page 3
router.post('/crawl-temporary', async (req, res) => {
  try {
    const { url, title } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    console.log(`\n🔄 Temporary crawl for: ${title || 'Unnamed'}`);
    console.log(`📍 URL: ${url}`);

    // Auto-detect category
    const { detectUrlCategory } = require('../services/crawlerService');
    const category = await detectUrlCategory(url);

    console.log(`📋 Detected category: ${category}`);

    // Crawl content
    let crawledContent = '';
    try {
      crawledContent = await crawlContent(url, category);
    } catch (crawlError) {
      console.error('❌ Crawl error:', crawlError.message);
      return res.status(500).json({
        success: false,
        message: `Crawl failed: ${crawlError.message}`,
        error: crawlError.message
      });
    }

    console.log('✅ Temporary crawl completed (not saved to database)');

    // Return crawled data without saving to database
    res.json({
      success: true,
      message: 'Content crawled successfully (temporary)',
      data: {
        title: title || 'Unnamed',
        url: url,
        content: crawledContent,
        source: url,
        category: category,
        crawledAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in crawl-temporary endpoint:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint: Crawl exchange rate chart from 24h.com.vn
router.post('/crawl-exchange-rate', async (req, res) => {
  try {
    console.log('\n💱 Crawling exchange rate from 24h.com.vn...');

    const playwright = require('playwright');
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // Navigate to the exchange rate page
      await page.goto('https://www.24h.com.vn/ty-gia-ngoai-te-ttcb-c426.html', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      console.log('📄 Page loaded successfully');

      // Wait for the chart section to load
      await page.waitForSelector('.cate-24h-gold-pri-chart', { timeout: 15000 });
      console.log('📊 Found chart section');

      // Wait a bit more for the chart to fully render
      await page.waitForTimeout(3000);

      // Get the chart element
      const chartElement = await page.$('.cate-24h-gold-pri-chart');

      if (!chartElement) {
        await browser.close();
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy biểu đồ tỷ giá'
        });
      }

      // Extract exchange rate data from the page
      const exchangeRateData = await page.evaluate(() => {
        const data = {
          buyRates: [],
          sellRates: [],
          labels: [],
          currency: 'USD'
        };

        try {
          // Look for data in scripts
          const scripts = Array.from(document.querySelectorAll('script'));

          for (const script of scripts) {
            const text = script.textContent || '';

            // Look for highcharts configuration with categories and series
            if (text.includes('highcharts') && text.includes('categories') && text.includes('series')) {

              // Extract categories (date labels)
              const categoriesMatch = text.match(/categories\s*:\s*\[(.*?)\]/);
              if (categoriesMatch) {
                data.labels = categoriesMatch[1]
                  .split(',')
                  .map(l => l.trim().replace(/['"]/g, ''));
              }

              // Extract "Mua vào" (buy) data
              const buyMatch = text.match(/name\s*:\s*['"]Mua vào['"][\s\S]*?data\s*:\s*\[([0-9.,\s]+)\]/);
              if (buyMatch) {
                data.buyRates = buyMatch[1]
                  .split(',')
                  .map(v => parseFloat(v.trim()))
                  .filter(v => !isNaN(v));
              }

              // Extract "Bán ra" (sell) data
              const sellMatch = text.match(/name\s*:\s*['"]Bán ra['"][\s\S]*?data\s*:\s*\[([0-9.,\s]+)\]/);
              if (sellMatch) {
                data.sellRates = sellMatch[1]
                  .split(',')
                  .map(v => parseFloat(v.trim()))
                  .filter(v => !isNaN(v));
              }

              // If found data, break
              if (data.buyRates.length > 0 && data.sellRates.length > 0) {
                break;
              }
            }
          }
        } catch (e) {
          console.error('Error extracting data:', e);
        }

        return data;
      });

      console.log('📊 Extracted exchange rate data:', exchangeRateData);

      // Take screenshot of the chart section for gallery
      const screenshot = await chartElement.screenshot({
        type: 'png'
      });

      const screenshotBase64 = `data:image/png;base64,${screenshot.toString('base64')}`;
      console.log('📸 Captured chart screenshot');

      await browser.close();

      res.json({
        success: true,
        message: 'Đã lấy biểu đồ tỷ giá USD thành công',
        data: {
          chartData: exchangeRateData,
          screenshot: screenshotBase64,
          source: 'https://www.24h.com.vn/ty-gia-ngoai-te-ttcb-c426.html',
          crawledAt: new Date().toISOString()
        }
      });

    } catch (pageError) {
      await browser.close();
      throw pageError;
    }

  } catch (error) {
    console.error('❌ Error crawling exchange rate:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi lấy tỷ giá: ${error.message}`,
      error: error.message
    });
  }
});

// Endpoint: Crawl gold price chart from 24h.com.vn
router.post('/crawl-gold-price', async (req, res) => {
  try {
    console.log('\n💰 Crawling gold price from 24h.com.vn...');

    const playwright = require('playwright');
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // Navigate to the gold price page
      await page.goto('https://www.24h.com.vn/gia-vang-hom-nay-c425.html', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      console.log('📄 Page loaded successfully');

      // Wait for the chart section to load
      await page.waitForSelector('.cate-24h-gold-pri-chart', { timeout: 15000 });
      console.log('📊 Found chart section');

      // Wait a bit more for the chart to fully render
      await page.waitForTimeout(3000);

      // Get the chart element
      const chartElement = await page.$('.cate-24h-gold-pri-chart');

      if (!chartElement) {
        await browser.close();
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy biểu đồ giá vàng'
        });
      }

      // Extract gold price data from the page
      const goldPriceData = await page.evaluate(() => {
        const data = {
          buyRates: [],
          sellRates: [],
          labels: [],
          goldType: 'SJC' // Default gold type
        };

        try {
          // Look for data in scripts
          const scripts = Array.from(document.querySelectorAll('script'));

          for (const script of scripts) {
            const text = script.textContent || '';

            // Look for highcharts configuration with categories and series
            if (text.includes('highcharts') && text.includes('categories') && text.includes('series')) {

              // Extract categories (date labels)
              const categoriesMatch = text.match(/categories\s*:\s*\[(.*?)\]/);
              if (categoriesMatch) {
                data.labels = categoriesMatch[1]
                  .split(',')
                  .map(l => l.trim().replace(/['"]/g, ''));
              }

              // Extract "Mua vào" (buy) data - try multiple patterns
              let buyMatch = text.match(/name\s*:\s*['"]Mua vào['"][\s\S]*?data\s*:\s*\[([0-9.,\s]+)\]/);
              if (!buyMatch) {
                // Try alternative patterns like "Giá mua" or just first data array
                buyMatch = text.match(/name\s*:\s*['"]Giá mua['"][\s\S]*?data\s*:\s*\[([0-9.,\s]+)\]/);
              }
              if (buyMatch) {
                data.buyRates = buyMatch[1]
                  .split(',')
                  .map(v => parseFloat(v.trim()))
                  .filter(v => !isNaN(v));
              }

              // Extract "Bán ra" (sell) data
              let sellMatch = text.match(/name\s*:\s*['"]Bán ra['"][\s\S]*?data\s*:\s*\[([0-9.,\s]+)\]/);
              if (!sellMatch) {
                sellMatch = text.match(/name\s*:\s*['"]Giá bán['"][\s\S]*?data\s*:\s*\[([0-9.,\s]+)\]/);
              }
              if (sellMatch) {
                data.sellRates = sellMatch[1]
                  .split(',')
                  .map(v => parseFloat(v.trim()))
                  .filter(v => !isNaN(v));
              }

              // Try to detect gold type from script
              if (text.includes('SJC') || text.includes('sjc')) {
                data.goldType = 'SJC';
              } else if (text.includes('PNJ') || text.includes('pnj')) {
                data.goldType = 'PNJ';
              }

              // If found data, break
              if (data.buyRates.length > 0 && data.sellRates.length > 0) {
                break;
              }
            }
          }
        } catch (e) {
          console.error('Error extracting data:', e);
        }

        return data;
      });

      console.log('📊 Extracted gold price data:', goldPriceData);

      // Take screenshot of the chart section for gallery
      const screenshot = await chartElement.screenshot({
        type: 'png'
      });

      const screenshotBase64 = `data:image/png;base64,${screenshot.toString('base64')}`;
      console.log('📸 Captured chart screenshot');

      // Also scrape XAU/USD price from investing.com
      let xauUsdData = null;
      try {
        console.log('🌐 Scraping XAU/USD price from investing.com...');
        const xauPage = await browser.newPage();
        await xauPage.setExtraHTTPHeaders({
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        });
        await xauPage.goto('https://vn.investing.com/currencies/xau-usd', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        // Wait for the price element to appear
        await xauPage.waitForSelector('[data-test="instrument-price-last"]', { timeout: 15000 });
        await xauPage.waitForTimeout(2000);

        xauUsdData = await xauPage.evaluate(() => {
          const result = {
            price: '',
            change: '',
            changePercent: '',
            direction: '', // 'up' or 'down'
            timestamp: '' // Real-time timestamp from the page
          };

          try {
            // Get the price value
            const priceEl = document.querySelector('[data-test="instrument-price-last"]');
            if (priceEl) {
              result.price = priceEl.textContent.trim();
            }

            // Get the change value
            const changeEl = document.querySelector('[data-test="instrument-price-change"]');
            if (changeEl) {
              result.change = changeEl.textContent.trim();
            }

            // Get the change percent
            const changePercentEl = document.querySelector('[data-test="instrument-price-change-percent"]');
            if (changePercentEl) {
              result.changePercent = changePercentEl.textContent.trim();
            }

            // Get the real-time timestamp (e.g. "Dữ Liệu theo Thời Gian Thực·10:33:28")
            const timeEl = document.querySelector('[data-test="trading-time-label"]');
            if (timeEl) {
              result.timestamp = timeEl.textContent.trim();
            } else {
              // Fallback: search for text containing the timestamp pattern
              const allElements = document.querySelectorAll('span, div, time');
              for (const el of allElements) {
                const text = el.textContent || '';
                if (text.includes('Thời Gian Thực') || text.match(/\d{2}:\d{2}:\d{2}/)) {
                  result.timestamp = text.trim();
                  break;
                }
              }
            }

            // Determine direction from the instrument-price wrapper class or color
            const priceWrapper = document.querySelector('[class*="instrument-price_instrument-price"]');
            if (priceWrapper) {
              const classes = priceWrapper.className || '';
              const style = priceWrapper.innerHTML || '';
              // Check for negative indicator
              if (classes.includes('negative') || classes.includes('down') || style.includes('negative') || (result.change && result.change.startsWith('-'))) {
                result.direction = 'down';
              } else {
                result.direction = 'up';
              }
            } else {
              // Fallback: check change value
              result.direction = (result.change && result.change.startsWith('-')) ? 'down' : 'up';
            }
          } catch (e) {
            console.error('Error extracting XAU/USD data:', e);
          }

          return result;
        });

        await xauPage.close();
        console.log('💰 XAU/USD data:', xauUsdData);
      } catch (xauError) {
        console.error('⚠️ Error scraping XAU/USD (non-critical):', xauError.message);
      }

      await browser.close();

      res.json({
        success: true,
        message: 'Đã lấy biểu đồ giá vàng thành công',
        data: {
          chartData: goldPriceData,
          xauUsdPrice: xauUsdData,
          screenshot: screenshotBase64,
          source: 'https://www.24h.com.vn/gia-vang-hom-nay-c425.html',
          crawledAt: new Date().toISOString()
        }
      });

    } catch (pageError) {
      await browser.close();
      throw pageError;
    }

  } catch (error) {
    console.error('❌ Error crawling gold price:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi lấy giá vàng: ${error.message}`,
      error: error.message
    });
  }
});

// Endpoint: Scrape exchange rate table from tygiausd.org
router.post('/scrape-tygiausd-table', async (req, res) => {
  try {
    console.log('\n💱 Scraping exchange rate table from tygiausd.org...');

    const playwright = require('playwright');
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // Navigate to the page
      await page.goto('https://tygiausd.org/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      console.log('📄 Page loaded successfully');

      // Wait for the table to load
      await page.waitForSelector('table.table.table-hover.table-bordered.table-condensed', { timeout: 15000 });
      console.log('📊 Found table');

      // Extract table data
      const tableData = await page.evaluate(() => {
        const rows = [];
        const table = document.querySelector('table.table.table-hover.table-bordered.table-condensed');

        if (!table) return { rows: [], text: '' };

        const tableRows = table.querySelectorAll('tr');

        // Helper function to parse price and change
        const parseCell = (cellText) => {
          // Example: "26,600 -200" or "26,650 +100"
          const text = cellText.trim();

          // Split by space to get price and change
          const parts = text.split(/\s+/);

          if (parts.length >= 2) {
            const price = parts[0].replace(/,/g, ''); // Remove commas: "26,600" -> "26600"
            const change = parts[1]; // Keep sign: "-200" or "+100"

            return {
              price: price,
              change: change,
              display: `${parts[0]} (${change})`
            };
          } else if (parts.length === 1) {
            // Only price, no change
            return {
              price: parts[0].replace(/,/g, ''),
              change: '0',
              display: parts[0]
            };
          }

          return {
            price: '0',
            change: '0',
            display: text
          };
        };

        tableRows.forEach((row, index) => {
          const cells = row.querySelectorAll('td.text-right');
          if (cells.length >= 2) {
            const buyData = parseCell(cells[0].textContent);
            const sellData = parseCell(cells[1].textContent);

            rows.push({
              buy: buyData,
              sell: sellData,
              // Keep raw text for backward compatibility
              buyRaw: cells[0].textContent.trim(),
              sellRaw: cells[1].textContent.trim()
            });
          }
        });

        // Also get full text content for context
        const fullText = table.textContent.replace(/\s+/g, ' ').trim();

        return { rows, text: fullText };
      });

      await browser.close();

      // Format the data as text with detailed breakdown
      let formattedText = '📊 Bảng tỷ giá USD từ tygiausd.org:\n\n';
      if (tableData.rows.length > 0) {
        tableData.rows.forEach((row, index) => {
          formattedText += `${index + 1}. Mua vào: ${row.buy.display} | Bán ra: ${row.sell.display}\n`;
          formattedText += `   (Giá mua: ${row.buy.price}, Biến động: ${row.buy.change} | Giá bán: ${row.sell.price}, Biến động: ${row.sell.change})\n`;
        });
      } else {
        formattedText += 'Không tìm thấy dữ liệu trong bảng.\n';
      }

      console.log('✅ Successfully scraped table data');

      res.json({
        success: true,
        data: {
          rows: tableData.rows,
          formattedText: formattedText,
          rawText: tableData.text
        }
      });

    } catch (pageError) {
      await browser.close();
      throw pageError;
    }

  } catch (error) {
    console.error('❌ Error scraping tygiausd table:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi cào bảng tỷ giá: ${error.message}`,
      error: error.message
    });
  }
});

// Endpoint: Crawl VOV article with Playwright (pure code, no AI)
router.post('/extract-vov-exchange-rate', async (req, res) => {
  try {
    console.log('\n📰 Crawling VOV exchange rate article...');

    const { date } = req.body; // Expected format: "13/1"

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ngày (date)'
      });
    }

    const playwright = require('playwright');
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      console.log(`📅 Searching for article date: ${date}`);

      // Step 1: Navigate to VOV exchange rate page
      await page.goto('https://vov.vn/thi-truong/ty-gia', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      console.log('📄 Page loaded');

      // Wait for article cards to load
      await page.waitForSelector('div[class*="article-card"]', { timeout: 15000 });

      // Step 2: Extract all article links from article-card divs
      const dateWithoutSlash = date.replace('/', '');
      const targetPattern = `ty-gia-usd-hom-nay-${dateWithoutSlash}`;

      console.log(`🔍 Looking for pattern: ${targetPattern}`);

      const result = await page.evaluate((pattern) => {
        // Get all article cards
        const articleCards = document.querySelectorAll('div[class*="article-card"]');
        const foundLinks = [];

        // Loop through each card and check link
        for (const card of articleCards) {
          const link = card.querySelector('a');
          if (link) {
            const href = link.getAttribute('href');
            if (href) {
              foundLinks.push(href);

              // Make href absolute if it's relative
              const absoluteHref = href.startsWith('http') ? href : `https://vov.vn${href}`;

              // Check if link matches our criteria
              if (absoluteHref.includes('/thi-truong/ty-gia/') &&
                  absoluteHref.includes(pattern)) {
                return { success: true, url: absoluteHref, allLinks: foundLinks };
              }
            }
          }
        }

        return { success: false, url: null, allLinks: foundLinks };
      }, targetPattern);

      console.log(`📋 Found ${result.allLinks.length} article links`);
      if (result.allLinks.length > 0) {
        console.log('🔗 First 5 links:', result.allLinks.slice(0, 5));
      }

      const articleUrl = result.success ? result.url : null;

      if (!articleUrl) {
        await browser.close();

        const notFoundMessage = `Không tìm thấy bài viết tỷ giá USD cho ngày ${date} trên VOV.`;

        return res.json({
          success: true,
          data: {
            date: date,
            content: notFoundMessage
          }
        });
      }

      console.log(`✅ Found article: ${articleUrl}`);

      // Step 3: Navigate to the article page
      await page.goto(articleUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      console.log('📄 Article page loaded');

      // Step 4: Extract content from article-summary
      await page.waitForSelector('div.row.article-summary', { timeout: 15000 });

      const summaryContent = await page.evaluate(() => {
        const summaryDiv = document.querySelector('div.row.article-summary');
        if (summaryDiv) {
          // Get text content, remove extra whitespace
          return summaryDiv.textContent.trim().replace(/\s+/g, ' ');
        }
        return '';
      });

      await browser.close();

      // Format the output
      const formattedContent = `Ngày: ${date}
Link bài viết: ${articleUrl}
Nội dung tóm tắt:
"${summaryContent}"`;

      console.log('✅ Successfully extracted article content');

      res.json({
        success: true,
        data: {
          date: date,
          content: formattedContent
        }
      });

    } catch (pageError) {
      await browser.close();
      throw pageError;
    }

  } catch (error) {
    console.error('❌ Error extracting VOV article:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi trích xuất bài viết VOV: ${error.message}`,
      error: error.message
    });
  }
});

// Endpoint: Summarize exchange rate data using Gemini
router.post('/summarize-exchange-rate', async (req, res) => {
  try {
    console.log('\n🤖 Summarizing exchange rate data with Gemini...');

    const { centralRateText, chartData, freeMarketData } = req.body;

    if (!centralRateText || !chartData || !freeMarketData) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu dữ liệu đầu vào (centralRateText, chartData, freeMarketData)'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY not configured'
      });
    }

    // Build the prompt
    const prompt = `Bạn là một chuyên gia phân tích tài chính, viết nhận xét tỷ giá USD theo phong cách báo chí kinh tế Việt Nam (trung lập, súc tích, chính xác số liệu).

INPUT:

1) Thông tin tỷ giá trung tâm Ngân hàng Nhà nước (central_rate_text):
"""
${centralRateText}
"""

2) Dữ liệu biểu đồ tỷ giá USD tại các ngân hàng thương mại (chart_data):
- buyRates: ${JSON.stringify(chartData.buyRates)}
- sellRates: ${JSON.stringify(chartData.sellRates)}
- labels: ${JSON.stringify(chartData.labels)}
- currency: ${chartData.currency}

3) Dữ liệu tỷ giá thị trường tự do (free_market_data):
- Mua vào: ${freeMarketData.buyPrice} (${freeMarketData.buyChange})
- Bán ra: ${freeMarketData.sellPrice} (${freeMarketData.sellChange})

-------------------------
YÊU CẦU PHÂN TÍCH
-------------------------

Hãy tạo phần nhận xét HOÀN CHỈNH, TUÂN THỦ ĐÚNG THỨ TỰ và KHÔNG thêm dữ liệu ngoài input.

Nội dung gồm 4 ý, được trình bày DƯỚI DẠNG GẠCH ĐẦU DÒNG:

(1) NHẬN XÉT XU HƯỚNG CHUNG CỦA TỶ GIÁ USD
- Nhận xét xu hướng TỔNG THỂ của tỷ giá USD trong giai đoạn này
- Tổng hợp đồng thời:
  + Định hướng từ tỷ giá trung tâm Ngân hàng Nhà nước
  + Diễn biến tại các ngân hàng thương mại
  + Biến động của thị trường tự do
- Đánh giá xu hướng chung: ổn định / tăng nhẹ / giảm nhẹ / biến động
- Không nêu số chi tiết, chỉ mô tả xu hướng

(2) TỶ GIÁ TRUNG TÂM NGÂN HÀNG NHÀ NƯỚC
- ƯU TIÊN GIỮ NGUYÊN VĂN CÂU có chứa cụm "tỷ giá trung tâm" từ input (central_rate_text)
- Chỉ chỉnh sửa tối thiểu để câu văn trôi chảy (nếu cần)
- Không suy diễn thêm

(3) NHẬN XÉT TỶ GIÁ TẠI CÁC NGÂN HÀNG THƯƠNG MẠI
Gồm đúng 2 câu trong cùng một gạch đầu dòng:

- Câu 1: Nhận xét chung toàn bộ diễn biến của buyRates và sellRates
  + Ổn định / biến động nhẹ / tăng dần / giảm dần

- Câu 2: Nhận xét riêng NGÀY CUỐI CÙNG của biểu đồ
  + Lấy ngày cuối cùng trong labels
  + So sánh với ngày liền trước đó
  + Nêu rõ tăng / giảm / đi ngang (mức độ nhẹ)

(4) NHẬN XÉT TỶ GIÁ THỊ TRƯỜNG TỰ DO
- Viết 1 câu ngắn gọn
- BẮT BUỘC có:
  + Giá mua vào
  + Giá bán ra
  + Mức biến động
- Nếu biến động âm → nhận xét theo hướng GIẢM / KÉM TÍCH CỰC
- Nếu biến động dương → nhận xét theo hướng TĂNG / TÍCH CỰC

-------------------------
YÊU CẦU OUTPUT
-------------------------

- Trình bày dưới dạng GẠCH ĐẦU DÒNG
- Mỗi gạch đầu dòng tương ứng đúng 1 ý (1) → (4)
- Văn phong báo chí tài chính
- Không đánh số
- Không giải thích cách phân tích
- Không thêm nhận định ngoài dữ liệu đã cho
- Tổng độ dài: 4–6 câu
- CHỈ TRẢ VỀ PHẦN NỘI DUNG NHẬN XÉT`;

    console.log('📝 Calling Gemini API for summary...');

    // Call Gemini API
    const axios = require('axios');
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await axios.post(geminiUrl, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Extract response
    if (!response.data.candidates || response.data.candidates.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Không nhận được phản hồi từ Gemini'
      });
    }

    const candidate = response.data.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Không có dữ liệu trong phản hồi từ Gemini'
      });
    }

    const summary = candidate.content.parts[0].text;
    console.log('✅ Summary generated successfully');

    res.json({
      success: true,
      data: {
        summary: summary
      }
    });

  } catch (error) {
    console.error('❌ Error summarizing exchange rate:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi tóm tắt tỷ giá: ${error.message}`,
      error: error.message
    });
  }
});

// Endpoint: Summarize gold price data using Gemini
router.post('/summarize-gold-price', async (req, res) => {
  try {
    console.log('\n🤖 Summarizing gold price data with Gemini...');

    const { xauUsdData, chartData } = req.body;

    if (!xauUsdData || !chartData) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu dữ liệu đầu vào (xauUsdData, chartData)'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY not configured'
      });
    }

    // Build the prompt
    const prompt = `Bạn là một chuyên gia phân tích thị trường vàng, chuyên viết nhận định ngắn gọn, chính xác với văn phong báo cáo tài chính – kinh tế.

NHIỆM VỤ: 
Dựa trên 2 nguồn dữ liệu đầu vào gồm:
1) Giá vàng thế giới (XAU/USD)
2) Biểu đồ giá vàng miếng SJC tại Việt Nam

Hãy tạo một đoạn nhận xét HOÀN CHỈNH, TUÂN THỦ ĐÚNG THỨ TỰ và KHÔNG thêm thông tin ngoài input.

========================
DỮ LIỆU ĐẦU VÀO
========================

1. DỮ LIỆU GIÁ VÀNG THẾ GIỚI (XAU/USD):
- price: ${xauUsdData.price} USD/ounce
- change: ${xauUsdData.change}
- changePercent: ${xauUsdData.changePercent}
- direction: ${xauUsdData.direction}
- timestamp: ${xauUsdData.timestamp}

Trong đó:
- price: giá hiện tại (USD/ounce)
- change: mức thay đổi so với phiên chốt trước
- changePercent: phần trăm thay đổi
- direction: "up" hoặc "down"
- timestamp: thời điểm ghi nhận

2. DỮ LIỆU BIỂU ĐỒ GIÁ VÀNG MIẾNG SJC:
- buyRates: ${JSON.stringify(chartData.buyRates)}
- sellRates: ${JSON.stringify(chartData.sellRates)}
- labels: ${JSON.stringify(chartData.labels)}
- goldType: ${chartData.goldType}

Trong đó:
- buyRates và sellRates là các mảng giá theo từng ngày
- labels là mảng ngày tương ứng (định dạng dd/mm)
- Phần tử cuối cùng của mỗi mảng là ngày mới nhất
- Phần tử liền trước là phiên giao dịch trước đó

========================
YÊU CẦU PHÂN TÍCH (BẮT BUỘC)
========================

Hãy tạo một đoạn nhận xét HOÀN CHỈNH, TUÂN THỦ ĐÚNG THỨ TỰ và KHÔNG thêm thông tin ngoài input.

Nội dung bắt buộc gồm 3 phần sau, trình bày trong MỘT ĐOẠN VĂN LIỀN MẠCH:

1. NHẬN XÉT XU HƯỚNG CHUNG:
- Nhận xét xu hướng tổng thể của giá vàng trong nước và thế giới trong toàn bộ giai đoạn dữ liệu
- Chỉ dựa trên dữ liệu được cung cấp
- Sử dụng các cụm từ: ổn định, biến động nhẹ, biến động mạnh, tăng dần, giảm dần, điều chỉnh

2. NHẬN XÉT GIÁ VÀNG THẾ GIỚI:
- Viết đúng 1 câu
- Bắt buộc nêu:
  + Giá vàng hiện tại (USD/ounce)
  + Mức tăng hoặc giảm tuyệt đối
  + Phần trăm thay đổi
- Dựa vào change, changePercent hoặc direction để đưa ra nhận xét:
  + Nếu direction = "down", biến động âm  → nhận xét theo hướng kém tích cực / chịu áp lực điều chỉnh
  + Nếu direction = "up", biến động dương → nhận xét theo hướng tích cực / hỗ trợ đà tăng

3. NHẬN XÉT GIÁ VÀNG MIẾNG SJC:
Gồm đúng 2 câu:

- Câu 1: Nhận xét chung toàn bộ diễn biến của biểu đồ
  + Dựa trên mức độ dao động của buyRates và sellRates
  + Nhận xét theo các trạng thái: ổn định / biến động nhẹ / tăng dần / giảm dần

- Câu 2: Tập trung vào NGÀY CUỐI CÙNG của biểu đồ
  + Lấy ngày cuối cùng trong labels
  + So sánh buyRates và sellRates của ngày cuối cùng với ngày liền trước đó
  + Chỉ rõ tăng / giảm / đi ngang và mức độ (nhẹ / không đáng kể)
  + Sử dụng đơn vị triệu đồng/lượng

========================
YÊU CẦU OUPUT (BẮT BUỘC)
========================

- Trình bày dưới dạng GẠCH ĐẦU DÒNG
- Mỗi gạch đầu dòng tương ứng đúng 1 ý (1) → (3)
- Văn phong báo chí tài chính
- Không đánh số
- Không giải thích cách phân tích
- Không thêm nhận định ngoài dữ liệu đã cho
- Tổng độ dài: 4–6 câu
- CHỈ TRẢ VỀ PHẦN NỘI DUNG NHẬN XÉT`;

    console.log('📝 Calling Gemini API for gold price summary...');

    // Call Gemini API
    const axios = require('axios');
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await axios.post(geminiUrl, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Extract response
    if (!response.data.candidates || response.data.candidates.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Không nhận được phản hồi từ Gemini'
      });
    }

    const candidate = response.data.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Không có dữ liệu trong phản hồi từ Gemini'
      });
    }

    const summary = candidate.content.parts[0].text;
    console.log('✅ Gold price summary generated successfully');

    res.json({
      success: true,
      data: {
        summary: summary
      }
    });

  } catch (error) {
    console.error('❌ Error summarizing gold price:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi khi tóm tắt giá vàng: ${error.message}`,
      error: error.message
    });
  }
});

module.exports = router;
