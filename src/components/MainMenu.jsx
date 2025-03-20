import React from 'react';

const MainMenu = ({ onStartGame, onExitApp }) => {
  return (
    <div 
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a2a3a',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div 
        style={{
          background: 'rgba(0,0,0,0.7)',
          padding: '40px',
          borderRadius: '10px',
          textAlign: 'center',
          maxWidth: '500px',
          width: '80%'
        }}
      >
        <h1 style={{ fontSize: '36px', marginBottom: '20px' }}>MATB-II Simulation</h1>
        <p style={{ fontSize: '16px', marginBottom: '30px' }}>
          Multi-Attribute Task Battery for Human-Automation Interaction Research
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button 
            onClick={onStartGame}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0069d9'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            Start Simulation
          </button>
          
          <button 
            onClick={onExitApp}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: 'transparent',
              color: 'white',
              border: '1px solid #6c757d',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = 'rgba(108, 117, 125, 0.2)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            Exit
          </button>
        </div>
        
        <div style={{ marginTop: '30px', fontSize: '14px', opacity: 0.7 }}>
          <p>Press 'Start Simulation' to begin</p>
          <p>During simulation, press Ctrl+Q to return to this menu</p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu; 