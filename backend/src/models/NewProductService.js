const mongoose = require('mongoose');

const newProductServiceSchema = new mongoose.Schema({
  bank: mongoose.Schema.Types.Mixed, // Support both String and Array
  product_name: {
    type: String,
    required: true
  },
  product_segment: String,
  // product_category: String,
  description: String,
  image: String,
  selected:Boolean,
  date_published: mongoose.Schema.Types.Mixed, // Support both String and Date
  source_type: String,
  source_url: String,
  pdf_file_name: String,
  // timestamp: Date
}, {
  collection: 'new_product_service',
  timestamps: false
});

module.exports = mongoose.model('NewProductService', newProductServiceSchema);
