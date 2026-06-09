const express = require('express');
const { createReview, getServiceReviews } = require('../controllers/review.controller');
const { protect } = require('../middlewares/protect.middleware');

const reviewRouter = express.Router();


reviewRouter.get('/:serviceId', getServiceReviews);


reviewRouter.post('/', protect, createReview);

module.exports = reviewRouter