// routes/googleConfig.js
const express = require('express');
const router = express.Router();

// Return the Google API configuration using environment variables.
router.get('/config', (req, res) => {
  res.json({
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID, // e.g., "951284757403-8ie2k9tku9uo1deqibbf5o4k0mpg6bi8.apps.googleusercontent.com"
    API_KEY: process.env.GOOGLE_API_KEY,     // e.g., "AIzaSyCf_EqbTtH9D42RemwjTjHawZu3aB3SR7Y"
    DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
    SCOPES: "https://www.googleapis.com/auth/calendar.readonly"
  });
});

module.exports = router;
