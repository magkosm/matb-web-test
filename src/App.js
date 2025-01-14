// src/App.js
import React, { useState } from 'react';
import MonitoringTask from './MonitoringTask';
import CommunicationsTask from './CommunicationsTask';

function App() {
  // -------------------------
  // 1) STATE & HANDLERS
  // -------------------------

  // Monitoring Task controls
  const [monitoringEPM, setMonitoringEPM] = useState(3);
  const [showMonitoringLog, setShowMonitoringLog] = useState(true);

  // Communications Task controls
  const [commEPM, setCommEPM] = useState(2);
  const [showCommLog, setShowCommLog] = useState(true);

  // Sidebar control for All Logs
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [combinedLogs] = useState([]);

  // -------------------------
  // 2) LAYOUT (MAIN + SIDEBAR)
  // -------------------------
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', flexDirection: 'column' }}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          padding: '0.5rem 1rem',
          backgroundColor: '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        {isSidebarOpen ? 'Close Logs' : 'Open Logs'}
      </button>

      {/* MAIN CONTENT */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr',
          gap: '1rem',
          padding: '1rem',
          width: isSidebarOpen ? 'calc(100% - 50%)' : '100%',
          transition: 'width 0.3s ease',
        }}
      >
        {/* MONITORING TASK */}
        <div style={{ border: '1px solid #ccc', padding: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Monitoring Task</h2>

          {/* EPM & Show Log Toggles */}
          <div style={{ marginBottom: '1rem' }}>
            <label>
              Events/Minute:&nbsp;
              <input
                type="number"
                min={1}
                max={20}
                value={monitoringEPM}
                onChange={(e) => setMonitoringEPM(+e.target.value)}
                style={{ width: '60px' }}
              />
            </label>
            &nbsp;&nbsp;
            <label>
              <input
                type="checkbox"
                checked={showMonitoringLog}
                onChange={() => setShowMonitoringLog(!showMonitoringLog)}
              />
              &nbsp;Show Monitoring Log
            </label>
          </div>

          {/* Render the MonitoringTask */}
          <MonitoringTask
            eventsPerMinute={monitoringEPM}
            showLog={showMonitoringLog}
          />
        </div>

        {/* COMMUNICATIONS TASK */}
        <div style={{ border: '1px solid #ccc', padding: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Communications Task</h2>

          {/* EPM & Show Log Toggles */}
          <div style={{ marginBottom: '1rem' }}>
            <label>
              Events/Minute:&nbsp;
              <input
                type="number"
                min={1}
                max={20}
                value={commEPM}
                onChange={(e) => setCommEPM(+e.target.value)}
                style={{ width: '60px' }}
              />
            </label>
            &nbsp;&nbsp;
            <label>
              <input
                type="checkbox"
                checked={showCommLog}
                onChange={() => setShowCommLog(!showCommLog)}
              />
              &nbsp;Show Comm Log
            </label>
          </div>

          {/* Render the CommunicationsTask */}
          <CommunicationsTask
            eventsPerMinute={commEPM}
            showLog={showCommLog}
          />
        </div>
      </div>

      {/* SIDEBAR FOR ALL LOGS */}
      <div
        style={{
          width: isSidebarOpen ? '50%' : '0',
          maxWidth: '50%',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          borderLeft: '1px solid #ccc',
          backgroundColor: '#f9f9f9',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isSidebarOpen && (
          <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
            <h2 style={{ marginTop: 0 }}>All Logs</h2>
            <div>
              {combinedLogs.length > 0 ? (
                combinedLogs.map((entry, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <strong>{entry.timestamp}</strong> - {entry.message}
                  </div>
                ))
              ) : (
                <p>No logs available</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
