import React, { useState, useEffect, useRef } from 'react';

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

function CommunicationsTask({ eventsPerMinute = 2, showLog = true }) {
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
      .then(() => console.log(`[AUDIO] Playing: ${msg.id}`))
      .catch((err) => console.error('[AUDIO] Failed to play:', err));

    audioRef.current.onended = () => {
      msg.endTime = Date.now();
      console.log(`[AUDIO] Ended: ${msg.id}`);

      // Start a 10-second post-audio timer for finalization
      msg.postAudioTimer = setTimeout(() => {
        console.log(`[TIMER] finalize => ${msg.id}`);
        if (!msg.finalized) finalizeMessage(msg);
      }, 10000);
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

    // Clear active message
    setActiveMessage(null);

    console.log(`[FINALIZE] ${msg.id} => snapshots:`, msg.snapshots);

    // Evaluation logic
    const timeSinceStart = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
    const { callsign, radio: targetRadio, frequency: targetFreq } = msg;

    let R_OK = false;
    let F_OK = false;
    let RT = null;
    let radioWasChanged = false;
    let freqWasChanged = false;

    const snapshots = [...msg.snapshots].sort((a, b) => a.t - b.t);

    // Step 1: Check if correct radio and frequency were set at any point
    for (let i = 0; i < snapshots.length; i++) {
      const snap = snapshots[i];
      if (i > 0) {
        const prev = snapshots[i - 1];
        if (prev.selectedRadio !== snap.selectedRadio) radioWasChanged = true;
        for (const rKey of Object.keys(snap.frequencies)) {
          if (snap.frequencies[rKey] !== prev.frequencies[rKey]) freqWasChanged = true;
        }
      }
      if (snap.frequencies[targetRadio] === targetFreq && !R_OK && !F_OK) {
        R_OK = true;
        F_OK = true;
        RT = snap.t;
        console.log(`[FINALIZE] [STEP1] Correct radio+freq at t=${RT}`);
      }
    }

    // Step 2: If not, check if any radio has the target frequency
    if (!F_OK) {
      for (let i = 0; i < snapshots.length; i++) {
        const snap = snapshots[i];
        const anyRadioHasIt = Object.values(snap.frequencies).includes(targetFreq);
        if (anyRadioHasIt) {
          F_OK = true;
          RT = snap.t;
          console.log(`[FINALIZE] [STEP2] Found freq on a different radio at t=${RT}`);
          // Check if that frequency was on the target radio
          const actualRadio = Object.keys(snap.frequencies).find(
            (r) => snap.frequencies[r] === targetFreq
          );
          if (actualRadio === targetRadio) {
            R_OK = true;
          }
          break;
        }
      }
    }

    // Step 3: If still no frequency match, check if user at least selected the correct radio
    if (!F_OK && radioWasChanged) {
      const correctRadioAtAnyPoint = snapshots.some((s) => s.selectedRadio === targetRadio);
      if (correctRadioAtAnyPoint) {
        R_OK = true;
        console.log(`[FINALIZE] [STEP3] No freq match but user selected the correct radio.`);
      }
    }

    // **New Addition: Track only frequency changes for FA**
    const userMadeAFrequencyChange = freqWasChanged;

    // Determine if the user made any changes
    // const userMadeAChange = radioWasChanged || freqWasChanged; // OLD LINE
    // Use only frequency changes for FA
    // const userMadeAFrequencyChange = freqWasChanged; // NEW VARIABLE

    const isRelevant = callsign === 'OWN' || callsign === ownCallSign;

    // **Updated Classification Logic**
    let remarks = '';
    if (isRelevant) {
      if (R_OK && F_OK) {
        remarks = 'HIT';
      } else {
        remarks = 'MISS';
      }
    } else {
      if (userMadeAFrequencyChange) { // Only frequency changes lead to FA
        remarks = 'FA'; // False Alarm
      } else {
        remarks = 'CR'; // Correct Rejection
      }
    }

    console.log(
      `[RESULT] ${msg.id} => R_OK=${R_OK}, F_OK=${F_OK}, remarks=${remarks}, RT=${RT}`
    );

    // Log the result
    logRow({
      index: msg.index,
      Time: timeSinceStart,
      Ship: callsign,
      Radio_T: targetRadio,
      Freq_T: targetFreq,
      Radio_S: snapshots[snapshots.length - 1]?.selectedRadio,
      Freq_S: snapshots[snapshots.length - 1]?.frequencies[targetRadio],
      R_OK,
      F_OK,
      RT: RT !== null ? (RT / 1000).toFixed(2) : '',
      Remarks: remarks,
    });
  };

  const logRow = (row) => {
    if (!showLog) return;
    setCommLog((prev) => [...prev, row]);
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
  const handleFreqButtonDown = (r, direction) => {
    // Stop any ongoing arrow ramp to prevent conflicts
    stopArrowFreqRamp();

    // Start two-level ramp-up
    startFreqRamp(r, direction, 'button');
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
  const startFreqRamp = (radio, direction, rampType) => {
    // Determine which ramp reference to use
    const rampRef = rampType === 'button' ? freqButtonRampRef : arrowRampRef;
    const level2Timeout = rampType === 'button' ? level2TimeoutRef : level2ArrowTimeoutRef;

    // Initialize Level 1 stepping
    const step = () => {
      setFrequencies((prev) => {
        const val = parseFloat(prev[radio]) || 0;
        const newVal = (val + 0.025 * direction).toFixed(3);
        const updated = { ...prev, [radio]: newVal };

        // Update refs
        frequenciesRef.current = updated;

        if (activeMessage && !activeMessage.finalized) {
          recordSnapshot(activeMessage);
        }

        return updated;
      });

      // Schedule next Level 1 step
      rampRef.current = setTimeout(step, LEVEL1_INTERVAL);
    };

    // Start Level 1 stepping
    step();

    // After LEVEL2_DELAY, switch to Level 2 stepping
    level2Timeout.current = setTimeout(() => {
      clearTimeout(rampRef.current); // Clear Level 1 stepping
      const accelerateStep = () => {
        setFrequencies((prev) => {
          const val = parseFloat(prev[radio]) || 0;
          const newVal = (val + 0.025 * direction).toFixed(3);
          const updated = { ...prev, [radio]: newVal };

          // Update refs
          frequenciesRef.current = updated;

          if (activeMessage && !activeMessage.finalized) {
            recordSnapshot(activeMessage);
          }

          return updated;
        });

        // Schedule next Level 2 step
        rampRef.current = setTimeout(accelerateStep, LEVEL2_INTERVAL);
      };

      // Start Level 2 stepping
      accelerateStep();
    }, LEVEL2_DELAY);
  };

  const stopFreqRamp = (rampType) => {
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

  // -------------------------------------------------------------------------
  // 11) Render
  // -------------------------------------------------------------------------
  return (
    <div
      style={{
        width: 480,
        fontFamily: 'sans-serif',
        border: '1px solid #ccc',
        padding: '0.5rem',
        margin: '1rem',
      }}
    >
      <div
        style={{
          background: 'blue',
          color: 'white',
          textAlign: 'center',
          padding: '0.5rem',
          fontWeight: 'bold',
        }}
      >
        COMMUNICATIONS TASK
      </div>

      <div>
        <strong>Call Sign:</strong> {ownCallSign}
      </div>

      {/* Radios & Frequencies */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginTop: '1rem',
        }}
      >
        {radioOrder.map((r) => (
          <div key={r} style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="radio"
              name="radioSelect"
              checked={selectedRadio === r}
              onChange={() => handleRadioSelect(r)}
              style={{ marginRight: '0.5rem' }}
            />
            <span style={{ width: '50px', fontWeight: 'bold', color: 'blue' }}>
              {r}
            </span>

            <input
              type="text"
              style={{ width: '80px', marginLeft: '0.5rem' }}
              value={frequencies[r]}
              onChange={(e) => handleFrequencyChange(r, e.target.value)}
            />

            {/* +/- freq buttons */}
            <div style={{ display: 'flex', marginLeft: '0.5rem' }}>
              <button
                style={{ padding: '2px 4px', marginRight: '4px' }}
                onMouseDown={() => handleFreqButtonDown(r, +1)}
                onMouseUp={handleFreqButtonUp}
                onMouseLeave={handleFreqButtonUp}
              >
                +
              </button>
              <button
                style={{ padding: '2px 4px' }}
                onMouseDown={() => handleFreqButtonDown(r, -1)}
                onMouseUp={handleFreqButtonUp}
                onMouseLeave={handleFreqButtonUp}
              >
                -
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Comm Log */}
      {showLog && (
        <div style={{ marginTop: '1rem' }}>
          <h4>Comm Log</h4>
          <div
            style={{
              maxHeight: 240,
              overflowY: 'auto',
              border: '1px solid #ddd',
              padding: '0.5rem',
            }}
          >
            <table
              style={{
                width: '100%',
                fontSize: '0.75rem',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  <th>Index</th>
                  <th>Time</th>
                  <th>Ship</th>
                  <th>Radio_T</th>
                  <th>Freq_T</th>
                  <th>Radio_S</th>
                  <th>Freq_S</th>
                  <th>R_OK</th>
                  <th>F_OK</th>
                  <th>RT</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {commLog.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td>{row.index}</td>
                    <td>{row.Time}</td>
                    <td>{row.Ship}</td>
                    <td>{row.Radio_T}</td>
                    <td>{row.Freq_T}</td>
                    <td>{row.Radio_S}</td>
                    <td>{row.Freq_S}</td>
                    <td>
                      {row.R_OK === true
                        ? 'True'
                        : row.R_OK === false
                        ? 'False'
                        : row.R_OK}
                    </td>
                    <td>
                      {row.F_OK === true
                        ? 'True'
                        : row.F_OK === false
                        ? 'False'
                        : row.F_OK}
                    </td>
                    <td>{row.RT}</td>
                    <td>{row.Remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunicationsTask;
