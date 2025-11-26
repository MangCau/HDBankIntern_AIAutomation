const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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

module.exports = router;
