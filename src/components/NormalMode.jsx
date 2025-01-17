import React, { useState, useEffect, useRef } from 'react';

const NormalMode = ({ 
  onGameEnd,
  systemHealthRef,
  isActive,
  onReset,
  defaultDuration = 300 // 5 minutes in seconds
}) => {
  const [timeRemaining, setTimeRemaining] = useState(defaultDuration);
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false); // Don't start automatically
  const [duration, setDuration] = useState(defaultDuration);
  const timerRef = useRef(null);
  const scoreIntervalRef = useRef(null);

  // Handle duration change
  const handleDurationChange = (minutes) => {
    const newDuration = minutes * 60;
    setDuration(newDuration);
    setTimeRemaining(newDuration);
  };

  // Start game
  const startGame = () => {
    if (onReset) onReset();
    setTimeRemaining(duration);
    setScore(0);
    setIsRunning(true);
  };

  // Log health and update score every second
  useEffect(() => {
    if (isRunning && isActive) {
      scoreIntervalRef.current = setInterval(() => {
        const currentHealth = systemHealthRef.current?.healthRef?.current || 0;
        // Add current health to score (health per second = score points)
        setScore(prevScore => prevScore + currentHealth);
      }, 1000);
    }
    return () => {
      if (scoreIntervalRef.current) {
        clearInterval(scoreIntervalRef.current);
      }
    };
  }, [isRunning, isActive, systemHealthRef]);

  // Handle game timer
  useEffect(() => {
    if (isRunning && isActive) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Game over
            setIsRunning(false);
            clearInterval(timerRef.current);
            if (onGameEnd) {
              onGameEnd(score);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Cleanup
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [isRunning, isActive, onGameEnd]);

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
          <h2 style={{ color: 'white', marginBottom: '2rem' }}>Normal Mode</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            alignItems: 'center' 
          }}>
            <div style={{ color: 'white' }}>
              Select Duration:
              <select 
                value={duration / 60}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                style={{
                  marginLeft: '1rem',
                  padding: '5px',
                  borderRadius: '3px'
                }}
              >
                <option value="1">1 min</option>
                <option value="3">3 min</option>
                <option value="5">5 min</option>
                <option value="10">10 min</option>
              </select>
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
        </div>
      )}

      {/* Timer and Score overlay */}
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
          Time: {formatTime(timeRemaining)}
        </div>
        <div>
          Score: {Math.round(score)}
        </div>
      </div>
    </>
  );
};

export default NormalMode; 