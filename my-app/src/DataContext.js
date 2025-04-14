import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [calls, setCalls] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token && !profile) {
      axios
        .get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => setProfile(response.data))
        .catch((err) => console.error('Profile fetch error:', err));
    }
  }, [token, profile]);

  useEffect(() => {
    if (profile && profile.model_id && calls === null) {
      axios
        .get(`https://api.synthflow.ai/v2/calls?model_id=${profile.model_id}&limit=1000`, {
          headers: {
            accept: 'text/plain',
            Authorization: 'Bearer 1741798049693x839210709547221000',
          },
        })
        .then((response) => {
          if (response.data.status === 'ok' && response.data.response?.calls) {
            setCalls(response.data.response.calls);
          } else {
            setCalls([]);
          }
        })
        .catch((err) => console.error('Calls fetch error:', err));
    }
  }, [profile, calls]);

  return (
    <DataContext.Provider value={{ profile, calls }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
