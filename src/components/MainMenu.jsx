import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Scoreboard from './Scoreboard';
import ScoreboardService from '../services/ScoreboardService';
import BackgroundSelector from './BackgroundSelector';
import BackgroundService from '../services/BackgroundService';
import CustomModeSetup from './CustomModeSetup';

const MainMenu = ({ onStartGame, onExitApp, gameResults }) => {
  const [selectedMode, setSelectedMode] = useState('normal'); // Normal is now default
  const [gameDuration, setGameDuration] = useState(5); // Default 5 minutes
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showOtherModes, setShowOtherModes] = useState(false);
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [showCustomModeSetup, setShowCustomModeSetup] = useState(false);
  const [currentBackground, setCurrentBackground] = useState(BackgroundService.getCurrentBackground());

  // Apply background on component mount
  useEffect(() => {
    const style = BackgroundService.getBackgroundStyle(currentBackground);
    document.body.style.backgroundImage = style.backgroundImage || 'none';
    document.body.style.backgroundColor = style.backgroundColor || '';
    document.body.style.backgroundSize = style.backgroundSize || '';
    document.body.style.backgroundPosition = style.backgroundPosition || '';
    document.body.style.backgroundRepeat = style.backgroundRepeat || '';
  }, [currentBackground]);

  // Handle the combo key press detector for the hidden clear scoreboard feature
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if the combination is pressed (Shift + S + Q)
      if (e.key === 's' && e.shiftKey && e.code === 'KeyS') {
        // We need to verify the Q key state
        const isQPressed = e.getModifierState('AltGraph') || 
                         (e.code === 'KeyQ') || 
                         (document.activeElement?.value?.includes('q'));
        
        if (isQPressed) {
          // Clear all scores
          const cleared = ScoreboardService.clearScores();
          if (cleared) {
            alert('All score records have been cleared.');
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStartGame = () => {
    if (selectedMode === 'custom') {
      setShowCustomModeSetup(true);
    } else {
      onStartGame({
        mode: selectedMode,
        duration: gameDuration * 60 * 1000 // Convert minutes to milliseconds
      });
    }
  };

  const handleCustomModeStart = (customSettings) => {
    setShowCustomModeSetup(false);
    onStartGame({
      mode: 'custom',
      duration: customSettings.duration,
      taskConfig: customSettings.taskConfig
    });
  };

  // Background change handler
  const handleBackgroundChange = (newBackground) => {
    setCurrentBackground(newBackground);
    BackgroundService.saveBackgroundSetting(newBackground);
  };

  // Create Other Game Modes Modal Component
  const OtherGameModesModal = () => (
    <div style={{
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: 'white',
      width: '100%',
      height: '100%',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      pointerEvents: 'auto'
    }}>
      <div style={{
        backgroundColor: '#1a2a3a',
        borderRadius: '10px',
        padding: '20px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
        pointerEvents: 'auto'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Other Game Modes</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            padding: '15px', 
            backgroundColor: 'rgba(0,0,0,0.2)', 
            marginTop: '10px',
            marginBottom: '15px',
            borderRadius: '4px'
          }}>
            <label style={{ 
              marginBottom: '10px', 
              display: 'flex', 
              alignItems: 'center',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: selectedMode === 'testing' ? 'rgba(0, 123, 255, 0.2)' : 'transparent'
            }}>
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
            
            <label style={{ 
              marginBottom: '10px',
              display: 'flex', 
              alignItems: 'center',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: selectedMode === 'infinite' ? 'rgba(0, 123, 255, 0.2)' : 'transparent'
            }}>
              <input 
                type="radio" 
                name="gameMode" 
                value="infinite" 
                checked={selectedMode === 'infinite'} 
                onChange={() => setSelectedMode('infinite')}
                style={{ marginRight: '10px' }}
              />
              Infinite Mode
            </label>
            
            <label style={{ 
              display: 'flex', 
              alignItems: 'center',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: selectedMode === 'custom' ? 'rgba(0, 123, 255, 0.2)' : 'transparent'
            }}>
              <input 
                type="radio" 
                name="gameMode" 
                value="custom" 
                checked={selectedMode === 'custom'} 
                onChange={() => setSelectedMode('custom')}
                style={{ marginRight: '10px' }}
              />
              Custom Mode
            </label>
          </div>
          
          {selectedMode === 'infinite' && (
            <div style={{ padding: '10px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '5px' }}>
              <p style={{ margin: 0, textAlign: 'left' }}>
                In Infinite Mode, you play until your health reaches zero. 
                The difficulty increases faster than in Normal Mode.
                Your score is the time you survive.
              </p>
            </div>
          )}
          
          {selectedMode === 'testing' && (
            <div style={{ padding: '10px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '5px' }}>
              <p style={{ margin: 0, textAlign: 'left' }}>
                Testing Mode allows you to freely experiment with all game components.
                You can enable/disable different tasks and adjust their difficulty.
              </p>
            </div>
          )}
          
          {selectedMode === 'custom' && (
            <div style={{ padding: '10px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '5px' }}>
              <p style={{ margin: 0, textAlign: 'left' }}>
                Custom Mode lets you select which tasks are active and set initial difficulty.
                Once started, difficulty increases over time just like in Normal Mode.
                No leaderboard for custom games.
              </p>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => setShowOtherModes(false)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Create Background Selector Modal Component
  const BackgroundSelectorModal = () => (
    <div style={{
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: 'white',
      width: '100%',
      height: '100%',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      pointerEvents: 'auto'
    }}>
      <div style={{
        backgroundColor: '#1a2a3a',
        borderRadius: '10px',
        padding: '20px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
        pointerEvents: 'auto'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Background Selection</h2>
        
        <BackgroundSelector onClose={() => setShowBackgroundSelector(false)} onBackgroundChange={handleBackgroundChange} />
      </div>
    </div>
  );

  return (
    <div 
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(26, 42, 58, 0.85)', // Semi-transparent background
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
            
            {/* Primary Game Mode - Normal Mode */}
            <div style={{ width: '100%' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: selectedMode === 'normal' ? 'rgba(0, 123, 255, 0.2)' : 'transparent',
                padding: '12px',
                borderRadius: '5px',
                marginBottom: '10px'
              }}>
                <input 
                  type="radio" 
                  id="normalMode"
                  name="gameMode" 
                  value="normal" 
                  checked={selectedMode === 'normal'} 
                  onChange={() => setSelectedMode('normal')}
                  style={{ marginRight: '10px' }}
                />
                <label htmlFor="normalMode" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  Normal Mode
                </label>
              </div>
              
              {selectedMode === 'normal' && (
                <div style={{ width: '100%' }}>
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
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button 
              onClick={() => setShowScoreboard(true)}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.3s',
                zIndex: 1500,
                flex: 1
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#138496'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#17a2b8'}
            >
              High Scores
            </button>
            
            <button 
              onClick={() => setShowOtherModes(true)}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.3s',
                zIndex: 1500,
                flex: 1
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
            >
              Other Game Modes
            </button>
          </div>
          
          <button 
            onClick={() => setShowBackgroundSelector(true)}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
          >
            Change Background
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

        {/* Mini background selector at the bottom */}
        <div style={{ marginTop: '20px' }}>
          <BackgroundSelector small={true} onBackgroundChange={handleBackgroundChange} />
        </div>

        {gameResults && (
          <div style={{ 
            marginTop: '30px', 
            backgroundColor: 'rgba(0,100,0,0.3)', 
            padding: '15px', 
            borderRadius: '5px' 
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Previous Game Results</h3>
            {gameResults.gameMode === 'infinite' ? (
              <p>Time Survived: {Math.floor(gameResults.finalScore / 60)}:{(gameResults.finalScore % 60).toString().padStart(2, '0')}</p>
            ) : (
              <p>Final Score: {Math.floor(gameResults.finalScore)}</p>
            )}
          </div>
        )}
      </div>
      
      {/* Scoreboard modal */}
      {showScoreboard && 
        ReactDOM.createPortal(
          <Scoreboard 
            mode={selectedMode !== 'testing' ? selectedMode : 'normal'} 
            onClose={() => setShowScoreboard(false)} 
          />,
          document.body
        )
      }
      
      {/* Other Game Modes modal */}
      {showOtherModes && 
        ReactDOM.createPortal(
          <OtherGameModesModal />,
          document.body
        )
      }
      
      {/* Background Selector modal */}
      {showBackgroundSelector && 
        ReactDOM.createPortal(
          <BackgroundSelectorModal />,
          document.body
        )
      }
      
      {showCustomModeSetup && 
        <CustomModeSetup 
          onSave={handleCustomModeStart} 
          onCancel={() => setShowCustomModeSetup(false)} 
        />
      }
    </div>
  );
};

export default MainMenu; 