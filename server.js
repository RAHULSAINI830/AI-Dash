/* ─────────  Core deps  ───────── */
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
require('dotenv').config();             // load .env

/* ─────────  Background job  ───────── */
const cron            = require('node-cron');
const pollSynthflow   = require('./services/pullSynthflowToAppointments');  // <- NEW

/* ─────────  App setup  ───────── */
const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' }));

/* ─────────  MongoDB  ───────── */
const mongoURI =
  process.env.MONGODB_URI ||
  'mongodb+srv://sainirahul1009:z7TJMAdiqfAiHGRD@cluster0.3bmxr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');

    /* run immediately once at startup */
    pollSynthflow().catch(console.error);

    /* run every minute thereafter */
    cron.schedule('*/1 * * * *', pollSynthflow);
  })
  .catch((err) => console.error('MongoDB connection error:', err));

/* ─────────  API routes  ───────── */
const authRoutes         = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const adminRoutes        = require('./routes/admin');
const googleRoutes       = require('./routes/google');
const googleConfigRoutes = require('./routes/googleConfig');
const appointmentsRoutes = require('./routes/appointments');
const synthflowRoutes    = require('./routes/synthflow');

app.use('/api/auth',          authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/google',        googleRoutes);
app.use('/api/google',        googleConfigRoutes);
app.use('/api/appointments',  appointmentsRoutes);
app.use('/api/synthflow',     synthflowRoutes);

/* ─────────  Serve React build  ───────── */
const path = require('path');
app.use(express.static(path.join(__dirname, 'my-app', 'build')));

/* Catch‑all for client‑side routing */
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'my-app', 'build', 'index.html'));
});

/* ─────────  Start server  ───────── */
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
