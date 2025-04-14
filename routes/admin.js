// src/routes/admin.js
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Create subordinate user endpoint
router.post('/create-user', authenticateToken, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || !adminUser.admin) {
      return res.status(403).json({ message: 'Access denied. Only admins can create users.' });
    }
    const { username, email, password } = req.body;
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
      admin: false,                    // subordinate user is not an admin
      model_id: adminUser.model_id,    // Inherit model_id from the admin
      isVerified: true,                // Automatically verified
    });
    await newUser.save();
    res.json({ message: 'User created successfully.' });
  } catch (error) {
    console.error('Error creating subordinate user:', error);
    res.status(500).json({ message: 'Server error creating user.' });
  }
});

// Get list of subordinate users for the admin
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || !adminUser.admin) {
      return res.status(403).json({ message: 'Access denied. Only admins can view subordinate users.' });
    }
    const users = await User.find({ model_id: adminUser.model_id, admin: false }).select('-password');
    res.json({ users });
  } catch (error) {
    console.error('Error fetching subordinate users:', error);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

// Update subordinate user details
router.put('/update-user/:id', authenticateToken, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || !adminUser.admin) {
      return res.status(403).json({ message: 'Access denied. Only admins can update users.' });
    }
    const { id } = req.params;
    const userToUpdate = await User.findOne({ _id: id, model_id: adminUser.model_id, admin: false });
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found or unauthorized.' });
    }
    const { username, email } = req.body;
    userToUpdate.username = username || userToUpdate.username;
    userToUpdate.email = email || userToUpdate.email;
    await userToUpdate.save();
    res.json({ message: 'User updated successfully.' });
  } catch (error) {
    console.error('Error updating subordinate user:', error);
    res.status(500).json({ message: 'Server error updating user.' });
  }
});

// Delete subordinate user
router.delete('/delete-user/:id', authenticateToken, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || !adminUser.admin) {
      return res.status(403).json({ message: 'Access denied. Only admins can delete users.' });
    }
    const { id } = req.params;
    const userToDelete = await User.findOne({ _id: id, model_id: adminUser.model_id, admin: false });
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found or unauthorized.' });
    }
    await User.deleteOne({ _id: id });
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Error deleting subordinate user:', error);
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});

module.exports = router;
