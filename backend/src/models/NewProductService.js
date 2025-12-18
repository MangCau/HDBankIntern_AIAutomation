const mongoose = require('mongoose');

const newProductServiceSchema = new mongoose.Schema({
  bank: mongoose.Schema.Types.Mixed, // Support both String and Array
  product_name: {
    type: String,
    required: true
  },
  product_segment: [String], // Array of strings with 2 items: [category, subcategory]
  // product_category: String,
  description: String,
  image: String,
  selected:Boolean,
  source_of_detail: String,
  reportSelected: Boolean,
  detail_content: String,
  url_category_precheck: String,
  date_published: mongoose.Schema.Types.Mixed, // Support both String and Date
  source_type: String,
  source_url: String,
  pdf_file_name: String,
  id_processed: String, // ID for n8n reprocessing
  // timestamp: Date
}, {
  collection: 'new_product_service',
  timestamps: false
});

module.exports = mongoose.model('NewProductService', newProductServiceSchema);
