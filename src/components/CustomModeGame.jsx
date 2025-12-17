import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import InstructionOverlay from './InstructionOverlay';

const CustomModeGame = ({
  duration,
  taskConfig,
  onGameEnd,
  eventService,
  healthRef
}) => {
  const { t } = useTranslation();

  // Game state
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [score, setScore] = useState(0);
  const [isGameActive, setIsGameActive] = useState(true);

  // Show instructions if key is provided
  const [showInstructions, setShowInstructions] = useState(!!taskConfig.instructionKey);

  const [currentSettings, setCurrentSettings] = useState({
    comm: {
      isEnabled: taskConfig.comm.isActive,
      eventsPerMinute: taskConfig.comm.eventsPerMinute,
      difficulty: taskConfig.comm.difficulty
    },
    monitoring: {
      isEnabled: taskConfig.monitoring.isActive,
      eventsPerMinute: taskConfig.monitoring.eventsPerMinute,
      difficulty: taskConfig.monitoring.difficulty
    },
    tracking: {
      isEnabled: taskConfig.tracking.isActive,
      eventsPerMinute: taskConfig.tracking.eventsPerMinute,
      difficulty: taskConfig.tracking.difficulty
    },
    resource: {
      isEnabled: taskConfig.resource.isActive,
      eventsPerMinute: taskConfig.resource.eventsPerMinute,
      difficulty: taskConfig.resource.difficulty
    }
  });

  // Refs for timers
  const gameTimerRef = useRef(null);
  const scoreTimerRef = useRef(null);
  const epmIntervalRef = useRef(null);
  const difficultyIntervalRef = useRef(null);
  const gameStartTimeRef = useRef(null);

  // Helper to clear all timers
  const clearAllTimers = () => {
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (scoreTimerRef.current) clearInterval(scoreTimerRef.current);
    if (epmIntervalRef.current) clearInterval(epmIntervalRef.current);
    if (difficultyIntervalRef.current) clearInterval(difficultyIntervalRef.current);
  };

  // End game function
  const endGame = () => {
    setIsGameActive(false);
    clearAllTimers();
    eventService.stopScheduler();
    eventService.pauseAllTasks();
  };

  // Initialize game
  useEffect(() => {
    // Wait for instructions to be dismissed
    if (showInstructions) return;

    // Apply initial settings to the event service
    eventService.updateSchedulerSettings(currentSettings);

    // Start scheduler
    eventService.startScheduler();

    // Set start time if not already set
    if (!gameStartTimeRef.current) {
      gameStartTimeRef.current = Date.now();
    }

    // Start game timer
    gameTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
      const remaining = Math.max(0, Math.floor(duration / 1000) - elapsed);
      setTimeRemaining(remaining * 1000);

      if (remaining <= 0) {
        endGame();
      }
    }, 1000);

    // Start score calculation timer (every second)
    scoreTimerRef.current = setInterval(() => {
      if (healthRef.current) {
        const currentHealth = healthRef.current;
        setScore(prevScore => prevScore + currentHealth);
      }
    }, 1000);

    // Setup EPM progression (every 45 seconds)
    epmIntervalRef.current = setInterval(() => {
      setCurrentSettings(prevSettings => {
        const newSettings = {
          comm: {
            ...prevSettings.comm,
            eventsPerMinute: prevSettings.comm.isEnabled ?
              Math.min(10, prevSettings.comm.eventsPerMinute + 1) :
              prevSettings.comm.eventsPerMinute
          },
          monitoring: {
            ...prevSettings.monitoring,
            eventsPerMinute: prevSettings.monitoring.isEnabled ?
              Math.min(10, prevSettings.monitoring.eventsPerMinute + 1) :
              prevSettings.monitoring.eventsPerMinute
          },
          tracking: {
            ...prevSettings.tracking,
            eventsPerMinute: prevSettings.tracking.isEnabled ?
              Math.min(10, prevSettings.tracking.eventsPerMinute + 1) :
              prevSettings.tracking.eventsPerMinute
          },
          resource: {
            ...prevSettings.resource,
            eventsPerMinute: prevSettings.resource.isEnabled ?
              Math.min(10, prevSettings.resource.eventsPerMinute + 1) :
              prevSettings.resource.eventsPerMinute
          }
        };

        // Update event service with new EPM values
        eventService.updateSchedulerSettings(newSettings);

        return newSettings;
      });
    }, 45000); // 45 seconds

    // Setup difficulty progression (every 90 seconds)
    difficultyIntervalRef.current = setInterval(() => {
      setCurrentSettings(prevSettings => {
        const newSettings = {
          comm: {
            ...prevSettings.comm,
            difficulty: prevSettings.comm.isEnabled ?
              Math.min(10, prevSettings.comm.difficulty + 1) :
              prevSettings.comm.difficulty
          },
          monitoring: {
            ...prevSettings.monitoring,
            difficulty: prevSettings.monitoring.isEnabled ?
              Math.min(10, prevSettings.monitoring.difficulty + 1) :
              prevSettings.monitoring.difficulty
          },
          tracking: {
            ...prevSettings.tracking,
            difficulty: prevSettings.tracking.isEnabled ?
              Math.min(10, prevSettings.tracking.difficulty + 1) :
              prevSettings.tracking.difficulty
          },
          resource: {
            ...prevSettings.resource,
            difficulty: prevSettings.resource.isEnabled ?
              Math.min(10, prevSettings.resource.difficulty + 1) :
              prevSettings.resource.difficulty
          }
        };

        // Update event service with new difficulty values
        eventService.updateSchedulerSettings(newSettings);

        return newSettings;
      });
    }, 90000); // 90 seconds

    // Cleanup function
    return () => {
      clearAllTimers();
      eventService.stopScheduler();
      eventService.pauseAllTasks();
    };
  }, [duration, eventService, healthRef, showInstructions]); // Removing currentSettings from deps to avoid re-init loop

  const handleReturnToMenu = () => {
    onGameEnd({
      finalScore: Math.floor(score),
      gameTime: Math.floor(duration / 1000) - Math.floor(timeRemaining / 1000),
      gameMode: 'custom'
    });
  };

  // Format time remaining as mm:ss
  const formatTimeRemaining = () => {
    const totalSeconds = Math.floor(timeRemaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle early quit
  const handleQuit = () => {
    endGame();
  };

  return (
    <div className="custom-mode-hud" style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      pointerEvents: 'none',
      zIndex: 1000
    }}>
      {showInstructions && (
        <InstructionOverlay
          show={showInstructions}
          title={t(`instructionsOverlay.${taskConfig.instructionKey}Title`)}
          content={t(`instructionsOverlay.${taskConfig.instructionKey}`)}
          onStart={() => {
            setShowInstructions(false);
            gameStartTimeRef.current = Date.now();
          }}
        />
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white'
      }}>
        <div>
          <strong>Time: </strong>{formatTimeRemaining()}
        </div>
        <div>
          <strong>Score: </strong>{Math.floor(score)}
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <button
            onClick={handleQuit}
            style={{
              backgroundColor: 'rgba(220, 53, 69, 0.8)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '5px 10px',
              cursor: 'pointer'
            }}
          >
            Quit
          </button>
        </div>
      </div>

      {!isGameActive && !showInstructions && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          color: 'white',
          zIndex: 2000,
          pointerEvents: 'auto'
        }}>
          <div style={{
            backgroundColor: '#1a2a3a',
            padding: '30px',
            borderRadius: '10px',
            textAlign: 'center',
            maxWidth: '80%'
          }}>
            <h2 style={{ marginBottom: '20px' }}>Game Over</h2>
            <p style={{ fontSize: '24px', marginBottom: '10px' }}>Final Score: {Math.floor(score)}</p>
            <p style={{ marginBottom: '30px' }}>This was a Custom Mode game with personalized settings.</p>

            <button
              onClick={handleReturnToMenu}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '10px 20px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Return to Main Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomModeGame;