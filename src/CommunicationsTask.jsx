import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useAutoScroll } from './hooks/useAutoScroll';
import { downloadCSV } from './utils/csvExport';

// ---------------------------------------------------------------------------
// 1) Dynamically import all .wav files
// ---------------------------------------------------------------------------
const modules = require.context('./assets/sounds', false, /\.wav$/);
const audioFiles = modules.keys().map((filename) => {
  const fileUrl = modules(filename);
  const { callsign, radio, frequency } = parseFilename(filename);
  return { file: fileUrl, callsign, radio, frequency };
});

/** Parse filename like "./OWN_COM2_125-500.wav" => { callsign:'OWN', radio:'COM2', frequency:'125.500' } */
function parseFilename(filename) {
  const base = filename.replace('./', '').replace('.wav', '');
  const parts = base.split('_'); // e.g., ["OWN", "COM2", "125-500"]
  const callsign = parts[0];
  const radio = parts[1];
  const freqRaw = parts[2];
  const frequency = freqRaw.replace('-', '.'); // "125.500"
  return { callsign, radio, frequency };
}

// The radios in order for up/down arrow cycling
const radioOrder = ['NAV1', 'NAV2', 'COM1', 'COM2'];

// Constants for ramp-up levels
const LEVEL1_INTERVAL = 500; // Initial interval in ms
const LEVEL2_INTERVAL = 200; // Accelerated interval in ms
const LEVEL2_DELAY = 1000;    // Time to switch to Level 2 in ms

// Add these constants near the top, after other constants
const INITIAL_STATE = {
  frequencies: {
    NAV1: '112.500',
    NAV2: '112.500',
    COM1: '118.325',
    COM2: '120.775',
  },
  selectedRadio: 'NAV1',
};

