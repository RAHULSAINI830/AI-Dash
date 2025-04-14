// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Adjust this path if needed

const router = express.Router();

// JWT secret (use an environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'b9c8d5a73944b7f924b5296acdf4cddc35e3475f0a1a32a0c451aee71d6c49b2';

// Configure your email transporter (use environment variables for credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'rahul.saini@zentrades.pro',
    pass: process.env.EMAIL_PASS || 'Rahul@902',
  },
});

// Helper function to send OTP via email
const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'rahul.saini@zentrades.pro',
    to: email,
    subject: 'OTP for Password Reset',
    text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
  };
  await transporter.sendMail(mailOptions);
};

console.log("Auth routes loaded");

// ------------------------------
// Middleware to authenticate token
// ------------------------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ------------------------------
// Test Endpoint
// ------------------------------
router.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// ------------------------------
// Registration Endpoint
// ------------------------------
router.post('/register', async (req, res) => {
  try {
    console.log("Register request body:", req.body);
    const { username, email, password, admin, model_id } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      admin: admin || false,
      model_id: model_id || '',
      isVerified: false,
    });
    // Generate OTP and expiry for registration (10 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000;
    newUser.registrationOTP = otp;
    newUser.registrationOTPExpiry = expiry;
    await newUser.save();
    await sendOtpEmail(email, otp);
    console.log(`New user registered: ${email} with model_id: ${newUser.model_id}`);
    res.json({ message: 'User registered successfully. Please check your email for the OTP.' });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// ------------------------------
// Verify Registration Endpoint
// ------------------------------
router.post('/verify-registration', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found.' });
    }
    if (user.registrationOTP !== otp || Date.now() > user.registrationOTPExpiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }
    user.isVerified = true;
    user.registrationOTP = undefined;
    user.registrationOTPExpiry = undefined;
    await user.save();
    res.json({ message: 'Verification successful.' });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: 'Server error during OTP verification.' });
  }
});

// ------------------------------
// Login Endpoint
// ------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`Login failed: No user found for ${email}`);
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error(`Login failed: Incorrect password for ${email}`);
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    console.log(`User logged in: ${email}`);
    res.json({ token, message: 'Logged in successfully.' });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// ------------------------------
// Forgot Password Endpoint
// ------------------------------
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`Forgot Password: No user found for ${email}`);
      return res.status(400).json({ message: 'User not found with that email.' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000;
    user.resetOTP = otp;
    user.resetOTPExpiry = expiry;
    await user.save();
    await sendOtpEmail(email, otp);
    console.log(`OTP sent to ${email}: ${otp}`);
    res.json({ message: 'OTP has been sent to your email.' });
  } catch (error) {
    console.error("Forgot Password error:", error);
    res.status(500).json({ message: 'Server error during forgot password.' });
  }
});

// ------------------------------
// Reset Password Endpoint
// ------------------------------
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`Reset Password: No user found for ${email}`);
      return res.status(400).json({ message: 'User not found.' });
    }
    if (user.resetOTP !== otp || Date.now() > user.resetOTPExpiry) {
      console.error(`Reset Password: Invalid or expired OTP for ${email}`);
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;
    await user.save();
    console.log(`Password reset successful for ${email}`);
    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error("Reset Password error:", error);
    res.status(500).json({ message: 'Server error during password reset.' });
  }
});

// ------------------------------
// Profile Endpoint
// ------------------------------
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('Decoded token:', req.user);
    const userId = req.user.id || req.user._id;
    if (!userId) {
      return res.status(400).json({ message: 'Invalid token payload' });
    }
    const user = await User.findById(userId).select('username admin model_id');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Export router and also export authenticateToken so it can be used in other routes
module.exports = router;
module.exports.authenticateToken = authenticateToken;
