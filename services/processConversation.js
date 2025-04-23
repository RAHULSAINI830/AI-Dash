// services/processConversation.js
const axios        = require('axios');
const Appointment  = require('../models/Appointment');
const Conversation = require('../models/conversation');

/* ───────────────── helpers (same logic as front‑end) ───────────────── */
const convertTo24Hour = (str) => {
  const [time, modRaw] = str.trim().split(/\s+/);
  if (!modRaw) return time;
  let [h, m, s = '0'] = time.split(':').map(Number);
  const mod = modRaw.toUpperCase();
  if (mod === 'PM' && h !== 12) h += 12;
  if (mod === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
};

const parseLisaDetails = (sentence) => {
  const re = /(\d{4}-\d{2}-\d{2}).*?(\\d{1,2}:\\d{2}(?::\\d{2})?)(?:\\s*(AM|PM))?/i;
  const m  = sentence.match(re);
  if (!m) return { extractedDateTime: null, callType: 'non-appointment' };
  const [ , dateStr, rawTime, ampm ] = m;
  const [Y,M,D] = dateStr.split('-').map(Number);
  let [h, min, sec='0'] = convertTo24Hour(ampm ? `${rawTime} ${ampm}` : rawTime).split(':').map(Number);
  const extractedDateTime = new Date(Y, M-1, D, h, min, sec);
  return isNaN(extractedDateTime.getTime())
    ? { extractedDateTime: null, callType: 'non-appointment' }
    : { extractedDateTime,      callType: 'appointment'     };
};

/* ───────────────── LISA agents ───────────────── */
const lisaPost = async (prompt) => {
  const { data } = await axios.post(
    'https://lisa-dev.zentrades.pro/lisa/chat',
    { question: prompt, model_name: 'llama3:latest' },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return typeof data === 'object' && data.answer ? data.answer.trim() : String(data).trim();
};

const getSummary      = (transcript) => lisaPost(
  `Summarise (plain text, one paragraph) the call transcript below.\n\nTranscript:\n${transcript}`
);

const getCategory     = (summary) => lisaPost(
  `Classify the call summary as exactly one of: appointment, non-appointment, callback, query.\nSummary:\n${summary}`
);

const getFixedDetails = (summary, callDateStr) => lisaPost(
  `Call date: ${callDateStr}\nSummary: ${summary}\nIf an appointment exists, output:\nAppointment scheduled on YYYY-MM-DD at HH:MM.\nOtherwise output:\nThis call is not for scheduling an appointment.`
);

/* ───────────────── core processor ───────────────── */
async function processConversation(conv) {
  if (!conv.transcript) return;

  const summary  = await getSummary(conv.transcript);
  const category = await getCategory(summary);

  let details;
  if (category === 'appointment') {
    const base = new Date(conv.start_time).toISOString().split('T')[0];
    details = await getFixedDetails(summary, base);
  } else {
    details = 'This call is not for scheduling an appointment.';
  }

  const { extractedDateTime, callType } = parseLisaDetails(details);
  const lisaISO = extractedDateTime ? extractedDateTime.toISOString() : null;

  /* upsert into Appointment collection */
  const query = lisaISO
    ? { phone_number: conv.phone_number_from, lisaExtractedDateTime: lisaISO }
    : { call_id: conv.call_id };

  const payload = {
    call_id          : conv.call_id,
    model_id         : conv.model_id,
    phone_number     : conv.phone_number_from,
    transcriptSummary: summary,
    appointmentDetails: details,
    callTime         : new Date(conv.start_time).toISOString(),
    lisaExtractedDateTime: lisaISO,
    callType,
    callCategory: category,
  };

  await Appointment.findOneAndUpdate(query, payload, { upsert:true, new:true });
  /* mark conversation processed */
  conv.processed = true;
  conv.save();
}

module.exports = processConversation;
