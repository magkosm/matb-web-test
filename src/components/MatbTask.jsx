import React, { useState, useEffect, useRef } from 'react';
import MonitoringTask from '../MonitoringTask';
import CommunicationsTask from '../CommunicationsTask';
import ResourceManagementTask from '../ResourceManagementTask';
import TrackingTask from '../TrackingTask';
import SystemHealth from './SystemHealth';

const MatbTask = ({ 
  isActive = false, 
  eventsPerMinute = 10, 
  difficulty = 1,
  onHealthChange,
  initialHealth = 100 
}) => {
  // Task references
  const monitoringTaskRef = useRef(null);
  const commTaskRef = useRef(null);
  const resourceTaskRef = useRef(null);
  const trackingTaskRef = useRef(null);
  const systemHealthRef = useRef(null);
  
  // State for metrics from each task
  const [monitoringMetrics, setMonitoringMetrics] = useState({ healthImpact: 0, systemLoad: 0 });
  const [commMetrics, setCommMetrics] = useState({ healthImpact: 0, systemLoad: 0 });
  const [resourceMetrics, setResourceMetrics] = useState(ResourceManagementTask.getDefaultMetrics());
  const [trackingMetrics, setTrackingMetrics] = useState(TrackingTask.getDefaultMetrics());
  
  // State for task logs
  const [showMonitoringLog, setShowMonitoringLog] = useState(false);
  const [showCommLog, setShowCommLog] = useState(false);
  const [showResourceLog, setShowResourceLog] = useState(false);
  const [showTrackingLog, setShowTrackingLog] = useState(false);
  
  // Placeholder functions for log updates
  const handleLogUpdate = (logData) => {
    // This function would normally update logs in a parent component
    // For now, we'll just provide an empty implementation to avoid errors
    console.log("Log update received", logData);
  };
  
  // Placeholder function for options updates
  const handleOptionsUpdate = (options) => {
    // This would normally update options in a parent component
    console.log("Options update received", options);
  };
  
  // Health monitoring interval
  const healthCheckRef = useRef(null);
  
  // Update the parent component when health changes
  useEffect(() => {
    if (isActive) {
      // Initial update of health
      if (systemHealthRef.current) {
        systemHealthRef.current.resetHealth(initialHealth);
        console.log("MatbTask: Initial health set to", initialHealth);
        
        // Immediately send initial health to parent
        onHealthChange(initialHealth);
      }
      
      healthCheckRef.current = setInterval(() => {
        if (systemHealthRef.current) {
          const currentHealth = systemHealthRef.current.getCurrentHealth();
          if (typeof currentHealth === 'number') {
            console.log("MatbTask: Health updated to", currentHealth);
            onHealthChange(currentHealth);
          }
        }
      }, 200); // More frequent checks for responsive UI
    } else {
      clearInterval(healthCheckRef.current);
    }
    
    return () => {
      clearInterval(healthCheckRef.current);
    };
  }, [isActive, onHealthChange, initialHealth]);
  
  // Reset all tasks when difficulty changes
  useEffect(() => {
    if (isActive) {
      resetAllTasks();
    }
  }, [difficulty, isActive]);
  
  // Reset all tasks
  const resetAllTasks = () => {
    if (monitoringTaskRef.current) monitoringTaskRef.current.resetTask();
    if (commTaskRef.current) commTaskRef.current.resetTask();
    if (resourceTaskRef.current) resourceTaskRef.current.resetTask();
    if (trackingTaskRef.current) trackingTaskRef.current.resetTask();
    
    // Reset health
    if (systemHealthRef.current) {
      systemHealthRef.current.resetHealth();
    }
  };
  
  // Scale difficulty to set task parameters
  const taskEPM = Math.min(30, Math.round(eventsPerMinute * difficulty));
  const taskDifficulty = Math.min(10, Math.round(5 * difficulty));
  
  return (
    <div className="matb-task-container">
      <div className="task-grid">
        <div className="monitoring-container">
          <MonitoringTask
            ref={monitoringTaskRef}
            eventsPerMinute={taskEPM}
            setEventsPerMinute={() => {}}
            showLog={showMonitoringLog}
            setShowLog={setShowMonitoringLog}
            onLogUpdate={handleLogUpdate}
            onOptionsUpdate={handleOptionsUpdate}
            onMetricsUpdate={setMonitoringMetrics}
            isEnabled={isActive}
          />
        </div>
        
        <div className="tracking-container">
          <TrackingTask
            ref={trackingTaskRef}
            eventsPerMinute={taskEPM}
            difficulty={taskDifficulty}
            onMetricsUpdate={setTrackingMetrics}
            isEnabled={isActive}
            showLog={showTrackingLog}
            setShowLog={setShowTrackingLog}
            onLogUpdate={handleLogUpdate}
            onOptionsUpdate={handleOptionsUpdate}
          />
        </div>
        
        <div className="health-container">
          <SystemHealth
            ref={systemHealthRef}
            monitoringMetrics={monitoringMetrics}
            commMetrics={commMetrics}
            resourceMetrics={resourceMetrics}
            trackingMetrics={trackingMetrics}
            initialHealth={initialHealth}
          />
        </div>
        
        <div className="communications-container">
          <CommunicationsTask
            ref={commTaskRef}
            eventsPerMinute={taskEPM}
            onMetricsUpdate={setCommMetrics}
            isEnabled={isActive}
            showLog={showCommLog}
            setShowLog={setShowCommLog}
            onLogUpdate={handleLogUpdate}
            onOptionsUpdate={handleOptionsUpdate}
          />
        </div>
        
        <div className="resource-container">
          <ResourceManagementTask
            ref={resourceTaskRef}
            eventsPerMinute={taskEPM}
            difficulty={taskDifficulty}
            onMetricsUpdate={setResourceMetrics}
            isEnabled={isActive}
            showLog={showResourceLog}
            setShowLog={setShowResourceLog}
            onLogUpdate={handleLogUpdate}
            onOptionsUpdate={handleOptionsUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default MatbTask; 