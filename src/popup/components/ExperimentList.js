import React from 'react';
import ExperimentCard from './ExperimentCard.js';

/**
 * Experiment List Component
 *
 * Renders the list of detected experiments or an empty state
 */
function ExperimentList({
    experiments,
    onForceVariation,
    onRefresh,
    forcingStates,
}) {
    if (experiments.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state__icon">🔬</div>
                <div className="empty-state__title">No A/B Tests Detected</div>
                <div className="empty-state__description">
                    No active experiments were found on this page. This could
                    mean:
                    <br />• No A/B testing platforms are running
                    <br />• You're not part of any active experiments
                    <br />• The experiments haven't loaded yet
                </div>
                <button
                    onClick={onRefresh}
                    style={{
                        marginTop: '16px',
                        padding: '8px 16px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Refresh Detection
                </button>
            </div>
        );
    }

    return (
        <div className="experiment-list">
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                }}
            >
                <span style={{ fontSize: '14px', color: '#6c757d' }}>
                    {experiments.length} experiment
                    {experiments.length !== 1 ? 's' : ''} detected
                </span>
                <button
                    onClick={onRefresh}
                    style={{
                        padding: '4px 8px',
                        background: 'none',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                    }}
                >
                    Refresh
                </button>
            </div>

            {experiments.map((experiment) => (
                <ExperimentCard
                    key={`${experiment.platform}-${experiment.id}`}
                    experiment={experiment}
                    onForceVariation={onForceVariation}
                    isForcing={forcingStates[experiment.id] || false}
                />
            ))}
        </div>
    );
}

export default ExperimentList;
