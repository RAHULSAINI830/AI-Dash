// src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
} from 'chart.js';
import { FaSync, FaPhoneAlt, FaCalendarCheck, FaPhoneSlash, FaQuestion } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { useData } from '../DataContext';
import './Dashboard.css';

// Plugin to draw center label and value inside the donut
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw: (chart) => {
    const centerText = chart.config.options.plugins?.centerText;
    if (!centerText) return;
    const { ctx, width, height } = chart;
    const { label = '', text = '' } = centerText;
    ctx.save();
    // Draw label in white
    ctx.font = '1em sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    const labelWidth = ctx.measureText(label).width;
    ctx.fillText(label, (width - labelWidth) / 2, height / 2 - 10);

    // Draw value in white
    ctx.font = '1.5em sans-serif';
    ctx.fillStyle = '#fff';
    const valueWidth = ctx.measureText(text).width;
    ctx.fillText(text, (width - valueWidth) / 2, height / 2 + 15);
    ctx.restore();
  }
};

// Register chart components and plugin
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  centerTextPlugin
);

const Dashboard = () => {
  const { profile, calls } = useData();
  const [metrics, setMetrics] = useState({
    appointment: 0,
    callback: 0,
    query: 0,
    accepted: 0,
    rejected: 0
  });

  // Fetch all counts
  useEffect(() => {
    fetch('/api/appointments/metrics')
      .then((res) => res.json())
      .then(({
        appointmentCount,
        callbackCount,
        queryCount,
        acceptedCount,
        rejectedCount
      }) => {
        setMetrics({
          appointment: appointmentCount,
          callback: callbackCount,
          query: queryCount,
          accepted: acceptedCount,
          rejected: rejectedCount
        });
      })
      .catch((err) => console.error('Failed to load metrics', err));
  }, []);

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
  const handleReload = () => window.location.reload();

  // Donut chart: segments match card colors
  const donutData = {
    labels: ['Appointments', 'Callback', 'Query'],
    datasets: [
      {
        data: [metrics.appointment, metrics.callback, metrics.query],
        backgroundColor: [
          '#43a047',  // card-appointment main
          '#fb8c00',  // card-callback main
          '#8e24aa'   // card-query main
        ],
        borderWidth: 0,
        cutout: '60%'
      }
    ]
  };

  const donutOptions = {
    plugins: {
      legend: { position: 'bottom' },
      centerText: { label: 'Total Calls', text: totalCalls.toString() }
    },
    maintainAspectRatio: false
  };

  // Line chart for accepted vs rejected (use appointment color)
  const lineData = {
    labels: ['Accepted', 'Rejected'],
    datasets: [
      {
        label: 'Appointment Status',
        data: [metrics.accepted, metrics.rejected],
        tension: 0.4,
        fill: false,
        borderColor: '#43a047',
        borderWidth: 2
      }
    ]
  };

  const lineOptions = {
    scales: {
      x: { display: true },
      y: { display: true, beginAtZero: true }
    },
    plugins: { legend: { display: false } },
    maintainAspectRatio: false
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

        {/* Overview Section: Chart + Cards */}
        <section className="overview-section">
          <div className="chart-section">
            <div className="chart-wrapper">
              <Doughnut data={donutData} options={donutOptions} />
            </div>
          </div>

          <div className="cards-section">
            <div className="overview-card card-total">
              <FaPhoneAlt className="card-icon" />
              <p className="overview-label">Total Calls</p>
              <p className="overview-value">{totalCalls}</p>
            </div>
            <div className="overview-card card-appointment">
              <FaCalendarCheck className="card-icon" />
              <p className="overview-label">Appointment Calls</p>
              <p className="overview-value">{metrics.appointment}</p>
            </div>
            <div className="overview-card card-callback">
              <FaPhoneSlash className="card-icon" />
              <p className="overview-label">Callback Calls</p>
              <p className="overview-value">{metrics.callback}</p>
            </div>
            <div className="overview-card card-query">
              <FaQuestion className="card-icon" />
              <p className="overview-label">Query Calls</p>
              <p className="overview-value">{metrics.query}</p>
            </div>
          </div>
        </section>

        {/* Status Trend Section */}
        <section className="status-graph-section">
          <h2 className="status-graph-title">Appointment Status Trend</h2>
          <div className="status-graph-wrapper">
            <Line data={lineData} options={lineOptions} />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
