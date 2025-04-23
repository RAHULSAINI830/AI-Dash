// routes/synthflow.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/calls', async (req, res) => {
  const { model_id, limit } = req.query;
  try {
    const response = await axios.get(
      'https://api.synthflow.ai/v2/calls',
      {
        params: { model_id, limit },
        headers: {
          accept: 'text/plain',
          Authorization: 'Bearer 1741798049693x839210709547221000',
        },
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error('Synthflow proxy error:', err.message);
    res
      .status(err.response?.status || 500)
      .json({ message: err.message });
  }
});

module.exports = router;
