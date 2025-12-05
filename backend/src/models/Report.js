const mongoose = require('mongoose');

const reportItemSchema = new mongoose.Schema({
  // Category/Collection name
  category: {
    type: String,
    required: true,
    enum: ['Sản phẩm & dịch vụ mới', 'Xu hướng thị trường ngân hàng', 'Tin tức ngành fintech']
  },

  // Original collection name for reference
  originalCollection: {
    type: String,
    enum: ['new_product_service', 'banking_market_trends', 'fintech_news']
  },

  // Common fields across all types
  image: String,
  source_type: String,
  source_url: String,
  pdf_file_name: String,

  // Fields from NewProductService
  bank: mongoose.Schema.Types.Mixed,
  product_name: String,
  product_segment: String,
  description: String,
  date_published: mongoose.Schema.Types.Mixed,

  // Fields from BankingMarketTrend
  topic_group: String,
  title: String,
  summary: String,
  bank_related: mongoose.Schema.Types.Mixed,
  published_date: mongoose.Schema.Types.Mixed,

  // Fields from FintechNews
  fintech_topic: String,
  area_affected: mongoose.Schema.Types.Mixed,
  organization: String
}, { _id: false });

const reportSchema = new mongoose.Schema({
  // Date range string (e.g., "01/11/2024 - 30/11/2024")
  dateRange: {
    type: String,
    required: true
  },

  // Parsed start and end dates for querying
  startDate: {
    type: String,
    required: true
  },

  endDate: {
    type: String,
    required: true
  },

  // Array of report items
  items: [reportItemSchema],

  // Metadata
  totalItems: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'reports',
  timestamps: true
});

// Create index for efficient querying by date range
reportSchema.index({ startDate: 1, endDate: 1 });
reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
