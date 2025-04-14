import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './AppointmentTab.css';
import { FaChevronDown, FaChevronUp, FaFilter, FaTimes } from 'react-icons/fa';

const formatTimestamp = (timestamp, { timeOnly = false } = {}) => {
  let date;
  if (typeof timestamp === 'string' && isNaN(Number(timestamp))) {
    date = new Date(timestamp);
  } else {
    let tsValue = Number(timestamp);
    // Multiply by 1000 if epoch seconds
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

  const filteredAppointments = appointments.filter((apt) => {
    let matchesSearch = !searchTerm
      ? true
      : apt.phone_number.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesDate = true;
    if (appliedStartDate && appliedEndDate) {
      const aptDate = new Date(apt.callTime);
      const start = new Date(appliedStartDate);
      const end = new Date(appliedEndDate);
      end.setDate(end.getDate() + 1); // Include entire end date
      matchesDate = aptDate >= start && aptDate < end;
    }
    return matchesSearch && matchesDate;
  });

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
            <button
              className="filter-btn"
              onClick={() => setShowFilterModal(true)}
              title="Filter appointments"
            >
              <FaFilter />
            </button>
          </div>
        </div>

        {showFilterModal && (
          <div className="filter-modal-overlay">
            <div className="filter-modal">
              <div className="filter-modal-header">
                <h2>Filter Appointments</h2>
                <button
                  className="close-modal-btn"
                  onClick={() => setShowFilterModal(false)}
                  title="Close Filter"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="filter-modal-body">
                <div className="filter-presets">
                  <button onClick={() => handlePresetFilter('lastWeek')}>
                    Last Week
                  </button>
                  <button onClick={() => handlePresetFilter('lastMonth')}>
                    Last Month
                  </button>
                </div>
                <div className="custom-date-filter">
                  <div className="date-inputs">
                    <label>
                      Start Date:
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </label>
                    <label>
                      End Date:
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="date-filter-buttons">
                    <button className="apply-btn" onClick={handleApplyDateFilter}>
                      Go
                    </button>
                    <button className="clear-btn" onClick={clearDateFilter}>
                      Clear
                    </button>
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
              <div key={apt.call_id} className="appointment-item">
                <div className="appointment-item-header">
                  <span className="phone-number">{apt.phone_number}</span>
                  <div className="appointment-timestamp">
                    <span>{formatDateOnly(apt.callTime)}</span>
                    <span className="time-only">
                      {formatTimestamp(apt.callTime, { timeOnly: true })}
                    </span>
                  </div>
                  <button
                    className="toggle-details-btn"
                    onClick={() => toggleExpanded(apt.call_id)}
                  >
                    {expandedId === apt.call_id ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                </div>
                {expandedId === apt.call_id && (
                  <div className="appointment-details">
                    <p className="appointment-meta">{apt.appointmentDetails}</p>
                    <p className="appointment-summary">{apt.transcriptSummary}</p>
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
