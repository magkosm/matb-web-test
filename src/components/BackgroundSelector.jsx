import React, { useState, useEffect } from 'react';
import BackgroundService from '../services/BackgroundService';

// Import background images directly for thumbnails
import cupolaImage from '../backgrounds/Cupola.jpg';
import columbusImage from '../backgrounds/Columbus.jpg';
import casaImage from '../backgrounds/CASA.jpeg';

// Map of background identifiers to actual image paths for thumbnails
const BACKGROUND_IMAGES = {
  'cupola': cupolaImage,
  'columbus': columbusImage,
  'casa': casaImage
};

const BackgroundSelector = ({ onClose, small = false }) => {
  const [selectedBackground, setSelectedBackground] = useState(BackgroundService.getCurrentBackground());
  const backgrounds = BackgroundService.getBackgroundOptions();

  // Apply the selected background immediately for preview
  useEffect(() => {
    const style = BackgroundService.getBackgroundStyle(selectedBackground);
    
    // Apply to the document body
    document.body.style.backgroundImage = style.backgroundImage || 'none';
    document.body.style.backgroundColor = style.backgroundColor || '';
    document.body.style.backgroundSize = style.backgroundSize || '';
    document.body.style.backgroundPosition = style.backgroundPosition || '';
    document.body.style.backgroundRepeat = style.backgroundRepeat || '';
    
    // Save the selection
    BackgroundService.saveBackgroundSetting(selectedBackground);
  }, [selectedBackground]);

  // Generate a thumbnail style for the background option
  const getThumbnailStyle = (background) => {
    if (background === 'white') {
      return {
        backgroundColor: '#ffffff',
        backgroundImage: 'none',
        width: small ? '50px' : '100px',
        height: small ? '30px' : '60px',
        border: selectedBackground === background ? '3px solid #007bff' : '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      };
    }
    
    return {
      backgroundImage: `url(${BACKGROUND_IMAGES[background]})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      width: small ? '50px' : '100px',
      height: small ? '30px' : '60px',
      border: selectedBackground === background ? '3px solid #007bff' : '1px solid #ccc',
      borderRadius: '4px',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden'
    };
  };

  return (
    <div style={{ 
      backgroundColor: 'rgba(0, 0, 0, 0.7)', 
      padding: small ? '10px' : '20px',
      borderRadius: '8px',
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)',
      pointerEvents: 'auto'
    }}>
      {!small && <h3 style={{ color: 'white', marginTop: 0, textAlign: 'center' }}>Background Selection</h3>}
      
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: small ? '5px' : '10px',
        justifyContent: 'center'
      }}>
        {backgrounds.map(background => (
          <div key={background} onClick={() => setSelectedBackground(background)}>
            <div style={getThumbnailStyle(background)}>
              {background === 'white' && (
                <div style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  color: '#888',
                  fontSize: small ? '10px' : '12px'
                }}>
                  White
                </div>
              )}
            </div>
            {!small && (
              <div style={{ 
                textAlign: 'center', 
                color: 'white', 
                fontSize: '12px',
                marginTop: '5px'
              }}>
                {BackgroundService.formatBackgroundName(background)}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {!small && onClose && (
        <div style={{ textAlign: 'center', marginTop: '15px' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '5px 15px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default BackgroundSelector; 