// routes/conversations.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversation');
const User = require('../models/user');
const nodemailer = require('nodemailer');
const { authenticateToken } = require('./auth'); // if you require authentication

// Configure your email transporter (ensure to use environment variables in production)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'rahul.saini@zentrades.pro',
    pass: process.env.EMAIL_PASS || 'Rahul@902'
  },
});

/**
 * POST /api/conversations
 * Creates a new conversation (call) and sends an email notification
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Create and save the new conversation
    const newConversation = new Conversation(req.body);
    await newConversation.save();

    // Find admin and subordinate users associated with the model_id
    const adminUsers = await User.find({ model_id: newConversation.model_id, admin: true });
    const subordinateUsers = await User.find({ model_id: newConversation.model_id, admin: false });
    const allUsers = [...adminUsers, ...subordinateUsers];

    // Prepare a list of email addresses
    const recipients = allUsers.map(user => user.email).join(',');

    // Refined email content
    const mailOptions = {
      from: process.env.EMAIL_USER || 'rahul.saini@zentrades.pro',
      to: recipients,
      subject: 'New Service Inquiry Alert',
      text:
        `Dear User,\n\n` +
        `A new service inquiry has just been received. Please log in to your dashboard to review the details and take the necessary action.\n\n` +
        `Thank you,\n` +
        `Your Service Team`
    };

    // Send the email
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Error sending email notifications:', err);
      } else {
        console.log('Email notifications sent:', info.response);
      }
    });

    res.status(201).json({ message: 'Conversation added and notifications sent.' });
  } catch (error) {
    console.error('Error adding conversation:', error);
    res.status(500).json({ message: 'Error adding conversation.' });
  }
});

module.exports = router;
