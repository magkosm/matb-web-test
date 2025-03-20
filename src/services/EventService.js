import { useRef } from 'react';

// EventService - Centralized service for managing MATB task events
class EventService {
  constructor() {
    // References to task components
    this.commTaskRef = null;
    this.monitoringTaskRef = null;
    this.trackingTaskRef = null;
    this.resourceTaskRef = null;
    
    // Event status tracking
    this.activeEvents = {
      comm: false,
      monitoring: false,
      tracking: false,
      resource: false
    };
    
    // Default event configurations
    this.eventConfigs = {
      comm: {
        responseTimeWindow: 10000, // 10 seconds for response
        ownCallsign: 'NASA504'
      },
      monitoring: {
        defaultDuration: 15000, // 15 seconds
        defaultTriggerCount: 2 // 2 triggers by default
      },
      tracking: {
        defaultDuration: 30000, // 30 seconds of manual handling
        defaultDifficulty: 3 // Lower difficulty (1-10 scale, 3 = easier than default)
      },
      resource: {
        defaultFuelLossMultiplier: 1.5, // 1.5x normal fuel loss rate
        defaultPumpFailureCount: 2, // 2 pumps fail by default
        defaultFailureDuration: 45000 // 45 seconds of pump failure
      }
    };
  }
  
  // Register task references
  registerTasks(commTaskRef, monitoringTaskRef, trackingTaskRef, resourceTaskRef) {
    console.log("EventService: Registering tasks...");
    
    // Validate refs before assigning
    const hasValidComm = commTaskRef && commTaskRef.current;
    const hasValidMonitoring = monitoringTaskRef && monitoringTaskRef.current;
    const hasValidTracking = trackingTaskRef && trackingTaskRef.current;
    const hasValidResource = resourceTaskRef && resourceTaskRef.current;
    
    // Log current state
    console.log("Task refs before updating:", {
      commTask: this.commTaskRef ? "set" : "null",
      monitoringTask: this.monitoringTaskRef ? "set" : "null",
      trackingTask: this.trackingTaskRef ? "set" : "null",
      resourceTask: this.resourceTaskRef ? "set" : "null"
    });
    
    // Only assign valid references
    if (hasValidComm) this.commTaskRef = commTaskRef;
    if (hasValidMonitoring) this.monitoringTaskRef = monitoringTaskRef;
    if (hasValidTracking) this.trackingTaskRef = trackingTaskRef;
    if (hasValidResource) this.resourceTaskRef = resourceTaskRef;
    
    // Log the updated state
    console.log("Task refs after updating:", {
      commTask: this.commTaskRef ? "set" : "null",
      monitoringTask: this.monitoringTaskRef ? "set" : "null",
      trackingTask: this.trackingTaskRef ? "set" : "null",
      resourceTask: this.resourceTaskRef ? "set" : "null"
    });
    
    // Check ref details - is the comm task properly set up?
    if (this.commTaskRef?.current) {
      console.log("CommTask methods available:", Object.keys(this.commTaskRef.current).join(", "));
    } else {
      console.error("CommTask reference is not valid or not properly initialized");
    }
    
    // Return whether all tasks were successfully registered
    const allTasksRegistered = hasValidComm && hasValidMonitoring && hasValidTracking && hasValidResource;
    return allTasksRegistered;
  }
  
  // Check if there are any active events
  hasActiveEvents() {
    return Object.values(this.activeEvents).some(active => active);
  }
  
