/**
 * BackgroundService - Manages background image selection across components
 */

// Import background images directly
import cupolaImage from '../backgrounds/Cupola.jpg';
import columbusImage from '../backgrounds/Columbus.jpg';
import casaImage from '../backgrounds/CASA.jpeg';

// Storage key for persisting background selection
const STORAGE_KEY = 'matb_background_setting';

// Available background options
const BACKGROUNDS = {
  WHITE: 'white',
  CUPOLA: 'cupola',
  COLUMBUS: 'columbus',
  CASA: 'casa'
};

// Map of background identifiers to actual image paths
const BACKGROUND_IMAGES = {
  [BACKGROUNDS.CUPOLA]: cupolaImage,
  [BACKGROUNDS.COLUMBUS]: columbusImage,
  [BACKGROUNDS.CASA]: casaImage
};

// Get the current background setting from localStorage or use default
const getCurrentBackground = () => {
  try {
    const savedBackground = localStorage.getItem(STORAGE_KEY);
    return savedBackground || BACKGROUNDS.WHITE;
  } catch (error) {
    console.error('Error retrieving background setting:', error);
    return BACKGROUNDS.WHITE;
  }
};

// Save the background setting to localStorage
const saveBackgroundSetting = (background) => {
  try {
    localStorage.setItem(STORAGE_KEY, background);
    return true;
  } catch (error) {
    console.error('Error saving background setting:', error);
    return false;
  }
};

// Get CSS style for the selected background
const getBackgroundStyle = (background) => {
  if (background === BACKGROUNDS.WHITE) {
    return {
      backgroundColor: '#ffffff',
      backgroundImage: 'none'
    };
  }
  
  // Use the image path from our map
  return {
    backgroundImage: `url(${BACKGROUND_IMAGES[background]})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };
};

// Get all available background options
const getBackgroundOptions = () => {
  return Object.values(BACKGROUNDS);
};

// Format the background name for display
const formatBackgroundName = (background) => {
  if (background === BACKGROUNDS.WHITE) {
    return 'White (Default)';
  }
  
  // Capitalize the first letter
  return background.charAt(0).toUpperCase() + background.slice(1);
};

const BackgroundService = {
  BACKGROUNDS,
  getCurrentBackground,
  saveBackgroundSetting,
  getBackgroundStyle,
  getBackgroundOptions,
  formatBackgroundName
};

export default BackgroundService; 