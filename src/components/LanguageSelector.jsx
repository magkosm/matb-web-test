import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  // Get current language
  const currentLanguage = i18n.language;

  // Style for the buttons
  const buttonStyle = {
    margin: '0 5px',
    padding: '5px 10px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px'
  };

  // Style for active language button
  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'rgba(0, 123, 255, 0.2)',
    color: 'white',
    boxShadow: '0 0 5px rgba(0, 0, 0, 0.3)'
  };

  // Style for flag icons
  const flagStyle = {
    width: '20px',
    height: '14px',
    borderRadius: '2px',
    display: 'inline-block'
  };

  // Flag data - using inline SVG or emoji as fallback
  const flags = {
    en: (
      <div style={flagStyle}>
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#ffffff'
        }}>
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            {Array(7).fill(0).map((_, i) => (
              <div key={i} style={{
                height: '10%',
                width: '100%',
                backgroundColor: '#B22234'
              }} />
            ))}
          </div>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40%',
            height: '53%',
            backgroundColor: '#3C3B6E'
          }} />
          <span style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40%',
            height: '53%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>★</span>
        </div>
      </div>
    ),
    sv: (
      <div style={flagStyle}>
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#006AA7',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            width: '20%',
            height: '100%',
            backgroundColor: '#FECC02',
            left: '30%'
          }} />
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '20%',
            backgroundColor: '#FECC02',
            top: '40%'
          }} />
        </div>
      </div>
    ),
    el: (
      <div style={flagStyle}>
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#0D5EAF',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '11.1%',
            backgroundColor: 'white',
            top: '11.1%'
          }} />
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '11.1%',
            backgroundColor: 'white',
            top: '33.3%'
          }} />
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '11.1%',
            backgroundColor: 'white',
            top: '55.5%'
          }} />
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '11.1%',
            backgroundColor: 'white',
            top: '77.7%'
          }} />
          <div style={{
            position: 'absolute',
            width: '33.3%',
            height: '55.5%',
            backgroundColor: '#0D5EAF',
            top: 0,
            left: 0
          }}>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '33.3%',
              backgroundColor: 'white',
              top: '33.3%'
            }} />
            <div style={{
              position: 'absolute',
              width: '33.3%',
              height: '100%',
              backgroundColor: 'white',
              left: '33.3%'
            }} />
          </div>
        </div>
      </div>
    )
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center',
      margin: '10px 0'
    }}>
      <button
        onClick={() => changeLanguage('en')}
        style={currentLanguage === 'en' ? activeButtonStyle : buttonStyle}
      >
        {flags.en}
        EN
      </button>
      <button
        onClick={() => changeLanguage('sv')}
        style={currentLanguage === 'sv' ? activeButtonStyle : buttonStyle}
      >
        {flags.sv}
        SV
      </button>
      <button
        onClick={() => changeLanguage('el')}
        style={currentLanguage === 'el' ? activeButtonStyle : buttonStyle}
      >
        {flags.el}
        EL
      </button>
    </div>
  );
};

export default LanguageSelector; 