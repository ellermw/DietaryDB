import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import './Tasks.css';

const Tasks = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState(null);
  const [lastMaintenance, setLastMaintenance] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    cron_expression: '0 2 * * *',
    is_active: true
  });
  const [showProgress, setShowProgress] = useState(false);
  const [progressTitle, setProgressTitle] = useState('');
  const [progressLog, setProgressLog] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [backupError, setBackupError] = useState(null);

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchBackups();
      fetchMaintenanceInfo();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/tasks/database/stats');
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const response = await axios.get('/api/tasks/backup/list');
      setBackups(response.data);
    } catch (error) {
      console.error('Error fetching backups:', error);
    }
  };

  const fetchMaintenanceInfo = async () => {
    try {
      const response = await axios.get('/api/tasks/maintenance/schedule');
      setMaintenanceSchedule(response.data.schedule);
      setLastMaintenance(response.data.lastRun);
      if (response.data.schedule) {
        setScheduleForm({
          cron_expression: response.data.schedule.cron_expression,
          is_active: response.data.schedule.is_active
        });
      }
    } catch (error) {
      console.error('Error fetching maintenance info:', error);
    }
  };

  const showProgressModal = (title) => {
    setProgressTitle(title);
    setProgressLog([]);
    setProgressPercent(0);
    setBackupError(null);
    setShowProgress(true);
  };

  const addProgressLog = (message) => {
    setProgressLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runMaintenance = async () => {
    showProgressModal('Running Database Maintenance');
    addProgressLog('Starting maintenance tasks...');
    setProgressPercent(20);
    
    try {
      addProgressLog('Running VACUUM ANALYZE...');
      setProgressPercent(50);
      
      await axios.post('/api/tasks/maintenance/run');
      
      addProgressLog('Optimizing indexes...');
      setProgressPercent(80);
      
      setTimeout(() => {
        addProgressLog('Maintenance completed successfully!');
        setProgressPercent(100);
        fetchStats();
        fetchMaintenanceInfo();
      }, 1000);
    } catch (error) {
      addProgressLog('Error: ' + (error.response?.data?.message || error.message));
      setBackupError(error.response?.data?.message || error.message);
    }
  };

  const updateSchedule = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/tasks/maintenance/schedule', scheduleForm);
      alert('Maintenance schedule updated successfully');
      setShowScheduleModal(false);
      fetchMaintenanceInfo();
    } catch (error) {
      alert('Error updating schedule: ' + (error.response?.data?.message || error.message));
    }
  };

  const createBackup = async () => {
    showProgressModal('Creating Database Backup');
    addProgressLog('Initializing backup process...');
    setProgressPercent(10);
    
    try {
      addProgressLog('Creating backup directory...');
      setProgressPercent(30);
      
      addProgressLog('Dumping database...');
      setProgressPercent(60);
      
      const response = await axios.post('/api/tasks/backup/create');
      
      addProgressLog('Backup completed successfully!');
      addProgressLog(`File: ${response.data.filename}`);
      addProgressLog(`Size: ${response.data.size_formatted}`);
      setProgressPercent(100);
      
      setTimeout(() => {
        setShowProgress(false);
        fetchBackups();
      }, 2000);
    } catch (error) {
      addProgressLog('Error: Backup failed');
      addProgressLog(error.response?.data?.message || error.message);
      setBackupError(error.response?.data?.message || error.message);
    }
  };

  const deleteBackup = async (filename) => {
    if (window.confirm(`Are you sure you want to delete ${filename}?`)) {
      try {
        await axios.delete(`/api/tasks/backup/${filename}`);
        fetchBackups();
      } catch (error) {
        alert('Error deleting backup: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const downloadBackup = (filename) => {
    const token = localStorage.getItem('token');
    window.open(`/api/tasks/backup/download/${filename}?token=${token}`, '_blank');
  };

  const closeProgressModal = () => {
    setShowProgress(false);
    setBackupError(null);
  };

  const formatCronExpression = (cron) => {
    const parts = cron.split(' ');
    if (parts.length !== 5) return cron;
    
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `Daily at ${hour}:${minute.padStart(2, '0')}`;
    }
    return cron;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAdmin) {
    return <div className="error-message">Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="tasks-page">
      <h1>System Tasks</h1>
      
      <div className="stats-section">
        <h2>Database Statistics</h2>
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Users:</div>
              <div className="stat-value">{stats.total_users}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Users:</div>
              <div className="stat-value">{stats.active_users}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Items:</div>
              <div className="stat-value">{stats.active_items}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Categories:</div>
              <div className="stat-value">{stats.categories}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Database Size:</div>
              <div className="stat-value">{stats.database_size_formatted}</div>
            </div>
          </div>
        )}
      </div>

      <div className="maintenance-section">
        <h2>Maintenance Tasks</h2>
        <div className="maintenance-info">
          <div className="maintenance-status">
            <div className="status-item">
              <span className="status-label">Schedule:</span>
              <span className="status-value">
                {maintenanceSchedule ? formatCronExpression(maintenanceSchedule.cron_expression) : 'Not set'}
                {maintenanceSchedule && !maintenanceSchedule.is_active && ' (Disabled)'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Last Run:</span>
              <span className="status-value">
                {lastMaintenance ? new Date(lastMaintenance.completed_at).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
          <div className="maintenance-actions">
            <button className="btn btn-primary" onClick={runMaintenance}>
              Run Now
            </button>
            <button className="btn btn-secondary" onClick={() => setShowScheduleModal(true)}>
              Configure Schedule
            </button>
          </div>
        </div>
        <p className="help-text">Optimizes database performance and cleans old audit logs</p>
      </div>

      <div className="backup-section">
        <h2>Backup Management</h2>
        <div className="backup-actions">
          <button className="btn btn-success" onClick={createBackup}>
            Create Backup Now
          </button>
        </div>
        
        <div className="backup-list">
          <h3>Existing Backups</h3>
          {backups.length === 0 ? (
            <p>No backups found</p>
          ) : (
            <table className="backup-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(backup => (
                  <tr key={backup.filename}>
                    <td>{backup.filename}</td>
                    <td>{backup.size_formatted}</td>
                    <td>{new Date(backup.created).toLocaleString()}</td>
                    <td>
                      <div className="backup-actions-cell">
                        <button 
                          className="btn btn-sm btn-info"
                          onClick={() => downloadBackup(backup.filename)}
                        >
                          Download
                        </button>
                        <button 
                          className="btn btn-sm btn-warning"
                          onClick={() => alert('Restore functionality coming soon')}
                        >
                          Restore
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => deleteBackup(backup.filename)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Configure Maintenance Schedule</h2>
            <form onSubmit={updateSchedule}>
              <div className="form-group">
                <label>Schedule (Cron Expression)</label>
                <select
                  value={scheduleForm.cron_expression}
                  onChange={(e) => setScheduleForm({...scheduleForm, cron_expression: e.target.value})}
                >
                  <option value="0 2 * * *">Daily at 2:00 AM</option>
                  <option value="0 3 * * *">Daily at 3:00 AM</option>
                  <option value="0 4 * * *">Daily at 4:00 AM</option>
                  <option value="0 2 * * 0">Weekly on Sunday at 2:00 AM</option>
                  <option value="0 2 1 * *">Monthly on 1st at 2:00 AM</option>
                </select>
              </div>
              
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={scheduleForm.is_active}
                    onChange={(e) => setScheduleForm({...scheduleForm, is_active: e.target.checked})}
                  />
                  Enable scheduled maintenance
                </label>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Save Schedule
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProgress && (
        <div className="modal-overlay">
          <div className="modal-content progress-modal">
            <h2>{progressTitle}</h2>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="progress-log">
              {progressLog.map((log, index) => (
                <div key={index} className={backupError && log.includes('Error') ? 'error-log' : ''}>
                  {log}
                </div>
              ))}
            </div>
            {(progressPercent === 100 || backupError) && (
              <button className="btn btn-primary" onClick={closeProgressModal}>
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
