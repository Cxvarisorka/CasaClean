// Modules
const { z } = require("zod");

// Schema for valdiate add city request body
const addCitySchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, { message: "Name must contain at least 1 characters!" })
        .max(40, { message: "Name is too long!" }),
    
    workingHourStarts: z
        .string()
        .trim(),
    
    workingHourEnds: z
        .string()
        .trim(),
    
}).strict({ message: "Unknown fields are not allowed!" });

// Schema for validate edit city request body
const editCitySchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, { message: "Name must contain at least 1 characters!" })
        .max(40, { message: "Fullname is too long!" })
        .optional(),
    
    workingHourStarts: z
        .string()
        .trim()
        .optional(),
    
    workingHourEnds: z
        .string()
        .trim()
        .optional(),

    enabled: z
        .boolean()
        .optional()
    
}).strict({ message: "Unknown fields are not allowed!" });

module.exports = { addCitySchema, editCitySchema };