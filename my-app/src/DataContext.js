// src/DataContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Axios interceptor: log and strip any non-Latin1 characters from headers
axios.interceptors.request.use(config => {
  if (config.headers) {
    Object.entries(config.headers).forEach(([key, val]) => {
      if (typeof val === 'string' && /[^\u0000-\u00FF]/.test(val)) {
        console.error(`Header "${key}" has non-Latin1 chars:`, val);
        // Strip out non-Latin1 characters
        config.headers[key] = val.replace(/[^\u0000-\u00FF]/g, '').trim();
      }
    });
  }
  return config;
});

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [calls, setCalls]     = useState([]);

  // Sanitize token to ASCII-only before using in headers
  const rawToken = localStorage.getItem('token') || '';
  const token    = rawToken.replace(/[^\u0000-\u00FF]/g, '').trim();

  // 1. Load profile once
  useEffect(() => {
    if (token && !profile) {
      axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => setProfile(res.data))
      .catch(err => console.error('Profile load failed:', err));
    }
  }, [token, profile]);

  // 2. Poll for calls every 30 seconds via your Express proxy
  useEffect(() => {
    if (!profile?.model_id) return;

    const fetchCalls = () => {
      axios.get('/api/synthflow/calls', {
        params: {
          model_id: profile.model_id,
          limit:    1000,
        },
      })
      .then(response => {
        if (
          response.data.status === 'ok' &&
          response.data.response?.calls
        ) {
          setCalls(response.data.response.calls);
        }
      })
      .catch(err => console.error('Fetching calls failed:', err));
    };

    // initial load
    fetchCalls();
    // then every 30s
    const intervalId = setInterval(fetchCalls, 30_000);
    // cleanup
    return () => clearInterval(intervalId);
  }, [profile]);

  return (
    <DataContext.Provider value={{ profile, calls }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside a DataProvider');
  return ctx;
};
