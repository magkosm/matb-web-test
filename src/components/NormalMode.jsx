import React, { useState, useEffect, useRef } from 'react';
import Leaderboard from './Leaderboard';

const NormalMode = ({ 
  onGameEnd,
  systemHealthRef,
  isActive,
  onReset,
  defaultDuration = 300 // 5 minutes in seconds
}) => {
  const [timeRemaining, setTimeRemaining] = useState(defaultDuration);
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [duration, setDuration] = useState(defaultDuration);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const endTimeRef = useRef(null);
  const scoreIntervalRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Handle duration change
  const handleDurationChange = (minutes) => {
    const newDuration = minutes * 60;
    setDuration(newDuration);
    setTimeRemaining(newDuration);
  };

  // Start game
  const startGame = () => {
    if (scoreIntervalRef.current) {
      clearInterval(scoreIntervalRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (onReset) onReset();
    endTimeRef.current = Date.now() + duration * 1000;
    setTimeRemaining(duration);
    setScore(0);
    setIsRunning(true);
  };

  // Log health and update score every second
  useEffect(() => {
    if (isRunning && isActive) {
      scoreIntervalRef.current = setInterval(() => {
        const currentHealth = systemHealthRef.current?.healthRef?.current || 0;
        setScore(prevScore => prevScore + currentHealth);
      }, 1000);
    }
    return () => {
      if (scoreIntervalRef.current) {
        clearInterval(scoreIntervalRef.current);
      }
    };
  }, [isRunning, isActive, systemHealthRef]);

  // Handle game timer using requestAnimationFrame
  useEffect(() => {
    const updateTimer = () => {
      if (!isRunning || !isActive || !endTimeRef.current) return;

      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setIsRunning(false);
        if (scoreIntervalRef.current) {
          clearInterval(scoreIntervalRef.current);
        }
        const roundedScore = Math.round(score);
        if (onGameEnd) {
          onGameEnd(roundedScore);
        }
        return;
      }

      animationFrameRef.current = requestAnimationFrame(updateTimer);
    };

    if (isRunning && isActive) {
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, isActive, onGameEnd, score]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scoreIntervalRef.current) {
        clearInterval(scoreIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Leaderboard */}
      <Leaderboard
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        mode="normal"
        currentScore={finalScore}
        isNewScore={finalScore !== null}
      />

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