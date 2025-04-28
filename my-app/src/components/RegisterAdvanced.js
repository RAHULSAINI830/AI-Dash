// -------------------------------------------------------------
//  RegisterAdvanced: matches login aesthetics
// -------------------------------------------------------------
import React, { useState } from "react";
import axios from "axios";
import "./RegisterAdvanced.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

const RegisterAdvanced = ({ goBackToLogin }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    model_id: "",
  });
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const togglePasswordVisibility = () => setShowPassword((v) => !v);
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, admin: isAdmin };
      await axios.post("/api/auth/register", payload);
      setMessage("Registered successfully. Check your email for the OTP.");
      setStep(2);
    } catch (err) {
      setMessage(err.response?.data?.message || "Registration failed.");
    }
  };

  const handleOTPVerification = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/auth/verify-registration", {
        email: formData.email,
        otp,
      });
      setMessage("Verification successful.");
      goBackToLogin();
    } catch (err) {
      setMessage(err.response?.data?.message || "OTP verification failed.");
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-title-wrapper">
          <i className="fas fa-user-plus register-title-icon"></i>
          <h2 className="register-title">
            {step === 1 ? "Create Account" : "OTP Verification"}
          </h2>
          <div className="register-divider">
            <i className="fas fa-bolt divider-icon"></i>
            <span className="divider-text">
              {step === 1 ? "Join our community" : "Verify & Activate"}
            </span>
            <i className="fas fa-bolt divider-icon"></i>
          </div>
        </div>

        {step === 1 && (
          <form className="register-form" onSubmit={handleRegistrationSubmit}>
            <div className="input-group">
              <label htmlFor="username">
                <i className="fa-regular fa-user label-icon"></i>
                Username
              </label>
              <input
                type="text"
                id="username"
                placeholder="Enter username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="email">
                <i className="fa-regular fa-envelope label-icon"></i>
                Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="Enter email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group password-group">
              <label htmlFor="password">
                <i className="fa-regular fa-lock label-icon"></i>
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <span
                  className="toggle-password"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <i className="fas fa-eye-slash"></i>
                  ) : (
                    <i className="fas fa-eye"></i>
                  )}
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
                &nbsp;Register as Admin
              </label>
            </div>

            {isAdmin && (
              <div className="input-group">
                <label htmlFor="model_id">
                  <i className="fa-regular fa-id-badge label-icon"></i>
                  Model&nbsp;ID
                </label>
                <input
                  type="text"
                  id="model_id"
                  placeholder="Enter model ID"
                  value={formData.model_id}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <button className="action-btn" type="submit">
              Sign&nbsp;Up <i className="fas fa-user-check"></i>
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="register-form" onSubmit={handleOTPVerification}>
            <div className="input-group">
              <label htmlFor="otp">
                <i className="fa-regular fa-key label-icon"></i>
                Enter&nbsp;OTP
              </label>
              <input
                type="text"
                id="otp"
                placeholder="OTP sent to email"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>

            <button className="action-btn" type="submit">
              Verify&nbsp;OTP <i className="fas fa-check"></i>
            </button>
          </form>
        )}

        {message && <p className="register-message">{message}</p>}

        <p className="toggle-link">
          {step === 1 ? (
            <>
              Already have an account?&nbsp;
              <span onClick={goBackToLogin}>Login</span>
            </>
          ) : (
            <span onClick={goBackToLogin}>Back to Login</span>
          )}
        </p>
      </div>
    </div>
  );
};

export default RegisterAdvanced;
