// -------------------------------------------------------------
//  ForgotPassword: same look & feel as login
// -------------------------------------------------------------
import React, { useState } from "react";
import axios from "axios";
import "./ForgotPassword.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

const ForgotPassword = ({ goBackToLogin }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/auth/forgot-password", { email });
      setMessage("OTP sent to your email.");
      setStep(2);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to send OTP.");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/auth/reset-password", {
        email,
        otp,
        newPassword,
      });
      setMessage("Password reset successful.");
      setStep(3);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to reset password.");
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-container">
        <div className="forgot-title-wrapper">
          <i className="fas fa-unlock-keyhole forgot-title-icon"></i>
          <h2 className="forgot-title">Forgot&nbsp;Password</h2>
          <div className="forgot-divider">
            <i className="fas fa-bolt divider-icon"></i>
            <span className="divider-text">Secure&nbsp;Recovery</span>
            <i className="fas fa-bolt divider-icon"></i>
          </div>
        </div>

        {step === 1 && (
          <form className="forgot-form" onSubmit={handleSendOtp}>
            <div className="input-group">
              <label htmlFor="email">
                <i className="fa-regular fa-envelope label-icon"></i>
                Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="Registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="action-btn" type="submit">
              Send&nbsp;OTP <i className="fas fa-arrow-right"></i>
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="forgot-form" onSubmit={handleResetPassword}>
            <div className="input-group">
              <label htmlFor="otp">
                <i className="fa-regular fa-key label-icon"></i>
                OTP
              </label>
              <input
                type="text"
                id="otp"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="newPassword">
                <i className="fa-regular fa-lock label-icon"></i>
                New&nbsp;Password
              </label>
              <input
                type="password"
                id="newPassword"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button className="action-btn" type="submit">
              Reset&nbsp;Password <i className="fas fa-sync"></i>
            </button>
          </form>
        )}

        {step === 3 && (
          <>
            <h2 className="forgot-title">Success!</h2>
            <p className="success-text">
              Your password has been reset. Please login with your new
              credentials.
            </p>
            <button className="action-btn" onClick={goBackToLogin}>
              Go&nbsp;to&nbsp;Login <i className="fas fa-sign-in-alt"></i>
            </button>
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
