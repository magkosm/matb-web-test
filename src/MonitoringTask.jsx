import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useAutoScroll } from './hooks/useAutoScroll';
import { downloadCSV } from './utils/csvExport';

/**
 * Simple utility for unique event IDs.
 * Example format: "1689876543210-F3-417"
 */
function generateEventId(label) {
  return `${Date.now()}-${label}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * MonitoringTask
 * 
 * Receives the following props:
 *  - eventsPerMinute (number): current EPM value
 *  - setEventsPerMinute (function): setter for EPM
 *  - showLog (boolean): whether to show/hide the log
 *  - setShowLog (function): setter for toggling the log
 */
function MonitoringTask({
  eventsPerMinute,
  setEventsPerMinute,
  showLog = false,
  setShowLog,
  onLogUpdate,
  isEnabled = true,
  onMetricsUpdate,
}, ref) {
  // ---------------------
  // 1) STATE
  // ---------------------

  // Items: F1, F2 (buttons), F3–F6 (gauges)
  // For gauges: track level (0..10) + eventSide ('low'|'high'|null)
  const [items, setItems] = useState([
    { label: 'F1', colorNormal: 'green', colorEvent: 'gray', eventActive: false },
    { label: 'F2', colorNormal: 'gray',  colorEvent: 'red',  eventActive: false },
    { label: 'F3', level: 5, eventActive: false, eventSide: null },
    { label: 'F4', level: 5, eventActive: false, eventSide: null },
    { label: 'F5', level: 5, eventActive: false, eventSide: null },
    { label: 'F6', level: 5, eventActive: false, eventSide: null },
  ]);

  /**
   * `activeEvents` holds in-progress events that haven’t been marked final
   * Each event: {
   *   id: string,            // unique ID
   *   label: string,         // "F1"..."F6"
   *   timestamp: number,     // start time
   *   responded: boolean,
   *   responseTime: number | null,
   *   type: 'HIT'|'MISS'|'FA'|null
   * }
   */
  const [activeEvents, setActiveEvents] = useState([]);

  /**
   * The master log of finalized events (HIT, MISS, or FA).
   * Once an event is logged here, it won’t be added again.
   */
  const [eventLog, setEventLog] = useState([]);

  // To prevent accidental double key/click logs within 250ms
  const [lastPressTimes, setLastPressTimes] = useState({});

  // Refs for scheduling
  const eventTimeoutRef = useRef(null);
  const mainLoopRef = useRef(null);

  // Add new state/refs for metrics
  const [metrics, setMetrics] = useState({
    systemLoad: 0,
    healthImpact: 0
  });

  // ---------------------
  // 2) SCHEDULE EVENTS (Based on EPM)
  // ---------------------

  useEffect(() => {
    if (!isEnabled) {
      if (eventTimeoutRef.current) {
        clearTimeout(eventTimeoutRef.current);
        eventTimeoutRef.current = null;
      }
      return;
    }

    // Clear any previous scheduling
    if (eventTimeoutRef.current) {
      clearTimeout(eventTimeoutRef.current);
      eventTimeoutRef.current = null;
    }

    const scheduleNextEvent = () => {
      // Base interval = 60,000 / EPM
      const baseIntervalMs = 60000 / eventsPerMinute;
      // Add random jitter 80%..120%
      const jitter = Math.random() * 0.4 + 0.8;
      const waitMs = baseIntervalMs * jitter;

      eventTimeoutRef.current = setTimeout(() => {
        triggerRandomEvent();
        scheduleNextEvent();
      }, waitMs);
    };

    scheduleNextEvent();

    return () => {
      if (eventTimeoutRef.current) clearTimeout(eventTimeoutRef.current);
    };
  }, [eventsPerMinute, isEnabled]);

  /**
   * Trigger an event on a random item.
   * If it's a gauge (F3-F6), lock it to the red side (low/high).
   */
  const triggerRandomEvent = () => {
    setItems((prev) => {
      const newItems = [...prev];
      const idx = Math.floor(Math.random() * newItems.length);

      newItems[idx].eventActive = true;
      // If gauge, decide red side
      if (/F[3-6]/.test(newItems[idx].label)) {
        // push below 3 => low, or above 7 => high
        const gauge = newItems[idx];
        if (gauge.level === 5) {
          // random side
          const pickHigh = Math.random() < 0.5;
          gauge.eventSide = pickHigh ? 'high' : 'low';
          gauge.level = pickHigh ? 8 : 2;
        } else if (gauge.level > 5) {
          gauge.eventSide = 'high';
          if (gauge.level < 8) gauge.level = 8;
        } else {
          gauge.eventSide = 'low';
          if (gauge.level > 2) gauge.level = 2;
        }
      }

      // Create the new event
      const now = Date.now();
      const eventId = generateEventId(newItems[idx].label);
      const newEvent = {
        id: eventId,
        label: newItems[idx].label,
        timestamp: now,
        responded: false,
        responseTime: null,
        type: null, // until we know
      };

      // Append to activeEvents
      setActiveEvents((prevA) => [...prevA, newEvent]);
      return newItems;
    });
  };

  // ---------------------
  // 3) MAIN LOOP (Gauge updates & timeouts)
  // ---------------------

  useEffect(() => {
    mainLoopRef.current = setInterval(() => {
      // 3a) Gauge fluctuation
      setItems((prev) =>
        prev.map((item) => {
          if (/F[3-6]/.test(item.label)) {
            const { level, eventActive, eventSide } = item;
            if (eventActive && eventSide) {
              // Lock to side range
              let newLevel = level + Math.floor(Math.random() * 3 - 1); // ±1
              if (eventSide === 'low') {
                // [0..2]
                if (newLevel < 0) newLevel = 0;
                if (newLevel > 2) newLevel = 2;
              } else {
                // 'high' => [8..10]
                if (newLevel < 8) newLevel = 8;
                if (newLevel > 10) newLevel = 10;
              }
              return { ...item, level: newLevel };
            } else if (eventActive) {
              // fallback 0..10 if eventSide is null
              let newLevel = level + Math.floor(Math.random() * 7 - 3);
              if (newLevel < 0) newLevel = 0;
              if (newLevel > 10) newLevel = 10;
              return { ...item, level: newLevel };
            } else {
              // Normal mode => [3..7]
              let newLevel = level + Math.floor(Math.random() * 5 - 2);
              if (newLevel < 3) newLevel = 3;
              if (newLevel > 7) newLevel = 7;
              // Reset leftover eventSide
              return { ...item, level: newLevel, eventSide: null };
            }
          }
          // F1/F2 => no level
          return item;
        })
      );

      // 3b) Timeout check => MISS if >5s
      const now = Date.now();
      setActiveEvents((prevA) => {
        const stillActive = [];
        const completed = [];

        for (const evt of prevA) {
          if (evt.type === null) {
            const age = now - evt.timestamp;
            if (age >= 5000) {
              // MISS - Add health impact
              evt.type = 'MISS';
              evt.responded = false;
              evt.responseTime = null;

              // Each miss triggers its own impact immediately
              onMetricsUpdate?.({
                systemLoad: metrics.systemLoad,
                healthImpact: -5
              });

              // Turn off item's eventActive
              setItems((prevItems) =>
                prevItems.map((it) =>
                  it.label === evt.label ? { ...it, eventActive: false } : it
                )
              );
              completed.push(evt);
            } else {
              stillActive.push(evt);
            }
          } else {
            completed.push(evt);
          }
        }

        // 3c) Merge completed events into eventLog
        if (completed.length > 0) {
          setEventLog((prevLog) => {
            const logIds = new Set(prevLog.map((x) => x.id));
            const uniqueCompleted = completed.filter((e) => !logIds.has(e.id));
            return [...prevLog, ...uniqueCompleted];
          });
        }

        return stillActive; // keep active ones
      });
    }, 1000);

    return () => {
      if (mainLoopRef.current) clearInterval(mainLoopRef.current);
    };
  }, []);

  // ---------------------
  // 4) RESPONDING (Keyboard & Click)
  // ---------------------

  const handleKeyDown = (e) => {
    if (e.repeat) return; // skip repeats

    const codeToLabel = {
      112: 'F1',
      113: 'F2',
      114: 'F3',
      115: 'F4',
      116: 'F5',
      117: 'F6',
    };
    const label = codeToLabel[e.keyCode];
    if (label) {
      e.preventDefault();
      handleResponse(label);
    }
  };

  const handleResponse = (label) => {
    const now = Date.now();

    // 4a) double-press check
    if (lastPressTimes[label] && now - lastPressTimes[label] < 250) {
      return;
    }
    setLastPressTimes((prev) => ({ ...prev, [label]: now }));

    // 4b) see if label has an active event => HIT or FA
    setActiveEvents((prevA) => {
      let foundActiveEvent = null;
      const updated = prevA.map((evt) => {
        if (evt.label === label && evt.type === null) {
          foundActiveEvent = evt;
          
          // Each hit triggers its own impact immediately
          onMetricsUpdate?.({
            systemLoad: metrics.systemLoad,
            healthImpact: 2
          });

          return {
            ...evt,
            responded: true,
            responseTime: now - evt.timestamp,
            type: 'HIT',
          };
        }
        return evt;
      });

      if (!foundActiveEvent) {
        // Each FA triggers its own impact immediately
        onMetricsUpdate?.({
          systemLoad: metrics.systemLoad,
          healthImpact: -1
        });
        // FA
        const faId = generateEventId(label);
        const faEvt = {
          id: faId,
          label,
          timestamp: now,
          responded: true,
          responseTime: 0,
          type: 'FA',
        };

        // Avoid duplicate FAs if within 500ms
        setEventLog((prevLog) => {
          const logIds = new Set(prevLog.map((log) => log.id));
          const lastFA = [...prevLog].reverse().find(
            (log) => log.label === label && log.type === 'FA'
          );
          if (!lastFA || now - lastFA.timestamp >= 100) {
            if (!logIds.has(faId)) {
              return [...prevLog, faEvt];
            }
          }
          return prevLog;
        });
      } else {
        // Turn off the item’s event
        setItems((prevItems) =>
          prevItems.map((it) =>
            it.label === label ? { ...it, eventActive: false } : it
          )
        );
      }
      return updated;
    });
  };

  // Attach global keydown
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update the eventLog state and notify parent
  useEffect(() => {
    onLogUpdate(eventLog);
  }, [eventLog, onLogUpdate]);

  // Reset function
  const resetTask = () => {
    setItems([
      { label: 'F1', colorNormal: 'green', colorEvent: 'gray', eventActive: false },
      { label: 'F2', colorNormal: 'gray',  colorEvent: 'red',  eventActive: false },
      { label: 'F3', level: 5, eventActive: false, eventSide: null },
      { label: 'F4', level: 5, eventActive: false, eventSide: null },
      { label: 'F5', level: 5, eventActive: false, eventSide: null },
      { label: 'F6', level: 5, eventActive: false, eventSide: null },
    ]);
    setActiveEvents([]);
    setEventLog([]);
    setLastPressTimes({});
    
    if (eventTimeoutRef.current) {
      clearTimeout(eventTimeoutRef.current);
      eventTimeoutRef.current = null;
    }
    setMetrics({
      systemLoad: 0,
      healthImpact: 0
    });
  };

  // Expose resetTask to ref
  useImperativeHandle(ref, () => ({
    resetTask
  }));

  // Update metrics when active events change
  useEffect(() => {
    // Calculate load: each active event contributes 5%
    const load = activeEvents.length * 5;
    
    setMetrics(prev => ({
      ...prev,
      systemLoad: Math.min(100, load)
    }));
  }, [activeEvents]);

  // Notify parent of metrics changes
  useEffect(() => {
    onMetricsUpdate?.(metrics);
    
    // Reset health impact after it's been sent, but only if it's non-zero
    if (metrics.healthImpact !== 0) {
      // Use a unique timeout for each impact
      const timeoutId = setTimeout(() => {
        setMetrics(prev => ({
          ...prev,
          healthImpact: 0
        }));
      }, 50); // Reduced from 100ms to 50ms for faster reset

      return () => clearTimeout(timeoutId);
    }
  }, [metrics, onMetricsUpdate]);

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventTimeoutRef.current) {
        clearTimeout(eventTimeoutRef.current);
      }
      if (mainLoopRef.current) {
        clearInterval(mainLoopRef.current);
      }
      // Reset metrics on unmount
      setMetrics({
        systemLoad: 0,
        healthImpact: 0
      });
    };
  }, []);

  // ---------------------
  // 5) RENDER
  // ---------------------
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
        System Monitoring Task Disabled
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: 'blue',
        color: 'white',
        textAlign: 'center',
        padding: '0.5rem',
        fontWeight: 'bold',
      }}>
        SYSTEM MONITORING
      </div>

      {/* Main Content Container */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2%'
      }}>
        {/* F1, F2 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '10%',
          width: '100%',
          marginBottom: '5%'
        }}>
          {items.slice(0, 2).map((btn) => {
            const displayColor = btn.eventActive ? btn.colorEvent : btn.colorNormal;
            return (
              <div
                key={btn.label}
                onClick={() => handleResponse(btn.label)}
                onTouchStart={() => handleResponse(btn.label)}
                style={{
                  background: displayColor,
                  width: '15%',
                  aspectRatio: '4/3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  borderRadius: '5px',
                  userSelect: 'none',
                  fontSize: 'clamp(0.8rem, 2vw, 1.2rem)'
                }}
              >
                {btn.label}
              </div>
            );
          })}
        </div>

        {/* Gauges: F3-F6 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '8%',
          width: '100%'
        }}>
          {items.slice(2).map((gauge) => {
            const cells = Array.from({ length: 11 }, (_, i) => i);
            return (
              <div
                key={gauge.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column-reverse',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  width: '8%'
                }}
                onClick={() => handleResponse(gauge.label)}
                onTouchStart={() => handleResponse(gauge.label)}
              >
                <div style={{
                  width: '100%',
                  height: '20vh',
                  border: '1px solid #333',
                  display: 'flex',
                  flexDirection: 'column-reverse',
                  marginBottom: '0.5rem',
                }}>
                  {cells.map((cellIndex) => {
                    // "Bad" range if <3 or >7
                    const isOutOfNormal = cellIndex < 3 || cellIndex > 7;
                    // highlight [level-1, level, level+1]
                    const isInRange = (
                      cellIndex >= gauge.level - 1 &&
                      cellIndex <= gauge.level + 1
                    );

                    let backgroundColor;
                    if (isOutOfNormal) {
                      // Light red base
                      backgroundColor = '#FFEEEE';
                      if (isInRange) {
                        // darker red highlight
                        backgroundColor = '#FFCCCC';
                      }
                    } else {
                      // Light gray
                      backgroundColor = '#B0BEC5';
                      if (isInRange) {
                        backgroundColor = '#607D8B';
                      }
                    }

                    // Yellow dot if cellIndex == gauge.level
                    let content = null;
                    if (cellIndex === gauge.level) {
                      content = (
                        <span style={{ color: 'yellow', fontSize: '0.7rem' }}>
                          ●
                        </span>
                      );
                    }

                    return (
                      <div
                        key={cellIndex}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: backgroundColor,
                          borderTop: '1px solid #eee',
                        }}
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 'clamp(0.8rem, 1.5vw, 1.1rem)' }}>
                  {gauge.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const Log = ({ eventLog }) => {
  const scrollRef = useAutoScroll();
  
  // Get last 50 entries
  const recentLogs = eventLog.slice(-50);
  
  const handleExport = () => {
    downloadCSV(eventLog, 'monitoring-log');
  };

  return (
    <div ref={scrollRef} style={{ width: '100%', overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
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
      <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ccc' }}>
            <th style={{ textAlign: 'left' }}>Label</th>
            <th style={{ textAlign: 'left' }}>Timestamp</th>
            <th style={{ textAlign: 'left' }}>RT (ms)</th>
            <th style={{ textAlign: 'left' }}>Type</th>
          </tr>
        </thead>
        <tbody>
          {recentLogs.map((e) => (
            <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{e.label}</td>
              <td>{new Date(e.timestamp).toLocaleTimeString()}</td>
              <td>{e.responseTime ?? '—'}</td>
              <td>{e.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

MonitoringTask.Log = Log;

export default forwardRef(MonitoringTask);
