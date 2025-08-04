import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalItems: 0,
    totalCategories: 0,
    totalUsers: 0,
    userActivity: {
      totalLogins: 0,
      uniqueUsers: 0,
      lastActivity: null
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/dashboard/stats');
      setStats({
        totalItems: response.data.total_items || 0,
        totalCategories: response.data.total_categories || 0,
        totalUsers: response.data.total_users || 0,
        userActivity: {
          totalLogins: response.data.user_activity?.total_logins || 0,
          uniqueUsers: response.data.user_activity?.unique_users || 0,
          lastActivity: response.data.user_activity?.last_activity
        }
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <p>Welcome back, {currentUser?.firstName} {currentUser?.lastName}!</p>
      
      <div className="dashboard-stats">
        <div className="stat-box">
          <h3>{stats.totalItems}</h3>
          <p>Total Items</p>
        </div>
        <div className="stat-box">
          <h3>{stats.totalCategories}</h3>
          <p>Categories</p>
        </div>
        <div className="stat-box">
          <h3>{stats.totalUsers}</h3>
          <p>Total Users</p>
        </div>
      </div>

      <div className="user-activity-section">
        <h2>User Activity</h2>
        <div className="activity-stats">
          <div className="activity-item">
            <span className="label">Logins Today:</span>
            <span className="value">{stats.userActivity.totalLogins}</span>
          </div>
          <div className="activity-item">
            <span className="label">Active Users:</span>
            <span className="value">{stats.userActivity.uniqueUsers}</span>
          </div>
          <div className="activity-item">
            <span className="label">Last Activity:</span>
            <span className="value">
              {stats.userActivity.lastActivity 
                ? new Date(stats.userActivity.lastActivity).toLocaleString()
                : 'No recent activity'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
