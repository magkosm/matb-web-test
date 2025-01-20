import React, { useState, useEffect } from 'react';

const Leaderboard = ({ 
  isOpen, 
  onClose, 
  mode, 
  currentScore,
  isNewScore = false,
  isViewOnly = false
}) => {
  const [scores, setScores] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(isNewScore);
  const [adminMode, setAdminMode] = useState(false);

  // Reset state when leaderboard opens/closes
  useEffect(() => {
    if (isOpen && isNewScore) {
      setShowNameInput(true);
      setPlayerName('');
    }
  }, [isOpen, isNewScore]);

  // Load scores from localStorage
  useEffect(() => {
    const storageKey = `leaderboard_${mode}`;
    const savedScores = localStorage.getItem(storageKey);
    if (savedScores) {
      setScores(JSON.parse(savedScores));
    }
  }, [mode]);

  // Add keyboard event listener for admin mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'e') {
        setAdminMode(prev => !prev);
        console.log('Admin mode:', !adminMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adminMode]);

  // Handle score submission
  const handleSubmitScore = () => {
    if (!playerName.trim()) return;

    const newScore = {
      name: playerName,
      score: currentScore,
      date: new Date().toISOString()
    };

    const updatedScores = [...scores, newScore]
      .sort((a, b) => mode === 'normal' ? b.score - a.score : b.score - a.score)
      .slice(0, 10); // Keep top 10

    setScores(updatedScores);
    localStorage.setItem(`leaderboard_${mode}`, JSON.stringify(updatedScores));
    setShowNameInput(false);
  };

  // Format score based on mode
  const formatScore = (score) => {
    if (mode === 'normal') {
      return Math.round(score).toLocaleString();
    } else {
      // Format time for infinite mode
      const mins = Math.floor(score / 60);
      const secs = score % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // Function to remove specific score
  const handleRemoveScore = (scoreToRemove) => {
    const storageKey = `leaderboard_${mode}`;
    
    // Get current scores from localStorage
    const currentScores = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Filter out the score to remove
    const updatedScores = currentScores.filter(score => 
      score.id !== scoreToRemove.id || 
      score.name !== scoreToRemove.name || 
      score.score !== scoreToRemove.score
    );
    
    // Update localStorage
    localStorage.setItem(storageKey, JSON.stringify(updatedScores));
    
    // Update state
    setScores(updatedScores);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '10px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {mode === 'normal' ? 'Normal Mode' : 'Infinite Mode'} Leaderboard
          {isViewOnly && ' (View Only)'}
          {adminMode && ' (Admin Mode)'}
        </h2>

        {showNameInput && !isViewOnly && (
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h3>New {mode === 'normal' ? 'Score' : 'Time'}: {formatScore(currentScore)}</h3>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              style={{
                padding: '0.5rem',
                marginRight: '1rem',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            />
            <button
              onClick={handleSubmitScore}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Submit
            </button>
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.5rem', textAlign: 'center' }}>Rank</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '0.5rem', textAlign: 'center' }}>
                {mode === 'normal' ? 'Score' : 'Time'}
              </th>
              {adminMode && <th style={{ padding: '0.5rem', width: '50px' }}></th>}
            </tr>
          </thead>
          <tbody>
            {scores.map((score, index) => (
              <tr key={`${score.id}-${score.name}-${score.score}`} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{index + 1}</td>
                <td style={{ padding: '0.5rem', textAlign: 'left' }}>{score.name}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  {formatScore(score.score)}
                </td>
                {adminMode && (
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveScore(score);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'red',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: '0 5px'
                      }}
                      title="Remove entry"
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard; 