// /opt/dietarydb/admin-frontend/src/pages/Tasks.js
import React, { useState, useEffect, useContext } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

const Tasks = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState(null);
  const [backupHistory, setBackupHistory] = useState([]);
  const [backupSchedules, setBackupSchedules] = useState([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [maintenanceRunning, setMaintenanceRunning] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  
  const [scheduleForm, setScheduleForm] = useState({
    schedule_name: '',
    schedule_type: 'daily',
    schedule_time: '02:00',
    schedule_day_of_week: 0,
    schedule_day_of_month: 1,
    retention_days: 30
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, historyRes, schedulesRes] = await Promise.all([
        axios.get('/api/tasks/database/stats'),
        axios.get('/api/tasks/backup/history'),
        axios.get('/api/tasks/backup/schedules')
      ]);
      
      setDbStats(statsRes.data);
      setBackupHistory(historyRes.data);
      setBackupSchedules(schedulesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const runMaintenance = async () => {
    if (!window.confirm('Run database maintenance? This may take a few minutes.')) return;
    
    setMaintenanceRunning(true);
    try {
      const response = await axios.post('/api/tasks/database/maintenance');
      alert('Database maintenance completed successfully!');
      fetchData();
    } catch (error) {
      alert('Error running maintenance: ' + (error.response?.data?.message || error.message));
    } finally {
      setMaintenanceRunning(false);
    }
  };

  const runManualBackup = async () => {
    if (!window.confirm('Create a manual backup? This may take a few minutes.')) return;
    
    setBackupRunning(true);
    try {
      const response = await axios.post('/api/tasks/backup/manual');
      alert(`Backup completed successfully!\nFile: ${response.data.backupName}\nSize: ${formatBytes(response.data.size)}`);
      fetchData();
    } catch (error) {
      alert('Error creating backup: ' + (error.response?.data?.message || error.message));
    } finally {
      setBackupRunning(false);
    }
  };

  const restoreBackup = async (backupId, backupName) => {
    if (!window.confirm(`Are you sure you want to restore from backup: ${backupName}?\n\nThis will replace all current data!`)) {
      return;
    }
    
    if (!window.confirm('This action cannot be undone. Are you absolutely sure?')) {
      return;
    }
    
    try {
      await axios.post('/api/tasks/backup/restore', { backup_id: backupId });
      alert('Database restored successfully! Please log in again.');
      window.location.href = '/login';
    } catch (error) {
      alert('Error restoring backup: ' + (error.response?.data?.message || error.message));
    }
  };

  const createSchedule = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/tasks/backup/schedule', scheduleForm);
      alert('Backup schedule created successfully!');
      setShowScheduleForm(false);
      setScheduleForm({
        schedule_name: '',
        schedule_type: 'daily',
        schedule_time: '02:00',
        schedule_day_of_week: 0,
        schedule_day_of_month: 1,
        retention_days: 30
      });
      fetchData();
    } catch (error) {
      alert('Error creating schedule: ' + (error.response?.data?.message || error.message));
    }
  };

  const toggleSchedule = async (schedule) => {
    try {
      await axios.put(`/api/tasks/backup/schedule/${schedule.schedule_id}`, {
        is_active: !schedule.is_active
      });
      fetchData();
    } catch (error) {
      alert('Error updating schedule: ' + (error.response?.data?.message || error.message));
    }
  };

  const deleteSchedule = async (scheduleId, scheduleName) => {
    if (!window.confirm(`Delete backup schedule: ${scheduleName}?`)) return;
    
    try {
      await axios.delete(`/api/tasks/backup/schedule/${scheduleId}`);
      fetchData();
    } catch (error) {
      alert('Error deleting schedule: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) return <div>Loading...</div>;

  if (currentUser?.role !== 'Admin') {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page. Admin access required.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Database Tasks</h1>
      
      {/* Database Statistics */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>Database Statistics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>Database Size</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#495057' }}>
              {dbStats ? formatBytes(dbStats.database_size) : '-'}
            </div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>Total Users</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#495057' }}>
              {dbStats?.total_users || 0}
            </div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>Total Patients</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#495057' }}>
              {dbStats?.total_patients || 0}
            </div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>Total Orders</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#495057' }}>
              {dbStats?.total_orders || 0}
            </div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>Total Backups</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#495057' }}>
              {dbStats?.total_backups || 0}
            </div>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>Last Backup</div>
            <div style={{ fontSize: '0.875rem', color: '#495057' }}>
              {formatDate(dbStats?.last_backup)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={runMaintenance}
            disabled={maintenanceRunning}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: maintenanceRunning ? '#6c757d' : '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: maintenanceRunning ? 'not-allowed' : 'pointer' 
            }}
          >
            {maintenanceRunning ? 'Running Maintenance...' : 'Run Database Maintenance'}
          </button>
          <button 
            onClick={runManualBackup}
            disabled={backupRunning}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: backupRunning ? '#6c757d' : '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: backupRunning ? 'not-allowed' : 'pointer' 
            }}
          >
            {backupRunning ? 'Creating Backup...' : 'Create Manual Backup'}
          </button>
          <button 
            onClick={() => setShowScheduleForm(true)}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Create Backup Schedule
          </button>
        </div>
      </div>

      {/* Backup Schedule Form */}
      {showScheduleForm && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Create Backup Schedule</h3>
          <form onSubmit={createSchedule}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label>Schedule Name *</label>
                <input
                  type="text"
                  value={scheduleForm.schedule_name}
                  onChange={(e) => setScheduleForm({...scheduleForm, schedule_name: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label>Schedule Type *</label>
                <select
                  value={scheduleForm.schedule_type}
                  onChange={(e) => setScheduleForm({...scheduleForm, schedule_type: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label>Time (24hr) *</label>
                <input
                  type="time"
                  value={scheduleForm.schedule_time}
                  onChange={(e) => setScheduleForm({...scheduleForm, schedule_time: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              {scheduleForm.schedule_type === 'weekly' && (
                <div>
                  <label>Day of Week *</label>
                  <select
                    value={scheduleForm.schedule_day_of_week}
                    onChange={(e) => setScheduleForm({...scheduleForm, schedule_day_of_week: parseInt(e.target.value)})}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
              )}
              {scheduleForm.schedule_type === 'monthly' && (
                <div>
                  <label>Day of Month *</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={scheduleForm.schedule_day_of_month}
                    onChange={(e) => setScheduleForm({...scheduleForm, schedule_day_of_month: parseInt(e.target.value)})}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
              )}
              <div>
                <label>Retention Days *</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={scheduleForm.retention_days}
                  onChange={(e) => setScheduleForm({...scheduleForm, retention_days: parseInt(e.target.value)})}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}>
                Create Schedule
              </button>
              <button type="button" onClick={() => setShowScheduleForm(false)} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Backup Schedules */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>Backup Schedules</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Schedule</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Retention</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backupSchedules.map(schedule => (
                <tr key={schedule.schedule_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>{schedule.schedule_name}</td>
                  <td style={{ padding: '12px' }}>{schedule.schedule_type}</td>
                  <td style={{ padding: '12px' }}>
                    {schedule.schedule_time}
                    {schedule.schedule_type === 'weekly' && ` (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][schedule.schedule_day_of_week]})`}
                    {schedule.schedule_type === 'monthly' && ` (Day ${schedule.schedule_day_of_month})`}
                  </td>
                  <td style={{ padding: '12px' }}>{schedule.retention_days} days</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ 
                      color: schedule.is_active ? '#28a745' : '#dc3545',
                      fontWeight: 'bold' 
                    }}>
                      {schedule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      onClick={() => toggleSchedule(schedule)}
                      style={{ 
                        marginRight: '5px', 
                        padding: '5px 10px', 
                        backgroundColor: schedule.is_active ? '#dc3545' : '#28a745', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '3px', 
                        cursor: 'pointer', 
                        fontSize: '0.875rem' 
                      }}
                    >
                      {schedule.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button 
                      onClick={() => deleteSchedule(schedule.schedule_id, schedule.schedule_name)}
                      style={{ 
                        padding: '5px 10px', 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '3px', 
                        cursor: 'pointer', 
                        fontSize: '0.875rem' 
                      }}
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

      {/* Backup History */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>Backup History</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Backup Name</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Size</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Created</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backupHistory.map(backup => (
                <tr key={backup.backup_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>{backup.backup_name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '3px 8px', 
                      borderRadius: '3px', 
                      backgroundColor: backup.backup_type === 'manual' ? '#007bff' : '#17a2b8',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}>
                      {backup.backup_type}
                    </span>
                    {backup.schedule_name && <span style={{ marginLeft: '5px', color: '#6c757d', fontSize: '0.875rem' }}>({backup.schedule_name})</span>}
                  </td>
                  <td style={{ padding: '12px' }}>{formatBytes(backup.backup_size)}</td>
                  <td style={{ padding: '12px' }}>{formatDate(backup.created_date)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ 
                      color: backup.status === 'completed' ? '#28a745' : backup.status === 'failed' ? '#dc3545' : '#ffc107',
                      fontWeight: 'bold' 
                    }}>
                      {backup.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {backup.status === 'completed' && (
                      <button 
                        onClick={() => restoreBackup(backup.backup_id, backup.backup_name)}
                        style={{ 
                          padding: '5px 10px', 
                          backgroundColor: '#dc3545', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '3px', 
                          cursor: 'pointer', 
                          fontSize: '0.875rem' 
                        }}
                      >
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Tasks;