import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const SystemHealth = forwardRef(({ 
  monitoringMetrics,
  commMetrics,
  resourceMetrics,
  trackingMetrics,
  monitoringLogs,
  resourceLogs,
  commLogs,
  trackingLogs,
  isTrackingManual,
  isInBox
}, ref) => {
  const [cumulativeHealth, setCumulativeHealth] = useState(100);
  const [systemLoad, setSystemLoad] = useState(0);
  const lastUpdateRef = useRef(Date.now());
  const healthRef = useRef(100);
  const frameRef = useRef();
  const metricsRef = useRef({ monitoringMetrics, commMetrics, resourceMetrics, trackingMetrics });
  const lastImpactTime = useRef(Date.now());
  const pendingImpacts = useRef([]);

  // Expose healthRef to parent components
  useImperativeHandle(ref, () => ({
    healthRef,
    resetHealth: () => {
      healthRef.current = 100;
      setCumulativeHealth(100);
      pendingImpacts.current = [];
      lastImpactTime.current = Date.now();
    }
  }));

  // Update metrics ref when props change
  useEffect(() => {
    metricsRef.current = { monitoringMetrics, commMetrics, resourceMetrics, trackingMetrics };
  }, [monitoringMetrics, commMetrics, resourceMetrics, trackingMetrics]);

  // Reset when all metrics are null/undefined
  useEffect(() => {
    if (!monitoringMetrics && !commMetrics && !resourceMetrics) {
      healthRef.current = 100;
      setCumulativeHealth(100);
      pendingImpacts.current = [];
      lastImpactTime.current = Date.now();
    }
  }, [monitoringMetrics, commMetrics, resourceMetrics]);

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      healthRef.current = 100;
      setCumulativeHealth(100);
      pendingImpacts.current = [];
      lastImpactTime.current = Date.now();
    };
  }, []);

  // Handle health updates with RAF and forced interval
  useEffect(() => {
    let isUpdating = true;
    let lastForceUpdate = Date.now();

    const updateHealth = () => {
      if (!isUpdating) return;
      const now = Date.now();
      
      // Force update every 50ms
      if (now - lastForceUpdate >= 50) {
        setCumulativeHealth(healthRef.current);
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

  // Add this effect to handle metrics updates
  useEffect(() => {
    metricsRef.current = { monitoringMetrics, commMetrics, resourceMetrics, trackingMetrics };
    
    // Calculate new load immediately when any metrics change
    const newLoad = Math.min(100, Math.max(0,
      (resourceMetrics?.systemLoad || 0) + 
      (commMetrics?.systemLoad || 0) +
      (monitoringMetrics?.systemLoad || 0) +
      (trackingMetrics?.systemLoad || 0)
    ));
    
    setSystemLoad(newLoad);
  }, [resourceMetrics, commMetrics, monitoringMetrics, trackingMetrics]);

  // Modify the health impact processing effect to handle all tasks consistently
  useEffect(() => {
    const processHealthImpacts = () => {
      const now = Date.now();
      const deltaTime = (now - lastImpactTime.current) / 1000; // Convert to seconds
      
      // Get current impacts (all are per-second rates)
      const resourceImpact = (resourceMetrics?.healthImpact || 0) * deltaTime;
      const commImpact = (commMetrics?.healthImpact || 0);     // Already accounts for time
      const monitoringImpact = (monitoringMetrics?.healthImpact || 0);  // Direct impact, no time scaling needed
      const trackingImpact = (trackingMetrics?.healthImpact || 0) * deltaTime;
      
      // Apply all impacts
      const totalImpact = resourceImpact + commImpact + monitoringImpact + trackingImpact;
      
      if (totalImpact !== 0) {
        const newHealth = Math.min(100, Math.max(0, healthRef.current + totalImpact));
        healthRef.current = newHealth;
        setCumulativeHealth(newHealth);
      }
      
      lastImpactTime.current = now;
    };

    const intervalId = setInterval(processHealthImpacts, 100); // Update every 100ms
    
    return () => {
      clearInterval(intervalId);
    };
  }, [resourceMetrics?.healthImpact, commMetrics?.healthImpact, monitoringMetrics?.healthImpact, trackingMetrics?.healthImpact]);

  return (
    <div style={{ 
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: 'white'
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