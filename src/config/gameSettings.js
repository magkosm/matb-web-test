/**
 * Game Settings Configuration
 * 
 * This file contains the default settings for each game mode.
 * Centralizing these settings makes it easier to adjust and maintain game balance.
 */

// Common settings shared across modes
const commonSettings = {
  initialHealth: 100,
  healthDecayRate: 0.5,  // Health decay per second when tasks are neglected
  healthRecoveryRate: 0.2, // Health recovery per second when tasks are handled well
};

// Normal Mode Settings
const normalModeSettings = {
  ...commonSettings,
  defaultGameDuration: 5, // Default game duration in minutes
  minGameDuration: 1,     // Minimum game duration in minutes
  maxGameDuration: 20,    // Maximum game duration in minutes
  
  // Difficulty scaling based on game duration
  // Base values + scaling formula
  baseEventsPerMinute: 4,
  durationScalingFactor: 1, // How much EPM increases per minute reduction in duration
  
  baseDifficulty: 1.0,
  difficultyScalingFactor: 0.2, // How much difficulty increases per minute reduction in duration
  
  // Scoring
  scoreUpdateInterval: 1000, // How often (in ms) to update the score
};

// Infinite Mode Settings
const infiniteModeSettings = {
  ...commonSettings,
  initialEventsPerMinute: 10,
  initialDifficulty: 1.0,
  
  // Difficulty progression
  difficultyIncreaseInterval: 30000, // Increase difficulty every 30 seconds
  eventsPerMinuteIncrement: 1,       // Increase EPM by this amount each interval
  difficultyIncrement: 0.1,          // Increase difficulty by this amount each interval
  
  // Level progression
  levelIncreaseInterval: 30000,      // Increase level every 30 seconds
};

// Custom Training Settings
const customTrainingSettings = {
  ...commonSettings,
  // Default task states
  defaultTasksEnabled: {
    monitoring: true,
    communications: true,
    resource: true,
    tracking: true,
  },
  
  // Default difficulty settings
  defaultEPM: {
    monitoring: 2,
    communications: 1,
    resource: 1,
    tracking: 1,
  },
  
  defaultDifficulty: {
    resource: 3,
    tracking: 3,
  },
  
  // Min/Max ranges for settings
  minEPM: 1,
  maxEPM: 10,
  minDifficulty: 1,
  maxDifficulty: 10,
};

// Export all settings
export {
  commonSettings,
  normalModeSettings,
  infiniteModeSettings,
  customTrainingSettings,
};

// Helper functions for calculating dynamic settings
export const calculateNormalModeEPM = (gameDuration) => {
  return normalModeSettings.baseEventsPerMinute + 
         (normalModeSettings.defaultGameDuration - gameDuration) * 
         normalModeSettings.durationScalingFactor;
};

export const calculateNormalModeDifficulty = (gameDuration) => {
  return normalModeSettings.baseDifficulty + 
         (normalModeSettings.defaultGameDuration - gameDuration) * 
         normalModeSettings.difficultyScalingFactor;
}; 