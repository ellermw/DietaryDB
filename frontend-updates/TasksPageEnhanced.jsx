import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProgressModal from './ProgressModal';

const TasksPage = () => {
  const [stats, setStats] = useState(null);
  const [backups, setBackups] = useState([]);
  const [schedule, setSchedule] = useState({
    cron_expression: '0 2 * * *',
    is_active: false
  });
  const [currentTask, setCurrentTask] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchBackups();
    fetchSchedule();
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

  const fetchSchedule = async () => {
    try {
      const response = await axios.get('/api/tasks/maintenance/schedule');
      setSchedule(response.data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  const runMaintenance = async () => {
    try {
      const response = await axios.post('/api/tasks/maintenance/run');
      setCurrentTask({
        id: response.data.taskId,
        title: 'Running Maintenance'
      });
      setShowProgressModal(true);
    } catch (error) {
      alert('Error starting maintenance: ' + error.response?.data?.message);
    }
  };

  const createBackup = async () => {
    try {
      const response = await axios.post('/api/tasks/backup/create');
      setCurrentTask({
        id: response.data.taskId,
        title: 'Creating Backup'
      });
      setShowProgressModal(true);
    } catch (error) {
      alert('Error creating backup: ' + error.response?.data?.message);
    }
  };

  const restoreBackup = async (filename) => {
    if (!confirm(`Restore from ${filename}? This will replace all current data!`)) {
      return;
    }

    try {
      const response = await axios.post(`/api/tasks/backup/restore/${filename}`);
      setCurrentTask({
        id: response.data.taskId,
        title: 'Restoring Backup'
      });
      setShowProgressModal(true);
    } catch (error) {
      alert('Error restoring backup: ' + error.response?.data?.message);
    }
  };

  const deleteBackup = async (filename) => {
    if (!confirm(`Delete backup ${filename}?`)) {
      return;
    }

    try {
      await axios.delete(`/api/tasks/backup/${filename}`);
      alert('Backup deleted successfully');
      fetchBackups();
    } catch (error) {
      alert('Error deleting backup: ' + error.response?.data?.message);
    }
  };

  const downloadBackup = (filename) => {
    const token = localStorage.getItem('token');
    window.open(`/api/tasks/backup/download/${filename}?token=${token}`, '_blank');
  };

  const updateSchedule = async () => {
    try {
      await axios.put('/api/tasks/maintenance/schedule', schedule);
      alert('Schedule updated successfully');
    } catch (error) {
      alert('Error updating schedule: ' + error.response?.data?.message);
    }
  };

  const handleProgressModalClose = () => {
    setShowProgressModal(false);
    setCurrentTask(null);
    // Refresh data after task completion
    fetchStats();
    fetchBackups();
  };

  return (
    <div className="tasks-page">
      <h1>System Tasks</h1>

      {/* Database Statistics */}
      <div className="task-section">
        <h2>Database Statistics</h2>
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <label>Active Users</label>
              <span>{stats.active_users}</span>
            </div>
            <div className="stat-card">
              <label>Total Users</label>
              <span>{stats.total_users}</span>
            </div>
            <div className="stat-card">
              <label>Active Items</label>
              <span>{stats.active_items}</span>
            </div>
            <div className="stat-card">
              <label>Categories</label>
              <span>{stats.categories}</span>
            </div>
            <div className="stat-card">
              <label>Database Size</label>
              <span>{stats.database_size}</span>
            </div>
          </div>
        )}
      </div>

      {/* Maintenance Tasks */}
      <div className="task-section">
        <h2>Maintenance Tasks</h2>
        <div className="maintenance-controls">
          <button onClick={runMaintenance} className="btn btn-primary">
            Run Maintenance Now
          </button>
          
          <div className="schedule-form">
            <select 
              value={schedule.cron_expression}
              onChange={(e) => setSchedule({...schedule, cron_expression: e.target.value})}
            >
              <option value="0 2 * * *">Daily at 2:00 AM</option>
              <option value="0 3 * * *">Daily at 3:00 AM</option>
              <option value="0 4 * * *">Daily at 4:00 AM</option>
              <option value="0 2 * * 0">Weekly on Sunday at 2:00 AM</option>
            </select>
            
            <label>
              <input 
                type="checkbox"
                checked={schedule.is_active}
                onChange={(e) => setSchedule({...schedule, is_active: e.target.checked})}
              />
              Enable Schedule
            </label>
            
            <button onClick={updateSchedule} className="btn btn-secondary">
              Update Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Backup Management */}
      <div className="task-section">
        <h2>Backup Management</h2>
        <button onClick={createBackup} className="btn btn-success">
          Create Backup Now
        </button>
        
        <div className="backups-list">
          <h3>Existing Backups ({backups.length})</h3>
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
                      onClick={() => downloadBackup(backup.filename)}
                      className="btn btn-sm btn-info"
                    >
                      Download
                    </button>
                    <button 
                      onClick={() => restoreBackup(backup.filename)}
                      className="btn btn-sm btn-warning"
                    >
                      Restore
                    </button>
                    <button 
                      onClick={() => deleteBackup(backup.filename)}
                      className="btn btn-sm btn-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Progress Modal */}
      {showProgressModal && currentTask && (
        <ProgressModal 
          taskId={currentTask.id}
          title={currentTask.title}
          onClose={handleProgressModalClose}
        />
      )}
    </div>
  );
};

export default TasksPage;
