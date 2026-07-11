// Modules
const express = require('express');

// Controllers
const { getCities, getCity, addCity, deleteCity, editCity } = require('../controllers/city.controller');

// Middlewares
const { protect, attachUser, restrictTo } = require('../middlewares/protect.middleware');
const validate = require('../middlewares/validate.middleware');

// Validations
const { addCitySchema, editCitySchema } = require('../validations/city.validation');

const cityRouter = express.Router();

// Public routes (anyone can browse cities). The list only returns enabled
// cities; attachUser (optional auth, never rejects) lets a signed-in admin
// request the full catalogue with ?includeDisabled=true.
cityRouter.get('/', attachUser, getCities);
cityRouter.get('/:id', getCity);

// Admin routes — everything below requires a valid auth cookie AND the admin role.
// protect populates req.user; restrictTo("admin") then gates on the role.
cityRouter.use(protect, restrictTo('admin'));
cityRouter.post('/', validate(addCitySchema), addCity);
cityRouter.delete('/:id', deleteCity);
cityRouter.patch('/:id', validate(editCitySchema), editCity);

module.exports = cityRouter;