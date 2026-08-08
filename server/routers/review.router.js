const express = require('express');
const {  createReview,
  getServiceReviews,
  getMyReviews,
  getAllReviews,
  editReview,
  setReviewVisibility,
  deleteReview
 } = require('../controllers/review.controller');

const { protect, restrictTo } = require('../middlewares/protect.middleware');
const validate = require('../middlewares/validate.middleware');
const { reviewLimiter } = require('../middlewares/rateLimit.middleware');

const {
  createReviewSchema,
  editReviewSchema,
  moderateReviewSchema
} = require('../validations/review.validation');

const reviewRouter = express.Router();

// Admin: full review feed for the panel's Quality section. Declared before the
// dynamic routes since it's a distinct literal path.
reviewRouter.get('/', protect, restrictTo('admin'), getAllReviews);

// The signed-in user's own reviews (which of their bookings are rated).
reviewRouter.get('/my', protect, getMyReviews);

// Public per-service listing.
reviewRouter.get('/service/:serviceId', getServiceReviews);

// Write routes follow the standard middleware order used by every other
// resource: rate limiter -> protect -> validate(schema) -> controller.

// Create a review for one of the user's OWN completed bookings.
reviewRouter.post('/booking/:bookingId', reviewLimiter, protect, validate(createReviewSchema), createReview);

// Admin moderation: show / hide a review on the public site. Declared before
// the dynamic PATCH /:id so the literal segment is unambiguous.
reviewRouter.patch(
  '/:id/publish',
  reviewLimiter,
  protect,
  restrictTo('admin'),
  validate(moderateReviewSchema),
  setReviewVisibility
);

reviewRouter.patch('/:id', reviewLimiter, protect, validate(editReviewSchema), editReview);
reviewRouter.delete('/:id', reviewLimiter, protect, deleteReview);

module.exports = reviewRouter;