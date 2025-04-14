import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import { GiRobotHelmet, GiHumanTarget } from 'react-icons/gi';
import { FaCalendarAlt, FaFilter, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import placeholderImage from '../images/Frame 762.png';
import './ConversationsTab.css';
import { useData } from '../DataContext';

const formatTimestamp = (timestamp, { timeOnly = false } = {}) => {
  const ts = Number(timestamp);
  const tsStr = ts.toString();
  const date = tsStr.length === 10 ? new Date(ts * 1000) : new Date(ts);
  return timeOnly ? date.toLocaleTimeString() : date.toLocaleString();
};

const formatDateOnly = (timestamp) => {
  const tsStr = timestamp.toString();
  let tsVal = Number(timestamp);
  if (tsStr.length === 10) {
    tsVal *= 1000;
  }
  const date = new Date(tsVal);
  return isNaN(date.getTime()) ? 'N/A' : date.toISOString().split('T')[0];
};

const ConversationsTab = () => {
  const [callsSearchTerm, setCallsSearchTerm] = useState('');
  const [transcriptSearchTerm, setTranscriptSearchTerm] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showSortFilter, setShowSortFilter] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [transcriptSummary, setTranscriptSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState(null);

  const { profile, calls } = useData();
  const adminModelId = profile?.model_id || null;
  const [selectedCall, setSelectedCall] = useState(() => {
    const stored = sessionStorage.getItem('selectedCall');
    return stored ? JSON.parse(stored) : null;
  });

  // Added declaration for audioRef to avoid ESLint errors and ensure proper access.
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) return;

    const handleTimeUpdate = () => setCurrentTime(audioRef.current.currentTime);
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);

    // Cleanup: check if audioRef.current is valid before removing the event listener.
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [selectedCall]);

  const filteredCalls = calls
    ? calls.filter((call) => {
        let match = true;
        if (callsSearchTerm) {
          match =
            match &&
            call.phone_number_from.toLowerCase().includes(callsSearchTerm.toLowerCase());
        }
        if (startDate && endDate) {
          const callDate = new Date(call.start_time);
          const sDate = new Date(startDate);
          const eDate = new Date(endDate);
          eDate.setDate(eDate.getDate() + 1);
          match = match && callDate >= sDate && callDate < eDate;
        }
        return match;
      })
    : [];

  const handleSortFilterChange = (filter) => {
    const today = new Date();
    let sDate = '';
    let eDate = '';
    if (filter === '30') {
      sDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      eDate = today;
    } else if (filter === '90') {
      sDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      eDate = today;
    } else if (filter === 'lastMonth') {
      const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      const month = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
      sDate = new Date(year, month, 1);
      eDate = new Date(year, month + 1, 0);
    } else {
      sDate = '';
      eDate = '';
    }
    if (sDate && eDate) {
      setStartDate(sDate.toISOString().split('T')[0]);
      setEndDate(eDate.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
    setShowSortFilter(false);
  };

  const toggleDateFilter = () => {
    if (showDateFilter) {
      setStartDate('');
      setEndDate('');
    }
    setShowDateFilter(!showDateFilter);
  };

  const summaryCache = useRef({});
  const savedAppointments = useRef({});

  const fetchTranscriptSummary = async (transcript) => {
    const prompt = `
Read the following conversation transcript carefully. Generate a comprehensive, plain-text summary focusing especially on any appointment-related details discussed during the call, including the scheduled date, time, and overall purpose. Your summary should be a single, coherent paragraph in plain language.

Transcript:
${transcript}
    `;
    try {
      const response = await axios.post(
        'https://lisa-dev.zentrades.pro/lisa/chat',
        { question: prompt, model_name: 'llama3:latest' },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const result = response.data;
      return (typeof result === 'object' && result.answer)
        ? result.answer.toString().trim()
        : (typeof result === 'string' ? result.trim() : JSON.stringify(result));
    } catch (error) {
      console.error('Error fetching transcript summary:', error);
      return 'Summary could not be generated.';
    }
  };

  const fetchCorrectedAppointmentDetails = async (transcriptSummary, callStartTime) => {
    const baseDateStr = formatDateOnly(callStartTime);
    const prompt = `
The following transcript summary was generated from a call that took place on ${baseDateStr}. 
Using this base date, convert any relative time expressions (e.g., "tomorrow", "next Monday") into an exact date and time. For example, if the call occurred on 2025-03-02 and the summary indicates "tomorrow at 2 PM", the correct appointment details should be:
"Appointment scheduled on 2025-03-03 at 02:00 PM."
If the call is not for scheduling an appointment, output:
"This call is not for scheduling an appointment."
Return ONLY the sentence.

Transcript Summary:
${transcriptSummary}
    `;
    try {
      let response = await axios.post(
        'https://lisa-dev.zentrades.pro/lisa/chat',
        { question: prompt, model_name: 'llama3:latest' },
        { headers: { 'Content-Type': 'application/json' } }
      );
      let result = response.data;
      result = typeof result === 'object' && result.answer ? result.answer.toString() : (typeof result === 'string' ? result : JSON.stringify(result));
      return result.trim();
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      return 'Appointment details could not be extracted.';
    }
  };

  const saveAppointmentRecordForCall = async (call, summary, details) => {
    const callTimeDate = new Date(Number(call.start_time));
    if (isNaN(callTimeDate.getTime())) {
      console.error('Invalid callTime for call', call.call_id, call.start_time);
      return;
    }
    const appointmentData = {
      call_id: call.call_id,
      model_id: profile.model_id,
      phone_number: call.phone_number_from,
      transcriptSummary: summary,
      appointmentDetails: details,
      callTime: callTimeDate.toISOString(),
    };
    try {
      const response = await axios.post('http://localhost:5001/api/appointments', appointmentData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      console.log('Appointment record saved for call', call.call_id, response.data);
    } catch (error) {
      console.error('Error saving appointment record for call', call.call_id, error);
    }
  };

  const checkAppointmentRecordExists = async (call) => {
    try {
      const response = await axios.get(`http://localhost:5001/api/appointments/${call.call_id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return response.data && Object.keys(response.data).length > 0;
    } catch (error) {
      if (error.response?.status === 404) return false;
      console.error('Error checking appointment record for call', call.call_id, error);
      return false;
    }
  };

  useEffect(() => {
    const processAllCalls = async () => {
      if (!calls || !calls.length) return;
      for (const call of calls) {
        if (!call.transcript) continue;
        if (savedAppointments.current[call.call_id]) {
          console.log('Already processed call', call.call_id);
          continue;
        }
        const exists = await checkAppointmentRecordExists(call);
        if (exists) {
          savedAppointments.current[call.call_id] = true;
          console.log('Appointment already exists for call', call.call_id);
          continue;
        }
        let summary = summaryCache.current[call.call_id];
        if (!summary) {
          summary = await fetchTranscriptSummary(call.transcript);
          summaryCache.current[call.call_id] = summary;
        }
        const details = await fetchCorrectedAppointmentDetails(summary, call.start_time);
        await saveAppointmentRecordForCall(call, summary, details);
        savedAppointments.current[call.call_id] = true;
        console.log('Processed and saved call', call.call_id, 'with appointment details:', details);
      }
    };
    processAllCalls();
  }, [calls]);

  const handleCallSelection = (call) => {
    setSelectedCall(selectedCall?.call_id === call.call_id ? null : call);
  };

  const renderTranscript = () => {
    if (!selectedCall) return null;
    const transcript = selectedCall.transcript || '';
    const lines = transcript.split('\n').filter((line) => line.trim() !== '');
    const filteredLines = transcriptSearchTerm
      ? lines.filter((line) =>
          line.toLowerCase().includes(transcriptSearchTerm.toLowerCase())
        )
      : lines;
    let activeLineIndex = -1;
    if (audioRef.current?.duration && filteredLines.length) {
      activeLineIndex = Math.floor((currentTime / audioRef.current.duration) * filteredLines.length);
    }
    return filteredLines.map((line, index) => {
      const trimmed = line.trim();
      let speaker = trimmed.toLowerCase().startsWith('human:') ? 'human' : 'bot';
      let message = trimmed.replace(/^human:\s*/i, '').replace(/^bot:\s*/i, '').trim();
      if (transcriptSearchTerm) {
        const regex = new RegExp(`(${transcriptSearchTerm})`, 'gi');
        message = message.split(regex).map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="highlight">
              {part}
            </span>
          ) : (
            part
          )
        );
      }
      return (
        <div
          key={index}
          className={`transcript-line ${speaker} ${index === activeLineIndex ? 'active-line' : ''
            }`}
        >
          <div className="speaker-icon">
            {speaker === 'bot' ? (
              <GiRobotHelmet size={24} color="#1890ff" />
            ) : (
              <GiHumanTarget size={24} color="#ff4d4f" />
            )}
          </div>
          <div className="message-content">
            <div className="message-text">{message}</div>
            <div className="message-timestamp">
              <span className="green-dot" />
              <span>{formatTimestamp(selectedCall.start_time, { timeOnly: true })}</span>
            </div>
          </div>
        </div>
      );
    });
  };

  if (!calls) {
    return (
      <div className="conversations-tab">
        <Sidebar />
        <div className="conversations-main">
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="conversations-tab">
      <Sidebar />
      <div className="conversations-main">
        <div className="transcript-panel">
          {selectedCall ? (
            <>
              <div className="transcript-header">
                <div className="phone-number">
                  <strong>{selectedCall.phone_number_from}</strong>
                </div>
                <div className="tags-datetime">
                  <span className="call-date">{formatDateOnly(selectedCall.start_time)}</span>
                  <span className="call-time">
                    {formatTimestamp(selectedCall.start_time, { timeOnly: true })}
                  </span>
                </div>
              </div>
              {selectedCall.recording_url && (
                <div className="audio-player">
                  <audio ref={audioRef} controls style={{ width: '100%' }} src={selectedCall.recording_url}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              {isSummarizing ? (
                <p>Summarizing transcript...</p>
              ) : transcriptSummary ? (
                <div className="transcript-summary">
                  <p>{transcriptSummary}</p>
                </div>
              ) : null}
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
              <button className="date-picker-btn" onClick={toggleDateFilter} title="Filter by Date">
                <FaCalendarAlt />
              </button>
              <button
                className="sort-btn"
                onClick={() => setShowSortFilter(!showSortFilter)}
                title="Preset Date Filters"
              >
                <FaFilter />
              </button>
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
          <div className="calls-list">
            {filteredCalls.length ? (
              filteredCalls.map((call) => (
                <div
                  key={call.call_id}
                  className={`call-card ${selectedCall && selectedCall.call_id === call.call_id ? 'active' : ''}`}
                  onClick={() => handleCallSelection(call)}
                >
                  <div className="audio-btn">
                    {selectedCall && selectedCall.call_id === call.call_id ? (
                      <i className="fas fa-pause" />
                    ) : (
                      <i className="fas fa-play" />
                    )}
                  </div>
                  <div className="call-info">
                    <div className="call-number">
                      <strong>{call.phone_number_from}</strong>
                    </div>
                    <div className="call-timestamp">
                      <span className="green-dot" />
                      <span>{formatDateOnly(call.start_time)}</span>
                      <span className="time-only">{formatTimestamp(call.start_time, { timeOnly: true })}</span>
                    </div>
                    <div className="call-summary">
                      {call.transcript
                        ? call.transcript.substring(0, 50) + (call.transcript.length > 50 ? '...' : '')
                        : 'No transcript available.'}
                    </div>
                  </div>
                  <div className="call-checkbox">
                    <input type="checkbox" />
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', padding: '20px' }}>
                {adminModelId
                  ? 'No conversations found for your model ID.'
                  : 'No model ID set for this admin.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationsTab;
