const mongoose = require('mongoose');

const newProductServiceSchema = new mongoose.Schema({
  bank: [String],
  product_name: {
    type: String,
    required: true
  },
  product_segment: String,
  product_category: String,
  description: String,
  date_published: Date,
  source_type: String,
  source_url: String,
  pdf_file_name: String,
  timestamp: Date
}, {
  collection: 'new_product_service',
  timestamps: false
});

module.exports = mongoose.model('NewProductService', newProductServiceSchema);
