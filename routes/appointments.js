const express = require('express');
const router  = express.Router();
const Appointment        = require('../models/Appointment');
const User        = require('../models/user');
const { authenticateToken } = require('./auth');

/* ─────────────────────────────────────────────────────────────
   POST /api/appointments
   • Upserts by (phone_number + lisaExtractedDateTime) when a slot exists
   • Otherwise falls back to call_id
   • Now stores callCategory  →  'appointment' | 'non-appointment' | 'callback' | 'query'
   ───────────────────────────────────────────────────────────── */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      call_id,
      model_id,
      phone_number,
      transcriptSummary,
      appointmentDetails,
      callTime,
      lisaExtractedDateTime,
      callType,
      callCategory = 'non-appointment',      // <-- NEW
      appointmentStatus = 'pending',
    } = req.body;

    // uniqueness logic
    const query = lisaExtractedDateTime
      ? { phone_number, lisaExtractedDateTime }
      : { call_id };

    const processedCallTime = callTime
      ? new Date(callTime).toISOString()
      : new Date().toISOString();

    /* ── UPDATE if found ─────────────────── */
    let appointment = await Appointment.findOne(query);
    if (appointment) {
      appointment.transcriptSummary  = transcriptSummary;
      appointment.appointmentDetails = appointmentDetails;
      appointment.callTime           = processedCallTime;
      appointment.callType           = callType;
      appointment.callCategory       = callCategory;    // <-- NEW
      appointment.appointmentStatus  = appointmentStatus;

      await appointment.save();
      return res.status(200).json({
        message: 'Appointment record updated successfully',
        appointment,
      });
    }

    /* ── CREATE if not found ─────────────── */
    appointment = new Appointment({
      call_id,
      model_id,
      phone_number,
      transcriptSummary,
      appointmentDetails,
      callTime: processedCallTime,
      lisaExtractedDateTime,
      callType,
      callCategory,                           // <-- NEW
      appointmentStatus,
    });

    await appointment.save();
    return res.status(201).json({
      message: 'Appointment record created successfully',
      appointment,
    });
  } catch (err) {
    /* Duplicate‑key race condition (another request inserted first) */
    if (err.code === 11000) {
      const dup = await Appointment.findOne(
        req.body.lisaExtractedDateTime
          ? { phone_number: req.body.phone_number, lisaExtractedDateTime: req.body.lisaExtractedDateTime }
          : { call_id: req.body.call_id }
      );
      // Optionally update category/details even on duplicate
      if (dup) {
        dup.transcriptSummary  = req.body.transcriptSummary;
        dup.appointmentDetails = req.body.appointmentDetails;
        dup.callType           = req.body.callType;
        dup.callCategory       = req.body.callCategory || dup.callCategory;
        await dup.save();
      }
      return res.status(200).json({
        message: 'Duplicate skipped – existing appointment returned',
        appointment: dup,
      });
    }

    console.error('Error saving appointment:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/* ─────────────────────────────────────────────────────────────
   PUT /api/appointments/status/:id
   – Updates status and/or calendarEventId
   ───────────────────────────────────────────────────────────── */
router.put('/status/:id', async (req, res) => {
  try {
    const { appointmentStatus, calendarEventId, lisaExtractedDateTime } = req.body;
    const update = { appointmentStatus, calendarEventId };
    // Only set lisaExtractedDateTime if it came in the request:
    if (lisaExtractedDateTime) update.lisaExtractedDateTime = new Date(lisaExtractedDateTime);
    
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );
    res.json({ appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update appointment' });
  }
});


/* ─────────────────────────────────────────────────────────────
   GET /api/appointments
   (optionally filter by callCategory via ?category=callback)
   ───────────────────────────────────────────────────────────── */
   router.get('/', authenticateToken, async (req, res) => {
    try {
      // 1) Fetch the current user to get their model_id
      const user = await User.findById(req.user.id).select('model_id');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // 2) Build the query: always include model_id
      const filter = { model_id: user.model_id };
      if (req.query.category) {
        filter.callCategory = req.query.category;
      }
  
      // 3) Query and return only this admin’s appointments
      const appointments = await Appointment.find(filter);
      res.status(200).json(appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

/* ─────────────────────────────────────────────────────────────
   GET /api/appointments/exists   (front‑end probe)
   ───────────────────────────────────────────────────────────── */
router.get('/exists', authenticateToken, async (req, res) => {
  try {
    const { phone_number, lisaExtractedDateTime, call_id } = req.query;
    const query = lisaExtractedDateTime
      ? { phone_number, lisaExtractedDateTime }
      : { call_id };

    const exists = await Appointment.exists(query);
    res.json({ exists: !!exists });
  } catch (error) {
    console.error('Error checking appointment existence:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.get('/metrics', async (req, res) => {
  try {
    const appointmentCount = await Appointment.countDocuments({ callCategory: 'appointment' });
    const callbackCount    = await Appointment.countDocuments({ callCategory: 'callback' });
    const queryCount       = await Appointment.countDocuments({ callCategory: 'query' });

    const pendingCount  = await Appointment.countDocuments({ appointmentStatus: 'pending' });
    const acceptedCount = await Appointment.countDocuments({ appointmentStatus: 'accepted' });
    const rejectedCount = await Appointment.countDocuments({ appointmentStatus: 'rejected' });

    res.json({
      appointmentCount,
      callbackCount,
      queryCount,
      pendingCount,
      acceptedCount,
      rejectedCount
    });
  } catch (err) {
    console.error('Failed to load appointment metrics', err);
    res.status(500).json({ error: 'Unable to load metrics' });
  }
});

/* ─────────────────────────────────────────────────────────────
   DELETE /api/appointments  (dev‑only bulk wipe)
   ───────────────────────────────────────────────────────────── */
router.delete('/', authenticateToken, async (_req, res) => {
  try {
    await Appointment.deleteMany({});
    res.status(200).json({ message: 'All appointments deleted successfully' });
  } catch (err) {
    console.error('Error deleting appointments:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
