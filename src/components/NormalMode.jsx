import React, { useState, useEffect, useRef } from 'react';
import MatbTask from './MatbTask';
import { normalModeSettings, calculateNormalModeEPM, calculateNormalModeDifficulty } from '../config/gameSettings';

const NormalMode = ({ onBackToMenu, onLeaderboard }) => {
  // Game state
  const [isRunning, setIsRunning] = useState(false);
  const [health, setHealth] = useState(normalModeSettings.initialHealth);
  const [gameDuration, setGameDuration] = useState(normalModeSettings.defaultGameDuration); // Default game duration
  const [timeRemaining, setTimeRemaining] = useState(gameDuration * 60); // in seconds
  const [showSettings, setShowSettings] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  
  // Scoring state
  const [currentScore, setCurrentScore] = useState(0);
  const [healthLogs, setHealthLogs] = useState([]);
  
  // Timer references
  const gameTimerId = useRef(null);
  const healthLogTimerId = useRef(null);
  // Create a ref to track the current health value more reliably
  const currentHealthRef = useRef(normalModeSettings.initialHealth);
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearInterval(gameTimerId.current);
      clearInterval(healthLogTimerId.current);
    };
  }, []);
  
  // Start the game
  const startGame = () => {
    currentHealthRef.current = normalModeSettings.initialHealth; // Reset health ref
    setHealth(normalModeSettings.initialHealth);
    setTimeRemaining(gameDuration * 60);
    setHealthLogs([]);
    setCurrentScore(0); // Reset score at start
    setIsRunning(true);
    setShowSettings(false);
    setGameOver(false);
    
    // Start game timer
    gameTimerId.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          endGame(true); // Pass true to indicate natural end
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Start health logging
    startHealthLogging();
  };
  
  // Pause the game
  const pauseGame = () => {
    setIsPaused(true);
    clearInterval(gameTimerId.current);
    clearInterval(healthLogTimerId.current);
  };
  
  // Resume the game
  const resumeGame = () => {
    setIsPaused(false);
    
    // Resume game timer
    gameTimerId.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          endGame(true); // Pass true to indicate natural end
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Resume health logging
    startHealthLogging();
  };
  
  // End the game
  const endGame = (naturalEnd = false) => {
    // Clear timers first
    clearInterval(gameTimerId.current);
    clearInterval(healthLogTimerId.current);
    
    // Ensure final score is calculated correctly - use the latest values
    const finalScore = currentScore;
    console.log("Game ended with score:", finalScore, "Final health:", currentHealthRef.current);
    
    // Update state
    setIsRunning(false);
    setIsPaused(false);
    setGameOver(true);
    
    // We'll no longer automatically show the leaderboard
    // Let the user decide when to show it by clicking the Save Score button
  };
  
  // Log health every second and add to score
  const startHealthLogging = () => {
    // Reset logs and score when starting
    setHealthLogs([]);
    setCurrentScore(0);
    
    healthLogTimerId.current = setInterval(() => {
      // Use the health value from the ref instead of the state
      const currentHealthValue = Math.max(0, Math.round(currentHealthRef.current));
      
      // Add to health logs
      setHealthLogs(prevLogs => [...prevLogs, currentHealthValue]);
      
      // Add current health to the score
      setCurrentScore(prevScore => {
        const newScore = prevScore + currentHealthValue;
        // Log inside the state updater to get the actual values being used
        console.log(`Health from ref: ${currentHealthValue}, Score updated: ${prevScore} + ${currentHealthValue} = ${newScore}`);
        return newScore;
      });
    }, normalModeSettings.scoreUpdateInterval);
  };
  
  // Handle health changes from MatbTask
  const handleHealthChange = (newHealth) => {
    const safeHealth = Math.max(0, newHealth);
    if (Math.abs(safeHealth - health) > 0.5) {  // Only log significant changes
      console.log(`HEALTH CHANGED: ${Math.round(health)} -> ${Math.round(safeHealth)}`);
    }
    // Update both the state and the ref
    currentHealthRef.current = safeHealth;
    setHealth(safeHealth);
  };
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Show leaderboard with current score
  const showLeaderboard = () => {
    // Make sure we have the latest score
    const finalScore = currentScore;
    console.log("Showing leaderboard with score:", finalScore);
    
    // For normal mode: score is the accumulated health, level is the game duration in minutes
    onLeaderboard('normal', finalScore, gameDuration);
  };
  
  return (
    <div className="normal-mode-container">
      {showSettings ? (
        <div className="normal-mode-settings">
          <h2>Normal Mode Settings</h2>
          <p>Play a timed game with scoring based on your system health.</p>
          
          <div className="setting-section">
            <h3>Game Duration</h3>
            <div className="duration-setting">
              <label>Minutes: </label>
              <div className="duration-controls">
                <button 
                  className="duration-btn"
                  onClick={() => setGameDuration(prev => Math.max(1, prev - 1))}
                >
                  -
                </button>
                <span className="duration-display">{gameDuration}</span>
                <button 
                  className="duration-btn"
                  onClick={() => setGameDuration(prev => Math.min(20, prev + 1))}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          
          <div className="info-section">
            <h3>How Scoring Works</h3>
            <p>
              Your score is calculated by summing your system health percentage every second.
              Higher health means higher scores. Focus on maintaining high system health by
              responding quickly to all tasks.
            </p>
          </div>
          
          <div className="button-container">
            <button className="cancel-button" onClick={onBackToMenu}>
              Cancel
            </button>
            <button className="start-button" onClick={startGame}>
              Start Game
            </button>
          </div>
        </div>
      ) : (
        <div className="game-interface">
          <div className="game-header">
            <div className="timer">Time: {formatTime(timeRemaining)}</div>
            <div className="score">Score: {Math.round(currentScore)}</div>
            <div className="health-display" style={{ 
              color: health < 80 ? (health < 50 ? 'red' : 'orange') : 'green',
              fontWeight: 'bold'
            }}>
              Health: {Math.round(health)}%
            </div>
            <div className="controls">
              {isPaused ? (
                <button className="resume-button" onClick={resumeGame}>
                  Resume
                </button>
              ) : (
                <button className="pause-button" onClick={pauseGame}>
                  Pause
                </button>
              )}
              <button className="end-button" onClick={endGame}>
                End Game
              </button>
            </div>
          </div>
          
          {isPaused && (
            <div className="pause-overlay">
              <div className="pause-modal">
                <h2>Game Paused</h2>
                <p>Current Score: {Math.round(currentScore)}</p>
                <p>Time Remaining: {formatTime(timeRemaining)}</p>
                <button className="resume-button" onClick={resumeGame}>
                  Resume Game
                </button>
                <button className="end-button" onClick={endGame}>
                  End Game
                </button>
              </div>
            </div>
          )}
          
          {isRunning && !isPaused && (
            <MatbTask 
              isActive={true}
              eventsPerMinute={calculateNormalModeEPM(gameDuration)}
              difficulty={calculateNormalModeDifficulty(gameDuration)}
              onHealthChange={handleHealthChange}
              initialHealth={currentHealthRef.current}
            />
          )}
          
          {gameOver && (
            <div className="game-over">
              <h3>Game Over!</h3>
              <p>Your score: {Math.round(currentScore)}</p>
              <p>Average health: {Math.round(currentScore / healthLogs.length)}%</p>
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
          )}
        </div>
      )}
    </div>
  );
};

export default NormalMode; 