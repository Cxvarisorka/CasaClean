const Review = require('../models/review.model');
const Booking = require('../models/booking.model');
const catchAsync = require('../utils/catchAsync.util');
const AppError = require('../utils/appError.util');


const createReview = catchAsync(async (req, res, next) => {
  const { service_id, rating, review_text } = req.body;
  const userId = req.user._id;      
  const userEmail = req.user.email; 

  const hasBooked = await Booking.findOne({
    customerEmail: userEmail,
    serviceId: Number(service_id) 
  });

  if (!hasBooked) {
    return next(new AppError("You can only review services you have actually booked before!", 403));
  }

  const review = await Review.create({
    service_id: Number(service_id),
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

module.exports = {
  createReview,
  getServiceReviews
};