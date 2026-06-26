const Review = require('../models/review.model');
const Booking = require('../models/booking.model');
const catchAsync = require('../utils/catchAsync.util');
const AppError = require('../utils/appError.util');
const mongoose = require("mongoose"); 


// POST /api/v1/review/booking/:bookingId
// A customer rates one of their OWN completed bookings. Reviews are per-booking,
// so a user can rate every completed booking they had (one review each).
const createReview = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const { rating, review_text } = req.body;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return next(new AppError("Invalid booking ID provided in URL!", 400));
  }

  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return next(new AppError("Please provide a valid integer rating between 1 and 5!", 400));
  }
  if (!review_text || typeof review_text !== "string" || !review_text.trim()) {
    return next(new AppError("Review text cannot be empty!", 400));
  }

  // The booking must be the signed-in user's OWN and COMPLETED. Scoping the
  // query to req.user means someone else's booking simply isn't found — no
  // information leak — and only a delivered (completed) service can be rated.
  const booking = await Booking.findOne({
    _id: bookingId,
    user: userId,
    status: 'completed'
  }).select('_id serviceId');

  if (!booking) {
    return next(new AppError("You can only review your own completed bookings!", 403));
  }

  // One review per booking (the unique index is the race-safe backstop; this
  // check returns a friendly message in the common case).
  const existing = await Review.findOne({ booking: bookingId }).select('_id');
  if (existing) {
    return next(new AppError("You have already reviewed this booking.", 409));
  }

  const review = await Review.create({
    booking: booking._id,
    // service_id is derived from the booking, never trusted from the client.
    service_id: booking.serviceId,
    user: userId,
    rating,
    review_text: review_text.trim(),
  });

  res.status(201).json({
    status: "success",
    message: "Review added successfully!",
    data: { review },
  });
});

// GET /api/v1/review/my — the signed-in user's own reviews. The profile page
// uses this to show which completed bookings are already rated.
const getMyReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: { reviews },
  });
});
// GET /api/v1/review/:id
const getServiceReviews = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    return next(new AppError("Invalid service ID!", 400));
  }
// Clamp pagination so crafted query strings can't request huge pages or
// negative skips.
const page = Math.max(Number(req.query.page) || 1, 1);
const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

const skip = (page - 1) * limit;

const reviews = await Review.find({
  service_id: serviceId
})
  .populate({
    path: "user",
    select: "fullname",
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean();

  res.status(200).json({
  status: "success",
  page,
  limit,
  results: reviews.length,
  data: { reviews },
});
});
// GET /api/v1/review  (admin only — the panel's Quality section)
// Lists every review across all services with the author and service resolved,
// so an admin can see the score + comment and who left it.
const getAllReviews = catchAsync(async (req, res, next) => {
  // Clamp pagination. The admin panel pulls one big page (limit=100), so allow a
  // higher ceiling here than the public per-service endpoint while still
  // bounding crafted query strings.
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find()
      .populate({ path: "user", select: "fullname email" })
      .populate({ path: "service_id", select: "name" })
      // Pull the rated booking's details so the admin can see exactly which
      // booking each review is for (date, address, status, total…).
      .populate({
        path: "booking",
        select:
          "bookingDate bookingTime streetName houseNumber propertySize doorbellName hours cleaners totalAmount status customerName customerEmail cityId",
        populate: { path: "cityId", select: "name" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(),
  ]);

  res.status(200).json({
    status: "success",
    page,
    limit,
    results: reviews.length,
    reviewCount: total,
    data: { reviews },
  });
});

// PATCH /api/v1/review/:id
const editReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { rating, review_text } = req.body;
  const userId = req.user._id;

  if (rating !== undefined && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
    return next(new AppError("Rating must be an integer between 1 and 5!", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
  return next(new AppError("Invalid review ID!", 400));
}

  const review = await Review.findById(id);

  if (!review) {
    return next(new AppError("Review not found!", 404));
  }

  if (review.user.toString() !== userId.toString()) {
    return next(new AppError("You can only edit your own reviews!", 403));
  }

  if (rating !== undefined) {
  review.rating = Number(rating);
}
  if (review_text !== undefined) {
  if (typeof review_text !== "string" || !review_text.trim()) {
    return next(new AppError("Review text cannot be empty!", 400));
  }

  review.review_text = review_text.trim();
}

  await review.save();

  res.status(200).json({
    status: "success",
    message: "Review updated successfully!",
    data: { review }
  });
});
// DELETE /api/v1/review/:id
const deleteReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;
  
  const userRole = req.user.role || 'user'; 

  if (!mongoose.Types.ObjectId.isValid(id)) {
  return next(new AppError("Invalid review ID!", 400));
}

  const review = await Review.findById(id);

  if (!review) {
    return next(new AppError("Review not found!", 404));
  }
  if (review.user.toString() !== userId.toString() && userRole !== 'admin') {
    return next(new AppError("You do not have permission to delete this review!", 403));
  }

  await Review.findByIdAndDelete(id);

  res.status(200).json({
    status: "success",
    message: "Review deleted successfully!"
  });
});

module.exports = {
  createReview,
  getServiceReviews,
  getMyReviews,
  getAllReviews,
  editReview,
  deleteReview
};


