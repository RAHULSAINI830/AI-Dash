const axios       = require('axios');
const User        = require('../models/user');
const Appointment = require('../models/Appointment');

/* ------------- tiny helper copies from earlier code ------------- */
const convertTo24 = (str) => { /* same body as before */ };
const parseLisaDetails = (sentence) => { /* same body as before */ };

const lisaChat = async (prompt) => {
  const { data } = await axios.post(
    'https://lisa-dev.zentrades.pro/lisa/chat',
    { question: prompt, model_name: 'llama3:latest' },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return typeof data === 'object' && data.answer ? data.answer.trim()
       : typeof data === 'string'                 ? data.trim()
       : JSON.stringify(data);
};

/* --------------------------------------------------------------- */
async function processCall(call, model_id) {
  if (!call.transcript) return;

  // 1) get summary
  const summary = await lisaChat(
    `Summarise the call in one paragraph.\n\nTranscript:\n${call.transcript}`
  );

  // 2) classify
  const category = (await lisaChat(
    `Classify the call as appointment, non-appointment, callback, or query.\n\nSummary:\n${summary}`
  )).toLowerCase();

  // 3) slot sentence (only if appointment)
  let details;
  if (category === 'appointment') {
    const base = new Date(call.start_time).toISOString().split('T')[0];
    details = await lisaChat(
      `Call date: ${base}\nSummary: ${summary}\nReturn either:\nAppointment scheduled on YYYY-MM-DD at HH:MM.\nOR\nThis call is not for scheduling an appointment.`
    );
  } else {
    details = 'This call is not for scheduling an appointment.';
  }

  // 4) parse slot
  const { extractedDateTime, callType } = parseLisaDetails(details);
  const lisaISO = extractedDateTime ? extractedDateTime.toISOString() : null;

  // 5) upsert directly into Appointment
  const query = lisaISO
    ? { phone_number: call.phone_number_from, lisaExtractedDateTime: lisaISO }
    : { call_id: call.call_id };

  await Appointment.findOneAndUpdate(
    query,
    {
      call_id          : call.call_id,
      model_id,
      phone_number     : call.phone_number_from,
      transcriptSummary: summary,
      appointmentDetails: details,
      callTime         : new Date(call.start_time).toISOString(),
      lisaExtractedDateTime: lisaISO,
      callType,
      callCategory     : category,
    },
    { upsert: true, new: true }
  );
}

async function pollOnce() {
  // pull every distinct model_id from users
  const modelIds = await User.distinct('model_id', { model_id: { $ne: '' } });

  for (const model_id of modelIds) {
    // pull recent calls from Synthflow
    const { data } = await axios.get('https://api.synthflow.ai/v2/calls', {
      params : { model_id, limit: 25 },
      headers: { Authorization: 'Bearer 1741798049693x839210709547221000' },
    });
    const calls = data.calls || data;  // adjust if response wrapper differs
    console.log('🔍 Synthflow raw response:', JSON.stringify(data, null, 2));


    for (const call of calls) {
      await processCall(call, model_id);
    }
  }
}

module.exports = pollOnce;
