const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // The completed booking this review is for. Reviews are per-booking: a
  // customer can rate EVERY completed booking they had, even repeat bookings of
  // the same service. `unique` enforces at most one review per booking (the
  // controller also checks first, this is the race-safe backstop).
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking',
    required: [true, 'Review must belong to a booking.'],
    unique: true
  },
  // Denormalised from the booking so the public per-service listing and admin
  // aggregation can query by service without joining through bookings.
  service_id: {
    type: mongoose.Schema.ObjectId,
    ref: 'Service',
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

// Public per-service listing, newest first.
reviewSchema.index({ service_id: 1, createdAt: -1 });
// "My reviews" — resolve which of a user's bookings are already rated.
reviewSchema.index({ user: 1 });


const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
