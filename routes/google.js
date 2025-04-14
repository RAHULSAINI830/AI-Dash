const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Adjust the path if necessary
const { authenticateToken } = require('./auth'); // Ensure you have an authentication middleware

// POST /api/google/update
router.post('/update', authenticateToken, async (req, res) => {
  try {
    const { googleAccessToken, googleRefreshToken, googleTokenExpiry } = req.body;
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    user.googleAccessToken = googleAccessToken;
    user.googleRefreshToken = googleRefreshToken;
    user.googleTokenExpiry = googleTokenExpiry;
    await user.save();
    res.json({ message: 'Google tokens updated successfully.' });
  } catch (error) {
    console.error('Error updating Google tokens:', error);
    res.status(500).json({ message: 'Server error updating Google tokens.' });
  }
});

module.exports = router;
