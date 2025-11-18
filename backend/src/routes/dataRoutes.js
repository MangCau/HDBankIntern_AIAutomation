const express = require('express');
const router = express.Router();
const NewProductService = require('../models/NewProductService');
const BankingMarketTrend = require('../models/BankingMarketTrend');
const FintechNews = require('../models/FintechNews');

// Get all new products and services
router.get('/new-products', async (req, res) => {
  try {
    const data = await NewProductService.find().sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all banking market trends
router.get('/market-trends', async (req, res) => {
  try {
    const data = await BankingMarketTrend.find().sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all fintech news
router.get('/fintech-news', async (req, res) => {
  try {
    const data = await FintechNews.find().sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all data from all collections
router.get('/all', async (req, res) => {
  try {
    const [newProducts, marketTrends, fintechNews] = await Promise.all([
      NewProductService.find().sort({ timestamp: -1 }).limit(20),
      BankingMarketTrend.find().sort({ timestamp: -1 }).limit(20),
      FintechNews.find().sort({ timestamp: -1 }).limit(20)
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

module.exports = router;
