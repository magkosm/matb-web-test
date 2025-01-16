// src/App.js
import React, { useState, useCallback, useRef } from 'react';
import MonitoringTask from './MonitoringTask';
import CommunicationsTask from './CommunicationsTask';
import ResourceManagementTask from './ResourceManagementTask';
import TrackingTask from './TrackingTask';
import SystemHealth from './components/SystemHealth';
import './App.css';

function App() {
  // -------------------------
  // 1) STATE & HANDLERS
  // -------------------------

  // Monitoring Task controls
  const [monitoringEPM, setMonitoringEPM] = useState(3);
  const [showMonitoringLog, setShowMonitoringLog] = useState(false);

  // Communications Task controls
  const [commEPM, setCommEPM] = useState(2);
  const [showCommLog, setShowCommLog] = useState(false);
  const [isCommTaskEnabled, setIsCommTaskEnabled] = useState(true);

  // Sidebar control for All Logs
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [combinedLogs] = useState([]);
  const [monitoringEventLog, setMonitoringEventLog] = useState([]);
  const [commEventLog, setCommEventLog] = useState([]);

  // Resource Management controls
  const [resourceEPM, setResourceEPM] = useState(2);
  const [resourceDifficulty, setResourceDifficulty] = useState(5);
  const [showResourceLog, setShowResourceLog] = useState(false);
  const [resourceEventLog, setResourceEventLog] = useState([]);

  // Tracking Task controls
  const [trackingEPM, setTrackingEPM] = useState(2);
  const [showTrackingLog, setShowTrackingLog] = useState(false);
  const [trackingEventLog, setTrackingEventLog] = useState([]);

  // Add tracking state if not already present
  const [isTrackingManual, setIsTrackingManual] = useState(false);
  const [isInBox, setIsInBox] = useState(false);

  // Add state for Resource Management task
  const [isResourceTaskEnabled, setIsResourceTaskEnabled] = useState(true);

  // Custom handler to append Tracking logs
  const handleTrackingLogUpdate = useCallback((newEntry) => {
    setTrackingEventLog(prevLog => [...prevLog, newEntry]);
    // console.log('App.js: Appended new tracking log entry', newEntry);
  }, []);

  // **Custom handler to append Resource Management logs**
  const handleResourceLogUpdate = useCallback((newEntry) => {
    setResourceEventLog(prevLog => Array.isArray(prevLog) ? [...prevLog, newEntry] : [newEntry]);
  }, []);

  // In the Communications Task render section:
  const [commMetrics, setCommMetrics] = useState({ healthImpact: 0, systemLoad: 0 });

  // Add refs at the top of App component
  const commTaskRef = useRef(null);
  const resourceTaskRef = useRef(null);

  // -------------------------
  // 2) LAYOUT (MAIN + SIDEBAR)
  // -------------------------

  const [resourceMetrics, setResourceMetrics] = useState(ResourceManagementTask.getDefaultMetrics());

  // Add console log to verify metrics updates
  const handleResourceMetricsUpdate = (metrics) => {
    //console.log('App receiving resource metrics:', metrics);
    setResourceMetrics(metrics);
  };

  return (
    <div className="app-container" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* MAIN CONTENT */}
      <div className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gridTemplateRows: '1fr 1fr',
          gap: '1rem',
          height: '100vh',
          padding: '5%',
          boxSizing: 'border-box'
        }}>
          {/* Top Left - System Monitoring */}
          <div style={{ 
            gridColumn: '1 / span 2',
            gridRow: '1',
            border: '1px solid #ccc',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <MonitoringTask
              eventsPerMinute={monitoringEPM}
              showLog={showMonitoringLog}
              onLogUpdate={setMonitoringEventLog}
            />
          </div>

          {/* Top Middle - Tracking Task */}
          <div style={{ 
            gridColumn: '3 / span 3',
            gridRow: '1',
            border: '1px solid #ccc',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <TrackingTask
              eventsPerMinute={trackingEPM}
              showLog={showTrackingLog}
              onLogUpdate={handleTrackingLogUpdate}
              onStatusUpdate={({ isManual, isInBox }) => {
                setIsTrackingManual(isManual);
                setIsInBox(isInBox);
              }}
            />
          </div>

          {/* Top Right - System Health */}
          <div style={{ 
            gridColumn: '6',
            gridRow: '1',
            border: '1px solid #ccc',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <SystemHealth
              monitoringLogs={monitoringEventLog}
              resourceLogs={resourceEventLog}
              commLogs={commEventLog}
              trackingLogs={trackingEventLog}
              isTrackingManual={isTrackingManual}
              isInBox={isInBox}
              commMetrics={commMetrics}
              resourceMetrics={resourceMetrics}
            />
          </div>

          {/* Bottom Left - Communications Task */}
          <div style={{ 
            gridColumn: '1 / span 2',
            gridRow: '2',
            border: '1px solid #ccc',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {isCommTaskEnabled ? (
              <CommunicationsTask
                ref={commTaskRef}
                eventsPerMinute={commEPM}
                showLog={showCommLog}
                onLogUpdate={setCommEventLog}
                onMetricsUpdate={setCommMetrics}
              />
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f5f5f5',
                color: '#666'
              }}>
                Communications Task Disabled
              </div>
            )}
          </div>

          {/* Resource Management */}
          <div style={{ 
            gridColumn: '3 / span 4',
            gridRow: '2',
            border: '1px solid #ccc',
            overflow: 'hidden'
          }}>
            <ResourceManagementTask
              ref={resourceTaskRef}
              eventsPerMinute={resourceEPM}
              difficulty={resourceDifficulty}
              showLog={showResourceLog}
              onLogUpdate={setResourceEventLog}
              onMetricsUpdate={handleResourceMetricsUpdate}
              isEnabled={isResourceTaskEnabled}
            />
          </div>
        </div>
      </div>

      {/* SIDEBAR */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          {/* Settings Section */}
          <div className="settings-section">
            <h2 style={{ marginTop: 0 }}>Settings</h2>
            
            {/* Monitoring Settings */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Monitoring Task</h3>
              <div style={{ marginBottom: '0.5rem' }}>
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
              </div>
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={showMonitoringLog}
                    onChange={() => setShowMonitoringLog(!showMonitoringLog)}
                  />
                  &nbsp;Show Log
                </label>
              </div>
            </div>

            {/* Communications Settings */}
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Communications Task</h3>
              <div style={{ marginBottom: '0.5rem' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={isCommTaskEnabled}
                    onChange={() => setIsCommTaskEnabled(!isCommTaskEnabled)}
                  />
                  &nbsp;Task Enabled
                </label>
              </div>
              {isCommTaskEnabled && (
                <>
                  <div style={{ marginBottom: '0.5rem' }}>
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
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={showCommLog}
                        onChange={() => setShowCommLog(!showCommLog)}
                      />
                      &nbsp;Show Log
                    </label>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <button
                      onClick={() => commTaskRef.current?.resetTask()}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Reset Task
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Tracking Settings */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Tracking Task</h3>
              <div style={{ marginBottom: '0.5rem' }}>
                <label>
                  Events/Minute:&nbsp;
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={trackingEPM}
                    onChange={(e) => setTrackingEPM(+e.target.value)}
                    style={{ width: '60px' }}
                  />
                </label>
              </div>
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={showTrackingLog}
                    onChange={() => setShowTrackingLog(!showTrackingLog)}
                  />
                  &nbsp;Show Log
                </label>
              </div>
            </div>

            {/* Resource Management Settings */}
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Resource Management</h3>
              <div style={{ marginBottom: '0.5rem' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={isResourceTaskEnabled}
                    onChange={() => setIsResourceTaskEnabled(!isResourceTaskEnabled)}
                  />
                  &nbsp;Task Enabled
                </label>
              </div>
              {isResourceTaskEnabled && (
                <>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label>
                      Events/Minute:&nbsp;
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={resourceEPM}
                        onChange={(e) => setResourceEPM(+e.target.value)}
                        style={{ width: '60px' }}
                      />
                    </label>
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label>
                      Difficulty:&nbsp;
                      <input
                        type="range"
                        min={0}
                        max={10}
                        value={resourceDifficulty}
                        onChange={(e) => setResourceDifficulty(+e.target.value)}
                        style={{ width: '100px' }}
                      />
                      &nbsp;{resourceDifficulty}
                    </label>
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={showResourceLog}
                        onChange={() => setShowResourceLog(!showResourceLog)}
                      />
                      &nbsp;Show Log
                    </label>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <button
                      onClick={() => resourceTaskRef.current?.resetTask()}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Reset Task
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Logs Section */}
          <div className="logs-section">
            {showMonitoringLog && (
              <div>
                <h3>Monitoring Log</h3>
                <MonitoringTask.Log eventLog={monitoringEventLog} />
              </div>
            )}
            {showCommLog && (
              <div>
                <h3>Communications Log</h3>
                <CommunicationsTask.Log commLog={commEventLog} />
              </div>
            )}
            {showTrackingLog && (
              <div className="log-section">
                <h3>Tracking Log</h3>
                <TrackingTask.Log trackingLog={trackingEventLog} />
              </div>
            )}
            {showResourceLog && (
              <div className="log-section">
                <h3>Resource Management Log</h3>
                <ResourceManagementTask.Log resourceLog={resourceEventLog} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        className="toggle-button"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? 'Close Settings' : 'Open Settings'}
      </button>
    </div>
  );
}

export default App;
