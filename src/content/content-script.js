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
        this.scheduleDetection();

        logger.info('Content script initialized on:', window.location.href);
    }

    scheduleDetection() {
        // Multiple detection attempts with delays
        // setTimeout(() => this.detectExperiments(), 500);
        setTimeout(() => this.detectExperiments(), 2000);
        // setTimeout(() => this.detectExperiments(), 4000);
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
        return new Promise((resolve, reject) => {
            const uniqueId = `ab_inspector_${scriptId}_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 5)}`;

            logger.info(`Executing script: ${scriptId}`);

            try {
                // Create a more reliable script injection
                const scriptElement = document.createElement('script');

                // Wrap the script in a safer execution context
                scriptElement.textContent = `
          (function() {
            const scriptId = '${uniqueId}';
            const resultEvent = 'ab_inspector_result_' + scriptId;
            const errorEvent = 'ab_inspector_error_' + scriptId;
            
            try {
              console.log('[AB Inspector] Executing ${scriptId}...');
              
              // Execute the actual script
              const result = (function() {
                ${script}
              })();
              
              console.log('[AB Inspector] ${scriptId} result:', result);
              
              // Dispatch success event
              document.dispatchEvent(new CustomEvent(resultEvent, {
                detail: { result: result, success: true }
              }));
              
            } catch (error) {
              console.error('[AB Inspector] ${scriptId} error:', error);
              
              // Dispatch error event
              document.dispatchEvent(new CustomEvent(errorEvent, {
                detail: { error: error.message, success: false }
              }));
            }
          })();
        `;
                scriptElement.classList.add('ab-inspector-script');

                const resultEventName = `ab_inspector_result_${uniqueId}`;
                const errorEventName = `ab_inspector_error_${uniqueId}`;

                let resolved = false;

                const handleResult = (event) => {
                    if (resolved) return;
                    resolved = true;

                    cleanup();
                    logger.info(`Script ${scriptId} completed successfully`);
                    resolve(event.detail.result);
                };

                const handleError = (event) => {
                    if (resolved) return;
                    resolved = true;

                    cleanup();
                    logger.error(
                        `Script ${scriptId} failed:`,
                        event.detail.error
                    );
                    reject(new Error(event.detail.error));
                };

                const handleTimeout = () => {
                    if (resolved) return;
                    resolved = true;

                    // cleanup();
                    logger.error(`Script ${scriptId} timed out`);
                    reject(
                        new Error(`Script execution timeout for ${scriptId}`)
                    );
                };

                const cleanup = () => {
                    document.removeEventListener(resultEventName, handleResult);
                    document.removeEventListener(errorEventName, handleError);
                    if (scriptElement.parentNode) {
                        scriptElement.parentNode.removeChild(scriptElement);
                    }
                };

                // Set up event listeners
                document.addEventListener(resultEventName, handleResult);
                document.addEventListener(errorEventName, handleError);

                // Set timeout (reduced to 3 seconds)
                setTimeout(handleTimeout, 3000);

                // Inject the script
                logger.info(`Injecting script ${scriptId}...`);
                console.log(document.head,document.documentElement);
                (document.head || document.documentElement).appendChild(
                    scriptElement
                );
            } catch (error) {
                logger.error(`Failed to inject script ${scriptId}:`, error);
                reject(error);
            }
        });
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
