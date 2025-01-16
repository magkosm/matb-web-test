import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import Tank from './components/Tank';
import Pump from './components/Pump';
import Connection from './components/Connection';
import './components/Connection.css';
import StatusDisplay from './components/StatusDisplay';
import { useAutoScroll } from './hooks/useAutoScroll';
import { downloadCSV } from './utils/csvExport';

// Constants for initial setup
const INITIAL_STATE = {
  tanks: {
    a: { level: 2500, max: 5000, target: 2500, depletable: true, lossPerMinute: 500 },
    b: { level: 2500, max: 5000, target: 2500, depletable: true, lossPerMinute: 500 },
    c: { level: 1000, max: 2000, target: null, depletable: true, lossPerMinute: 0 },
    d: { level: 1000, max: 2000, target: null, depletable: true, lossPerMinute: 0 },
    e: { level: 3000, max: 4000, target: null, depletable: false, lossPerMinute: 0 },
    f: { level: 3000, max: 4000, target: null, depletable: false, lossPerMinute: 0 }
  },
  pumps: {
    1: { flow: 800, state: 'off', fromTank: 'c', toTank: 'a' },
    2: { flow: 600, state: 'off', fromTank: 'e', toTank: 'a' },
    3: { flow: 800, state: 'off', fromTank: 'd', toTank: 'b' },
    4: { flow: 600, state: 'off', fromTank: 'f', toTank: 'b' },
    5: { flow: 600, state: 'off', fromTank: 'e', toTank: 'c' },
    6: { flow: 600, state: 'off', fromTank: 'f', toTank: 'd' },
    7: { flow: 400, state: 'off', fromTank: 'a', toTank: 'b' },
    8: { flow: 400, state: 'off', fromTank: 'b', toTank: 'a' }
  },
  failures: new Set()
};

// Constants for difficulty scaling
const MIN_LOSS_MULTIPLIER = 0.25; // 25% of normal loss rate at difficulty 0
const MAX_LOSS_MULTIPLIER = 2.0;  // 200% of normal loss rate at difficulty 10

