// Utils
const AppError = require("../utils/appError.util");

// Middleware function to check request body
const validate = (schema) => {
    return (req, res, next) => {
        // `req.body` is undefined — not {} — whenever no body parser ran, which
        // happens for any request without a Content-Type. That is exactly what a
        // BROWSER sends for a body-less state-changing call: axios' XHR adapter
        // strips the default Content-Type when `data` is undefined
        // (node_modules/axios/lib/adapters/xhr.js — "Remove Content-Type if data
        // is undefined"), so express.json() skips the request entirely.
        //
        // Without this coalesce, an action endpoint whose schema is `z.object({})`
        // (pause/resume/cancel) rejects the real client with "expected object,
        // received undefined" and the controller never runs. Note that neither
        // supertest's `.send({})` nor axios' Node adapter reproduce that shape,
        // which is why such a failure stays invisible to the test suite.
        const result = schema.safeParse(req.body ?? {});

        if (!result.success) {
            const errors = result.error.flatten();

            return next(new AppError("Validation failed!", 400, errors.fieldErrors));
        }

        req.body = result.data;

        next();
    }
}

module.exports = validate;
