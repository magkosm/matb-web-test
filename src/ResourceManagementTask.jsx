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
  NEUTRAL: { min: 2400, max: 2600, impact: 0 }, // Actually two ranges: 2250-2400 and 2600-2750
  OPTIMAL: { min: 2400, max: 2600, impact: 1 }
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

  // Modified togglePump to handle failures
  const togglePump = (pumpId) => {
    setPumps(prev => {
      if (!prev[pumpId]) return prev; // Guard against undefined pump
      
      return {
        ...prev,
        [pumpId]: {
          ...prev[pumpId],
          state: prev[pumpId].state === 'on' ? 'off' : 'on'
        }
      };
    });
  };

  // Random pump failures
  useEffect(() => {
    const failureInterval = setInterval(() => {
      // 1% chance of failure for each pump every second
      Object.keys(pumps).forEach(pumpId => {
        if (!failures.has(pumpId) && Math.random() < 0.01) {
          setFailures(prev => {
            const newFailures = new Set(prev);
            newFailures.add(pumpId);
            
            // Update pump state to failure
            setPumps(prevPumps => ({
              ...prevPumps,
              [pumpId]: {
                ...prevPumps[pumpId],
                state: 'failure'
              }
            }));
            
            // Automatically repair after random time (5-15 seconds)
            const repairTime = 5000 + Math.random() * 10000;
            setTimeout(() => {
              setFailures(prev => {
                const repairedFailures = new Set(prev);
                repairedFailures.delete(pumpId);
                
                // Reset pump state to off
                setPumps(prevPumps => ({
                  ...prevPumps,
                  [pumpId]: {
                    ...prevPumps[pumpId],
                    state: 'off'
                  }
                }));
                
                return repairedFailures;
              });
            }, repairTime);
            
            return newFailures;
          });
        }
      });
    }, 1000);

    return () => clearInterval(failureInterval);
  }, [pumps, failures]);

  // Calculate loss multiplier when difficulty changes
  useEffect(() => {
    const normalizedDifficulty = difficulty / 10; // Convert 0-10 to 0-1
    const multiplier = MIN_LOSS_MULTIPLIER + 
      (MAX_LOSS_MULTIPLIER - MIN_LOSS_MULTIPLIER) * normalizedDifficulty;
    setLossMultiplier(multiplier);
  }, [difficulty]);

  // Modify the failure generation interval based on EPM
  useEffect(() => {
    if (!isEnabled || !eventsPerMinute) return;

    const failureInterval = setInterval(() => {
      // Only proceed if we have working pumps
      const workingPumps = Object.keys(pumps).filter(id => !failures.has(id));
      if (workingPumps.length === 0) return;

      // Random chance to create a failure based on EPM
      if (Math.random() < eventsPerMinute / 60) {
        const randomPump = workingPumps[Math.floor(Math.random() * workingPumps.length)];
        setFailures(prev => new Set([...prev, randomPump]));
      }
    }, 1000); // Check every second

    return () => clearInterval(failureInterval);
  }, [isEnabled, eventsPerMinute, pumps, failures]);

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

        // Apply pump transfers
        Object.entries(pumps).forEach(([pumpId, pump]) => {
          if (pump.state === 'on' && !failures.has(pumpId)) {
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

  // Calculate health impact for a single tank
  const calculateTankHealth = (level) => {
    if (level < FUEL_RANGES.CRITICAL.min || level > FUEL_RANGES.CRITICAL.max) {
      return FUEL_RANGES.CRITICAL.impact ; // -10 health
    }
    if (level >= FUEL_RANGES.OPTIMAL.min && level <= FUEL_RANGES.OPTIMAL.max) {
      return FUEL_RANGES.OPTIMAL.impact ; // +5 health
    }
    if (level >= FUEL_RANGES.WARNING.min && level <= FUEL_RANGES.WARNING.max) {
      if ((level >= FUEL_RANGES.WARNING.min && level < FUEL_RANGES.OPTIMAL.min) ||
          (level > FUEL_RANGES.OPTIMAL.max && level <= FUEL_RANGES.WARNING.max)) {
        return 0; // Neutral zones
      }
      return FUEL_RANGES.WARNING.impact ; // -5 health
    }
    return 0;
  };

  // Calculate health impact
  const calculateHealthImpact = useCallback(() => {
    const tankAHealth = calculateTankHealth(tanks.a.level);
    const tankBHealth = calculateTankHealth(tanks.b.level);
    
    // Add console logs for debugging
    // console.log('Tank A:', {
    //   level: tanks.a.level,
    //   health: tankAHealth
    // });
    // console.log('Tank B:', {
    //   level: tanks.b.level,
    //   health: tankBHealth
    // });
    // console.log('Total Health Impact:', tankAHealth + tankBHealth);
    
    return tankAHealth + tankBHealth;
  }, [tanks.a.level, tanks.b.level]);

  // Calculate system load
  const calculateSystemLoad = useCallback(() => {
    let load = 0;
    
    // Count pump failures (up to 4) - multiply by 10 for more impact
    const pumpLoad = Math.min(failures.size, 4) * 5;
    
    // Check tank levels - multiply by 10 for more impact
    const tankALoad = (tanks.a.level < 2250 || tanks.a.level > 2750) ? 10 : 0;
    const tankBLoad = (tanks.b.level < 2250 || tanks.b.level > 2750) ? 10 : 0;
    
    load = pumpLoad + tankALoad + tankBLoad;
    
    // Add console logs for debugging
    // console.log('System Load:', {
    //   pumpLoad,
    //   tankALoad,
    //   tankBLoad,
    //   totalLoad: load
    // });
    
    return load;
  }, [failures.size, tanks.a.level, tanks.b.level]);

  // Update metrics
  useEffect(() => {
    if (!isEnabled) {
      requestAnimationFrame(() => {
        onMetricsUpdate?.({ healthImpact: 0, systemLoad: 0 });
      });
      return;
    }

    const metrics = {
      healthImpact: calculateHealthImpact(),
      systemLoad: calculateSystemLoad()
    };

    requestAnimationFrame(() => {
      onMetricsUpdate?.(metrics);
    });
  }, [
    isEnabled,
    calculateHealthImpact,
    calculateSystemLoad,
    onMetricsUpdate
  ]);

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