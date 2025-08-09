import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProgressModal = ({ taskId, title, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!taskId) return;

    const pollProgress = async () => {
      try {
        const response = await axios.get(`/api/tasks/progress/${taskId}`);
        const data = response.data;
        
        setProgress(data.progress);
        setLogs(data.logs);
        
        if (data.completed) {
          setIsComplete(true);
          if (data.progress === -1) {
            setError('Task failed');
          }
        }
      } catch (err) {
        console.error('Error fetching progress:', err);
      }
    };

    // Poll every 500ms until complete
    const interval = setInterval(() => {
      pollProgress();
    }, 500);

    // Initial poll
    pollProgress();

    return () => clearInterval(interval);
  }, [taskId]);

  return (
    <div className="modal-overlay">
      <div className="modal-content progress-modal">
        <h2>{title}</h2>
        
        <div className="progress-container">
          <div 
            className="progress-bar"
            style={{ 
              width: `${Math.max(0, Math.min(100, progress))}%`,
              backgroundColor: error ? '#dc3545' : (isComplete ? '#28a745' : '#007bff')
            }}
          >
            {progress > 0 && progress <= 100 && `${progress}%`}
          </div>
        </div>

        <div className="progress-logs">
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="log-time">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
        </div>

        {isComplete && (
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default ProgressModal;
