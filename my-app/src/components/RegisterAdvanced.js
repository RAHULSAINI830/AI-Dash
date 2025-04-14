// src/components/RegisterAdvanced.js
import React, { useState } from 'react';
import axios from 'axios';
import './RegisterAdvanced.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

const RegisterAdvanced = ({ goBackToLogin }) => {
  const [step, setStep] = useState(1); // 1 = Registration, 2 = OTP Verification
  const [formData, setFormData] = useState({ username: '', email: '', password: '', model_id: '' });
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const togglePasswordVisibility = () => setShowPassword(prev => !prev);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Registration submission: include admin flag and model_id if applicable
  const handleRegistrationSubmit = async e => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        admin: isAdmin,
      };
      const res = await axios.post('/api/auth/register', payload);
      setMessage(res.data.message || 'Registered successfully. Please check your email for the OTP.');
      setStep(2);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Registration failed.');
    }
  };

  // OTP verification submission
  const handleOTPVerification = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/verify-registration', {
        email: formData.email,
        otp: otp,
      });
      setMessage(res.data.message || 'Verification successful.');
      goBackToLogin();
    } catch (error) {
      setMessage(error.response?.data?.message || 'OTP verification failed.');
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        {step === 1 && (
          <>
            <h2 className="register-title">Create Account</h2>
            <form className="register-form" onSubmit={handleRegistrationSubmit}>
              <div className="input-group">
                <label htmlFor="username">Username</label>
                <input 
                  type="text" 
                  name="username" 
                  id="username" 
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <input 
                  type="email" 
                  name="email" 
                  id="email" 
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="input-group password-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    name="password" 
                    id="password" 
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <span className="toggle-password" onClick={togglePasswordVisibility}>
                    {showPassword 
                      ? <i className="fas fa-eye-slash"></i> 
                      : <i className="fas fa-eye"></i>}
                  </span>
                </div>
              </div>
              <div className="input-group">
                <label>
                  <input
                    type="checkbox"
                    checked={isAdmin}
                    onChange={(e) => setIsAdmin(e.target.checked)}
                  />
                  Register as Admin
                </label>
              </div>
              {isAdmin && (
                <div className="input-group">
                  <label htmlFor="model_id">Model ID</label>
                  <input 
                    type="text" 
                    name="model_id" 
                    id="model_id" 
                    placeholder="Enter your model ID"
                    value={formData.model_id}
                    onChange={handleChange}
                    required={isAdmin}
                  />
                </div>
              )}
              <button className="register-btn" type="submit">Sign Up</button>
            </form>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="register-title">OTP Verification</h2>
            <form className="register-form" onSubmit={handleOTPVerification}>
              <div className="input-group">
                <label htmlFor="otp">Enter OTP</label>
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
              <button className="register-btn" type="submit">Verify OTP</button>
            </form>
          </>
        )}
        {message && <p className="register-message">{message}</p>}
        <p className="toggle-link">
          Already have an account? <span onClick={goBackToLogin}>Login</span>
        </p>
      </div>
    </div>
  );
};

export default RegisterAdvanced;
