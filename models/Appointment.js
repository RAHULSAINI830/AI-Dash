const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  call_id: { type: String, required: true, unique: true },
  model_id: { type: String, required: true },
  phone_number: { type: String, required: true },
  transcriptSummary: { type: String, required: true },
  appointmentDetails: { type: String, required: true },
  callTime: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
