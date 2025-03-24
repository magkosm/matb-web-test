import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import TrackingDisplay from './components/TrackingDisplay';
import { useAutoScroll } from './hooks/useAutoScroll';
import { downloadCSV } from './utils/csvExport';

const INITIAL_STATE = {
  cursorPosition: { x: 0, y: 0 },
  targetPosition: { x: 0, y: 0 },
  inputMode: 'keyboard', // Always default to keyboard input
  isAuto: true,
  automationFailure: false,
  trackingLog: [],
  driftX: 0,
  driftY: 0
};

const TrackingTask = forwardRef(({ 
  eventsPerMinute = 2,
  difficulty = 5,
  showLog = false, 
  onLogUpdate,
  onStatusUpdate,
  onMetricsUpdate,
  isEnabled = true,
  autoEvents = false,
  defaultInputMode
}, ref) => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [targetPosition, _setTargetPosition] = useState({ x: 0, y: 0 });
  
  // Always default to keyboard input mode or use provided prop
  const initialInputMode = defaultInputMode || 'keyboard';
  
  const [inputMode, setInputMode] = useState(initialInputMode);
  const [isAuto, setIsAuto] = useState(true);
  const [trackingLog, setTrackingLog] = useState([]);
  const [automationFailure, setAutomationFailure] = useState(false);
  const [currentEventDifficulty, setCurrentEventDifficulty] = useState(difficulty);
  const [currentEventDuration, setCurrentEventDuration] = useState(0);
  const [eventStartTime, setEventStartTime] = useState(null);
  const [showMobileHelp, setShowMobileHelp] = useState(false);
  const failureTimeoutRef = useRef(null);
  const logIntervalRef = useRef(null);
  
  const containerRef = useRef(null);
  const moveIntervalRef = useRef(null);
  const touchStartRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());
  const driftXRef = useRef(0);
  const driftYRef = useRef(0);
  const frameRef = useRef(null);

  const gamepadsRef = useRef([]);

  // Remove unused ref
  const lastLogTimeRef = useRef(Date.now());

  // Calculate if cursor is within target area
  const isWithinTarget = Math.abs(cursorPosition.x) <= 25 && Math.abs(cursorPosition.y) <= 25;

  // Add this with other refs near the top (around line 20)
  const positionRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });

  // Add near the top with other state
  const [healthImpact, setHealthImpact] = useState(0);
  const [systemLoad, setSystemLoad] = useState(0);

  // Force-update input mode if defaultInputMode prop changes
  useEffect(() => {
    if (defaultInputMode && defaultInputMode !== inputMode) {
      console.log(`TrackingTask: Force updating input mode from prop: ${defaultInputMode} (current: ${inputMode})`);
      setInputMode(defaultInputMode);
    }
  }, [defaultInputMode, inputMode]);

  // Schedule automation failures based on eventsPerMinute
  useEffect(() => {
    if (!isEnabled || !autoEvents) return;
    
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
        if (isAuto && autoEvents) {
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
  }, [isAuto, automationFailure, eventsPerMinute, isEnabled, autoEvents]);

  // Auto-recovery after manual intervention
  useEffect(() => {
    let recoveryTimeout;
    
    // Only apply auto-recovery when it's not a manually triggered event
    // If we have an eventStartTime, that means it's a manually triggered event with a specific duration
    if (!isAuto && automationFailure && !eventStartTime) {
      // Wait for 5 seconds of manual control before allowing auto recovery
      // This only applies to randomly occurring automation failures, not manual events
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
  }, [isAuto, automationFailure, eventStartTime]);

  // Physics effect
  useEffect(() => {
    if (!isEnabled) return;
    
    // Scale drift parameters based on difficulty (0-10)
    // Use event difficulty when in manual mode, otherwise use base difficulty
    const difficultyToUse = !isAuto ? currentEventDifficulty : difficulty;
    
    // More dramatic effect of difficulty on manual mode
    const manualDriftMultiplier = 0.3 + (difficultyToUse / 10) * 3.5; // Scales from 0.3x to 3.8x based on difficulty
    const driftMultiplier = isAuto ? 1.0 : manualDriftMultiplier; 
    
    const driftSpeed = 0.5 * driftMultiplier;
    
    // Increase auto-correction at lower difficulties, decrease at higher difficulties
    const autoCorrection = isAuto 
      ? 0.4 
      : Math.max(0.05, 0.3 - (difficultyToUse / 40)); // Scales from 0.3 to 0.05
      
    const maxDriftVelocity = 2.0 * driftMultiplier;
    
    // Apply initial drift based on difficulty when entering manual mode
    if (!isAuto && (driftXRef.current === 0 && driftYRef.current === 0)) {
      const initialDrift = 0.2 * driftMultiplier;
      driftXRef.current = (Math.random() - 0.5) * initialDrift * 3;
      driftYRef.current = (Math.random() - 0.5) * initialDrift * 3;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const _dt = now - lastUpdateRef.current; // Prefix with underscore since it's not used
      lastUpdateRef.current = now;

      // Make drift more responsive to difficulty
      const difficultyToUse = !isAuto ? currentEventDifficulty : difficulty;
      const randomFactor = 0.4 * driftMultiplier;
      const difficultyScale = 1 + (difficultyToUse/15); // Scales from 1.07 to 1.67

      // Add random acceleration to drift
      driftXRef.current += (Math.random() - 0.5) * randomFactor * difficultyScale;
      driftYRef.current += (Math.random() - 0.5) * randomFactor * difficultyScale;

      // Limit maximum drift velocity (scaled by difficulty in manual mode)
      driftXRef.current = Math.max(-maxDriftVelocity, Math.min(maxDriftVelocity, driftXRef.current));
      driftYRef.current = Math.max(-maxDriftVelocity, Math.min(maxDriftVelocity, driftYRef.current));

      setCursorPosition(prev => {
        let newX = prev.x + driftXRef.current * driftSpeed;
        let newY = prev.y + driftYRef.current * driftSpeed;

        // Auto mode correction - stronger in auto mode, weaker in manual
        // Calculate stronger correction at low difficulties, weaker at high difficulties
        const difficultyFactor = isAuto ? 1 : (1 - (difficultyToUse / 20)); // 0.5 to 1.0
        
        if (Math.abs(newX) > 25 || Math.abs(newY) > 25) {
          // Apply stronger correction for low difficulties
          driftXRef.current *= (1 - autoCorrection * difficultyFactor);
          driftYRef.current *= (1 - autoCorrection * difficultyFactor);
          
          if (isAuto) {
            // In auto mode, more aggressive correction
            driftXRef.current -= (newX / 30);
            driftYRef.current -= (newY / 30);
          } else {
            // In manual mode, apply very mild correction based on difficulty
            // At low difficulties, provide more assistance
            const assistLevel = Math.max(0, 0.15 - (difficultyToUse / 100));
            driftXRef.current -= (newX / 100) * assistLevel;
            driftYRef.current -= (newY / 100) * assistLevel;
          }
        }

        // Bounce off boundaries with more energy based on difficulty
        const bounceEnergy = 0.8 + (difficultyToUse / 10); // 0.8 to 1.8 based on difficulty 
        if (Math.abs(newX) > 150) {
          driftXRef.current = -driftXRef.current * bounceEnergy;
          newX = Math.sign(newX) * 150;
        }
        if (Math.abs(newY) > 150) {
          driftYRef.current = -driftYRef.current * bounceEnergy;
          newY = Math.sign(newY) * 150;
        }

        return { x: newX, y: newY };
      });
    }, 16);

    return () => clearInterval(interval);
  }, [isAuto, inputMode, automationFailure, isEnabled, difficulty, currentEventDifficulty]);

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

      frameRef.current = requestAnimationFrame(generateLog);
    };

    frameRef.current = requestAnimationFrame(generateLog);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
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

  // Keyboard input handling (separate from physics)
  useEffect(() => {
    if (isAuto || inputMode !== 'keyboard' || !isEnabled) return;
    
    const keysPressed = new Set();
    const moveStep = 2;

    const handleKeyDown = (e) => {
      keysPressed.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e) => {
      keysPressed.delete(e.key.toLowerCase());
    };

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
    }, 16);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      clearInterval(moveInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isAuto, inputMode, isEnabled]);

  // Touch input handling
  const handleTouchStart = useCallback((e) => {
    if (isAuto || inputMode !== 'touch') return;
    e.preventDefault();
    
    // Get touch/click position relative to container center
    const rect = containerRef.current.getBoundingClientRect();
    // These are needed for calculations even if not directly used
    const _centerX = rect.width / 2;
    const _centerY = rect.height / 2;
    
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
  }, [isAuto, inputMode]);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current || isAuto || inputMode !== 'touch') return;
    e.preventDefault();
    
    // Update current position for joystick calculations
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    touchStartRef.current.currentX = clientX;
    touchStartRef.current.currentY = clientY;
  }, [isAuto, inputMode]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  }, []);

  // Add mouse event handlers for click-and-hold functionality
  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) { // Left click only
      handleTouchStart(e);
    }
  }, [handleTouchStart]);

  const handleMouseMove = useCallback((e) => {
    handleTouchMove(e);
  }, [handleTouchMove]);

  const handleMouseUp = useCallback(() => {
    handleTouchEnd();
  }, [handleTouchEnd]);

  const handleMouseLeave = useCallback(() => {
    handleTouchEnd();
  }, [handleTouchEnd]);

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

    // Define event handlers inside this useEffect to avoid dependency issues
    const touchStartHandler = (e) => handleTouchStart(e);
    const touchMoveHandler = (e) => handleTouchMove(e);
    const touchEndHandler = () => handleTouchEnd();
    const mouseDownHandler = (e) => handleMouseDown(e);
    const mouseMoveHandler = (e) => handleMouseMove(e);
    const mouseUpHandler = () => handleMouseUp();
    const mouseLeaveHandler = () => handleMouseLeave();

    container.addEventListener('touchstart', touchStartHandler);
    container.addEventListener('touchmove', touchMoveHandler);
    container.addEventListener('touchend', touchEndHandler);
    container.addEventListener('mousedown', mouseDownHandler);
    container.addEventListener('mousemove', mouseMoveHandler);
    container.addEventListener('mouseup', mouseUpHandler);
    container.addEventListener('mouseleave', mouseLeaveHandler);

    return () => {
      container.removeEventListener('touchstart', touchStartHandler);
      container.removeEventListener('touchmove', touchMoveHandler);
      container.removeEventListener('touchend', touchEndHandler);
      container.removeEventListener('mousedown', mouseDownHandler);
      container.removeEventListener('mousemove', mouseMoveHandler);
      container.removeEventListener('mouseup', mouseUpHandler);
      container.removeEventListener('mouseleave', mouseLeaveHandler);
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current);
      }
    };
  }, [isAuto, inputMode, handleTouchStart, handleTouchMove, handleTouchEnd, 
      handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave]);

  // First, we need to move the startAutomation function definition before resetTask
  const startAutomation = useCallback(() => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
    }
    
    moveIntervalRef.current = setInterval(() => {
      if (!isAuto) return;
      
      const targetPos = targetRef.current;
      const currentPos = positionRef.current;
      
      // Move cursor towards target
      const dx = (targetPos.x - currentPos.x) * 0.1;
      const dy = (targetPos.y - currentPos.y) * 0.1;
      
      positionRef.current = {
        x: currentPos.x + dx,
        y: currentPos.y + dy
      };
      
      setCursorPosition(positionRef.current);
    }, 16); // 60fps
  }, [isAuto]);

  const resetTask = useCallback(() => {
    // Always use keyboard input mode
    const currentInputMode = 'keyboard';
    
    // Reset all state to initial values
    setCursorPosition(INITIAL_STATE.cursorPosition);
    // Set input mode to keyboard
    setInputMode(currentInputMode);
    setIsAuto(INITIAL_STATE.isAuto);
    setTrackingLog(INITIAL_STATE.trackingLog);
    setAutomationFailure(INITIAL_STATE.automationFailure);
    setCurrentEventDifficulty(difficulty);
    setCurrentEventDuration(0);
    setEventStartTime(null);
    
    // Reset all refs
    driftXRef.current = INITIAL_STATE.driftX;
    driftYRef.current = INITIAL_STATE.driftY;
    touchStartRef.current = null;
    lastUpdateRef.current = Date.now();
    lastLogTimeRef.current = Date.now();
    positionRef.current = { ...INITIAL_STATE.cursorPosition };
    targetRef.current = { x: 0, y: 0 };
    statusRef.current = { isManual: false, isInBox: true };
    
    // Clear all timeouts and intervals
    if (failureTimeoutRef.current) {
      clearTimeout(failureTimeoutRef.current);
      failureTimeoutRef.current = null;
    }
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
    if (logIntervalRef.current) {
      clearInterval(logIntervalRef.current);
      logIntervalRef.current = null;
    }
    
    // Cancel any pending animation frames
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    // Restart automation immediately
    startAutomation();

    // Notify parent components of reset
    requestAnimationFrame(() => {
      onStatusUpdate?.({ isManual: false, isInBox: true });
      onLogUpdate?.({
        id: `reset-${Date.now()}`,
        time: new Date().toISOString(),
        rmsError: 0,
        isWithinTarget: true,
        isAuto: true,
        inputMode: currentInputMode,
        position: { x: 0, y: 0 }
      });
    });

    // Reset metrics
    setHealthImpact(0);
    setSystemLoad(0);
    onMetricsUpdate?.({ healthImpact: 0, systemLoad: 0 });
    
    console.log(`TrackingTask: Reset complete, using keyboard input mode`);
  }, [onStatusUpdate, onLogUpdate, onMetricsUpdate, difficulty, startAutomation]);

  useImperativeHandle(ref, () => ({
    resetTask,
    getMetrics: () => ({
      healthImpact,
      systemLoad,
      isWithinTarget,
      isAutomatic: isAuto
    }),
    setDifficulty: (value) => {
      console.log('TrackingTask: Setting difficulty to', value);
      setCurrentEventDifficulty(value);
    },
    forceManualControl: (config) => {
      try {
        const { duration, difficulty } = config;
        
        // If already in manual mode, don't trigger again
        if (!isAuto) {
          return false;
        }
        
        // Make sure we have valid duration (default to 30 seconds if not provided)
        const eventDuration = duration || 30000;
        
        // Force into manual mode
        setIsAuto(false);
        setAutomationFailure(true);
        
        // Store current event parameters in state
        setCurrentEventDifficulty(difficulty || 5);
        setCurrentEventDuration(eventDuration);
        setEventStartTime(Date.now());
        
        // Calculate end time for better tracking
        const _endTime = new Date(Date.now() + eventDuration); // Prefix with underscore since it's not used
        
        // Set difficulty level for tracking if provided (1-10 scale)
        if (typeof difficulty === 'number') {
          // Apply difficulty by adjusting the drift values - more intense than before
          const difficultyFactor = (difficulty / 5.0) * 2; // Convert 1-10 scale to 0.4-4.0 factor
          
          // Create an initial push in a random direction
          const angle = Math.random() * Math.PI * 2; // Random angle
          const magnitude = 0.1 * difficultyFactor;
          
          driftXRef.current = Math.cos(angle) * magnitude;
          driftYRef.current = Math.sin(angle) * magnitude;
        }
        
        // Create and log an event
        const eventData = {
          time: Date.now(),
          event: 'MANUAL_CONTROL_FORCED',
          duration: eventDuration,
          durationInSeconds: eventDuration / 1000,
          difficulty: difficulty || 5,
          isWithinTarget
        };
        
        // Log the event to the tracking log
        setTrackingLog(prev => [...prev, eventData]);
        
        // If onLogUpdate is provided, send the event to the parent component
        if (onLogUpdate) {
          onLogUpdate(eventData);
        }
        
        // Set timer to revert to automatic mode
        const timeoutId = setTimeout(() => {
          // Return to auto mode
          setIsAuto(true);
          setAutomationFailure(false);
          driftXRef.current = 0;
          driftYRef.current = 0;
          
          // Log recovery event
          const recoveryEvent = {
            time: Date.now(),
            event: 'AUTO_CONTROL_RESTORED',
            eventDuration: eventDuration / 1000,
            actualDuration: (Date.now() - eventStartTime) / 1000,
            isWithinTarget
          };
          
          // Clear event timing information
          setCurrentEventDuration(0);
          setEventStartTime(null);
          
          // Log the recovery event
          setTrackingLog(prev => [...prev, recoveryEvent]);
          
          // If onLogUpdate is provided, send the event to the parent component
          if (onLogUpdate) {
            onLogUpdate(recoveryEvent);
          }
        }, eventDuration);
        
        // Save timeout ID to clear if needed
        if (failureTimeoutRef.current) {
          clearTimeout(failureTimeoutRef.current);
        }
        failureTimeoutRef.current = timeoutId;
        
        return true;
      } catch (error) {
        console.error('Error forcing manual control:', error);
        return false;
      }
    }
  }), [resetTask, healthImpact, systemLoad, isAuto, isWithinTarget, onMetricsUpdate, eventStartTime, onLogUpdate]);

  // Add metrics calculation effect
  useEffect(() => {
    if (!isEnabled) {
      onMetricsUpdate?.(TrackingTask.getDefaultMetrics());
      return;
    }

    const calculateHealthImpact = () => {
      if (isAuto) return 0;
      
      // Scale impact by difficulty (higher difficulty = higher impact)
      const difficultyMultiplier = currentEventDifficulty / 5;
      
      // Calculate time elapsed ratio if we have start time and duration
      let timeRatio = 1.0;
      let elapsedTime = 0;
      let progress = 0;
      
      if (eventStartTime && currentEventDuration) {
        elapsedTime = Date.now() - eventStartTime;
        progress = Math.min(1, elapsedTime / currentEventDuration);
        // Make impact stronger in the middle of the event
        timeRatio = 1 - (Math.abs(progress - 0.5) * 0.5);
      }
      
      // Base values: success = +0.5 to +1.5, failure = -0.5 to -3.0 
      // Scale based on difficulty
      const baseSuccessImpact = 0.5 + (currentEventDifficulty / 10);
      const baseFailureImpact = -0.5 - (currentEventDifficulty / 5);
      
      // Apply time and difficulty scaling
      const impact = isWithinTarget 
        ? baseSuccessImpact * difficultyMultiplier * timeRatio
        : baseFailureImpact * difficultyMultiplier * timeRatio;
      
      return impact;
    };

    const calculateSystemLoad = () => {
      if (isAuto) return 0;
      
      // Scale system load by difficulty (higher difficulty = higher load)
      const difficultyMultiplier = currentEventDifficulty / 5;
      
      // Base values: on target = 15, off target = 30
      const baseLoadOnTarget = 15 * difficultyMultiplier;
      const baseLoadOffTarget = 30 * difficultyMultiplier;
      
      return isWithinTarget ? baseLoadOnTarget : baseLoadOffTarget;
    };

    const updateInterval = setInterval(() => {
      const healthImpact = calculateHealthImpact();
      const systemLoad = calculateSystemLoad();
      
      // Store calculated values in state for imperative handle
      setHealthImpact(healthImpact);
      setSystemLoad(systemLoad);
      
      onMetricsUpdate?.({
        healthImpact,
        systemLoad
      });
    }, 100);

    return () => clearInterval(updateInterval);
  }, [isEnabled, isAuto, isWithinTarget, onMetricsUpdate, currentEventDifficulty, currentEventDuration, eventStartTime]);

  // Modify the input mode change handler to be more robust
  const handleInputModeChange = useCallback((newMode) => {
    if (newMode === inputMode) return; // No change
    
    // Clear any active touch/movement handlers
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
    touchStartRef.current = null;
    
    // Update the input mode
    setInputMode(newMode);
    
    // Show help tooltip for 5 seconds when switching to touch mode
    if (newMode === 'touch') {
      setShowMobileHelp(true);
      setTimeout(() => setShowMobileHelp(false), 5000);
    }
  }, [inputMode]);

  if (!isEnabled) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        color: '#666'
      }}>
        Tracking Task Disabled
      </div>
    );
  }

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
        {showMobileHelp && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '15px',
            borderRadius: '10px',
            zIndex: 10,
            maxWidth: '80%',
            textAlign: 'center',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
          }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Touch Controls Activated</p>
            <p style={{ margin: '0' }}>Tap and drag to move the cursor to keep it within the target box.</p>
          </div>
        )}
        
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
          <div style={{
            padding: '3px',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '4px',
            boxShadow: '0 0 5px rgba(0,0,0,0.2)'
          }}>
            <select 
              value={inputMode}
              onChange={(e) => handleInputModeChange(e.target.value)}
              style={{
                padding: '8px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="keyboard">Keyboard (WASD)</option>
              <option value="touch">Touch/Mouse</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
});

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
              <th style={{ padding: '0.5rem' }}>Event/Mode</th>
              <th style={{ padding: '0.5rem' }}>Details</th>
              <th style={{ padding: '0.5rem' }}>Position</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
              <th style={{ padding: '0.5rem' }}>Error (px)</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.map((entry) => (
              <tr key={entry.id || entry.time} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  {new Date(entry.time).toLocaleTimeString()}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  {entry.event ? entry.event : (entry.isAuto ? 'Auto' : 'Manual')}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  {entry.event ? 
                    (entry.actualDuration ? `Duration: ${entry.actualDuration.toFixed(1)}s` : '') : 
                    entry.inputMode}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  {entry.position ? 
                    `(${Math.round(entry.position.x)}, ${Math.round(entry.position.y)})` : 
                    '---'}
                </td>
                <td style={{ 
                  padding: '0.5rem', 
                  textAlign: 'center',
                  color: entry.isWithinTarget ? 'green' : 'red'
                }}>
                  {entry.isWithinTarget !== undefined ? (entry.isWithinTarget ? '✓' : '✗') : '---'}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  {entry.rmsError !== undefined ? entry.rmsError.toFixed(1) : '---'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Add this static method like ResourceManagementTask has
TrackingTask.getDefaultMetrics = () => ({
  healthImpact: 0,
  systemLoad: 0
});

export default TrackingTask;