  // Communications Task Events
  triggerCommEvent(config = {}) {
    console.log('EventService: triggerCommEvent called with config:', config);
    
    // Check if communications task reference is available
    if (!this.isTaskAvailable('comm')) {
      console.error('EventService: Communications task unavailable - cannot trigger event');
      // Clear any stale communication first if possible
      this.clearActiveCommMessage();
      return false;
    }
    
    // Check if the communications task is paused
    if (this.isTaskPaused('comm')) {
      console.warn('EventService: Communications task is paused - cannot trigger event');
      return false;
    }
    
    // Check if an event is already in progress
    try {
      if (this.commTaskRef.current.isActiveMessage && this.commTaskRef.current.isActiveMessage()) {
        console.warn('EventService: A communications event is already active');
        
        // If the active message is older than 15 seconds, try to clear it
        if (this.commTaskRef.current.getActiveMessageAge && 
            this.commTaskRef.current.getActiveMessageAge() > 15000) {
          console.log('EventService: Active message seems stale, attempting to clear it');
          this.clearActiveCommMessage();
        } else {
          return false;
        }
      }
    } catch (error) {
      console.error('EventService: Error checking active message state:', error);
    }
    
    try {
      // Determine the response window in milliseconds
      const responseWindow = config.responseWindow || 10000; // Default to 10 seconds
      
      // Build the event configuration
      const eventConfig = {
        callType: config.callType || 'own', // Default to own-ship calls
        responseWindow: responseWindow,
        useExternalAudio: config.useExternalAudio === true, // Use external audio if explicitly requested
      };
      
      console.log('EventService: Triggering communications call with config:', eventConfig);
      
      // Log available methods
      if (this.commTaskRef.current) {
        console.log('EventService: Communications task methods available:',
          Object.keys(this.commTaskRef.current));
      }
      
      // Trigger the call
      const success = this.commTaskRef.current.triggerCall(eventConfig);
      console.log('EventService: triggerCall result:', success);
      
      return success;
    } catch (error) {
      console.error('EventService: Error triggering communications event:', error);
      
      // Try to clean up after error
      this.clearActiveCommMessage();
      
      return false;
    }
  }
  
  // Monitoring Task Events
  triggerMonitoringEvent(config = {}) {
    if (!this.monitoringTaskRef || !this.monitoringTaskRef.current) {
      console.log('Monitoring task unavailable');
      return false;
    }
    
    const eventConfig = {
      triggerCount: config.triggerCount || this.eventConfigs.monitoring.defaultTriggerCount,
      duration: config.duration || this.eventConfigs.monitoring.defaultDuration
    };
    
    // Validate trigger count (1-6)
    eventConfig.triggerCount = Math.min(6, Math.max(1, eventConfig.triggerCount));
    
    // Set monitoring event as active
    this.activeEvents.monitoring = true;
    
    // Call the monitoring task method to trigger multiple indicators
    this.monitoringTaskRef.current.triggerMultipleEvents(eventConfig);
    
    // Set up callback to mark event as complete
    setTimeout(() => {
      this.activeEvents.monitoring = false;
    }, eventConfig.duration);
    
    return true;
  }
  
  // Tracking Task Events
  triggerTrackingEvent(config = {}) {
    if (!this.trackingTaskRef || !this.trackingTaskRef.current) {
      console.log('Tracking task unavailable');
      return false;
    }
    
    const eventConfig = {
      duration: config.duration || this.eventConfigs.tracking.defaultDuration,
      difficulty: config.difficulty || this.eventConfigs.tracking.defaultDifficulty
    };
    
    console.log(`EventService: Processing tracking event request - duration: ${eventConfig.duration}ms (${eventConfig.duration/1000}s), difficulty: ${eventConfig.difficulty}`);
    
    // Set tracking event as active
    this.activeEvents.tracking = true;
    
    // Log when event will end
    const endTime = new Date(Date.now() + eventConfig.duration);
    console.log(`EventService: Tracking event scheduled to end at ${endTime.toLocaleTimeString()}`);
    
    // Call the tracking task method to force manual control
    const result = this.trackingTaskRef.current.forceManualControl(eventConfig);
    
    if (!result) {
      console.log('EventService: Failed to force manual control');
      this.activeEvents.tracking = false;
      return false;
    }
    
    console.log(`EventService: Manual tracking mode activated successfully for ${eventConfig.duration/1000}s`);
    
    // Set up callback to mark event as complete
    setTimeout(() => {
      console.log('EventService: Tracking event period ended');
      this.activeEvents.tracking = false;
    }, eventConfig.duration);
    
    return true;
  }
  
