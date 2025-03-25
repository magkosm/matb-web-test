import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import ScoreboardService from '../services/ScoreboardService';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

// Debug flag - set to false to disable debug UI and logging
const DEBUG_MODE = true;

// Helper Functions
function generateDesign(n, dim1targs, dim2targs, bothtargs, trials) {
  // First n trials must be non-targets since they're the memorization phase
  let baseDesign = Array(n).fill([0, 0]);
  const maxPossibleTargets = trials - n;

  // Ensure we don't have more targets than possible positions
  dim1targs = Math.min(dim1targs, maxPossibleTargets);
  dim2targs = Math.min(dim2targs, maxPossibleTargets - dim1targs);
  bothtargs = Math.min(bothtargs, maxPossibleTargets - dim1targs - dim2targs);

  // Create empty slots for the remaining trials
  const remainingTrials = trials - n;
  const restOfDesign = Array(remainingTrials).fill(null);
  
  // Distribute the different types of trials evenly throughout
  const targetPositions = {
    dim1: [], // For letter targets
    dim2: [], // For position targets
    both: [], // For dual targets
    none: []  // For non-targets
  };
  
  // Generate random positions for each target type, ensuring they're distributed
  function getRandomPositions(count, maxPos, exclude = []) {
    const available = Array.from({length: maxPos}, (_, i) => i)
      .filter(pos => !exclude.includes(pos));
      
    // Shuffle available positions
    available.sort(() => Math.random() - 0.5);
    
    // Take the first 'count' positions
    return available.slice(0, count);
  }
  
  // Get positions for each target type (evenly distributed)
  targetPositions.both = getRandomPositions(bothtargs, remainingTrials);
  
  // Get positions for dim1 targets, excluding positions already used
  targetPositions.dim1 = getRandomPositions(
    dim1targs, 
    remainingTrials,
    targetPositions.both
  );
  
  // Get positions for dim2 targets, excluding positions already used
  targetPositions.dim2 = getRandomPositions(
    dim2targs, 
    remainingTrials,
    [...targetPositions.both, ...targetPositions.dim1]
  );
  
  // The remaining positions are non-targets
  targetPositions.none = Array.from({length: remainingTrials}, (_, i) => i)
    .filter(pos => 
      !targetPositions.both.includes(pos) && 
      !targetPositions.dim1.includes(pos) && 
      !targetPositions.dim2.includes(pos)
    );
  
  // Fill the design with appropriate targets
  targetPositions.both.forEach(pos => {
    restOfDesign[pos] = [1, 1]; // Both dimensions match
  });
  
  targetPositions.dim1.forEach(pos => {
    restOfDesign[pos] = [1, 0]; // Letter matches
  });
  
  targetPositions.dim2.forEach(pos => {
    restOfDesign[pos] = [0, 1]; // Position matches
  });
  
  targetPositions.none.forEach(pos => {
    restOfDesign[pos] = [0, 0]; // Neither matches
  });
  
  return baseDesign.concat(restOfDesign);
}

function generateStimuliSequence(design, n) {
  const sampset = Array.from({ length: 8 }, (_, i) => i + 1);
  let dim1stim = [];
  let dim2stim = [];

  // Initialize with random samples
  for (let i = 0; i < n; i++) {
    dim1stim.push(sampset[Math.floor(Math.random() * sampset.length)]);
    dim2stim.push(sampset[Math.floor(Math.random() * sampset.length)]);
  }

  // Generate the rest of the stimuli sequence
  for (let i = n; i < design.length; i++) {
    let [dim1match, dim2match] = design[i];
    let dim1val, dim2val;

    if (dim1match === 0) {
      dim1val = sampset.filter(x => x !== dim1stim[i - n])[Math.floor(Math.random() * (sampset.length - 1))];
    } else {
      dim1val = dim1stim[i - n];
    }

    if (dim2match === 0) {
      dim2val = sampset.filter(x => x !== dim2stim[i - n])[Math.floor(Math.random() * (sampset.length - 1))];
    } else {
      dim2val = dim2stim[i - n];
    }

    dim1stim.push(dim1val);
    dim2stim.push(dim2val);
  }

  return [dim1stim, dim2stim];
}

