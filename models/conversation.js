// src/models/conversation.js
const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  model_id: { type: String, required: true }, // The admin's model_id
  call_id: { type: String, required: true },
  transcript: { type: String },
  start_time: { type: Date },
  recording_url: { type: String },
  // Add any additional fields you need
});

module.exports = mongoose.model('Conversation', ConversationSchema);
