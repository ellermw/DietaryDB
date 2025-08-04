import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      console.log('Fetching stats from /api/system/info...');
      const response = await axios.get('/api/system/info');
      console.log('Stats response:', response.data);
      
      // The statistics might be strings, so we ensure they're displayed correctly
      if (response.data && response.data.statistics) {
        setStats(response.data.statistics);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  
  if (error) return <div style={{ color: 'red' }}>Error loading dashboard: {error}</div>;

  // Convert string values to numbers for display
  const getStatValue = (key) => {
    if (!stats || !stats[key]) return 0;
    return parseInt(stats[key]) || 0;
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Active Users</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{getStatValue('active_users')}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Active Patients</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{getStatValue('active_patients')}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Active Items</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{getStatValue('active_items')}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Today's Orders</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{getStatValue('today_orders')}</p>
        </div>
      </div>
      
      {/* Add online users stats if available */}
      {stats && stats.users_online !== undefined && (
        <div style={{ marginTop: '40px' }}>
          <h2>User Activity</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Users Online Now</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#28a745' }}>{getStatValue('users_online')}</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Active Last Hour</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{getStatValue('users_last_hour')}</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Active Today</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{getStatValue('users_last_day')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
