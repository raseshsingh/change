import { MESSAGE_TYPES } from '../shared/message-types.js';
import { logger, createMessage } from '../shared/utils.js';
import { getAllPlatforms, getPlatform } from '../shared/platform-registry.js';

/**
 * Content Script - FIXED with reliable script injection
 */

class ABInspectorContentScript {
    constructor() {
        this.lastDetectionTime = 0;
        this.detectionCooldown = 2000;
        this.setupMessageListeners();
        this.injectDetectorScript(); // Add this
        this.scheduleDetection();

        logger.info('Content script initialized on:', window.location.href);
    }

    scheduleDetection() {
        // Wait for page to fully load before detection
        if (document.readyState === 'complete') {
            // Try multiple times with increasing delays
            setTimeout(() => this.detectExperiments(), 1000);
            // setTimeout(() => this.detectExperiments(), 3000);
            // setTimeout(() => this.detectExperiments(), 5000);
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => this.detectExperiments(), 1000);
                // setTimeout(() => this.detectExperiments(), 3000);
                // setTimeout(() => this.detectExperiments(), 5000);
            });
        }
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener(
            (message, sender, sendResponse) => {
                if (message.type === MESSAGE_TYPES.REQUEST_DETECTION) {
                    this.detectExperiments();
                    sendResponse({ received: true });
                }
                return true;
            }
        );
    }

    async detectExperiments() {
        const now = Date.now();
        if (now - this.lastDetectionTime < this.detectionCooldown) {
            return;
        }
        this.lastDetectionTime = now;

        logger.info('Starting experiment detection...');

        try {
            const allExperiments = [];
            const platforms = getAllPlatforms();

            for (const platformKey of platforms) {
                try {
                    logger.info(`Checking platform: ${platformKey}`);
                    const experiments = await this.detectPlatformExperiments(
                        platformKey
                    );
                    if (experiments && experiments.length > 0) {
                        logger.info(
                            `Found ${experiments.length} experiments on ${platformKey}:`,
                            experiments
                        );
                        allExperiments.push(...experiments);
                    } else {
                        logger.info(`No experiments found on ${platformKey}`);
                    }
                } catch (error) {
                    logger.error(
                        `Error detecting ${platformKey} experiments:`,
                        error
                    );
                }
            }

            logger.info(
                `Total detected: ${allExperiments.length} experiments across all platforms`
            );

            // Send results to background script
            await chrome.runtime.sendMessage(
                createMessage(MESSAGE_TYPES.EXPERIMENTS_DETECTED, {
                    experiments: allExperiments,
                    url: window.location.href,
                })
            );
        } catch (error) {
            logger.error('Error during experiment detection:', error);
            await chrome.runtime.sendMessage(
                createMessage(MESSAGE_TYPES.DETECTION_ERROR, {
                    error: error.message,
                })
            );
        }
    }

    async detectPlatformExperiments(platformKey) {
        const platform = getPlatform(platformKey);
        if (!platform) return [];

        logger.info(`Checking if ${platform.name} is active...`);

        // Check if the platform is active
        const isActive = await this.executeInMainWorld(
            platform.detector.script,
            `${platformKey}_detector`
        );

        if (!isActive) {
            logger.info(`${platform.name} not detected`);
            return [];
        }

        logger.info(`${platform.name} detected! Extracting experiments...`);

        // Extract experiment data
        const experiments = await this.executeInMainWorld(
            platform.extractor.script,
            `${platformKey}_extractor`
        );

        if (!Array.isArray(experiments)) {
            logger.warn(
                `${platform.name} extractor returned non-array:`,
                experiments
            );
            return [];
        }

        return experiments;
    }

    async executeInMainWorld(script, scriptId) {
        logger.info(`Executing script: ${scriptId}`);

        try {
            // Get the current tab ID from the background script
            const response = await chrome.runtime.sendMessage({
                type: 'GET_TAB_ID'
            });

            if (!response || !response.tabId) {
                // Fallback: try using chrome.scripting directly
                const results = await chrome.scripting.executeScript({
                    target: { tabId: chrome.runtime.id }, // This won't work, but worth trying
                    world: 'MAIN',
                    func: new Function(script)
                });

                logger.info(`Script ${scriptId} completed successfully`);
                return results[0]?.result;
            }

            // Send message to background script to execute
            const result = await chrome.runtime.sendMessage({
                type: 'EXECUTE_SCRIPT',
                data: {
                    script: script,
                    scriptId: scriptId
                }
            });

            if (result.error) {
                throw new Error(result.error);
            }

            return result.data;

        } catch (error) {
            logger.error(`Failed to execute script ${scriptId}:`, error);

            // Fallback: Try using postMessage approach
            return await this.executeViaPostMessage(script, scriptId);
        }
    }

// Add this new method for postMessage fallback
    async executeViaPostMessage(script, scriptId) {
        return new Promise((resolve, reject) => {
            const messageId = `ab_inspector_${scriptId}_${Date.now()}`;

            const handleMessage = (event) => {
                if (event.data && event.data.type === `${messageId}_response`) {
                    window.removeEventListener('message', handleMessage);

                    if (event.data.success) {
                        resolve(event.data.result);
                    } else {
                        reject(new Error(event.data.error));
                    }
                }
            };

            window.addEventListener('message', handleMessage);

            // Try to execute via postMessage
            window.postMessage({
                type: 'AB_INSPECTOR_EXECUTE',
                messageId: messageId,
                script: script
            }, '*');

            // Timeout
            setTimeout(() => {
                window.removeEventListener('message', handleMessage);
                reject(new Error(`Script execution timeout for ${scriptId}`));
            }, 5000);
        });
    }
    injectDetectorScript() {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('src/injected/detector.js');
        script.onload = () => {
            logger.info('Detector script injected');
            script.remove();
        };
        (document.head || document.documentElement).appendChild(script);
    }
}

// Initialize content script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ABInspectorContentScript();
    });
} else {
    new ABInspectorContentScript();
}
