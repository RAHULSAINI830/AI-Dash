import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { FaSync } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { useData } from '../DataContext';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const { profile, calls } = useData();

  if (!profile || calls === null) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-content">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const totalCalls = calls.length;
  const totalDurationSec = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
  const avgCallDuration = totalCalls > 0 ? Math.floor(totalDurationSec / totalCalls) : 0;
  const completedCalls = calls.filter((call) => call.status === 'completed').length;

  const donutData = {
    labels: ['Completed', 'Other'],
    datasets: [
      {
        data: [completedCalls, totalCalls - completedCalls],
        backgroundColor: ['#4CAF50', '#d3d3d3'],
        borderWidth: 0,
      },
    ],
  };

  const donutOptions = {
    cutout: '70%',
    plugins: {
      legend: { display: false },
    },
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-text">
            <h1>Dashboard</h1>
            <p>Welcome, {profile.username}</p>
          </div>
          <button className="reload-btn" onClick={handleReload} title="Reload Data">
            <FaSync size={20} />
          </button>
        </header>
        <section className="call-stats-section">
          <div className="stats-heading">
            <h2>Calls</h2>
            <div className="legend">
              <span className="legend-circle" style={{ backgroundColor: '#4CAF50' }}></span>
              <span className="legend-text">Completed</span>
            </div>
          </div>
          <div className="stats-content">
            <div className="donut-chart">
              <Doughnut data={donutData} options={donutOptions} />
            </div>
            <div className="metrics">
              <div className="metric">
                <p className="metric-label">Total Calls</p>
                <p className="metric-value">{totalCalls}</p>
              </div>
              {/* Additional metrics can be added here */}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
