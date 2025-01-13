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

  // Example combined logs from each task (optional approach).
  // In a simple approach, each task can render its own log if showLog=true,
  // so you might not need a combined log state here. This is just a placeholder.
  const [combinedLogs, setCombinedLogs] = useState([]);

  // In a real scenario, you’d pass each task a callback to push logs here, e.g.:
  //   onLogEntry={(entry) => setCombinedLogs((prev) => [...prev, entry])}

  // -------------------------
  // 2) LAYOUT (TOP-LEFT: Monitoring, BOTTOM-LEFT: Comms, BOTTOM: Logs)
  // -------------------------
  // A simple approach: use CSS grid or flexbox.
  // Here is a grid example with 3 rows: 
  //   Row1: Monitoring 
  //   Row2: Communications 
  //   Row3: Shared logs

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'auto auto 1fr', // 2 fixed rows + 1 flexible row
        gridTemplateColumns: '1fr',
        height: '100vh',  // optional if you want a full-page layout
        gap: '1rem',
        padding: '1rem'
      }}
    >
      {/* MONITORING TASK (top-left) */}
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
          // onLogEntry={(entry) => setCombinedLogs((prev) => [...prev, entry])}
        />
      </div>

      {/* COMMUNICATIONS TASK (bottom-left) */}
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
          // onLogEntry={(entry) => setCombinedLogs((prev) => [...prev, entry])}
        />
      </div>

      {/* COMBINED LOGS AT THE BOTTOM (optional) */}
      <div style={{ border: '1px solid #ccc', padding: '1rem', overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>All Logs</h2>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {combinedLogs.map((entry, i) => (
            <div key={i} style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              <strong>{entry.timestamp}</strong> - {entry.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
