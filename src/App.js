// src/App.js
import React, { useState, useCallback, useRef, useEffect } from 'react';
import MonitoringTask from './MonitoringTask';
import CommunicationsTask from './CommunicationsTask';
import ResourceManagementTask from './ResourceManagementTask';
import TrackingTask from './TrackingTask';
import SystemHealth from './components/SystemHealth';
import EnhancedSidebar from './components/EnhancedSidebar';
import MainMenu from './components/MainMenu';
import NormalModeGame from './components/NormalModeGame';
import InfiniteModeGame from './components/InfiniteModeGame';
import CustomModeGame from './components/CustomModeGame';
import eventService from './services/EventService';
import BackgroundSelector from './components/BackgroundSelector';
import BackgroundService from './services/BackgroundService';
import './App.css';
import { useTranslation } from 'react-i18next';
import { COMM_CONFIG } from './config/simulationConfig';

// Helper function to detect mobile devices
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
};

// Add helper function to get the saved input mode
const getTrackingInputMode = () => {
  const savedMode = localStorage.getItem('trackingInputMode');
  if (savedMode && ['keyboard', 'touch'].includes(savedMode)) {
    return savedMode;
  }
  return isMobileDevice() ? 'touch' : 'keyboard';
};

function App() {
  const { t } = useTranslation();

  // -------------------------
  // 1) STATE & HANDLERS
  // -------------------------

  // Add loading state
  const [isInitializing, setIsInitializing] = useState(false);

  // Check for startup parameters in localStorage
  const [startupParamsChecked, setStartupParamsChecked] = useState(false);

  // Main Menu state - we'll decide this after checking localStorage
  const [showMainMenu, setShowMainMenu] = useState(true);

  // Game mode state
  const [currentGameMode, setCurrentGameMode] = useState('testing');
  const [gameDuration, setGameDuration] = useState(5 * 60 * 1000); // 5 minutes default
  const [gameResults, setGameResults] = useState(null);

  // Monitoring Task controls
  const [monitoringEPM, setMonitoringEPM] = useState(3);
  const [showMonitoringLog, _setShowMonitoringLog] = useState(false); // Prefix with underscore to indicate intentionally unused
  const [monitoringDifficulty, setMonitoringDifficulty] = useState(5);
  const [isMonitoringTaskEnabled, setIsMonitoringTaskEnabled] = useState(true);
  const [monitoringAutoEvents, setMonitoringAutoEvents] = useState(false);
  const [monitoringEventLog, setMonitoringEventLog] = useState([]);

  // Communications Task controls
  const [commEPM, setCommEPM] = useState(COMM_CONFIG.DEFAULT_EPM);
  const [showCommLog, _setShowCommLog] = useState(false); // Prefix with underscore to indicate intentionally unused
  const [commDifficulty, setCommDifficulty] = useState(5);
  const [isCommTaskEnabled, setIsCommTaskEnabled] = useState(true);
  const [commAutoEvents, setCommAutoEvents] = useState(false);
  const [commEventLog, setCommEventLog] = useState([]);
  const [commMetrics, setCommMetrics] = useState({ healthImpact: 0, systemLoad: 0 });

  // Resource Management controls
  const [resourceEPM, setResourceEPM] = useState(2);
  const [resourceDifficulty, setResourceDifficulty] = useState(5);
  const [showResourceLog, _setShowResourceLog] = useState(false); // Prefix with underscore to indicate intentionally unused
  const [isResourceTaskEnabled, setIsResourceTaskEnabled] = useState(true);
  const [resourceAutoEvents, setResourceAutoEvents] = useState(false);
  const [resourceEventLog, setResourceEventLog] = useState([]);
  const [resourceMetrics, setResourceMetrics] = useState(
    ResourceManagementTask.getDefaultMetrics ?
      ResourceManagementTask.getDefaultMetrics() :
      { healthImpact: 0, systemLoad: 0 }
  );

  // Tracking Task controls
  const [trackingEPM, setTrackingEPM] = useState(2);
  const [trackingDifficulty, setTrackingDifficulty] = useState(5);
  const [showTrackingLog, _setShowTrackingLog] = useState(false); // Prefix with underscore to indicate intentionally unused
  const [isTrackingTaskEnabled, setIsTrackingTaskEnabled] = useState(true);
  const [trackingAutoEvents, setTrackingAutoEvents] = useState(false);
  const [trackingEventLog, setTrackingEventLog] = useState([]);
  const [isTrackingManual, setIsTrackingManual] = useState(false);
  const [isInBox, setIsInBox] = useState(false);
  const [trackingMetrics, setTrackingMetrics] = useState(
    TrackingTask.getDefaultMetrics ?
      TrackingTask.getDefaultMetrics() :
      { healthImpact: 0, systemLoad: 0 }
  );

  // Sidebar control
  const [_isSidebarOpen, setIsSidebarOpen] = useState(false); // Prefix with underscore to indicate intentionally unused
  const [isEventSidebarOpen, setIsEventSidebarOpen] = useState(false);

  // Add state for monitoring metrics
  const [monitoringMetrics, setMonitoringMetrics] = useState({
    healthImpact: 0,
    systemLoad: 0
  });

  // System Performance Log (1Hz health/load)
  const [systemPerformanceLog, setSystemPerformanceLog] = useState([]);

  // Handler for SystemHealth performance updates
  const handlePerformanceUpdate = useCallback((data) => {
    setSystemPerformanceLog(prev => [...prev, data]);
  }, []);

  // Inside the App component, add a state for showing the background selector
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);

  // Refs
  const commTaskRef = useRef(null);
  const monitoringTaskRef = useRef(null);
  const trackingTaskRef = useRef(null);
  const resourceTaskRef = useRef(null);
  const systemHealthRef = useRef(null);
  const systemHealthValueRef = useRef(100);

  // Task registration status
  const [tasksRegistered, setTasksRegistered] = useState(false);

  // Mobile detection state
  const [isMobile, setIsMobile] = useState(isMobileDevice());

  // Add state for custom game configuration
  const [customGameConfig, setCustomGameConfig] = useState(null);

  // Always use keyboard input mode
  const [trackingInputMode, setTrackingInputMode] = useState('keyboard'); // Default to keyboard input

  // Custom handler to append Tracking logs
  const handleTrackingLogUpdate = useCallback((newEntry) => {
    setTrackingEventLog(prevLog => [...prevLog, newEntry]);
  }, []);

  // Handle resource metrics update
  const handleResourceMetricsUpdate = useCallback((metrics) => {
    setResourceMetrics(metrics);
  }, []);

  // Handle discrete penalties (one-time deductions)
  const handlePenalty = useCallback((amount) => {
    console.log(`App: Processing penalty of ${amount}`);
    if (systemHealthRef.current) {
      if (typeof systemHealthRef.current.applyDiscretePenalty === 'function') {
        console.log('App: Calling systemHealthRef.applyDiscretePenalty');
        systemHealthRef.current.applyDiscretePenalty(amount);
      } else {
        // Fallback or legacy support
        console.warn('SystemHealth does not support applyDiscretePenalty');
      }
    } else {
      console.warn('App: systemHealthRef is null');
    }
  }, []);

  // Register task refs with the event service when they change
  useEffect(() => {
    // Don't try registering more than once if we've already succeeded
    if (tasksRegistered) return;

    // Skip registration if we're in the main menu
    if (showMainMenu) return;

    // Check if all refs have current values
    // Check if required refs have current values
    // Only check for refs that correspond to enabled tasks
    const allRefsAvailable =
      (!isCommTaskEnabled || commTaskRef?.current) &&
      (!isMonitoringTaskEnabled || monitoringTaskRef?.current) &&
      (!isTrackingTaskEnabled || trackingTaskRef?.current) &&
      (!isResourceTaskEnabled || resourceTaskRef?.current);

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
  }, [
    showMainMenu,
    tasksRegistered,
    commTaskRef,
    monitoringTaskRef,
    trackingTaskRef,
    resourceTaskRef,
    // Add enabled flags to dependencies
    isCommTaskEnabled,
    isMonitoringTaskEnabled,
    isTrackingTaskEnabled,
    isResourceTaskEnabled
    // These refs need to be in the dependency array to ensure registration happens when they're available
  ]);

  // Reset all tasks to default states
  const resetAllTasksToDefault = useCallback(() => {
    // Stop the event scheduler if running
    eventService.stopScheduler();

    // Pause all tasks explicitly first
    eventService.pauseAllTasks();

    // Reset task-specific states
    setCommEPM(COMM_CONFIG.DEFAULT_EPM);
    setCommDifficulty(5);
    setMonitoringEPM(3);
    setMonitoringDifficulty(5);
    setTrackingEPM(2);
    setTrackingDifficulty(5);
    setResourceEPM(2);
    setResourceDifficulty(5);

    // Reset logs
    setMonitoringEventLog([]);
    setCommEventLog([]);
    setResourceEventLog([]);
    setTrackingEventLog([]);
    setSystemPerformanceLog([]);

    // Reset task enablement
    setIsCommTaskEnabled(true);
    setIsMonitoringTaskEnabled(true);
    setIsTrackingTaskEnabled(true);
    setIsResourceTaskEnabled(true);

    // Reset auto-events
    setMonitoringAutoEvents(false);
    setTrackingAutoEvents(false);
    setCommAutoEvents(false);
    setResourceAutoEvents(false);

    // Reset sidebars
    setIsSidebarOpen(false);
    setIsEventSidebarOpen(false);

    // Reset game mode state
    setGameResults(null);

    // Reset task components explicitly
    // Use setTimeout to ensure this runs after state updates
    setTimeout(() => {
      console.log('Resetting all task components...');

      // Reset Resource Management task (tanks)
      if (resourceTaskRef.current && typeof resourceTaskRef.current.resetTask === 'function') {
        resourceTaskRef.current.resetTask();
        console.log('Resource task reset');
      }

      // Reset Communications task
      if (commTaskRef.current) {
        if (typeof commTaskRef.current.resetTask === 'function') {
          commTaskRef.current.resetTask();
          console.log('Communications task reset via resetTask');
        } else if (typeof commTaskRef.current.reset === 'function') {
          commTaskRef.current.reset();
          console.log('Communications task reset via reset');
        } else if (typeof commTaskRef.current.clearActiveMessage === 'function') {
          commTaskRef.current.clearActiveMessage();
          console.log('Communications task cleared active message');
        }
      }

      // Reset Monitoring task
      if (monitoringTaskRef.current && typeof monitoringTaskRef.current.resetTask === 'function') {
        monitoringTaskRef.current.resetTask();
        console.log('Monitoring task reset');
      }

      // Reset Tracking task
      if (trackingTaskRef.current && typeof trackingTaskRef.current.resetTask === 'function') {
        trackingTaskRef.current.resetTask();
        console.log('Tracking task reset');
      }

      // Make sure system health is reset too
      if (systemHealthRef.current && typeof systemHealthRef.current.resetHealth === 'function') {
        systemHealthRef.current.resetHealth();
        console.log('System health reset');
      }
      systemHealthValueRef.current = 100;

      // Force task unpausing after reset
      setTimeout(() => {
        eventService.resumeAllTasks();
        console.log('All tasks resumed after reset');
      }, 200);
    }, 200);
  }, []);

  // Function to handle starting the game from the main menu
  const startGame = useCallback((options) => {
    // Get mode and duration from options
    const { mode, duration, taskConfig, trackingInputMode: menuInputMode } = options;

    // Update tracking input mode if provided from menu
    if (menuInputMode) {
      console.log(`App: Setting tracking input mode from menu selection: ${menuInputMode}`);
      setTrackingInputMode(menuInputMode);
    } else {
      // If not provided, refresh from localStorage just to be sure
      const savedMode = localStorage.getItem('trackingInputMode');
      if (savedMode && ['keyboard', 'touch'].includes(savedMode)) {
        console.log(`App: Using tracking input mode from localStorage: ${savedMode}`);
        setTrackingInputMode(savedMode);
      }
    }

    // Reset all tasks to their default states
    resetAllTasksToDefault();

    // Set game mode and duration
    setCurrentGameMode(mode);
    if (duration) setGameDuration(duration);

    // For custom mode, store task configuration
    if (mode === 'custom' && taskConfig) {
      setCustomGameConfig(taskConfig);

      // Set task enabled states based on custom configuration
      setIsCommTaskEnabled(taskConfig.comm.isActive);
      setIsMonitoringTaskEnabled(taskConfig.monitoring.isActive);
      setIsTrackingTaskEnabled(taskConfig.tracking.isActive);
      setIsResourceTaskEnabled(taskConfig.resource.isActive);
    }

    // Hide the main menu
    setShowMainMenu(false);

    // Reset the task registration status so it will register again
    setTasksRegistered(false);

    // Reset all tanks explicitly for Normal Mode
    if (mode === 'normal' || mode === 'custom') {
      // Use a small timeout to ensure components are mounted
      setTimeout(() => {
        if (resourceTaskRef.current && typeof resourceTaskRef.current.resetTask === 'function') {
          console.log('Resetting all tanks for game mode');
          resourceTaskRef.current.resetTask();
        } else {
          console.warn('Resource task not available for reset');
        }

        // Ensure all tasks are unpaused after initialization
        eventService.resumeAllTasks();
        console.log('Tasks resumed after game start');
      }, 300);
    }
  }, [resetAllTasksToDefault]);

  // Function to handle exiting to the main menu
  const exitToMainMenu = useCallback(() => {
    // Stop the event scheduler
    eventService.stopScheduler();

    // Pause all tasks
    eventService.pauseAllTasks();

    // Show the main menu
    setShowMainMenu(true);

    // Reset task registration status
    setTasksRegistered(false);

    // Clear any stored startup parameters
    localStorage.removeItem('matb_start_params');
  }, []);

  // Handle game end (both Normal Mode and Infinite Mode)
  const handleGameEnd = useCallback((results) => {
    // Preserve the gameMode in the results if it was provided
    const gameMode = results.gameMode || currentGameMode;

    // Create a standardized result object with the mode included
    const standardizedResults = {
      ...results,
      gameMode
    };

    // Update the game results state with the standardized object
    setGameResults(standardizedResults);

    // Return to the main menu
    exitToMainMenu();
  }, [exitToMainMenu, currentGameMode]);

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

  // Add a useEffect to apply the background on component mount
  useEffect(() => {
    const currentBackground = BackgroundService.getCurrentBackground();
    const style = BackgroundService.getBackgroundStyle(currentBackground);
    document.body.style.backgroundImage = style.backgroundImage || 'none';
    document.body.style.backgroundColor = style.backgroundColor || '';
    document.body.style.backgroundSize = style.backgroundSize || '';
    document.body.style.backgroundPosition = style.backgroundPosition || '';
    document.body.style.backgroundRepeat = style.backgroundRepeat || '';
  }, []);

  // Add an effect to log when running on mobile
  useEffect(() => {
    if (isMobile) {
      console.log('MATB-II is running on a mobile device - configuring for touch input');
    }
  }, [isMobile]);

  // Add effect to detect mobile and initialize tracking input mode on component mount
  useEffect(() => {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

    setIsMobile(isMobileDevice);

    // If this is the first time loading and we detected mobile,
    // initialize the tracking input mode preference to 'touch'
    if (isMobileDevice && !localStorage.getItem('trackingInputMode')) {
      localStorage.setItem('trackingInputMode', 'touch');
      setTrackingInputMode('touch');
      console.log('Auto-initialized tracking input mode to touch for mobile device');
    } else {
      // Ensure we sync our state with the stored preference
      const savedMode = localStorage.getItem('trackingInputMode');
      if (savedMode && ['keyboard', 'touch'].includes(savedMode)) {
        setTrackingInputMode(savedMode);
        console.log(`App: Using saved tracking input mode: ${savedMode}`);
      }
    }
  }, []);

  // Add a useEffect to log when trackingInputMode changes
  useEffect(() => {
    console.log(`App: trackingInputMode state changed to ${trackingInputMode}`);
  }, [trackingInputMode]);

  // Check for startup parameters stored in localStorage
  useEffect(() => {
    // Only check once and never when initializing
    if (startupParamsChecked || isInitializing) return;

    try {
      const storedParams = localStorage.getItem('matb_start_params');
      if (storedParams) {
        setIsInitializing(true); // Set initializing flag to prevent duplicate starts

        const startParams = JSON.parse(storedParams);

        // Create task configuration object for custom mode
        const createCustomTaskConfig = () => {
          const { tasks } = startParams;
          return {
            comm: {
              isActive: tasks.includes('comm'),
              eventsPerMinute: commEPM,
              difficulty: commDifficulty
            },
            monitoring: {
              isActive: tasks.includes('monitoring'),
              eventsPerMinute: monitoringEPM,
              difficulty: monitoringDifficulty
            },
            tracking: {
              isActive: tasks.includes('tracking'),
              eventsPerMinute: trackingEPM,
              difficulty: trackingDifficulty
            },
            resource: {
              isActive: tasks.includes('resource'),
              eventsPerMinute: resourceEPM,
              difficulty: resourceDifficulty
            }
          };
        };

        // Set the main menu to hidden
        setShowMainMenu(false);

        // Use a longer timeout to ensure the components have fully mounted
        // and all initialization is complete
        setTimeout(() => {
          const { mode, tasks, duration } = startParams;

          // Ensure we have task registration before starting the game
          // This prevents issues with tasks being paused when events start
          const startGameWithTaskCheck = () => {
            // Check if all necessary tasks are registered
            const allRefsAvailable =
              (!tasks.includes('comm') || commTaskRef?.current) &&
              (!tasks.includes('monitoring') || monitoringTaskRef?.current) &&
              (!tasks.includes('tracking') || trackingTaskRef?.current) &&
              (!tasks.includes('resource') || resourceTaskRef?.current);

            if (allRefsAvailable) {
              console.log('All required task refs are ready for auto-start');

              if (mode === 'normal' && duration) {
                // Start normal mode with specified duration
                startGame({
                  mode: 'normal',
                  duration
                });
              }
              else if (mode === 'custom' && tasks) {
                startGame({
                  mode: 'custom',
                  duration: gameDuration,
                  taskConfig: createCustomTaskConfig()
                });
              }

              // Ensure tasks are unpaused
              setTimeout(() => {
                eventService.resumeAllTasks();
                console.log('Tasks resumed after auto-start');
              }, 300);

              // Clear the params so they don't re-trigger on refresh
              localStorage.removeItem('matb_start_params');
              setIsInitializing(false); // Reset initializing flag
            } else {
              // If tasks aren't ready yet, try again after a short delay
              console.log('Not all required task refs are ready, waiting...');
              setTimeout(startGameWithTaskCheck, 100);
            }
          };

          // Start the task check process
          startGameWithTaskCheck();
        }, 800); // Increased timeout to ensure components are mounted
      } else {
        // Mark as checked to prevent repeated processing if no parameters found
        setStartupParamsChecked(true);
      }
    } catch (error) {
      console.error("Error processing startup parameters:", error);
      localStorage.removeItem('matb_start_params');
      setStartupParamsChecked(true);
      setIsInitializing(false); // Reset initializing flag
    }
    // We're intentionally only running this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitializing, startupParamsChecked]);

  // If the main menu should be shown, render it instead of the main app
  if (showMainMenu) {
    return (
      <MainMenu
        onStartGame={startGame}
        onExitApp={handleExitApp}
        gameResults={gameResults}
      />
    );
  }

  return (
    <div className="app-container" style={{ height: '100vh', overflow: 'hidden' }}>
      <div className="main-container">
        {/* Only show game controls in game modes */}
        {currentGameMode === 'normal' && (
          <NormalModeGame
            duration={gameDuration}
            onGameEnd={handleGameEnd}
            eventService={eventService}
            healthRef={systemHealthValueRef}
            logs={{
              comm: commEventLog,
              resource: resourceEventLog,
              monitoring: monitoringEventLog,
              tracking: trackingEventLog,
              performance: systemPerformanceLog
            }}
          />
        )}

        {currentGameMode === 'infinite' && (
          <InfiniteModeGame
            onGameEnd={handleGameEnd}
            eventService={eventService}
            healthRef={systemHealthValueRef}
          />
        )}

        {currentGameMode === 'custom' && customGameConfig && (
          <CustomModeGame
            duration={gameDuration}
            taskConfig={customGameConfig}
            onGameEnd={handleGameEnd}
            eventService={eventService}
            healthRef={systemHealthValueRef}
          />
        )}

        <div className={`main-content ${isEventSidebarOpen && currentGameMode === 'testing' ? 'sidebar-open' : ''}`}>
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
                    flexDirection: 'column',
                    backgroundColor: 'white'
                  }}>
                    {isMonitoringTaskEnabled ? (
                      <MonitoringTask
                        ref={monitoringTaskRef}
                        eventsPerMinute={monitoringEPM}
                        setEventsPerMinute={setMonitoringEPM}
                        showLog={showMonitoringLog}
                        setShowLog={_setShowMonitoringLog} // Using prefixed setter
                        onLogUpdate={setMonitoringEventLog}
                        isEnabled={isMonitoringTaskEnabled}
                        onMetricsUpdate={setMonitoringMetrics}
                        autoEvents={monitoringAutoEvents}
                        onPenalty={handlePenalty}
                      />
                    ) : (
                      <div style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#e0e0e0',
                        color: '#888',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          backgroundColor: '#d0d0d0',
                          color: '#686868',
                          width: '100%',
                          padding: '0.5rem',
                          textAlign: 'center',
                          fontWeight: 'bold'
                        }}>
                          {t('tasks.monitoring.title')}
                        </div>
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                          {t('customMode.monitoringTask')} {t('gameOver.inactive')}
                        </div>
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
                    flexDirection: 'column',
                    backgroundColor: 'white'
                  }}>
                    {isTrackingTaskEnabled ? (
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
                        isMobile={isMobile}
                        defaultInputMode={trackingInputMode}
                        key={`tracking-${trackingInputMode}`}
                      />
                    ) : (
                      <div style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#e0e0e0',
                        color: '#888',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          backgroundColor: '#d0d0d0',
                          color: '#686868',
                          width: '100%',
                          padding: '0.5rem',
                          textAlign: 'center',
                          fontWeight: 'bold'
                        }}>
                          {t('tasks.tracking.title')}
                        </div>
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                          {t('customMode.trackingTask')} {t('gameOver.inactive')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top Right - System Health */}
                  <div style={{
                    gridColumn: '6',
                    gridRow: '1',
                    border: '1px solid #ccc',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'white'
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
                      isMonitoringActive={isMonitoringTaskEnabled}
                      isCommActive={isCommTaskEnabled}
                      isResourceActive={isResourceTaskEnabled}
                      isTrackingActive={isTrackingTaskEnabled}
                      healthRef={systemHealthValueRef}
                      onPerformanceUpdate={handlePerformanceUpdate}
                    />
                  </div>

                  {/* Bottom Left - Communications Task */}
                  <div style={{
                    gridColumn: '1 / span 2',
                    gridRow: '2',
                    border: '1px solid #ccc',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'white'
                  }}>
                    {isCommTaskEnabled ? (
                      <CommunicationsTask
                        ref={commTaskRef}
                        eventsPerMinute={commEPM}
                        showLog={showCommLog}
                        onLogUpdate={setCommEventLog}
                        isEnabled={isCommTaskEnabled}
                        onMetricsUpdate={setCommMetrics}
                        autoEvents={commAutoEvents}
                        onPenalty={handlePenalty}
                      />
                    ) : (
                      <div style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#e0e0e0',
                        color: '#888',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          backgroundColor: '#d0d0d0',
                          color: '#686868',
                          width: '100%',
                          padding: '0.5rem',
                          textAlign: 'center',
                          fontWeight: 'bold'
                        }}>
                          {t('tasks.communications.title')}
                        </div>
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                          {t('customMode.commTask')} {t('gameOver.inactive')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resource Management */}
                  <div style={{
                    gridColumn: '3 / span 4',
                    gridRow: '2',
                    border: '1px solid #ccc',
                    overflow: 'hidden',
                    backgroundColor: 'white'
                  }}>
                    {isResourceTaskEnabled ? (
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
                    ) : (
                      <div style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#e0e0e0',
                        color: '#888',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          backgroundColor: '#d0d0d0',
                          color: '#686868',
                          width: '100%',
                          padding: '0.5rem',
                          textAlign: 'center',
                          fontWeight: 'bold'
                        }}>
                          {t('tasks.resource.title')}
                        </div>
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                          {t('customMode.resourceTask')} {t('gameOver.inactive')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testing/Normal Mode Control Buttons */}
        {currentGameMode === 'testing' && (
          <div style={{
            position: 'fixed',
            top: '10px',
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
                {t('common.returnToMenu')} (Ctrl+Q)
              </button>
              <button
                onClick={() => setShowBackgroundSelector(!showBackgroundSelector)}
                style={{
                  padding: '8px 12px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {t('common.background')}
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
                {isEventSidebarOpen ? t('common.hideControls') : t('common.showControls')}
              </button>
            </div>
            {showBackgroundSelector && (
              <div style={{
                position: 'absolute',
                top: '50px',
                right: '0',
                zIndex: 1500
              }}>
                <BackgroundSelector small={true} />
              </div>
            )}
          </div>
        )}

        {/* Settings Sidebar for Testing Mode */}
        {currentGameMode === 'testing' && isEventSidebarOpen && (
          <div className="sidebar">
            <EnhancedSidebar
              // Task settings
              commSettings={{
                eventsPerMinute: commEPM,
                difficulty: commDifficulty,
                isEnabled: isCommTaskEnabled,
                autoEvents: commAutoEvents
              }}
              monitoringSettings={{
                eventsPerMinute: monitoringEPM,
                difficulty: monitoringDifficulty,
                isEnabled: isMonitoringTaskEnabled,
                autoEvents: monitoringAutoEvents
              }}
              trackingSettings={{
                eventsPerMinute: trackingEPM,
                difficulty: trackingDifficulty,
                isEnabled: isTrackingTaskEnabled,
                autoEvents: trackingAutoEvents
              }}
              resourceSettings={{
                eventsPerMinute: resourceEPM,
                difficulty: resourceDifficulty,
                isEnabled: isResourceTaskEnabled,
                autoEvents: resourceAutoEvents
              }}
              // Logs for each task
              monitoringLog={monitoringEventLog}
              commLog={commEventLog}
              trackingLog={trackingEventLog}
              resourceLog={resourceEventLog}
              // Callback functions
              onCommConfigChange={(type, value) => {
                if (type === 'epm') setCommEPM(value);
                if (type === 'difficulty') setCommDifficulty(value);
                if (type === 'autoEvents') setCommAutoEvents(value);
                if (type === 'isEnabled') setIsCommTaskEnabled(value);
              }}
              onMonitoringConfigChange={(type, value) => {
                if (type === 'epm') setMonitoringEPM(value);
                if (type === 'difficulty') setMonitoringDifficulty(value);
                if (type === 'autoEvents') setMonitoringAutoEvents(value);
                if (type === 'isEnabled') setIsMonitoringTaskEnabled(value);
              }}
              onTrackingConfigChange={(type, value) => {
                if (type === 'epm') setTrackingEPM(value);
                if (type === 'difficulty') setTrackingDifficulty(value);
                if (type === 'autoEvents') setTrackingAutoEvents(value);
                if (type === 'isEnabled') setIsTrackingTaskEnabled(value);
              }}
              onResourceConfigChange={(type, value) => {
                if (type === 'epm') setResourceEPM(value);
                if (type === 'difficulty') setResourceDifficulty(value);
                if (type === 'autoEvents') setResourceAutoEvents(value);
                if (type === 'isEnabled') setIsResourceTaskEnabled(value);
              }}
              onSchedulingChange={(change) => {
                const { task, type, value } = change;
                switch (task) {
                  case 'comm':
                    if (type === 'epm') setCommEPM(value);
                    if (type === 'difficulty') setCommDifficulty(value);
                    break;
                  case 'monitoring':
                    if (type === 'epm') setMonitoringEPM(value);
                    if (type === 'difficulty') setMonitoringDifficulty(value);
                    break;
                  case 'tracking':
                    if (type === 'epm') setTrackingEPM(value);
                    if (type === 'difficulty') setTrackingDifficulty(value);
                    break;
                  case 'resource':
                    if (type === 'epm') setResourceEPM(value);
                    if (type === 'difficulty') setResourceDifficulty(value);
                    break;
                  default:
                    break;
                }
              }}
            />
          </div>
        )}

        {/* Add a small background selector button to normal and infinite modes */}
        {(currentGameMode === 'normal' || currentGameMode === 'infinite') && (
          <div style={{
            position: 'fixed',
            top: '10px',
            right: '110px',
            zIndex: 1000
          }}>
            <button
              onClick={() => setShowBackgroundSelector(!showBackgroundSelector)}
              style={{
                padding: '8px 12px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {t('common.background').substring(0, 2).toUpperCase()}
            </button>
            {showBackgroundSelector && (
              <div style={{
                position: 'absolute',
                top: '40px',
                right: '0',
                zIndex: 1500
              }}>
                <BackgroundSelector small={true} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