const CommunicationsTask = forwardRef(({ 
  eventsPerMinute = 2, 
  showLog = false,
  onLogUpdate,
  onMetricsUpdate
}, ref) => {
  const ownCallSign = 'NASA504';

  // -------------------------------------------------------------------------
  // 2) States and Refs
  // -------------------------------------------------------------------------
  const [selectedRadio, setSelectedRadio] = useState('NAV1');
  const [frequencies, setFrequencies] = useState({
    NAV1: '112.500',
    NAV2: '112.500',
    COM1: '118.325',
    COM2: '120.775',
  });

  const [messageQueue, setMessageQueue] = useState([]);
  const [activeMessage, setActiveMessage] = useState(null);
  const [commLog, setCommLog] = useState([]);

  const audioRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const messageIndexRef = useRef(0);

  // Refs to hold timer IDs for frequency ramps
  const freqButtonRampRef = useRef(null);
  const arrowRampRef = useRef(null);
  const level2TimeoutRef = useRef(null);
  const level2ArrowTimeoutRef = useRef(null);

  // Refs to hold latest frequencies and selectedRadio
  const frequenciesRef = useRef(frequencies);
  const selectedRadioRef = useRef(selectedRadio);

  const freqRampTimeoutRef = useRef(null);
  const freqRampIntervalRef = useRef(null);

  // Add new states for health and load metrics
  const [healthImpact, setHealthImpact] = useState(0);
  const [systemLoad, setSystemLoad] = useState(0);

  useEffect(() => {
    frequenciesRef.current = frequencies;
  }, [frequencies]);

  useEffect(() => {
    selectedRadioRef.current = selectedRadio;
  }, [selectedRadio]);

  // -------------------------------------------------------------------------
  // 3) Scheduling Messages
  // -------------------------------------------------------------------------
  useEffect(() => {
    let timerId;
    const scheduleNext = () => {
      if (!audioFiles.length) return;
      const baseMs = 60000 / eventsPerMinute;
      const jitter = 0.8 + Math.random() * 0.4;
      const waitMs = baseMs * jitter;

      console.log(`[SCHEDULER] Next message in ${(waitMs / 1000).toFixed(2)}s`);
      timerId = setTimeout(() => {
        enqueueRandomMessage();
        scheduleNext();
      }, waitMs);
    };
    
    scheduleNext();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [eventsPerMinute]);

  const enqueueRandomMessage = () => {
    const idx = Math.floor(Math.random() * audioFiles.length);
    const chosen = audioFiles[idx];
    const newIndex = messageIndexRef.current++;

    const msg = {
      id: `msg-${newIndex}`,
      index: newIndex,
      file: chosen.file,
      callsign: chosen.callsign,
      radio: chosen.radio,
      frequency: chosen.frequency,
      relevant: chosen.callsign === 'OWN' || chosen.callsign === ownCallSign,

      startTime: null,
      endTime: null,
      finalized: false,
      postAudioTimer: null,
      snapshots: [],
    };

    console.log(`[ENQUEUE] ${msg.id} => ${msg.callsign}, ${msg.radio}, ${msg.frequency}`);
    setMessageQueue((prev) => [...prev, msg]);
  };

  // -------------------------------------------------------------------------
  // 4) Playing Messages
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (activeMessage || messageQueue.length === 0) return;

    const [msg, ...rest] = messageQueue;
    setMessageQueue(rest);
    setActiveMessage(msg);
    playMessage(msg);
  }, [activeMessage, messageQueue]);

  const playMessage = (msg) => {
    console.log(`[PLAY] ${msg.id}`);
    audioRef.current = new Audio(msg.file);
    msg.startTime = Date.now();
    
    // Record initial snapshot
    recordSnapshot(msg);

    audioRef.current
      .play()
      .then(() => {
        console.log(`[AUDIO] Playing: ${msg.id}`);
        // Set load when audio starts playing
        const loadValue = msg.callsign === 'OWN' ? 20 : 10;
        setSystemLoad(loadValue);
        onMetricsUpdate?.({ healthImpact, systemLoad: loadValue });
      })
      .catch((err) => console.error('[AUDIO] Failed to play:', err));

    audioRef.current.onended = () => {
      msg.endTime = Date.now();
      console.log(`[AUDIO] Ended: ${msg.id}`);

      // Start a 10-second post-audio timer for load and finalization
      msg.postAudioTimer = setTimeout(() => {
        console.log(`[TIMER] finalize => ${msg.id}`);
        setSystemLoad(0);
        onMetricsUpdate?.({ healthImpact, systemLoad: 0 });
        if (!msg.finalized) finalizeMessage(msg);
      }, 5000);
    };
  };

  // -------------------------------------------------------------------------
  // 5) Recording Snapshots
  //    (Called on every frequency or radio change)
  // -------------------------------------------------------------------------
  const recordSnapshot = (msg) => {
    if (!msg.startTime) {
      console.warn(`Cannot record snapshot for ${msg.id}, no startTime`);
      return;
    }
    const dt = Date.now() - msg.startTime;
    const snap = {
      t: dt,
      selectedRadio: selectedRadioRef.current,
      frequencies: { ...frequenciesRef.current },
    };
    msg.snapshots.push(snap);
    console.log(
      `[SNAPSHOT] ${msg.id} @${dt}ms selRadio=${snap.selectedRadio} freq=${JSON.stringify(
        snap.frequencies
      )}`
    );
  };

  // -------------------------------------------------------------------------
  // 6) Finalizing Messages
  // -------------------------------------------------------------------------
  const finalizeMessage = (msg) => {
    if (msg.finalized) return;
    msg.finalized = true;
    if (msg.postAudioTimer) clearTimeout(msg.postAudioTimer);

    // Record one last snapshot to capture the final state
    recordSnapshot(msg);
    
    // Analyze response based on snapshots
    let responseType = 'MISS';
    let responseTime = null;
    let impact = 0; // Initialize health impact

    if (msg.callsign === 'OWN') {
      // Own ship message - look for correct radio and frequency
      for (let i = 0; i < msg.snapshots.length; i++) {
        const snap = msg.snapshots[i];
        if (snap.selectedRadio === msg.radio && 
            snap.frequencies[msg.radio] === msg.frequency) {
          responseType = 'HIT';
          responseTime = snap.t / 1000;
          impact = 10; // +2 for hits
          break;
        }
      }
      if (responseType === 'MISS') impact = -5; // -1 for misses
    } else {
      // Other ship message - check for any changes
      const hasChanges = msg.snapshots.some((snap, i) => {
        if (i === 0) return false;
        const prevSnap = msg.snapshots[i - 1];
        return (
          snap.selectedRadio !== prevSnap.selectedRadio ||
          Object.keys(snap.frequencies).some(
            radio => snap.frequencies[radio] !== prevSnap.frequencies[radio]
          )
        );
      });
      responseType = hasChanges ? 'FA' : 'CR';
      impact = hasChanges ? -10 : 5; // -1 for FA, +1 for CR
    }

    // Update health impact
    setHealthImpact(impact);

    // Always update comm log with properly formatted data
    if (msg.id) {
      setCommLog(prev => {
        const newLog = [...prev, {
          index: msg.index,
          Time: new Date().toISOString(),
          Ship: msg.callsign,
          Radio_T: msg.radio,
          Freq_T: msg.frequency,
          Radio_S: selectedRadioRef.current,
          Freq_S: frequenciesRef.current[selectedRadioRef.current],
          RT: responseTime || (msg.endTime - msg.startTime) / 1000,
          Remarks: responseType
        }];
        onLogUpdate?.(newLog);
        return newLog;
      });
    }

    // Clear active message
    setActiveMessage(null);
  };

  const logRow = (row) => {
    if (!row || Object.keys(row).length === 0) return;
    setCommLog((prev) => {
      const newLog = [...prev, row];
      onLogUpdate?.(newLog);
      return newLog;
    });
  };

  // -------------------------------------------------------------------------
  // 7) Handling Radio and Frequency Changes
  //    (Immediate snapshots upon changes)
  // -------------------------------------------------------------------------
  const handleRadioSelect = (r) => {
    // Stop any ongoing frequency ramps
    stopArrowFreqRamp();
    stopFreqButtonRamp();

    setSelectedRadio(r);
    if (activeMessage && !activeMessage.finalized) {
      recordSnapshot(activeMessage);
    }
  };

  const handleFrequencyChange = (r, newVal) => {
    setFrequencies((prev) => {
      const updated = { ...prev, [r]: newVal };
      if (activeMessage && !activeMessage.finalized) {
        recordSnapshot(activeMessage);
      }
      return updated;
    });
  };

  // -------------------------------------------------------------------------
  // 8) Frequency +/- Buttons with Two-Level Ramp-Up
  // -------------------------------------------------------------------------
  const handleFreqButtonDown = (r, direction, isDouble = false) => {
    stopArrowFreqRamp();
    startFreqRamp(r, direction, 'button', isDouble);
  };

  const handleFreqButtonUp = () => {
    stopFreqButtonRamp();
  };

  // -------------------------------------------------------------------------
  // 9) Arrow Key Ramp-Up with Two Levels
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input fields
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          // Stop any ongoing ramps
          stopArrowFreqRamp();
          stopFreqButtonRamp();
          cycleRadio(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          // Stop any ongoing ramps
          stopArrowFreqRamp();
          stopFreqButtonRamp();
          cycleRadio(+1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          // Stop any ongoing ramps
          stopArrowFreqRamp();
          stopFreqButtonRamp();
          // Start Level 1 ramp for decreasing frequency
          startFreqRamp(selectedRadioRef.current, -1, 'arrow');
          break;
        case 'ArrowRight':
          e.preventDefault();
          // Stop any ongoing ramps
          stopArrowFreqRamp();
          stopFreqButtonRamp();
          // Start Level 1 ramp for increasing frequency
          startFreqRamp(selectedRadioRef.current, +1, 'arrow');
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Stop arrow frequency ramp when key is released
        stopArrowFreqRamp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedRadio, activeMessage, frequencies]);

  // Helper function to cycle radio selection
  const cycleRadio = (delta) => {
    const idx = radioOrder.indexOf(selectedRadioRef.current);
    let newIdx = idx + delta;
    if (newIdx < 0) newIdx = radioOrder.length - 1;
    if (newIdx >= radioOrder.length) newIdx = 0;
    handleRadioSelect(radioOrder[newIdx]);
  };

  // -------------------------------------------------------------------------
  // 10) Two-Level Frequency Ramp-Up Function
  // -------------------------------------------------------------------------
  const startFreqRamp = (radio, direction, source, isDouble = false) => {
    const initialDelay = 500;
    const rampUpDelay = 100;

    // Initial change
    setFrequencies(prev => {
      const currentFreq = Number(prev[radio]);
      let newFreq;
      
      if (isDouble) {
        // For whole number steps
        newFreq = Math.floor(currentFreq) + direction;
      } else {
        // For small steps (0.025)
        if (direction > 0) {
          // Going up: find next 0.025 increment
          newFreq = Math.floor(currentFreq * 40) / 40 + 0.025;
        } else {
          // Going down: find previous 0.025 increment
          newFreq = Math.ceil(currentFreq * 40) / 40 - 0.025;
        }
      }
      
      return {
        ...prev,
        [radio]: newFreq.toFixed(3)
      };
    });

    // Set initial timeout
    freqRampTimeoutRef.current = setTimeout(() => {
      // Start rapid changes
      freqRampIntervalRef.current = setInterval(() => {
        setFrequencies(prev => {
          const currentFreq = Number(prev[radio]);
          let newFreq;
          
          if (isDouble) {
            newFreq = Math.floor(currentFreq) + direction;
          } else {
            if (direction > 0) {
              newFreq = Math.floor(currentFreq * 40) / 40 + 0.025;
            } else {
              newFreq = Math.ceil(currentFreq * 40) / 40 - 0.025;
            }
          }
          
          return {
            ...prev,
            [radio]: newFreq.toFixed(3)
          };
        });
      }, rampUpDelay);
    }, initialDelay);
  };

  const stopFreqRamp = (rampType) => {
    // Clear the common ramp refs
    if (freqRampTimeoutRef.current) {
      clearTimeout(freqRampTimeoutRef.current);
      freqRampTimeoutRef.current = null;
    }
    if (freqRampIntervalRef.current) {
      clearInterval(freqRampIntervalRef.current);
      freqRampIntervalRef.current = null;
    }

    // Clear type-specific refs
    if (rampType === 'button') {
      if (freqButtonRampRef.current) {
        clearTimeout(freqButtonRampRef.current);
        freqButtonRampRef.current = null;
      }
      if (level2TimeoutRef.current) {
        clearTimeout(level2TimeoutRef.current);
        level2TimeoutRef.current = null;
      }
    } else if (rampType === 'arrow') {
      if (arrowRampRef.current) {
        clearTimeout(arrowRampRef.current);
        arrowRampRef.current = null;
      }
      if (level2ArrowTimeoutRef.current) {
        clearTimeout(level2ArrowTimeoutRef.current);
        level2ArrowTimeoutRef.current = null;
      }
    }
  };

  const stopArrowFreqRamp = () => {
    stopFreqRamp('arrow');
  };

  const stopFreqButtonRamp = () => {
    stopFreqRamp('button');
  };

  const handleExport = () => {
    downloadCSV(commLog, 'communications-log');
  };

  // Reset function
  const resetTask = () => {
    setSelectedRadio(INITIAL_STATE.selectedRadio);
    setFrequencies(INITIAL_STATE.frequencies);
    setMessageQueue([]);
    setActiveMessage(null);
    setCommLog([]);
    messageIndexRef.current = 0;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  // Expose resetTask to ref
  useImperativeHandle(ref, () => ({
    resetTask
  }));

  // Add useEffect to reset health impact after a short delay
  useEffect(() => {
    if (healthImpact !== 0) {
      const timer = setTimeout(() => {
        setHealthImpact(0);
      }, 250); // Match monitoring task's 250ms reset time
      return () => clearTimeout(timer);
    }
  }, [healthImpact]);

  // Remove the old 1000ms reset timer
  useEffect(() => {
    // Only update metrics when health impact changes
    onMetricsUpdate?.({ healthImpact, systemLoad });
  }, [healthImpact, systemLoad]);

  // Add getMetrics function to expose current health and load values
  const getMetrics = () => ({
    healthImpact,
    systemLoad
  });

  // -------------------------------------------------------------------------
  // 11) Render
  // -------------------------------------------------------------------------
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      maxWidth: '100%',
      margin: '0 auto'
    }}>
      {/* Title Bar */}
      <div style={{
        background: 'blue',
        color: 'white',
        textAlign: 'center',
        padding: '0.5rem',
        fontWeight: 'bold',
        flexShrink: 0
      }}>
        COMMUNICATIONS TASK
      </div>

      {/* Main Content Container */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '0.5rem',
        gap: '0.5rem',
        overflow: 'hidden',
        minHeight: 0
      }}>
        {/* Call Sign */}
        <div style={{ 
          textAlign: 'center', 
          fontSize: '1.2rem',
          padding: '0.5rem',
          flexShrink: 0
        }}>
          <strong>Call Sign:</strong> {ownCallSign}
        </div>

        {/* Radios Container */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1%',
          overflow: 'hidden',
          minHeight: 0,
          padding: '1%'
        }}>
          {radioOrder.map((r) => (
            <div key={r} style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '10%',
              padding: '0.5%',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              height: 'min(8vh, 60px)'
            }}>
              {/* Radio Selection */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5vw',
                width: '15%',
                flexShrink: 0
              }}>
                <input
                  type="radio"
                  name="radioSelect"
                  checked={selectedRadio === r}
                  onChange={() => handleRadioSelect(r)}
                  style={{ 
                    width: '2.5vh',
                    height: '2.5vh',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ 
                  fontWeight: 'bold', 
                  color: 'blue',
                  fontSize: 'clamp(0.7rem, 1.8vh, 1.2rem)'
                }}>
                  {r}
                </span>
              </div>

              {/* Frequency Controls */}
              <div style={{ 
                display: 'flex', 
                flex: 1,
                gap: '1%',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <button
                  style={{ 
                    width: '15%',
                    height: '3%',
                    fontSize: 'clamp(0.8rem, 2vh, 1.2rem)',
                    background: '#e0e0e0',
                    border: '1px solid #999',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onMouseDown={() => handleFreqButtonDown(r, -1, true)}
                  onMouseUp={handleFreqButtonUp}
                  onMouseLeave={handleFreqButtonUp}
                >
                  --
                </button>
                <button
                  style={{ 
                    width: '10%',
                    height: '3%',
                    fontSize: 'clamp(0.8rem, 2vh, 1.2rem)',
                    background: '#e0e0e0',
                    border: '1px solid #999',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onMouseDown={() => handleFreqButtonDown(r, -0.25)}
                  onMouseUp={handleFreqButtonUp}
                  onMouseLeave={handleFreqButtonUp}
                >
                  -
                </button>

                <input
                  type="text"
                  style={{ 
                    width: '30%',
                    height: '20%',
                    fontSize: 'clamp(1rem, 2vh, 1.5rem)',
                    textAlign: 'center',
                    border: '1px solid #999',
                    borderRadius: '4px'
                  }}
                  value={frequencies[r]}
                  onChange={(e) => handleFrequencyChange(r, e.target.value)}
                />

                <button
                  style={{ 
                    width: '10%',
                    height: '3%',
                    fontSize: 'clamp(0.8rem, 2vh, 1.2rem)',
                    background: '#e0e0e0',
                    border: '1px solid #999',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onMouseDown={() => handleFreqButtonDown(r, +0.25)}
                  onMouseUp={handleFreqButtonUp}
                  onMouseLeave={handleFreqButtonUp}
                >
                  +
                </button>
                <button
                  style={{ 
                    width: '15%',
                    height: '3%',
                    fontSize: 'clamp(0.8rem, 2vh, 1.2rem)',
                    background: '#e0e0e0',
                    border: '1px solid #999',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onMouseDown={() => handleFreqButtonDown(r, +1, true)}
                  onMouseUp={handleFreqButtonUp}
                  onMouseLeave={handleFreqButtonUp}
                >
                  ++
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Add Log component as a separate component
const Log = ({ commLog }) => {
  const scrollRef = useAutoScroll();
  
  const handleExport = () => {
    downloadCSV(commLog, 'communications-log');
  };

  // Get last 50 entries for display only
  const recentLogs = commLog.slice(-50);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <button 
          onClick={handleExport}
          style={{
            padding: '0.25rem 0.5rem',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Export CSV
        </button>
      </div>
      <div ref={scrollRef} style={{ width: '100%', overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ccc' }}>
              <th style={{ padding: '0.5rem' }}>Index</th>
              <th style={{ padding: '0.5rem' }}>Time</th>
              <th style={{ padding: '0.5rem' }}>Ship</th>
              <th style={{ padding: '0.5rem' }}>Radio_T</th>
              <th style={{ padding: '0.5rem' }}>Freq_T</th>
              <th style={{ padding: '0.5rem' }}>Radio_S</th>
              <th style={{ padding: '0.5rem' }}>Freq_S</th>
              <th style={{ padding: '0.5rem' }}>RT</th>
              <th style={{ padding: '0.5rem' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.index}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.Time}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.Ship}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.Radio_T}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.Freq_T}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.Radio_S}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.Freq_S}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.RT}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.Remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Attach Log component to CommunicationsTask
CommunicationsTask.Log = Log;

// Add static method to get default metrics
CommunicationsTask.getDefaultMetrics = () => ({
  healthImpact: 0,
  systemLoad: 0
});

export default CommunicationsTask;
