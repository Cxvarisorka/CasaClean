const Review = require('../models/review.model');
const Booking = require('../models/booking.model');
const catchAsync = require('../utils/catchAsync.util');
const AppError = require('../utils/appError.util');
const mongoose = require("mongoose"); 


// POST /api/v1/review/service/:serviceId
const createReview = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;
  const { rating, review_text } = req.body; 
  const userId = req.user._id;

  // Services are ObjectIds (see service.model.js / booking.model.js), so the
  // id must be validated as one — comparing as Number could never match a
  // real booking, which silently broke the "must have booked" gate below.
  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    return next(new AppError("Invalid service ID provided in URL!", 400));
  }

  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return next(new AppError("Please provide a valid integer rating between 1 and 5!", 400));
  }
  if (!review_text || typeof review_text !== "string" || !review_text.trim()) {
    return next(new AppError("Review text cannot be empty!", 400));
  }
  // Fix 13: only completed bookings qualify. A user with only pending/cancelled
  // bookings for this service has not received the service and must not review it.
  const hasBooked = await Booking.findOne({
    user: userId,
    serviceId,
    status: 'completed'
  });

  if (!hasBooked) {
    return next(new AppError("You can only review services from completed bookings", 403));
  }
  const review = await Review.create({
    service_id: serviceId,
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
  editReview,
  deleteReview
};


