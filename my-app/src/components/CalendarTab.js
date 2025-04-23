// src/components/CalendarTab.js
import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, Views, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Sidebar from './Sidebar';
import { 
  FaChevronLeft, 
  FaChevronRight, 
  FaRegCalendarAlt, 
  FaThLarge, 
  FaCalendarDay,
  FaListUl,
  FaPlus,
  FaTimes,
  FaMapMarkerAlt,
  FaLink
} from 'react-icons/fa';
import { gapi } from 'gapi-script';
import axios from 'axios';
import './CalendarTab.css';

// Import React-Leaflet components
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

const localizer = momentLocalizer(moment);

// Custom Toolbar with Add Appointment button
const CustomToolbar = ({ onAddAppointment, ...toolbar }) => {
  const goToBack = () => toolbar.onNavigate('PREV');
  const goToNext = () => toolbar.onNavigate('NEXT');
  const goToToday = () => toolbar.onNavigate('TODAY');
  const handleViewChange = (view) => toolbar.onView(view);

  return (
    <div className="custom-toolbar">
      <div className="navigation-buttons">
        <button onClick={goToBack} className="toolbar-button" title="Previous">
          <FaChevronLeft />
        </button>
        <button onClick={goToToday} className="toolbar-button" title="Today">
          <FaRegCalendarAlt />
        </button>
        <button onClick={goToNext} className="toolbar-button" title="Next">
          <FaChevronRight />
        </button>
      </div>
      <span className="toolbar-label">{toolbar.label}</span>
      <div className="view-buttons">
        <button
          onClick={() => handleViewChange(Views.MONTH)}
          className={`toolbar-button view-button ${toolbar.view === Views.MONTH ? 'active' : ''}`}
          title="Month View"
        >
          <FaThLarge />
        </button>
        <button
          onClick={() => handleViewChange(Views.WEEK)}
          className={`toolbar-button view-button ${toolbar.view === Views.WEEK ? 'active' : ''}`}
          title="Week View"
        >
          <FaListUl />
        </button>
        <button
          onClick={() => handleViewChange(Views.DAY)}
          className={`toolbar-button view-button ${toolbar.view === Views.DAY ? 'active' : ''}`}
          title="Day View"
        >
          <FaCalendarDay />
        </button>
        {/* Replace Agenda view with Add Appointment button */}
        <button
          onClick={onAddAppointment}
          className="toolbar-button add-appointment-btn"
          title="Add Appointment"
        >
          <FaPlus />
        </button>
      </div>
    </div>
  );
};

