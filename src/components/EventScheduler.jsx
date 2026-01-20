import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEventService } from '../services/EventService';

/**
 * Event Scheduler Component that manages automatic event scheduling
 * based on Events Per Minute (EPM) settings
 */
const EventScheduler = ({
  commSettings,
  monitoringSettings,
  trackingSettings,
  resourceSettings,
  onSchedulingChange
}) => {
  const eventService = useEventService();
  const subscribedRef = useRef(false);
  const initializedRef = useRef(false);

  // State to store formatted times
  const [formattedTimes, setFormattedTimes] = useState({
    comm: 'Not scheduled',
    monitoring: 'Not scheduled',
    tracking: 'Not scheduled',
    resource: 'Not scheduled'
  });

  // Add state to track task status
  const [taskStatus, setTaskStatus] = useState({
    comm: false,
    monitoring: false,
    tracking: false,
    resource: false
  });

  // Add state for selected call type
  const [selectedCallType, setSelectedCallType] = useState('own');

  // Add state to track global paused state
  const [isGloballyPaused, setIsGloballyPaused] = useState(false);

  // State to track scheduler status
  const [schedulerState, setSchedulerState] = useState({
    isActive: false,
    nextEvents: {
      comm: null,
      monitoring: null,
      tracking: null,
      resource: null
    }
  });

  // Initialize scheduler only once on component mount
  useEffect(() => {
    if (initializedRef.current) return;

    console.log('EventScheduler: Initializing scheduler on first render');

    // Initialize the scheduler with settings if it's not already initialized
    const initialSettings = {
      comm: { ...commSettings },
      monitoring: { ...monitoringSettings },
      tracking: { ...trackingSettings },
      resource: { ...resourceSettings }
    };

    eventService.initializeScheduler(initialSettings);
    initializedRef.current = true;

    // No cleanup - scheduler should continue running even if component unmounts
  }, []);

  // Handle settings changes with proper dependency tracking
  useEffect(() => {
    if (!initializedRef.current) return;

    console.log('EventScheduler: Settings changed, updating scheduler');

    // Create a deep copy of the settings to avoid reference issues
    const updatedSettings = {
      comm: {
        isEnabled: commSettings.isEnabled,
        eventsPerMinute: commSettings.eventsPerMinute || 0,
        difficulty: commSettings.difficulty || 5
      },
      monitoring: {
        isEnabled: monitoringSettings.isEnabled,
        eventsPerMinute: monitoringSettings.eventsPerMinute || 0,
        difficulty: monitoringSettings.difficulty || 5
      },
      tracking: {
        isEnabled: trackingSettings.isEnabled,
        eventsPerMinute: trackingSettings.eventsPerMinute || 0,
        difficulty: trackingSettings.difficulty || 5
      },
      resource: {
        isEnabled: resourceSettings.isEnabled,
        eventsPerMinute: resourceSettings.eventsPerMinute || 0,
        difficulty: resourceSettings.difficulty || 5
      }
    };

    // Update settings through the service (already has debouncing)
    eventService.updateSchedulerSettings(updatedSettings);
  }, [
    commSettings.isEnabled, commSettings.eventsPerMinute, commSettings.difficulty,
    monitoringSettings.isEnabled, monitoringSettings.eventsPerMinute, monitoringSettings.difficulty,
    trackingSettings.isEnabled, trackingSettings.eventsPerMinute, trackingSettings.difficulty,
    resourceSettings.isEnabled, resourceSettings.eventsPerMinute, resourceSettings.difficulty
  ]);

  // Subscribe to scheduler state changes only once
  useEffect(() => {
    if (subscribedRef.current) return;

    console.log('EventScheduler: Subscribing to scheduler updates');

    const handleSchedulerUpdate = (state) => {
      console.log('EventScheduler: Received scheduler update', state);
      setSchedulerState(state);

      // Also notify parent if needed
      if (onSchedulingChange) {
        onSchedulingChange(state);
      }
    };

    // Subscribe to scheduler updates
    eventService.subscribeToScheduler(handleSchedulerUpdate);
    subscribedRef.current = true;

    // Get initial state immediately
    const currentState = eventService.getSchedulerState();
    setSchedulerState(currentState);

    // No cleanup - we want the subscription to remain active
  }, [onSchedulingChange]);

  // Update formatted times every second
  useEffect(() => {
    const updateFormattedTimes = () => {
      const now = Date.now();
      const updated = {};

      Object.entries(schedulerState.nextEvents).forEach(([taskType, timestamp]) => {
        if (!timestamp) {
          updated[taskType] = 'Not scheduled';
        } else {
          const timeRemaining = timestamp - now;

          if (timeRemaining <= 0) {
            updated[taskType] = 'Due now';
            // Highlight task status when due
            setTaskStatus(prev => ({
              ...prev,
              [taskType]: true
            }));

            // Reset status after 2 seconds
            setTimeout(() => {
              setTaskStatus(prev => ({
                ...prev,
                [taskType]: false
              }));
            }, 2000);
          } else {
            const seconds = Math.floor(timeRemaining / 1000);

            if (seconds < 60) {
              updated[taskType] = `In ${seconds}s`;
            } else {
              const minutes = Math.floor(seconds / 60);
              const remainingSeconds = seconds % 60;
              updated[taskType] = `In ${minutes}m ${remainingSeconds}s`;
            }
          }
        }
      });

      setFormattedTimes(updated);
    };

    // Initial update
    updateFormattedTimes();

    // Set up interval to update times
    const intervalId = setInterval(updateFormattedTimes, 1000);

    // Clean up
    return () => clearInterval(intervalId);
  }, [schedulerState.nextEvents]);

  // Toggle global pause state
  const toggleGlobalPause = useCallback(() => {
    if (isGloballyPaused) {
      console.log('Resuming all tasks...');
      const resumed = eventService.resumeAllTasks();
      console.log('All tasks resumed:', resumed);
      setIsGloballyPaused(false);
    } else {
      console.log('Pausing all tasks...');
      const paused = eventService.pauseAllTasks();
      console.log('All tasks paused:', paused);
      setIsGloballyPaused(true);

      // If the scheduler is active, also stop it
      if (schedulerState.isActive) {
        console.log('Also stopping scheduler due to global pause');
        eventService.stopScheduler();
      }
    }
  }, [isGloballyPaused, schedulerState.isActive]);

  // Toggle scheduler active state
  const toggleScheduler = useCallback(() => {
    console.log(`EventScheduler: ${schedulerState.isActive ? 'Stopping' : 'Starting'} scheduler`);

    if (schedulerState.isActive) {
      eventService.stopScheduler();
    } else {
      eventService.startScheduler();
    }
  }, [schedulerState.isActive]);

  // Manual event trigger functions
  const triggerManualEvent = useCallback((taskType) => {
    console.log(`EventScheduler: Manually triggering ${taskType} event`);

    switch (taskType) {
      case 'comm':
        const callTypeToUse = selectedCallType === 'random'
          ? Math.random() > 0.5 ? 'own' : 'other'
          : selectedCallType;

        eventService.triggerCommEvent({
          callType: callTypeToUse,
          responseWindow: 10 // 10 seconds
        });
        break;

      case 'monitoring':
        eventService.triggerMonitoringEvent({
          triggerCount: Math.floor(Math.random() * 3) + 1, // 1-3 triggers
          duration: (Math.floor(Math.random() * 10) + 10) * 1000 // 10-20 seconds
        });
        break;

      case 'tracking':
        eventService.triggerTrackingEvent({
          difficulty: trackingSettings.difficulty || 5,
          duration: (Math.floor(Math.random() * 15) + 15) * 1000 // 15-30 seconds
        });
        break;

      case 'resource':
        const isRandomType = true; // Can make this configurable later
        const eventType = isRandomType
          ? Math.random() > 0.5 ? 'pumpFailure' : 'fuelLossChange'
          : 'pumpFailure';

        const config = {
          eventType,
          duration: (Math.floor(Math.random() * 30) + 30) * 1000 // 30-60 seconds
        };

        if (eventType === 'pumpFailure') {
          config.pumpFailureCount = Math.floor(Math.random() * 2) + 1; // 1-2 pumps
        } else {
          config.fuelLossMultiplier = 1.2 + (Math.random() * 0.8); // 1.2-2.0
        }

        eventService.triggerResourceEvent(config);
        break;

      default:
        console.error(`Unknown task type: ${taskType}`);
    }
  }, [selectedCallType, trackingSettings.difficulty]);

  // Handle setting changes
  const handleSettingChange = useCallback((task, type, value) => {
    if (onSchedulingChange) {
      onSchedulingChange({ task, type, value });
    }
  }, [onSchedulingChange]);

  // Styles
  const containerStyle = {
    padding: '1.5rem',
    backgroundColor: 'white',
    borderRadius: '5px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  };

  const headerStyle = {
    fontWeight: 'bold',
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const taskRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #eee',
    gap: '0.5rem'
  };

  const buttonContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '1rem',
    gap: '0.5rem'
  };

  const primaryButtonStyle = {
    flex: 1,
    padding: '0.5rem',
    backgroundColor: schedulerState.isActive ? '#dc3545' : '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  };

  const secondaryButtonStyle = {
    flex: 1,
    padding: '0.5rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  };

  const statusIndicatorStyle = (isEnabled, isActive = false) => ({
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: isActive ? '#ffc107' : (isEnabled ? '#28a745' : '#dc3545'),
    marginRight: '0.5rem'
  });

  const manualTriggerButtonStyle = {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem'
  };

  const controlsStyle = {
    display: 'flex',
    gap: '0.5rem',
    fontSize: '0.8rem'
  };

  const inputStyle = {
    width: '45px',
    padding: '0.2rem',
    fontSize: '0.75rem',
    border: '1px solid #ced4da',
    borderRadius: '4px'
  };

  const labelStyle = {
    fontSize: '0.75rem',
    marginRight: '0.2rem'
  };

  const formatEPM = (epm) => {
    if (epm === 0) return 'Disabled';
    return `${epm}/min`;
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>Event Scheduler</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            style={{
              ...secondaryButtonStyle,
              backgroundColor: isGloballyPaused ? '#28a745' : '#dc3545',
              padding: '0.25rem 0.5rem',
              flex: 0
            }}
            onClick={toggleGlobalPause}
          >
            {isGloballyPaused ? 'Resume All' : 'Pause All'}
          </button>
        </div>
      </div>

      {/* Communication Events */}
      <div style={taskRowStyle}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <span style={statusIndicatorStyle(commSettings.isEnabled, taskStatus.comm)}></span>
          <span>Comm Events</span>
          <div style={{ marginLeft: 'auto', ...controlsStyle }}>
            <div>
              <label style={labelStyle}>EPM:</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={commSettings.eventsPerMinute}
                onChange={(e) => handleSettingChange('comm', 'epm', parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Diff:</label>
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                value={commSettings.difficulty}
                onChange={(e) => handleSettingChange('comm', 'difficulty', parseInt(e.target.value, 10))}
                style={inputStyle}
                title="Higher difficulty increases the ratio of other callsigns to own callsign"
              />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div>
            <select
              value={selectedCallType}
              onChange={(e) => setSelectedCallType(e.target.value)}
              style={{
                padding: '0.25rem',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '0.75rem'
              }}
            >
              <option value="own">Own Call</option>
              <option value="other">Other Call</option>
              <option value="random">Random</option>
            </select>
          </div>
          <button
            style={manualTriggerButtonStyle}
            onClick={() => triggerManualEvent('comm')}
            disabled={!commSettings.isEnabled}
          >
            Trigger
          </button>
          <span style={{ width: '80px', textAlign: 'right' }}>{formattedTimes.comm}</span>
        </div>
      </div>

      {/* Monitoring Events */}
      <div style={taskRowStyle}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <span style={statusIndicatorStyle(monitoringSettings.isEnabled, taskStatus.monitoring)}></span>
          <span>Monitoring</span>
          <div style={{ marginLeft: 'auto', ...controlsStyle }}>
            <div>
              <label style={labelStyle}>EPM:</label>
              <input
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={monitoringSettings.eventsPerMinute}
                onChange={(e) => handleSettingChange('monitoring', 'epm', parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Diff:</label>
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                value={monitoringSettings.difficulty}
                onChange={(e) => handleSettingChange('monitoring', 'difficulty', parseInt(e.target.value, 10))}
                style={inputStyle}
                title="Higher difficulty increases the number of labels that may go off nominal"
              />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            style={manualTriggerButtonStyle}
            onClick={() => triggerManualEvent('monitoring')}
            disabled={!monitoringSettings.isEnabled}
          >
            Trigger
          </button>
          <span style={{ width: '80px', textAlign: 'right' }}>{formattedTimes.monitoring}</span>
        </div>
      </div>

      {/* Tracking Events */}
      <div style={taskRowStyle}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <span style={statusIndicatorStyle(trackingSettings.isEnabled, taskStatus.tracking)}></span>
          <span>Tracking</span>
          <div style={{ marginLeft: 'auto', ...controlsStyle }}>
            <div>
              <label style={labelStyle}>EPM:</label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={trackingSettings.eventsPerMinute}
                onChange={(e) => handleSettingChange('tracking', 'epm', parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Diff:</label>
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                value={trackingSettings.difficulty}
                onChange={(e) => handleSettingChange('tracking', 'difficulty', parseInt(e.target.value, 10))}
                style={inputStyle}
                title="Higher difficulty increases the force of the drift"
              />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            style={manualTriggerButtonStyle}
            onClick={() => triggerManualEvent('tracking')}
            disabled={!trackingSettings.isEnabled}
          >
            Trigger
          </button>
          <span style={{ width: '80px', textAlign: 'right' }}>{formattedTimes.tracking}</span>
        </div>
      </div>

      {/* Resource Events */}
      <div style={taskRowStyle}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <span style={statusIndicatorStyle(resourceSettings.isEnabled, taskStatus.resource)}></span>
          <span>Resource</span>
          <div style={{ marginLeft: 'auto', ...controlsStyle }}>
            <div>
              <label style={labelStyle}>EPM:</label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={resourceSettings.eventsPerMinute}
                onChange={(e) => handleSettingChange('resource', 'epm', parseFloat(e.target.value))}
                style={inputStyle}
                title="Controls how often pump failures occur"
              />
            </div>
            <div>
              <label style={labelStyle}>Diff:</label>
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                value={resourceSettings.difficulty}
                onChange={(e) => handleSettingChange('resource', 'difficulty', parseInt(e.target.value, 10))}
                style={inputStyle}
                title="Higher difficulty increases number of pump failures and fuel loss rate"
              />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            style={manualTriggerButtonStyle}
            onClick={() => triggerManualEvent('resource')}
            disabled={!resourceSettings.isEnabled}
          >
            Trigger
          </button>
          <span style={{ width: '80px', textAlign: 'right' }}>{formattedTimes.resource}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div style={buttonContainerStyle}>
        <button style={primaryButtonStyle} onClick={toggleScheduler}>
          {schedulerState.isActive ? 'Stop Scheduler' : 'Start Scheduler'}
        </button>
        <button
          style={secondaryButtonStyle}
          onClick={() => {
            console.log('EventScheduler: Explicitly reschedule all events');
            eventService.rescheduleEvents();
          }}
        >
          Reschedule Events
        </button>
      </div>
    </div>
  );
};

export default EventScheduler; 