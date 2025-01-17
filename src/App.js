// src/App.js
import React, { useState, useCallback, useRef, useEffect } from 'react';
import MonitoringTask from './MonitoringTask';
import CommunicationsTask from './CommunicationsTask';
import ResourceManagementTask from './ResourceManagementTask';
import TrackingTask from './TrackingTask';
import SystemHealth from './components/SystemHealth';
import WelcomeScreen from './components/WelcomeScreen';
import NormalMode from './components/NormalMode';
import InfiniteMode from './components/InfiniteMode';
import Leaderboard from './components/Leaderboard';
import './App.css';

function App() {
  // Add game mode state
  const [gameMode, setGameMode] = useState(null);
  const systemHealthRef = useRef(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState(null);
  const [currentScore, setCurrentScore] = useState(null);
  const [isNewScore, setIsNewScore] = useState(false);

  // Initialize with reasonable defaults
  const [monitoringEPM, setMonitoringEPM] = useState(2);
  const [commEPM, setCommEPM] = useState(2);
  const [resourceEPM, setResourceEPM] = useState(2);
  const [trackingEPM, setTrackingEPM] = useState(2);
  const [trackingDifficulty, setTrackingDifficulty] = useState(5);
  const [resourceDifficulty, setResourceDifficulty] = useState(5);

  // Mode selection handler - updates the settings panel values
  const handleModeSelect = (mode) => {
    // First set the game mode
    setGameMode(mode);
    
    // Update settings panel based on mode
    const settingsPanel = document.querySelector('.settings-section');
    if (settingsPanel) {
      const inputs = settingsPanel.querySelectorAll('input[type="number"], input[type="range"]');
      
      inputs.forEach(input => {
        const name = input.parentElement.textContent.toLowerCase();
        let value;

        switch (mode) {
          case 'training':
            value = name.includes('difficulty') ? 3 : 1;
            break;
          case 'normal':
            // Start with training mode settings for normal mode
            value = name.includes('difficulty') ? 3 : 1;
            break;
          case 'infinite':
            value = name.includes('difficulty') ? 7 : 
                   name.includes('monitoring') ? 4 : 3;
            break;
          default:
            return;
        }

        // Update the input value and trigger change event
        input.value = value;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
  };

  // Handle game end for both modes
  const handleGameEnd = (score, mode) => {
    setCurrentScore(score);
    setLeaderboardMode(mode);
    setIsNewScore(true);
    setShowLeaderboard(true);
  };

  // Update settings handler for infinite mode
  const handleUpdateSettings = (settings) => {
    if (settings.monitoringEPM !== undefined) setMonitoringEPM(settings.monitoringEPM);
    if (settings.commEPM !== undefined) setCommEPM(settings.commEPM);
    if (settings.resourceEPM !== undefined) setResourceEPM(settings.resourceEPM);
    if (settings.trackingEPM !== undefined) setTrackingEPM(settings.trackingEPM);
    if (settings.trackingDifficulty !== undefined) setTrackingDifficulty(settings.trackingDifficulty);
    if (settings.resourceDifficulty !== undefined) setResourceDifficulty(settings.resourceDifficulty);
  };

  // Add effect to reset tasks when game mode changes and components are mounted
  useEffect(() => {
    if (gameMode) {
      // Reset all tasks using optional chaining
      monitoringTaskRef.current?.resetTask();
      commTaskRef.current?.resetTask();
      resourceTaskRef.current?.resetTask();
      trackingTaskRef.current?.resetTask();

      // Reset all event logs
      setMonitoringEventLog([]);
      setCommEventLog([]);
      setResourceEventLog([]);
      setTrackingEventLog([]);

      // Reset metrics
      setMonitoringMetrics({ healthImpact: 0, systemLoad: 0 });
      setCommMetrics({ healthImpact: 0, systemLoad: 0 });
      setResourceMetrics(ResourceManagementTask.getDefaultMetrics());
      setTrackingMetrics(TrackingTask.getDefaultMetrics());
    }
  }, [gameMode]); // Run this effect when gameMode changes

  // -------------------------
  // 1) STATE & HANDLERS
  // -------------------------

  // Monitoring Task controls
  const [showMonitoringLog, setShowMonitoringLog] = useState(false);

  // Communications Task controls
  const [showCommLog, setShowCommLog] = useState(false);
  const [isCommTaskEnabled, setIsCommTaskEnabled] = useState(true);

  // Sidebar control for All Logs
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [combinedLogs] = useState([]);
  const [monitoringEventLog, setMonitoringEventLog] = useState([]);
  const [commEventLog, setCommEventLog] = useState([]);

  // Resource Management controls
  const [showResourceLog, setShowResourceLog] = useState(false);
  const [resourceEventLog, setResourceEventLog] = useState([]);

  // Tracking Task controls
  const [showTrackingLog, setShowTrackingLog] = useState(false);
  const [trackingEventLog, setTrackingEventLog] = useState([]);

  // Add tracking state if not already present
  const [isTrackingManual, setIsTrackingManual] = useState(false);
  const [isInBox, setIsInBox] = useState(false);

  // Add state for Resource Management task
  const [isResourceTaskEnabled, setIsResourceTaskEnabled] = useState(true);

  // Add new state for monitoring task enabled/disabled
  const [isMonitoringTaskEnabled, setIsMonitoringTaskEnabled] = useState(true);

  // Add new state for tracking task enabled/disabled
  const [isTrackingTaskEnabled, setIsTrackingTaskEnabled] = useState(true);

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

  // Add ref for monitoring task
  const monitoringTaskRef = useRef(null);

  // Add ref for tracking task
  const trackingTaskRef = useRef(null);

  // -------------------------
  // 2) LAYOUT (MAIN + SIDEBAR)
  // -------------------------

  const [resourceMetrics, setResourceMetrics] = useState(ResourceManagementTask.getDefaultMetrics());

  // Add console log to verify metrics updates
  const handleResourceMetricsUpdate = (metrics) => {
    //console.log('App receiving resource metrics:', metrics);
    setResourceMetrics(metrics);
  };

  // Add state for monitoring metrics
  const [monitoringMetrics, setMonitoringMetrics] = useState({
    healthImpact: 0,
    systemLoad: 0
  });

  // Add with other state declarations (around line 20-30)
  const [trackingMetrics, setTrackingMetrics] = useState(TrackingTask.getDefaultMetrics());

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Check for Ctrl + Q
      if (event.ctrlKey && event.key.toLowerCase() === 'q') {
        // Reset all tasks using optional chaining
        monitoringTaskRef.current?.resetTask();
        commTaskRef.current?.resetTask();
        resourceTaskRef.current?.resetTask();
        trackingTaskRef.current?.resetTask();

        // Reset all event logs
        setMonitoringEventLog([]);
        setCommEventLog([]);
        setResourceEventLog([]);
        setTrackingEventLog([]);

        // Reset metrics
        setMonitoringMetrics({ healthImpact: 0, systemLoad: 0 });
        setCommMetrics({ healthImpact: 0, systemLoad: 0 });
        setResourceMetrics(ResourceManagementTask.getDefaultMetrics());
        setTrackingMetrics(TrackingTask.getDefaultMetrics());

        // Return to welcome screen
        setGameMode(null);
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyPress);

    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []); // Empty dependency array since we don't need to recreate the listener

  // If no game mode is selected, show welcome screen
  if (!gameMode) {
    return <WelcomeScreen onModeSelect={handleModeSelect} />;
  }

  return (
    <div className="app-container" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Show welcome screen if no mode selected */}
      {!gameMode && <WelcomeScreen onModeSelect={handleModeSelect} />}

      {/* Show normal mode UI if normal mode selected */}
      {gameMode === 'normal' && (
        <NormalMode
          onGameEnd={(score) => handleGameEnd(score, 'normal')}
          systemHealthRef={systemHealthRef}
          isActive={gameMode === 'normal'}
          onReset={() => {
            // Reset all tasks
            monitoringTaskRef.current?.resetTask();
            commTaskRef.current?.resetTask();
            resourceTaskRef.current?.resetTask();
            trackingTaskRef.current?.resetTask();

            // Reset all event logs
            setMonitoringEventLog([]);
            setCommEventLog([]);
            setResourceEventLog([]);
            setTrackingEventLog([]);

            // Reset metrics
            setMonitoringMetrics({ healthImpact: 0, systemLoad: 0 });
            setCommMetrics({ healthImpact: 0, systemLoad: 0 });
            setResourceMetrics(ResourceManagementTask.getDefaultMetrics());
            setTrackingMetrics(TrackingTask.getDefaultMetrics());
          }}
        />
      )}

      {/* Show infinite mode UI if infinite mode selected */}
      {gameMode === 'infinite' && (
        <InfiniteMode
          onGameEnd={(score) => handleGameEnd(score, 'infinite')}
          systemHealthRef={systemHealthRef}
          isActive={gameMode === 'infinite'}
          onReset={() => {
            // Reset all tasks
            monitoringTaskRef.current?.resetTask();
            commTaskRef.current?.resetTask();
            resourceTaskRef.current?.resetTask();
            trackingTaskRef.current?.resetTask();

            // Reset all event logs
            setMonitoringEventLog([]);
            setCommEventLog([]);
            setResourceEventLog([]);
            setTrackingEventLog([]);

            // Reset metrics
            setMonitoringMetrics({ healthImpact: 0, systemLoad: 0 });
            setCommMetrics({ healthImpact: 0, systemLoad: 0 });
            setResourceMetrics(ResourceManagementTask.getDefaultMetrics());
            setTrackingMetrics(TrackingTask.getDefaultMetrics());
          }}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {/* Leaderboard */}
      <Leaderboard
        isOpen={showLeaderboard}
        onClose={() => {
          setShowLeaderboard(false);
          setIsNewScore(false);
          if (!isNewScore) {
            setGameMode(null); // Return to menu only if not submitting a new score
          }
        }}
        mode={leaderboardMode}
        currentScore={currentScore}
        isNewScore={isNewScore}
      />

      {/* MAIN CONTENT */}
      {gameMode && (
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
              {isMonitoringTaskEnabled ? (
                <MonitoringTask
                  ref={monitoringTaskRef}
                  eventsPerMinute={monitoringEPM}
                  showLog={showMonitoringLog}
                  onLogUpdate={setMonitoringEventLog}
                  onMetricsUpdate={setMonitoringMetrics}
                  isEnabled={isMonitoringTaskEnabled}
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
                  System Monitoring Task Disabled
                </div>
              )}
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
                ref={trackingTaskRef}
                eventsPerMinute={trackingEPM}
                difficulty={trackingDifficulty}
                showLog={showTrackingLog}
                onLogUpdate={handleTrackingLogUpdate}
                onStatusUpdate={({ isManual, isInBox }) => {
                  setIsTrackingManual(isManual);
                  setIsInBox(isInBox);
                }}
                onMetricsUpdate={setTrackingMetrics}
                isEnabled={isTrackingTaskEnabled}
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
                ref={systemHealthRef}
                monitoringLogs={monitoringEventLog}
                resourceLogs={resourceEventLog}
                commLogs={commEventLog}
                trackingLogs={trackingEventLog}
                isTrackingManual={isTrackingManual}
                isInBox={isInBox}
                commMetrics={commMetrics}
                resourceMetrics={resourceMetrics}
                monitoringMetrics={monitoringMetrics}
                trackingMetrics={trackingMetrics}
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
      )}

      {/* SIDEBAR */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          {/* Settings Section - Hide in Infinite Mode */}
          {gameMode !== 'infinite' && (
            <div className="settings-section">
              <h2 style={{ marginTop: 0 }}>Settings</h2>
              
              {/* Monitoring Settings */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Monitoring Task</h3>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={isMonitoringTaskEnabled}
                      onChange={() => setIsMonitoringTaskEnabled(!isMonitoringTaskEnabled)}
                    />
                    &nbsp;Task Enabled
                  </label>
                </div>
                {isMonitoringTaskEnabled && (
                  <>
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
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={showMonitoringLog}
                          onChange={() => setShowMonitoringLog(!showMonitoringLog)}
                        />
                        &nbsp;Show Log
                      </label>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <button
                        onClick={() => monitoringTaskRef.current?.resetTask()}
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
                    <input
                      type="checkbox"
                      checked={isTrackingTaskEnabled}
                      onChange={() => setIsTrackingTaskEnabled(!isTrackingTaskEnabled)}
                    />
                    &nbsp;Task Enabled
                  </label>
                </div>
                {isTrackingTaskEnabled && (
                  <>
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
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label>
                        Difficulty:&nbsp;
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={trackingDifficulty}
                          onChange={(e) => setTrackingDifficulty(Number(e.target.value))}
                          style={{ width: '100px' }}
                        />
                        &nbsp;{trackingDifficulty}
                      </label>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={showTrackingLog}
                          onChange={() => setShowTrackingLog(!showTrackingLog)}
                        />
                        &nbsp;Show Log
                      </label>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <button
                        onClick={() => {
                          console.log('Resetting tracking task...');
                          if (trackingTaskRef.current) {
                            trackingTaskRef.current.resetTask();
                          } else {
                            console.warn('Tracking task ref not available');
                          }
                        }}
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
          )}

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

      {/* Toggle Button - Hide in Infinite Mode */}
      {gameMode !== 'infinite' && (
        <button
          className="toggle-button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? 'Close Settings' : 'Open Settings'}
        </button>
      )}
    </div>
  );
}

export default App;
