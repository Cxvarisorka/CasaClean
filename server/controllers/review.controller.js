const Review = require('../models/review.model');
const Booking = require('../models/booking.model');
const catchAsync = require('../utils/catchAsync.util');
const AppError = require('../utils/appError.util');


// POST /api/v1/review/:id
const createReview = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;
  const { rating, review_text } = req.body; 
  const userId = req.user._id;

  const userEmail = req.user.email; 
  const hasBooked = await Booking.findOne({
    customerEmail: userEmail,
    serviceId: Number(serviceId)
  });

  if (!hasBooked) {
    return next(new AppError("You can only review services you have actually booked before!", 403));
  }

  const review = await Review.create({
    service_id: Number(serviceId),
    user: userId,
    rating,
    review_text
  });

  res.status(201).json({
    status: 'success',
    message: 'Review added successfully!',
    data: { review }
  });
});

// GET /api/v1/review/:id
const getServiceReviews = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;

  const reviews = await Review.find({ service_id: serviceId })
    .populate({
      path: 'user',
      select: 'fullname'
    });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews }
  });
});

// PATCH /api/v1/review/:id
const editReview = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { rating, review_text } = req.body;
  const userId = req.user._id;

  const review = await Review.findById(id);

  if (!review) {
    return next(new AppError("Review not found!", 404));
  }
  if (review.user.toString() !== userId.toString()) {
    return next(new AppError("You can only edit your own reviews!", 403));
  }
  if (rating) review.rating = rating;
  if (review_text) review.review_text = review_text;

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
  const userRole = req.user.role;

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