import React, { useState, useEffect } from 'react';

const Leaderboard = ({ onClose, gameMode = 'normal', score = null, level = null }) => {
  // State for managing leaderboard
  const [activeTab, setActiveTab] = useState(gameMode || 'normal');
  const [normalScores, setNormalScores] = useState([]);
  const [infiniteScores, setInfiniteScores] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(!!score);
  const [lastScore, setLastScore] = useState(score);
  const [lastLevel, setLastLevel] = useState(level);

  // Load scores from localStorage on mount
  useEffect(() => {
    const loadedNormalScores = JSON.parse(localStorage.getItem('normalScores') || '[]');
    const loadedInfiniteScores = JSON.parse(localStorage.getItem('infiniteScores') || '[]');
    
    setNormalScores(loadedNormalScores);
    setInfiniteScores(loadedInfiniteScores);
  }, []);

  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Handle player name input change
  const handleNameChange = (e) => {
    setPlayerName(e.target.value);
  };

  // Save score to leaderboard
  const saveScore = () => {
    if (!lastScore) return;

    const name = playerName.trim() || 'Anonymous';
    const date = new Date().toISOString();
    
    // Create new score object with proper handling of score vs level based on game mode
    const newScore = {
      name,
      score: Number(lastScore) || 0, // Ensure score is numeric
      date,
      level: Number(lastLevel) || 1  // Ensure level is numeric
    };

    console.log(`Saving score for ${activeTab} mode:`, newScore);

    if (activeTab === 'normal') {
      // For normal mode, sort by score (higher is better)
      const updatedScores = [...normalScores, newScore]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Keep only top 10
      
      setNormalScores(updatedScores);
      localStorage.setItem('normalScores', JSON.stringify(updatedScores));
    } else {
      // For infinite mode, sort by score (in seconds, higher is better)
      const updatedScores = [...infiniteScores, newScore]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Keep only top 10
      
      setInfiniteScores(updatedScores);
      localStorage.setItem('infiniteScores', JSON.stringify(updatedScores));
    }

    setShowNameInput(false);
    setLastScore(null);
    setLastLevel(null);
    setPlayerName('');
  };

  // Skip saving score
  const skipSaveScore = () => {
    setShowNameInput(false);
    setLastScore(null);
    setLastLevel(null);
    setPlayerName('');
  };

  // Clear all scores for current mode
  const clearScores = () => {
    if (window.confirm(`Are you sure you want to clear all ${activeTab} mode scores?`)) {
      if (activeTab === 'normal') {
        setNormalScores([]);
        localStorage.setItem('normalScores', '[]');
      } else {
        setInfiniteScores([]);
        localStorage.setItem('infiniteScores', '[]');
      }
    }
  };

  // Format score display based on game mode
  const formatScore = (score, mode) => {
    if (mode === 'normal') {
      // Make sure score is a number before calling toFixed
      const numericScore = Number(score);
      return isNaN(numericScore) ? '0' : numericScore.toFixed(0);
    } else {
      // Format seconds as MM:SS for infinite mode
      const numericScore = Number(score) || 0;
      const minutes = Math.floor(numericScore / 60);
      const seconds = Math.floor(numericScore % 60);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Get current scores based on active tab
  const currentScores = activeTab === 'normal' ? normalScores : infiniteScores;

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h2>Leaderboard</h2>
        
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'normal' ? 'active' : ''}`}
            onClick={() => handleTabChange('normal')}
          >
            Normal Mode
          </button>
          <button 
            className={`tab-button ${activeTab === 'infinite' ? 'active' : ''}`}
            onClick={() => handleTabChange('infinite')}
          >
            Infinite Mode
          </button>
        </div>
      </div>

      {showNameInput && lastScore !== null && (
        <div className="name-input-container">
          <h3>
            {activeTab === 'normal' 
              ? `Your score: ${formatScore(lastScore, activeTab)}` 
              : `You survived for ${formatScore(lastScore, activeTab)}`}
          </h3>
          
          <div className="name-input-field">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={handleNameChange}
              maxLength={20}
            />
          </div>
          
          <div className="name-input-buttons">
            <button className="save-score-button" onClick={saveScore}>
              Save Score
            </button>
            <button className="skip-button" onClick={skipSaveScore}>
              Skip
            </button>
          </div>
        </div>
      )}

      <div className="scores-table-container">
        <table className="scores-table">
          <thead>
            <tr>
              <th className="rank-col">Rank</th>
              <th className="name-col">Name</th>
              <th className="score-col">
                {activeTab === 'normal' ? 'Score' : 'Survival Time'}
              </th>
              <th className="level-col">
                {activeTab === 'normal' ? 'Duration (min)' : 'Difficulty Level'}
              </th>
              <th className="date-col">Date</th>
            </tr>
          </thead>
          <tbody>
            {currentScores.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-scores-message">
                  No scores yet. Be the first to set a record!
                </td>
              </tr>
            ) : (
              currentScores.map((score, index) => (
                <tr 
                  key={`${score.name}-${index}`}
                  className={score.score === lastScore ? 'highlighted-score' : ''}
                >
                  <td>{index + 1}</td>
                  <td>{score.name}</td>
                  <td>{formatScore(score.score, activeTab)}</td>
                  <td>{score.level || 1}</td>
                  <td>{formatDate(score.date)}</td>
                </tr>
              ))
            )}
            {/* Fill empty rows to always show 10 rows */}
            {currentScores.length > 0 && currentScores.length < 10 && (
              Array(10 - currentScores.length).fill().map((_, index) => (
                <tr key={`empty-${index}`} className="empty-row">
                  <td>{currentScores.length + index + 1}</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="leaderboard-footer">
        <button className="close-button" onClick={onClose}>
          Close
        </button>
        
        <button className="clear-scores-button" onClick={clearScores}>
          Clear {activeTab === 'normal' ? 'Normal' : 'Infinite'} Scores
        </button>
      </div>
    </div>
  );
};

export default Leaderboard; 