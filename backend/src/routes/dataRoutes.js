const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const NewProductService = require('../models/NewProductService');
const BankingMarketTrend = require('../models/BankingMarketTrend');
const FintechNews = require('../models/FintechNews');
const HeaderProcessing = require('../models/HeaderProcessing');

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
    const { selected } = req.body;

    const updated = await HeaderProcessing.findByIdAndUpdate(
      id,
      { selected },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
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
    const { image } = req.body;

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

    const updated = await Model.findByIdAndUpdate(
      id,
      { image },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a specific field for an item in any of the 3 tables
router.patch('/update-field/:collection/:id', checkDbConnection, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const { field, value } = req.body;

    // Validate field and value are provided
    if (!field || value === undefined || value === null) {
      return res.status(400).json({ success: false, message: 'Field and value are required' });
    }

    // Determine which model to use
    let Model;
    let allowedFields;
    switch (collection) {
      case 'new-products':
        Model = NewProductService;
        allowedFields = ['product_name', 'description', 'selected'];
        break;
      case 'market-trends':
        Model = BankingMarketTrend;
        allowedFields = ['title', 'summary', 'selected'];
        break;
      case 'fintech-news':
        Model = FintechNews;
        allowedFields = ['title', 'summary', 'selected'];
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

    // Update the item with the generated image
    const updated = await Model.findByIdAndUpdate(
      id,
      { image: base64Image },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Image generated successfully',
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

module.exports = router;
