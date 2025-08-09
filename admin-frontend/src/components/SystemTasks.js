import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import RestoreModal from './RestoreModal';
import './SystemTasks.css';

const SystemTasks = () => {
  const [stats, setStats] = useState({
    database_size: '0 MB',
    total_users: 0,
    active_users: 0,
    active_items: 0,
    categories: 0
  });
  
  const [backups, setBackups] = useState([]);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState({
    cron_expression: '0 2 * * *',
    is_enabled: false,
    last_run: null
  });
  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [isRunningMaintenance, setIsRunningMaintenance] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchBackups();
    fetchMaintenanceSchedule();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/tasks/database/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
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

  const fetchMaintenanceSchedule = async () => {
    try {
      const response = await axios.get('/api/tasks/maintenance/schedule');
      setMaintenanceSchedule(response.data);
    } catch (error) {
      console.error('Error fetching maintenance schedule:', error);
    }
  };

  const handleRunMaintenance = async () => {
    if (!window.confirm('Run database maintenance now? This may take a few minutes.')) {
      return;
    }

    setIsRunningMaintenance(true);
    try {
      await axios.post('/api/tasks/maintenance/run');
      alert('Maintenance completed successfully');
      fetchStats();
    } catch (error) {
      alert('Error running maintenance: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsRunningMaintenance(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const response = await axios.post('/api/tasks/backup/create');
      alert(`Backup created successfully: ${response.data.filename}`);
      fetchBackups();
    } catch (error) {
      alert('Error creating backup: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`Delete backup ${filename}?`)) {
      return;
    }

    try {
      await axios.delete(`/api/tasks/backup/${filename}`);
      fetchBackups();
    } catch (error) {
      alert('Error deleting backup: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDownloadBackup = (filename) => {
    const token = localStorage.getItem('token');
    window.open(`/api/tasks/backup/download/${filename}?token=${token}`, '_blank');
  };

  const handleRestoreClick = (filename = null) => {
    setSelectedBackup(filename);
    setShowRestoreModal(true);
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/tasks/maintenance/schedule', maintenanceSchedule);
      alert('Maintenance schedule updated successfully');
      setShowScheduleModal(false);
      fetchMaintenanceSchedule();
    } catch (error) {
      alert('Error updating schedule: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="system-tasks">
      <h2>System Tasks</h2>

      {/* Database Statistics */}
      <div className="stats-section">
        <h3>Database Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <label>Total Users:</label>
            <span>{stats.total_users}</span>
          </div>
          <div className="stat-item">
            <label>Active Users:</label>
            <span>{stats.active_users}</span>
          </div>
          <div className="stat-item">
            <label>Active Items:</label>
            <span>{stats.active_items}</span>
          </div>
          <div className="stat-item">
            <label>Categories:</label>
            <span>{stats.categories}</span>
          </div>
          <div className="stat-item">
            <label>Database Size:</label>
            <span>{stats.database_size}</span>
          </div>
        </div>
      </div>

      {/* Maintenance Tasks */}
      <div className="maintenance-section">
        <h3>Maintenance Tasks</h3>
        <div className="maintenance-info">
          <div className="info-row">
            <label>Schedule:</label>
            <span>{maintenanceSchedule.is_enabled ? 'Enabled' : 'Not set'}</span>
          </div>
          <div className="info-row">
            <label>Last Run:</label>
            <span>
              {maintenanceSchedule.last_run 
                ? new Date(maintenanceSchedule.last_run).toLocaleString()
                : 'Never'}
            </span>
          </div>
        </div>
        <p className="maintenance-description">
          Optimizes database performance and cleans old audit logs
        </p>
        <div className="maintenance-actions">
          <button
            onClick={handleRunMaintenance}
            disabled={isRunningMaintenance}
            className="btn btn-primary"
          >
            {isRunningMaintenance ? 'Running...' : 'Run Now'}
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="btn btn-secondary"
          >
            Configure Schedule
          </button>
        </div>
      </div>

      {/* Backup Management */}
      <div className="backup-section">
        <h3>Backup Management</h3>
        <div className="backup-actions">
          <button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="btn btn-success"
          >
            {isCreatingBackup ? 'Creating...' : 'Create Backup Now'}
          </button>
          <button
            onClick={() => handleRestoreClick(null)}
            className="btn btn-warning"
          >
            Upload & Restore
          </button>
        </div>

        <h4>Existing Backups</h4>
        {backups.length === 0 ? (
          <p>No backups found</p>
        ) : (
          <table className="backups-table">
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
                    <button
                      onClick={() => handleDownloadBackup(backup.filename)}
                      className="btn btn-sm btn-info"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleRestoreClick(backup.filename)}
                      className="btn btn-sm btn-warning"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDeleteBackup(backup.filename)}
                      className="btn btn-sm btn-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Configure Schedule Modal */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Configure Maintenance Schedule</h2>
            <form onSubmit={handleUpdateSchedule}>
              <div className="form-group">
                <label>Schedule (Cron Expression)</label>
                <select
                  value={maintenanceSchedule.cron_expression}
                  onChange={(e) => setMaintenanceSchedule({
                    ...maintenanceSchedule,
                    cron_expression: e.target.value
                  })}
                >
                  <option value="0 2 * * *">Daily at 2:00 AM</option>
                  <option value="0 3 * * *">Daily at 3:00 AM</option>
                  <option value="0 4 * * *">Daily at 4:00 AM</option>
                  <option value="0 2 * * 0">Weekly on Sunday at 2:00 AM</option>
                  <option value="0 2 1 * *">Monthly on 1st at 2:00 AM</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={maintenanceSchedule.is_enabled}
                    onChange={(e) => setMaintenanceSchedule({
                      ...maintenanceSchedule,
                      is_enabled: e.target.checked
                    })}
                  />
                  Enable scheduled maintenance
                </label>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Save Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      <RestoreModal
        isOpen={showRestoreModal}
        onClose={() => {
          setShowRestoreModal(false);
          setSelectedBackup(null);
        }}
        onRestore={() => {
          fetchBackups();
          fetchStats();
        }}
        existingBackup={selectedBackup}
      />
    </div>
  );
};

export default SystemTasks;
