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
  },
  // Moderation gate. Customer-authored text is never shown on the public site
  // until an admin approves it (PATCH /review/:id/publish), so an abusive or
  // off-topic review can't go live on its own. Default false = pending review.
  isPublished: {
    type: Boolean,
    default: false
  },
  // When it was last approved — surfaced in the admin feed so moderation order
  // is visible. Cleared again whenever the review is unpublished.
  publishedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'reviews'
});

// Public per-service listing, newest first. `isPublished` is part of the key
// because the public query always filters on it (approved reviews only).
reviewSchema.index({ service_id: 1, isPublished: 1, createdAt: -1 });
// "My reviews" — a user's own reviews, newest first. createdAt is part of the key
// because that list sorts on it; the `user` prefix still answers every plain
// { user } lookup, so this compound replaces the single-field index.
reviewSchema.index({ user: 1, createdAt: -1 });
// The admin moderation feed is unfiltered and sorted newest-first, at a default
// page size of 100. Neither index above is prefixed on createdAt, so that query
// was scanning the collection and sorting it in memory.
reviewSchema.index({ createdAt: -1 });


const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
