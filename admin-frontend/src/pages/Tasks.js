import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './Tasks.css';

const Tasks = () => {
  const [dbStats, setDbStats] = useState(null);
  const [backups, setBackups] = useState([]);
  const [backupConfig, setBackupConfig] = useState({
    enabled: false,
    schedule: 'daily',
    time: '02:00',
    retention: 7
  });
  const [maintenanceConfig, setMaintenanceConfig] = useState({
    enabled: false,
    schedule: 'weekly',
    day: 'sunday',
    time: '03:00'
  });
  const [backupStatus, setBackupStatus] = useState('');
  const [maintenanceStatus, setMaintenanceStatus] = useState('');

  useEffect(() => {
    loadDatabaseStats();
    loadBackups();
    loadConfigurations();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      const response = await axios.get('/api/tasks/database/stats');
      setDbStats(response.data);
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  };

  const loadBackups = async () => {
    try {
      const response = await axios.get('/api/tasks/backups');
      setBackups(response.data || []);
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const loadConfigurations = async () => {
    try {
      const response = await axios.get('/api/tasks/config');
      if (response.data.backup) {
        setBackupConfig(response.data.backup);
      }
      if (response.data.maintenance) {
        setMaintenanceConfig(response.data.maintenance);
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
    }
  };

  const createBackup = async () => {
    setBackupStatus('Creating backup...');
    try {
      const response = await axios.post('/api/tasks/backup');
      setBackupStatus(`Backup created: ${response.data.filename}`);
      loadBackups();
      setTimeout(() => setBackupStatus(''), 5000);
    } catch (error) {
      setBackupStatus('Backup failed: ' + error.message);
    }
  };

  const deleteBackup = async (filename) => {
    if (window.confirm(`Delete backup ${filename}?`)) {
      try {
        await axios.delete(`/api/tasks/backups/${filename}`);
        loadBackups();
      } catch (error) {
        alert('Error deleting backup');
      }
    }
  };

  const restoreBackup = async (filename) => {
    if (window.confirm(`Restore database from ${filename}? This will replace all current data!`)) {
      try {
        await axios.post(`/api/tasks/restore/${filename}`);
        alert('Database restored successfully');
      } catch (error) {
        alert('Error restoring backup');
      }
    }
  };

  const runMaintenance = async () => {
    setMaintenanceStatus('Running maintenance...');
    try {
      await axios.post('/api/tasks/maintenance');
      setMaintenanceStatus('Maintenance completed successfully');
      loadDatabaseStats();
      setTimeout(() => setMaintenanceStatus(''), 5000);
    } catch (error) {
      setMaintenanceStatus('Maintenance failed: ' + error.message);
    }
  };

  const saveBackupConfig = async () => {
    try {
      await axios.put('/api/tasks/config/backup', backupConfig);
      alert('Backup configuration saved');
    } catch (error) {
      alert('Error saving backup configuration');
    }
  };

  const saveMaintenanceConfig = async () => {
    try {
      await axios.put('/api/tasks/config/maintenance', maintenanceConfig);
      alert('Maintenance configuration saved');
    } catch (error) {
      alert('Error saving maintenance configuration');
    }
  };

  return (
    <div className="tasks-page">
      <h1>System Tasks</h1>
      
      {/* Database Statistics */}
      <div className="task-section">
        <h2>Database Statistics</h2>
        {dbStats ? (
          <div className="stats-grid">
            <div className="stat-item">
              <label>Database Size:</label>
              <span>{dbStats.database_size}</span>
            </div>
            <div className="stat-item">
              <label>Total Tables:</label>
              <span>{dbStats.table_count}</span>
            </div>
            <div className="stat-item">
              <label>Total Records:</label>
              <span>{dbStats.total_rows}</span>
            </div>
            <div className="stat-item">
              <label>Last Check:</label>
              <span>{new Date(dbStats.last_check).toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <p>Loading statistics...</p>
        )}
        <button onClick={loadDatabaseStats} className="btn btn-secondary">Refresh Stats</button>
      </div>

      {/* Database Maintenance */}
      <div className="task-section">
        <h2>Database Maintenance</h2>
        <div className="maintenance-config">
          <h3>Schedule Maintenance</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>
                <input 
                  type="checkbox" 
                  checked={maintenanceConfig.enabled}
                  onChange={(e) => setMaintenanceConfig({...maintenanceConfig, enabled: e.target.checked})}
                />
                Enable Scheduled Maintenance
              </label>
            </div>
            <div className="config-item">
              <label>Schedule:</label>
              <select 
                value={maintenanceConfig.schedule}
                onChange={(e) => setMaintenanceConfig({...maintenanceConfig, schedule: e.target.value})}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {maintenanceConfig.schedule === 'weekly' && (
              <div className="config-item">
                <label>Day:</label>
                <select 
                  value={maintenanceConfig.day}
                  onChange={(e) => setMaintenanceConfig({...maintenanceConfig, day: e.target.value})}
                >
                  <option value="sunday">Sunday</option>
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                </select>
              </div>
            )}
            <div className="config-item">
              <label>Time:</label>
              <input 
                type="time" 
                value={maintenanceConfig.time}
                onChange={(e) => setMaintenanceConfig({...maintenanceConfig, time: e.target.value})}
              />
            </div>
          </div>
          <div className="config-actions">
            <button onClick={saveMaintenanceConfig} className="btn btn-primary">Save Configuration</button>
            <button onClick={runMaintenance} className="btn btn-warning">Run Maintenance Now</button>
          </div>
          {maintenanceStatus && <p className="status-message">{maintenanceStatus}</p>}
        </div>
      </div>

      {/* Backup Management */}
      <div className="task-section">
        <h2>Backup Management</h2>
        
        <div className="backup-config">
          <h3>Backup Configuration</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>
                <input 
                  type="checkbox" 
                  checked={backupConfig.enabled}
                  onChange={(e) => setBackupConfig({...backupConfig, enabled: e.target.checked})}
                />
                Enable Scheduled Backups
              </label>
            </div>
            <div className="config-item">
              <label>Schedule:</label>
              <select 
                value={backupConfig.schedule}
                onChange={(e) => setBackupConfig({...backupConfig, schedule: e.target.value})}
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="config-item">
              <label>Time:</label>
              <input 
                type="time" 
                value={backupConfig.time}
                onChange={(e) => setBackupConfig({...backupConfig, time: e.target.value})}
              />
            </div>
            <div className="config-item">
              <label>Retention (days):</label>
              <input 
                type="number" 
                value={backupConfig.retention}
                onChange={(e) => setBackupConfig({...backupConfig, retention: parseInt(e.target.value)})}
                min="1"
                max="365"
              />
            </div>
          </div>
          <div className="config-actions">
            <button onClick={saveBackupConfig} className="btn btn-primary">Save Configuration</button>
            <button onClick={createBackup} className="btn btn-success">Create Backup Now</button>
          </div>
          {backupStatus && <p className="status-message">{backupStatus}</p>}
        </div>

        <div className="backup-list">
          <h3>Existing Backups</h3>
          {backups.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Date</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(backup => (
                  <tr key={backup.filename}>
                    <td>{backup.filename}</td>
                    <td>{new Date(backup.created).toLocaleString()}</td>
                    <td>{backup.size}</td>
                    <td>
                      <button onClick={() => restoreBackup(backup.filename)} className="btn-small btn-restore">Restore</button>
                      <button onClick={() => deleteBackup(backup.filename)} className="btn-small btn-delete">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No backups found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tasks;
