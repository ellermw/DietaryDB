import React, { useState, useEffect } from 'react';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch stats
      const statsRes = await fetch('http://localhost:3000/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch recent activity
      const activityRes = await fetch('http://localhost:3000/api/dashboard/recent-activity', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const activityData = await activityRes.json();
      setRecentActivity(activityData.activities);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading dashboard...</h2>
      </div>
    );
  }

  const StatCard = ({ title, value, subtitle, color = '#3498db', icon }) => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: `1px solid #e0e0e0`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        fontSize: '80px',
        opacity: '0.1',
        color: color
      }}>
        {icon}
      </div>
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50', fontSize: '0.875rem', fontWeight: '500' }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: '2rem', 
        fontWeight: 'bold', 
        margin: '0',
        color: color
      }}>
        {value}
      </p>
      {subtitle && (
        <p style={{ 
          fontSize: '0.875rem', 
          color: '#7f8c8d',
          margin: '0.25rem 0 0 0'
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>Dashboard</h1>
        <p style={{ margin: 0, color: '#7f8c8d' }}>
          System overview and real-time statistics
        </p>
      </div>

      {/* Database Info */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0'
      }}>
        <h2 style={{ margin: '0 0 1rem 0', color: '#2c3e50', fontSize: '1.25rem' }}>
          Database Information
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ color: '#7f8c8d', fontSize: '0.875rem' }}>Database Name:</span>
            <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>{stats?.database.name}</p>
          </div>
          <div>
            <span style={{ color: '#7f8c8d', fontSize: '0.875rem' }}>Database Size:</span>
            <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>{formatBytes(stats?.database.size)}</p>
          </div>
          <div>
            <span style={{ color: '#7f8c8d', fontSize: '0.875rem' }}>Total Tables:</span>
            <p style={{ margin: '0.25rem 0', fontWeight: '500' }}>{stats?.database.tables}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <StatCard
          title="Total Users"
          value={stats?.users.total || 0}
          subtitle={`${stats?.users.active || 0} active | ${stats?.users.admins || 0} admins`}
          color="#3498db"
          icon="👥"
        />
        <StatCard
          title="Active Today"
          value={stats?.users.activeToday || 0}
          subtitle="Users logged in today"
          color="#2ecc71"
          icon="✓"
        />
        <StatCard
          title="Food Items"
          value={stats?.items.total || 0}
          subtitle={`${stats?.items.active || 0} active | ${stats?.items.categories || 0} categories`}
          color="#e74c3c"
          icon="🍽️"
        />
        <StatCard
          title="Patients"
          value={stats?.patients.total || 0}
          subtitle={`${stats?.patients.active || 0} active | ${stats?.patients.wings || 0} wings`}
          color="#f39c12"
          icon="🏥"
        />
        <StatCard
          title="Today's Orders"
          value={stats?.orders.today || 0}
          subtitle={`${stats?.orders.uniquePatients || 0} patients`}
          color="#9b59b6"
          icon="📋"
        />
        <StatCard
          title="System Activity"
          value={stats?.activity.actionsToday || 0}
          subtitle={`${stats?.activity.uniqueUsers || 0} users active`}
          color="#1abc9c"
          icon="📊"
        />
      </div>

      {/* Recent Activity */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0'
      }}>
        <h2 style={{ margin: '0 0 1rem 0', color: '#2c3e50', fontSize: '1.25rem' }}>
          Recent Activity
        </h2>
        {recentActivity.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#7f8c8d', fontSize: '0.875rem' }}>
                    Table
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#7f8c8d', fontSize: '0.875rem' }}>
                    Action
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#7f8c8d', fontSize: '0.875rem' }}>
                    User
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#7f8c8d', fontSize: '0.875rem' }}>
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((activity) => (
                  <tr key={activity.audit_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}>
                        {activity.table_name}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        backgroundColor: activity.action === 'INSERT' ? '#e8f5e9' :
                                       activity.action === 'UPDATE' ? '#fff3e0' :
                                       activity.action === 'DELETE' ? '#ffebee' : '#f5f5f5',
                        color: activity.action === 'INSERT' ? '#388e3c' :
                               activity.action === 'UPDATE' ? '#f57c00' :
                               activity.action === 'DELETE' ? '#d32f2f' : '#666',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {activity.action}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      {activity.changed_by}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#7f8c8d' }}>
                      {formatTime(activity.change_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '2rem 0' }}>
            No recent activity
          </p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;