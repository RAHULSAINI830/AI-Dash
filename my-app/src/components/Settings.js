// src/components/Settings.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import { FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import './Settings.css';

const Settings = () => {
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '' });
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', email: '' });
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');

  // Fetch profile data to check if the user is an admin
  useEffect(() => {
    axios
      .get('http://localhost:5001/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(response => setProfile(response.data))
      .catch(err => console.error('Error fetching profile:', err));
  }, [token]);

  // Only fetch subordinate users if the current user is admin
  const fetchUsers = () => {
    axios
      .get('http://localhost:5001/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => setUsers(res.data.users))
      .catch(err => console.error('Error fetching users:', err));
  };

  useEffect(() => {
    if (profile && profile.admin) {
      fetchUsers();
    }
  }, [profile]);

  // Handle creation form changes and submission
  const handleCreateChange = (e) => {
    setCreateForm({ ...createForm, [e.target.name]: e.target.value });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    axios
      .post('http://localhost:5001/api/admin/create-user', createForm, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        setMessage(res.data.message);
        setCreateForm({ username: '', email: '', password: '' });
        fetchUsers();
      })
      .catch(err => setMessage(err.response?.data?.message || 'Error creating user.'));
  };

  // Handle editing a subordinate user
  const startEdit = (user) => {
    setEditUserId(user._id);
    setEditForm({ username: user.username, email: user.email });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    axios
      .put(`http://localhost:5001/api/admin/update-user/${editUserId}`, editForm, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        setMessage(res.data.message);
        setEditUserId(null);
        fetchUsers();
      })
      .catch(err => setMessage(err.response?.data?.message || 'Error updating user.'));
  };

  // Handle deletion of a subordinate user
  const handleDelete = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      axios
        .delete(`http://localhost:5001/api/admin/delete-user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(res => {
          setMessage(res.data.message);
          fetchUsers();
        })
        .catch(err => setMessage(err.response?.data?.message || 'Error deleting user.'));
    }
  };

  // If profile data is not loaded yet
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

  // If the logged-in user is not an admin, display an access-denied message.
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
            <button type="submit" className="btn create-btn">Create User</button>
          </form>
        </div>
        <div className="user-table-section">
          <h2>Subordinate Users</h2>
          <table className="user-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th className="action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>
                    {editUserId === user._id ? (
                      <input 
                        type="text" 
                        name="username" 
                        value={editForm.username} 
                        onChange={handleEditChange} 
                      />
                    ) : (
                      user.username
                    )}
                  </td>
                  <td>
                    {editUserId === user._id ? (
                      <input 
                        type="email" 
                        name="email" 
                        value={editForm.email} 
                        onChange={handleEditChange} 
                      />
                    ) : (
                      user.email
                    )}
                  </td>
                  <td className="action-col">
                    {editUserId === user._id ? (
                      <>
                        <button onClick={handleEditSubmit} className="icon-btn save-btn" title="Save">
                          <FaSave />
                        </button>
                        <button onClick={() => setEditUserId(null)} className="icon-btn cancel-btn" title="Cancel">
                          <FaTimes />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(user)} className="icon-btn edit-btn" title="Edit">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDelete(user._id)} className="icon-btn delete-btn" title="Delete">
                          <FaTrash />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center' }}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Settings;
