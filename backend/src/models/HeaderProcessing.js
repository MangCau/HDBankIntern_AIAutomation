const mongoose = require('mongoose');

const headerProcessingSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true
  },
  chunk: {
    type: String,
    required: true
  },
  source_name: String,
  source_date: String,
  selected: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'header_processing',
  timestamps: false
});

module.exports = mongoose.model('HeaderProcessing', headerProcessingSchema);
