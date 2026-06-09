// Modules
const { z } = require("zod");
const mongoose = require("mongoose");

const objectId = z
    .string()
    .trim()
    .refine((id) => mongoose.Types.ObjectId.isValid(id), { message: "Invalid ID" })

// Schema for validate create booking request body
const createBookingSchema = z.object({
    serviceId: objectId,

    cityId: objectId,

    // Customer contact details. Optional because the controller falls back to the
    // signed-in user's profile when absent; allowed because the wizard always
    // sends them and an admin may book on a customer's behalf.
    customerName: z
        .string()
        .trim()
        .min(1, { message: "Customer name can't be empty!" })
        .optional(),

    customerEmail: z
        .string()
        .trim()
        .email({ message: "Invalid customer email!" })
        .optional(),

    customerPhone: z
        .string()
        .trim()
        .min(1, { message: "Customer phone can't be empty!" })
        .optional(),

    streetName: z
        .string()
        .trim()
        .min(1, { message: "Street name is required!" }),
    
    houseNumber: z
        .string()
        .trim()
        .min(1, { message: "The house number must be greater then 0!" }),

    propertySize: z
        .string()
        .trim()
        .min(1, { message: "The property size must be greater then 0!" }),
    
    bookingDate: z
        .string()
        .trim(),
    
    bookingTime: z
        .string()
        .trim(),

    doorbellName: z
        .string()
        .trim(),

    hours: z
        .number()
        .min(1, { message: "A booking must be at least 1 hour!" }),
    
    cleaners: z
        .number()
        .min(1, { message: "A booking must have at least 1 cleaner!" }),
    
    totalAmount: z
        .number()
        .min(0, { message: "Total amount can't be negative!" }),

    notes: z
        .string()
        .trim()
        .optional()
        .nullable(),
    
    specialRequests: z
        .array(objectId)
        .optional(),

    supplies: z
        .array(
            z.string()
            .trim()
            .min(1, { message: "Supply name can't be empty!" })
        )
        .optional()
    
}).strict({ message: "Unknown fields are not allowed!" });

// Schema for validate edit booking request body
const editBookingSchema = z.object({
    serviceId: objectId.optional(),

    cityId: objectId.optional(),

    customerName: z
        .string()
        .trim()
        .min(1, { message: "Customer name can't be empty!" })
        .optional(),

    customerEmail: z
        .string()
        .trim()
        .email({ message: "Invalid customer email!" })
        .optional(),

    customerPhone: z
        .string()
        .trim()
        .min(1, { message: "Customer phone can't be empty!" })
        .optional(),

    streetName: z
        .string()
        .trim()
        .min(1, { message: "Street name is required!" })
        .optional(),
    
    houseNumber: z
        .string()
        .trim()
        .min(1, { message: "The house number must be greater then 0!" })
        .optional(),

    propertySize: z
        .string()
        .trim()
        .min(1, { message: "The property size must be greater then 0!" })
        .optional(),
    
    bookingDate: z
        .string()
        .trim()
        .optional(),
    
    bookingTime: z
        .string()
        .trim()
        .optional(),

    doorbellName: z
        .string()
        .trim()
        .optional(),

    hours: z
        .number()
        .min(1, { message: "A booking must be at least 1 hour!" })
        .optional(),
    
    cleaners: z
        .number()
        .min(1, { message: "A booking must have at least 1 cleaner!" })
        .optional(),
    
    totalAmount: z
        .number()
        .min(0, { message: "Total amount can't be negative!" })
        .optional(),

    status: z
        .string()
        .trim()
        .optional(),

    notes: z
        .string()
        .trim()
        .optional()
        .nullable(),
    
    specialRequests: z
        .array(objectId)
        .optional(),

    supplies: z
        .array(
            z.string()
            .trim()
            .min(1, { message: "Supply name can't be empty!" })
        )
        .optional()
    
}).strict({ message: "Unknown fields are not allowed!" });

module.exports = { createBookingSchema, editBookingSchema };