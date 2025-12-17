const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const NewProductService = require('../models/NewProductService');
const BankingMarketTrend = require('../models/BankingMarketTrend');
const FintechNews = require('../models/FintechNews');
const HeaderProcessing = require('../models/HeaderProcessing');
const { uploadBase64Image } = require('../utils/gcs');

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

// Helper function to calculate approximate size of object in bytes
const getObjectSize = (obj) => {
  return JSON.stringify(obj).length;
};

// Helper function to truncate content if too large
const truncateContent = (content, maxLength = 50000) => {
  if (!content) return content;
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '\n\n[Nội dung đã bị cắt ngắn do quá dài...]';
};

// Helper function to limit images array
const limitImages = (images, maxImages = 3) => {
  if (!Array.isArray(images)) return images;
  return images.slice(0, maxImages);
};

// POST /api/reports/create - Create a new report from selected items
router.post('/create', async (req, res) => {
  try {
    const { startDate, endDate, page3Images, page4Images, emptyGroupContent } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    // Upload all base64 images to GCS and replace with URLs
    const uploadedPage3Images = {};
    if (page3Images) {
      for (const [key, images] of Object.entries(page3Images)) {
        if (Array.isArray(images)) {
          const uploadPromises = images.map(base64Image =>
            uploadBase64Image(base64Image, 'report-images/page3')
          );
          uploadedPage3Images[key] = await Promise.all(uploadPromises);
        }
      }
    }

    const uploadedPage4Images = {};
    if (page4Images) {
      for (const [key, images] of Object.entries(page4Images)) {
        if (Array.isArray(images)) {
          const uploadPromises = images.map(base64Image =>
            uploadBase64Image(base64Image, 'report-images/page4')
          );
          uploadedPage4Images[key] = await Promise.all(uploadPromises);
        }
      }
    }

    // Fetch all items with selected=true (regardless of reportSelected) from all collections
    const [newProducts, marketTrends, fintechNews] = await Promise.all([
      NewProductService.find({ selected: true }),
      BankingMarketTrend.find({ selected: true }),
      FintechNews.find({ selected: true })
    ]);

    // ========== PAGE 1: All selected items (regardless of reportSelected) ==========
    const page1Items = [];

    // Add NewProductService items to page1
    newProducts.forEach(item => {
      page1Items.push({
        _id: item._id,
        category: 'new-products',
        image: item.image, // Now a single String
        source_type: item.source_type,
        source_url: item.source_url,
        pdf_file_name: item.pdf_file_name,
        selected: item.selected,
        reportSelected: item.reportSelected,
        detail_content: truncateContent(item.detail_content, 30000), // Max 30KB per item
        source_of_detail: item.source_of_detail,
        topic_classification: item.topic_classification,
        bank: item.bank,
        product_name: item.product_name,
        product_segment: item.product_segment,
        description: item.description,
        date_published: item.date_published
      });
    });

    // Add BankingMarketTrend items to page1
    marketTrends.forEach(item => {
      page1Items.push({
        _id: item._id,
        category: 'market-trends',
        image: item.image, // Now a single String
        source_type: item.source_type,
        source_url: item.source_url,
        pdf_file_name: item.pdf_file_name,
        selected: item.selected,
        reportSelected: item.reportSelected,
        detail_content: truncateContent(item.detail_content, 30000), // Max 30KB per item
        source_of_detail: item.source_of_detail,
        topic_classification: item.topic_classification,
        topic_group: item.topic_group,
        title: item.title,
        summary: item.summary,
        bank_related: item.bank_related,
        published_date: item.published_date
      });
    });

    // Add FintechNews items to page1
    fintechNews.forEach(item => {
      page1Items.push({
        _id: item._id,
        category: 'fintech-news',
        image: item.image, // Now a single String
        source_type: item.source_type,
        source_url: item.source_url,
        pdf_file_name: item.pdf_file_name,
        selected: item.selected,
        reportSelected: item.reportSelected,
        detail_content: truncateContent(item.detail_content, 30000), // Max 30KB per item
        source_of_detail: item.source_of_detail,
        topic_classification: item.topic_classification,
        title: item.title,
        summary: item.summary,
        fintech_topic: item.fintech_topic,
        area_affected: item.area_affected,
        organization: item.organization
      });
    });

    // ========== PAGE 2: Product information ==========
    // Comparison Table
    const uniqueBanks = Array.from(new Set(
      newProducts.map(p => Array.isArray(p.bank) ? p.bank.join(', ') : p.bank)
    )).filter(Boolean);

    const productsByCategory = {};
    newProducts.forEach(product => {
      if (product.product_segment && product.product_segment.length >= 2) {
        const level1 = product.product_segment[0];
        const level2 = product.product_segment[1];
        const bankName = Array.isArray(product.bank) ? product.bank.join(', ') : product.bank;

        if (!productsByCategory[level1]) {
          productsByCategory[level1] = [];
        }

        const existingLevel2 = productsByCategory[level1].find(item => item.level2 === level2);
        if (existingLevel2) {
          if (!existingLevel2.banks.includes(bankName)) {
            existingLevel2.banks.push(bankName);
          }
        } else {
          productsByCategory[level1].push({
            level2,
            banks: [bankName]
          });
        }
      }
    });

    // Summary List: Get description (summary) from all new-products items with selected=true
    // Note: newProducts already contains only selected=true items (regardless of reportSelected)
    const summaryList = newProducts
      .filter(item => item.description && item.description.trim() !== '') // Only items with description
      .map(item => item.description);

    // Content Cards: All products with _id, product_name, image, detail_content, source_of_detail
    const contentCards = newProducts.map(item => ({
      _id: item._id,
      product_name: item.product_name,
      image: item.image || '', // Now a single String
      detail_content: truncateContent(item.detail_content, 30000), // Max 30KB per card
      source_of_detail: item.source_of_detail
    }));

    const page2 = {
      comparisonTable: {
        uniqueBanks,
        productsByCategory
      },
      summaryList,
      contentCards
    };

    // ========== PAGE 3: Banking trends grouped by topic_group ==========
    const topicGroupMap = {};

    marketTrends.forEach(item => {
      const topicGroup = item.topic_group || 'Khác';
      if (!topicGroupMap[topicGroup]) {
        topicGroupMap[topicGroup] = [];
      }
      topicGroupMap[topicGroup].push({
        _id: item._id,
        title: item.title,
        detail_content: truncateContent(item.detail_content, 30000), // Max 30KB per item
        source_of_detail: item.source_of_detail
      });
    });

    // Always include "Tỷ giá" and "Giá vàng" groups
    if (!topicGroupMap['Tỷ giá']) {
      topicGroupMap['Tỷ giá'] = [];
    }
    if (!topicGroupMap['Giá vàng']) {
      topicGroupMap['Giá vàng'] = [];
    }

    const page3 = Object.entries(topicGroupMap).map(([topicGroup, items]) => ({
      topic_group: topicGroup,
      items,
      images: uploadedPage3Images && uploadedPage3Images[topicGroup] ? limitImages(uploadedPage3Images[topicGroup], 2) : [], // Max 2 images per group, now GCS URLs
      manualContent: emptyGroupContent && emptyGroupContent[topicGroup] ? truncateContent(emptyGroupContent[topicGroup], 30000) : '' // Max 30KB
    }));

    // ========== PAGE 4: Fintech news grouped by area_affected ==========
    const areaAffectedMap = {};

    fintechNews.forEach(item => {
      let areaAffected;
      if (Array.isArray(item.area_affected)) {
        areaAffected = item.area_affected.length > 0 ? item.area_affected[0] : 'Khác';
      } else {
        areaAffected = item.area_affected || 'Khác';
      }

      if (!areaAffectedMap[areaAffected]) {
        areaAffectedMap[areaAffected] = [];
      }
      areaAffectedMap[areaAffected].push({
        _id: item._id,
        title: item.title,
        detail_content: truncateContent(item.detail_content, 30000), // Max 30KB per item
        source_of_detail: item.source_of_detail
      });
    });

    const page4 = Object.entries(areaAffectedMap).map(([area_affected, items]) => ({
      area_affected,
      items,
      images: uploadedPage4Images && uploadedPage4Images[area_affected] ? limitImages(uploadedPage4Images[area_affected], 2) : [] // Max 2 images per group, now GCS URLs
    }));

    // Create date range string
    const dateRange = `${convertISOToVN(startDate)} - ${convertISOToVN(endDate)}`;

    // Create new report with 4-page structure
    const reportData = {
      dateRange,
      startDate,
      endDate,
      page1: page1Items,
      page2,
      page3,
      page4,
      totalItems: page1Items.length
    };

    // Check total size before saving
    const reportSize = getObjectSize(reportData);
    const maxSize = 16 * 1024 * 1024; // 16MB MongoDB limit
    console.log(`📊 Report size: ${(reportSize / 1024 / 1024).toFixed(2)} MB`);

    if (reportSize > maxSize) {
      console.error(`❌ Report too large: ${(reportSize / 1024 / 1024).toFixed(2)} MB (max: 16 MB)`);
      return res.status(413).json({
        success: false,
        error: 'Report data too large',
        details: `Report size (${(reportSize / 1024 / 1024).toFixed(2)} MB) exceeds MongoDB limit (16 MB). Please reduce the number of items or image sizes.`
      });
    }

    const report = new Report(reportData);
    await report.save();

    // Reset both selected and reportSelected to false after saving report
    // (The states are already saved in the report, ready for next report cycle)
    // Also reset selected in HeaderProcessing collection
    await Promise.all([
      NewProductService.updateMany({ selected: true }, { selected: false, reportSelected: false }),
      BankingMarketTrend.updateMany({ selected: true }, { selected: false, reportSelected: false }),
      FintechNews.updateMany({ selected: true }, { selected: false, reportSelected: false }),
      HeaderProcessing.updateMany({ selected: true }, { selected: false })
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
