const mongoose = require('mongoose');

const bankingMarketTrendSchema = new mongoose.Schema({
  topic_group: String,
  title: {
    type: String,
    required: true
  },
  summary: String,
  bank_related: mongoose.Schema.Types.Mixed, // Support both String and Array
  // impact_level: String,
  image: String,
  selected:Boolean,
  source_type: String,
  source_url: String,
  published_date: mongoose.Schema.Types.Mixed, // Support both String and Date
  // extracted_from_pdf: Boolean,
  pdf_file_name: String,
  // timestamp: Date
}, {
  collection: 'banking_market_trends',
  timestamps: false
});

module.exports = mongoose.model('BankingMarketTrend', bankingMarketTrendSchema);
