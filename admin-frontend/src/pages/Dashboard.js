import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    activePatients: 0,
    pendingOrders: 0,
    totalItems: 0,
    totalUsers: 0
  });
  const [userActivity, setUserActivity] = useState({
    activeUsers: [],
    lastActivity: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard/stats');
      setStats(response.data.stats);
      setUserActivity(response.data.userActivity);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card patients">
          <div className="stat-content">
            <h3>Active Patients</h3>
            <p className="stat-value">{stats.activePatients}</p>
          </div>
        </div>

        <div className="stat-card orders">
          <div className="stat-content">
            <h3>Pending Orders</h3>
            <p className="stat-value">{stats.pendingOrders}</p>
          </div>
        </div>

        <div className="stat-card items">
          <div className="stat-content">
            <h3>Total Items</h3>
            <p className="stat-value">{stats.totalItems}</p>
          </div>
        </div>

        <div className="stat-card users">
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-value">{stats.totalUsers}</p>
          </div>
        </div>
      </div>

      <div className="activity-section">
        <h2>User Activity</h2>
        <div className="activity-grid">
          <div className="activity-card">
            <h3>Active Users</h3>
            {userActivity.activeUsers.length > 0 ? (
              <div className="active-users-list">
                {userActivity.activeUsers.map((firstName, index) => (
                  <span key={index} className="active-user-badge">
                    {firstName}
                  </span>
                ))}
              </div>
            ) : (
              <p className="no-activity">No active users in the last 30 minutes</p>
            )}
          </div>

          <div className="activity-card">
            <h3>Last Activity</h3>
            {userActivity.lastActivity ? (
              <div className="last-activity">
                <p className="activity-user">{userActivity.lastActivity.user}</p>
                <p className="activity-action">{userActivity.lastActivity.action}</p>
                <p className="activity-time">{formatTimestamp(userActivity.lastActivity.timestamp)}</p>
              </div>
            ) : (
              <p className="no-activity">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
