/**
 * Central Configuration for MATB-II Simulation
 */

// ==========================================
// COMMUNICATIONS TASK CONFIGURATION
// ==========================================
export const COMM_CONFIG = {
    // Default events per minute if not specified
    DEFAULT_EPM: 4, // Increased from 2 per user request

    // Audio Playback
    PLAYBACK: {
        // If true, will try to use local files first, then fallback
        PREFER_LOCAL: true,
    },

    // Message Scheduling
    SCHEDULING: {
        // Base interval calculation: 60000 / EPM
        // Jitter factor: multiplied by base interval to randomize timing
        // Lower jitter means more regular, close to 1 means more random spread
        JITTER_MIN: 0.5, // Was 0.7 - Reduced for "faster start" feel (user request)
        JITTER_VAR: 0.5, // Was 0.6 - Random variance (0.5 to 1.0 multiplier range)

        // Minimum delay between messages
        MIN_DELAY_MS: 3000,
    },

    // Response Window Logic
    // Window = BASE - (Difficulty * DIFFICULTY_SCALER)
    RESPONSE_WINDOW: {
        BASE_MS: 12000, // Was 10000 - Increased base to start easier? Or keep 10k? User asked for "more events" not harder. Keeping 10k default.
        // Actually user said "Increase number of events". 
        // Let's keep window logic standard but make it tunable.
        BASE_WINDOW_MS: 10000,
        DIFFICULTY_SCALER: 500, // Reduces window by 500ms per difficulty level
        MIN_WINDOW_MS: 5000,    // Hardest possible window
    },

    // Message Content Probabilities
    CONTENT: {
        // Probability of "OWN" ship call (NASA504)
        // Formula: BASE - (Difficulty * SCALER)
        // User requested "not only NASA504, but rather other calls as well"
        // We will reduce the base chance of OWN calls to increase OTHER calls.
        OWN_CALL_BASE_CHANCE: 0.35, // Was 0.4. Reduced to increase variety.
        OWN_CALL_DIFF_SCALER: 0.02, // Was 0.03
        MIN_OWN_CALL_CHANCE: 0.1,
    },

    // Radio Ramp-up speeds (for frequency changing)
    CONTROLS: {
        LEVEL1_INTERVAL_MS: 500,
        LEVEL2_INTERVAL_MS: 200,
        LEVEL2_DELAY_MS: 1000,
    },

    DEFAULT_FREQUENCIES: {
        NAV1: '112.500',
        NAV2: '112.500',
        COM1: '118.325',
        COM2: '120.775',
    }
};

// ==========================================
// RESOURCE MANAGEMENT TASK CONFIGURATION
// ==========================================
export const RESOURCE_CONFIG = {
    // Fuel Tank Capacities and Targets
    TANKS: {
        A: { MAX: 5000, TARGET: 2500, LOSS_RATE: 500 },
        B: { MAX: 5000, TARGET: 2500, LOSS_RATE: 500 },
        C: { MAX: 2000 },
        D: { MAX: 2000 },
        E: { MAX: 4000 }, // Supply
        F: { MAX: 4000 }, // Supply
    },

    // Pump Flow Rates (Units per Minute)
    PUMPS: {
        MAIN: 800,  // Pumps 1, 3
        SEC: 600,   // Pumps 2, 4, 5, 6
        XFER: 400,  // Pumps 7, 8 (Transfer A<->B)
    },

    // Difficulty Scaling
    DIFFICULTY: {
        MIN_LOSS_MULTIPLIER: 0.25, // Difficulty 0
        MAX_LOSS_MULTIPLIER: 2.5,  // Difficulty 10 (Increased from 2.0 per tuning?)
        // Keeping standard for now.
    },

    // Target Zones provided deviation from 2500
    RANGES: {
        OPTIMAL: { DEVIATION: 100, SCORE: 1 },    // 2400-2600
        NEUTRAL: { DEVIATION: 100, SCORE: 0 },    // Defined same as optimal? Logic check needed. Usually distinct.
        // In original code: NEUTRAL min 2400, max 2600. Same.
        WARNING: { DEVIATION: 250, SCORE: -1 },   // 2250-2750
        CRITICAL: { DEVIATION: 1500, SCORE: -2 }  // 1000-4000 (wide range)
    }
};

// ==========================================
// TRACKING TASK CONFIGURATION
// ==========================================
export const TRACK_CONFIG = {
    UPDATE_RATE_MS: 16, // ~60 FPS
    DEFAULT_DIFFICULTY: 1, // Easy default
};

// ==========================================
// MONITORING TASK CONFIGURATION
// ==========================================
export const MONITOR_CONFIG = {
    UPDATE_INTERVAL_MS: 250,
    TIMEOUT_MS: 10000, // Time before a missed event counts as error
};
