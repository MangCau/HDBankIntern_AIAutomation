const mongoose = require('mongoose');

const fintechNewsSchema = new mongoose.Schema({
  fintech_topic: String,
  title: {
    type: String,
    required: true
  },
  summary: String,
  organization: String,
  impact_area: String,
  source_type: String,
  source_url: String,
  published_date: Date,
  extracted_from_pdf: Boolean,
  pdf_file_name: String,
  timestamp: Date
}, {
  collection: 'fintech_news',
  timestamps: false
});

module.exports = mongoose.model('FintechNews', fintechNewsSchema);
