import React from 'react';

const WelcomeScreen = ({ onModeSelect, onViewLeaderboard, background, onBackgroundChange, Cupola, Columbus, CASA }) => {
  const buttonStyle = {
    padding: '15px 30px',
    margin: '10px',
    fontSize: '18px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#007bff',
    color: 'white',
    transition: 'transform 0.2s, background-color 0.2s',
    width: '250px',
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: 'white',
  };

  const topBarStyle = {
    width: '100%',
    backgroundColor: '#f0f0f0',
    padding: '20px',
    textAlign: 'center',
    marginBottom: '40px',
  };

  const contentStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
  };

  return (
    <div style={containerStyle}>
      <div style={topBarStyle}>
        <h1 style={{ margin: 0, color: '#333' }}>Multi-Attribute Task Battery</h1>
      </div>
      
      <div style={contentStyle}>
        <h2 style={{ marginBottom: '30px', color: '#333' }}>Welcome! Please select a mode to begin:</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label>Background: </label>
          <select value={background} onChange={onBackgroundChange}>
            <option value="white">White</option>
            <option value={Cupola}>Cupola</option>
            <option value={Columbus}>Columbus</option>
            <option value={CASA}>CASA</option>
          </select>
        </div>
        
        <button 
          style={buttonStyle} 
          onClick={() => onModeSelect('training')}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#0056b3';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#007bff';
            e.target.style.transform = 'scale(1)';
          }}
        >
          Training Mode
        </button>
        
        <button 
          style={buttonStyle}
          onClick={() => onModeSelect('normal')}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#0056b3';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#007bff';
            e.target.style.transform = 'scale(1)';
          }}
        >
          Normal Mode
        </button>
        
        <button 
          style={buttonStyle}
          onClick={() => onModeSelect('infinite')}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#0056b3';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#007bff';
            e.target.style.transform = 'scale(1)';
          }}
        >
          Infinite Mode
        </button>
        
        <div style={{ 
          marginTop: '30px', 
          borderTop: '1px solid #ddd',
          paddingTop: '20px',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <button 
            style={{
              ...buttonStyle,
              backgroundColor: '#28a745'
            }}
            onClick={() => onViewLeaderboard('normal')}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#218838';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#28a745';
              e.target.style.transform = 'scale(1)';
            }}
          >
            View Normal Leaderboard
          </button>
          
          <button 
            style={{
              ...buttonStyle,
              backgroundColor: '#28a745'
            }}
            onClick={() => onViewLeaderboard('infinite')}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#218838';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#28a745';
              e.target.style.transform = 'scale(1)';
            }}
          >
            View Infinite Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen; 