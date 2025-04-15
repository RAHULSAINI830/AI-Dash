const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const { authenticateToken } = require('./auth'); // if needed

// POST /api/appointments: Create or update an appointment record.
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { call_id, model_id, phone_number, transcriptSummary, appointmentDetails, callTime } = req.body;

    // Validate or provide a default for callTime.
    // Here, if callTime is missing or falsy, we assign the current date as a default.
    const processedCallTime = callTime ? callTime : new Date().toISOString();
    
    // Check if an appointment for this call already exists.
    let appointment = await Appointment.findOne({ call_id });
    if (appointment) {
      // Update the record if needed.
      appointment.transcriptSummary = transcriptSummary;
      appointment.appointmentDetails = appointmentDetails;
      appointment.callTime = processedCallTime;
      await appointment.save();
      res.status(200).json({ message: 'Appointment record updated successfully', appointment });
    } else {
      // Create a new record.
      appointment = new Appointment({
        call_id,
        model_id,
        phone_number,
        transcriptSummary,
        appointmentDetails,
        callTime: processedCallTime,
      });
      await appointment.save();
      res.status(201).json({ message: 'Appointment record created successfully', appointment });
    }
  } catch (err) {
    console.error('Error saving appointment:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/appointments: Retrieve all appointment records.
router.get('/', async (req, res) => {
  try {
    const appointments = await Appointment.find({});
    res.status(200).json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/appointments: Delete all appointment records.
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await Appointment.deleteMany({});
    res.status(200).json({ message: 'All appointments deleted successfully' });
  } catch (err) {
    console.error('Error deleting appointments:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
