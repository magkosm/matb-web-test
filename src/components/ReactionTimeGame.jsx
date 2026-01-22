import React, { useState, useCallback, useEffect } from 'react';
import ReactionTimeTest from './ReactionTimeTest';
import BackgroundService from '../services/BackgroundService';
import { useTranslation } from 'react-i18next';

const ReactionTimeGame = ({ 
  maxStimuli = 10, 
  minDelay = 1500, 
  maxDelay = 8000,
  onReturn
}) => {
  const { t } = useTranslation();
  const [gameResults, setGameResults] = useState(null);
  const [isConfigScreen, setIsConfigScreen] = useState(true);
  const [customStimuli, setCustomStimuli] = useState(maxStimuli);
  const [customMinDelay, setCustomMinDelay] = useState(minDelay);
  const [customMaxDelay, setCustomMaxDelay] = useState(maxDelay);
  const [limitMode, setLimitMode] = useState('stimuli'); // 'stimuli' or 'time'
  const [customDuration, setCustomDuration] = useState(60000); // 1 minute default for time limit

  // Apply background on component mount to ensure consistency with main app
  useEffect(() => {
    console.log('ReactionTimeGame: Initializing game component');
    const currentBackground = BackgroundService.getCurrentBackground();
    const style = BackgroundService.getBackgroundStyle(currentBackground);
    document.body.style.backgroundImage = style.backgroundImage || 'none';
    document.body.style.backgroundColor = style.backgroundColor || '';
    document.body.style.backgroundSize = style.backgroundSize || '';
    document.body.style.backgroundPosition = style.backgroundPosition || '';
    document.body.style.backgroundRepeat = style.backgroundRepeat || '';
    
    return () => {
      console.log('ReactionTimeGame: Component unmounting');
    };
  }, []);

  const handleReturnToMenu = useCallback(() => {
    console.log('ReactionTimeGame: Returning to main menu');
    if (onReturn) {
      onReturn(gameResults);
    }
  }, [onReturn, gameResults]);

  // Add keyboard shortcut (Ctrl+Q) to exit to main menu
  useEffect(() => {
    console.log('ReactionTimeGame: Setting up keyboard shortcuts');
    const handleKeyDown = (e) => {
      // Ctrl+Q to exit to main menu
      if (e.ctrlKey && e.key === 'q') {
        console.log('ReactionTimeGame: Ctrl+Q detected, returning to main menu');
        e.preventDefault();
        handleReturnToMenu();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGameFinished = useCallback((results) => {
    console.log('ReactionTimeGame: Game finished with results:', results);
    setGameResults(results);
  }, []);

  const handleStartCustomGame = useCallback(() => {
    console.log('ReactionTimeGame: Starting custom game with settings:', {
      limitMode,
      maxStimuli: limitMode === 'stimuli' ? customStimuli : 9999,
      duration: limitMode === 'time' ? customDuration : (customStimuli * (customMaxDelay + 1000) + 10000), // High duration buffer for stimuli mode
      minDelay: customMinDelay,
      maxDelay: customMaxDelay
    });
    setIsConfigScreen(false);
  }, [limitMode, customStimuli, customDuration, customMinDelay, customMaxDelay]);

  const handleReturnToConfig = useCallback(() => {
    console.log('ReactionTimeGame: Returning to configuration screen');
    setGameResults(null);
    setIsConfigScreen(true);
  }, []);

  // Configuration screen
  if (isConfigScreen) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center',
        backgroundColor: 'rgba(26, 42, 58, 0.85)', // Semi-transparent background to match main app
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          padding: '40px',
          borderRadius: '10px',
          maxWidth: '500px',
          width: '80%'
        }}>
          <h1>{t('reactionTest.configTitle', 'Reaction Time Test Configuration')}</h1>
          
          <div style={{ width: '100%', maxWidth: '500px', margin: '20px 0' }}>
            
            {/* Limit Mode Selection */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="limitMode"
                  value="stimuli"
                  checked={limitMode === 'stimuli'}
                  onChange={() => setLimitMode('stimuli')}
                  style={{ marginRight: '8px' }}
                />
                {t('reactionTest.limitByStimuli', 'Limit by Stimuli')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="limitMode"
                  value="time"
                  checked={limitMode === 'time'}
                  onChange={() => setLimitMode('time')}
                  style={{ marginRight: '8px' }}
                />
                {t('reactionTest.limitByTime', 'Limit by Time')}
              </label>
            </div>

            {limitMode === 'stimuli' ? (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                {t('reactionTest.stimuliCount', 'Number of Stimuli')}:
              </label>
              <input 
                type="range" 
                min="5" 
                max="30" 
                step="1"
                value={customStimuli} 
                onChange={(e) => setCustomStimuli(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <span>{customStimuli} {t('reactionTest.stimuli', 'stimuli')}</span>
            </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  {t('reactionTest.duration', 'Test Duration (seconds)')}:
                </label>
                <input 
                  type="range" 
                  min="30" 
                  max="300" 
                  step="10"
                  value={customDuration / 1000} 
                  onChange={(e) => setCustomDuration(parseInt(e.target.value) * 1000)}
                  style={{ width: '100%' }}
                />
                <span>{customDuration / 1000} {t('common.seconds', 'seconds')}</span>
              </div>
            )}
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                {t('reactionTest.minDelay', 'Minimum Delay (seconds)')}:
              </label>
              <input 
                type="range" 
                min="0.5" 
                max="5" 
                step="0.1"
                value={customMinDelay / 1000} 
                onChange={(e) => {
                  const value = parseFloat(e.target.value) * 1000;
                  setCustomMinDelay(value);
                  if (value >= customMaxDelay) {
                    setCustomMaxDelay(value + 500);
                  }
                }}
                style={{ width: '100%' }}
              />
              <span>{(customMinDelay / 1000).toFixed(1)} {t('common.seconds', 'seconds')}</span>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                {t('reactionTest.maxDelay', 'Maximum Delay (seconds)')}:
              </label>
              <input 
                type="range" 
                min="1.5" 
                max="10" 
                step="0.1"
                value={customMaxDelay / 1000} 
                onChange={(e) => {
                  const value = parseFloat(e.target.value) * 1000;
                  setCustomMaxDelay(value);
                  if (value <= customMinDelay) {
                    setCustomMinDelay(value - 500);
                  }
                }}
                style={{ width: '100%' }}
              />
              <span>{(customMaxDelay / 1000).toFixed(1)} {t('common.seconds', 'seconds')}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
            <button 
              onClick={handleStartCustomGame}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '10px 20px',
                fontSize: '16px',
                cursor: 'pointer',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              {t('reactionTest.startTest', 'Start Test')}
            </button>
            
            <button 
              onClick={handleReturnToMenu}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                padding: '10px 20px',
                fontSize: '16px',
                cursor: 'pointer',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              {t('common.returnToMenu', 'Return to Main Menu')}
            </button>
          </div>
          
          <div style={{ marginTop: '30px', fontSize: '14px', opacity: 0.7 }}>
            <p>{t('reactionTest.pressCtrlQToReturn', 'Press Ctrl+Q to return to the main menu at any time')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Game results screen is now handled by the ReactionTimeTest component
  
  // Render the actual game
  return (
    <ReactionTimeTest
      duration={limitMode === 'time' ? customDuration : (customStimuli * (customMaxDelay + 1000) + 10000)}
      maxStimuli={limitMode === 'stimuli' ? customStimuli : 9999}
      minDelay={customMinDelay}
      maxDelay={customMaxDelay}
      onFinish={handleGameFinished}
      onReturn={handleReturnToConfig}
    />
  );
};

export default ReactionTimeGame; 