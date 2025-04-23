import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './AppointmentTab.css';
import { FaChevronDown, FaChevronUp, FaFilter, FaTimes } from 'react-icons/fa';

// Helper to format a full timestamp into a local date/time string.
const formatTimestamp = (timestamp, { timeOnly = false } = {}) => {
  let date;
  if (typeof timestamp === 'string' && isNaN(Number(timestamp))) {
    date = new Date(timestamp);
  } else {
    let tsValue = Number(timestamp);
    if (timestamp.toString().length === 10) {
      tsValue *= 1000;
    }
    date = new Date(tsValue);
  }
  return isNaN(date.getTime())
    ? 'Invalid Date'
    : timeOnly
      ? date.toLocaleTimeString()
      : date.toLocaleString();
};

/**
 * Turn a Date (or parsable timestamp) into an RFC3339 string
 * with your local offset baked in, e.g. “2025-04-21T15:30:00+05:30”.
 */
const toLocalRFC3339 = (dateInput) => {
  const dt = new Date(dateInput);
  const pad = (n) => String(n).padStart(2, '0');

  // Minutes east of UTC
  const offsetMinutes = -dt.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const h = pad(Math.floor(abs / 60));
  const m = pad(abs % 60);

  return (
    dt.getFullYear()         + '-' +
    pad(dt.getMonth() + 1)   + '-' +
    pad(dt.getDate())        + 'T' +
    pad(dt.getHours())       + ':' +
    pad(dt.getMinutes())     + ':' +
    pad(dt.getSeconds())     +
    sign + h + ':' + m
  );
};


// Helper to format a date-only (YYYY-MM-DD).
const formatDateOnly = (timestamp) => {
  let date;
  if (typeof timestamp === 'string' && isNaN(Number(timestamp))) {
    date = new Date(timestamp);
  } else {
    let tsValue = Number(timestamp);
    if (timestamp.toString().length === 10) {
      tsValue *= 1000;
    }
    date = new Date(tsValue);
  }
  return isNaN(date.getTime()) ? 'N/A' : date.toISOString().split('T')[0];
};

// Helper to format the extracted appointment datetime.
const formatExtractedDateTime = (timestamp) => {
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
};

