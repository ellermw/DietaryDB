import React, { useState, useEffect } from 'react';

function BackupRestore() {
  const [backups, setBackups] = useState([]);
  const [schedule, setSchedule] = useState({
    enabled: false,
    frequency: 'daily',
    time: '02:00',
    retention_days: 30
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    fetchBackupData();
  }, []);

  const fetchBackupData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch backup status
      const backupRes = await fetch('http://localhost:3000/api/backup/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const backupData = await backupRes.json();
      setBackups(backupData.backups || []);

      // Fetch schedule
      const scheduleRes = await fetch('http://localhost:3000/api/backup/schedule', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const scheduleData = await scheduleRes.json();
      setSchedule(scheduleData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching backup data:', error);
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!window.confirm('Create a new backup now?')) return;
    
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/backup/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchBackupData();
        alert('Backup created successfully!');
      } else {
        alert('Failed to create backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Failed to create backup');
    }
    setCreating(false);
  };

  const handleRestoreBackup = async (filename) => {
    if (!window.confirm(`Are you sure you want to restore from ${filename}? This will overwrite current data!`)) {
      return;
    }

    setRestoring(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/backup/restore', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename })
      });

      if (response.ok) {
        alert('Backup restored successfully!');
      } else {
        alert('Failed to restore backup');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Failed to restore backup');
    }
    setRestoring(false);
  };

  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`Delete backup ${filename}?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/backup/${filename}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchBackupData();
      } else {
        alert('Failed to delete backup');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      alert('Failed to delete backup');
    }
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedSchedule = {
      enabled: formData.get('enabled') === 'on',
      frequency: formData.get('frequency'),
      time: formData.get('time'),
      retention_days: parseInt(formData.get('retention_days'))
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/backup/schedule', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSchedule)
      });

      if (response.ok) {
        setSchedule(updatedSchedule);
        alert('Schedule updated successfully!');
      } else {
        alert('Failed to update schedule');
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Failed to update schedule');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>Backup & Restore</h1>
        <p style={{ margin: 0, color: '#7f8c8d' }}>
          Manage database backups and restore points
        </p>
      </div>

      {/* Backup Actions */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0'
      }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#2c3e50' }}>
          Backup Actions
        </h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: creating ? '#95a5a6' : '#2ecc71',
              color: 'white',
              cursor: creating ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {creating ? 'Creating...' : '💾 Create Backup Now'}
          </button>
          <span style={{ color: '#7f8c8d', fontSize: '0.875rem' }}>
            Last backup: {backups.length > 0 ? formatDate(backups[0].created) : 'Never'}
          </span>
        </div>
      </div>

      {/* Backup Schedule */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0'
      }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#2c3e50' }}>
          Automatic Backup Schedule
        </h2>
        <form onSubmit={handleUpdateSchedule}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={schedule.enabled}
                />
                <span style={{ fontWeight: '500' }}>Enable Automatic Backups</span>
              </label>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Frequency
              </label>
              <select
                name="frequency"
                defaultValue={schedule.frequency}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Time (24-hour format)
              </label>
              <input
                type="time"
                name="time"
                defaultValue={schedule.time}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Retention Days
              </label>
              <input
                type="number"
                name="retention_days"
                defaultValue={schedule.retention_days}
                min="1"
                max="365"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1.5rem',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#3498db',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Update Schedule
          </button>
        </form>
      </div>

      {/* Existing Backups */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0'
      }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#2c3e50' }}>
          Available Backups ({backups.length})
        </h2>
        
        {backups.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#7f8c8d', fontSize: '0.875rem' }}>
                    Filename
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#7f8c8d', fontSize: '0.875rem' }}>
                    Size
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#7f8c8d', fontSize: '0.875rem' }}>
                    Created
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', color: '#7f8c8d', fontSize: '0.875rem' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup, index) => (
                  <tr key={backup.filename} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {backup.filename}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                      {formatBytes(backup.size)}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                      {formatDate(backup.created)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRestoreBackup(backup.filename)}
                        disabled={restoring}
                        style={{
                          padding: '0.25rem 0.5rem',
                          marginRight: '0.5rem',
                          border: '1px solid #f39c12',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          color: '#f39c12',
                          cursor: restoring ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        {restoring ? 'Restoring...' : 'Restore'}
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.filename)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          border: '1px solid #e74c3c',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          color: '#e74c3c',
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
        ) : (
          <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '2rem 0' }}>
            No backups available. Create your first backup using the button above.
          </p>
        )}
      </div>

      {/* Warning Notice */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '4px'
      }}>
        <p style={{ margin: 0, color: '#856404' }}>
          <strong>⚠️ Important:</strong> Restoring a backup will replace all current data. 
          Always create a new backup before restoring an old one. Automated backups help protect against data loss.
        </p>
      </div>
    </div>
  );
}

export default BackupRestore;