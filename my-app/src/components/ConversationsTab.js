import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import { GiRobotHelmet, GiHumanTarget } from 'react-icons/gi';
import { FaCalendarAlt, FaFilter, FaTimes } from 'react-icons/fa';
import placeholderImage from '../images/Frame 762.png';
import './ConversationsTab.css';
import { useData } from '../DataContext';

/* ────────────────────  helpers ──────────────────── */
const formatTimestamp = (timestamp, { timeOnly = false } = {}) => {
  const ts = Number(timestamp);
  const date = ts.toString().length === 10 ? new Date(ts * 1000) : new Date(ts);
  return timeOnly ? date.toLocaleTimeString() : date.toLocaleString();
};

const formatDateOnly = (timestamp) => {
  const tsVal = Number(timestamp.toString().length === 10 ? timestamp * 1000 : timestamp);
  const date = new Date(tsVal);
  return isNaN(date.getTime()) ? 'N/A' : date.toISOString().split('T')[0];
};

// 12‑h ➜ 24‑h (handles optional seconds)
const convertTo24Hour = (timeStr) => {
  const [timePart, rawMod] = timeStr.trim().split(/\s+/);
  if (!rawMod) return timeStr;
  let [h, m, s = '0'] = timePart.split(':').map((n) => parseInt(n, 10));
  const mod = rawMod.toUpperCase();
  if (mod === 'PM' && h !== 12) h += 12;
  if (mod === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}${timePart.split(':')[2] ? `:${s.toString().padStart(2, '0')}` : ''}`;
};

// pull YYYY‑MM‑DD + time → local Date
// Accepts 2025‑05‑07 at 14:00  **or** 2025‑05‑07 at 2:00 PM
// Recognises either AM/PM *or* 24‑hour time and ignores any trailing punctuation.
const parseLisaDetails = (details) => {
  if (!details) {
    return { extractedDateTime: null, callType: 'non-appointment' };
  }

  // Quick check: if the sentence *starts* with our canonical phrase,
  // we already know it's an appointment.
  const isAppointmentSentence = /^appointment scheduled on/i.test(details.trim());

  //     1) date          2) time          3) AM/PM (optional)
  const re = /(\d{4}-\d{2}-\d{2}).*?(\d{1,2}:\d{2}(?::\d{2})?)\s*(AM|PM)?/i;
  const m = details.match(re);

  if (!m) {
    // Couldn’t parse date-time; decide solely from the sentence prefix.
    return { extractedDateTime: null, callType: isAppointmentSentence ? 'appointment' : 'non-appointment' };
  }

  const [, dateStr, timeStr, ampm] = m;
  const [yyyy, mm, dd] = dateStr.split('-').map(Number);

  // Normalise time to 24‑h
  let [h, min, sec = '0'] = timeStr.split(':').map(Number);
  if (ampm) {
    const up = ampm.toUpperCase();
    if (up === 'PM' && h !== 12) h += 12;
    if (up === 'AM' && h === 12) h = 0;
  }
  const extractedDateTime = new Date(yyyy, mm - 1, dd, h, min, sec);

  return isNaN(extractedDateTime.getTime())
    ? { extractedDateTime: null, callType: 'non-appointment' }
    : { extractedDateTime, callType: 'appointment' };
};



const LOCAL_KEY_PROCESSED_CALLS = 'processedCalls';

/* ────────────────────  component ──────────────────── */
const ConversationsTab = () => {
  /* state */
  const [callsSearchTerm, setCallsSearchTerm] = useState('');
  const [transcriptSearchTerm, setTranscriptSearchTerm] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showSortFilter, setShowSortFilter] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const { profile, calls } = useData();
  const adminModelId = profile?.model_id || null;

  const [selectedCall, setSelectedCall] = useState(() => {
    const stored = sessionStorage.getItem('selectedCall');
    return stored ? JSON.parse(stored) : null;
  });

  const summaryCache = useRef({});
  const audioRef = useRef(null);

  /* sync audio position → highlighted transcript line */
  useEffect(() => {
    if (!audioRef.current) return;
    const listener = () => setCurrentTime(audioRef.current.currentTime);
    audioRef.current.addEventListener('timeupdate', listener);
    return () => audioRef.current?.removeEventListener('timeupdate', listener);
  }, [selectedCall]);
  
  
  /* ── backend helpers ─────────────────────────────── */
  const checkAppointmentRecordExists = async (call, lisaISO) => {
    try {
      const params = lisaISO
        ? { phone_number: call.phone_number_from, lisaExtractedDateTime: lisaISO }
        : { call_id: call.call_id };

      const { data } = await axios.get('http://localhost:5001/api/appointments/exists', {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return data.exists;
    } catch (err) {
      console.error('Exists‑check failed', err);
      return false;
    }
  };

  const fetchTranscriptSummary = async (transcript) => {
    const prompt = `Read the following conversation transcript carefully. Generate a comprehensive, plain‑text summary focusing especially on any appointment‑related details discussed during the call, including the scheduled date, time, and overall purpose. Your summary should be a single, coherent paragraph in plain language.\n\nTranscript:\n${transcript}`;
    try {
      const { data } = await axios.post(
        'https://lisa-dev.zentrades.pro/lisa/chat',
        { question: prompt, model_name: 'llama3:latest' },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return typeof data === 'object' && data.answer ? data.answer.trim()
        : typeof data === 'string' ? data.trim()
          : JSON.stringify(data);
    } catch (err) {
      console.error('Error fetching transcript summary:', err);
      return 'Summary could not be generated.';
    }
  };

  // Extract an *exact* date‑time from a summary, no matter how messy the wording is.
  const fetchCorrectedAppointmentDetails = async (summary, callStartTime) => {
    const baseDateStr = formatDateOnly(callStartTime);           // YYYY‑MM‑DD of the call
    const prompt = `
You are an appointment–extraction assistant.

**Context**
• The phone call happened on **${baseDateStr}** (caller’s local time).
• Below you get a *summary* of that call (NOT the full transcript).

**Goal**
Find the first explicit or implicit appointment that was agreed to,
then convert it into an exact, local date and start‑time.

**How to resolve dates**
1. “today”, “tomorrow”, “yesterday” → compute relative to ${baseDateStr}.
2. “next <weekday>” → the next occurrence *after* ${baseDateStr}.
3. “this <weekday>” → the occurrence *in the same week* as ${baseDateStr}.
4. If the summary gives only a weekday with no week reference, assume the **next upcoming** occurrence.
5. If the summary gives a month & day but no year, use the **same year** as ${baseDateStr}.
6. If a time of day is vague (“morning, afternoon, evening”) map it to:
   • morning → 09:00  
   • afternoon → 14:00  
   • evening → 19:00

**Output format (STRICT)**
• If an appointment was scheduled, output **exactly**:
  Appointment scheduled on YYYY-MM-DD at HH:MM.
  – Use 24‑hour time, pad minutes with 0 if needed.
  – No seconds, no timezone suffix, no extra words.
• If the call is NOT about scheduling an appointment, output:
  This call is not for scheduling an appointment.

**Examples**

Caller summary → Expected output  
———————————————————————————————————————  
“…let’s meet **tomorrow at 2 PM**.”            → Appointment scheduled on 2025-04-18 at 14:00.  
“…see you **next Monday morning**.”            → Appointment scheduled on 2025-04-21 at 09:00.  
“…come by **Feb 3 at 11**.”                    → Appointment scheduled on 2025-02-03 at 11:00.  
“…nothing to schedule today.”                  → This call is not for scheduling an appointment.

**Summary**
${summary}
  `.trim();

    try {
      const { data } = await axios.post(
        'https://lisa-dev.zentrades.pro/lisa/chat',
        { question: prompt, model_name: 'llama3:latest' },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return typeof data === 'object' && data.answer
        ? data.answer.trim()
        : typeof data === 'string'
          ? data.trim()
          : JSON.stringify(data);
    } catch (err) {
      console.error('Error fetching appointment details:', err);
      return 'Appointment details could not be extracted.';
    }
  };

  /* ───────────────── helper ───────────────── */
  const fetchCallCategory = async (summary) => {
    const prompt = `
You are a call‑routing assistant.

Read the summary below and output **one** of these labels
EXACTLY (lower‑case, no punctuation):
appointment
non-appointment
callback
query

Definitions:
• appointment   – customer agrees on a future date or time to meet / service.
• callback      – customer asks the agent to call them later (but no slot fixed).
• query         – customer just asks a question / information.
• non-appointment – anything else, chit‑chat, wrong number, etc.

Summary:
${summary}`.trim();

    try {
      const { data } = await axios.post(
        'https://lisa-dev.zentrades.pro/lisa/chat',
        { question: prompt, model_name: 'llama3:latest' },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const raw = typeof data === 'object' && data.answer ? data.answer : data;
      const cat = String(raw).trim().toLowerCase();
      const allowed = ['appointment', 'non-appointment', 'callback', 'query'];
      return allowed.includes(cat) ? cat : 'non-appointment';
    } catch (err) {
      console.error('Category agent error:', err);
      return 'non-appointment';
    }
  };


  const saveAppointmentRecordForCall = async (call, summary, details, callCategory) => {
    const callTimeDate = new Date(Number(call.start_time));
    if (isNaN(callTimeDate.getTime())) return console.error('Invalid callTime', call.call_id);

    const { extractedDateTime, callType } = parseLisaDetails(details);
    const lisaExtractedDateTime = extractedDateTime ? extractedDateTime.toISOString() : null;

    const payload = {
      call_id: call.call_id,
      model_id: profile.model_id,
      phone_number: call.phone_number_from,
      transcriptSummary: summary,
      appointmentDetails: details,
      callTime: callTimeDate.toISOString(),
      lisaExtractedDateTime,
      callType,
      callCategory,
    };

    try {
      await axios.post('http://localhost:5001/api/appointments', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      console.log('Appointment saved for', call.call_id);
    } catch (err) {
      console.error('Error saving appointment', call.call_id, err);
    }
  };

  /* ── process each call once ───────────────────────── */
  useEffect(() => {
    const run = async () => {
      if (!calls?.length) return;

      // local-storage guard (leave it if you still want it)
      const processed =
        JSON.parse(localStorage.getItem(LOCAL_KEY_PROCESSED_CALLS)) || {};

      // 0) Sort calls chronologically by start_time
      const sortedCalls = [...calls].sort((a, b) => {
        const ta = new Date(a.start_time).getTime();
        const tb = new Date(b.start_time).getTime();
        return ta - tb;
      });

      for (const call of sortedCalls) {
        if (!call.transcript || processed[call.call_id]) continue;

        /* 1 — get / cache transcript summary */
        let summary = summaryCache.current[call.call_id];
        if (!summary) {
          summary = await fetchTranscriptSummary(call.transcript);
          summaryCache.current[call.call_id] = summary;
        }

        /* 2 — classify the call */
        const callCategory = await fetchCallCategory(summary);

        /* 3 — If it’s an appointment, normalise the slot; else skip */
        let details;
        if (callCategory === 'appointment') {
          details = await fetchCorrectedAppointmentDetails(summary, call.start_time);
        } else {
          details = 'This call is not for scheduling an appointment.';
        }

        /* 4 — Parse slot into ISO */
        const { extractedDateTime } = parseLisaDetails(details);
        const lisaISO = extractedDateTime ? extractedDateTime.toISOString() : null;

        /* 5 — Dedup probe */
        const exists = await checkAppointmentRecordExists(call, lisaISO);
        if (exists) {
          await saveAppointmentRecordForCall(call, summary, details, callCategory);
          processed[call.call_id] = true;
          localStorage.setItem(LOCAL_KEY_PROCESSED_CALLS, JSON.stringify(processed));
          continue;
        }

        /* 6 — Save new record */
        await saveAppointmentRecordForCall(call, summary, details, callCategory);
        processed[call.call_id] = true;
        localStorage.setItem(LOCAL_KEY_PROCESSED_CALLS, JSON.stringify(processed));
      }
    };

    run();
  }, [calls, profile?.model_id]);





  /* ── UI filtering helpers ─────────────────────────── */
  const filteredCalls = calls
    ? calls.filter((c) => {
      let ok = true;
      if (callsSearchTerm)
        ok = ok && c.phone_number_from.toLowerCase().includes(callsSearchTerm.toLowerCase());
      if (startDate && endDate) {
        const cd = new Date(c.start_time);
        const sd = new Date(startDate);
        const ed = new Date(endDate);
        ed.setDate(ed.getDate() + 1);
        ok = ok && cd >= sd && cd < ed;
      }
      return ok;
    })
    : [];

  const handleSortFilterChange = (preset) => {
    const now = new Date();
    let s = '', e = '';
    if (preset === '30') {
      s = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      e = now;
    } else if (preset === '90') {
      s = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      e = now;
    } else if (preset === 'lastMonth') {
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      s = new Date(year, month, 1);
      e = new Date(year, month + 1, 0);
    }
    setStartDate(s ? s.toISOString().split('T')[0] : '');
    setEndDate(e ? e.toISOString().split('T')[0] : '');
    setShowSortFilter(false);
  };

  const toggleDateFilter = () => {
    if (showDateFilter) { setStartDate(''); setEndDate(''); }
    setShowDateFilter(!showDateFilter);
  };

  /* ── transcript renderer ──────────────────────────── */
  const renderTranscript = () => {
    if (!selectedCall) return null;
    const transcript = selectedCall.transcript || '';
    const lines = transcript.split('\n').filter(Boolean);
    const fLines = transcriptSearchTerm
      ? lines.filter((l) => l.toLowerCase().includes(transcriptSearchTerm.toLowerCase()))
      : lines;

    let activeIdx = -1;
    if (audioRef.current?.duration && fLines.length)
      activeIdx = Math.floor((currentTime / audioRef.current.duration) * fLines.length);

    return fLines.map((line, idx) => {
      const trimmed = line.trim();
      const isHuman = trimmed.toLowerCase().startsWith('human:');
      const message = trimmed.replace(/^human:\s*/i, '').replace(/^bot:\s*/i, '');

      const highlighted = transcriptSearchTerm
        ? message.split(new RegExp(`(${transcriptSearchTerm})`, 'gi')).map((p, i) =>
          p.toLowerCase() === transcriptSearchTerm.toLowerCase()
            ? <span key={i} className="highlight">{p}</span>
            : p
        )
        : message;

      return (
        <div
          key={idx}
          className={`transcript-line ${isHuman ? 'human' : 'bot'} ${idx === activeIdx ? 'active-line' : ''}`}
        >
          <div className="speaker-icon">
            {isHuman
              ? <GiHumanTarget size={24} color="#ff4d4f" />
              : <GiRobotHelmet size={24} color="#1890ff" />}
          </div>
          <div className="message-content">
            <div className="message-text">{highlighted}</div>
            <div className="message-timestamp">
              <span className="green-dot" />
              <span>{formatTimestamp(selectedCall.start_time, { timeOnly: true })}</span>
            </div>
          </div>
        </div>
      );
    });
  };

  /* ── render ───────────────────────────────────────── */
  if (!calls)
    return (
      <div className="conversations-tab">
        <Sidebar />
        <div className="conversations-main"><p>Loading conversations...</p></div>
      </div>
    );

  return (
    <div className="conversations-tab">
      <Sidebar />
      <div className="conversations-main">
        {/* ───────────────── transcript panel ───────────────── */}
        <div className="transcript-panel">
          {selectedCall ? (
            <>
              <div className="transcript-header">
                <div className="phone-number"><strong>{selectedCall.phone_number_from}</strong></div>
                <div className="tags-datetime">
                  <span className="call-date">{formatDateOnly(selectedCall.start_time)}</span>
                  <span className="call-time">{formatTimestamp(selectedCall.start_time, { timeOnly: true })}</span>
                </div>
              </div>

              {selectedCall.recording_url && (
                <div className="audio-player">
                  <audio ref={audioRef} controls style={{ width: '100%' }} src={selectedCall.recording_url}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              <div className="transcript-search">
                <i className="fas fa-search" />
                <input
                  type="text"
                  placeholder="Search for Keywords."
                  value={transcriptSearchTerm}
                  onChange={(e) => setTranscriptSearchTerm(e.target.value)}
                />
              </div>
              <div className="transcript-content">{renderTranscript()}</div>
            </>
          ) : (
            <div className="no-selection">
              <img src={placeholderImage} alt="Please select a conversation" className="placeholder-image" />
            </div>
          )}
        </div>

        {/* ───────────────── calls list panel ───────────────── */}
        <div className="calls-panel">
          <div className="calls-header">
            <h1>Conversations</h1>
            <div className="calls-header-actions">
              <div className="calls-search-bar">
                <i className="fas fa-search" />
                <input
                  type="text"
                  placeholder="Search for Caller Id."
                  value={callsSearchTerm}
                  onChange={(e) => setCallsSearchTerm(e.target.value)}
                />
              </div>
              <button className="date-picker-btn" onClick={toggleDateFilter} title="Filter by Date"><FaCalendarAlt /></button>
              <button className="sort-btn" onClick={() => setShowSortFilter(!showSortFilter)} title="Preset Date Filters"><FaFilter /></button>

              {showSortFilter && (
                <div className="sort-dropdown">
                  <button onClick={() => handleSortFilterChange('30')}>Last 30 Days</button>
                  <button onClick={() => handleSortFilterChange('90')}>Last 90 Days</button>
                  <button onClick={() => handleSortFilterChange('lastMonth')}>Last Month</button>
                  <button onClick={() => handleSortFilterChange('')}>Clear</button>
                </div>
              )}
            </div>

            {showDateFilter && (
              <div className="date-filter">
                <div className="date-input">
                  <label>Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="date-input">
                  <label>End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <button className="icon-btn close-btn" onClick={() => setShowDateFilter(false)} title="Close Date Filter">
                  <FaTimes />
                </button>
              </div>
            )}
          </div>

          {/* ── call cards list ── */}
          <div className="calls-list">
            {filteredCalls.length ? (
              filteredCalls.map((call) => (
                <div
                  key={call.call_id}
                  className={`call-card ${selectedCall?.call_id === call.call_id ? 'active' : ''}`}
                  onClick={() => setSelectedCall(selectedCall?.call_id === call.call_id ? null : call)}
                >
                  <div className="audio-btn">
                    {selectedCall?.call_id === call.call_id ? <i className="fas fa-pause" /> : <i className="fas fa-play" />}
                  </div>
                  <div className="call-info">
                    <div className="call-number"><strong>{call.phone_number_from}</strong></div>
                    <div className="call-timestamp">
                      <span className="green-dot" />
                      <span>{formatDateOnly(call.start_time)}</span>
                      <span className="time-only">{formatTimestamp(call.start_time, { timeOnly: true })}</span>
                    </div>
                    <div className="call-summary">
                      {call.transcript
                        ? `${call.transcript.substring(0, 50)}${call.transcript.length > 50 ? '…' : ''}`
                        : 'No transcript available.'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', padding: '20px' }}>
                {adminModelId ? 'No conversations found for your model ID.' : 'No model ID set for this admin.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationsTab;
