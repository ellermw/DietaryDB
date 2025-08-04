import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

const Tasks = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backupConfig, setBackupConfig] = useState({ backup_directory: '/db_backup' });
  const [scheduleConfig, setScheduleConfig] = useState({
    schedule: '0 2 * * *',
    enabled: false
  });
  const [showProgress, setShowProgress] = useState(false);
  const [progressTitle, setProgressTitle] = useState('');
  const [progressLog, setProgressLog] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchBackups();
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

  const showProgressModal = (title) => {
    setProgressTitle(title);
    setProgressLog([]);
    setProgressPercent(0);
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
      
      const response = await axios.post('/api/tasks/maintenance/run');
      
      addProgressLog('Optimizing indexes...');
      setProgressPercent(80);
      
      setTimeout(() => {
        addProgressLog('Maintenance completed successfully!');
        setProgressPercent(100);
        fetchStats();
        
        setTimeout(() => {
          setShowProgress(false);
        }, 2000);
      }, 1000);
    } catch (error) {
      addProgressLog('Error: ' + (error.response?.data?.message || error.message));
      setProgressPercent(0);
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
      
      addProgressLog('Compressing backup file...');
      setProgressPercent(90);
      
      setTimeout(() => {
        addProgressLog(`Backup created: ${response.data.filename}`);
        addProgressLog('Backup completed successfully!');
        setProgressPercent(100);
        fetchBackups();
        
        setTimeout(() => {
          setShowProgress(false);
        }, 2000);
      }, 1000);
    } catch (error) {
      addProgressLog('Error: ' + (error.response?.data?.message || error.message));
      setProgressPercent(0);
    }
  };

  const scheduleBackup = async () => {
    try {
      const response = await axios.post('/api/tasks/backup/schedule', scheduleConfig);
      alert(response.data.message);
    } catch (error) {
      alert('Error scheduling backup: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAdmin) {
    return <div className="access-denied">Access restricted to administrators</div>;
  }

  return (
    <div className="tasks-page">
      <h1>System Tasks</h1>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Database Statistics</h3>
          {stats ? (
            <div className="stats">
              <div className="stat-item">
                <span className="label">Total Users:</span>
                <span className="value">{stats.total_users || 0}</span>
              </div>
              <div className="stat-item">
                <span className="label">Active Users:</span>
                <span className="value">{stats.active_users || 0}</span>
              </div>
              <div className="stat-item">
                <span className="label">Active Items:</span>
                <span className="value">{stats.active_items || 0}</span>
              </div>
              <div className="stat-item">
                <span className="label">Categories:</span>
                <span className="value">{stats.total_categories || 0}</span>
              </div>
              <div className="stat-item">
                <span className="label">Database Size:</span>
                <span className="value">{formatBytes(stats.database_size)}</span>
              </div>
            </div>
          ) : (
            <p>Unable to load statistics</p>
          )}
        </div>

        <div className="stat-card">
          <h3>Maintenance Tasks</h3>
          <button 
            onClick={runMaintenance}
            className="btn btn-primary"
          >
            Run Maintenance
          </button>
          <p className="help-text">
            Optimizes database performance and cleans old audit logs
          </p>
        </div>
      </div>

      <div className="card" style={{marginTop: '30px'}}>
        <h2>Backup Management</h2>
        
        <div className="backup-actions" style={{marginBottom: '30px'}}>
          <button 
            onClick={createBackup}
            className="btn btn-success"
          >
            Create Backup Now
          </button>
          
          <div className="schedule-backup" style={{marginTop: '20px'}}>
            <h4>Schedule Automatic Backup</h4>
            <div className="form-group">
              <select
                value={scheduleConfig.schedule}
                onChange={(e) => setScheduleConfig({...scheduleConfig, schedule: e.target.value})}
                style={{marginBottom: '10px'}}
              >
                <option value="0 2 * * *">Daily at 2 AM</option>
                <option value="0 2 * * 0">Weekly on Sunday at 2 AM</option>
                <option value="0 2 1 * *">Monthly on 1st at 2 AM</option>
              </select>
              <label style={{marginLeft: '10px'}}>
                <input
                  type="checkbox"
                  checked={scheduleConfig.enabled}
                  onChange={(e) => setScheduleConfig({...scheduleConfig, enabled: e.target.checked})}
                />
                Enable Scheduled Backup
              </label>
              <button onClick={scheduleBackup} className="btn btn-primary btn-small" style={{marginLeft: '10px'}}>
                Save Schedule
              </button>
            </div>
          </div>
        </div>

        <div className="backups-list">
          <h3>Available Backups</h3>
          {backups.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup, index) => (
                  <tr key={index}>
                    <td>{backup.filename}</td>
                    <td>{formatBytes(backup.size)}</td>
                    <td>{new Date(backup.created).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No backups available</p>
          )}
        </div>
      </div>

      {showProgress && (
        <div className="modal">
          <div className="modal-content progress-modal">
            <h3>{progressTitle}</h3>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{width: `${progressPercent}%`}}
              ></div>
            </div>
            <div className="progress-log">
              {progressLog.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
