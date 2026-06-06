const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  service_id: {
    type: Number,
    required: true
  },
  city_id: {
    type: Number,
    required: true
  },
  customer_name: {
    type: String,
    required: true,
    trim: true
  },
  customer_email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  customer_phone: {
    type: String,
    required: true
  },
  street_name: {
    type: String,
    required: true
  },
  house_number: {
    type: String,
    required: true 
  },
  property_size: {
    type: String, 
    required: true
  },
  doorbell_name: {
    type: String,
    required: true
  },
  booking_date: {
    type: String,
    required: true
  },
  booking_time: {
    type: String, 
    required: true
  },
  hours: {
    type: Number,
    required: true
  },
  cleaners: {
    type: Number,
    required: true
  },
  total_amount: {
    type: Number,
    required: true
  },
  payment_intent_id: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: null
  },
  additional_services: {
    type: [String],
    default: []
  },
  supplies: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  },
  stripe_status: {
    type: String,
    default: ''
  }
}, { timestamps: true,collection: 'bookings' });

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;





// {
//     "id": 1,
//     "service_id": 2,
//     "city_id": 1,
//     "customer_name": "Lela gorelishvili",
//     "customer_email": "llgorelishvili@gmail.com",
//     "customer_phone": "+393891496149",
//     "street_name": "via giovanni giorgi",
//     "house_number": "5",
//     "property_size": "40",
//     "doorbell_name": "Lela gorelishvili",
//     "booking_date": "2026-02-04",
//     "booking_time": "14:00",
//     "hours": 2,
//     "cleaners": 2,
//     "total_amount": 19,
//     "payment_intent_id": "pi_3Sxm6IKEJbAqCpEe1WsxbEal",
//     "notes": null,
//     "additional_services": [],
//     "supplies": [
//       "provide-solvents",
//       "provide-mop",
//       "provide-vacuum"
//     ],
//     "status": "confirmed",
//     "stripe_status": "captured",
//     "created_at": "2026-02-05T22:17:26.318Z",
//     "updated_at": "2026-02-05T22:19:05.800Z"
//   },
