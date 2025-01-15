import React from 'react';

const Connection = ({ 
  startX, 
  startY, 
  endX, 
  endY, 
  isActive,
  hasArrow = true,
  flowDirection = 'up'
}) => {
  const arrowSize = 10;
  
  // Calculate the angle for the line and arrow
  const angle = Math.atan2(endY - startY, endX - startX);
  
  // Calculate arrow points
  const arrowPoints = () => {
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Position arrow slightly before the end point
    const arrowX = endX - (dx * arrowSize / length);
    const arrowY = endY - (dy * arrowSize / length);
    
    return `
      M ${arrowX - arrowSize * Math.cos(angle - Math.PI / 6)} ${arrowY - arrowSize * Math.sin(angle - Math.PI / 6)}
      L ${endX} ${endY}
      L ${arrowX - arrowSize * Math.cos(angle + Math.PI / 6)} ${arrowY - arrowSize * Math.sin(angle + Math.PI / 6)}
    `;
  };

  return (
    <g>
      {/* Main line with animation */}
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={isActive ? '#00ff00' : '#000'}
        strokeWidth="2"
        strokeDasharray={isActive ? '10,10' : 'none'}
        style={{
          animation: isActive ? 'flowDash 1s linear infinite' : 'none'
        }}
      />

      {/* Arrow */}
      {hasArrow && (
        <path
          d={arrowPoints()}
          fill="none"
          stroke={isActive ? '#00ff00' : '#000'}
          strokeWidth="2"
        />
      )}
    </g>
  );
};

export default Connection; 