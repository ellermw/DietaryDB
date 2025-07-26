import React, { useState, useEffect } from 'react';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    table: '',
    user: '',
    action: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filters, pagination.page]);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      const response = await fetch(`http://localhost:3000/api/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      setLogs(data.logs || []);
      setPagination({
        ...pagination,
        total: data.total,
        pages: data.pages
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/audit-logs/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const getActionColor = (action) => {
    const colors = {
      'INSERT': { bg: '#e8f5e9', color: '#388e3c' },
      'UPDATE': { bg: '#fff3e0', color: '#f57c00' },
      'DELETE': { bg: '#ffebee', color: '#d32f2f' },
      'LOGIN': { bg: '#e3f2fd', color: '#1976d2' },
      'LOGOUT': { bg: '#f3e5f5', color: '#7b1fa2' },
      'PASSWORD_CHANGE': { bg: '#fce4ec', color: '#c2185b' },
      'BACKUP_CREATE': { bg: '#e0f2f1', color: '#00897b' },
      'BACKUP_RESTORE': { bg: '#fff9c4', color: '#f9a825' }
    };
    return colors[action] || { bg: '#f5f5f5', color: '#666' };
  };

  const LogDetails = ({ log }) => {
    const hasChanges = log.old_values || log.new_values;
    
    return (
      <div style={{
        margin: '1rem 0',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        fontSize: '0.875rem'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0' }}>Change Details</h4>
        
        {log.old_values && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Old Values:</strong>
            <pre style={{
              margin: '0.25rem 0',
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.75rem'
            }}>
              {JSON.stringify(log.old_values, null, 2)}
            </pre>
          </div>
        )}
        
        {log.new_values && (
          <div>
            <strong>New Values:</strong>
            <pre style={{
              margin: '0.25rem 0',
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.75rem'
            }}>
              {JSON.stringify(log.new_values, null, 2)}
            </pre>
          </div>
        )}
        
        {!hasChanges && (
          <p style={{ margin: 0, color: '#666' }}>No additional details available</p>
        )}
      </div>
    );
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
        <h1 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>Audit Logs</h1>
        <p style={{ margin: 0, color: '#7f8c8d' }}>
          View system activity and track changes
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#7f8c8d' }}>
              Total Actions
            </h3>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
              {stats.total_actions?.toLocaleString()}
            </p>
          </div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#7f8c8d' }}>
              Actions Today
            </h3>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#2ecc71' }}>
              {stats.actions_today}
            </p>
          </div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#7f8c8d' }}>
              Unique Users
            </h3>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>
              {stats.unique_users}
            </p>
          </div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#7f8c8d' }}>
              Most Active Table
            </h3>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#e74c3c' }}>
              {stats.most_active_table || '-'}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0'
      }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#2c3e50' }}>
          Filters
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Table
            </label>
            <select
              name="table"
              value={filters.table}
              onChange={handleFilterChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            >
              <option value="">All Tables</option>
              <option value="users">Users</option>
              <option value="items">Items</option>
              <option value="categories">Categories</option>
              <option value="patient_info">Patients</option>
              <option value="meal_orders">Orders</option>
              <option value="system">System</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              User
            </label>
            <input
              type="text"
              name="user"
              value={filters.user}
              onChange={handleFilterChange}
              placeholder="Username"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Action
            </label>
            <select
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            >
              <option value="">All Actions</option>
              <option value="INSERT">Insert</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="PASSWORD_CHANGE">Password Change</option>
              <option value="BACKUP_CREATE">Backup Create</option>
              <option value="BACKUP_RESTORE">Backup Restore</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Start Date
            </label>
            <input
              type="datetime-local"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              End Date
            </label>
            <input
              type="datetime-local"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => {
                setFilters({
                  table: '',
                  user: '',
                  action: '',
                  startDate: '',
                  endDate: ''
                });
                setPagination({ ...pagination, page: 1 });
              }}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>
            Audit Log Entries
          </h2>
          <span style={{ color: '#7f8c8d', fontSize: '0.875rem' }}>
            Showing {logs.length} of {pagination.total} entries
          </span>
        </div>

        {logs.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                  Time
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                  Table
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                  Action
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                  User
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                  Record ID
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actionStyle = getActionColor(log.action);
                const isExpanded = expandedLog === log.audit_id;

                return (
                  <React.Fragment key={log.audit_id}>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        {formatDate(log.change_date)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem'
                        }}>
                          {log.table_name}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          backgroundColor: actionStyle.bg,
                          color: actionStyle.color,
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        {log.changed_by}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                        {log.record_id || '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={() => setExpandedLog(isExpanded ? null : log.audit_id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          {isExpanded ? 'Hide' : 'Show'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="6" style={{ padding: 0 }}>
                          <LogDetails log={log} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
            No audit logs found matching your filters.
          </p>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{
            padding: '1rem',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <button
              onClick={() => handlePageChange(1)}
              disabled={pagination.page === 1}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                opacity: pagination.page === 1 ? 0.5 : 1
              }}
            >
              First
            </button>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                opacity: pagination.page === 1 ? 0.5 : 1
              }}
            >
              Previous
            </button>
            <span style={{
              padding: '0.5rem 1rem',
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.875rem'
            }}>
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer',
                opacity: pagination.page === pagination.pages ? 0.5 : 1
              }}
            >
              Next
            </button>
            <button
              onClick={() => handlePageChange(pagination.pages)}
              disabled={pagination.page === pagination.pages}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer',
                opacity: pagination.page === pagination.pages ? 0.5 : 1
              }}
            >
              Last
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLogs;