import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import TrackingDisplay from './components/TrackingDisplay';
import { useGamepads } from './hooks/useGamepads';
import { useAutoScroll } from './hooks/useAutoScroll';
import { downloadCSV } from './utils/csvExport';

function TrackingTask({ 
  eventsPerMinute = 2, 
  showLog = false, 
  onLogUpdate,
  onStatusUpdate
}) {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const targetPosition = { x: 0, y: 0 };
  const [inputMode, setInputMode] = useState('keyboard');
  const [isAuto, setIsAuto] = useState(true);
  const [trackingLog, setTrackingLog] = useState([]);
  const [automationFailure, setAutomationFailure] = useState(false);
  const failureTimeoutRef = useRef(null);
  const logIntervalRef = useRef(null);
  
  const containerRef = useRef(null);
  const moveIntervalRef = useRef(null);
  const touchStartRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());
  const driftXRef = useRef(0);
  const driftYRef = useRef(0);

  const gamepadsRef = useRef([]);

  // Add frameRef at component level
  const frameRef = useRef(null);
  const lastLogTimeRef = useRef(Date.now());

  // Calculate if cursor is within target area
  const isWithinTarget = Math.abs(cursorPosition.x) <= 25 && Math.abs(cursorPosition.y) <= 25;

  // Add this with other refs near the top (around line 20)
  const positionRef = useRef({ x: 0, y: 0 });

  // Schedule automation failures based on eventsPerMinute
  useEffect(() => {
    const scheduleNextFailure = () => {
      if (failureTimeoutRef.current) {
        clearTimeout(failureTimeoutRef.current);
      }

      // Calculate time until next failure (in milliseconds)
      // Using eventsPerMinute to determine frequency
      const minutesUntilNextFailure = 1 / eventsPerMinute;
      const baseDelay = minutesUntilNextFailure * 60 * 1000;
      // Add some randomness (±30% of base delay)
      const randomDelay = baseDelay * (0.7 + Math.random() * 0.6);

      failureTimeoutRef.current = setTimeout(() => {
        if (isAuto) {
          setIsAuto(false);
          setAutomationFailure(true);
          // Schedule next failure after this one
          scheduleNextFailure();
        }
      }, randomDelay);
    };

    if (isAuto && !automationFailure) {
      scheduleNextFailure();
    }

    return () => {
      if (failureTimeoutRef.current) {
        clearTimeout(failureTimeoutRef.current);
      }
    };
  }, [isAuto, automationFailure, eventsPerMinute]);

  // Auto-recovery after manual intervention
  useEffect(() => {
    let recoveryTimeout;
    
    if (!isAuto && automationFailure) {
      // Wait for 5 seconds of manual control before allowing auto recovery
      recoveryTimeout = setTimeout(() => {
        setAutomationFailure(false);
        setIsAuto(true);
      }, 5000);
    }

    return () => {
      if (recoveryTimeout) {
        clearTimeout(recoveryTimeout);
      }
    };
  }, [isAuto, automationFailure]);

  // Physics effect with cursor position updates
  useEffect(() => {
    const driftSpeed = 0.5;
    const autoCorrection = 0.4;
    const joystickDeadzone = 0.1;
    const maxDriftVelocity = 2;
    
    // Update position ref when cursor position changes
    positionRef.current = cursorPosition;

    const interval = setInterval(() => {
      const now = Date.now();
      const dt = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      // Add random acceleration to drift
      driftXRef.current += (Math.random() - 0.5) * 0.4;
      driftYRef.current += (Math.random() - 0.5) * 0.4;

      // Limit maximum drift velocity
      driftXRef.current = Math.max(-maxDriftVelocity, Math.min(maxDriftVelocity, driftXRef.current));
      driftYRef.current = Math.max(-maxDriftVelocity, Math.min(maxDriftVelocity, driftYRef.current));

      let newX = positionRef.current.x + driftXRef.current * driftSpeed;
      let newY = positionRef.current.y + driftYRef.current * driftSpeed;

      // Auto mode correction
      if (isAuto && !automationFailure) {
        const correctionFactor = dt / 200 * autoCorrection;
        newX -= newX * correctionFactor;
        newY -= newY * correctionFactor;
      }

      // Handle manual input
      if (!isAuto && inputMode === 'joystick' && gamepadsRef.current[0]) {
        const gamepad = gamepadsRef.current[0];
        const moveStep = 2;
        
        const joyX = Math.abs(gamepad.axes[0]) > joystickDeadzone ? gamepad.axes[0] : 0;
        const joyY = Math.abs(gamepad.axes[1]) > joystickDeadzone ? gamepad.axes[1] : 0;

        newX += joyX * moveStep;
        newY += joyY * moveStep;
      }

      // Bounce off boundaries
      if (Math.abs(newX) > 150) {
        driftXRef.current = -driftXRef.current * 0.8;
        newX = Math.sign(newX) * 150;
      }
      if (Math.abs(newY) > 150) {
        driftYRef.current = -driftYRef.current * 0.8;
        newY = Math.sign(newY) * 150;
      }

      setCursorPosition({ x: newX, y: newY });
    }, 16);

    return () => clearInterval(interval);
  }, [isAuto, inputMode, automationFailure, cursorPosition]);

  // Separate effect for logging system
  useEffect(() => {
    let animationFrameId;

    const generateLog = () => {
      const now = Date.now();
      const rmsError = Math.sqrt(cursorPosition.x ** 2 + cursorPosition.y ** 2);
      const isWithinTarget = Math.abs(cursorPosition.x) <= 25 && Math.abs(cursorPosition.y) <= 25;

      const newEntry = {
        id: `${now}-${Math.random()}`,
        time: new Date(now).toISOString(),
        rmsError,
        isWithinTarget,
        isAuto,
        inputMode,
        position: { ...cursorPosition }
      };

      setTrackingLog(prev => [...prev, newEntry]);

      animationFrameId = requestAnimationFrame(generateLog);
    };

    animationFrameId = requestAnimationFrame(generateLog);

    return () => cancelAnimationFrame(animationFrameId);
  }, [cursorPosition, isAuto, inputMode]);

  // Separate effect JUST for parent updates
  useEffect(() => {
    if (onLogUpdate && trackingLog.length > 0) {
      const latestEntry = trackingLog[trackingLog.length - 1];
      onLogUpdate(latestEntry);
      // console.log('TrackingTask: Sent new log entry', latestEntry);
    }
  }, [trackingLog, onLogUpdate]);

  // Toggle auto mode with 'Space'
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        setIsAuto(prev => !prev);
        setAutomationFailure(false);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  // Keyboard input handling
  useEffect(() => {
    if (isAuto || inputMode !== 'keyboard') return;

    const keysPressed = new Set();
    const moveStep = 2;

    const handleKeyDown = (e) => {
      keysPressed.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e) => {
      keysPressed.delete(e.key.toLowerCase());
    };

    // Continuous movement while keys are held
    const moveInterval = setInterval(() => {
      let dx = 0, dy = 0;
      
      if (keysPressed.has('w')) dy -= moveStep;
      if (keysPressed.has('s')) dy += moveStep;
      if (keysPressed.has('a')) dx -= moveStep;
      if (keysPressed.has('d')) dx += moveStep;

      if (dx !== 0 || dy !== 0) {
        setCursorPosition(prev => ({
          x: Math.max(-150, Math.min(150, prev.x + dx)),
          y: Math.max(-150, Math.min(150, prev.y + dy))
        }));
      }
    }, 16); // ~60fps

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      clearInterval(moveInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isAuto, inputMode]);

  // Touch input handling
  const handleTouchStart = (e) => {
    if (isAuto || inputMode !== 'touch') return;
    e.preventDefault();
    
    // Get touch/click position relative to container center
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Store initial position for joystick-like behavior
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    touchStartRef.current = {
      x: clientX,
      y: clientY
    };
    
    // Start movement loop with initial direction
    clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = setInterval(() => {
      if (!touchStartRef.current) return;
      
      setCursorPosition(prev => {
        const moveStep = 2; // Reduced speed
        const deltaX = touchStartRef.current.currentX - touchStartRef.current.x;
        const deltaY = touchStartRef.current.currentY - touchStartRef.current.y;
        
        // Calculate movement based on drag distance from start point
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > 0) {
          const normalizedX = deltaX / distance;
          const normalizedY = deltaY / distance;
          
          return {
            x: Math.max(-150, Math.min(150, prev.x + normalizedX * moveStep)),
            y: Math.max(-150, Math.min(150, prev.y + normalizedY * moveStep))
          };
        }
        return prev;
      });
    }, 16);
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current || isAuto || inputMode !== 'touch') return;
    e.preventDefault();
    
    // Update current position for joystick calculations
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    touchStartRef.current.currentX = clientX;
    touchStartRef.current.currentY = clientY;
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  };

  // Add mouse event handlers for click-and-hold functionality
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click only
      handleTouchStart(e);
    }
  };

  const handleMouseMove = (e) => {
    handleTouchMove(e);
  };

  const handleMouseUp = () => {
    handleTouchEnd();
  };

  const handleMouseLeave = () => {
    handleTouchEnd();
  };

  const handleExport = () => {
    downloadCSV(trackingLog, 'tracking-log');
  };

  // Replace the status update effect (around lines 340-351)
  const statusRef = useRef({ isManual: !isAuto, isInBox: isWithinTarget });

  useEffect(() => {
    const newStatus = {
      isManual: !isAuto,
      isInBox: isWithinTarget
    };
    
    // Only update if status actually changed
    if (newStatus.isManual !== statusRef.current.isManual || 
        newStatus.isInBox !== statusRef.current.isInBox) {
      statusRef.current = newStatus;
      requestAnimationFrame(() => {
        onStatusUpdate?.(newStatus);
      });
    }
  }, [isAuto, isWithinTarget, onStatusUpdate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseLeave);
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current);
      }
    };
  }, [isAuto, inputMode]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        background: 'blue',
        color: 'white',
        textAlign: 'center',
        padding: '0.5rem',
        fontWeight: 'bold'
      }}>
        TRACKING - {isAuto ? 'AUTO' : 'MANUAL'}
      </div>

      <div 
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1,
          position: 'relative',
          background: '#f0f0f0',
          overflow: 'hidden'
        }}
      >
        <TrackingDisplay 
          cursorPosition={cursorPosition}
          targetPosition={targetPosition}
          isAuto={isAuto}
          isWithinTarget={isWithinTarget}
        />
        
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}>
          <div style={{
            padding: '5px 10px',
            background: isAuto ? 'green' : 'blue',
            color: 'white',
            borderRadius: '4px',
            fontSize: '0.8rem'
          }}>
            {isAuto ? 'AUTO' : 'MANUAL'}
          </div>
          <select 
            value={inputMode}
            onChange={(e) => setInputMode(e.target.value)}
            style={{
              padding: '5px',
              borderRadius: '4px'
            }}
          >
            <option value="keyboard">Keyboard</option>
            <option value="touch">Touch</option>
            <option value="joystick">Joystick</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// Add this static Log component to TrackingTask
