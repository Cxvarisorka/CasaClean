// Utils
const AppError = require("../utils/appError.util");

// Middleware function to check request body
const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.flatten();

            return next(new AppError("Validation failed!", 400, errors.fieldErrors));
        }

        req.body = result.data;

        next();
    }
}

module.exports = validate;