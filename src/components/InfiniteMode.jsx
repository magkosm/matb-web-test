import React, { useState, useEffect, useRef } from 'react';

const InfiniteMode = ({ 
  onGameEnd,
  systemHealthRef,
  isActive,
  onReset,
  onUpdateSettings
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [currentEPM, setCurrentEPM] = useState(1);
  const [currentDifficulty, setCurrentDifficulty] = useState(3);
  const startTimeRef = useRef(null);
  const difficultyIntervalRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Start game
  const startGame = () => {
    if (onReset) onReset();
    setSurvivalTime(0);
    setCurrentEPM(1);
    setCurrentDifficulty(3);
    startTimeRef.current = Date.now();
    setIsRunning(true);

    // Set initial settings
    onUpdateSettings({
      monitoringEPM: 2,
      commEPM: 2,
      resourceEPM: 2,
      trackingEPM: 2,
      trackingDifficulty: 4,
      resourceDifficulty: 4
    });
  };

  // Monitor health and update time using requestAnimationFrame
  useEffect(() => {
    const updateGame = () => {
      if (!isRunning || !isActive) return;

      // Check health
      const currentHealth = systemHealthRef.current?.healthRef?.current || 0;
      if (currentHealth <= 0) {
        setIsRunning(false);
        if (onGameEnd) {
          onGameEnd(survivalTime);
        }
        return;
      }

      // Update survival time
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setSurvivalTime(elapsed);
      }

      animationFrameRef.current = requestAnimationFrame(updateGame);
    };

    if (isRunning && isActive) {
      animationFrameRef.current = requestAnimationFrame(updateGame);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, isActive, onGameEnd, survivalTime, systemHealthRef]);

  // Increase difficulty every 30 seconds
  useEffect(() => {
    if (isRunning && isActive) {
      difficultyIntervalRef.current = setInterval(() => {
        setCurrentEPM(prev => {
          const newEPM = Math.min(prev + 0.5, 10);
          onUpdateSettings({
            monitoringEPM: newEPM,
            commEPM: newEPM,
            resourceEPM: newEPM,
            trackingEPM: newEPM
          });
          return newEPM;
        });

        setCurrentDifficulty(prev => {
          const newDifficulty = Math.min(prev + 0.5, 10);
          onUpdateSettings({
            trackingDifficulty: newDifficulty,
            resourceDifficulty: newDifficulty
          });
          return newDifficulty;
        });
      }, 30000);

      return () => {
        if (difficultyIntervalRef.current) {
          clearInterval(difficultyIntervalRef.current);
        }
      };
    }
  }, [isRunning, isActive, onUpdateSettings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (difficultyIntervalRef.current) {
        clearInterval(difficultyIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Pre-game overlay */}
      {!isRunning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1001
        }}>
          <h2 style={{ color: 'white', marginBottom: '2rem' }}>Infinite Mode</h2>
          <div style={{ color: 'white', marginBottom: '2rem', textAlign: 'center' }}>
            <p>Survive as long as possible!</p>
            <p>Difficulty increases every 30 seconds</p>
          </div>
          <button
            onClick={startGame}
            style={{
              padding: '10px 30px',
              fontSize: '1.2rem',
              borderRadius: '5px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            Start Game
          </button>
        </div>
      )}

      {/* Game overlay */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '5px',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div>
          Time: {formatTime(survivalTime)}
        </div>
        <div>
          EPM: {currentEPM.toFixed(1)}
        </div>
        <div>
          Difficulty: {currentDifficulty.toFixed(1)}
        </div>
      </div>
    </>
  );
};

export default InfiniteMode; 