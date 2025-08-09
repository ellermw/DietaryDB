import React, { useState } from 'react';
import axios from '../api/axios';

const RestoreModal = ({ isOpen, onClose, onRestore, existingBackup }) => {
  const [file, setFile] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.sql')) {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid SQL backup file');
      setFile(null);
    }
  };

  const handleRestore = async () => {
    if (!existingBackup && !file) {
      setError('Please select a backup file');
      return;
    }

    setIsRestoring(true);
    setError('');

    try {
      if (existingBackup) {
        // Restore from existing backup
        await axios.post(`/api/tasks/backup/restore/${existingBackup}`);
      } else {
        // Restore from uploaded file
        const formData = new FormData();
        formData.append('backup_file', file);

        await axios.post('/api/tasks/backup/restore', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      alert('Database restored successfully! The application will reload.');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore backup');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Restore Database</h2>
        {existingBackup ? (
          <p>Restore database from: <strong>{existingBackup}</strong></p>
        ) : (
          <div className="form-group">
            <label>Upload Backup File</label>
            <input
              type="file"
              accept=".sql"
              onChange={handleFileChange}
              disabled={isRestoring}
            />
            {file && <p>Selected: {file.name}</p>}
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="modal-actions">
          <button
            onClick={handleRestore}
            disabled={isRestoring || (!existingBackup && !file)}
            className="btn btn-primary"
          >
            {isRestoring ? 'Restoring...' : 'Restore'}
          </button>
          <button
            onClick={onClose}
            disabled={isRestoring}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
        
        <div className="warning-message">
          <strong>Warning:</strong> Restoring a backup will replace all current data.
          A backup of the current database will be created before restoration.
        </div>
      </div>
      
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }
        
        .form-group input[type="file"] {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .error-message {
          color: #dc3545;
          margin: 1rem 0;
          padding: 0.5rem;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
        }
        
        .warning-message {
          color: #856404;
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: #fff3cd;
          border: 1px solid #ffeeba;
          border-radius: 4px;
        }
        
        .modal-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .btn-primary {
          background-color: #007bff;
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
        }
        
        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover:not(:disabled) {
          background-color: #545b62;
        }
      `}</style>
    </div>
  );
};

export default RestoreModal;
