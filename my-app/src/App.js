import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './DataContext';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import ConversationsTab from './components/ConversationsTab';
import AppointmentTab from './components/AppointmentTab';
import Settings from './components/Settings';
import CalendarTab from './components/CalendarTab';
import 'leaflet/dist/leaflet.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for a token on mount.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <DataProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              !isAuthenticated ? <AuthPage /> : <Navigate to="/dashboard" replace />
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/conversations"
            element={
              isAuthenticated ? <ConversationsTab /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/appointments"
            element={
              isAuthenticated ? <AppointmentTab /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/settings"
            element={
              isAuthenticated ? <Settings /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/calendar"
            element={
              isAuthenticated ? <CalendarTab /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
          />
        </Routes>
      </Router>
    </DataProvider>
  );
}

export default App;
