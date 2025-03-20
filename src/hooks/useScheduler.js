import { useState, useEffect, useRef } from 'react';
import { useEventService } from '../services/EventService';

/**
 * Hook to manage scheduling of MATB events based on Events Per Minute (EPM) settings
 * @param {Object} options - Options for the scheduler
 * @param {Object} options.commSettings - Settings for communications task
 * @param {Object} options.monitoringSettings - Settings for monitoring task
 * @param {Object} options.trackingSettings - Settings for tracking task
 * @param {Object} options.resourceSettings - Settings for resource management task
 * @returns {Object} Scheduler methods and state
 */
const useScheduler = ({
  commSettings,
  monitoringSettings,
  trackingSettings,
  resourceSettings
}) => {
  const eventService = useEventService();
  const [isActive, setIsActive] = useState(false);
  const [nextEvents, setNextEvents] = useState({
    comm: null,
    monitoring: null,
    tracking: null,
    resource: null
  });
  
  // Refs to store timeouts and last triggered times
  const timeoutsRef = useRef({
    comm: null,
    monitoring: null,
    tracking: null,
    resource: null
  });
  
  const lastTriggeredRef = useRef({
    comm: 0,
    monitoring: 0,
    tracking: 0,
    resource: 0
  });
  
  // Clean up timeouts
  const clearAllTimeouts = () => {
    Object.values(timeoutsRef.current).forEach(timeout => {
      if (timeout) {
        clearTimeout(timeout);
      }
    });
    
    // Reset the timeouts
    timeoutsRef.current = {
      comm: null,
      monitoring: null,
      tracking: null,
      resource: null
    };
  };
  
  /**
   * Schedule the next event for a specific task type
   * @param {string} taskType - The type of task (comm, monitoring, tracking, resource)
   */
  const scheduleNextEvent = (taskType) => {
    // Only auto-schedule when scheduler is active
    if (!isActive) return;
    
    // Get the relevant settings based on task type
    let settings;
    switch(taskType) {
      case 'comm':
        settings = commSettings;
        break;
      case 'monitoring':
        settings = monitoringSettings;
        break;
      case 'tracking':
        settings = trackingSettings;
        break;
      case 'resource':
        settings = resourceSettings;
        break;
      default:
        console.error(`Unknown task type: ${taskType}`);
        return;
    }
    
    // Check if the task is enabled and has a valid EPM
    if (!settings || !settings.isEnabled || settings.eventsPerMinute <= 0) {
      setNextEvents(prev => ({
        ...prev,
        [taskType]: null
      }));
      return;
    }
    
    // Calculate milliseconds between events based on EPM
    // Add some randomness to avoid predictability
    const msPerEvent = (60 * 1000) / settings.eventsPerMinute;
    
    // Reduce randomness factor for more consistent timing
    const randomFactor = taskType === 'comm' || taskType === 'resource' ? 0.15 : 0.3;
    
    // Calculate random time between (1-randomFactor) and (1+randomFactor) of the base interval
    const randomizedMs = msPerEvent * (1 - randomFactor + Math.random() * 2 * randomFactor);
    
    // Calculate next event time
    const now = Date.now();
    const nextEventTime = now + randomizedMs;
    
    // Update next event time in state
    setNextEvents(prev => ({
      ...prev,
      [taskType]: nextEventTime
    }));
    
    // Clear any existing timeout for this task
    if (timeoutsRef.current[taskType]) {
      clearTimeout(timeoutsRef.current[taskType]);
    }
    
    // Schedule the event
    timeoutsRef.current[taskType] = setTimeout(() => {
      // Double-check that scheduler is still active when timeout fires
      if (isActive) {
        triggerEvent(taskType);
      }
    }, randomizedMs);
    
    console.log(`Scheduled ${taskType} event for ${new Date(nextEventTime).toLocaleTimeString()} (in ${Math.round(randomizedMs / 1000)}s)`);
  };
  
  /**
   * Trigger an event for a specific task type
   * @param {string} taskType - The type of task
   */
  const triggerEvent = (taskType) => {
    // Record the time this event was triggered
    lastTriggeredRef.current[taskType] = Date.now();
    
    let result = false;
    
    // Trigger the appropriate event based on task type
    switch(taskType) {
      case 'comm': {
        // For comm events, randomly select between own and other calls
        const callType = Math.random() > 0.5 ? 'own' : 'other';
        // Use seconds for responseWindow as the EventService will handle the conversion
        const responseWindow = 10; // 10 seconds response window
        
        console.log(`Scheduler: Triggering comm event (${callType}) with ${responseWindow}s response window`);
        
        // Make sure we're passing the correct parameters
        result = eventService.triggerCommEvent({ 
          callType,
          responseWindow // in seconds
        });
        
        // Only schedule next event if auto-scheduler is active
        if (isActive) {
          // Add a small delay before scheduling the next event to prevent overlap
          setTimeout(() => {
            scheduleNextEvent(taskType);
          }, 500);
        }
        
        // Return early to avoid the scheduleNextEvent call at the end
        return result;
      }
      
      case 'monitoring': {
        // For monitoring events, use a random number of triggers (1-3)
        const triggerCount = Math.floor(Math.random() * 3) + 1;
        const duration = eventService.eventConfigs.monitoring.defaultDuration; // in ms
        
        console.log(`Scheduler: Triggering monitoring event with ${triggerCount} triggers`);
        result = eventService.triggerMonitoringEvent({ triggerCount, duration });
        break;
      }
      
      case 'tracking': {
        // For tracking events, use difficulty from settings
        const duration = eventService.eventConfigs.tracking.defaultDuration; // in ms
        const difficulty = trackingSettings.difficulty || eventService.eventConfigs.tracking.defaultDifficulty;
        
        console.log(`Scheduler: Triggering tracking event with difficulty ${difficulty}`);
        result = eventService.triggerTrackingEvent({ duration, difficulty });
        break;
      }
      
      case 'resource': {
        // Log detailed information about the current state
        console.log(`Scheduler: Triggering resource event`);
        console.log(`Resource settings:`, resourceSettings);
        
        // For resource events, alternate between pump failures and fuel loss changes
        const usePumpFailure = Math.random() > 0.3;
        
        if (usePumpFailure) {
          // Random number of pump failures (1-3)
          const pumpFailureCount = Math.floor(Math.random() * 3) + 1;
          const duration = eventService.eventConfigs.resource.defaultFailureDuration; // in ms
          
          console.log(`Scheduler: Triggering ${pumpFailureCount} pump failures with duration ${duration}ms`);
          result = eventService.triggerResourceEvent({
            eventType: 'pumpFailure',
            pumpFailureCount: pumpFailureCount,
            duration
          });
        } else {
          // Random fuel loss multiplier (0.5-3.0)
          const fuelLossMultiplier = 0.5 + Math.random() * 2.5;
          const duration = eventService.eventConfigs.resource.defaultFailureDuration; // in ms
          
          // Define the event type explicitly to ensure exact match
          const fuelLossEventType = 'fuelLossChange';
          
          console.log(`Scheduler: Triggering fuel loss change (${fuelLossMultiplier.toFixed(1)}x) with duration ${duration}ms using event type "${fuelLossEventType}"`);
          result = eventService.triggerResourceEvent({
            eventType: fuelLossEventType,
            fuelLossMultiplier,
            duration
          });
        }
        
        // Only schedule next event if auto-scheduler is active
        if (isActive) {
          // Add a small delay before scheduling the next event
          setTimeout(() => {
            scheduleNextEvent(taskType);
          }, 500);
        }
        
        // Return early to avoid the scheduleNextEvent call at the end
        return result;
      }
      
      default:
        console.error(`Unknown task type: ${taskType}`);
        return;
    }
    
    // Log the result
    if (result) {
      console.log(`Successfully triggered ${taskType} event`);
    } else {
      console.error(`Failed to trigger ${taskType} event`);
    }
    
    // Schedule the next event for this task only if auto-scheduler is active
    if (isActive) {
      scheduleNextEvent(taskType);
    }
    
    return result;
  };
  
  /**
   * Start the scheduler
   */
  const startScheduler = () => {
    console.log('Starting event scheduler');
    setIsActive(true);
  };
  
  /**
   * Stop the scheduler
   */
  const stopScheduler = () => {
    console.log('Stopping event scheduler');
    setIsActive(false);
    clearAllTimeouts();
    
    // Reset next events
    setNextEvents({
      comm: null,
      monitoring: null,
      tracking: null,
      resource: null
    });
  };
  
  /**
   * Reset the scheduler
   */
  const resetScheduler = () => {
    stopScheduler();
    startScheduler();
  };
  
  // When the scheduler is activated, schedule initial events for each task
  useEffect(() => {
    if (isActive) {
      // Schedule initial events for all enabled tasks
      if (commSettings?.isEnabled) {
        scheduleNextEvent('comm');
      }
      
      if (monitoringSettings?.isEnabled) {
        scheduleNextEvent('monitoring');
      }
      
      if (trackingSettings?.isEnabled) {
        scheduleNextEvent('tracking');
      }
      
      if (resourceSettings?.isEnabled) {
        scheduleNextEvent('resource');
      }
    }
    
    // Clean up timeouts when component unmounts or scheduler is deactivated
    return () => {
      clearAllTimeouts();
    };
  }, [isActive]);
  
  // When settings change, reschedule events if needed
  useEffect(() => {
    if (isActive) {
      if (commSettings?.isEnabled) {
        scheduleNextEvent('comm');
      }
    }
  }, [commSettings?.eventsPerMinute, commSettings?.isEnabled]);
  
  useEffect(() => {
    if (isActive) {
      if (monitoringSettings?.isEnabled) {
        scheduleNextEvent('monitoring');
      }
    }
  }, [monitoringSettings?.eventsPerMinute, monitoringSettings?.isEnabled]);
  
  useEffect(() => {
    if (isActive) {
      if (trackingSettings?.isEnabled) {
        scheduleNextEvent('tracking');
      }
    }
  }, [trackingSettings?.eventsPerMinute, trackingSettings?.isEnabled, trackingSettings?.difficulty]);
  
  useEffect(() => {
    if (isActive) {
      if (resourceSettings?.isEnabled) {
        scheduleNextEvent('resource');
      }
    }
  }, [resourceSettings?.eventsPerMinute, resourceSettings?.isEnabled, resourceSettings?.difficulty]);
  
  return {
    isActive,
    nextEvents,
    startScheduler,
    stopScheduler,
    resetScheduler,
    triggerEvent
  };
};

export default useScheduler; 