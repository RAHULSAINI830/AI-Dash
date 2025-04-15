// src/components/ForgotPassword.js
import React, { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';

const ForgotPassword = ({ goBackToLogin }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5001/api/auth/forgot-password', { email });
      setMessage(res.data.message || 'OTP sent to your email.');
      setStep(2);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to send OTP.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5001/api/auth/reset-password', { email, otp, newPassword });
      setMessage(res.data.message || 'Password reset successful.');
      setStep(3);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-container">
        {step === 1 && (
          <>
            <h2 className="forgot-title">Forgot Password</h2>
            <form className="forgot-form" onSubmit={handleSendOtp}>
              <div className="input-group">
                <label htmlFor="email">Enter your email</label>
                <input 
                  type="email" 
                  name="email" 
                  id="email" 
                  placeholder="Enter your registered email"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <button className="forgot-btn" type="submit">Send OTP</button>
            </form>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="forgot-title">Verify OTP & Reset Password</h2>
            <form className="forgot-form" onSubmit={handleResetPassword}>
              <div className="input-group">
                <label htmlFor="otp">OTP</label>
                <input 
                  type="text" 
                  name="otp" 
                  id="otp" 
                  placeholder="Enter the OTP sent to your email"
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)}
                  required 
                />
              </div>
              <div className="input-group">
                <label htmlFor="newPassword">New Password</label>
                <input 
                  type="password" 
                  name="newPassword" 
                  id="newPassword" 
                  placeholder="Enter your new password"
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  required 
                />
              </div>
              <button className="forgot-btn" type="submit">Reset Password</button>
            </form>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="forgot-title">Success!</h2>
            <p>Your password has been reset. Please login with your new password.</p>
            <button className="forgot-btn" onClick={goBackToLogin}>Go to Login</button>
          </>
        )}
        {message && <p className="forgot-message">{message}</p>}
        <p className="toggle-link">
          <span onClick={goBackToLogin}>Back to Login</span>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
