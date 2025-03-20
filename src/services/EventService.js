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

    // Scheduler state
    this.schedulerState = {
      initialized: false,
      isActive: false,
      nextEvents: {
        comm: null,
        monitoring: null,
        tracking: null,
        resource: null
      },
      timeouts: {
        comm: null,
        monitoring: null,
        tracking: null,
        resource: null
      },
      lastTriggered: {
        comm: 0,
        monitoring: 0,
        tracking: 0,
        resource: 0
      },
      settings: {
        comm: { isEnabled: false, eventsPerMinute: 0, difficulty: 5 },
        monitoring: { isEnabled: false, eventsPerMinute: 0, difficulty: 5 },
        tracking: { isEnabled: false, eventsPerMinute: 0, difficulty: 5 },
        resource: { isEnabled: false, eventsPerMinute: 0, difficulty: 5 }
      },
      listeners: [],
      updateDebounceTimeout: null,
      lastSettingsUpdate: 0,
      stateNotificationInterval: null
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
      // Get difficulty level if provided (used for logging only for manual events)
      const difficulty = config.difficulty || this.schedulerState.settings.comm?.difficulty || 5;
      
      // Determine the response window in milliseconds
      const responseWindow = config.responseWindow * 1000 || 10000; // Default to 10 seconds
      
      // Build the event configuration
      const eventConfig = {
        callType: config.callType || 'own', // Default to own-ship calls
        responseWindow: responseWindow,
        useExternalAudio: config.useExternalAudio === true, // Use external audio if explicitly requested
      };
      
      console.log(`EventService: Triggering communications call with config: ${JSON.stringify(eventConfig)}, difficulty: ${difficulty}`);
      
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
    
    // Get difficulty level if not provided in config
    const difficulty = config.difficulty || this.schedulerState.settings.monitoring?.difficulty || 5;
    
    // If triggerCount not specified, calculate based on difficulty (1-6)
    let triggerCount = config.triggerCount;
    if (triggerCount === undefined) {
      const minIndicators = 1;
      const maxIndicators = 6;
      triggerCount = Math.min(maxIndicators, Math.max(minIndicators, 
        Math.round(minIndicators + ((maxIndicators - minIndicators) * (difficulty - 1) / 9))
      ));
    }
    
    // If duration not specified, calculate based on difficulty (8s-5s)
    let duration = config.duration;
    if (duration === undefined) {
      const maxDuration = 8000; // 8 seconds in ms
      const minDuration = 5000; // 5 seconds in ms
      duration = Math.round(maxDuration - ((maxDuration - minDuration) * (difficulty - 1) / 9));
    }
    
    const eventConfig = {
      triggerCount: Math.min(6, Math.max(1, triggerCount)),
      duration: duration || this.eventConfigs.monitoring.defaultDuration
    };
    
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
    
    // Get difficulty level if not provided in config
    const difficulty = config.difficulty || this.schedulerState.settings.tracking?.difficulty || 5;
    
    // If duration not specified, calculate based on difficulty (6s-12s)
    let duration = config.duration;
    if (duration === undefined) {
      const minDuration = 6000; // 6 seconds in ms
      const maxDuration = 12000; // 12 seconds in ms
      duration = Math.round(minDuration + ((maxDuration - minDuration) * (difficulty - 1) / 9));
    }
    
    // Calculate drift force based on difficulty
    // Scale linearly from 130% at difficulty 1 to 50% at difficulty 10
    // This makes higher difficulty even easier to handle in terms of drift
    const driftForceMultiplier = 1.3 - ((1.3 - 0.5) * (difficulty - 1) / 9);
    
    const eventConfig = {
      duration: duration || this.eventConfigs.tracking.defaultDuration,
      difficulty: difficulty,
      driftForceMultiplier: driftForceMultiplier
    };
    
    console.log(`EventService: Processing tracking event request - duration: ${eventConfig.duration}ms (${eventConfig.duration/1000}s), difficulty: ${eventConfig.difficulty}, drift force: ${(driftForceMultiplier * 100).toFixed(0)}%`);
    
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
    
    console.log(`EventService: Manual tracking mode activated successfully for ${eventConfig.duration/1000}s with drift force at ${(driftForceMultiplier * 100).toFixed(0)}%`);
    
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
    
    // Get difficulty level if not provided in config
    const difficulty = config.difficulty || this.schedulerState.settings.resource?.difficulty || 5;
    
    // Default to pump failure if not specified
    const eventType = config.eventType || 'pumpFailure';
    
    // If duration not specified, calculate based on difficulty (4s-11s)
    let duration = config.duration;
    if (duration === undefined) {
      const minDuration = 4000; // 4 seconds in ms
      const maxDuration = 11000; // 11 seconds in ms
      duration = Math.round(minDuration + ((maxDuration - minDuration) * (difficulty - 1) / 9));
    }
    
    console.log('EventService: triggerResourceEvent called with config:', {
      ...config,
      difficulty,
      calculatedDuration: duration
    });
    
    // Set resource event as active
    this.activeEvents.resource = true;
    
    // Call the appropriate resource task method based on event type
    let success = false;
    
    try {
      if (eventType === 'pumpFailure') {
        // If pumpFailureCount not specified, calculate based on difficulty (1-4)
        let pumpFailureCount = config.pumpFailureCount || config.pumpCount;
        if (pumpFailureCount === undefined) {
          const minPumps = 1;
          const maxPumps = 4;
          pumpFailureCount = Math.min(maxPumps, Math.max(minPumps,
            Math.round(minPumps + ((maxPumps - minPumps) * (difficulty - 1) / 9))
          ));
        }
        
        console.log(`EventService: Triggering ${pumpFailureCount} pump failures with duration ${duration}ms (difficulty ${difficulty})`);
        
        // Use the triggerMultiplePumpFailures method with normalized parameters
        success = this.resourceTaskRef.current.triggerMultiplePumpFailures({
          count: pumpFailureCount,
          duration
        });
        
        console.log(`EventService: Triggered ${pumpFailureCount} pump failure(s), success: ${success}`);
      } 
      else if (eventType === 'fuelLossChange') {
        // If fuelLossMultiplier not specified, calculate based on difficulty (595-1395)
        let fuelLossMultiplier = config.fuelLossMultiplier;
        if (fuelLossMultiplier === undefined) {
          const minLossRate = 595;
          const maxLossRate = 1395;
          const lossRate = minLossRate + ((maxLossRate - minLossRate) * (difficulty - 1) / 9);
          
          // Convert to multiplier format (assuming base rate is 500)
          const baseFuelRate = 500;
          fuelLossMultiplier = parseFloat((lossRate / baseFuelRate).toFixed(2));
        }
        
        console.log(`EventService: Triggering fuel loss change (${fuelLossMultiplier}x) with duration ${duration}ms (difficulty ${difficulty})`);
        
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

  // SCHEDULER METHODS
  // =================

  // Initialize the scheduler with settings and start state notifications
  initializeScheduler(initialSettings) {
    if (this.schedulerState.initialized) {
      console.log('EventService: Scheduler already initialized');
      return;
    }

    console.log('EventService: Initializing scheduler with settings:', initialSettings);
    
    // Update settings without triggering rescheduling yet
    if (initialSettings) {
      this.schedulerState.settings = {
        ...this.schedulerState.settings,
        ...initialSettings
      };
    }
    
    // Set up a regular interval to notify about state changes
    // This replaces the need for many individual subscriptions
    this.schedulerState.stateNotificationInterval = setInterval(() => {
      this.notifySchedulerListeners();
    }, 1000); // Update UI every second
    
    this.schedulerState.initialized = true;
  }
  
  // Clean up the scheduler when it's no longer needed
  shutdownScheduler() {
    console.log('EventService: Shutting down scheduler');
    
    // Stop the scheduler if it's running
    if (this.schedulerState.isActive) {
      this.stopScheduler();
    }
    
    // Clear the state notification interval
    if (this.schedulerState.stateNotificationInterval) {
      clearInterval(this.schedulerState.stateNotificationInterval);
      this.schedulerState.stateNotificationInterval = null;
    }
    
    // Clear all listeners
    this.schedulerState.listeners = [];
    
    this.schedulerState.initialized = false;
  }
  
  // Subscribe to scheduler changes
  subscribeToScheduler(callback) {
    if (typeof callback === 'function') {
      // Check if this callback is already registered to avoid duplicates
      if (!this.schedulerState.listeners.includes(callback)) {
        console.log('EventService: Adding scheduler listener');
        this.schedulerState.listeners.push(callback);
        
        // Initialize scheduler if not already done
        if (!this.schedulerState.initialized) {
          this.initializeScheduler();
        }
        
        // Immediately send current state to new subscriber
        try {
          callback({
            isActive: this.schedulerState.isActive,
            nextEvents: { ...this.schedulerState.nextEvents }
          });
        } catch (error) {
          console.error('Error in initial callback to new scheduler listener:', error);
        }
        return true;
      } else {
        console.warn('EventService: Attempted to add duplicate scheduler listener');
        return false;
      }
    }
    return false;
  }

  // Unsubscribe from scheduler changes
  unsubscribeFromScheduler(callback) {
    const index = this.schedulerState.listeners.indexOf(callback);
    if (index !== -1) {
      console.log('EventService: Removing scheduler listener');
      this.schedulerState.listeners.splice(index, 1);
      return true;
    }
    return false;
  }

  // Notify all listeners of scheduler state changes
  notifySchedulerListeners() {
    const state = {
      isActive: this.schedulerState.isActive,
      nextEvents: { ...this.schedulerState.nextEvents }
    };
    
    this.schedulerState.listeners.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in scheduler listener:', error);
      }
    });
  }

  // Update scheduler settings with debounce
  updateSchedulerSettings(settings) {
    // Ensure scheduler is initialized
    if (!this.schedulerState.initialized) {
      this.initializeScheduler(settings);
      return;
    }
    
    // Cancel any pending update
    if (this.schedulerState.updateDebounceTimeout) {
      clearTimeout(this.schedulerState.updateDebounceTimeout);
      this.schedulerState.updateDebounceTimeout = null;
    }
    
    // Check if this is a duplicate/frequent update
    const now = Date.now();
    if (now - this.schedulerState.lastSettingsUpdate < 1000) { // Increased to 1000ms
      console.log('EventService: Debouncing rapid settings update');
      
      // Set a debounce timeout to apply the update
      this.schedulerState.updateDebounceTimeout = setTimeout(() => {
        this.applySchedulerSettings(settings);
        this.schedulerState.updateDebounceTimeout = null;
      }, 1000);
      return;
    }
    
    // Apply settings immediately if not debounced
    this.applySchedulerSettings(settings);
    this.schedulerState.lastSettingsUpdate = now;
  }
  
  // Apply scheduler settings (internal method)
  applySchedulerSettings(settings) {
    console.log('EventService: Applying scheduler settings');
    
    // Store previous settings for comparison
    const prevSettings = JSON.stringify(this.schedulerState.settings);
    
    // Update settings
    this.schedulerState.settings = {
      ...this.schedulerState.settings,
      ...settings
    };
    
    // Only reschedule if settings actually changed and scheduler is active
    if (prevSettings !== JSON.stringify(this.schedulerState.settings) && this.schedulerState.isActive) {
      console.log('EventService: Settings changed, rescheduling events');
      this.rescheduleEvents();
    } else {
      // Still notify listeners of settings change
      this.notifySchedulerListeners();
    }
  }

  // Start the scheduler
  startScheduler() {
    console.log('EventService: Starting event scheduler');
    
    // Ensure scheduler is initialized
    if (!this.schedulerState.initialized) {
      this.initializeScheduler();
    }
    
    // If already active, don't start again
    if (this.schedulerState.isActive) {
      console.warn('EventService: Scheduler is already active, ignoring start request');
      return false;
    }
    
    this.schedulerState.isActive = true;
    
    // Clear any old timeouts that might be lingering
    this.clearAllTimeouts();
    
    // Schedule initial events for all enabled tasks
    this.rescheduleEvents();
    
    this.notifySchedulerListeners();
    return true;
  }

  // Stop the scheduler
  stopScheduler() {
    console.log('EventService: Stopping event scheduler');
    this.schedulerState.isActive = false;
    this.clearAllTimeouts();
    
    // Reset next events
    this.schedulerState.nextEvents = {
      comm: null,
      monitoring: null,
      tracking: null,
      resource: null
    };
    
    this.notifySchedulerListeners();
    return true;
  }

  // Clear all timeouts
  clearAllTimeouts() {
    Object.values(this.schedulerState.timeouts).forEach(timeout => {
      if (timeout) {
        clearTimeout(timeout);
      }
    });
    
    // Reset the timeouts
    this.schedulerState.timeouts = {
      comm: null,
      monitoring: null,
      tracking: null,
      resource: null
    };
  }

  // Reschedule events (call when settings change)
  rescheduleEvents() {
    // First clear all existing timeouts to prevent overlapping events
    this.clearAllTimeouts();
    
    const { settings } = this.schedulerState;
    
    if (settings.comm?.isEnabled) {
      this.scheduleNextEvent('comm');
    } else {
      this.schedulerState.nextEvents.comm = null;
    }
    
    if (settings.monitoring?.isEnabled) {
      this.scheduleNextEvent('monitoring');
    } else {
      this.schedulerState.nextEvents.monitoring = null;
    }
    
    if (settings.tracking?.isEnabled) {
      this.scheduleNextEvent('tracking');
    } else {
      this.schedulerState.nextEvents.tracking = null;
    }
    
    if (settings.resource?.isEnabled) {
      this.scheduleNextEvent('resource');
    } else {
      this.schedulerState.nextEvents.resource = null;
    }
    
    this.notifySchedulerListeners();
  }

  // Schedule the next event for a specific task type
  scheduleNextEvent(taskType) {
    // Only auto-schedule when scheduler is active
    if (!this.schedulerState.isActive) return;
    
    // Get the relevant settings
    const settings = this.schedulerState.settings[taskType];
    
    // Check if the task is enabled and has a valid EPM
    if (!settings || !settings.isEnabled || settings.eventsPerMinute <= 0) {
      this.schedulerState.nextEvents[taskType] = null;
      return;
    }
    
    // If a timeout is already set for this task, do not reset it
    if (this.schedulerState.timeouts[taskType]) {
      return;
    }
    
    // Apply task-specific EPM limits
    let effectiveEPM = settings.eventsPerMinute;
    if (taskType === 'comm') {
      // Limit communications to 0-6 EPM
      effectiveEPM = Math.min(6, Math.max(0, effectiveEPM));
    }
    
    // Calculate milliseconds between events based on EPM
    const msPerEvent = (60 * 1000) / effectiveEPM;
    
    // Reduce randomness factor for more consistent timing
    const randomFactor = taskType === 'comm' || taskType === 'resource' ? 0.15 : 0.3;
    
    // Calculate random time between (1-randomFactor) and (1+randomFactor) of the base interval
    const randomizedMs = msPerEvent * (1 - randomFactor + Math.random() * 2 * randomFactor);
    
    // Calculate next event time
    const now = Date.now();
    const nextEventTime = now + randomizedMs;
    
    // Update next event time in state
    this.schedulerState.nextEvents[taskType] = nextEventTime;
    
    // Schedule the event
    console.log(`Scheduled ${taskType} event for ${new Date(nextEventTime).toLocaleTimeString()} (in ${Math.round(randomizedMs / 1000)}s), EPM: ${effectiveEPM.toFixed(1)}`);
    
    this.schedulerState.timeouts[taskType] = setTimeout(() => {
      // Clear the timeout reference first
      this.schedulerState.timeouts[taskType] = null;
      
      // Double-check that scheduler is still active when timeout fires
      if (this.schedulerState.isActive) {
        // Trigger the event
        this.triggerScheduledEvent(taskType);
      }
    }, randomizedMs);
  }

  // Trigger an event for a specific task type based on the scheduler
  triggerScheduledEvent(taskType) {
    // Record the time this event was triggered
    this.schedulerState.lastTriggered[taskType] = Date.now();
    
    let result = false;
    
    // Trigger the appropriate event based on task type
    switch(taskType) {
      case 'comm': {
        // Get difficulty level (1-10)
        const difficulty = this.schedulerState.settings.comm.difficulty || 5;
        
        // Calculate probability of own calls based on difficulty (difficulty 1 = 10%, difficulty 10 = 90%)
        const ownCallProbability = difficulty / 10;
        
        // Determine call type based on probability
        const isOwnCall = Math.random() < ownCallProbability;
        const callType = isOwnCall ? 'own' : 'other';
        
        // Use seconds for responseWindow as the EventService will handle the conversion
        const responseWindow = 10; // 10 seconds response window
        
        console.log(`Scheduler: Triggering comm event (${callType}) with ${responseWindow}s response window (difficulty ${difficulty}, own call probability: ${(ownCallProbability * 100).toFixed(0)}%)`);
        
        // Make sure we're passing the correct parameters
        result = this.triggerCommEvent({ 
          callType,
          responseWindow // in seconds
        });
        
        // Only schedule next event if auto-scheduler is active
        if (this.schedulerState.isActive) {
          // Add a small delay before scheduling the next event to prevent overlap
          setTimeout(() => {
            this.scheduleNextEvent(taskType);
          }, 500);
        }
        
        break;
      }
      
      case 'monitoring': {
        // Get difficulty level (1-10)
        const difficulty = this.schedulerState.settings.monitoring.difficulty || 5;
        
        // Scale number of indicators based on difficulty (1-6)
        // At difficulty 1 = 1 indicator, at difficulty 10 = 6 indicators
        const minIndicators = 1;
        const maxIndicators = 6;
        const triggerCount = Math.min(maxIndicators, Math.max(minIndicators, 
          Math.round(minIndicators + ((maxIndicators - minIndicators) * (difficulty - 1) / 9))
        ));
        
        // Scale duration based on difficulty (difficulty 1 = 8s, difficulty 10 = 5s)
        const maxDuration = 8; // seconds
        const minDuration = 5; // seconds
        const duration = maxDuration - ((maxDuration - minDuration) * (difficulty - 1) / 9);
        
        console.log(`Scheduler: Triggering monitoring event with ${triggerCount} indicators, ${duration.toFixed(1)}s duration (difficulty ${difficulty})`);
        
        result = this.triggerMonitoringEvent({
          triggerCount,
          duration: Math.round(duration * 1000) // Convert to ms
        });
        
        break;
      }
      
      case 'tracking': {
        const difficulty = this.schedulerState.settings.tracking.difficulty || 5;
        
        // Scale duration based on difficulty (difficulty 1 = 6s, difficulty 10 = 12s)
        const minDuration = 6; // seconds
        const maxDuration = 12; // seconds
        const duration = minDuration + ((maxDuration - minDuration) * (difficulty - 1) / 9);
        
        // Calculate drift force based on difficulty
        // Scale linearly from 130% at difficulty 1 to 50% at difficulty 10
        // This makes higher difficulty even easier to handle in terms of drift
        const driftForceMultiplier = 1.3 - ((1.3 - 0.5) * (difficulty - 1) / 9);
        
        console.log(`Scheduler: Triggering tracking event with difficulty ${difficulty}, ${duration.toFixed(1)}s duration, drift force: ${(driftForceMultiplier * 100).toFixed(0)}%`);
        
        result = this.triggerTrackingEvent({
          difficulty,
          duration: Math.round(duration * 1000), // Convert to ms
          driftForceMultiplier
        });
        
        break;
      }
      
      case 'resource': {
        // Get difficulty level (1-10)
        const difficulty = this.schedulerState.settings.resource.difficulty || 5;
        
        // Randomly decide between pump failure and fuel loss event
        const eventType = Math.random() > 0.5 ? 'pumpFailure' : 'fuelLossChange';
        
        // Scale duration based on difficulty (difficulty 1 = 4s, difficulty 10 = 11s)
        const minDuration = 4; // seconds
        const maxDuration = 11; // seconds
        const duration = minDuration + ((maxDuration - minDuration) * (difficulty - 1) / 9);
        
        const config = {
          eventType,
          duration: Math.round(duration * 1000) // Convert to ms
        };
        
        // Add event-specific properties
        if (eventType === 'pumpFailure') {
          // Scale pump failures based on difficulty (1-4)
          // At difficulty 1 = 1 pump, at difficulty 10 = 4 pumps
          const minPumps = 1;
          const maxPumps = 4;
          const pumpCount = Math.min(maxPumps, Math.max(minPumps,
            Math.round(minPumps + ((maxPumps - minPumps) * (difficulty - 1) / 9))
          ));
          
          config.pumpFailureCount = pumpCount;
        } else {
          // Scale fuel loss rate based on difficulty (595-1395)
          const minLossRate = 595;
          const maxLossRate = 1395;
          const lossRate = minLossRate + ((maxLossRate - minLossRate) * (difficulty - 1) / 9);
          
          // Convert to multiplier format (assuming base rate is 500)
          const baseFuelRate = 500;
          const fuelLossMultiplier = lossRate / baseFuelRate;
          
          config.fuelLossMultiplier = parseFloat(fuelLossMultiplier.toFixed(2));
        }
        
        console.log(`Scheduler: Triggering resource event (${eventType}), duration: ${duration.toFixed(1)}s, difficulty: ${difficulty}`, config);
        
        result = this.triggerResourceEvent(config);
        
        break;
      }
      
      default:
        console.error(`Unknown task type: ${taskType}`);
        return false;
    }
    
    // Log the result
    if (result) {
      console.log(`Successfully triggered scheduled ${taskType} event`);
    } else {
      console.error(`Failed to trigger scheduled ${taskType} event`);
    }
    
    // Schedule the next event for this task only if auto-scheduler is active
    if (this.schedulerState.isActive && taskType !== 'comm') { // Comm handles its own rescheduling
      this.scheduleNextEvent(taskType);
    }
    
    // Notify listeners about the changes
    this.notifySchedulerListeners();
    
    return result;
  }

  // Get current scheduler state
  getSchedulerState() {
    return {
      isActive: this.schedulerState.isActive,
      nextEvents: { ...this.schedulerState.nextEvents },
      settings: { ...this.schedulerState.settings }
    };
  }

  // Debug method to log current scheduler state
  logSchedulerState() {
    console.log('EventService: Current scheduler state:');
    console.log(`  Active: ${this.schedulerState.isActive}`);
    console.log(`  Listeners: ${this.schedulerState.listeners.length}`);
    console.log('  Next Events:');
    Object.entries(this.schedulerState.nextEvents).forEach(([type, time]) => {
      if (time) {
        console.log(`    ${type}: ${new Date(time).toLocaleTimeString()} (in ${Math.round((time - Date.now()) / 1000)}s)`);
      } else {
        console.log(`    ${type}: Not scheduled`);
      }
    });
    console.log('  Settings:');
    Object.entries(this.schedulerState.settings).forEach(([type, settings]) => {
      console.log(`    ${type}: enabled=${settings.isEnabled}, epm=${settings.eventsPerMinute}, difficulty=${settings.difficulty}`);
    });
  }

  // Set log level to control console output
  setLogLevel(level) {
    // Valid levels: 'debug', 'info', 'warn', 'error', 'none'
    this.logLevel = level;
    
    // If level is error, clear console for better visibility
    if (level === 'error') {
      console.clear();
      console.log('Log level set to ERROR only');
    }
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