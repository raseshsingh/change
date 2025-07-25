import { MESSAGE_TYPES } from '../shared/message-types.js';
import { logger, createMessage } from '../shared/utils.js';
import { getPlatform, FORCE_METHODS } from '../shared/platform-registry.js';

/**
 * Background Service Worker - Central Communication Hub
 *
 * Responsibilities:
 * 1. Manage communication between popup and content scripts
 * 2. Cache experiment data for performance
 * 3. Orchestrate variation forcing across platforms
 * 4. Handle errors gracefully
 */

class ABInspectorBackground {
    constructor() {
        this.experimentsCache = new Map();
        this.setupMessageListeners();
        logger.info('Background service worker initialized');
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener(
            (message, sender, sendResponse) => {
                this.handleMessage(message, sender, sendResponse);
                return true; // Indicates we will send a response asynchronously
            }
        );
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.type) {
                case MESSAGE_TYPES.EXPERIMENTS_DETECTED:
                    await this.handleExperimentsDetected(message, sender);
                    sendResponse(
                        createMessage(MESSAGE_TYPES.EXPERIMENTS_DATA, {
                            success: true,
                        })
                    );
                    break;

                case MESSAGE_TYPES.GET_EXPERIMENTS:
                    const experiments = await this.handleGetExperiments(
                        sender.tab?.id
                    );
                    sendResponse(
                        createMessage(MESSAGE_TYPES.EXPERIMENTS_DATA, {
                            experiments,
                        })
                    );
                    break;

                case MESSAGE_TYPES.FORCE_VARIATION:
                    const result = await this.handleForceVariation(
                        message.data,
                        sender.tab?.id
                    );
                    sendResponse(
                        createMessage(MESSAGE_TYPES.VARIATION_CHANGED, result)
                    );
                    break;

                default:
                    logger.warn('Unknown message type:', message.type);
                    sendResponse(
                        createMessage(MESSAGE_TYPES.ERROR, {
                            error: 'Unknown message type',
                        })
                    );
            }
        } catch (error) {
            logger.error('Error handling message:', error);
            sendResponse(
                createMessage(MESSAGE_TYPES.ERROR, {
                    error: error.message,
                })
            );
        }
    }

    async handleExperimentsDetected(message, sender) {
        const tabId = sender.tab?.id;
        if (!tabId) return;

        logger.info(
            `Experiments detected on tab ${tabId}:`,
            message.data.experiments
        );

        // Cache the experiments data
        this.experimentsCache.set(tabId, {
            experiments: message.data.experiments,
            timestamp: Date.now(),
            url: sender.tab.url,
        });
    }

    async handleGetExperiments(tabId) {
        if (!tabId) return [];

        // Check cache first
        const cached = this.experimentsCache.get(tabId);
        if (cached && Date.now() - cached.timestamp < 5000) {
            // 5 second cache
            return cached.experiments;
        }

        // Request fresh detection
        try {
            await chrome.tabs.sendMessage(
                tabId,
                createMessage(MESSAGE_TYPES.REQUEST_DETECTION)
            );

            // Wait a bit for the response
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const fresh = this.experimentsCache.get(tabId);
            return fresh ? fresh.experiments : [];
        } catch (error) {
            logger.error('Error requesting experiments:', error);
            return [];
        }
    }

    async handleForceVariation(data, tabId) {
        const { experimentId, variationId, platform } = data;

        if (!tabId) {
            throw new Error('No active tab');
        }

        const platformConfig = getPlatform(platform);
        if (!platformConfig) {
            throw new Error(`Unsupported platform: ${platform}`);
        }

        logger.info(
            `Forcing variation ${variationId} for experiment ${experimentId} on platform ${platform}`
        );

        switch (platformConfig.forcer.method) {
            case FORCE_METHODS.COOKIE:
                return await this.forceViaCookie(
                    experimentId,
                    variationId,
                    platformConfig,
                    tabId
                );

            case FORCE_METHODS.API:
                return await this.forceViaAPI(
                    experimentId,
                    variationId,
                    platformConfig,
                    tabId
                );

            case FORCE_METHODS.URL:
                return await this.forceViaURL(
                    experimentId,
                    variationId,
                    platformConfig,
                    tabId
                );

            default:
                throw new Error(
                    `Unsupported force method: ${platformConfig.forcer.method}`
                );
        }
    }

    async forceViaCookie(experimentId, variationId, platformConfig, tabId) {
        const { cookieName, generateCookieValue } =
            platformConfig.forcer.implementation;

        try {
            const tab = await chrome.tabs.get(tabId);
            const url = new URL(tab.url);

            const cookieValue = generateCookieValue(experimentId, variationId);

            await chrome.cookies.set({
                url: tab.url,
                name: cookieName,
                value: cookieValue,
                domain: url.hostname,
            });

            // Reload the page to apply the changes
            await chrome.tabs.reload(tabId);

            return { success: true, method: 'cookie' };
        } catch (error) {
            logger.error('Error setting cookie:', error);
            throw new Error(`Failed to set cookie: ${error.message}`);
        }
    }

    async forceViaAPI(experimentId, variationId, platformConfig, tabId) {
        try {
            const script = platformConfig.forcer.implementation.script(
                experimentId,
                variationId
            );

            const results = await chrome.scripting.executeScript({
                target: { tabId },
                world: 'MAIN',
                func: new Function(`return (${script})`),
            });

            const result = results[0]?.result;
            if (!result?.success) {
                throw new Error(result?.error || 'API call failed');
            }

            return { success: true, method: 'api' };
        } catch (error) {
            logger.error('Error executing API script:', error);
            throw new Error(`Failed to execute API call: ${error.message}`);
        }
    }

    async forceViaURL(experimentId, variationId, platformConfig, tabId) {
        // Implementation for URL-based forcing
        // This would modify URL parameters and navigate
        throw new Error('URL forcing not yet implemented');
    }
}

// Initialize the background service
new ABInspectorBackground();
