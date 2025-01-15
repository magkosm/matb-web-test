import React, { useState, useEffect } from 'react';

const SystemHealth = ({ 
  monitoringLogs, 
  resourceLogs, 
  commLogs, 
  trackingLogs,
  isTrackingManual,
  isInBox 
}) => {
  const [health, setHealth] = useState(100);
  const [systemLoad, setSystemLoad] = useState(0);

  // Health calculation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setHealth(current => {
        let newHealth = current;

        // Base regeneration (0.5% per second - reduced from 1%)
        newHealth += 0.5;

        // Check latest logs for damage/healing
        const now = Date.now();
        const recentTime = now - 1000; // Last second

        // Resource Management continuous effects (increased impact)
        const latestResource = resourceLogs[resourceLogs.length - 1];
        if (latestResource) {
          if (!latestResource.corrA) newHealth -= 2; // Increased from 0.5
          if (!latestResource.corrB) newHealth -= 2; // Increased from 0.5
        }

        // Tracking continuous effects (increased impact)
        if (isTrackingManual) {
          if (isInBox) {
            newHealth += 2; // Increased from 1
          } else {
            newHealth -= 3; // Increased from 1
          }
        }

        // Recent monitoring events (increased impact)
        const recentMonitoring = monitoringLogs.filter(log => log.timestamp > recentTime);
        recentMonitoring.forEach(log => {
          if (log.type === 'miss' || log.type === 'falseAlarm') newHealth -= 5; // Increased from 2
          if (log.type === 'hit') newHealth += 3; // Increased from 2
        });

        // Recent comm events (increased impact)
        const recentComms = commLogs.filter(log => log.timestamp > recentTime);
        recentComms.forEach(log => {
          if (log.type === 'miss') newHealth -= 10; // Increased from 5 to 10 for misses
          if (log.type === 'falseAlarm') newHealth -= 5; // Kept at 5 for false alarms
          if (log.type === 'hit') newHealth += 3; // Kept at 3 for hits
          if (log.type === 'correctRejection') newHealth += 2; // Kept at 2 for correct rejections
        });

        return Math.min(100, Math.max(0, newHealth));
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resourceLogs, monitoringLogs, commLogs, isTrackingManual, isInBox]);

  // Add system load calculation
  useEffect(() => {
    const interval = setInterval(() => {
      let newLoad = 0;

      // Base load from resource management
      const latestResource = resourceLogs[resourceLogs.length - 1];
      if (latestResource) {
        // Add 10% load for each active pump
        newLoad += (latestResource.activePumps * 10);
        // Add 5% load for each failed pump
        newLoad += (latestResource.failedPumps * 5);
      }

      // Add load from tracking task
      if (isTrackingManual) {
        newLoad += 20; // Manual tracking adds significant load
      }

      // Add load from recent events
      const recentTime = Date.now() - 1000;
      const recentMonitoring = monitoringLogs.filter(log => log.timestamp > recentTime);
      const recentComms = commLogs.filter(log => log.timestamp > recentTime);
      
      newLoad += (recentMonitoring.length * 5); // Each monitoring event adds 5%
      newLoad += (recentComms.length * 5); // Each comm event adds 5%

      setSystemLoad(Math.min(100, Math.max(0, newLoad)));
    }, 1000);

    return () => clearInterval(interval);
  }, [resourceLogs, monitoringLogs, commLogs, isTrackingManual]);

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
        fontWeight: 'bold',
        flexShrink: 0
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
        {/* Health Bar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '80%'
        }}>
          <div>Health</div>
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
              height: `${health}%`,
              backgroundColor: '#00ff00',
              transition: 'height 0.3s ease'
            }} />
          </div>
        </div>

        {/* System Load Bar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '80%'
        }}>
          <div>System Load</div>
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
              backgroundColor: '#ff4444',
              transition: 'height 0.3s ease'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth; 