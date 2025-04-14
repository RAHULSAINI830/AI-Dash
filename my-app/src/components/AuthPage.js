// src/components/AuthPage.js
import React, { useState } from 'react';
import LoginAdvanced from './LoginAdvanced';
import RegisterAdvanced from './RegisterAdvanced';
import ForgotPassword from './ForgotPassword';
import './AuthPage.css'; // Optional CSS file for styling the auth container

const AuthPage = () => {
  const [view, setView] = useState('login'); // possible values: 'login', 'register', 'forgot'

  // Handler functions to switch views
  const handleShowLogin = () => setView('login');
  const handleShowRegister = () => setView('register');
  const handleShowForgot = () => setView('forgot');

  return (
    <div className="auth-page">
      {view === 'login' && (
        <LoginAdvanced toggleView={handleShowRegister} toggleForgot={handleShowForgot} />
      )}
      {view === 'register' && (
        <RegisterAdvanced goBackToLogin={handleShowLogin} />
      )}
      {view === 'forgot' && (
        <ForgotPassword goBackToLogin={handleShowLogin} />
      )}
    </div>
  );
};

export default AuthPage;