// Define Log component
function ResourceManagementLog({ resourceLog }) {
  const scrollRef = useAutoScroll();
  
  // Ensure resourceLog is always an array
  const safeLog = Array.isArray(resourceLog) ? resourceLog : [];

  const handleExport = () => {
    downloadCSV(safeLog, 'resource-management-log');
  };

  if (!safeLog || safeLog.length === 0) {
    return <div>No resource events recorded</div>;
  }

  const recentLogs = safeLog.slice(-50);

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
              <th style={{ padding: '0.5rem' }}>Tank A</th>
              <th style={{ padding: '0.5rem' }}>Tank B</th>
              <th style={{ padding: '0.5rem' }}>Diff A</th>
              <th style={{ padding: '0.5rem' }}>Diff B</th>
              <th style={{ padding: '0.5rem' }}>Active Pumps</th>
              <th style={{ padding: '0.5rem' }}>Failed Pumps</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.map((entry, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>
                  {new Date(entry.time).toLocaleTimeString()}
                </td>
                <td style={{ padding: '0.5rem' }}>{entry.tankA}</td>
                <td style={{ padding: '0.5rem' }}>{entry.tankB}</td>
                <td style={{ padding: '0.5rem' }}>{entry.diffA}</td>
                <td style={{ padding: '0.5rem' }}>{entry.diffB}</td>
                <td style={{ padding: '0.5rem' }}>{entry.activePumps}</td>
                <td style={{ padding: '0.5rem' }}>{entry.failedPumps}</td>
                <td style={{ 
                  padding: '0.5rem',
                  color: entry.corrA && entry.corrB ? 'green' : 'red'
                }}>
                  {entry.corrA && entry.corrB ? '✓' : '✗'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Add these constants at the top with other constants
const FUEL_RANGES = {
  CRITICAL: { min: 1000, max: 3000, impact: -2 },
  WARNING: { min: 2250, max: 2750, impact: -1 },
  NEUTRAL: { min: 2400, max: 2600, impact: 0 },
  OPTIMAL: { min: 2400, max: 2600, impact: +1 }
};

// Define main component
function ResourceManagementTaskComponent({ 
  eventsPerMinute = 2, 
  difficulty = 5,
  showLog = true, 
  onLogUpdate,
  onMetricsUpdate,
  isEnabled = true
}, ref) {
  const containerRef = useRef(null);
  const [tanks, setTanks] = useState(INITIAL_STATE.tanks);
  const [pumps, setPumps] = useState(INITIAL_STATE.pumps);
  const [tankPositions, setTankPositions] = useState({});
  const [pumpPositions, setPumpPositions] = useState({});
  const [failures, setFailures] = useState(INITIAL_STATE.failures);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [resourceLog, setResourceLog] = useState([]);
  const [lossMultiplier, setLossMultiplier] = useState(0.5); // Default 50%
  const [lastLogTime, setLastLogTime] = useState(Date.now());
  const lastMetricsStringRef = useRef('');
  const [repairingPumps, setRepairingPumps] = useState(() => new Set());

  // Calculate and store positions of tanks and pumps
  useEffect(() => {
    if (!containerRef.current) return;
  
    const container = containerRef.current.getBoundingClientRect();
    const contentWidth = container.width;
    const contentHeight = container.height - 40; // Account for title bar
    
    // Base positions as percentages (adjusted for better spacing)
    const basePositions = {
      a: { x: 30, y: 25 },
      b: { x: 70, y: 25 },
      c: { x: 20, y: 75 },
      d: { x: 60, y: 75 },
      e: { x: 40, y: 75 },
      f: { x: 80, y: 75 }
    };
  
    // Calculate actual positions
    const newTankPositions = {};
    Object.entries(basePositions).forEach(([key, pos]) => {
      newTankPositions[key] = {
        x: (pos.x * contentWidth) / 100,
        y: (pos.y * contentHeight) / 100
      };
    });
  
    setTankPositions(newTankPositions);
    setPumpPositions(calculatePumpPositions(newTankPositions));
  }, [containerRef.current?.offsetWidth, containerRef.current?.offsetHeight]);

  // Helper function to calculate pump positions
  const calculatePumpPositions = (tankPos) => {
    const positions = {};
    Object.entries(INITIAL_STATE.pumps).forEach(([id, pump]) => {
      const fromTank = tankPos[pump.fromTank];
      const toTank = tankPos[pump.toTank];
      
      if (id === '7' || id === '8') {
        // Horizontal pumps between A and B - closer together
        const yOffset = id === '7' ? -8 : 8;  // Reduced vertical offset
        positions[id] = {
          x: (fromTank.x + toTank.x) / 2,
          y: fromTank.y + (yOffset * containerRef.current.offsetHeight / 100)
        };
      } else if (id === '5' || id === '6') {
        // Pumps 5 and 6 exactly centered
        positions[id] = {
          x: (fromTank.x + toTank.x) / 2,
          y: (fromTank.y + toTank.y) / 2
        };
      } else {
        // Pumps 1-4 closer to their diagonal lines
        const xOffset = (id === '1' || id === '3') ? -1 : 1;  // Minimal horizontal offset
        positions[id] = {
          x: (fromTank.x + toTank.x) / 2 + (xOffset * containerRef.current.offsetWidth / 100),
          y: (fromTank.y + toTank.y) / 1.8
        };
      }
    });
    return positions;
  };

  // Handle keyboard controls
  const handleKeyPress = useCallback((event) => {
    const key = event.key;
    if (/[1-8]/.test(key)) {
      const pumpId = key;
      if (!failures.has(pumpId)) {
        togglePump(pumpId);
      }
    }
  }, [failures]);

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Modify the failure handling system
  useEffect(() => {
    if (!isEnabled) return;

    const failureInterval = setInterval(() => {
      const workingPumps = Object.keys(pumps).filter(id => 
        !failures.has(id) && 
        !repairingPumps.has(id) &&  // Add this check
        pumps[id].state !== 'failure'
      );
      
      if (workingPumps.length === 0) return;

      const baseFailureChance = 0.005;
      const epmMultiplier = eventsPerMinute / 2;
      const totalChance = Math.min(baseFailureChance * epmMultiplier, 0.05);

      workingPumps.forEach(pumpId => {
        if (Math.random() < totalChance && !repairingPumps.has(pumpId)) {
          console.log(`Pump ${pumpId} failing... (EPM: ${eventsPerMinute})`);
          
          // Use a single atomic update
          setRepairingPumps(prev => {
            if (prev.has(pumpId)) return prev; // Prevent duplicate repairs
            const next = new Set(prev);
            next.add(pumpId);
            
            // Update failures and pump state
            setFailures(current => new Set([...current, pumpId]));
            setPumps(current => ({
              ...current,
              [pumpId]: { ...current[pumpId], state: 'failure' }
            }));
            
            // Schedule repair
            const repairTime = Math.max(5000, 15000 - (eventsPerMinute * 1000));
            setTimeout(() => {
              setRepairingPumps(curr => {
                const updated = new Set(curr);
                updated.delete(pumpId);
                return updated;
              });
              setFailures(curr => {
                const updated = new Set(curr);
                updated.delete(pumpId);
                return updated;
              });
              setPumps(curr => ({
                ...curr,
                [pumpId]: { ...curr[pumpId], state: 'off' }
              }));
              console.log(`Pump ${pumpId} repaired`);
            }, repairTime);
            
            return next;
          });
        }
      });
    }, 1000);

    return () => clearInterval(failureInterval);
  }, [isEnabled, eventsPerMinute, pumps]);

  // Add debug logging for loss rate
  useEffect(() => {
    console.log('Loss Rate:', {
      difficulty,
      lossMultiplier,
      tankALoss: tanks.a.lossPerMinute * lossMultiplier,
      tankBLoss: tanks.b.lossPerMinute * lossMultiplier
    });
  }, [difficulty, lossMultiplier]);

  // Modify togglePump to be more robust
  const togglePump = (pumpId) => {
    console.log(`Attempting to toggle pump ${pumpId}`, {
      currentState: pumps[pumpId]?.state,
      isFailed: failures.has(pumpId)
    });
    
    // Check both the failures Set and the pump's state
    if (failures.has(pumpId) || pumps[pumpId]?.state === 'failure') {
      console.log(`Cannot toggle pump ${pumpId} - failed`);
      return;
    }
    
    setPumps(prev => {
      const pump = prev[pumpId];
      if (!pump) return prev;
      
      const newState = pump.state === 'on' ? 'off' : 'on';
      console.log(`Toggling pump ${pumpId} from ${pump.state} to ${newState}`);
      
      return {
        ...prev,
        [pumpId]: {
          ...pump,
          state: newState
        }
      };
    });
  };

  // Add debug logging for pump operations
  useEffect(() => {
    const operationalPumps = Object.entries(pumps)
      .filter(([id, pump]) => pump.state === 'on' && !failures.has(id))
      .map(([id]) => id);
      
    console.log('Operational Pumps:', {
      pumps: operationalPumps,
      failures: Array.from(failures),
      states: Object.entries(pumps).map(([id, pump]) => ({
        id,
        state: pump.state,
        failed: failures.has(id)
      }))
    });
  }, [pumps, failures]);

  // Calculate loss multiplier when difficulty changes
  useEffect(() => {
    const normalizedDifficulty = difficulty / 10; // Convert 0-10 to 0-1
    const multiplier = MIN_LOSS_MULTIPLIER + 
      (MAX_LOSS_MULTIPLIER - MIN_LOSS_MULTIPLIER) * normalizedDifficulty;
    setLossMultiplier(multiplier);
  }, [difficulty]);

  // Modify tank depletion to use loss multiplier
  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastUpdate) / 1000;
      
      setTanks(prevTanks => {
        const newTanks = { ...prevTanks };
        
        // Apply tank depletion with difficulty multiplier
        Object.entries(newTanks).forEach(([tankId, tank]) => {
          if (tank.depletable && tank.lossPerMinute > 0) {
            const adjustedLossRate = tank.lossPerMinute * lossMultiplier;
            const loss = (adjustedLossRate / 60) * deltaTime;
            newTanks[tankId].level = Math.max(0, tank.level - loss);
          }
        });

        // Apply pump transfers - only for working pumps
        Object.entries(pumps).forEach(([pumpId, pump]) => {
          // Check both failures Set and pump state
          const isPumpWorking = pump.state === 'on' && 
                              !failures.has(pumpId) && 
                              pump.state !== 'failure';

          if (isPumpWorking) {
            const flow = (pump.flow / 60) * deltaTime;
            const fromTank = newTanks[pump.fromTank];
            const toTank = newTanks[pump.toTank];

            // Calculate actual flow based on available fuel and tank capacity
            const availableFlow = Math.min(
              flow,
              fromTank.depletable ? fromTank.level : flow,
              toTank.max - toTank.level
            );

            if (fromTank.depletable) {
              newTanks[pump.fromTank].level = Math.max(0, fromTank.level - availableFlow);
            }
            newTanks[pump.toTank].level = Math.min(toTank.max, toTank.level + availableFlow);
          }
        });

        return newTanks;
      });

      setLastUpdate(now);
    }, 100);

    return () => clearInterval(interval);
  }, [pumps, lastUpdate, failures, lossMultiplier, isEnabled]);

  // Add to your existing state declarations
  const logRow = useCallback((row) => {
    if (!isEnabled) return;
    
    setResourceLog(prev => {
      const newLog = [...prev, row];
      // Call external handler in the next tick to avoid render conflicts
      setTimeout(() => onLogUpdate?.(newLog), 0);
      return newLog;
    });
  }, [isEnabled, onLogUpdate]);

  // Add logging to your existing tank level updates
  useEffect(() => {
    const now = Date.now();
    
    // Only log if 1 second has passed since last log AND the task is enabled
    if (now - lastLogTime >= 1000 && isEnabled) {
      const tankALevel = Math.round(tanks.a.level);
      const tankBLevel = Math.round(tanks.b.level);
      const corrA = tankALevel >= 2250 && tankALevel <= 2750;
      const corrB = tankBLevel >= 2250 && tankBLevel <= 2750;
      
      // Create the log entry
      const logEntry = {
        time: now,
        tankA: tankALevel,
        tankB: tankBLevel,
        diffA: Math.round(Math.abs(tanks.a.level - tanks.a.target)),
        diffB: Math.round(Math.abs(tanks.b.level - tanks.b.target)),
        activePumps: Object.entries(pumps).filter(([_, p]) => p.state === 'on').length,
        failedPumps: failures.size,
        corrA,
        corrB
      };

      // Use logRow instead of direct state updates
      logRow(logEntry);
      setLastLogTime(now);
    }
  }, [tanks, pumps, failures, isEnabled]);

  // -------------------------
  // Helper Functions
  // -------------------------

  /**
   * Calculates the absolute difference between the tank level and its target.
   * @param {Object} tank - The tank object containing level and target.
   * @returns {number} - The absolute difference.
   */
  const calculateDifference = (tank) => {
    return Math.abs(tank.level - tank.target);
  };

  /**
   * Returns the number of active pumps.
   * @returns {number} - Count of pumps that are currently on.
   */
  const getActivePumps = () => {
    return Object.values(pumps).filter(pump => pump.state === 'on').length;
  };

  // Reset function
  const resetTask = () => {
    // Reset tanks to initial state with exact values
    setTanks({
      a: { level: 2500, max: 5000, target: 2500, depletable: true, lossPerMinute: 500 },
      b: { level: 2500, max: 5000, target: 2500, depletable: true, lossPerMinute: 500 },
      c: { level: 1000, max: 2000, target: null, depletable: true, lossPerMinute: 0 },
      d: { level: 1000, max: 2000, target: null, depletable: true, lossPerMinute: 0 },
      e: { level: 3000, max: 4000, target: null, depletable: false, lossPerMinute: 0 },
      f: { level: 3000, max: 4000, target: null, depletable: false, lossPerMinute: 0 }
    });

    // Reset all pumps to off state
    setPumps({
      1: { flow: 800, state: 'off', fromTank: 'c', toTank: 'a' },
      2: { flow: 600, state: 'off', fromTank: 'e', toTank: 'a' },
      3: { flow: 800, state: 'off', fromTank: 'd', toTank: 'b' },
      4: { flow: 600, state: 'off', fromTank: 'f', toTank: 'b' },
      5: { flow: 600, state: 'off', fromTank: 'e', toTank: 'c' },
      6: { flow: 600, state: 'off', fromTank: 'f', toTank: 'd' },
      7: { flow: 400, state: 'off', fromTank: 'a', toTank: 'b' },
      8: { flow: 400, state: 'off', fromTank: 'b', toTank: 'a' }
    });

    // Clear all failures
    setFailures(new Set());
    
    // Reset all timers and logs
    setResourceLog([]);
    setLastUpdate(Date.now());
    setLastLogTime(Date.now());
    
    // Reset difficulty-related settings
    setLossMultiplier(MIN_LOSS_MULTIPLIER + 
      (MAX_LOSS_MULTIPLIER - MIN_LOSS_MULTIPLIER) * (difficulty / 10));
    onLogUpdate?.([]);  // Also clear external logs
  };

  // Expose resetTask to ref
  useImperativeHandle(ref, () => ({
    resetTask
  }));

  // Calculate health impact based on tank states and failures
  const calculateHealthImpact = useCallback(() => {
    let impactPerSecond = 0;
    const TARGET = 2500;
    
    // Calculate absolute differences from target
    const diffA = Math.abs(tanks.a.level - TARGET);
    const diffB = Math.abs(tanks.b.level - TARGET);
    
    // Calculate impact per second for each tank
    const getImpactPerSecond = (diff) => {
      if (diff <= 100) return 0.5;      // Within 100 units: +0.5 per sec
      if (diff <= 250) return 0.25;     // Within 250 units: +0.25 per sec
      if (diff <= 500) return 0;        // Within 500 units: no impact
      return -1;                        // More than 500 units: -1 per sec
    };
    
    impactPerSecond += getImpactPerSecond(diffA);
    impactPerSecond += getImpactPerSecond(diffB);
    
    console.log('Health Impact Per Second:', {
      tankADiff: diffA,
      tankBDiff: diffB,
      tankAImpactPerSec: getImpactPerSecond(diffA),
      tankBImpactPerSec: getImpactPerSecond(diffB),
      totalImpactPerSec: impactPerSecond
    });
    
    return impactPerSecond;  // Return per-second rate
  }, [tanks.a.level, tanks.b.level]);

  // Calculate system load based on failures and tank states
  const calculateSystemLoad = useCallback(() => {
    let load = 0;
    
    // Add load for each failed pump
    load += failures.size * 1; // Each failed pump adds 2 to load
    
    // Add load for tanks in critical state
    if (tanks.a.level < FUEL_RANGES.CRITICAL.min || tanks.a.level > FUEL_RANGES.CRITICAL.max) {
      load += 5; // Critical tank state adds 3 to load
    }
    if (tanks.b.level < FUEL_RANGES.CRITICAL.min || tanks.b.level > FUEL_RANGES.CRITICAL.max) {
      load += 5; // Critical tank state adds 3 to load
    }
    
    // Add load for tanks in warning state
    if ((tanks.a.level >= FUEL_RANGES.WARNING.min && tanks.a.level < FUEL_RANGES.OPTIMAL.min) ||
        (tanks.a.level > FUEL_RANGES.OPTIMAL.max && tanks.a.level <= FUEL_RANGES.WARNING.max)) {
      load += 10; // Warning tank state adds 1 to load
    }
    if ((tanks.b.level >= FUEL_RANGES.WARNING.min && tanks.b.level < FUEL_RANGES.OPTIMAL.min) ||
        (tanks.b.level > FUEL_RANGES.OPTIMAL.max && tanks.b.level <= FUEL_RANGES.WARNING.max)) {
      load += 10; // Warning tank state adds 1 to load
    }
    
    return load;
  }, [failures.size, tanks.a.level, tanks.b.level]);

  // Add this function after calculateSystemLoad
  const calculateResourceLoad = useCallback(() => {
    let load = 0;  // No base load!
    
    // Add load for failed pumps (2.5 each up to max of 10)
    const failedPumpLoad = Math.min(10, failures.size * 2.5);
    load += failedPumpLoad;
    
    // Add load for tank states (5 each if in warning or critical)
    const tankAState = getTankState(tanks.a.level);
    const tankBState = getTankState(tanks.b.level);
    
    // Add 5 for each tank in warning OR critical state
    if (tankAState === 'CRITICAL' || tankAState === 'WARNING') load += 5;
    if (tankBState === 'CRITICAL' || tankBState === 'WARNING') load += 5;
    
    console.log('Load Calculation:', {
      failedPumpLoad,
      tankALoad: (tankAState === 'CRITICAL' || tankAState === 'WARNING') ? 5 : 0,
      tankBLoad: (tankBState === 'CRITICAL' || tankBState === 'WARNING') ? 5 : 0,
      totalLoad: Math.min(100, Math.max(0, load))
    });
    
    return Math.min(100, Math.max(0, load));
  }, [failures.size, tanks.a.level, tanks.b.level]);

  // Helper function to get tank state for logging
  const getTankState = (level) => {
    if (level < FUEL_RANGES.CRITICAL.min || level > FUEL_RANGES.CRITICAL.max) return 'CRITICAL';
    if (level < FUEL_RANGES.WARNING.min || level > FUEL_RANGES.WARNING.max) return 'WARNING';
    return 'NORMAL';
  };

  // Modify the metrics update effect
  useEffect(() => {
    if (!isEnabled) {
      onMetricsUpdate?.({ healthImpact: 0, systemLoad: 0 });
      return;
    }

    const updateInterval = setInterval(() => {
      const systemLoad = calculateResourceLoad();
      const healthImpact = calculateHealthImpact();
      
      onMetricsUpdate?.({
        healthImpact,
        systemLoad
      });
      
      console.log('Resource Management Metrics Update:', {
        healthImpact,
        systemLoad,
        activePumps: Object.values(pumps).filter(p => p.state === 'on' && !failures.has(p.id)).length,
        failedPumps: failures.size,
        tankAState: getTankState(tanks.a.level),
        tankBState: getTankState(tanks.b.level)
      });
      
    }, 100);

    return () => clearInterval(updateInterval);
  }, [isEnabled, calculateResourceLoad, calculateHealthImpact]);

  // Return placeholder when task is disabled
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
        Resource Management Task Disabled
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Title Bar */}
      <div style={{
        background: 'blue',
        color: 'white',
        textAlign: 'center',
        padding: '0.5rem',
        fontWeight: 'bold',
        flexShrink: 0 // Prevent title from shrinking
      }}>
        RESOURCE MANAGEMENT
      </div>

      

      {/* Main Content */}
      <div style={{
        flex: 1,
        position: 'relative',
        margin: '2%',
        height: '96%', // Account for margin
        width: '96%'  // Account for margin
      }}>
        {/* Connections */}
        <svg style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}>
          {Object.entries(INITIAL_STATE.pumps).map(([id, pump]) => {
            if (!tankPositions[pump.fromTank] || !tankPositions[pump.toTank]) return null;
            
            // Calculate start and end positions
            let startX = tankPositions[pump.fromTank].x;
            let startY = tankPositions[pump.fromTank].y;
            let endX = tankPositions[pump.toTank].x;
            let endY = tankPositions[pump.toTank].y;

            // Apply vertical offset to horizontal connection lines
            if (id === '7') {
              startY -= 40;
              endY -= 40;
            } else if (id === '8') {
              startY += 40;
              endY += 40;
            }

            return (
                <Connection
                key={`connection-${id}`}
                startX={startX}
                startY={startY}
                endX={endX}
                endY={endY}
                isActive={pumps[id].state === 'on'}
                flowDirection={
                  id === '7' ? 'right' :
                  id === '8' ? 'left' :
                  pump.toTank === 'a' || pump.toTank === 'b' ? 'up' : 'down'
                }
              />
            );
          })}
        </svg>

        {/* Tanks and Pumps */}
        {Object.entries(tankPositions).map(([letter, position]) => (
          <div
            key={`tank-${letter}`}
            style={{
              position: 'absolute',
              left: position.x,
              top: position.y,
              transform: 'translate(-50%, -50%)',
              width: letter === 'a' || letter === 'b' ? '15%' : '10%',
              height: letter === 'a' || letter === 'b' ? '45%' : '27%',
            }}
          >
            <Tank
              letter={letter}
              level={tanks[letter].level}
              maxLevel={tanks[letter].max}
              target={tanks[letter].target}
            />
          </div>
        ))}

        {Object.entries(pumpPositions).map(([id, position]) => (
          <div
            key={`pump-${id}`}
            style={{
              position: 'absolute',
              left: position.x,
              top: position.y,
              transform: 'translate(-50%, -50%)',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              zIndex: 2
            }}
          >
            <Pump
              id={id}
              state={pumps[id].state}
              flow={pumps[id].flow}
              onClick={() => togglePump(id)}
              orientation={id === '7' || id === '8' ? 'horizontal' : 'vertical'}
              flowDirection={
                INITIAL_STATE.pumps[id].toTank === 'a' ? 'up' :
                INITIAL_STATE.pumps[id].toTank === 'b' ? 'up' :
                id === '7' ? 'right' :
                id === '8' ? 'left' :
                'down'
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Create the forwarded ref component
const ResourceManagementTask = forwardRef(ResourceManagementTaskComponent);

// Add Log component as a static property
ResourceManagementTask.Log = ResourceManagementLog;

// Add static method to get default metrics
ResourceManagementTask.getDefaultMetrics = () => ({
  healthImpact: 0,
  systemLoad: 0
});

// Export the component
export default ResourceManagementTask;