import React, { useState, useEffect, useRef } from 'react';

const SystemHealth = ({ 
  commMetrics,
  resourceMetrics
}) => {
  const [cumulativeHealth, setCumulativeHealth] = useState(100);
  const [systemLoad, setSystemLoad] = useState(0);
  const lastUpdateRef = useRef(Date.now());
  const healthRef = useRef(100);
  const frameRef = useRef();
  const metricsRef = useRef({ commMetrics, resourceMetrics });

  // Update metrics ref when props change
  useEffect(() => {
    metricsRef.current = { commMetrics, resourceMetrics };
  }, [commMetrics, resourceMetrics]);

  // Handle system load updates - debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!resourceMetrics && !commMetrics) {
        setSystemLoad(0);
        return;
      }

      const newLoad = Math.min(100, Math.max(0,
        (resourceMetrics?.systemLoad || 0) + 
        (commMetrics?.systemLoad || 0)
      ));
      setSystemLoad(newLoad);
    }, 100); // Add debounce delay

    return () => clearTimeout(timer);
  }, [resourceMetrics?.systemLoad, commMetrics?.systemLoad]);

  // Handle health updates with RAF
  useEffect(() => {
    let isUpdating = true;

    const updateHealth = () => {
      if (!isUpdating) return;

      const now = Date.now();
      const deltaTime = Math.min((now - lastUpdateRef.current) / 1000, 1);
      lastUpdateRef.current = now;

      const { commMetrics, resourceMetrics } = metricsRef.current;
      const resourceImpact = resourceMetrics?.healthImpact || 0;
      const commImpact = commMetrics?.healthImpact || 0;
      
      const totalChange = resourceImpact + commImpact;

      // Ensure health changes are properly bounded and not time-dependent
      const newHealth = Math.min(100, Math.max(0, 
        healthRef.current + totalChange
      ));
      
      if (Math.abs(newHealth - healthRef.current) > 0.01) {
        healthRef.current = newHealth;
        setCumulativeHealth(prev => {
          return Math.abs(prev - newHealth) > 0.01 ? newHealth : prev;
        });
      }

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
};

export default SystemHealth; 