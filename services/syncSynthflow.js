// services/syncSynthflow.js
const axios        = require('axios');
const Conversation = require('../models/conversation');
const User         = require('../models/user');
const processConversation = require('./processConversation');

/** Fetch all unique model_ids from User collection */
async function getAllModelIds() {
  const models = await User.distinct('model_id', { model_id: { $ne: '' } });
  return models;
}

/** Call Synthflow API for a given model_id (last 50 calls) */
async function fetchSynthflowCalls(model_id, afterIso) {
  const url = 'https://api.synthflow.ai/v2/calls';
  const params = { model_id, limit: 50 };
  if (afterIso) params.after = afterIso;      // Synthflow supports ?after <ISO> filter
  const { data } = await axios.get(url, {
    params,
    headers: { Authorization: 'Bearer 1741798049693x839210709547221000' },
  });
  return data.calls || data;  // adjust if API wraps differently
}

/** Insert new conversations and process them */
async function syncForModel(model_id) {
  /* 1. find the newest call already stored for this model */
  const latest = await Conversation
    .findOne({ model_id })
    .sort({ start_time: -1 })
    .select('start_time');

  const afterIso = latest ? new Date(latest.start_time).toISOString() : null;

  /* 2. pull calls from Synthflow */
  const incoming = await fetchSynthflowCalls(model_id, afterIso);

  /* 3. iterate & save new ones */
  for (const call of incoming) {
    const exists = await Conversation.exists({ call_id: call.call_id });
    if (exists) continue;                       // skip duplicates

    const conv = new Conversation({
      model_id,
      call_id      : call.call_id,
      transcript   : call.transcript,
      start_time   : call.start_time,
      recording_url: call.recording_url,
      processed    : false,
      phone_number_from: call.phone_number_from,
    });
    await conv.save();

    /* 4. fire processing immediately */
    await processConversation(conv);
  }
}

/** Main entry – called from server.js cron */
async function syncSynthflow() {
  try {
    const modelIds = await getAllModelIds();
    for (const id of modelIds) {
      await syncForModel(id);
    }
  } catch (err) {
    console.error('Synthflow sync error:', err.message);
  }
}

module.exports = syncSynthflow;
