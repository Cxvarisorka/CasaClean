// Modules
const { z } = require("zod");

// Schema for validate create service request body
const createServiceSchema = z.object({
    name: z
        .string()
        .trim()
        .min(5, { message: "Name must contain at least 5 characters!" })
        .max(50, { message: "Name is too long!" }),
    
    description: z
        .string()
        .trim()
        .min(10, "Description must contain at least 10 characters!")
        .max(700, "Description is too long!"),
    
    pricePerHour: z
        .number()
        .min(0, "Price can't be negative!"),

    allCities: z
        .boolean()
        .optional(),

    cities: z
        .array(z.string()),

    allSpecialRequests: z
        .boolean()
        .optional(),

    specialRequests: z
        .array(z.string())
        .optional()
}).strict({ message: "Unknown fields are not allowed!" });

// Schema for validate edit service request body
const editServiceSchema = z.object({
    name: z
        .string()
        .trim()
        .min(5, { message: "Name must contain at least 5 characters!" })
        .max(50, { message: "Name is too long!" })
        .optional(),
    
    description: z
        .string()
        .trim()
        .min(10, "Description must contain at least 10 characters!")
        .max(700, "Description is too long!")
        .optional(),
    
    pricePerHour: z
        .number()
        .min(0, "Price can't be negative!")
        .optional(),

    allCities: z
        .boolean()
        .optional(),

    cities: z
        .array(z.string())
        .optional(),

    allSpecialRequests: z
        .boolean()
        .optional(),

    specialRequests: z
        .array(z.string())
        .optional()

}).strict({ message: "Unknown fields are not allowed!" });

module.exports = { createServiceSchema, editServiceSchema };