  // Resource Management Task Events
  triggerResourceEvent(config = {}) {
    if (!this.resourceTaskRef || !this.resourceTaskRef.current) {
      console.error('Resource management task unavailable');
      return false;
    }
    
    // Default to pump failure if not specified
    const eventType = config.eventType || 'pumpFailure';
    const duration = config.duration || this.eventConfigs.resource.defaultFailureDuration;
    
    console.log('EventService: triggerResourceEvent called with config:', config);
    
    // Set resource event as active
    this.activeEvents.resource = true;
    
    // Call the appropriate resource task method based on event type
    let success = false;
    
    try {
      if (eventType === 'pumpFailure') {
        // Get count of pumps to fail - ensure it's properly passed
        // Standardize on pumpFailureCount for consistency
        const pumpFailureCount = config.pumpFailureCount || config.pumpCount || this.eventConfigs.resource.defaultPumpFailureCount;
        
        console.log(`EventService: Triggering ${pumpFailureCount} pump failures with duration ${duration}ms`);
        
        // Use the triggerMultiplePumpFailures method with normalized parameters
        success = this.resourceTaskRef.current.triggerMultiplePumpFailures({
          count: pumpFailureCount,
          duration
        });
        
        console.log(`EventService: Triggered ${pumpFailureCount} pump failure(s), success: ${success}`);
      } 
      else if (eventType === 'fuelLossChange') {
        // Handle fuel loss change events
        const fuelLossMultiplier = config.fuelLossMultiplier || this.eventConfigs.resource.defaultFuelLossMultiplier;
        
        console.log(`EventService: Triggering fuel loss change (${fuelLossMultiplier}x) with duration ${duration}ms`);
        
        // Check if the ResourceManagementTask has a method for handling fuel loss changes
        if (typeof this.resourceTaskRef.current.setFuelLossRate === 'function') {
          success = this.resourceTaskRef.current.setFuelLossRate(fuelLossMultiplier, duration);
          console.log(`EventService: Set fuel loss rate to ${fuelLossMultiplier}x, success: ${success}`);
        } 
        else {
          // Fallback if method doesn't exist
          console.warn('Resource task does not support setFuelLossRate method, trying generic event trigger');
          
          // Try to use a generic event trigger method if available
          if (typeof this.resourceTaskRef.current.triggerEvent === 'function') {
            success = this.resourceTaskRef.current.triggerEvent({
              type: 'fuelLossChange',
              multiplier: fuelLossMultiplier,
              duration
            });
            console.log(`EventService: Triggered generic fuel loss event, success: ${success}`);
          } 
          else {
            console.error('Resource task does not support fuel loss change events');
            this.activeEvents.resource = false;
            return false;
          }
        }
      }
      
      // If the event was triggered successfully
      if (success) {
        // Set up callback to mark event as complete after duration
        setTimeout(() => {
          console.log(`EventService: Resource event (${eventType}) completed after ${duration}ms`);
          this.activeEvents.resource = false;
        }, duration);
        
        return true;
      } 
      else {
        console.error(`EventService: Failed to trigger resource event (${eventType})`);
        this.activeEvents.resource = false;
        return false;
      }
    } 
    catch (error) {
      console.error(`EventService: Error in triggerResourceEvent:`, error);
      this.activeEvents.resource = false;
      return false;
    }
  }
  
  // Update event configurations
  updateEventConfigs(newConfigs) {
    this.eventConfigs = {
      ...this.eventConfigs,
      ...newConfigs
    };
  }

  // Check if all tasks are registered properly
  areTasksRegistered() {
    const hasCommTask = !!(this.commTaskRef?.current);
    const hasMonitoringTask = !!(this.monitoringTaskRef?.current);
    const hasTrackingTask = !!(this.trackingTaskRef?.current);
    const hasResourceTask = !!(this.resourceTaskRef?.current);
    
    return hasCommTask && hasMonitoringTask && hasTrackingTask && hasResourceTask;
  }

  // Check if a specific task is available
  isTaskAvailable(taskName) {
    switch (taskName) {
      case 'comm':
        const hasRef = !!this.commTaskRef;
        const hasCurrent = !!(this.commTaskRef?.current);
        if (!hasCurrent) {
          console.warn(`Communication task unavailable: hasRef: ${hasRef}, hasCurrent: ${hasCurrent}`);
        }
        return hasCurrent;
      
      case 'monitoring':
        return !!(this.monitoringTaskRef?.current);
      
      case 'tracking':
        return !!(this.trackingTaskRef?.current);
      
      case 'resource':
        return !!(this.resourceTaskRef?.current);
      
      default:
        console.error(`isTaskAvailable called with unknown task name: ${taskName}`);
        return false;
    }
  }

