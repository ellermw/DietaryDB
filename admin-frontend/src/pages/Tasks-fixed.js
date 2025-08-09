import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';

const Tasks = () => {
  const [databaseStats, setDatabaseStats] = useState({
    databaseSize: '0 MB',
    totalTables: 0,
    totalRecords: 0,
    lastCheck: 'Never'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  const fetchDatabaseStats = async () => {
    try {
      const response = await axios.get('/api/tasks/database/stats');
      console.log('Database stats response:', response.data);
      setDatabaseStats(response.data);
    } catch (error) {
      console.error('Error fetching database stats:', error);
    }
  };

  const refreshStats = () => {
    setLoading(true);
    fetchDatabaseStats().finally(() => setLoading(false));
  };

  const runMaintenance = async () => {
    try {
      const response = await axios.post('/api/tasks/database/maintenance/run');
      alert(response.data.message || 'Maintenance completed');
      fetchDatabaseStats();
    } catch (error) {
      console.error('Error running maintenance:', error);
      alert('Error running maintenance');
    }
  };

  const createBackup = async () => {
    try {
      const response = await axios.post('/api/tasks/backup/create');
      alert(response.data.message || 'Backup created');
      fetchDatabaseStats();
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Error creating backup');
    }
  };

  return (
    <div className="tasks-page">
      <h1>System Tasks</h1>
      
      <div className="section">
        <h2>Database Statistics</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <label>Database Size:</label>
            <span>{databaseStats.databaseSize}</span>
          </div>
          <div className="stat-item">
            <label>Total Tables:</label>
            <span>{databaseStats.totalTables}</span>
          </div>
          <div className="stat-item">
            <label>Total Records:</label>
            <span>{databaseStats.totalRecords}</span>
          </div>
          <div className="stat-item">
            <label>Last Check:</label>
            <span>{databaseStats.lastCheck}</span>
          </div>
        </div>
        <button onClick={refreshStats} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Stats'}
        </button>
      </div>

      <div className="section">
        <h2>Database Maintenance</h2>
        <button onClick={runMaintenance}>Run Maintenance Now</button>
      </div>

      <div className="section">
        <h2>Backup Management</h2>
        <button onClick={createBackup}>Create Backup Now</button>
      </div>
    </div>
  );
};

export default Tasks;
