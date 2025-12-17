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

module.exports = router;
