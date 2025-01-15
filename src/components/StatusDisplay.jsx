import React from 'react';

const StatusDisplay = ({ tanks, pumps, failures }) => {
  // Calculate status for tanks A and B
  const getTankStatus = (tank) => {
    if (!tank.target) return 'N/A';
    const deviation = Math.abs(tank.level - tank.target);
    if (deviation <= 250) return 'Normal';
    if (deviation <= 500) return 'Warning';
    return 'Critical';
  };

  return (
    <div style={{
      position: 'absolute',
      right: 10,
      top: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '0.9em',
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>System Status</h3>
      
      {/* Tank Status */}
      <div style={{ marginBottom: '10px' }}>
        <div>Tank A: {getTankStatus(tanks.a)}</div>
        <div>Tank B: {getTankStatus(tanks.b)}</div>
      </div>

      {/* Active Pumps */}
      <div style={{ marginBottom: '10px' }}>
        <div>Active Pumps: {Object.entries(pumps).filter(([_, p]) => p.state === 'on').length}</div>
        <div>Failed Pumps: {failures.size}</div>
      </div>
    </div>
  );
};

export default StatusDisplay; 