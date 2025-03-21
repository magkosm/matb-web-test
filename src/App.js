// src/App.js
import React, { useState, useCallback, useRef, useEffect } from 'react';
import MonitoringTask from './MonitoringTask';
import CommunicationsTask from './CommunicationsTask';
import ResourceManagementTask from './ResourceManagementTask';
import TrackingTask from './TrackingTask';
import SystemHealth from './components/SystemHealth';
import EnhancedSidebar from './components/EnhancedSidebar';
import MainMenu from './components/MainMenu';
import eventService from './services/EventService';
import './App.css';

function App() {
  // -------------------------
  // 1) STATE & HANDLERS
  // -------------------------

  // Main Menu state
  const [showMainMenu, setShowMainMenu] = useState(true);

  // Monitoring Task controls
  const [monitoringEPM, setMonitoringEPM] = useState(3);
  const [showMonitoringLog, setShowMonitoringLog] = useState(false);

  // Communications Task controls
  const [commEPM, setCommEPM] = useState(2);
  const [showCommLog, setShowCommLog] = useState(false);
  const [isCommTaskEnabled, setIsCommTaskEnabled] = useState(true);

  // Sidebar control for All Logs
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  // Add new state for monitoring task enabled/disabled
  const [isMonitoringTaskEnabled, setIsMonitoringTaskEnabled] = useState(true);

  // Add new state for tracking task enabled/disabled
  const [isTrackingTaskEnabled, setIsTrackingTaskEnabled] = useState(true);

  // Add state for tracking difficulty
  const [trackingDifficulty, setTrackingDifficulty] = useState(5);

  // Add state for event sidebar
  const [isEventSidebarOpen, setIsEventSidebarOpen] = useState(false);

  // Add these state variables with the other state declarations at the top of the App component
  const [monitoringAutoEvents, setMonitoringAutoEvents] = useState(false);
  const [trackingAutoEvents, setTrackingAutoEvents] = useState(false);
  const [commAutoEvents, setCommAutoEvents] = useState(false);
  const [resourceAutoEvents, setResourceAutoEvents] = useState(false);

  // Add state for task difficulties
  const [commDifficulty, setCommDifficulty] = useState(5);
  const [monitoringDifficulty, setMonitoringDifficulty] = useState(5);

  // Custom handler to append Tracking logs
  const handleTrackingLogUpdate = useCallback((newEntry) => {
    setTrackingEventLog(prevLog => [...prevLog, newEntry]);
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
    setResourceMetrics(metrics);
  };

  // Add state for monitoring metrics
  const [monitoringMetrics, setMonitoringMetrics] = useState({
    healthImpact: 0,
    systemLoad: 0
  });

  // Add with other state declarations (around line 20-30)
  const [trackingMetrics, setTrackingMetrics] = useState(TrackingTask.getDefaultMetrics());

  // Add a new state for task registration status
  const [tasksRegistered, setTasksRegistered] = useState(false);

  // Register task refs with the event service when they change
  useEffect(() => {
    // Don't try registering more than once if we've already succeeded
    if (tasksRegistered) return;
    
    // Skip registration if we're in the main menu
    if (showMainMenu) return;
    
    // Check if all refs have current values
    const allRefsAvailable = 
      commTaskRef?.current && 
      monitoringTaskRef?.current && 
      trackingTaskRef?.current && 
      resourceTaskRef?.current;
    
    if (allRefsAvailable) {
      console.log('All task refs are available, registering with EventService...');
      
      // Register the tasks
      const registrationSuccess = eventService.registerTasks(
        commTaskRef,
        monitoringTaskRef,
        trackingTaskRef,
        resourceTaskRef
      );
      
      // Update registration status
      setTasksRegistered(registrationSuccess);
      
      if (registrationSuccess) {
        console.log('All tasks successfully registered with event service');
      } else {
        console.warn('Task registration was not successful, some features may not work properly');
      }
    } else {
      // Log which refs are missing
      console.log('Not all task refs are available yet:', {
        commTask: !!commTaskRef?.current,
        monitoringTask: !!monitoringTaskRef?.current,
        trackingTask: !!trackingTaskRef?.current,
        resourceTask: !!resourceTaskRef?.current
      });
    }
  // Fix dependency array to prevent continuous re-execution
  }, [tasksRegistered, commTaskRef, monitoringTaskRef, trackingTaskRef, resourceTaskRef, showMainMenu]);

  // Function to pause all tasks when exiting to menu
  const pauseAllTasks = useCallback(() => {
    // Use EventService to pause all tasks
    eventService.pauseAllTasks();
    
    // Stop the EventService scheduler if it's running
    eventService.stopScheduler();
  }, []);

  // Function to reset tasks to default values
  const resetAllTasksToDefault = useCallback(() => {
    // Reset all event logs
    setMonitoringEventLog([]);
    setCommEventLog([]);
    setResourceEventLog([]);
    setTrackingEventLog([]);
    
    // Reset the event per minute values
    setMonitoringEPM(3);
    setCommEPM(2);
    setResourceEPM(2);
    setTrackingEPM(2);
    
    // Reset difficulties
    setMonitoringDifficulty(5);
    setCommDifficulty(5);
    setResourceDifficulty(5);
    setTrackingDifficulty(5);
    
    // Reset task statuses
    setIsMonitoringTaskEnabled(true);
    setIsCommTaskEnabled(true);
    setIsResourceTaskEnabled(true);
    setIsTrackingTaskEnabled(true);
    
    // Reset auto events settings
    setMonitoringAutoEvents(false);
    setCommAutoEvents(false);
    setResourceAutoEvents(false);
    setTrackingAutoEvents(false);
    
    // Reset sidebar states
    setIsSidebarOpen(false);
    setIsEventSidebarOpen(false);
    
    // Reset task components internal state (including fuel levels)
    setTimeout(() => {
      // We use setTimeout to ensure this runs after the components are ready
      
      // Reset Resource Management task (fuel levels)
      if (resourceTaskRef.current && typeof resourceTaskRef.current.resetTask === 'function') {
        resourceTaskRef.current.resetTask();
      }
      
      // Reset Communications task
      if (commTaskRef.current) {
        // Some components might have different reset methods
        if (typeof commTaskRef.current.resetTask === 'function') {
          commTaskRef.current.resetTask();
        } else if (typeof commTaskRef.current.reset === 'function') {
          commTaskRef.current.reset();
        } else if (typeof commTaskRef.current.clearActiveMessage === 'function') {
          // Clear any active communications
          commTaskRef.current.clearActiveMessage();
        }
      }
      
      // Reset Monitoring task
      if (monitoringTaskRef.current && typeof monitoringTaskRef.current.resetTask === 'function') {
        monitoringTaskRef.current.resetTask();
      }
      
      // Reset Tracking task
      if (trackingTaskRef.current && typeof trackingTaskRef.current.resetTask === 'function') {
        trackingTaskRef.current.resetTask();
      }
    }, 100);
  }, []);

  // Function to handle exiting to main menu
  const exitToMainMenu = useCallback(() => {
    // Pause/stop all task activities
    pauseAllTasks();
    
    // Show the main menu
    setShowMainMenu(true);
  }, [pauseAllTasks]);

  // Function to handle starting the game from the main menu
  const startGame = useCallback(() => {
    // Reset all tasks to their default states
    resetAllTasksToDefault();
    
    // Hide the main menu
    setShowMainMenu(false);
    
    // Reset the task registration status so it will register again
    setTasksRegistered(false);
  }, [resetAllTasksToDefault]);

  // Add keyboard shortcut (Ctrl+Q) to exit to main menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Q to exit to main menu
      if (e.ctrlKey && e.key === 'q') {
        e.preventDefault();
        exitToMainMenu();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [exitToMainMenu]);

  // Handle exiting the application (can't be fully implemented in a web app)
  const handleExitApp = () => {
    // In a web app, we can only show a confirmation or redirect
    if (window.confirm('Are you sure you want to exit the application? This will close the browser tab.')) {
      window.close(); // This may be blocked by browsers without user interaction
      // As a fallback, we can redirect to a blank page or show a message
      document.body.innerHTML = '<h1>Thanks for using MATB-II Simulation</h1><p>You can now close this tab.</p>';
    }
  };

  // If the main menu should be shown, render it instead of the main app
  if (showMainMenu) {
    return (
      <MainMenu 
        onStartGame={startGame} 
        onExitApp={handleExitApp} 
      />
    );
  }

  return (
    <div className="app-container" style={{ height: '100vh', overflow: 'hidden' }}>
      <div className="main-container">
        <div className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''} ${isEventSidebarOpen ? 'event-sidebar-open' : ''}`}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%',
            position: 'relative'
          }}>
            {/* Rest of the main content (tasks) */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
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
                        autoEvents={monitoringAutoEvents}
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
                      autoEvents={trackingAutoEvents}
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
                        autoEvents={commAutoEvents}
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
                      autoEvents={resourceAutoEvents}
            />
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>

              {/* Existing Settings Sidebar */}
              {isSidebarOpen && (
                <div className="sidebar">
        <div className="sidebar-content">
          {/* Settings Section */}
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
                            <div style={{ marginBottom: '0.5rem' }}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={monitoringAutoEvents}
                                  onChange={() => setMonitoringAutoEvents(!monitoringAutoEvents)}
                                />
                                &nbsp;Auto Events (Default Off)
                              </label>
                            </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <button
                          onClick={() => {
                            if (monitoringTaskRef.current && typeof monitoringTaskRef.current.resetTask === 'function') {
                              monitoringTaskRef.current.resetTask();
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
                            <div style={{ marginBottom: '0.5rem' }}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={commAutoEvents}
                                  onChange={() => setCommAutoEvents(!commAutoEvents)}
                                />
                                &nbsp;Auto Events (Default Off)
                              </label>
                            </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <button
                          onClick={() => {
                            if (commTaskRef.current) {
                              if (typeof commTaskRef.current.resetTask === 'function') {
                                commTaskRef.current.resetTask();
                              } else if (typeof commTaskRef.current.reset === 'function') {
                                commTaskRef.current.reset();
                              } else if (typeof commTaskRef.current.clearActiveMessage === 'function') {
                                commTaskRef.current.clearActiveMessage();
                              }
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
                            <div style={{ marginBottom: '0.5rem' }}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={trackingAutoEvents}
                                  onChange={() => setTrackingAutoEvents(!trackingAutoEvents)}
                                />
                                &nbsp;Auto Events (Default Off)
                              </label>
                            </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <button
                      onClick={() => {
                            if (trackingTaskRef.current && typeof trackingTaskRef.current.resetTask === 'function') {
                          trackingTaskRef.current.resetTask();
                        } else {
                              console.warn('Tracking task reset function not available');
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
                            <div style={{ marginBottom: '0.5rem' }}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={resourceAutoEvents}
                                  onChange={() => setResourceAutoEvents(!resourceAutoEvents)}
                                />
                                &nbsp;Auto Events (Default Off)
                              </label>
                            </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <button
                          onClick={() => {
                            if (resourceTaskRef.current && typeof resourceTaskRef.current.resetTask === 'function') {
                              resourceTaskRef.current.resetTask();
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
              )}

              {/* New Event Controls Sidebar */}
              {isEventSidebarOpen && (
                <div className="event-sidebar" style={{
                  position: 'fixed',
                  top: '10vh',
                  right: '0',
                  height: '90vh',
                  width: '30vw',
                  zIndex: 900,
                  transition: 'transform 0.3s ease-in-out',
                  boxShadow: '-2px 0 5px rgba(0, 0, 0, 0.1)',
                  overflowY: 'auto'
                }}>
                  <EnhancedSidebar
                    // Task settings
                    commSettings={{
                      eventsPerMinute: commEPM,
                      showLog: showCommLog,
                      isEnabled: isCommTaskEnabled,
                      difficulty: commDifficulty
                    }}
                    monitoringSettings={{
                      eventsPerMinute: monitoringEPM,
                      showLog: showMonitoringLog,
                      isEnabled: isMonitoringTaskEnabled,
                      difficulty: monitoringDifficulty
                    }}
                    trackingSettings={{
                      eventsPerMinute: trackingEPM,
                      difficulty: trackingDifficulty,
                      showLog: showTrackingLog,
                      isEnabled: isTrackingTaskEnabled
                    }}
                    resourceSettings={{
                      eventsPerMinute: resourceEPM,
                      difficulty: resourceDifficulty,
                      showLog: showResourceLog,
                      isEnabled: isResourceTaskEnabled
                    }}
                    onSchedulingChange={(change) => {
                      console.log('Scheduling change received:', change);
                      const { task, type, value } = change;
                      
                      // Update the appropriate state based on the task and type
                      switch (task) {
                        case 'comm':
                          if (type === 'epm') setCommEPM(value);
                          if (type === 'difficulty') {
                            setCommDifficulty(value);
                            if (commTaskRef.current) {
                              commTaskRef.current.setDifficulty(value);
                            }
                          }
                          break;
                        case 'monitoring':
                          if (type === 'epm') setMonitoringEPM(value);
                          if (type === 'difficulty') {
                            setMonitoringDifficulty(value);
                            if (monitoringTaskRef.current) {
                              monitoringTaskRef.current.setDifficulty(value);
                            }
                          }
                          break;
                        case 'tracking':
                          if (type === 'epm') setTrackingEPM(value);
                          if (type === 'difficulty') {
                            setTrackingDifficulty(value);
                            if (trackingTaskRef.current) {
                              trackingTaskRef.current.setDifficulty(value);
                            }
                          }
                          break;
                        case 'resource':
                          if (type === 'epm') setResourceEPM(value);
                          if (type === 'difficulty') {
                            setResourceDifficulty(value);
                            if (resourceTaskRef.current) {
                              resourceTaskRef.current.setDifficulty(value);
                            }
                          }
                          break;
                        default:
                          break;
                      }
                    }}
                    // Logs
                    monitoringLog={monitoringEventLog}
                    commLog={commEventLog}
                    trackingLog={trackingEventLog}
                    resourceLog={resourceEventLog}
                  />
                </div>
              )}
      </div>

      {/* Toggle Button - if needed outside the header */}
      <button
        className="toggle-button"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{ display: 'none' }} // Hide this if using the header buttons
      >
        {isSidebarOpen ? 'Close Settings' : 'Open Settings'}
      </button>

      {/* Add Event Controls button next to the sidebar toggle */}
      <div style={{ 
        position: 'fixed', 
        top: '65px', 
        right: '20px', 
        zIndex: 1000 
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={exitToMainMenu}
            style={{
              padding: '8px 12px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Main Menu (Ctrl+Q)
          </button>
        <button
          onClick={() => setIsEventSidebarOpen(!isEventSidebarOpen)}
          style={{
            padding: '8px 12px',
            background: isEventSidebarOpen ? '#555' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isEventSidebarOpen ? 'Hide Event Controls' : 'Show Event Controls'}
        </button>
        </div>
      </div>
    </div>
  );
}

export default App;
