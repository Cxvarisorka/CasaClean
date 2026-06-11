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
    required: [true, 'Please provide a rating between 1 and 5'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating must be at most 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number!'
    }
  },
  review_text: {
    type: String,
    required: [true, 'Review text cannot be empty'],
    trim: true,
    maxlength: [500, 'Review text cannot exceed 500 characters']
  }
}, { 
  timestamps: true,
  collection: 'reviews'
});

reviewSchema.index({ service_id: 1, user: 1 }, { unique: true });


const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;