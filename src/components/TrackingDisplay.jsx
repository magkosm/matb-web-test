import React, { useState, useEffect } from 'react';

export default function TrackingDisplay({ 
  cursorPosition, 
  targetPosition, 
  isAuto,
  isWithinTarget 
}) {
  const [isFlashing, setIsFlashing] = useState(false);
  
  // Flash effect when in manual mode (only for frame and lines)
  useEffect(() => {
    if (!isAuto) {
      const flashInterval = setInterval(() => {
        setIsFlashing(prev => !prev);
      }, 500);

      return () => clearInterval(flashInterval);
    } else {
      setIsFlashing(false);
    }
  }, [isAuto]);

  const frameColor = !isAuto ? (isFlashing ? 'red' : 'blue') : 'blue';
  const cursorColor = isAuto ? 'green' : (isWithinTarget ? 'blue' : 'red');

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="-150 -150 300 300"
      style={{ background: '#fff' }}
    >
      {/* Outer Frame */}
      <path
        d="M -150 -150 L -150 150 L 150 150 L 150 -150 Z"
        fill="none"
        stroke={frameColor}
        strokeWidth="2"
      />
      
      {/* Center Cross */}
      <line x1="-150" y1="0" x2="150" y2="0" 
        stroke={frameColor} 
        strokeWidth="1" 
      />
      <line x1="0" y1="-150" x2="0" y2="150" 
        stroke={frameColor} 
        strokeWidth="1" 
      />
      
      {/* Target Box */}
      <rect
        x="-25"
        y="-25"
        width="50"
        height="50"
        fill="none"
        stroke={frameColor}
        strokeDasharray="5,5"
      />
      
      {/* Target Cursor */}
      <circle
        cx={targetPosition.x}
        cy={targetPosition.y}
        r="8"
        fill="none"
        stroke={frameColor}
        strokeWidth="2"
      />
      
      {/* User Cursor */}
      <circle
        cx={cursorPosition.x}
        cy={cursorPosition.y}
        r="10"
        fill={cursorColor}
      />
    </svg>
  );
} 