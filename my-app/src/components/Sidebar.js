import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../DataContext';
import { 
  GiHouse, 
  GiVideoCamera, 
  GiChatBubble, 
  GiCog, 
  GiPlug, 
  GiChart, 
  GiCalendar, 
  GiAlarmClock 
} from 'react-icons/gi';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useData();
  
  const userName = profile?.username || '';
  const tagline = profile ? (profile.admin ? 'Admin' : 'User') : 'Your tagline here';

  // Generate a letter avatar from the username.
  const initialLetter = useMemo(() => {
    return userName ? userName.charAt(0).toUpperCase() : 'U';
  }, [userName]);

  // Define navigation items, including the new Appointments tab.
  const navItems = [
    { name: 'Dashboard', icon: <GiHouse size={20} />, enabled: true },
    { name: 'Live', icon: <GiVideoCamera size={20} />, enabled: false },
    { name: 'Conversations', icon: <GiChatBubble size={20} />, enabled: true },
    { name: 'Appointments', icon: <GiAlarmClock size={20} />, enabled: true },
    { name: 'Integration', icon: <GiPlug size={20} />, enabled: false },
    // { name: 'Google Analytics', icon: <GiChart size={20} />, enabled: false },
    { name: 'Calendar', icon: <GiCalendar size={20} />, enabled: true },
    { name: 'Settings', icon: <GiCog size={20} />, enabled: true },
  ];

  // Determine the active navigation item based on the current route.
  let activeItemFromRoute = '';
  if (location.pathname.includes('dashboard')) {
    activeItemFromRoute = 'Dashboard';
  } else if (location.pathname.includes('conversations')) {
    activeItemFromRoute = 'Conversations';
  } else if (location.pathname.includes('appointments')) {
    activeItemFromRoute = 'Appointments';
  } else if (location.pathname.includes('settings')) {
    activeItemFromRoute = 'Settings';
  } else if (location.pathname.includes('calendar')) {
    activeItemFromRoute = 'Calendar';
  }

  // Navigation click handler.
  const handleNavClick = (item) => {
    if (!item.enabled) {
      alert(`${item.name} feature is coming soon!`);
      return;
    }
    switch (item.name) {
      case 'Dashboard':
        navigate('/dashboard');
        break;
      case 'Conversations':
        navigate('/conversations');
        break;
      case 'Appointments':
        navigate('/appointments');
        break;
      case 'Settings':
        navigate('/settings');
        break;
      case 'Calendar':
        navigate('/calendar');
        break;
      default:
        break;
    }
  };

  // Updated Logout handler (client-side routing only, no full-page reload)
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  return (
    <div className="sidebar">
      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-left">
          <div className="avatar">{initialLetter}</div>
        </div>
        <div className="profile-details">
          <div className="profile-title">{userName || 'User'}</div>
          <div className="profile-subtitle">{tagline}</div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="nav-section">
        {navItems.map((item) => (
          <div
            key={item.name}
            className={`nav-item ${activeItemFromRoute === item.name ? 'active' : ''}`}
            onClick={() => handleNavClick(item)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-text">{item.name}</span>
            {!item.enabled && <span className="coming-soon">Coming Soon</span>}
          </div>
        ))}
      </nav>

      {/* Divider and Logout */}
      <div className="divider"></div>
      <div className="logout-button" onClick={handleLogout}>
        <i className="fas fa-sign-out-alt"></i>
        <span className="logout-text">Logout</span>
      </div>
    </div>
  );
};

export default Sidebar;
