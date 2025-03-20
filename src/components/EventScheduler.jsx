import React, { useState, useEffect, useCallback } from 'react';
import useScheduler from '../hooks/useScheduler';
import eventService from '../services/EventService';

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
  // Set up the scheduler hook
  const scheduler = useScheduler({
    commSettings,
    monitoringSettings,
    trackingSettings,
    resourceSettings
  });
  
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
      if (scheduler.isActive) {
        console.log('Also stopping scheduler due to global pause');
        scheduler.stopScheduler();
      }
    }
  }, [isGloballyPaused, scheduler]);
  
  // Update formatted times every second
  useEffect(() => {
    const updateFormattedTimes = () => {
      const now = Date.now();
      const updated = {};
      
      Object.entries(scheduler.nextEvents).forEach(([taskType, timestamp]) => {
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
    
    // Set up interval to update times more frequently for better accuracy
    const intervalId = setInterval(updateFormattedTimes, 500);
    
    // Clean up
    return () => clearInterval(intervalId);
  }, [scheduler.nextEvents]);
  
  // Notify parent of scheduler status changes
  useEffect(() => {
    if (onSchedulingChange) {
      onSchedulingChange({
        isActive: scheduler.isActive,
        nextEvents: scheduler.nextEvents
      });
    }
  }, [scheduler.isActive, scheduler.nextEvents, onSchedulingChange]);
  
  // Styles
  const containerStyle = {
    padding: '3rem',
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
    backgroundColor: scheduler.isActive ? '#dc3545' : '#28a745',
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
    marginRight: '0.5rem',
    transition: 'background-color 0.3s ease'
  });
  
  const epmSettingStyle = {
    fontSize: '0.8rem',
    color: '#6c757d',
    marginLeft: '0.5rem',
    marginRight: '0.5rem'
  };
  
  const controlsStyle = {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    marginLeft: '0'
  };
  
  const inputStyle = {
    width: '50px',
    padding: '0.25rem',
    border: '1px solid #ddd',
    borderRadius: '4px'
  };
  
  const labelStyle = {
    fontSize: '0.8rem',
    color: '#6c757d',
    marginRight: '0.1rem'
  };
  
  // Update the task label container style
  const taskLabelStyle = {
    display: 'flex',
    alignItems: 'center',
    minWidth: 'fit-content',
    marginRight: '0.5rem'
  };
  
  // Format EPM for display
  const formatEPM = (epm) => {
    if (!epm || epm <= 0) return 'Off';
    return `${epm.toFixed(1)} EPM`;
  };
  
  // Handle manual communications event
  const handleManualCommClick = useCallback(() => {
    console.log('Manual communications button clicked');
    
    if (!eventService.isTaskAvailable('comm')) {
      console.warn('Communications task not available for manual event');
      alert('Communications task is not initialized yet. Please try again in a few seconds.');
      return;
    }
    
    const config = {
      callType: selectedCallType,
      responseWindow: 30000, // 30 seconds
    };
    
    console.log('Triggering manual communications event with config:', config);
    
    try {
      const result = eventService.triggerCommEvent(config);
      console.log('Manual communications event trigger result:', result);
      
      // If the event failed to trigger, try to clear any active messages and retry
      if (!result) {
        console.log('Attempting to clear any stale messages and retry...');
        
        // Attempt to clear any active message first
        if (eventService.isTaskAvailable('comm') && eventService.commTaskRef.current.clearActiveMessage) {
          eventService.commTaskRef.current.clearActiveMessage();
          
          // Wait a moment and try again
          setTimeout(() => {
            if (eventService.isTaskAvailable('comm')) {
              console.log('Retrying communications event after clearing active message');
              const retryResult = eventService.triggerCommEvent(config);
              console.log('Retry result:', retryResult);
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error triggering manual communications event:', error);
      alert('Failed to trigger communications event. See console for details.');
    }
  }, [selectedCallType]);
  
  // Handle manual monitoring event
  const handleManualMonitoringClick = useCallback(() => {
    console.log('Manual monitoring button clicked');
    
    if (!eventService.isTaskAvailable('monitoring')) {
      console.warn('Monitoring task not available for manual event');
      alert('Monitoring task is not initialized yet. Please try again in a few seconds.');
      return;
    }
    
    try {
      const result = eventService.triggerMonitoringEvent();
      console.log('Manual monitoring event trigger result:', result);
    } catch (error) {
      console.error('Error triggering manual monitoring event:', error);
      alert('Failed to trigger monitoring event. See console for details.');
    }
  }, []);
  
  // Handle manual tracking event
  const handleManualTrackingClick = useCallback(() => {
    console.log('Manual tracking button clicked');
    
    if (!eventService.isTaskAvailable('tracking')) {
      console.warn('Tracking task not available for manual event');
      alert('Tracking task is not initialized yet. Please try again in a few seconds.');
      return;
    }
    
    try {
      const result = eventService.triggerTrackingEvent();
      console.log('Manual tracking event trigger result:', result);
    } catch (error) {
      console.error('Error triggering manual tracking event:', error);
      alert('Failed to trigger tracking event. See console for details.');
    }
  }, []);
  
  // Handle manual resource management event
  const handleManualResourceClick = useCallback(() => {
    console.log('Manual resource management button clicked');
    
    if (!eventService.isTaskAvailable('resource')) {
      console.warn('Resource management task not available for manual event');
      alert('Resource management task is not initialized yet. Please try again in a few seconds.');
      return;
    }
    
    try {
      const result = eventService.triggerResourceEvent();
      console.log('Manual resource event trigger result:', result);
    } catch (error) {
      console.error('Error triggering manual resource event:', error);
      alert('Failed to trigger resource event. See console for details.');
    }
  }, []);
  
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>Event Scheduler</div>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <button
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: isGloballyPaused ? '#28a745' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}
            onClick={toggleGlobalPause}
          >
            {isGloballyPaused ? 'RESUME ALL' : 'PAUSE ALL'}
          </button>
          <div style={{ 
            fontSize: '0.9rem', 
            color: scheduler.isActive ? '#28a745' : '#6c757d',
            fontWeight: scheduler.isActive ? 'bold' : 'normal'
          }}>
            {scheduler.isActive ? 'RUNNING' : 'STOPPED'}
          </div>
        </div>
      </div>
      
      {/* Global pause indicator */}
      {isGloballyPaused && (
        <div style={{
          backgroundColor: '#dc3545',
          color: 'white',
          padding: '0.5rem',
          textAlign: 'center',
          fontWeight: 'bold',
          marginBottom: '1rem',
          borderRadius: '4px'
        }}>
          ⚠️ ALL TASKS PAUSED ⚠️
        </div>
      )}
      
      <div>
        {/* Communications Task */}
        {commSettings.isEnabled && (
          <div style={taskRowStyle}>
            <div style={taskLabelStyle}>
              <div style={statusIndicatorStyle(commSettings.isEnabled, taskStatus.comm)} />
              <span>Communications</span>
            </div>
            <div style={controlsStyle}>
              <div>
                <label style={labelStyle}>EPM:</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={commSettings.eventsPerMinute}
                  onChange={(e) => onSchedulingChange({ task: 'comm', type: 'epm', value: parseFloat(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Difficulty:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={commSettings.difficulty}
                  onChange={(e) => onSchedulingChange({ task: 'comm', type: 'difficulty', value: parseInt(e.target.value) })}
                  style={inputStyle}
                  title="Higher difficulty increases the ratio of other callsigns to own callsign"
                />
              </div>
              <span style={epmSettingStyle}>{formatEPM(commSettings.eventsPerMinute)}</span>
              <span>{formattedTimes.comm}</span>
            </div>
          </div>
        )}
        
        {/* Monitoring Task */}
        {monitoringSettings.isEnabled && (
          <div style={taskRowStyle}>
            <div style={taskLabelStyle}>
              <div style={statusIndicatorStyle(monitoringSettings.isEnabled, taskStatus.monitoring)} />
              <span>Monitoring</span>
            </div>
            <div style={controlsStyle}>
              <div>
                <label style={labelStyle}>EPM:</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={monitoringSettings.eventsPerMinute}
                  onChange={(e) => onSchedulingChange({ task: 'monitoring', type: 'epm', value: parseFloat(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Difficulty:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={monitoringSettings.difficulty}
                  onChange={(e) => onSchedulingChange({ task: 'monitoring', type: 'difficulty', value: parseInt(e.target.value) })}
                  style={inputStyle}
                  title="Higher difficulty increases the number of labels that may go off nominal"
                />
              </div>
              <span style={epmSettingStyle}>{formatEPM(monitoringSettings.eventsPerMinute)}</span>
              <span>{formattedTimes.monitoring}</span>
            </div>
          </div>
        )}
        
        {/* Tracking Task */}
        {trackingSettings.isEnabled && (
          <div style={taskRowStyle}>
            <div style={taskLabelStyle}>
              <div style={statusIndicatorStyle(trackingSettings.isEnabled, taskStatus.tracking)} />
              <span>Tracking</span>
            </div>
            <div style={controlsStyle}>
              <div>
                <label style={labelStyle}>EPM:</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={trackingSettings.eventsPerMinute}
                  onChange={(e) => onSchedulingChange({ task: 'tracking', type: 'epm', value: parseFloat(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Difficulty:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={trackingSettings.difficulty}
                  onChange={(e) => onSchedulingChange({ task: 'tracking', type: 'difficulty', value: parseInt(e.target.value) })}
                  style={inputStyle}
                  title="Higher difficulty increases the force of the drift"
                />
              </div>
              <span style={epmSettingStyle}>{formatEPM(trackingSettings.eventsPerMinute)}</span>
              <span>{formattedTimes.tracking}</span>
            </div>
          </div>
        )}
        
        {/* Resource Management Task */}
        {resourceSettings.isEnabled && (
          <div style={taskRowStyle}>
            <div style={taskLabelStyle}>
              <div style={statusIndicatorStyle(resourceSettings.isEnabled, taskStatus.resource)} />
              <span>Resource Management</span>
            </div>
            <div style={controlsStyle}>
              <div>
                <label style={labelStyle}>EPM:</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={resourceSettings.eventsPerMinute}
                  onChange={(e) => onSchedulingChange({ task: 'resource', type: 'epm', value: parseFloat(e.target.value) })}
                  style={inputStyle}
                  title="Controls how often pump failures occur"
                />
              </div>
              <div>
                <label style={labelStyle}>Difficulty:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={resourceSettings.difficulty}
                  onChange={(e) => onSchedulingChange({ task: 'resource', type: 'difficulty', value: parseInt(e.target.value) })}
                  style={inputStyle}
                  title="Higher difficulty increases number of pump failures and fuel loss rate"
                />
              </div>
              <span style={epmSettingStyle}>{formatEPM(resourceSettings.eventsPerMinute)}</span>
              <span>{formattedTimes.resource}</span>
            </div>
          </div>
        )}
      </div>
      
      <div style={buttonContainerStyle}>
        <button 
          style={primaryButtonStyle}
          onClick={scheduler.isActive ? scheduler.stopScheduler : scheduler.startScheduler}
        >
          {scheduler.isActive ? 'Stop Scheduler' : 'Start Scheduler'}
        </button>
        
        {scheduler.isActive && (
          <button 
            style={secondaryButtonStyle}
            onClick={scheduler.resetScheduler}
          >
            Reset Scheduler
          </button>
        )}
      </div>
      
      {/* Quick trigger buttons */}
      {!scheduler.isActive && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Trigger Events Manually</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {commSettings.isEnabled && (
              <div>
                <select 
                  value={selectedCallType} 
                  onChange={(e) => setSelectedCallType(e.target.value)}
                  style={{ marginBottom: '0.5rem', padding: '0.25rem', border: '1px solid #dee2e6', borderRadius: '4px' }}
                  disabled={isGloballyPaused}
                >
                  <option value="own">Own Callsign</option>
                  <option value="other">Other Callsign</option>
                </select>
                <button 
                  style={{ 
                    padding: '0.25rem', 
                    backgroundColor: isGloballyPaused ? '#e9ecef' : '#f8f9fa', 
                    border: '1px solid #dee2e6', 
                    borderRadius: '4px', 
                    cursor: isGloballyPaused ? 'not-allowed' : 'pointer',
                    opacity: isGloballyPaused ? 0.6 : 1
                  }}
                  onClick={handleManualCommClick}
                  disabled={isGloballyPaused}
                >
                  Comm Event
                </button>
              </div>
            )}
            
            {monitoringSettings.isEnabled && (
              <button 
                style={{ 
                  padding: '0.25rem', 
                  backgroundColor: isGloballyPaused ? '#e9ecef' : '#f8f9fa', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '4px', 
                  cursor: isGloballyPaused ? 'not-allowed' : 'pointer',
                  opacity: isGloballyPaused ? 0.6 : 1
                }}
                onClick={handleManualMonitoringClick}
                disabled={isGloballyPaused}
              >
                Monitoring Event
              </button>
            )}
            
            {trackingSettings.isEnabled && (
              <button 
                style={{ 
                  padding: '0.25rem', 
                  backgroundColor: isGloballyPaused ? '#e9ecef' : '#f8f9fa', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '4px', 
                  cursor: isGloballyPaused ? 'not-allowed' : 'pointer',
                  opacity: isGloballyPaused ? 0.6 : 1
                }}
                onClick={handleManualTrackingClick}
                disabled={isGloballyPaused}
              >
                Tracking Event
              </button>
            )}
            
            {resourceSettings.isEnabled && (
              <button 
                style={{ 
                  padding: '0.25rem', 
                  backgroundColor: isGloballyPaused ? '#e9ecef' : '#f8f9fa', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '4px', 
                  cursor: isGloballyPaused ? 'not-allowed' : 'pointer',
                  opacity: isGloballyPaused ? 0.6 : 1
                }}
                onClick={handleManualResourceClick}
                disabled={isGloballyPaused}
              >
                Resource Event
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventScheduler; 