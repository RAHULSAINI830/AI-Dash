const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  // --- identity fields ---
  call_id: { type: String, required: true, unique: true }, // non‑appointment fallback
  phone_number: { type: String, required: true },
  lisaExtractedDateTime: { type: Date },                   // local slot parsed from LISA

  // --- metadata ---
  model_id: { type: String, required: true },
  transcriptSummary: { type: String, required: true },
  appointmentDetails: { type: String, required: true },
  callTime: { type: Date, required: true },
  callType: {
    type: String,
    enum: ['appointment', 'non-appointment'],
    default: 'non-appointment'
  },

  callCategory: {
      type: String,
      enum: ['appointment', 'non-appointment', 'callback', 'query'],
       default: 'non-appointment'
     },

  // --- life‑cycle ---
  appointmentStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  calendarEventId: { type: String },

  // --- housekeeping ---
  createdAt: { type: Date, default: Date.now }
});

/**
 * NEW: compound‑unique index
 * · Enforced only when lisaExtractedDateTime exists (sparse: true)
 * · Prevents duplicate appointments for the *same caller & slot*
 */
AppointmentSchema.index(
  { phone_number: 1, lisaExtractedDateTime: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('Appointment', AppointmentSchema);
