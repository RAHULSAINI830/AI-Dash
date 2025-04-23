// src/components/LoginAdvanced.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './LoginAdvanced.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

const LoginAdvanced = ({ toggleView, toggleForgot }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const togglePasswordVisibility = () => setShowPassword(prev => !prev);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', {
        ...formData,
      });
      localStorage.setItem('token', res.data.token);
      setMessage('Logged in successfully.');
      navigate('/dashboard');
      window.location.reload();
    } catch (error) {
      setMessage(
        error.response?.data?.message || 'Login failed. Please try again.'
      );
    }
  };

  return (
    <div className="login-page">
      {/* Company logo fixed in the top-left corner */}
      <div className="logo-container">
        {/* <img src=""  className="login-logo" /> */}
      </div>
      <div className="login-container">
        <h2 className="login-title">Welcome Back</h2>
        <form className="login-form" onSubmit={handleSubmit}>
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
          

          <button className="login-btn" type="submit">Sign In</button>
        </form>
        {message && <p className="login-message">{message}</p>}
        <p className="toggle-link">
          Don't have an account? <span onClick={toggleView}>Register</span>
        </p>
        <p className="toggle-link">
          <span onClick={toggleForgot}>Forgot password?</span>
        </p>
      </div>
    </div>
  );
};

export default LoginAdvanced;
