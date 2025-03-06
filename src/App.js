// src/App.js
import React, { useState, useCallback, useRef, useEffect } from 'react';
import MonitoringTask from './MonitoringTask';
import CommunicationsTask from './CommunicationsTask';
import ResourceManagementTask from './ResourceManagementTask';
import TrackingTask from './TrackingTask';
import SystemHealth from './components/SystemHealth';
import WelcomeScreen from './components/WelcomeScreen';
import CustomTraining from './components/CustomTraining';
import NormalMode from './components/NormalMode';
import InfiniteMode from './components/InfiniteMode';
import Leaderboard from './components/Leaderboard';
import './App.css';

function App() {
  // -------------------------
  // 1) STATE & HANDLERS
  // -------------------------

  // Game mode state
  const [gameMode, setGameMode] = useState(null);
  const [isGameActive, setIsGameActive] = useState(false);

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

  // Add new state for monitoring task enabled/disabled
  const [isMonitoringTaskEnabled, setIsMonitoringTaskEnabled] = useState(true);

  // Add new state for tracking task enabled/disabled
  const [isTrackingTaskEnabled, setIsTrackingTaskEnabled] = useState(true);

  // Add state for tracking difficulty
  const [trackingDifficulty, setTrackingDifficulty] = useState(5);

  // Game modes
  const [currentView, setCurrentView] = useState('main-menu');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState({
    gameMode: 'normal',
    score: null,
    level: null
  });

  // Game mode selection handler
  const handleModeSelect = (mode) => {
    setGameMode(mode);
    
    // Only set isGameActive to true if not in custom mode or normal mode (which need setup first)
    if (mode !== 'custom' && mode !== 'normal') {
      setIsGameActive(true);
    }
    
    // Configure game settings based on mode
    switch(mode) {
      case 'training':
        // Training mode configuration
        setMonitoringEPM(2);
        setCommEPM(1);
        setResourceEPM(1);
        setTrackingEPM(1);
        setResourceDifficulty(3);
        setTrackingDifficulty(3);
        // Enable all tasks in training mode
        setIsMonitoringTaskEnabled(true);
        setIsCommTaskEnabled(true);
        setIsResourceTaskEnabled(true);
        setIsTrackingTaskEnabled(true);
        break;
      case 'custom':
        // Custom training configuration - don't change anything yet
        // User will configure settings in the CustomTraining component
        break;
      case 'normal':
        // Normal mode configuration - don't change anything yet
        // User will configure settings in the NormalMode component
        break;
      case 'infinite':
        // Infinite mode configuration
        setMonitoringEPM(5);
        setCommEPM(4);
        setResourceEPM(4);
        setTrackingEPM(4);
        setResourceDifficulty(8);
        setTrackingDifficulty(8);
        // Enable all tasks in infinite mode
        setIsMonitoringTaskEnabled(true);
        setIsCommTaskEnabled(true);
        setIsResourceTaskEnabled(true);
        setIsTrackingTaskEnabled(true);
        break;
      default:
        break;
    }
  };

  // Handle starting custom training session
  const handleStartCustomTraining = () => {
    setIsGameActive(true);
  };

  // Handle canceling custom training setup
  const handleCancelCustomTraining = () => {
    setGameMode(null);
  };
  
  // Handle normal mode game end
  const handleNormalModeGameEnd = (gameStats) => {
    console.log('Game ended with stats:', gameStats);
    // Here you can implement logic to save scores, show results, etc.
    setIsGameActive(true); // Show the game UI with results
    
    // Optional: Display score in an alert
    alert(`Game Over!\nYour score: ${Math.round(gameStats.score)}\nAverage health: ${Math.round(gameStats.averageHealth)}%`);
    
    // Return to main menu
    setGameMode(null);
    setIsGameActive(false);
  };
  
  // Handle canceling normal mode setup
  const handleCancelNormalMode = () => {
    setGameMode(null);
  };

  // Return to main menu
  const handleReturnToMenu = useCallback(() => {
    setCurrentView('main-menu');
    setShowLeaderboard(false);
  }, []);
  
  // Global keyboard shortcut handler for Ctrl+Q
  const handleKeyDown = useCallback((event) => {
    // Check for Ctrl+Q combination
    if (event.ctrlKey && event.key === 'q') {
      console.log('Ctrl+Q pressed: Returning to main menu');
      handleReturnToMenu();
    }
  }, [handleReturnToMenu]);
  
  // Setup and cleanup keyboard event listeners
  useEffect(() => {
    // Add event listener when component mounts
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up event listener when component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

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

  // References for task components
  const monitoringTaskRef = useRef(null);
  const commTaskRef = useRef(null);
  const resourceTaskRef = useRef(null);
  const trackingTaskRef = useRef(null);
  const systemHealthRef = useRef(null);

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

  // Handle switching to leaderboard with score data
  const handleShowLeaderboard = (gameMode, score, level) => {
    // First hide the other views by setting the current view to null
    // This prevents the overlay issue
    setCurrentView('leaderboard');
    
    // Then set the leaderboard data and show it
    setLeaderboardData({
      gameMode,
      score,
      level
    });
    setShowLeaderboard(true);
  };
  
  // Handle closing the leaderboard
  const handleCloseLeaderboard = () => {
    setShowLeaderboard(false);
    setCurrentView('main-menu');
  };

  // -------------------------
  // 3) RENDER
  // -------------------------
  return (
    <div className="App">
      {/* Main Menu */}
      {currentView === 'main-menu' && (
        <div className="menu-container">
          <h1>MATB-II</h1>
          <p>Multi-Attribute Task Battery</p>
          
          <div className="menu-buttons">
            <button onClick={() => setCurrentView('normal-mode')}>
              Normal Mode
            </button>
            <button onClick={() => setCurrentView('infinite-mode')}>
              Infinite Mode
            </button>
            <button onClick={() => setCurrentView('custom-training')}>
              Custom Training
            </button>
            <button onClick={() => setShowLeaderboard(true)}>
              Leaderboard
            </button>
          </div>
        </div>
      )}
      
      {/* Normal Mode View */}
      {currentView === 'normal-mode' && (
        <NormalMode 
          onBackToMenu={handleReturnToMenu}
          onLeaderboard={handleShowLeaderboard}
        />
      )}
      
      {/* Infinite Mode View */}
      {currentView === 'infinite-mode' && (
        <InfiniteMode 
          onBackToMenu={handleReturnToMenu}
          onLeaderboard={(gameMode, score, level) => handleShowLeaderboard(gameMode, score, level)}
        />
      )}
      
      {/* Custom Training View */}
      {currentView === 'custom-training' && (
        <CustomTraining 
          onBackToMenu={handleReturnToMenu}
        />
      )}
      
      {/* Leaderboard View */}
      {currentView === 'leaderboard' && showLeaderboard && (
        <div className="overlay">
          <div className="shortcut-info">Press Ctrl+Q to return to main menu</div>
          <Leaderboard 
            onClose={handleCloseLeaderboard}
            gameMode={leaderboardData.gameMode}
            score={leaderboardData.score}
            level={leaderboardData.level}
          />
        </div>
      )}
    </div>
  );
}

export default App;
