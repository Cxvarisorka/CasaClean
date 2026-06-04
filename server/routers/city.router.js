// Modules
const express = require('express');

// Controllers
const { getCities, getCity, addCity, deleteCity, editCity } = require('../controllers/city.controller');

// Middlewares
const { protect, restrictTo } = require('../middlewares/protect.middleware');

const cityRouter = express.Router();

// Public routes (anyone can browse cities)
cityRouter.get('/', getCities);
cityRouter.get('/:id', getCity);

// Admin routes — everything below requires a valid auth cookie AND the admin role.
// protect populates req.user; restrictTo("admin") then gates on the role.
cityRouter.use(protect, restrictTo('admin'));
cityRouter.post('/', addCity);
cityRouter.delete('/:id', deleteCity);
cityRouter.patch('/:id', editCity);

module.exports = cityRouter;