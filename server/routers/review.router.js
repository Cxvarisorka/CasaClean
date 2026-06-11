const express = require('express');
const {  createReview,
  getServiceReviews,
  editReview,
  deleteReview
 } = require('../controllers/review.controller');

const { protect } = require('../middlewares/protect.middleware');

const reviewRouter = express.Router();


reviewRouter.get('/service/:serviceId', getServiceReviews);
reviewRouter.post('/service/:serviceId', protect, createReview);

reviewRouter.patch('/:id', protect, editReview);
reviewRouter.delete('/:id', protect, deleteReview);

module.exports = reviewRouter;