TrackingTask.Log = function TrackingLog({ trackingLog }) {
  const scrollRef = useAutoScroll();
  
  const handleExport = () => {
    downloadCSV(trackingLog, 'tracking-log');
  };

  if (!trackingLog || trackingLog.length === 0) {
    return <div>No tracking events recorded</div>;
  }

  // Get last 50 entries for display only
  const recentLogs = trackingLog.slice(-50);

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
              <th style={{ padding: '0.5rem' }}>Time</th>
              <th style={{ padding: '0.5rem' }}>Mode</th>
              <th style={{ padding: '0.5rem' }}>Input</th>
              <th style={{ padding: '0.5rem' }}>Position</th>
              <th style={{ padding: '0.5rem' }}>In Target</th>
              <th style={{ padding: '0.5rem' }}>Error (px)</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  {new Date(entry.time).toLocaleTimeString()}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  {entry.isAuto ? 'Auto' : 'Manual'}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  {entry.inputMode}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  ({Math.round(entry.position.x)}, {Math.round(entry.position.y)})
                </td>
                <td style={{ 
                  padding: '0.5rem', 
                  textAlign: 'center',
                  color: entry.isWithinTarget ? 'green' : 'red'
                }}>
                  {entry.isWithinTarget ? '✓' : '✗'}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  {entry.rmsError.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Make sure to export both the component and its Log
export default TrackingTask;