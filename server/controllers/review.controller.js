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

  // rating/review_text are already guaranteed by createReviewSchema (integer
  // 1-5, non-empty trimmed string <= 2000 chars) via validate() on the route.
  // The duplicate hand-rolled checks that used to live here drifted from the
  // schema — they returned different messages for the same input and had to be
  // kept in sync by hand.

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
    // Created unpublished — an admin decides whether it appears publicly.
    message: "Review added successfully! It will be shown publicly once approved.",
    data: { review },
  });
});

// GET /api/v1/review/my — the signed-in user's own reviews. The profile page
// uses this to show which completed bookings are already rated.
const getMyReviews = catchAsync(async (req, res, next) => {
  // Bounded like every other list endpoint — an unpaginated find() grows with
  // the user's review history and was the only list left without a ceiling.
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);

  const [reviews, reviewCount] = await Promise.all([
    Review.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments({ user: req.user._id }),
  ]);

  res.status(200).json({
    status: "success",
    page,
    limit,
    results: reviews.length,
    reviewCount,
    data: { reviews },
  });
});
// "Giorgi Kvaratskhelia" -> "Giorgi K." — enough to read as a real person
// without publishing a customer's full name on a marketing page.
const publicAuthorName = (fullname) => {
  const parts = String(fullname || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
};

// The public projection. Anonymous visitors get the score, the comment, when it
// was written and a shortened author name — never the author's id or email, and
// never the booking the review belongs to.
const toPublicReview = (review) => ({
  _id: review._id,
  rating: review.rating,
  review_text: review.review_text,
  author: publicAuthorName(review.user?.fullname),
  createdAt: review.createdAt,
});

// GET /api/v1/review/service/:serviceId  (public)
// The published reviews for one service, newest first, plus the aggregate the
// service page shows above the list (average score over every published review,
// not just the current page).
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

  // Moderation gate: only reviews an admin has approved are public. Documents
  // written before this field existed have no `isPublished` at all, so they
  // stay hidden too until they're published (or backfilled).
  const filter = {
    service_id: new mongoose.Types.ObjectId(serviceId),
    isPublished: true,
  };

  const [reviews, summary] = await Promise.all([
    Review.find(filter)
      .populate({ path: "user", select: "fullname" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    // Aggregate over the whole published set — the page header must say "4.8
    // from 23 reviews" even when it only renders the first six.
    Review.aggregate([
      { $match: filter },
      { $group: { _id: null, count: { $sum: 1 }, average: { $avg: "$rating" } } },
    ]),
  ]);

  const stats = summary[0];

  res.status(200).json({
    status: "success",
    page,
    limit,
    results: reviews.length,
    reviewCount: stats?.count ?? 0,
    // One decimal is all the UI shows; rounding here keeps every client
    // consistent instead of each one picking its own precision.
    averageRating: stats ? Math.round(stats.average * 10) / 10 : 0,
    data: { reviews: reviews.map(toPublicReview) },
  });
});
// What the admin panel needs resolved on a review: the author, the service and
// the rated booking (so a row identifies exactly which job was rated). Shared by
// the feed and the moderation response so both return the same shape — the panel
// merges the moderation response into its table row.
const ADMIN_REVIEW_POPULATE = [
  { path: "user", select: "fullname email" },
  { path: "service_id", select: "name" },
  {
    path: "booking",
    select:
      "bookingDate bookingTime streetName houseNumber propertySize doorbellName hours cleaners totalAmount status customerName customerEmail cityId",
    populate: { path: "cityId", select: "name" },
  },
];

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
      .populate(ADMIN_REVIEW_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    // No filter -> estimatedDocumentCount reads collection metadata (O(1))
    // instead of scanning every document like countDocuments() would.
    Review.estimatedDocumentCount(),
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

  // Editing the content sends the review back to moderation. Without this an
  // author could get a polite review approved and then rewrite it into
  // something abusive that is public the moment they hit save.
  if (review.isModified("rating") || review.isModified("review_text")) {
    review.isPublished = false;
    review.publishedAt = null;
  }

  await review.save();

  res.status(200).json({
    status: "success",
    message: "Review updated successfully!",
    data: { review }
  });
});
// PATCH /api/v1/review/:id/publish  (admin only — the panel's Quality section)
// Decides whether a customer's review is shown on the public site. Reviews are
// created unpublished, so this is the single gate between customer-authored
// text and the marketing pages.
const setReviewVisibility = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  // Guaranteed to be a boolean by moderateReviewSchema on the route.
  const { isPublished } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid review ID!", 400));
  }

  // Explicit field whitelist — never spread req.body over the document.
  const review = await Review.findByIdAndUpdate(
    id,
    { isPublished, publishedAt: isPublished ? new Date() : null },
    { returnDocument: "after", runValidators: true }
  ).populate(ADMIN_REVIEW_POPULATE);

  if (!review) {
    return next(new AppError("Review not found!", 404));
  }

  res.status(200).json({
    status: "success",
    message: isPublished
      ? "Review is now visible on the public site."
      : "Review is now hidden from the public site.",
    data: { review },
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
  setReviewVisibility,
  deleteReview
};


