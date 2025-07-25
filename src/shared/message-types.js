/**
 * Centralized message types for extension communication
 * This ensures type safety and prevents message type conflicts
 */
export const MESSAGE_TYPES = {
    // Content Script -> Background
    EXPERIMENTS_DETECTED: 'experiments_detected',
    DETECTION_ERROR: 'detection_error',

    // Popup -> Background
    GET_EXPERIMENTS: 'get_experiments',
    FORCE_VARIATION: 'force_variation',

    // Background -> Content Script
    REQUEST_DETECTION: 'request_detection',
    EXECUTE_VARIATION_CHANGE: 'execute_variation_change',

    // Response types
    EXPERIMENTS_DATA: 'experiments_data',
    VARIATION_CHANGED: 'variation_changed',
    ERROR: 'error',
};
