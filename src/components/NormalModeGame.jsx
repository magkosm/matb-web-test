import React, { useState, useEffect, useRef } from 'react';

const NormalModeGame = ({ 
  duration, 
  onGameEnd, 
  eventService,
  healthRef
}) => {
  // Game state
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [score, setScore] = useState(0);
  const [isGameActive, setIsGameActive] = useState(true);
  const [currentSettings, setCurrentSettings] = useState({
    comm: { eventsPerMinute: 2.1, difficulty: 4 },
    monitoring: { eventsPerMinute: 3, difficulty: 4 },
    tracking: { eventsPerMinute: 1.5, difficulty: 4 },
    resource: { eventsPerMinute: 3, difficulty: 1 }
  });
  
  // Refs for timers
  const gameTimerRef = useRef(null);
  const scoreTimerRef = useRef(null);
  const epmIntervalRef = useRef(null);
  const difficultyIntervalRef = useRef(null);
  const gameStartTimeRef = useRef(Date.now());

  // Initialize game
  useEffect(() => {
    // Apply initial settings to the event service
    eventService.updateSchedulerSettings({
      comm: { 
        isEnabled: true,
        eventsPerMinute: currentSettings.comm.eventsPerMinute,
        difficulty: currentSettings.comm.difficulty
      },
      monitoring: { 
        isEnabled: true,
        eventsPerMinute: currentSettings.monitoring.eventsPerMinute,
        difficulty: currentSettings.monitoring.difficulty
      },
      tracking: { 
        isEnabled: true,
        eventsPerMinute: currentSettings.tracking.eventsPerMinute,
        difficulty: currentSettings.tracking.difficulty
      },
      resource: { 
        isEnabled: true,
        eventsPerMinute: currentSettings.resource.eventsPerMinute,
        difficulty: currentSettings.resource.difficulty
      }
    });

    // Start scheduler
    eventService.startScheduler();
    
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
            eventsPerMinute: Math.min(10, prevSettings.comm.eventsPerMinute + 1) 
          },
          monitoring: { 
            ...prevSettings.monitoring,
            eventsPerMinute: Math.min(10, prevSettings.monitoring.eventsPerMinute + 1) 
          },
          tracking: { 
            ...prevSettings.tracking,
            eventsPerMinute: Math.min(10, prevSettings.tracking.eventsPerMinute + 1) 
          },
          resource: { 
            ...prevSettings.resource,
            eventsPerMinute: Math.min(10, prevSettings.resource.eventsPerMinute + 1) 
          }
        };
        
        // Update event service with new EPM values
        eventService.updateSchedulerSettings({
          comm: { 
            isEnabled: true,
            eventsPerMinute: newSettings.comm.eventsPerMinute,
            difficulty: newSettings.comm.difficulty
          },
          monitoring: { 
            isEnabled: true,
            eventsPerMinute: newSettings.monitoring.eventsPerMinute,
            difficulty: newSettings.monitoring.difficulty
          },
          tracking: { 
            isEnabled: true,
            eventsPerMinute: newSettings.tracking.eventsPerMinute,
            difficulty: newSettings.tracking.difficulty
          },
          resource: { 
            isEnabled: true,
            eventsPerMinute: newSettings.resource.eventsPerMinute,
            difficulty: newSettings.resource.difficulty
          }
        });
        
        return newSettings;
      });
    }, 45000); // 45 seconds
    
    // Setup difficulty progression (every 90 seconds)
    difficultyIntervalRef.current = setInterval(() => {
      setCurrentSettings(prevSettings => {
        const newSettings = {
          comm: { 
            ...prevSettings.comm,
            difficulty: Math.min(10, prevSettings.comm.difficulty + 1) 
          },
          monitoring: { 
            ...prevSettings.monitoring,
            difficulty: Math.min(10, prevSettings.monitoring.difficulty + 1) 
          },
          tracking: { 
            ...prevSettings.tracking,
            difficulty: Math.min(10, prevSettings.tracking.difficulty + 1) 
          },
          resource: { 
            ...prevSettings.resource,
            difficulty: Math.min(10, prevSettings.resource.difficulty + 1) 
          }
        };
        
        // Update event service with new difficulty values
        eventService.updateSchedulerSettings({
          comm: { 
            isEnabled: true,
            eventsPerMinute: newSettings.comm.eventsPerMinute,
            difficulty: newSettings.comm.difficulty
          },
          monitoring: { 
            isEnabled: true,
            eventsPerMinute: newSettings.monitoring.eventsPerMinute,
            difficulty: newSettings.monitoring.difficulty
          },
          tracking: { 
            isEnabled: true,
            eventsPerMinute: newSettings.tracking.eventsPerMinute,
            difficulty: newSettings.tracking.difficulty
          },
          resource: { 
            isEnabled: true,
            eventsPerMinute: newSettings.resource.eventsPerMinute,
            difficulty: newSettings.resource.difficulty
          }
        });
        
        return newSettings;
      });
    }, 90000); // 90 seconds
    
    // Cleanup function
    return () => {
      clearAllTimers();
      eventService.stopScheduler();
      eventService.pauseAllTasks();
    };
  }, [duration, eventService, healthRef]);
  
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
    onGameEnd({
      finalScore: score,
      gameTime: Math.floor(duration / 1000) - Math.floor(timeRemaining / 1000)
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
    <div className="normal-mode-hud" style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      pointerEvents: 'none',
      zIndex: 1000
    }}>
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
        <button 
          onClick={handleQuit}
          style={{
            backgroundColor: '#ff5555',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '5px 10px',
            cursor: 'pointer',
            pointerEvents: 'auto'
          }}
        >
          Quit Game
        </button>
      </div>
      
      {!isGameActive && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          fontSize: '24px',
          zIndex: 2000
        }}>
          <h2>Game Over</h2>
          <p>Final Score: {Math.floor(score)}</p>
          <button
            onClick={() => onGameEnd({ finalScore: score })}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '18px',
              marginTop: '20px'
            }}
          >
            Return to Menu
          </button>
        </div>
      )}
    </div>
  );
};

export default NormalModeGame; 