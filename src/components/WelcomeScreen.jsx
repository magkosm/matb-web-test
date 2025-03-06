import React from 'react';

const WelcomeScreen = ({ onModeSelect }) => {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: 'white'
  };

  const headerStyle = {
    width: '100%',
    backgroundColor: '#e0e0e0',
    padding: '1rem',
    textAlign: 'center',
    marginBottom: '2rem'
  };

  const contentStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2rem',
    padding: '2rem',
    maxWidth: '800px'
  };

  const buttonContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem',
    width: '100%',
    maxWidth: '600px'
  };

  const buttonStyle = {
    padding: '1.5rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    backgroundColor: '#4a90e2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    width: '100%',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1>MATB Task Simulator</h1>
      </div>
      <div style={contentStyle}>
        <h2>Welcome to the Multi-Attribute Task Battery Simulator</h2>
        <p>Please select a mode to begin:</p>
        
        <div style={buttonContainerStyle}>
          <button 
            style={buttonStyle} 
            onClick={() => onModeSelect('training')}
          >
            Training Mode
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => onModeSelect('custom')}
          >
            Custom Training
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => onModeSelect('normal')}
          >
            Normal Mode
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => onModeSelect('infinite')}
          >
            Infinite Mode
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen; 