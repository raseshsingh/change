import React, { useState, useEffect } from 'react';
import { MESSAGE_TYPES } from '../shared/message-types.js';
import { createMessage, logger } from '../shared/utils.js';
import ExperimentList from './components/ExperimentList.js';
import LoadingSpinner from './components/LoadingSpinner.js';

/**
 * Main Popup Application Component
 *
 * Manages the overall state and coordinates communication with the background script
 */
function App() {
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [forcing, setForcing] = useState({}); // Track which experiments are being forced

    useEffect(() => {
        loadExperiments();
    }, []);

    const loadExperiments = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await sendMessage(MESSAGE_TYPES.GET_EXPERIMENTS);

            if (response.type === MESSAGE_TYPES.EXPERIMENTS_DATA) {
                setExperiments(response.data.experiments || []);
            } else if (response.type === MESSAGE_TYPES.ERROR) {
                setError(response.data.error);
            }
        } catch (err) {
            logger.error('Error loading experiments:', err);
            setError(
                'Failed to load experiments. Please refresh the page and try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleForceVariation = async (
        experimentId,
        variationId,
        platform
    ) => {
        // Set forcing state for this experiment
        setForcing((prev) => ({ ...prev, [experimentId]: true }));

        try {
            const response = await sendMessage(MESSAGE_TYPES.FORCE_VARIATION, {
                experimentId,
                variationId,
                platform,
            });

            if (response.type === MESSAGE_TYPES.VARIATION_CHANGED) {
                if (response.data.success) {
                    // Update the experiment in our local state
                    setExperiments((prev) =>
                        prev.map((exp) =>
                            exp.id === experimentId
                                ? { ...exp, currentVariation: variationId }
                                : exp
                        )
                    );

                    // Show success feedback (you could add a toast notification here)
                    logger.info(
                        `Successfully forced variation ${variationId} for experiment ${experimentId}`
                    );
                } else {
                    setError(
                        `Failed to force variation: ${response.data.error}`
                    );
                }
            } else if (response.type === MESSAGE_TYPES.ERROR) {
                setError(response.data.error);
            }
        } catch (err) {
            logger.error('Error forcing variation:', err);
            setError('Failed to force variation. Please try again.');
        } finally {
            setForcing((prev) => ({ ...prev, [experimentId]: false }));
        }
    };

    const sendMessage = (type, data = {}) => {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                createMessage(type, data),
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    };

    const handleRefresh = () => {
        loadExperiments();
    };

    return (
        <div className="ab-inspector">
            <header className="ab-inspector__header">
                <h1 className="ab-inspector__title">A/B Test Inspector</h1>
                <p className="ab-inspector__subtitle">
                    Universal experiment detection and control
                </p>
            </header>

            {error && (
                <div className="error-state">
                    <strong>Error:</strong> {error}
                    <button
                        onClick={() => setError(null)}
                        style={{
                            float: 'right',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            {loading ? (
                <LoadingSpinner message="Detecting experiments..." />
            ) : (
                <ExperimentList
                    experiments={experiments}
                    onForceVariation={handleForceVariation}
                    onRefresh={handleRefresh}
                    forcingStates={forcing}
                />
            )}
        </div>
    );
}

export default App;