const AppointmentTab = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');

  // Fetch appointments from backend.
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/appointments', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        let fetched = response.data;
        if (!Array.isArray(fetched)) {
          fetched = Array.isArray(fetched.appointments) ? fetched.appointments : [];
        }
        setAppointments(fetched);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  const toggleExpanded = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Preset filter handlers.
  const handlePresetFilter = (preset) => {
    const today = new Date();
    let startDate = '';
    let endDate = '';
    if (preset === 'lastWeek') {
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = lastWeek.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    } else if (preset === 'lastMonth') {
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = lastMonth.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setShowFilterModal(false);
  };

  const handleApplyDateFilter = () => {
    setAppliedStartDate(customStartDate);
    setAppliedEndDate(customEndDate);
    setShowFilterModal(false);
  };

  const clearDateFilter = () => {
    setCustomStartDate('');
    setCustomEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setShowFilterModal(false);
  };

  // Filter appointments based on search criteria.
  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch = !searchTerm
      ? true
      : apt.phone_number.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesDate = true;
    if (appliedStartDate && appliedEndDate) {
      const aptDate = new Date(apt.callTime);
      const start = new Date(appliedStartDate);
      const end = new Date(appliedEndDate);
      end.setDate(end.getDate() + 1);
      matchesDate = aptDate >= start && aptDate < end;
    }
    return matchesSearch && matchesDate;
  });

  // API call to update appointment status.
  // Shows the "Add to Calendar" button.
  const handleAcceptAppointment = async (apt) => {
    try {
      if (!apt.lisaExtractedDateTime) {
        console.error('No extracted datetime.');
        return;
      }
  
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
      // 1) Parse your extracted ISO back into a Date
      const start = new Date(apt.lisaExtractedDateTime);
      // 2) Clone & add 30 min
      const end = new Date(start.getTime() + 30 * 60000);
  
      // 3) Serialize each into RFC‑3339 + local offset
      const startDateTime = toLocalRFC3339(start);
      const endDateTime   = toLocalRFC3339(end);
  
      const event = {
        summary:     `Appointment with ${apt.phone_number}`,
        description: apt.appointmentDetails,
        start:  { dateTime: startDateTime, timeZone },
        end:    { dateTime: endDateTime,   timeZone },
      };
  
      if (!window.gapi?.client?.calendar) {
        console.error('Google API client not ready.');
        return;
      }
  
      const evRes = await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource:   event,
        sendUpdates: 'all',
      });
  
      const calendarEventId = evRes.result.id;
      const resp = await axios.put(
        `http://localhost:5001/api/appointments/status/${apt._id}`,
        { appointmentStatus: 'accepted', calendarEventId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
  
      setAppointments((prev) =>
        prev.map((item) =>
          item._id === apt._id ? resp.data.appointment : item
        )
      );
    } catch (err) {
      console.error('Error accepting appointment:', err);
    }
  };
  
  

  // API call to reject appointment.
  const handleRejectAppointment = async (apt) => {
    try {
      const response = await axios.put(
        `http://localhost:5001/api/appointments/status/${apt._id}`,
        { appointmentStatus: 'rejected' },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      setAppointments(
        appointments.map((item) =>
          item._id === apt._id ? response.data.appointment : item
        )
      );
    } catch (error) {
      console.error('Error rejecting appointment:', error);
    }
  };

  return (
    <div className="appointment-tab">
      <Sidebar />
      <div className="appointment-main">
        <div className="appointment-header-top">
          <h1 className="appointment-title">Appointments</h1>
          <div className="appointment-controls">
            <div className="search-wrapper">
              <input
                type="text"
                className="appointment-search"
                placeholder="Search by number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="filter-btn" onClick={() => setShowFilterModal(true)} title="Filter appointments">
              <FaFilter />
            </button>
          </div>
        </div>

        {showFilterModal && (
          <div className="filter-modal-overlay">
            <div className="filter-modal">
              <div className="filter-modal-header">
                <h2>Filter Appointments</h2>
                <button className="close-modal-btn" onClick={() => setShowFilterModal(false)} title="Close Filter">
                  <FaTimes />
                </button>
              </div>
              <div className="filter-modal-body">
                <div className="filter-presets">
                  <button onClick={() => handlePresetFilter('lastWeek')}>Last Week</button>
                  <button onClick={() => handlePresetFilter('lastMonth')}>Last Month</button>
                </div>
                <div className="custom-date-filter">
                  <div className="date-inputs">
                    <label>
                      Start Date:
                      <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                    </label>
                    <label>
                      End Date:
                      <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                    </label>
                  </div>
                  <div className="date-filter-buttons">
                    <button className="apply-btn" onClick={handleApplyDateFilter}>Go</button>
                    <button className="clear-btn" onClick={clearDateFilter}>Clear</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p>Loading appointments...</p>
        ) : filteredAppointments.length > 0 ? (
          <div className="appointment-list">
            {filteredAppointments.map((apt) => (
              <div
                key={apt.call_id}
                className={`appointment-item ${
                  apt.callType === 'appointment' ? 'appointment-appointment' : 'appointment-non'
                }`}
              >
                <div className="appointment-item-header">
                  <span className="phone-number">{apt.phone_number}</span>
                  <div className="appointment-timestamp">
                    <span>{formatDateOnly(apt.callTime)}</span>
                    <span className="time-only">{formatTimestamp(apt.callTime, { timeOnly: true })}</span>
                  </div>
                  {apt.lisaExtractedDateTime && (
                    <div className="extracted-timestamp">
                      <span>Extracted: </span>
                      <span>{formatExtractedDateTime(apt.lisaExtractedDateTime)}</span>
                    </div>
                  )}
                  {apt.callType === 'appointment' && (
                    <div className="status-label">
                      {apt.appointmentStatus === 'accepted' ? (
                        <span className="accepted-label">Accepted</span>
                      ) : apt.appointmentStatus === 'rejected' ? (
                        <span className="rejected-label">Rejected</span>
                      ) : (
                        <span className="pending-label">Pending</span>
                      )}
                    </div>
                  )}
                  <button className="toggle-details-btn" onClick={() => toggleExpanded(apt.call_id)}>
                    {expandedId === apt.call_id ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                </div>
                {expandedId === apt.call_id && (
                  <div className="appointment-details">
                    <p className="appointment-meta">{apt.appointmentDetails}</p>
                    <p className="appointment-summary">{apt.transcriptSummary}</p>
                    {/* Show action buttons only if it's an appointment call (i.e. valid extracted datetime)
                        and the status is either pending or undefined */}
                    {apt.callType === 'appointment' && (!apt.appointmentStatus || apt.appointmentStatus === 'pending') && (
                      <div className="action-buttons">
                        <button className="accept-btn" onClick={() => handleAcceptAppointment(apt)}>
                          Add to Calendar
                        </button>
                        <button className="reject-btn" onClick={() => handleRejectAppointment(apt)}>
                          Reject Appointment
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No appointments found.</p>
        )}
      </div>
    </div>
  );
};

export default AppointmentTab;
