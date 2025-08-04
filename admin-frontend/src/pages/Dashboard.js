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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get('/api/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card active-patients">
          <div className="stat-header">ACTIVE PATIENTS</div>
          <div className="stat-value">{stats.activePatients}</div>
        </div>
        
        <div className="stat-card pending-orders">
          <div className="stat-header">PENDING ORDERS</div>
          <div className="stat-value">{stats.pendingOrders}</div>
        </div>
        
        <div className="stat-card total-items">
          <div className="stat-header">TOTAL ITEMS</div>
          <div className="stat-value">{stats.totalItems}</div>
        </div>
        
        <div className="stat-card total-users">
          <div className="stat-header">TOTAL USERS</div>
          <div className="stat-value">{stats.totalUsers}</div>
        </div>
      </div>

      <div className="activity-section">
        <h2>User Activity</h2>
        <div className="activity-grid">
          <div className="activity-card">
            <h3>Active Users</h3>
            <p className="no-activity">No active users in the last 30 minutes</p>
          </div>
          <div className="activity-card">
            <h3>Last Activity</h3>
            <p className="no-activity">No recent activity</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
