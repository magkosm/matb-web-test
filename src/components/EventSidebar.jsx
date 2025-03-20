import React, { useState } from 'react';
import { useEventService } from '../services/EventService';

const EventSidebar = () => {
  const eventService = useEventService();
  
  // State for each task's event configuration
  const [commConfig, setCommConfig] = useState({
    callType: 'other',
    responseWindow: eventService.eventConfigs.comm.responseTimeWindow / 1000 // Convert to seconds for display
  });
  
  const [monitoringConfig, setMonitoringConfig] = useState({
    triggerCount: eventService.eventConfigs.monitoring.defaultTriggerCount,
    duration: eventService.eventConfigs.monitoring.defaultDuration / 1000 // Convert to seconds for display
  });
  
  const [trackingConfig, setTrackingConfig] = useState({
    duration: eventService.eventConfigs.tracking.defaultDuration / 1000, // Convert to seconds for display
    difficulty: eventService.eventConfigs.tracking.defaultDifficulty
  });
  
  const [resourceConfig, setResourceConfig] = useState({
    eventType: 'pumpFailure',
    fuelLossMultiplier: eventService.eventConfigs.resource.defaultFuelLossMultiplier,
    pumpFailureCount: eventService.eventConfigs.resource.defaultPumpFailureCount,
    duration: eventService.eventConfigs.resource.defaultFailureDuration / 1000 // Convert to seconds for display
  });
  
  // Event status displays
  const [eventStatus, setEventStatus] = useState({
    comm: false,
    monitoring: false,
    tracking: false,
    resource: false
  });

  // Update event status when triggering events
  const updateEventStatus = (taskType, isActive) => {
    setEventStatus(prev => ({
      ...prev,
      [taskType]: isActive
    }));

    // If setting to active, start a timer to reset status
    if (isActive) {
      let duration = 0;
      switch (taskType) {
        case 'comm':
          duration = commConfig.responseWindow * 1000;
          break;
        case 'monitoring':
          duration = monitoringConfig.duration * 1000;
          break;
        case 'tracking':
          duration = trackingConfig.duration * 1000;
          break;
        case 'resource':
          duration = resourceConfig.duration * 1000;
          break;
        default:
          duration = 10000;
      }

      setTimeout(() => {
        setEventStatus(prev => ({
          ...prev,
          [taskType]: false
        }));
      }, duration);
    }
  };
  
  // Handler functions for event triggers
  const triggerCommEvent = () => {
    const responseWindowInSeconds = commConfig.responseWindow; // This is already in seconds in the UI
    console.log(`EventSidebar: Triggering comm event with ${responseWindowInSeconds} seconds response window`);
    
    const result = eventService.triggerCommEvent({
      callType: commConfig.callType,
      responseWindow: responseWindowInSeconds // EventService will convert to ms as needed
    });
    
    if (result) {
      updateEventStatus('comm', true);
    } else {
      console.error('Failed to trigger communications event');
    }
  };
  
  const triggerMonitoringEvent = () => {
    const result = eventService.triggerMonitoringEvent({
      triggerCount: monitoringConfig.triggerCount,
      duration: monitoringConfig.duration * 1000 // Convert to ms
    });
    if (result) {
      updateEventStatus('monitoring', true);
    }
  };
  
  const triggerTrackingEvent = () => {
    // Make sure we have valid values
    const durationInSeconds = Math.max(5, Math.min(120, trackingConfig.duration));
    const durationInMs = durationInSeconds * 1000;
    const difficultyLevel = Math.max(1, Math.min(10, trackingConfig.difficulty));
    
    console.log(`EventSidebar: Triggering tracking event with ${durationInSeconds}s duration (${durationInMs}ms) and difficulty ${difficultyLevel}`);
    
    const result = eventService.triggerTrackingEvent({
      duration: durationInMs, // Convert to ms
      difficulty: difficultyLevel
    });
    
    if (result) {
      updateEventStatus('tracking', true);
      console.log(`EventSidebar: Successfully triggered tracking event. Auto control will resume in ${durationInSeconds}s.`);
    } else {
      console.error('Failed to trigger tracking event');
    }
  };
  
  const triggerResourceEvent = () => {
    console.log('EventSidebar: Triggering resource event with config:', {
      eventType: resourceConfig.eventType,
      pumpFailureCount: resourceConfig.pumpFailureCount,
      duration: resourceConfig.duration * 1000
    });
    
    const result = eventService.triggerResourceEvent({
      eventType: resourceConfig.eventType,
      fuelLossMultiplier: resourceConfig.fuelLossMultiplier,
      pumpFailureCount: resourceConfig.pumpFailureCount,
      duration: resourceConfig.duration * 1000 // Convert to ms
    });
    
    if (result) {
      updateEventStatus('resource', true);
      console.log(`EventSidebar: Successfully triggered resource event with ${resourceConfig.pumpFailureCount} pump failures`);
    } else {
      console.error('Failed to trigger resource event');
    }
  };
  
  // Styles
  const sidebarStyle = {
    width: '300px',
    height: '100%',
    padding: '1rem',
    backgroundColor: '#f5f5f5',
    borderLeft: '1px solid #ddd',
    overflowY: 'auto'
  };
  
  const sectionStyle = {
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '5px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  };
  
  const headerStyle = {
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #eee'
  };
  
  const inputGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '0.5rem'
  };
  
  const labelStyle = {
    fontSize: '0.8rem',
    marginBottom: '0.25rem'
  };
  
  const buttonStyle = {
    padding: '0.5rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '0.5rem',
    width: '100%'
  };
  
  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#cccccc',
    cursor: 'not-allowed'
  };
  
  const statusIndicatorStyle = (isActive) => ({
    display: 'inline-block',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: isActive ? '#28a745' : '#dc3545',
    marginRight: '0.5rem'
  });

  return (
    <div style={sidebarStyle}>
      <h2 style={{ marginTop: 0 }}>Event Controls</h2>
      
      {/* Communications Task Events */}
      <div style={sectionStyle}>
        <div style={headerStyle}>
          <span style={statusIndicatorStyle(eventStatus.comm)}></span>
          Communications Events
        </div>
        
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Call Type</label>
          <select 
            value={commConfig.callType}
            onChange={(e) => setCommConfig({...commConfig, callType: e.target.value})}
            style={{ padding: '0.3rem' }}
          >
            <option value="own">Own Call</option>
            <option value="other">Other Call</option>
          </select>
        </div>
        
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Response Window (seconds)</label>
          <input 
            type="number" 
            min="1" 
            max="60"
            value={commConfig.responseWindow} 
            onChange={(e) => setCommConfig({...commConfig, responseWindow: parseInt(e.target.value, 10)})}
            style={{ padding: '0.3rem' }}
          />
        </div>
        
        <button 
          style={eventService.hasActiveEvents() ? disabledButtonStyle : buttonStyle}
          onClick={triggerCommEvent}
          disabled={eventService.hasActiveEvents()}
        >
          Trigger Comm Event
        </button>
      </div>
      
      {/* Monitoring Task Events */}
      <div style={sectionStyle}>
        <div style={headerStyle}>
          <span style={statusIndicatorStyle(eventStatus.monitoring)}></span>
          Monitoring Events
        </div>
        
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Number of Triggers (1-6)</label>
          <input 
            type="number" 
            min="1" 
            max="6"
            value={monitoringConfig.triggerCount} 
            onChange={(e) => setMonitoringConfig({...monitoringConfig, triggerCount: parseInt(e.target.value, 10)})}
            style={{ padding: '0.3rem' }}
          />
        </div>
        
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Duration (seconds)</label>
          <input 
            type="number" 
            min="1" 
            max="120"
            value={monitoringConfig.duration} 
            onChange={(e) => setMonitoringConfig({...monitoringConfig, duration: parseInt(e.target.value, 10)})}
            style={{ padding: '0.3rem' }}
          />
        </div>
        
        <button 
          style={buttonStyle}
          onClick={triggerMonitoringEvent}
        >
          Trigger Monitoring Event
        </button>
      </div>
      
      {/* Tracking Task Events */}
      <div style={sectionStyle}>
        <div style={headerStyle}>
          <span style={statusIndicatorStyle(eventStatus.tracking)}></span>
          Tracking Events
        </div>
        
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Duration (seconds)</label>
          <input 
            type="number" 
            min="5" 
            max="120"
            value={trackingConfig.duration} 
            onChange={(e) => setTrackingConfig({...trackingConfig, duration: parseInt(e.target.value, 10)})}
            style={{ padding: '0.3rem' }}
          />
        </div>
        
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Difficulty (1-10)</label>
          <input 
            type="number" 
            min="1" 
            max="10"
            value={trackingConfig.difficulty} 
            onChange={(e) => setTrackingConfig({...trackingConfig, difficulty: parseInt(e.target.value, 10)})}
            style={{ padding: '0.3rem' }}
          />
        </div>
        
        <button 
          style={buttonStyle}
          onClick={triggerTrackingEvent}
        >
          Trigger Manual Tracking
        </button>
      </div>
      
      {/* Resource Management Task Events */}
      <div style={sectionStyle}>
        <div style={headerStyle}>
          <span style={statusIndicatorStyle(eventStatus.resource)}></span>
          Resource Management Events
        </div>
        
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Event Type</label>
          <select 
            value={resourceConfig.eventType}
            onChange={(e) => setResourceConfig({...resourceConfig, eventType: e.target.value})}
            style={{ padding: '0.3rem' }}
          >
            <option value="pumpFailure">Pump Failure</option>
            <option value="fuelLossChange">Fuel Loss Rate Change</option>
          </select>
        </div>
        
        {resourceConfig.eventType === 'pumpFailure' && (
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Number of Pump Failures (1-8)</label>
            <input 
              type="number" 
              min="1" 
              max="8"
              value={resourceConfig.pumpFailureCount} 
              onChange={(e) => setResourceConfig({...resourceConfig, pumpFailureCount: parseInt(e.target.value, 10)})}
              style={{ padding: '0.3rem' }}
            />
          </div>
        )}
        
        {resourceConfig.eventType === 'fuelLossChange' && (
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Fuel Loss Multiplier</label>
            <input 
              type="number" 
              min="0.5" 
              max="3"
              step="0.1"
              value={resourceConfig.fuelLossMultiplier} 
              onChange={(e) => setResourceConfig({...resourceConfig, fuelLossMultiplier: parseFloat(e.target.value)})}
              style={{ padding: '0.3rem' }}
            />
          </div>
        )}
        
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Duration (seconds)</label>
          <input 
            type="number" 
            min="5" 
            max="120"
            value={resourceConfig.duration} 
            onChange={(e) => setResourceConfig({...resourceConfig, duration: parseInt(e.target.value, 10)})}
            style={{ padding: '0.3rem' }}
          />
        </div>
        
        <button 
          style={buttonStyle}
          onClick={triggerResourceEvent}
        >
          Trigger Resource Event
        </button>
      </div>
    </div>
  );
};

export default EventSidebar; 