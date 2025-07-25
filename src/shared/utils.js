/**
 * Enhanced utility functions with better debugging
 */
export const logger = {
    info: (message, data) => {
        console.log(
            `🔍 [AB Inspector] ${message}`,
            data !== undefined ? data : ''
        );
    },
    warn: (message, data) => {
        console.warn(
            `⚠️ [AB Inspector] ${message}`,
            data !== undefined ? data : ''
        );
    },
    error: (message, error) => {
        console.error(
            `❌ [AB Inspector] ${message}`,
            error !== undefined ? error : ''
        );
    },
};

export const createMessage = (type, data = {}) => ({
    type,
    data,
    timestamp: Date.now(),
});

export const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const sanitizeData = (data) => {
    try {
        return JSON.parse(JSON.stringify(data));
    } catch (error) {
        logger.error('Error sanitizing data:', error);
        return {};
    }
};
