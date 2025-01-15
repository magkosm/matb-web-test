import React from 'react';

const Tank = ({ 
  letter, 
  level, 
  maxLevel, 
  target, 
  width = '100%',  // Changed to be relative to container
  height = '100%', // Changed to be relative to container
  showLevel = true,
  toleranceRange = 250
}) => {
  // Calculate fill percentage
  const fillPercentage = (level / maxLevel) * 100;
  
  // Determine tank status for color
  const getTankColor = () => {
    if (!target) return '#4CAF50'; // Normal color for non-target tanks
    
    const deviation = Math.abs(level - target);
    if (deviation <= toleranceRange) return '#4CAF50'; // Green - within tolerance
    if (deviation <= toleranceRange * 2) return '#FFA726'; // Orange - warning
    return '#EF5350'; // Red - critical
  };

  return (
    <div style={{
      width: width,
      height: height,
      position: 'relative',
      border: '2px solid #000',
      backgroundColor: '#fff',
    }}>
      {/* Target level indicator */}
      {target && (
        <div style={{
          position: 'absolute',
          left: -10,
          right: -10,
          height: '2px',
          backgroundColor: 'darkred',
          top: `${100 - (target / maxLevel * 100)}%`,
        }} />
      )}

      {/* Tolerance zone indicators */}
      {target && (
        <>
          <div style={{
            position: 'absolute',
            left: -5,
            width: '10px',
            height: `${(toleranceRange * 2 / maxLevel * 100)}%`,
            backgroundColor: 'darkred',
            opacity: 1,
            top: `${100 - ((target + toleranceRange) / maxLevel * 100)}%`,
          }} />
        </>
      )}

      {/* Fluid level */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: `${fillPercentage}%`,
        backgroundColor: getTankColor(),
        transition: 'height 0.3s ease, background-color 0.3s ease',
      }} />

      {/* Tank label */}
      <div style={{
        position: 'absolute',
        top: letter === 'a' || letter === 'b' ? '-15%' : '-25%',
        left: '50%',
        transform: 'translateX(-50%)',
        fontWeight: 'bold',
        fontSize: 'clamp(0.8rem, 2vw, 1.2rem)',
      }}>
        {letter.toUpperCase()}
      </div>

      {/* Level display */}
      {showLevel && (
        <div style={{
          position: 'absolute',
          bottom: letter === 'a' || letter === 'b' ? '-15%' : '-25%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(0.7rem, 1.5vw, 1rem)',
        }}>
          {Math.round(level)}
        </div>
      )}
    </div>
  );
};

export default Tank; 