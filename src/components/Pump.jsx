import React from 'react';

const Pump = ({
  id,
  state,
  flow,
  onClick,
  orientation = 'vertical',
  size = 30,
  flowDirection
}) => {
  const getColor = () => {
    switch (state) {
      case 'on': return '#00FF00';
      case 'failure': return '#FF0000';
      default: return '#FFFFFF';
    }
  };

  // Modified arrow direction logic
  const getArrow = () => {
    if (id === '5' || id === '6' || id === '8') return '←';
    if (id === '7') return '→';
    switch (flowDirection) {
      case 'up': return '↑';
      case 'down': return '↓';
      case 'left': return '←';
      case 'right': return '→';
      default: return '';
    }
  };

  // Updated label position for pumps 7 and 8
  const getLabelPosition = () => {
    // if (id === '7') return { 
    //   position: 'absolute',
    //   width: '100%',
    //   textAlign: 'center',
    //   top: '-60px',
    //   left: '0'
    // };
    // if (id === '8') return { 
    //   position: 'absolute',
    //   width: '100%',
    //   textAlign: 'center',
    //   bottom: '-60px',
    //   left: '0'
    // };
    // return {};
  };

  return (
    <div 
      onClick={onClick}
      style={{
        width: size,
        height: size,
        border: '2px solid #000',
        backgroundColor: getColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        transform: 'none'
      }}
    >
      {/* Container for number and arrow */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexDirection: (id === '5' || id === '6' || id === '8') ? 'row-reverse' : 'row',
        ...getLabelPosition()
      }}>
        <span style={{ 
          color: state === 'on' ? '#000' : '#666',
          fontWeight: 'bold',
          userSelect: 'none',
          marginRight: (id === '5' || id === '6' || id === '8') ? 0 : '2px',
          marginLeft: (id === '5' || id === '6' || id === '8') ? '2px' : 0
        }}>
          {id}
        </span>
        <span style={{
          fontSize: '0.8em',
          fontWeight: 'bold'
        }}>
          {getArrow()}
        </span>
      </div>

      {/* Flow indicator */}
      {state === 'on' && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.8em',
          whiteSpace: 'nowrap',
          marginTop: '2px'
        }}>
          {flow}
        </div>
      )}
    </div>
  );
};

export default Pump; 