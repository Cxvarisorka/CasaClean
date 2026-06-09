const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  service_id: {
    type: Number, 
    required: [true, 'Review must belong to a service.']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User', 
    required: [true, 'Review must belong to a user']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, 'Please provide a rating between 1 and 5']
  },
  review_text: {
    type: String,
    required: [true, 'Review text cannot be empty'],
    trim: true
  }
}, { 
  timestamps: true,
  collection: 'reviews'
});

reviewSchema.index({ service_id: 1, user: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;