// Location Picker Modal with interactive map and address auto-fill using Nominatim
const LocationPickerModal = ({ onSelect, onClose }) => {
  const defaultPosition = [51.505, -0.09]; // Default center; adjust as needed.
  const [address, setAddress] = useState('');
  const [selectedPosition, setSelectedPosition] = useState(null);

  // Map component that listens for clicks and uses Nominatim for reverse geocoding
  const MapWithPicker = () => {
    useMapEvents({
      click(e) {
        setSelectedPosition(e.latlng);
        // Call Nominatim reverse geocoding API
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.display_name) {
              setAddress(data.display_name);
            } else {
              // Fallback to coordinates if reverse geocoding fails
              setAddress(`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`);
            }
          })
          .catch(err => {
            console.error('Reverse geocoding error:', err);
            setAddress(`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`);
          });
      },
    });
    return selectedPosition ? <Marker position={selectedPosition} /> : null;
  };

  return (
    <div className="modal location-picker-modal">
      <div className="modal-container">
        <div className="modal-header" style={{ background: 'linear-gradient(90deg, #ff7e5f, #feb47b)' }}>
          <h3>Pick a Location</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <div className="map-container" style={{ height: '400px', width: '100%' }}>
            <MapContainer center={defaultPosition} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapWithPicker />
            </MapContainer>
          </div>
          <div className="address-input-group" style={{ marginTop: '15px' }}>
            <label htmlFor="address">Address</label>
            <input 
              type="text" 
              id="address" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Selected address"
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn primary-btn" onClick={() => { onSelect(address); onClose(); }}>Select Location</button>
          <button className="btn secondary-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const CalendarTab = () => {
  // Persist date and view using sessionStorage.
  const [date, setDate] = useState(() => {
    const storedDate = sessionStorage.getItem('calendarDate');
    return storedDate ? new Date(storedDate) : new Date();
  });
  const [view, setView] = useState(() => {
    const storedView = sessionStorage.getItem('calendarView');
    return storedView ? storedView : Views.MONTH;
  });
  
  // Persist Google Calendar events.
  const [googleEvents, setGoogleEvents] = useState(() => {
    const storedEvents = sessionStorage.getItem('googleEvents');
    return storedEvents ? JSON.parse(storedEvents) : [];
  });
  
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [config, setConfig] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  // State for the Add Appointment modal.
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    start: '',
    end: '',
    description: '',
    invitees: '',
    location: '',
    meetingLink: ''
  });

  // State for the Location Picker modal.
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  // Placeholder for internal events.
  const internalEvents = [];

  // Save date and view changes.
  useEffect(() => {
    sessionStorage.setItem('calendarDate', date.toISOString());
  }, [date]);

  useEffect(() => {
    sessionStorage.setItem('calendarView', view);
  }, [view]);

  // Transform Google Calendar events.
  const transformGoogleEvents = (events) => {
    return events.map(e => {
      const start = e.start.dateTime ? new Date(e.start.dateTime) : new Date(e.start.date);
      let end;
      if (e.end && e.end.dateTime) {
        end = new Date(e.end.dateTime);
      } else if (e.end && e.end.date) {
        end = new Date(e.end.date);
      } else {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
      return {
        title: e.summary || 'No Title',
        start,
        end,
      };
    });
  };

  // Merge internal and Google events.
  const combinedEvents = [
    ...internalEvents,
    ...(Array.isArray(googleEvents) ? transformGoogleEvents(googleEvents) : [])
  ];

  // 1. Fetch configuration from the backend.
  useEffect(() => {
    axios.get('http://localhost:5001/api/google/config')
      .then((response) => {
        setConfig(response.data);
        setConfigLoaded(true);
      })
      .catch((error) => {
        console.error('Error fetching Google config:', error);
      });
  }, []);

  // 2. Initialize gapi when config is loaded.
  useEffect(() => {
    if (config) {
      const initClient = () => {
        gapi.client.init({
          apiKey: config.API_KEY,
          clientId: config.CLIENT_ID,
          discoveryDocs: config.DISCOVERY_DOCS,
          scope: config.SCOPES,
          ux_mode: 'popup',
        })
        .then(() => {
          const authInstance = gapi.auth2.getAuthInstance();
          const signedIn = authInstance ? authInstance.isSignedIn.get() : false;
          setIsGoogleConnected(signedIn);
          if (signedIn) {
            loadGoogleCalendarEvents();
          }
          if (authInstance) {
            authInstance.isSignedIn.listen((isSignedIn) => {
              setIsGoogleConnected(isSignedIn);
              if (isSignedIn) {
                loadGoogleCalendarEvents();
              }
            });
          }
        })
        .catch((error) => {
          console.error('Error initializing GAPI client:', error);
        });
      };
      gapi.load('client:auth2', initClient);
    }
  }, [config]);

  // 3. Sign in and send tokens to backend.
  const handleGoogleSignIn = () => {
    if (!gapi.auth2) {
      console.error("Google Auth library not loaded yet.");
      return;
    }
    const authInstance = gapi.auth2.getAuthInstance();
    if (!authInstance) {
      console.error("Auth instance not available. Check gapi initialization.");
      return;
    }
    authInstance.signIn()
      .then(() => {
        setIsGoogleConnected(true);
        const authResponse = authInstance.currentUser.get().getAuthResponse();
        const googleAccessToken = authResponse.access_token;
        const googleTokenExpiry = new Date(Date.now() + authResponse.expires_in * 1000);
        const googleRefreshToken = "";
        axios.post('/api/google/update', {
          googleAccessToken,
          googleRefreshToken,
          googleTokenExpiry,
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        .then(response => {
          console.log(response.data.message);
        })
        .catch(error => {
          console.error('Error saving Google tokens:', error);
        });
        loadGoogleCalendarEvents();
      })
      .catch((error) => {
        console.error('Google sign-in error:', error);
      });
  };

  // 4. Load calendar events.
  const loadGoogleCalendarEvents = () => {
    gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 10,
      orderBy: 'startTime',
    })
    .then((response) => {
      const events = response.result.items;
      setGoogleEvents(events);
      sessionStorage.setItem('googleEvents', JSON.stringify(events));
    })
    .catch((error) => {
      console.error('Error loading Google Calendar events:', error);
    });
  };

  // Handle appointment form changes.
  const handleAppointmentFormChange = (e) => {
    setAppointmentForm({ ...appointmentForm, [e.target.name]: e.target.value });
  };

  // Handle adding a new appointment.
  const handleAddAppointment = (e) => {
    e.preventDefault();
    if (!isGoogleConnected) {
      alert('Please sign in to Google Calendar first.');
      return;
    }
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let attendees = [];
    if (appointmentForm.invitees) {
      attendees = appointmentForm.invitees
        .split(',')
        .map(email => ({ email: email.trim() }))
        .filter(att => att.email);
    }
    const event = {
      summary: appointmentForm.title,
      description: appointmentForm.description + 
        (appointmentForm.meetingLink ? `\nMeeting Link: ${appointmentForm.meetingLink}` : ''),
      location: appointmentForm.location || undefined,
      start: {
        dateTime: new Date(appointmentForm.start).toISOString(),
        timeZone: userTimeZone,
      },
      end: {
        dateTime: new Date(appointmentForm.end).toISOString(),
        timeZone: userTimeZone,
      },
      ...(attendees.length > 0 && { attendees }),
    };
    // Insert event with notifications.
    gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'all'
    })
    .then((response) => {
      console.log('Event created:', response);
      setShowAppointmentForm(false);
      setAppointmentForm({ title: '', start: '', end: '', description: '', invitees: '', location: '', meetingLink: '' });
      loadGoogleCalendarEvents();
    })
    .catch((error) => {
      console.error('Error creating event:', error);
    });
  };

  return (
    <div className="calendar-page-container">
      <Sidebar />
      <div className="calendar-main-content">
        <div className="calendar-section">
          <BigCalendar
            localizer={localizer}
            events={combinedEvents}
            startAccessor="start"
            endAccessor="end"
            date={date}
            view={view}
            onNavigate={(newDate) => setDate(newDate)}
            onView={(newView) => setView(newView)}
            views={{ month: true, week: true, day: true }}
            components={{ toolbar: (props) => <CustomToolbar {...props} onAddAppointment={() => setShowAppointmentForm(true)} /> }}
            style={{ height: '100%' }}
          />
        </div>
        <div className="tasks-section">
          <h2>My Google Calendar</h2>
          {isGoogleConnected ? (
            googleEvents.length > 0 ? (
              <ul className="google-events-list">
                {googleEvents.map((event) => (
                  <li key={event.id}>
                    <strong>{event.summary || 'No Title'}</strong>
                    <br />
                    {event.start.dateTime
                      ? new Date(event.start.dateTime).toLocaleString()
                      : event.start.date}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No upcoming events.</p>
            )
          ) : (
            <button 
              onClick={handleGoogleSignIn} 
              className="google-signin-button"
              disabled={!configLoaded}
            >
              Connect to Google Calendar
            </button>
          )}
        </div>
      </div>
      {/* Appointment Modal */}
      {showAppointmentForm && (
        <div className="modal">
          <div className="modal-container">
            <div className="modal-header" style={{ background: 'linear-gradient(90deg, #ff7e5f, #feb47b)' }}>
              <h3>Add New Appointment</h3>
              <button className="modal-close-btn" onClick={() => setShowAppointmentForm(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddAppointment}>
                <div className="form-group">
                  <label>
                    Title <FaPlus style={{ marginLeft: '5px', color: '#ff7e5f' }} />
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={appointmentForm.title}
                    onChange={handleAppointmentFormChange}
                    placeholder="Event title"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Start</label>
                  <input
                    type="datetime-local"
                    name="start"
                    value={appointmentForm.start}
                    onChange={handleAppointmentFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End</label>
                  <input
                    type="datetime-local"
                    name="end"
                    value={appointmentForm.end}
                    onChange={handleAppointmentFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={appointmentForm.description}
                    onChange={handleAppointmentFormChange}
                    placeholder="Add a description..."
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>
                    Location <FaMapMarkerAlt style={{ marginLeft: '5px', color: '#feb47b' }} />
                  </label>
                  <div className="location-input-group">
                    <input
                      type="text"
                      name="location"
                      value={appointmentForm.location}
                      onChange={handleAppointmentFormChange}
                      placeholder="Event location"
                    />
                    <button type="button" className="pick-location-btn" onClick={() => setShowLocationPicker(true)}>
                      Pick from Map
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>
                    Meeting Link <FaLink style={{ marginLeft: '5px', color: '#feb47b' }} />
                  </label>
                  <input
                    type="text"
                    name="meetingLink"
                    value={appointmentForm.meetingLink}
                    onChange={handleAppointmentFormChange}
                    placeholder="e.g., https://meet.google.com/..."
                  />
                </div>
                <div className="form-group">
                  <label>Invite Emails (comma separated)</label>
                  <input
                    type="text"
                    name="invitees"
                    value={appointmentForm.invitees}
                    onChange={handleAppointmentFormChange}
                    placeholder="example@mail.com, another@mail.com"
                  />
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn primary-btn">Add Appointment</button>
                  <button type="button" className="btn secondary-btn" onClick={() => setShowAppointmentForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPickerModal 
          onSelect={(loc) => {
            setAppointmentForm({ ...appointmentForm, location: loc });
          }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  );
};

export default CalendarTab;
