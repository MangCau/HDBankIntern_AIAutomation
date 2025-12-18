const mongoose = require('mongoose');

const fintechNewsSchema = new mongoose.Schema({
  fintech_topic: String,
  area_affected: mongoose.Schema.Types.Mixed, // Support both String and Array
  title: {
    type: String,
    required: true
  },

  summary: String,
  organization: String,
  image: String,
  selected:Boolean,
  // impact_area: String,
  source_of_detail: String,
  reportSelected: Boolean,
  detail_content: String,
  url_category_precheck: String,
  source_type: String,
  source_url: String,
  published_date: mongoose.Schema.Types.Mixed, // Support both String and Date
  // extracted_from_pdf: Boolean,
  pdf_file_name: String,
  id_processed: String, // ID for n8n reprocessing
  // timestamp: Date
}, {
  collection: 'fintech_news',
  timestamps: false
});

module.exports = mongoose.model('FintechNews', fintechNewsSchema);
