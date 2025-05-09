import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Scoreboard from './Scoreboard';
import ScoreboardService from '../services/ScoreboardService';
import BackgroundSelector from './BackgroundSelector';
import BackgroundService from '../services/BackgroundService';
import CustomModeSetup from './CustomModeSetup';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

const MainMenu = ({ onStartGame, onExitApp, gameResults }) => {
  const { t } = useTranslation();
  const [selectedMode, setSelectedMode] = useState('normal'); // Normal is now default
  const [gameDuration, setGameDuration] = useState(5); // Default 5 minutes
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showOtherModes, setShowOtherModes] = useState(false);
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [showCustomModeSetup, setShowCustomModeSetup] = useState(false);
  // We're tracking pressed keys for the hidden clear scoreboard feature
  const [_, setKeysPressed] = useState(new Set());
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
      // Add the key to the set of pressed keys
      setKeysPressed(prev => {
        const updated = new Set(prev);
        updated.add(e.key);
        
        // Check if the combination is pressed (Shift + S + Q)
        if (
          updated.has('Shift') && 
          updated.has('s') && 
          updated.has('q')
        ) {
          // Clear all scores
          const cleared = ScoreboardService.clearScores();
          if (cleared) {
            alert('All score records have been cleared.');
          }
          
          // Reset the key tracking
          return new Set();
        }
        
        return updated;
      });
    };
    
    const handleKeyUp = (e) => {
      // Remove the key from the set of pressed keys
      setKeysPressed(prev => {
        const updated = new Set(prev);
        updated.delete(e.key);
        return updated;
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
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

  // Handler for reaction time test button
  const handleStartReactionTest = () => {
    window.location.href = `${process.env.PUBLIC_URL}/reaction`;
  };
  
  // Handler for n-back test button
  const handleStartNbackTest = () => {
    window.location.href = `${process.env.PUBLIC_URL}/nback`;
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
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>{t('mainMenu.otherModes')}</h2>
        
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
              {t('mainMenu.testingMode')}
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
              {t('mainMenu.infiniteMode')}
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
              {t('mainMenu.customMode')}
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
            {t('common.cancel')}
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
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>{t('backgroundSelector.title')}</h2>
        
        <BackgroundSelector onClose={() => setShowBackgroundSelector(false)} />
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
        <h1 style={{ fontSize: '36px', marginBottom: '20px' }}>{t('mainMenu.title')}</h1>
        <p style={{ fontSize: '16px', marginBottom: '30px' }}>
          {t('mainMenu.subtitle')}
        </p>
        
        <LanguageSelector />
        
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
            <h3 style={{ marginTop: 0, marginBottom: '10px', alignSelf: 'center' }}>{t('mainMenu.gameModeDescription')}</h3>
            
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
                  {t('mainMenu.normalMode')}
                </label>
              </div>
              
              {selectedMode === 'normal' && (
                <div style={{ width: '100%' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>
                    {t('common.duration')} ({t('common.minutes')}):
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
            {t('common.start')}
          </button>
          
          {/* Add Reaction Time Test button */}
          <button 
            onClick={handleStartReactionTest}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#9c27b0', // Purple color for distinction
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#7B1FA2'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#9c27b0'}
          >
            {t('reactionTest.title', 'Reaction Time Test')}
          </button>

          {/* Quick Launch button for Reaction Time Test */}
          <button 
            onClick={() => window.location.href = `${process.env.PUBLIC_URL}/reaction-default`}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#7B1FA2', // Darker purple for quick launch
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.3s',
              marginTop: '5px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#6A1B9A'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#7B1FA2'}
          >
            {t('reactionTest.quickStart', 'Quick Start Reaction Test')}
          </button>
          
          {/* Add N-Back Test button */}
          <button 
            onClick={handleStartNbackTest}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#FF9800', // Orange color for distinction
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.3s',
              marginTop: '10px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#F57C00'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#FF9800'}
          >
            {t('nbackTest.title', 'N-Back Test')}
          </button>

          {/* Quick Launch button for N-Back Test */}
          <button 
            onClick={() => window.location.href = `${process.env.PUBLIC_URL}/nbackdefault`}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#F57C00', // Darker orange for quick launch
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.3s',
              marginTop: '5px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#EF6C00'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#F57C00'}
          >
            {t('nbackTest.quickStart', 'Quick Start N-Back Test')}
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
              {t('mainMenu.scoreboard')}
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
              {t('mainMenu.otherModes')}
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
            {t('mainMenu.changeBackground')}
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
            {t('common.exit')}
          </button>
        </div>
        
        <div style={{ marginTop: '30px', fontSize: '14px', opacity: 0.7 }}>
          <p>{t('mainMenu.pressStartToBegin')}</p>
          <p>{t('mainMenu.pressCtrlQToReturn')}</p>
        </div>

        {/* Mini background selector at the bottom */}
        <div style={{ marginTop: '20px' }}>
          <BackgroundSelector small={true} />
        </div>
        
        {gameResults && (
          <div style={{ 
            marginTop: '30px', 
            backgroundColor: 'rgba(0,100,0,0.3)', 
            padding: '15px', 
            borderRadius: '5px' 
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{t('gameOver.score')}</h3>
            {gameResults.gameMode === 'infinite' ? (
              <p>{t('scoreboard.timeSurvived')}: {Math.floor(gameResults.finalScore / 60)}:{(gameResults.finalScore % 60).toString().padStart(2, '0')}</p>
            ) : (
              <p>{t('scoreboard.finalScore')}: {Math.floor(gameResults.finalScore)}</p>
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