// src/components/Settings.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import { FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import './Settings.css';

const cardColors = ['#42a5f5', '#66bb6a', '#ffa726'];

const Settings = () => {
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '' });
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', email: '' });
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');

  // Fetch profile to check admin status
  useEffect(() => {
    axios
      .get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setProfile(res.data))
      .catch(err => console.error('Error fetching profile:', err));
  }, [token]);

  // Fetch subordinate users if admin
  const fetchUsers = () => {
    axios
      .get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUsers(res.data.users))
      .catch(err => console.error('Error fetching users:', err));
  };

  useEffect(() => {
    if (profile?.admin) {
      fetchUsers();
    }
  }, [profile]);

  // Handle create form changes
  const handleCreateChange = (e) =>
    setCreateForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Submit create form
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    axios
      .post('/api/admin/create-user', createForm, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setMessage(res.data.message);
        setCreateForm({ username: '', email: '', password: '' });
        fetchUsers();
      })
      .catch(err => setMessage(err.response?.data?.message || 'Error creating user.'));
  };

  // Start editing a user
  const startEdit = (user) => {
    setEditUserId(user._id);
    setEditForm({ username: user.username, email: user.email });
  };

  // Handle edit form changes
  const handleEditChange = (e) =>
    setEditForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // Submit edit form
  const handleEditSubmit = (e) => {
    e.preventDefault();
    axios
      .put(`/api/admin/update-user/${editUserId}`, editForm, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setMessage(res.data.message);
        setEditUserId(null);
        fetchUsers();
      })
      .catch(err => setMessage(err.response?.data?.message || 'Error updating user.'));
  };

  // Delete a user
  const handleDelete = (id) => {
    if (!window.confirm('Delete this user?')) return;
    axios
      .delete(`/api/admin/delete-user/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setMessage(res.data.message);
        fetchUsers();
      })
      .catch(err => setMessage(err.response?.data?.message || 'Error deleting user.'));
  };

  // Loading state
  if (!profile) {
    return (
      <div className="settings-layout">
        <Sidebar />
        <div className="settings-content">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Access denied for non-admin
  if (!profile.admin) {
    return (
      <div className="settings-layout">
        <Sidebar />
        <div className="settings-content">
          <h1>Access Denied</h1>
          <p>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-layout">
      <Sidebar />
      <div className="settings-content">
        <h1>User Management</h1>
        {message && <p className="message">{message}</p>}

        <div className="create-user-section">
          <h2>Create New User</h2>
          <form onSubmit={handleCreateSubmit} className="user-form">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={createForm.username}
              onChange={handleCreateChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={createForm.email}
              onChange={handleCreateChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={createForm.password}
              onChange={handleCreateChange}
              required
            />
            <button type="submit" className="btn create-btn">
              Create User
            </button>
          </form>
        </div>

        <div className="user-cards-section">
          <h2>Subordinate Users</h2>
          {users.length > 0 ? (
            <div className="user-cards-grid">
              {users.map((u, i) => (
                <div
                  key={u._id}
                  className="user-card"
                  style={{ backgroundColor: cardColors[i % cardColors.length] }}
                >
                  <div className="user-header">
                    <div className="avatar">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                      {editUserId === u._id ? (
                        <>
                          <input
                            type="text"
                            name="username"
                            value={editForm.username}
                            onChange={handleEditChange}
                          />
                          <input
                            type="email"
                            name="email"
                            value={editForm.email}
                            onChange={handleEditChange}
                          />
                        </>
                      ) : (
                        <>
                          <p className="user-name">{u.username}</p>
                          <p className="user-email">{u.email}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="user-actions">
                    {editUserId === u._id ? (
                      <>
                        <button
                          onClick={handleEditSubmit}
                          title="Save"
                          className="icon-btn save-btn"
                        >
                          <FaSave />
                        </button>
                        <button
                          onClick={() => setEditUserId(null)}
                          title="Cancel"
                          className="icon-btn cancel-btn"
                        >
                          <FaTimes />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(u)}
                          title="Edit"
                          className="icon-btn edit-btn"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(u._id)}
                          title="Delete"
                          className="icon-btn delete-btn"
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
