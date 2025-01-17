import React, { useState, useEffect } from 'react';

const Leaderboard = ({ 
  isOpen, 
  onClose, 
  mode, 
  currentScore,
  isNewScore = false
}) => {
  const [scores, setScores] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(isNewScore);

  // Load scores from localStorage on mount
  useEffect(() => {
    const savedScores = localStorage.getItem(`leaderboard_${mode}`);
    if (savedScores) {
      setScores(JSON.parse(savedScores));
    }
  }, [mode]);

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
        </h2>

        {showNameInput && (
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
              <th style={{ padding: '0.5rem' }}>Rank</th>
              <th style={{ padding: '0.5rem' }}>Name</th>
              <th style={{ padding: '0.5rem' }}>{mode === 'normal' ? 'Score' : 'Time'}</th>
              <th style={{ padding: '0.5rem' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, index) => (
              <tr 
                key={index}
                style={{ 
                  borderBottom: '1px solid #ddd',
                  backgroundColor: score.score === currentScore ? '#e6f3ff' : 'transparent'
                }}
              >
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{index + 1}</td>
                <td style={{ padding: '0.5rem' }}>{score.name}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                  {formatScore(score.score)}
                </td>
                <td style={{ padding: '0.5rem', fontSize: '0.9em' }}>
                  {new Date(score.date).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
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