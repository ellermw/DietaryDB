import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalUsers: 0,
    totalCategories: 0,
    totalPatients: 0,
    recentActivity: []
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await axios.get('/api/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalItems}</div>
          <div className="stat-label">Total Items</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalCategories}</div>
          <div className="stat-label">Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalPatients || 0}</div>
          <div className="stat-label">Patients</div>
        </div>
      </div>
      
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        {stats.recentActivity && stats.recentActivity.length > 0 ? (
          <ul>
            {stats.recentActivity.map((item, idx) => (
              <li key={idx}>
                <strong>{item.name}</strong> - {item.category}
              </li>
            ))}
          </ul>
        ) : (
          <p>No recent activity</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