const NBackTest = ({ 
  trials = 20, 
  n = 2,
  dim1targets = 4,
  dim2targets = 4, 
  bothTargets = 2,
  tickTime = 3000, // 3 seconds per stimulus
  onFinish,
  onReturn
}) => {
  const { t } = useTranslation();
  
  // Game state
  const [testStarted, setTestStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentStimulus, setCurrentStimulus] = useState(0);
  const [design, setDesign] = useState([]);
  const [stimuli, setStimuli] = useState([[], []]);
  const [responses, setResponses] = useState([]);
  
  // Grid state
  const [gridSquares, setGridSquares] = useState(Array(9).fill('white'));
  const [activeLetter, setActiveLetter] = useState('');
  
  // Response feedback
  const [buttonClassA, setButtonClassA] = useState('');
  const [buttonClassL, setButtonClassL] = useState('');
  
  // Results
  const [results, setResults] = useState({
    dim1: { hits: 0, misses: 0, correctRejections: 0, falseAlarms: 0 },
    dim2: { hits: 0, misses: 0, correctRejections: 0, falseAlarms: 0 }
  });
  
  // Score saving state
  const [playerName, setPlayerName] = useState('');
  const [scoreSaved, setScoreSaved] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  
  // Refs
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);
  const stimuliRef = useRef([[], []]);
  const audioRef = useRef(null);
  
  // Available letters for nBack
  const nBackLetters = ['C', 'H', 'K', 'N', 'R', 'W', 'X', 'Y'];
  
  // Clean up on unmount
  useEffect(() => {
    isMountedRef.current = true;
    // Create a single shared audio element
    audioRef.current = new Audio();
    
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Play a letter sound using the shared audio element
  const playLetterSound = (letter) => {
    if (!audioRef.current) return;
    
    // Reset the audio element
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    
    // Set the source and play
    audioRef.current.src = `${process.env.PUBLIC_URL}/assets/nback-sounds/${letter}.wav`;
    
    // Play with error handling
    audioRef.current.play().catch(err => {
      console.error(`Error playing audio: ${err.message}`);
    });
  };

  // Return to main menu (memoized)
  const handleMainMenuReturn = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (onReturn) {
      onReturn();
    }
  }, [onReturn]);

  // Handle response to stimulus (memoized)
  const handleNBackResponse = useCallback((dimension) => {
    if (!testStarted || currentStimulus < n) return;
    
    const currentDesign = design[currentStimulus];
    if (!currentDesign) return;

    const isMatch = currentDesign[dimension] === 1;
    
    // Visual feedback
    if (dimension === 0) {
      setButtonClassL(isMatch ? 'correct' : 'incorrect');
      setTimeout(() => setButtonClassL(''), 500);
    } else {
      setButtonClassA(isMatch ? 'correct' : 'incorrect');
      setTimeout(() => setButtonClassA(''), 500);
    }
    
    // Update results
    setResults(prev => {
      const newResults = { ...prev };
      const dimResults = dimension === 0 ? newResults.dim1 : newResults.dim2;
      
      if (isMatch) {
        // Target was present
        dimResults.hits += 1; // Correct response
      } else {
        // Target was absent
        dimResults.falseAlarms += 1; // Incorrect response
      }
      
      return newResults;
    });
    
    // Record response
    setResponses(prev => [
      ...prev,
      {
        dimension,
        correct: isMatch,
        stimulusIndex: currentStimulus
      }
    ]);
  }, [testStarted, currentStimulus, n, design]);

  // Set up keyboard listener for responses
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Q to exit to main menu
      if (e.ctrlKey && e.key === 'q') {
        e.preventDefault();
        handleMainMenuReturn();
      } else if (testStarted && currentStimulus >= n) {
        if (e.key === 'l' || e.key === 'L') {
          handleNBackResponse(0); // Letter dimension
        } else if (e.key === 'a' || e.key === 'A') {
          handleNBackResponse(1); // Position dimension
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [testStarted, currentStimulus, n, handleNBackResponse, handleMainMenuReturn]);

  // Start the n-back test
  const startNBackTest = () => {
    // Generate design and stimuli
    const newDesign = generateDesign(n, dim1targets, dim2targets, bothTargets, trials);
    const newStimuli = generateStimuliSequence(newDesign, n);
    
    // Store in ref for immediate access
    stimuliRef.current = newStimuli;
    
    // Set states
    setDesign(newDesign);
    setStimuli(newStimuli);
    setCurrentStimulus(0);
    setResponses([]);
    setIsFinished(false);
    
    // Reset results
    setResults({
      dim1: { hits: 0, misses: 0, correctRejections: 0, falseAlarms: 0 },
      dim2: { hits: 0, misses: 0, correctRejections: 0, falseAlarms: 0 }
    });
    
    setTestStarted(true);
    
    // Add a 2-second delay before starting the test
    setTimeout(() => {
      // Present the first stimulus directly with the newly generated stimuli
      presentStimulusDirect(0, newStimuli);
      
      // Set up interval for subsequent stimuli
      timerRef.current = setInterval(() => {
        setCurrentStimulus(prev => {
          const next = prev + 1;
          if (next >= trials) {
            endTest();
            return prev;
          }
          // Use the ref data instead of relying on state updates
          presentStimulusDirect(next, stimuliRef.current);
          return next;
        });
      }, tickTime);
    }, 2000);
  };

  // Present a stimulus using direct stimuli data
  const presentStimulusDirect = (stimulusIndex, stimuliData) => {
    if (!stimuliData[0][stimulusIndex] || !stimuliData[1][stimulusIndex]) {
      console.error(`Invalid stimulus at index ${stimulusIndex}`);
      return;
    }
    
    // Clear previous stimulus
    setGridSquares(Array(9).fill('white'));
    setActiveLetter('');
    
    // Set letter (1-indexed to 0-indexed)
    const letterIndex = stimuliData[0][stimulusIndex] - 1;
    if (letterIndex < 0 || letterIndex >= nBackLetters.length) {
      console.error(`Invalid letter index: ${letterIndex}`);
      return;
    }
    
    const letter = nBackLetters[letterIndex];
    setActiveLetter(letter);
    
    // Set position (1-indexed to 0-indexed, excluding center)
    const positionIndex = stimuliData[1][stimulusIndex] - 1;
    const positionMapping = [0, 1, 2, 3, 5, 6, 7, 8]; // Skip center (4)
    if (positionIndex < 0 || positionIndex >= positionMapping.length) {
      console.error(`Invalid position index: ${positionIndex}`);
      return;
    }
    
    const position = positionMapping[positionIndex];
    
    // Update grid
    setGridSquares(prev => {
      const newGrid = [...prev];
      newGrid[position] = 'green';
      return newGrid;
    });
    
    // Play letter sound using the shared function
    playLetterSound(letter);
  };

  // Present a stimulus using state - keep function but remove audio playback to prevent double sounds
  const presentStimulus = (stimulusIndex) => {
    // Check if stimuli state is populated
    if (!stimuli[0] || !stimuli[1] || !stimuli[0][stimulusIndex] || !stimuli[1][stimulusIndex]) {
      console.error(`Invalid stimulus at index ${stimulusIndex}. Stimuli may not be loaded yet.`);
      return;
    }
    
    try {
      // Clear previous stimulus
      setGridSquares(Array(9).fill('white'));
      setActiveLetter('');
      
      // Set letter (1-indexed to 0-indexed)
      const letterIndex = stimuli[0][stimulusIndex] - 1;
      if (letterIndex < 0 || letterIndex >= nBackLetters.length) {
        console.error(`Invalid letter index: ${letterIndex}`);
        return;
      }
      
      const letter = nBackLetters[letterIndex];
      setActiveLetter(letter);
      
      // Set position (1-indexed to 0-indexed, excluding center)
      const positionIndex = stimuli[1][stimulusIndex] - 1;
      const positionMapping = [0, 1, 2, 3, 5, 6, 7, 8]; // Skip center (4)
      if (positionIndex < 0 || positionIndex >= positionMapping.length) {
        console.error(`Invalid position index: ${positionIndex}`);
        return;
      }
      
      const position = positionMapping[positionIndex];
      
      // Update grid
      setGridSquares(prev => {
        const newGrid = [...prev];
        newGrid[position] = 'green';
        return newGrid;
      });
      
      // Remove audio playback to prevent double sounds - we already play them in presentStimulusDirect
    } catch (error) {
      console.error(`Error in presentStimulus: ${error.message}`);
    }
  };

  // Automatically record missed responses
  useEffect(() => {
    if (!testStarted || currentStimulus < n) return;
    
    // Automatically record missed responses and correct rejections
    // This happens at each stimulus change
    const currentDesign = design[currentStimulus];
    
    if (currentDesign) {
      // Check for missed targets and correct rejections for letter dimension
      const responses1 = responses.filter(r => 
        r.dimension === 0 && r.stimulusIndex === currentStimulus
      );
      
      if (responses1.length === 0) {
        // No response was made for this dimension
        if (currentDesign[0] === 1) {
          // Missed a target
          setResults(prev => {
            const newResults = { ...prev };
            newResults.dim1.misses += 1;
            return newResults;
          });
        } else {
          // Correctly rejected non-target
          setResults(prev => {
            const newResults = { ...prev };
            newResults.dim1.correctRejections += 1;
            return newResults;
          });
        }
      }
      
      // Same for position dimension
      const responses2 = responses.filter(r => 
        r.dimension === 1 && r.stimulusIndex === currentStimulus
      );
      
      if (responses2.length === 0) {
        if (currentDesign[1] === 1) {
          setResults(prev => {
            const newResults = { ...prev };
            newResults.dim2.misses += 1;
            return newResults;
          });
        } else {
          setResults(prev => {
            const newResults = { ...prev };
            newResults.dim2.correctRejections += 1;
            return newResults;
          });
        }
      }
    }
  }, [currentStimulus, design, testStarted, n, responses]);

  // End the test
  const endTest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setTestStarted(false);
    setIsFinished(true);
  };

  // Save score to scoreboard
  const handleSaveScore = () => {
    if (!playerName.trim()) return;
    
    // Calculate overall accuracy
    const dim1Total = results.dim1.hits + results.dim1.misses + 
                    results.dim1.correctRejections + results.dim1.falseAlarms;
    const dim2Total = results.dim2.hits + results.dim2.misses + 
                    results.dim2.correctRejections + results.dim2.falseAlarms;
    
    const dim1Correct = results.dim1.hits + results.dim1.correctRejections;
    const dim2Correct = results.dim2.hits + results.dim2.correctRejections;
    
    const dim1Accuracy = dim1Total > 0 ? (dim1Correct / dim1Total) * 100 : 0;
    const dim2Accuracy = dim2Total > 0 ? (dim2Correct / dim2Total) * 100 : 0;
    
    // Make sure we have a numeric value for the overall accuracy
    const overallAccuracy = parseFloat(((dim1Accuracy + dim2Accuracy) / 2).toFixed(2));
    
    const scoreDetails = {
      n: n,
      dim1Accuracy: dim1Accuracy.toFixed(2),
      dim2Accuracy: dim2Accuracy.toFixed(2),
      dim1Hits: results.dim1.hits,
      dim1Misses: results.dim1.misses,
      dim1FalseAlarms: results.dim1.falseAlarms,
      dim1CorrectRejections: results.dim1.correctRejections,
      dim2Hits: results.dim2.hits,
      dim2Misses: results.dim2.misses,
      dim2FalseAlarms: results.dim2.falseAlarms,
      dim2CorrectRejections: results.dim2.correctRejections,
      nValue: n // Make sure n is included in a consistent format
    };
    
    // Save to scoreboard - pass the numeric score value
    ScoreboardService.saveScore('nback', playerName, overallAccuracy, scoreDetails);
    setScoreSaved(true);
    setShowSaveForm(false);
  };

  // Calculate performance metrics for display
  const calculatePerformanceMetrics = () => {
    const dim1Total = results.dim1.hits + results.dim1.misses + 
                    results.dim1.correctRejections + results.dim1.falseAlarms;
    const dim2Total = results.dim2.hits + results.dim2.misses + 
                    results.dim2.correctRejections + results.dim2.falseAlarms;
    
    const dim1Correct = results.dim1.hits + results.dim1.correctRejections;
    const dim2Correct = results.dim2.hits + results.dim2.correctRejections;
    
    const dim1Accuracy = dim1Total > 0 ? (dim1Correct / dim1Total) * 100 : 0;
    const dim2Accuracy = dim2Total > 0 ? (dim2Correct / dim2Total) * 100 : 0;
    
    const overallAccuracy = ((dim1Accuracy + dim2Accuracy) / 2).toFixed(2);
    
    return {
      dim1Accuracy: dim1Accuracy.toFixed(2),
      dim2Accuracy: dim2Accuracy.toFixed(2),
      overallAccuracy
    };
  };

  // Render the grid
  const renderGrid = () => {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 100px)',
        gridTemplateRows: 'repeat(3, 100px)',
        gap: '10px',
        margin: '20px auto',
        position: 'relative'
      }}>
        {Array(9).fill().map((_, i) => (
          <div
            key={i}
            style={{
              width: '100px',
              height: '100px',
              backgroundColor: gridSquares[i],
              border: '2px solid #333',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              fontSize: '48px',
              fontWeight: 'bold'
            }}
          >
            {i === 4 && (
              <div style={{
                position: 'absolute',
                zIndex: 10,
                color: '#000',
                textShadow: '2px 2px 4px rgba(255, 255, 255, 0.8)',
                fontSize: '60px',
                fontWeight: 'bold'
              }}>
                {activeLetter}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Main render function
  if (isFinished) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        minHeight: '100vh',
        backgroundColor: 'rgba(26, 42, 58, 0.85)', // Match the app's background
        color: 'white',
        overflow: 'auto'
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          padding: '40px',
          borderRadius: '10px',
          width: '90%',
          maxWidth: '900px',
          marginBottom: '30px'
        }}>
          <h2 style={{ textAlign: 'center' }}>{t('nbackTest.results', 'N-Back Test Results')}</h2>
          
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '20px',
            marginBottom: '20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0 }}>{t('nbackTest.accuracy', 'Overall Accuracy')}: {calculatePerformanceMetrics().overallAccuracy}%</h3>
            <p>
              {t('nbackTest.letterDimension', 'Letter Dimension')}: {calculatePerformanceMetrics().dim1Accuracy}%<br />
              {t('nbackTest.positionDimension', 'Position Dimension')}: {calculatePerformanceMetrics().dim2Accuracy}%<br />
              {t('nbackTest.totalTrials', 'Total Trials')}: {trials}
            </p>
          </div>
          
          <div style={{ height: '300px', marginBottom: '30px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
            <Bar data={getBarData()} options={getBarOptions()} />
          </div>
          
          {!scoreSaved && !showSaveForm && (
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '20px', 
              padding: '15px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px'
            }}>
              <button
                onClick={() => setShowSaveForm(true)}
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
                {t('gameOver.enterName', 'Enter your name to save your score')}
              </button>
            </div>
          )}
          
          {showSaveForm && (
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '20px', 
              padding: '15px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder={t('gameOver.enterName', 'Enter your name')}
                  style={{
                    padding: '10px',
                    width: '80%',
                    maxWidth: '300px',
                    fontSize: '16px',
                    borderRadius: '4px',
                    border: 'none',
                    marginRight: '10px'
                  }}
                />
              </div>
              
              <div>
                <button
                  onClick={handleSaveScore}
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    padding: '8px 16px',
                    fontSize: '16px',
                    margin: '0 5px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {t('gameOver.submit', 'Submit')}
                </button>
                <button
                  onClick={() => setShowSaveForm(false)}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    padding: '8px 16px',
                    fontSize: '16px',
                    margin: '0 5px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          )}
          
          {scoreSaved && (
            <div style={{
              backgroundColor: '#d4edda',
              color: '#155724',
              padding: '15px',
              marginBottom: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0 }}>{t('scoreboard.scoreSaved', 'Your score has been saved!')}</p>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '15px' }}>
            <button
              onClick={startNBackTest}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '10px 20px',
                fontSize: '16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {t('nbackTest.tryAgain', 'Try Again')}
            </button>
            <button
              onClick={handleMainMenuReturn}
              style={{
                backgroundColor: '#007BFF',
                color: 'white',
                padding: '10px 20px',
                fontSize: '16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {t('common.returnToMenu', 'Return to Main Menu')}
            </button>
          </div>
          
          <div style={{ marginTop: '20px', fontSize: '14px', opacity: 0.7 }}>
            <p>{t('nbackTest.pressCtrlQToReturn', 'Press Ctrl+Q to return to the main menu at any time')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (testStarted) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        minHeight: '100vh',
        backgroundColor: 'rgba(26, 42, 58, 0.85)', // Match the app's background
        color: 'white'
      }}>
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(0,0,0,0.7)',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}>
          <p style={{ margin: '0' }}>{t('nbackTest.progress', 'Progress')}: {currentStimulus + 1}/{trials}</p>
          <p style={{ margin: '0' }}>{t('nbackTest.level', 'Level')}: {n}-back</p>
        </div>
        
        <h2>{t('nbackTest.title', 'N-Back Test')}</h2>
        
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          padding: '30px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          {renderGrid()}
        </div>
        
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p>{t('nbackTest.matchInstructions', 'Press L for letter match, A for position match')}</p>
          
          {/* Always show buttons, but with different message if still in memorization phase */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <button
              onClick={() => handleNBackResponse(1)}
              disabled={currentStimulus < n}
              style={{
                padding: '15px 30px',
                margin: '0 10px',
                fontSize: '18px',
                backgroundColor: buttonClassA === 'correct' ? '#4CAF50' : 
                               buttonClassA === 'incorrect' ? '#f44336' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentStimulus < n ? 'not-allowed' : 'pointer',
                opacity: currentStimulus < n ? 0.7 : 1
              }}
            >
              A - {t('nbackTest.position', 'Position')}
            </button>
            <button
              onClick={() => handleNBackResponse(0)}
              disabled={currentStimulus < n}
              style={{
                padding: '15px 30px',
                margin: '0 10px',
                fontSize: '18px',
                backgroundColor: buttonClassL === 'correct' ? '#4CAF50' : 
                               buttonClassL === 'incorrect' ? '#f44336' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentStimulus < n ? 'not-allowed' : 'pointer',
                opacity: currentStimulus < n ? 0.7 : 1
              }}
            >
              L - {t('nbackTest.letter', 'Letter')}
            </button>
          </div>
          
          {currentStimulus < n && (
            <p style={{ marginTop: '10px' }}>
              {t('nbackTest.memorizeFirst', 'Memorize the first {{n}} items...', {n})}
            </p>
          )}
        </div>
        
        <div style={{ marginTop: '20px', fontSize: '14px', opacity: 0.7 }}>
          <p>{t('nbackTest.pressCtrlQToReturn', 'Press Ctrl+Q to return to the main menu at any time')}</p>
        </div>
      </div>
    );
  }

  // Initial setup screen
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      textAlign: 'center',
      backgroundColor: 'rgba(26, 42, 58, 0.85)', // Match the app's background
      color: 'white'
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.7)',
        padding: '40px',
        borderRadius: '10px',
        maxWidth: '600px',
        width: '80%'
      }}>
        <h1>{t('nbackTest.title', 'N-Back Test')}</h1>
        
        <p>{t('nbackTest.instructions', 'This is a dual n-back test with audio-visual and visuospatial components.')}</p>
        <p>{t('nbackTest.letterInstructions', 'Press L if the current letter matches the letter from {{n}} steps ago.', {n})}</p>
        <p>{t('nbackTest.positionInstructions', 'Press A if the current square position matches the position from {{n}} steps ago.', {n})}</p>
        <p>{t('nbackTest.testDetails', 'The test will consist of {{trials}} stimuli presented for {{time}} seconds each.', {trials, time: tickTime/1000})}</p>
        
        <button
          onClick={startNBackTest}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '15px 32px',
            fontSize: '16px',
            margin: '20px 0',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {t('nbackTest.startTest', 'Start Test')}
        </button>
        
        <button
          onClick={handleMainMenuReturn}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            padding: '10px 20px',
            fontSize: '16px',
            margin: '10px 0',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {t('common.returnToMenu', 'Return to Main Menu')}
        </button>
        
        <div style={{ marginTop: '20px', fontSize: '14px', opacity: 0.7 }}>
          <p>{t('nbackTest.pressCtrlQToReturn', 'Press Ctrl+Q to return to the main menu at any time')}</p>
        </div>
      </div>
    </div>
  );

  // Helper function to create bar chart data
  function getBarData() {
    return {
      labels: [
        t('nbackTest.hits', 'Hits'),
        t('nbackTest.misses', 'Misses'),
        t('nbackTest.correctRejections', 'Correct Rejections'),
        t('nbackTest.falseAlarms', 'False Alarms')
      ],
      datasets: [
        {
          label: t('nbackTest.letterDimension', 'Letter Dimension'),
          data: [
            results.dim1.hits,
            results.dim1.misses,
            results.dim1.correctRejections,
            results.dim1.falseAlarms
          ],
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: t('nbackTest.positionDimension', 'Position Dimension'),
          data: [
            results.dim2.hits,
            results.dim2.misses,
            results.dim2.correctRejections,
            results.dim2.falseAlarms
          ],
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1
        }
      ]
    };
  }

  // Helper function to create bar chart options
  function getBarOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: 'white' }
        },
        title: {
          display: true,
          text: t('nbackTest.performance', 'Performance by Category'),
          color: 'white'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: t('nbackTest.count', 'Count'),
            color: 'white'
          },
          ticks: { color: 'white' }
        },
        x: {
          ticks: { color: 'white' }
        }
      }
    };
  }
};

export default NBackTest; 