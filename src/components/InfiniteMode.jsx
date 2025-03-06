import React, { useState, useEffect, useRef } from 'react';
import MatbTask from './MatbTask';
import { infiniteModeSettings } from '../config/gameSettings';

const InfiniteMode = ({ onBackToMenu, onLeaderboard }) => {
  // Game state
  const [isRunning, setIsRunning] = useState(false);
  const [health, setHealth] = useState(infiniteModeSettings.initialHealth);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  // Difficulty settings
  const [currentLevel, setCurrentLevel] = useState(1);
  const [eventsPerMinute, setEventsPerMinute] = useState(infiniteModeSettings.initialEventsPerMinute);
  const [difficulty, setDifficulty] = useState(infiniteModeSettings.initialDifficulty);
  
  // Timer for tracking elapsed time
  const timerRef = useRef(null);
  
  // Timer for increasing difficulty
  const difficultyTimerRef = useRef(null);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(difficultyTimerRef.current);
    };
  }, []);
  
  // Update elapsed time
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
      
      // Start difficulty increase timer
      difficultyTimerRef.current = setInterval(() => {
        setCurrentLevel(prevLevel => prevLevel + 1);
        setEventsPerMinute(prevEPM => prevEPM + infiniteModeSettings.eventsPerMinuteIncrement);
        setDifficulty(prevDiff => prevDiff + infiniteModeSettings.difficultyIncrement);
      }, infiniteModeSettings.difficultyIncreaseInterval);
    } else {
      clearInterval(timerRef.current);
      clearInterval(difficultyTimerRef.current);
    }
    
    return () => {
      clearInterval(timerRef.current);
      clearInterval(difficultyTimerRef.current);
    };
  }, [isRunning, startTime]);
  
  // End game when health reaches 0
  useEffect(() => {
    if (health <= 0 && isRunning) {
      endGame();
    }
  }, [health, isRunning]);
  
  // Start the game
  const startGame = () => {
    setHealth(infiniteModeSettings.initialHealth);
    setIsRunning(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    setGameOver(false);
    setCurrentLevel(1);
    setEventsPerMinute(infiniteModeSettings.initialEventsPerMinute);
    setDifficulty(infiniteModeSettings.initialDifficulty);
  };
  
  // End the game
  const endGame = () => {
    setIsRunning(false);
    setGameOver(true);
    clearInterval(timerRef.current);
    clearInterval(difficultyTimerRef.current);
  };
  
  // Handle health changes from MatbTask
  const handleHealthChange = (newHealth) => {
    setHealth(newHealth);
    
    // End game if health reaches zero
    if (newHealth <= 0 && isRunning) {
      endGame();
    }
  };
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Show leaderboard with current score
  const showLeaderboard = () => {
    onLeaderboard('infinite', elapsedTime, difficulty);
  };
  
  return (
    <div className="infinite-mode-container">
      <div className="infinite-mode-settings">
        <h2>Infinite Mode</h2>
        <p>
          Survive as long as possible! Difficulty increases over time.
          Your score is your survival time in seconds.
        </p>
        
        {!isRunning && !gameOver ? (
          <button className="start-button" onClick={startGame}>
            Start Game
          </button>
        ) : null}
        
        {gameOver ? (
          <div className="game-over">
            <h3>Game Over!</h3>
            <p>You survived for: {formatTime(elapsedTime)}</p>
            <p>Level reached: {currentLevel}</p>
            <div className="game-over-buttons">
              <button className="restart-button" onClick={startGame}>
                Play Again
              </button>
              <button className="leaderboard-button" onClick={showLeaderboard}>
                Save Score
              </button>
              <button className="menu-button" onClick={onBackToMenu}>
                Back to Menu
              </button>
            </div>
          </div>
        ) : null}
      </div>
      
      {isRunning && (
        <div className="difficulty-info">
          <div className="difficulty-metric">
            <span className="health-display">Health: {health}%</span>
            <span className="survival-time">Time: {formatTime(elapsedTime)}</span>
          </div>
          <div className="difficulty-metric">
            <span className="difficulty-display">Level: {currentLevel}</span>
            <span>EPM: {eventsPerMinute}</span>
            <span>Difficulty: {difficulty.toFixed(1)}x</span>
          </div>
        </div>
      )}
      
      {isRunning && (
        <MatbTask 
          isActive={isRunning}
          eventsPerMinute={eventsPerMinute}
          difficulty={difficulty}
          onHealthChange={handleHealthChange}
          initialHealth={health}
        />
      )}
      
      {isRunning && (
        <div className="game-controls">
          <button className="menu-button" onClick={endGame}>
            End Game
          </button>
        </div>
      )}
    </div>
  );
};

export default InfiniteMode; 