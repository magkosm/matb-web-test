/**
 * ScoreboardService - Manages game scores using localStorage
 */

const STORAGE_KEYS = {
  NORMAL: 'matb_normal_scores',
  INFINITE: 'matb_infinite_scores'
};

const MAX_SCORES = 10; // Maximum number of scores to keep per mode

/**
 * Get scores for a specific game mode
 * @param {string} mode - 'normal' or 'infinite'
 * @returns {Array} Array of score objects sorted by score (descending)
 */
const getScores = (mode) => {
  const key = mode === 'infinite' ? STORAGE_KEYS.INFINITE : STORAGE_KEYS.NORMAL;
  try {
    const scores = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(scores) ? scores : [];
  } catch (error) {
    console.error('Error retrieving scores:', error);
    return [];
  }
};

/**
 * Save a new score to the scoreboard
 * @param {string} mode - 'normal' or 'infinite'
 * @param {number} score - The score value
 * @param {string} playerName - Player's name
 * @returns {boolean} Success status
 */
const saveScore = (mode, score, playerName) => {
  try {
    const key = mode === 'infinite' ? STORAGE_KEYS.INFINITE : STORAGE_KEYS.NORMAL;
    const scores = getScores(mode);
    
    // Create new score entry
    const newScore = {
      name: playerName || 'Anonymous',
      score: score,
      date: new Date().toISOString()
    };
    
    // Add new score and sort
    scores.push(newScore);
    
    // Sort differently based on mode (for infinite, higher is better)
    if (mode === 'infinite') {
      // Sort by time survived (descending)
      scores.sort((a, b) => b.score - a.score);
    } else {
      // Sort by score (descending)
      scores.sort((a, b) => b.score - a.score);
    }
    
    // Limit to max number of scores
    const limitedScores = scores.slice(0, MAX_SCORES);
    
    // Save back to localStorage
    localStorage.setItem(key, JSON.stringify(limitedScores));
    
    return true;
  } catch (error) {
    console.error('Error saving score:', error);
    return false;
  }
};

/**
 * Clear all scores for a specific mode or all modes
 * @param {string} [mode] - 'normal', 'infinite', or undefined for all
 * @returns {boolean} Success status
 */
const clearScores = (mode) => {
  try {
    if (mode === 'normal') {
      localStorage.removeItem(STORAGE_KEYS.NORMAL);
    } else if (mode === 'infinite') {
      localStorage.removeItem(STORAGE_KEYS.INFINITE);
    } else {
      // Clear all scores
      localStorage.removeItem(STORAGE_KEYS.NORMAL);
      localStorage.removeItem(STORAGE_KEYS.INFINITE);
    }
    return true;
  } catch (error) {
    console.error('Error clearing scores:', error);
    return false;
  }
};

/**
 * Check if a score would make it onto the leaderboard
 * @param {string} mode - 'normal' or 'infinite'
 * @param {number} score - The score to check
 * @returns {boolean} Whether the score would make the leaderboard
 */
const isHighScore = (mode, score) => {
  const scores = getScores(mode);
  
  // If we have fewer than MAX_SCORES, it's automatically a high score
  if (scores.length < MAX_SCORES) {
    return true;
  }
  
  // Otherwise, check if it's better than the lowest score
  const lowestScore = scores[scores.length - 1].score;
  return score > lowestScore;
};

const ScoreboardService = {
  getScores,
  saveScore,
  clearScores,
  isHighScore
};

export default ScoreboardService; 