  // Check if a task is paused
  isTaskPaused(taskName) {
    switch (taskName) {
      case 'comm':
        if (!this.isTaskAvailable('comm')) return false;
        try {
          // Check if the task has an isPaused method
          if (typeof this.commTaskRef.current.isPaused === 'function') {
            const paused = this.commTaskRef.current.isPaused();
            if (paused) {
              console.log('EventService: Communications task is paused');
            }
            return paused;
          }
          return false;
        } catch (error) {
          console.error('EventService: Error checking if communications task is paused:', error);
          return false;
        }
      
      // Add cases for other tasks here when they implement pause functionality
      default:
        return false;
    }
  }

  // Clear any active communications
  clearActiveCommMessage() {
    if (!this.isTaskAvailable('comm')) {
      console.warn('EventService: Cannot clear active message - comm task reference unavailable');
      return false;
    }
    
    // Still allow clearing messages even if paused
    if (this.commTaskRef.current.clearActiveMessage) {
      try {
        console.log('EventService: Clearing active communication message');
        this.commTaskRef.current.clearActiveMessage();
        return true;
      } catch (error) {
        console.error('EventService: Error clearing active message:', error);
        return false;
      }
    } else {
      console.warn('EventService: Cannot clear active message - clearActiveMessage method not found');
      return false;
    }
  }

  // Toggle pause on a task
  toggleTaskPause(taskName) {
    switch (taskName) {
      case 'comm':
        if (this.isTaskAvailable('comm') && typeof this.commTaskRef.current.togglePause === 'function') {
          try {
            const isPaused = this.commTaskRef.current.togglePause();
            console.log(`EventService: Communications task ${isPaused ? 'paused' : 'resumed'}`);
            return true;
          } catch (error) {
            console.error('EventService: Error toggling communications task pause state:', error);
            return false;
          }
        } else {
          console.warn('EventService: Cannot toggle pause - comm task reference unavailable or missing togglePause method');
          return false;
        }
      
      // Add cases for other tasks here when they implement pause functionality
      default:
        console.warn(`EventService: Pause toggle not implemented for ${taskName}`);
        return false;
    }
  }
  
  // Pause all tasks
  pauseAllTasks() {
    console.log('EventService: Attempting to pause all tasks');
    
    let allPaused = true;
    
    // Pause communications task
    if (this.isTaskAvailable('comm') && typeof this.commTaskRef.current.togglePause === 'function') {
      try {
        // Only toggle if not already paused
        if (!this.isTaskPaused('comm')) {
          this.commTaskRef.current.togglePause();
          console.log('EventService: Communications task paused');
        }
      } catch (error) {
        console.error('EventService: Error pausing communications task:', error);
        allPaused = false;
      }
    } else {
      allPaused = false;
    }
    
    // TODO: Implement pause for other tasks when they support it
    
    return allPaused;
  }
  
  // Resume all tasks
  resumeAllTasks() {
    console.log('EventService: Attempting to resume all tasks');
    
    let allResumed = true;
    
    // Resume communications task
    if (this.isTaskAvailable('comm') && typeof this.commTaskRef.current.togglePause === 'function') {
      try {
        // Only toggle if currently paused
        if (this.isTaskPaused('comm')) {
          this.commTaskRef.current.togglePause();
          console.log('EventService: Communications task resumed');
        }
      } catch (error) {
        console.error('EventService: Error resuming communications task:', error);
        allResumed = false;
      }
    } else {
      allResumed = false;
    }
    
    // TODO: Implement resume for other tasks when they support it
    
    return allResumed;
  }
}

// Singleton instance
const eventService = new EventService();

// React hook for accessing the event service
export const useEventService = () => {
  const eventServiceRef = useRef(eventService);
  return eventServiceRef.current;
};

export default eventService; 