import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './Tasks.css';

const Tasks = () => {
  const [databaseStats, setDatabaseStats] = useState({
    databaseSize: '0 MB',
    totalTables: 0,
    totalRecords: 0,
    lastCheck: 'Never'
  });
  const [loading, setLoading] = useState(false);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState({
    schedule: 'Weekly',
    day: 'Sunday',
    time: '03:00 AM'
  });
  const [backupSchedule, setBackupSchedule] = useState({
    schedule: 'Daily',
    time: '02:00 AM'
  });

  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  const fetchDatabaseStats = async () => {
    try {
      const response = await axios.get('/api/tasks/database/stats');
      console.log('Database stats:', response.data);
      setDatabaseStats(response.data);
    } catch (error) {
      console.error('Error fetching database stats:', error);
    }
  };

  const refreshStats = () => {
    setLoading(true);
    fetchDatabaseStats().finally(() => setLoading(false));
  };

  const runMaintenanceNow = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/tasks/database/maintenance/run');
      alert(response.data.message || 'Maintenance completed successfully');
      fetchDatabaseStats();
    } catch (error) {
      console.error('Error running maintenance:', error);
      alert('Error running maintenance');
    } finally {
      setLoading(false);
    }
  };

  const scheduleMainenance = async () => {
    try {
      const response = await axios.post('/api/tasks/database/maintenance', maintenanceSchedule);
      alert(response.data.message || 'Maintenance scheduled');
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
      alert('Error scheduling maintenance');
    }
  };

  const createBackupNow = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/tasks/backup/create');
      alert(response.data.message || 'Backup created successfully');
      fetchDatabaseStats();
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Error creating backup');
    } finally {
      setLoading(false);
    }
  };

  const scheduleBackup = async () => {
    try {
      const response = await axios.post('/api/tasks/backup/schedule', backupSchedule);
      alert(response.data.message || 'Backup scheduled');
    } catch (error) {
      console.error('Error scheduling backup:', error);
      alert('Error scheduling backup');
    }
  };

  return (
    <div className="tasks-page">
      <h1>System Tasks</h1>
      
      <div className="card">
        <h2>Database Statistics</h2>
        <table className="stats-table">
          <tbody>
            <tr>
              <td>Database Size:</td>
              <td>{databaseStats.databaseSize}</td>
            </tr>
            <tr>
              <td>Total Tables:</td>
              <td>{databaseStats.totalTables}</td>
            </tr>
            <tr>
              <td>Total Records:</td>
              <td>{databaseStats.totalRecords}</td>
            </tr>
            <tr>
              <td>Last Check:</td>
              <td>{databaseStats.lastCheck}</td>
            </tr>
          </tbody>
        </table>
        <button onClick={refreshStats} disabled={loading} className="btn btn-primary">
          {loading ? 'Loading...' : 'Refresh Stats'}
        </button>
      </div>

      <div className="card">
        <h2>Database Maintenance</h2>
        <div className="schedule-section">
          <h3>Schedule Maintenance</h3>
          <div className="form-group">
            <label>Schedule:</label>
            <select 
              value={maintenanceSchedule.schedule} 
              onChange={(e) => setMaintenanceSchedule({...maintenanceSchedule, schedule: e.target.value})}
            >
              <option>Weekly</option>
              <option>Daily</option>
              <option>Monthly</option>
            </select>
          </div>
          {maintenanceSchedule.schedule === 'Weekly' && (
            <div className="form-group">
              <label>Day:</label>
              <select 
                value={maintenanceSchedule.day} 
                onChange={(e) => setMaintenanceSchedule({...maintenanceSchedule, day: e.target.value})}
              >
                <option>Sunday</option>
                <option>Monday</option>
                <option>Tuesday</option>
                <option>Wednesday</option>
                <option>Thursday</option>
                <option>Friday</option>
                <option>Saturday</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Time:</label>
            <input 
              type="text" 
              value={maintenanceSchedule.time}
              onChange={(e) => setMaintenanceSchedule({...maintenanceSchedule, time: e.target.value})}
            />
          </div>
          <button onClick={scheduleMainenance} className="btn btn-secondary">Save Configuration</button>
          <button onClick={runMaintenanceNow} disabled={loading} className="btn btn-warning">
            Run Maintenance Now
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Backup Management</h2>
        <div className="schedule-section">
          <h3>Backup Configuration</h3>
          <div className="form-group">
            <label>Schedule:</label>
            <select 
              value={backupSchedule.schedule} 
              onChange={(e) => setBackupSchedule({...backupSchedule, schedule: e.target.value})}
            >
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          <div className="form-group">
            <label>Time:</label>
            <input 
              type="text" 
              value={backupSchedule.time}
              onChange={(e) => setBackupSchedule({...backupSchedule, time: e.target.value})}
            />
          </div>
          <button onClick={scheduleBackup} className="btn btn-secondary">Save Configuration</button>
          <button onClick={createBackupNow} disabled={loading} className="btn btn-success">
            Create Backup Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
