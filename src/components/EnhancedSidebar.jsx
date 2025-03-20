import React, { useState } from 'react';
import EventScheduler from './EventScheduler';
import { useEventService } from '../services/EventService';

// Task components to get log components
import MonitoringTask from '../MonitoringTask';
import CommunicationsTask from '../CommunicationsTask';
import TrackingTask from '../TrackingTask';
import ResourceManagementTask from '../ResourceManagementTask';

const EnhancedSidebar = ({ 
  // Settings for each task
  commSettings,
  monitoringSettings,
  trackingSettings,
  resourceSettings,
  
  // Logs for each task
  monitoringLog,
  commLog,
  trackingLog,
  resourceLog,
  
  // Callback functions
  onCommConfigChange,
  onMonitoringConfigChange,
  onTrackingConfigChange,
  onResourceConfigChange,
  onSchedulingChange
}) => {
  const eventService = useEventService();
  const [activeTab, setActiveTab] = useState('scheduler'); // 'scheduler', 'controls', 'logs'
  
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
    width: '100%',
    height: '100%',
    padding: '0rem',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'false'
  };
  
  const tabsStyle = {
    display: 'flex',
    marginBottom: '1.5rem',
    borderBottom: '1px solid #ddd',
    gap: '1rem'
  };
  
  const tabStyle = (isActive) => ({
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    backgroundColor: isActive ? 'white' : 'transparent',
    borderBottom: isActive ? '2px solid #007bff' : 'none',
    fontWeight: isActive ? 'bold' : 'normal',
    fontSize: '1.1rem'
  });
  
  const contentStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem',
    marginBottom: '1rem'
  };
  
  const sectionStyle = {
    marginBottom: '2rem',
    padding: '1.5rem',
    backgroundColor: 'white',
    borderRadius: '5px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  };
  
  const headerStyle = {
    fontWeight: 'bold',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #eee',
    fontSize: '1.1rem'
  };
  
  const inputGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '1rem'
  };
  
  const labelStyle = {
    fontSize: '0.9rem',
    marginBottom: '0.5rem',
    color: '#333'
  };
  
  const inputStyle = {
    padding: '0.5rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    width: '100%'
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
  
  const renderSchedulerTab = () => (
    <div>
      <EventScheduler 
        commSettings={{
          ...commSettings,
          eventsPerMinute: commSettings.eventsPerMinute || 0,
          difficulty: commSettings.difficulty || 5
        }}
        monitoringSettings={{
          ...monitoringSettings,
          eventsPerMinute: monitoringSettings.eventsPerMinute || 0,
          difficulty: monitoringSettings.difficulty || 5
        }}
        trackingSettings={{
          ...trackingSettings,
          eventsPerMinute: trackingSettings.eventsPerMinute || 0,
          difficulty: trackingSettings.difficulty || 5
        }}
        resourceSettings={{
          ...resourceSettings,
          eventsPerMinute: resourceSettings.eventsPerMinute || 0,
          difficulty: resourceSettings.difficulty || 5
        }}
        onSchedulingChange={(change) => {
          console.log('Scheduling change:', change);
          if (onSchedulingChange) {
            onSchedulingChange(change);
          }
        }}
      />
    </div>
  );
  
  const renderControlsTab = () => (
    <div>
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
            style={inputStyle}
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
            style={inputStyle}
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
            style={inputStyle}
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
            style={inputStyle}
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
            style={inputStyle}
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
            style={inputStyle}
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
            style={inputStyle}
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
              style={inputStyle}
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
              style={inputStyle}
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
            style={inputStyle}
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
  
  const renderLogsTab = () => (
    <div>
      {/* Monitoring Log */}
      {monitoringSettings.isEnabled && (
        <div style={sectionStyle}>
          <div style={headerStyle}>Monitoring Log</div>
          <MonitoringTask.Log eventLog={monitoringLog} />
        </div>
      )}
      
      {/* Communications Log */}
      {commSettings.isEnabled && (
        <div style={sectionStyle}>
          <div style={headerStyle}>Communications Log</div>
          <CommunicationsTask.Log commLog={commLog} />
        </div>
      )}
      
      {/* Tracking Log */}
      {trackingSettings.isEnabled && (
        <div style={sectionStyle}>
          <div style={headerStyle}>Tracking Log</div>
          <TrackingTask.Log trackingLog={trackingLog} />
        </div>
      )}
      
      {/* Resource Management Log */}
      {resourceSettings.isEnabled && (
        <div style={sectionStyle}>
          <div style={headerStyle}>Resource Management Log</div>
          <ResourceManagementTask.Log resourceLog={resourceLog} />
        </div>
      )}
    </div>
  );

  return (
    <div style={sidebarStyle}>
      <div style={tabsStyle}>
        <div style={tabStyle(activeTab === 'scheduler')} onClick={() => setActiveTab('scheduler')}>
          Event Scheduler
        </div>
        <div style={tabStyle(activeTab === 'controls')} onClick={() => setActiveTab('controls')}>
          Event Controls
        </div>
        <div style={tabStyle(activeTab === 'logs')} onClick={() => setActiveTab('logs')}>
          Logs
        </div>
      </div>
      
      <div style={contentStyle}>
        {activeTab === 'scheduler' && renderSchedulerTab()}
        {activeTab === 'controls' && renderControlsTab()}
        {activeTab === 'logs' && renderLogsTab()}
      </div>

      <div style={{
        padding: '3rem',
        borderTop: '1px solid #ddd',
        backgroundColor: '#f5f5f5'
      }}>
        <button 
          onClick={() => {
            console.clear();
            eventService.setLogLevel('error');
            alert('Console cleared and logs reduced to errors only');
          }}
          style={{
            width: '100%',
            padding: '0.5rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Console & Reduce Logs
        </button>
      </div>
    </div>
  );
};

export default EnhancedSidebar; 