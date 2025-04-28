// -------------------------------------------------------------
//  LoginAdvanced: full component with updated UI (icons, text)
// -------------------------------------------------------------
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginAdvanced.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

const LoginAdvanced = ({ toggleView, toggleForgot }) => {
  /* ------------------------ state --------------------------- */
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  /* --------------------- handlers --------------------------- */
  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/auth/login", { ...formData });
      localStorage.setItem("token", res.data.token);
      setMessage("Logged in successfully.");
      navigate("/dashboard");
      window.location.reload();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Login failed. Please try again."
      );
    }
  };

  /* ------------------------ UI ------------------------------ */
  return (
    <div className="login-page">
      {/* ---------- Optional company logo ----------- */}
      <div className="logo-container">
        {/* <img src="/logo.svg" alt="Company Logo" className="login-logo" /> */}
      </div>

      {/* ---------------- Login card --------------- */}
      <div className="login-container">
        {/* Heading with big icon */}
        <div className="login-title-wrapper">
          <i className="fa-solid fa-headphones login-title-icon"></i>
          <h2 className="login-title">Lisa&nbsp;Assistant</h2>

          {/* Decorative divider with thunder icons + text */}
          <div className="login-divider">
            <i className="fas fa-bolt divider-icon"></i>
            <span className="divider-text">Sign in to continue to your account</span>
            <i className="fas fa-bolt divider-icon"></i>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {/* ---------- Email field ---------- */}
          <div className="input-group">
          <label htmlFor="email">
              <i className="fas fa-envelope label-icon"></i>
              Email
            </label>
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

          {/* ---------- Password field ---------- */}
          <div className="input-group password-group">
          <label htmlFor="password">
              <i className="fas fa-lock label-icon"></i>
              Password
              <span className="forgot-link" onClick={toggleForgot}>
                Forgot Code ?
              </span>
            </label>

            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                placeholder="Enter your password"
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

          {/* ---------- Submit button ---------- */}
          <button className="login-btn" type="submit">
            Access&nbsp;System
            <i className="fas fa-arrow-right"></i>
          </button>
        </form>

        {/* Feedback / register link */}
        {message && <p className="login-message">{message}</p>}

        <p className="toggle-link">
          Don’t have an account?&nbsp;
          <span onClick={toggleView}>Register</span>
        </p>
        <div className="footer-divider"></div>

        {/* ---------- AI footer line ---------- */}
        <div className="ai-footer">
          <i className="fas fa-robot ai-icon"></i>
          Powered by&nbsp;Zentrades&nbsp;AI&nbsp;technology
        </div>
      </div>
    </div>
  );
};

export default LoginAdvanced;
