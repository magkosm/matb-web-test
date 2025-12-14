import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const SystemHealth = forwardRef(({
  monitoringMetrics,
  commMetrics,
  resourceMetrics,
  trackingMetrics,
  isMonitoringActive = true,
  isCommActive = true,
  isResourceActive = true,
  isTrackingActive = true,
  healthRef,
  onPerformanceUpdate
}, ref) => {
  const [cumulativeHealth, setCumulativeHealth] = useState(100);
  const [systemLoad, setSystemLoad] = useState(0);
  const lastUpdateRef = useRef(Date.now());
  const internalHealthRef = useRef(100);
  const frameRef = useRef();
  const metricsRef = useRef({ monitoringMetrics, commMetrics, resourceMetrics, trackingMetrics });
  const lastImpactTime = useRef(Date.now());
  const pendingImpacts = useRef([]);
  const taskActiveStatusRef = useRef({
    monitoring: isMonitoringActive,
    comm: isCommActive,
    resource: isResourceActive,
    tracking: isTrackingActive
  });

  // Make the health ref available to parent components
  useImperativeHandle(ref, () => ({
    getHealth: () => internalHealthRef.current,
    resetHealth: () => {
      internalHealthRef.current = 100;
      setCumulativeHealth(100);
    }
  }));

  // Update metrics ref when props change
  useEffect(() => {
    metricsRef.current = { monitoringMetrics, commMetrics, resourceMetrics, trackingMetrics };
  }, [monitoringMetrics, commMetrics, resourceMetrics, trackingMetrics]);

  // Update active status ref when props change
  useEffect(() => {
    taskActiveStatusRef.current = {
      monitoring: isMonitoringActive,
      comm: isCommActive,
      resource: isResourceActive,
      tracking: isTrackingActive
    };
  }, [isMonitoringActive, isCommActive, isResourceActive, isTrackingActive]);

  // Reset function
  const resetHealth = () => {
    internalHealthRef.current = 100;
    setCumulativeHealth(100);
    pendingImpacts.current = [];
    lastImpactTime.current = Date.now();

    // Also update the external health ref if provided
    if (healthRef) {
      healthRef.current = 100;
    }
  };

  // Reset when all metrics are null/undefined
  useEffect(() => {
    if (!monitoringMetrics && !commMetrics && !resourceMetrics) {
      resetHealth();
    }
  }, [monitoringMetrics, commMetrics, resourceMetrics]);

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      resetHealth();
    };
  }, []);

  // Handle health updates with RAF and forced interval
  useEffect(() => {
    let isUpdating = true;
    let lastForceUpdate = Date.now();

    const updateHealth = () => {
      if (!isUpdating) return;
      const now = Date.now();

      // Force update every 50ms (was 200ms)
      if (now - lastForceUpdate >= 50) {
        setCumulativeHealth(internalHealthRef.current);
        lastForceUpdate = now;
      }

      lastUpdateRef.current = now;
      frameRef.current = requestAnimationFrame(updateHealth);
    };

    frameRef.current = requestAnimationFrame(updateHealth);

    return () => {
      isUpdating = false;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  // Add this effect to handle metrics updates - updated to consider active status
  useEffect(() => {
    metricsRef.current = { monitoringMetrics, commMetrics, resourceMetrics, trackingMetrics };

    // Calculate new load immediately when any metrics change, only include active tasks
    const newLoad = Math.min(100, Math.max(0,
      (taskActiveStatusRef.current.resource ? (resourceMetrics?.systemLoad || 0) : 0) +
      (taskActiveStatusRef.current.comm ? (commMetrics?.systemLoad || 0) : 0) +
      (taskActiveStatusRef.current.monitoring ? (monitoringMetrics?.systemLoad || 0) : 0) +
      (taskActiveStatusRef.current.tracking ? (trackingMetrics?.systemLoad || 0) : 0)
    ));

    setSystemLoad(newLoad);
  }, [resourceMetrics, commMetrics, monitoringMetrics, trackingMetrics]);

  // Modify the health impact processing effect to handle active tasks only
  useEffect(() => {
    const processHealthImpacts = () => {
      const now = Date.now();
      const deltaTime = (now - lastImpactTime.current) / 1000; // Convert to seconds

      // Get current impacts (all are per-second rates), only from active tasks
      const resourceImpact = taskActiveStatusRef.current.resource ?
        (resourceMetrics?.healthImpact || 0) * deltaTime : 0;

      const commImpact = taskActiveStatusRef.current.comm ?
        (commMetrics?.healthImpact || 0) : 0;     // Already accounts for time

      const monitoringImpact = taskActiveStatusRef.current.monitoring ?
        (monitoringMetrics?.healthImpact || 0) : 0;  // Direct impact, no time scaling needed

      const trackingImpact = taskActiveStatusRef.current.tracking ?
        (trackingMetrics?.healthImpact || 0) * deltaTime : 0;

      // Apply all impacts
      const totalImpact = resourceImpact + commImpact + monitoringImpact + trackingImpact;

      if (totalImpact !== 0) {
        const newHealth = Math.min(100, Math.max(0, internalHealthRef.current + totalImpact));

        internalHealthRef.current = newHealth;
        setCumulativeHealth(newHealth);

        // Update external health ref if provided
        if (healthRef) {
          healthRef.current = newHealth;
        }
      }

      lastImpactTime.current = now;
    };

    const intervalId = setInterval(processHealthImpacts, 100); // Update every 100ms

    return () => {
      clearInterval(intervalId);
    };
  }, [resourceMetrics?.healthImpact, commMetrics?.healthImpact, monitoringMetrics?.healthImpact, trackingMetrics?.healthImpact, healthRef]);

  // Performance Logging (1Hz)
  useEffect(() => {
    const logInterval = setInterval(() => {
      if (onPerformanceUpdate) {
        onPerformanceUpdate({
          timestamp: new Date().toISOString(),
          health: internalHealthRef.current,
          load: systemLoad,
          // Include breakup of load if needed
        });
      }
    }, 1000);
    return () => clearInterval(logInterval);
  }, [onPerformanceUpdate, systemLoad]);

  // Process queue with better logging
  useEffect(() => {
    const processQueue = () => {
      const now = Date.now();

      // Process all impacts immediately
      while (pendingImpacts.current.length > 0) {
        const impact = pendingImpacts.current.shift();

        const newHealth = Math.min(100, Math.max(0,
          internalHealthRef.current + impact.impact
        ));

        internalHealthRef.current = newHealth;
        setCumulativeHealth(newHealth);

        // Update external health ref if provided
        if (healthRef) {
          healthRef.current = newHealth;
        }

        lastImpactTime.current = now;
      }
    };

    const intervalId = setInterval(processQueue, 16); // ~60fps (was slower)

    return () => {
      clearInterval(intervalId);
      pendingImpacts.current = [];
    };
  }, [healthRef]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        background: 'blue',
        color: 'white',
        textAlign: 'center',
        padding: '0.5rem',
        fontWeight: 'bold'
      }}>
        SYSTEM STATUS
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '10% 0'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '80%'
        }}>
          <div>Health ({Math.round(cumulativeHealth)}%)</div>
          <div style={{
            height: '100%',
            width: '40px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              height: `${cumulativeHealth}%`,
              backgroundColor: cumulativeHealth > 50 ? '#00ff00' : '#ff0000',
              transition: 'height 0.3s ease, background-color 0.3s ease'
            }} />
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '80%'
        }}>
          <div>Load ({Math.round(systemLoad)}%)</div>
          <div style={{
            height: '100%',
            width: '40px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              height: `${systemLoad}%`,
              backgroundColor: systemLoad > 75 ? '#ff0000' : '#ff4444',
              transition: 'height 0.3s ease, background-color 0.3s ease'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
});

export default SystemHealth; 