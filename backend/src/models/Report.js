const mongoose = require('mongoose');

// Schema for Page 1 items (selected news with reportSelected = true)
const page1ItemSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  category: {
    type: String,
    enum: ['new-products', 'market-trends', 'fintech-news']
  },

  // Common fields
  image: [String],
  source_type: String,
  source_url: String,
  pdf_file_name: String,
  selected: Boolean,
  reportSelected: Boolean,
  detail_content: String,
  source_of_detail: String,
  topic_classification: String,

  // Fields from NewProductService
  bank: mongoose.Schema.Types.Mixed,
  product_name: String,
  product_segment: [String],
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

// Schema for Page 2 - Content Card
const contentCardSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  product_name: String,
  image: String, // image[1]
  detail_content: String,
  source_of_detail: String
}, { _id: false });

// Schema for Page 2 - Comparison Table
const comparisonTableSchema = new mongoose.Schema({
  uniqueBanks: [String],
  productsByCategory: mongoose.Schema.Types.Mixed // Record<string, Array<{level2: string, banks: string[]}>>
}, { _id: false });

// Schema for Page 2
const page2Schema = new mongoose.Schema({
  comparisonTable: comparisonTableSchema,
  summaryList: [String], // Array of product names from summary list
  contentCards: [contentCardSchema]
}, { _id: false });

// Schema for Page 3 - Topic Group
const page3GroupSchema = new mongoose.Schema({
  topic_group: String,
  items: [{
    _id: mongoose.Schema.Types.ObjectId,
    title: String,
    detail_content: String,
    source_of_detail: String
  }],
  images: [String], // Array of uploaded/dropped images (base64)
  manualContent: String // Content from empty groups (Tỷ giá, Giá vàng)
}, { _id: false });

// Schema for Page 4 - Area Affected
const page4GroupSchema = new mongoose.Schema({
  area_affected: String,
  items: [{
    _id: mongoose.Schema.Types.ObjectId,
    title: String,
    detail_content: String,
    source_of_detail: String
  }],
  images: [String] // Array of uploaded/dropped images (base64)
}, { _id: false });

const reportSchema = new mongoose.Schema({
  // Date range information
  startDate: {
    type: String,
    required: true
  },
  endDate: {
    type: String,
    required: true
  },
  dateRange: {
    type: String,
    required: true
  },

  // Page 1: All selected items with reportSelected = true
  page1: [page1ItemSchema],

  // Page 2: Product information
  page2: page2Schema,

  // Page 3: Banking trends grouped by topic_group
  page3: [page3GroupSchema],

  // Page 4: Fintech news grouped by area_affected
  page4: [page4GroupSchema],

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
