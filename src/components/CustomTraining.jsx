import React, { useState, useRef, useEffect } from 'react';
import MatbTask from './MatbTask';
import { customTrainingSettings } from '../config/gameSettings';

const CustomTraining = ({ onBackToMenu }) => {
  // Task enable/disable states
  const [isMonitoringTaskEnabled, setIsMonitoringTaskEnabled] = useState(
    customTrainingSettings.defaultTasksEnabled.monitoring
  );
  const [isCommTaskEnabled, setIsCommTaskEnabled] = useState(
    customTrainingSettings.defaultTasksEnabled.communications
  );
  const [isResourceTaskEnabled, setIsResourceTaskEnabled] = useState(
    customTrainingSettings.defaultTasksEnabled.resource
  );
  const [isTrackingTaskEnabled, setIsTrackingTaskEnabled] = useState(
    customTrainingSettings.defaultTasksEnabled.tracking
  );
  
  // Task difficulty settings
  const [monitoringEPM, setMonitoringEPM] = useState(
    customTrainingSettings.defaultEPM.monitoring
  );
  const [commEPM, setCommEPM] = useState(
    customTrainingSettings.defaultEPM.communications
  );
  const [resourceEPM, setResourceEPM] = useState(
    customTrainingSettings.defaultEPM.resource
  );
  const [trackingEPM, setTrackingEPM] = useState(
    customTrainingSettings.defaultEPM.tracking
  );
  const [resourceDifficulty, setResourceDifficulty] = useState(
    customTrainingSettings.defaultDifficulty.resource
  );
  const [trackingDifficulty, setTrackingDifficulty] = useState(
    customTrainingSettings.defaultDifficulty.tracking
  );

  // Training state
  const [isTrainingActive, setIsTrainingActive] = useState(false);
  const [health, setHealth] = useState(customTrainingSettings.initialHealth);
  
  // Handle health changes from MatbTask
  const handleHealthChange = (newHealth) => {
    setHealth(newHealth);
  };
  
  // Function to get active task count
  const getActiveTaskCount = () => {
    let count = 0;
    if (isMonitoringTaskEnabled) count++;
    if (isCommTaskEnabled) count++;
    if (isResourceTaskEnabled) count++;
    if (isTrackingTaskEnabled) count++;
    return count;
  };
  
  // Validate task selection
  const handleStartTraining = () => {
    if (getActiveTaskCount() === 0) {
      alert('Please enable at least one task for training.');
      return;
    }
    
    setIsTrainingActive(true);
  };
  
  // End training and return to settings
  const handleEndTraining = () => {
    setIsTrainingActive(false);
  };
  
  return (
    <div className="custom-training-container">
      {!isTrainingActive ? (
        <>
          <h2>Custom Training Setup</h2>
          <p>Configure and practice specific tasks at your own pace.</p>
          
          <div className="task-settings-grid">
            {/* Monitoring Task Card */}
            <div className="task-setting-card">
              <h3>System Monitoring</h3>
              
              <div className="task-toggle">
                <span>Enable Task</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={isMonitoringTaskEnabled}
                    onChange={() => setIsMonitoringTaskEnabled(!isMonitoringTaskEnabled)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              
              {isMonitoringTaskEnabled && (
                <div className="task-configuration">
                  <div className="setting-row">
                    <label>Events Per Minute:</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={monitoringEPM}
                      onChange={(e) => setMonitoringEPM(parseInt(e.target.value))}
                    />
                    <span>{monitoringEPM}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Communications Task Card */}
            <div className="task-setting-card">
              <h3>Communications</h3>
              
              <div className="task-toggle">
                <span>Enable Task</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={isCommTaskEnabled}
                    onChange={() => setIsCommTaskEnabled(!isCommTaskEnabled)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              
              {isCommTaskEnabled && (
                <div className="task-configuration">
                  <div className="setting-row">
                    <label>Events Per Minute:</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={commEPM}
                      onChange={(e) => setCommEPM(parseInt(e.target.value))}
                    />
                    <span>{commEPM}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Resource Management Task Card */}
            <div className="task-setting-card">
              <h3>Resource Management</h3>
              
              <div className="task-toggle">
                <span>Enable Task</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={isResourceTaskEnabled}
                    onChange={() => setIsResourceTaskEnabled(!isResourceTaskEnabled)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              
              {isResourceTaskEnabled && (
                <div className="task-configuration">
                  <div className="setting-row">
                    <label>Events Per Minute:</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={resourceEPM}
                      onChange={(e) => setResourceEPM(parseInt(e.target.value))}
                    />
                    <span>{resourceEPM}</span>
                  </div>
                  
                  <div className="setting-row">
                    <label>Difficulty:</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={resourceDifficulty}
                      onChange={(e) => setResourceDifficulty(parseInt(e.target.value))}
                    />
                    <span>{resourceDifficulty}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Tracking Task Card */}
            <div className="task-setting-card">
              <h3>Tracking</h3>
              
              <div className="task-toggle">
                <span>Enable Task</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={isTrackingTaskEnabled}
                    onChange={() => setIsTrackingTaskEnabled(!isTrackingTaskEnabled)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              
              {isTrackingTaskEnabled && (
                <div className="task-configuration">
                  <div className="setting-row">
                    <label>Events Per Minute:</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={trackingEPM}
                      onChange={(e) => setTrackingEPM(parseInt(e.target.value))}
                    />
                    <span>{trackingEPM}</span>
                  </div>
                  
                  <div className="setting-row">
                    <label>Difficulty:</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={trackingDifficulty}
                      onChange={(e) => setTrackingDifficulty(parseInt(e.target.value))}
                    />
                    <span>{trackingDifficulty}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {getActiveTaskCount() === 0 && (
            <div className="health-warning">
              <p>Please enable at least one task to start training.</p>
            </div>
          )}
          
          <div className="button-container">
            <button className="cancel-button" onClick={onBackToMenu}>
              Cancel
            </button>
            <button className="start-button" onClick={handleStartTraining}>
              Start Training
            </button>
          </div>
        </>
      ) : (
        <div className="training-interface">
          <div className="training-header">
            <h2>Custom Training</h2>
            <div className="health-display">Health: {Math.round(health)}%</div>
            <button className="end-button" onClick={handleEndTraining}>
              End Training
            </button>
          </div>
          
          <MatbTask 
            isActive={true}
            eventsPerMinute={Math.max(monitoringEPM, commEPM, resourceEPM, trackingEPM)}
            difficulty={(resourceDifficulty + trackingDifficulty) / 6} // Average and scale
            onHealthChange={handleHealthChange}
            initialHealth={health}
          />
        </div>
      )}
    </div>
  );
};

export default CustomTraining; 