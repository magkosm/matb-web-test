import React, { useState } from 'react';

const MainMenu = ({ onStartGame, onExitApp }) => {
  const [selectedMode, setSelectedMode] = useState('testing');
  const [gameDuration, setGameDuration] = useState(5); // Default 5 minutes

  const handleStartGame = () => {
    onStartGame({
      mode: selectedMode,
      duration: gameDuration * 60 * 1000 // Convert minutes to milliseconds
    });
  };

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
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-start', 
            backgroundColor: 'rgba(0,0,0,0.3)', 
            padding: '15px', 
            borderRadius: '5px',
            marginBottom: '15px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', alignSelf: 'center' }}>Game Mode</h3>
            
            <label style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
              <input 
                type="radio" 
                name="gameMode" 
                value="testing" 
                checked={selectedMode === 'testing'} 
                onChange={() => setSelectedMode('testing')}
                style={{ marginRight: '10px' }}
              />
              Testing Mode
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="radio" 
                name="gameMode" 
                value="normal" 
                checked={selectedMode === 'normal'} 
                onChange={() => setSelectedMode('normal')}
                style={{ marginRight: '10px' }}
              />
              Normal Mode
            </label>
            
            {selectedMode === 'normal' && (
              <div style={{ marginTop: '15px', width: '100%' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  Game Duration (minutes):
                </label>
                <input 
                  type="number" 
                  min="1" 
                  max="60" 
                  value={gameDuration} 
                  onChange={(e) => setGameDuration(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    color: 'white'
                  }}
                />
              </div>
            )}
          </div>
          
          <button 
            onClick={handleStartGame}
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