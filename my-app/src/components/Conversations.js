import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Conversations.css';

const Conversations = () => {
  const [calls, setCalls] = useState([]);
  const [activeCallId, setActiveCallId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch call data from API on component mount
  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const options = {
          method: 'GET',
          url: 'https://api.synthflow.ai/v2/calls',
          headers: {
            accept: 'text/plain',
            Authorization: 'Bearer 1741798049693x839210709547221000'
          }
        };
        const response = await axios.request(options);
        if (response.data.status === 'ok' && response.data.response && response.data.response.calls) {
          setCalls(response.data.response.calls);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchCalls();
  }, []);

  // Filter calls based on the search term (assumes caller id is in phone_number_from)
  const filteredCalls = calls.filter(call =>
    call.phone_number_from.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCardClick = (callId) => {
    setActiveCallId(callId === activeCallId ? null : callId);
  };

  return (
    <div className="conversations-container">
      {/* Header Section */}
      <div className="conversations-header">
        <h1>Conversations</h1>
        <div className="header-actions">
          <div className="search-bar">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search for Caller Id."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="date-picker">
            <i className="fas fa-calendar-alt"></i>
          </button>
          <button className="sort-button">
            <i className="fas fa-filter"></i>
          </button>
        </div>
      </div>

      {/* Conversation Cards */}
      <div className="conversations-list">
        {filteredCalls.map(call => (
          <div
            key={call.call_id}
            className={`conversation-card ${activeCallId === call.call_id ? 'active' : ''}`}
            onClick={() => handleCardClick(call.call_id)}
          >
            {/* Audio Playback Button */}
            <div className="audio-playback">
              {activeCallId === call.call_id ? (
                <i className="fas fa-pause"></i>
              ) : (
                <i className="fas fa-play"></i>
              )}
            </div>

            {/* Caller Information */}
            <div className="caller-info">
              <div className="caller-number">
                <strong>{call.phone_number_from}</strong>
              </div>
              <div className="call-timestamp">
                {new Date(call.start_time).toLocaleString()}
              </div>
            </div>

            {/* Tag Section (dummy tags, can be replaced with dynamic data if available) */}
            <div className="tags">
              <span className="tag">Fire Safety</span>
              <span className="tag">Deficiency Quotes</span>
              <span className="tag">Estimation Process</span>
            </div>

            {/* Conversation Description */}
            <div className="conversation-description">
              {call.transcript
                ? call.transcript.substring(0, 100) + (call.transcript.length > 100 ? '...' : '')
                : 'No transcript available.'}
            </div>

            {/* Checkbox */}
            <div className="conversation-checkbox">
              <input type="checkbox" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Conversations;
