const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000'
}));

const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://sainirahul1009:z7TJMAdiqfAiHGRD@cluster0.3bmxr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const adminRoutes = require('./routes/admin');
const googleRoutes = require('./routes/google');       // For updating tokens
const googleConfigRoutes = require('./routes/googleConfig'); // For returning configuration
const appointmentsRoutes = require('./routes/appointments'); // New appointments route

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/google', googleConfigRoutes);
app.use('/api/appointments', appointmentsRoutes);

const path = require('path');
app.use(express.static(path.join(__dirname, 'my-app', 'build')));

// Catch-all: For any request that doesn't match, send back React's index.html.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'my-app', 'build', 'index.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
