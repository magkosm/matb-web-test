import React, { useState, useEffect, useRef } from 'react';

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
  showLog,
  setShowLog
}) {
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

  // ---------------------
  // 2) SCHEDULE EVENTS (Based on EPM)
  // ---------------------

  useEffect(() => {
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
  }, [eventsPerMinute]);

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
              // MISS
              evt.type = 'MISS';
              evt.responded = false;
              evt.responseTime = null;

              // Turn off item’s eventActive
              setItems((prevItems) =>
                prevItems.map((it) =>
                  it.label === evt.label ? { ...it, eventActive: false } : it
                )
              );
              completed.push(evt);
            } else {
              // still active
              stillActive.push(evt);
            }
          } else {
            // Already HIT or FA
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
          if (!lastFA || now - lastFA.timestamp >= 500) {
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

  // ---------------------
  // 5) RENDER
  // ---------------------
  return (
    <div style={{ width: 520, margin: 'auto', fontFamily: 'sans-serif' }}>
      {/* Title */}
      <div
        style={{
          background: 'blue',
          color: 'white',
          textAlign: 'center',
          padding: '0.5rem',
          fontWeight: 'bold',
        }}
      >
        SYSTEM MONITORING
      </div>

      

      {/* F1, F2 */}
      <div style={{ display: 'flex', justifyContent: 'space-around', margin: '1rem 0' }}>
        {items.slice(0, 2).map((btn) => {
          const displayColor = btn.eventActive ? btn.colorEvent : btn.colorNormal;
          return (
            <div
              key={btn.label}
              onClick={() => handleResponse(btn.label)}
              onTouchStart={() => handleResponse(btn.label)}
              style={{
                background: displayColor,
                width: '80px',
                height: '60px',
                lineHeight: '60px',
                textAlign: 'center',
                cursor: 'pointer',
                color: '#fff',
                borderRadius: '5px',
                userSelect: 'none',
              }}
            >
              {btn.label}
            </div>
          );
        })}
      </div>

      {/* Gauges: F3-F6 */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '1rem' }}>
        {items.slice(2).map((gauge) => {
          // 11 cells: 0..10, middle cell=5
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
              }}
              onClick={() => handleResponse(gauge.label)}
              onTouchStart={() => handleResponse(gauge.label)}
            >
              <div
                style={{
                  border: '1px solid #333',
                  width: '35px',
                  height: '165px',
                  display: 'flex',
                  flexDirection: 'column-reverse',
                  marginBottom: '0.5rem',
                }}
              >
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
              <span>{gauge.label}</span>
            </div>
          );
        })}
      </div>

      {/* Event Log */}
      {showLog && (
        <div style={{ marginTop: '2rem' }}>
          <h4>Event Log</h4>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc' }}>
                <th style={{ textAlign: 'left' }}>Label</th>
                <th style={{ textAlign: 'left' }}>Timestamp</th>
                <th style={{ textAlign: 'left' }}>RT (ms)</th>
                <th style={{ textAlign: 'left' }}>Type</th>
                <th style={{ textAlign: 'left' }}>ID</th>
              </tr>
            </thead>
            <tbody>
              {eventLog.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{e.label}</td>
                  <td>{new Date(e.timestamp).toLocaleTimeString()}</td>
                  <td>{e.responseTime ?? '—'}</td>
                  <td>{e.type}</td>
                  <td style={{ fontSize: '0.7rem', color: '#666' }}>{e.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MonitoringTask;
