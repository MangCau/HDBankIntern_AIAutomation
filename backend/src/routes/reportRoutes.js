const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const NewProductService = require('../models/NewProductService');
const BankingMarketTrend = require('../models/BankingMarketTrend');
const FintechNews = require('../models/FintechNews');

// Helper function to map collection name to category display name
const getCategoryName = (collectionName) => {
  const mapping = {
    'new_product_service': 'Sản phẩm & dịch vụ mới',
    'banking_market_trends': 'Xu hướng thị trường ngân hàng',
    'fintech_news': 'Tin tức ngành fintech'
  };
  return mapping[collectionName] || collectionName;
};

// Helper function to convert ISO date to DD/MM/YYYY
const convertISOToVN = (isoDate) => {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

// POST /api/reports/create - Create a new report from selected items
router.post('/create', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    // Fetch all selected items from all collections
    const [newProducts, marketTrends, fintechNews] = await Promise.all([
      NewProductService.find({ selected: true }),
      BankingMarketTrend.find({ selected: true }),
      FintechNews.find({ selected: true })
    ]);

    // Transform items to report format
    const reportItems = [];

    // Add NewProductService items
    newProducts.forEach(item => {
      reportItems.push({
        category: getCategoryName('new_product_service'),
        originalCollection: 'new_product_service',
        bank: item.bank,
        product_name: item.product_name,
        product_segment: item.product_segment,
        description: item.description,
        image: item.image,
        date_published: item.date_published,
        source_type: item.source_type,
        source_url: item.source_url,
        pdf_file_name: item.pdf_file_name
      });
    });

    // Add BankingMarketTrend items
    marketTrends.forEach(item => {
      reportItems.push({
        category: getCategoryName('banking_market_trends'),
        originalCollection: 'banking_market_trends',
        topic_group: item.topic_group,
        title: item.title,
        summary: item.summary,
        bank_related: item.bank_related,
        image: item.image,
        published_date: item.published_date,
        source_type: item.source_type,
        source_url: item.source_url,
        pdf_file_name: item.pdf_file_name
      });
    });

    // Add FintechNews items
    fintechNews.forEach(item => {
      reportItems.push({
        category: getCategoryName('fintech_news'),
        originalCollection: 'fintech_news',
        fintech_topic: item.fintech_topic,
        area_affected: item.area_affected,
        title: item.title,
        summary: item.summary,
        organization: item.organization,
        image: item.image,
        published_date: item.published_date,
        source_type: item.source_type,
        source_url: item.source_url,
        pdf_file_name: item.pdf_file_name
      });
    });

    // Create date range string
    const dateRange = `${convertISOToVN(startDate)} - ${convertISOToVN(endDate)}`;

    // Create new report
    const report = new Report({
      dateRange,
      startDate,
      endDate,
      items: reportItems,
      totalItems: reportItems.length
    });

    await report.save();

    // Set all selected items back to false
    await Promise.all([
      NewProductService.updateMany({ selected: true }, { selected: false }),
      BankingMarketTrend.updateMany({ selected: true }, { selected: false }),
      FintechNews.updateMany({ selected: true }, { selected: false })
    ]);

    res.json({
      success: true,
      message: 'Report created successfully',
      report: {
        id: report._id,
        dateRange: report.dateRange,
        totalItems: report.totalItems,
        createdAt: report.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create report',
      details: error.message
    });
  }
});

// GET /api/reports/latest - Get the most recent report
router.get('/latest', async (req, res) => {
  try {
    const latestReport = await Report.findOne()
      .sort({ createdAt: -1 })
      .limit(1);

    if (!latestReport) {
      return res.status(404).json({
        success: false,
        error: 'No reports found'
      });
    }

    res.json({
      success: true,
      data: latestReport
    });

  } catch (error) {
    console.error('Error fetching latest report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest report',
      details: error.message
    });
  }
});

// GET /api/reports/:id - Get a specific report by ID
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report',
      details: error.message
    });
  }
});

// GET /api/reports - Get all reports (paginated)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('dateRange totalItems createdAt startDate endDate'),
      Report.countDocuments()
    ]);

    res.json({
      success: true,
      data: reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      details: error.message
    });
  }
});

// DELETE /api/reports/:id - Delete a report
router.delete('/:id', async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete report',
      details: error.message
    });
  }
});

module.exports = router;
