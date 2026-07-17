// Modules
const { z } = require("zod");

// The review resource keeps the model's snake_case field name (review_text) —
// the schemas validate exactly the shape the controller consumes.

const ratingField = z
    .number({ message: "Rating must be a number!" })
    .int({ message: "Rating must be a whole number!" })
    .min(1, { message: "Rating must be at least 1!" })
    .max(5, { message: "Rating can't be more than 5!" });

const reviewTextField = z
    .string({ message: "Review text must be a string!" })
    .trim()
    .min(1, { message: "Review text cannot be empty!" })
    .max(2000, { message: "Review text can't be longer than 2000 characters!" });

// Schema to validate the create-review request body (both fields required)
const createReviewSchema = z.object({
    rating: ratingField,
    review_text: reviewTextField
}).strict({ message: "Unknown fields are not allowed!" });

// Schema to validate the edit-review request body (every field optional)
const editReviewSchema = z.object({
    rating: ratingField.optional(),
    review_text: reviewTextField.optional()
}).strict({ message: "Unknown fields are not allowed!" });

module.exports = { createReviewSchema, editReviewSchema };
