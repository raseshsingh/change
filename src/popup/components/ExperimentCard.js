import React from 'react';

/**
 * Individual Experiment Card Component
 *
 * Displays experiment details and variation selection controls
 */
function ExperimentCard({ experiment, onForceVariation, isForcing }) {
    const handleVariationChange = (event) => {
        const newVariationId = event.target.value;
        if (newVariationId !== experiment.currentVariation) {
            onForceVariation(
                experiment.id,
                newVariationId,
                experiment.platform
            );
        }
    };

    const formatVariationOptions = () => {
        if (!experiment.variations || experiment.variations.length === 0) {
            return [{ id: 'original', name: 'Original' }];
        }

        // Handle different variation formats from different platforms
        return experiment.variations.map((variation) => {
            if (typeof variation === 'object') {
                return {
                    id: variation.id || variation.variationId,
                    name:
                        variation.name ||
                        `Variation ${variation.id || variation.variationId}`,
                };
            } else {
                return {
                    id: variation,
                    name: `Variation ${variation}`,
                };
            }
        });
    };

    const variations = formatVariationOptions();
    const currentVariation = experiment.currentVariation || 'original';

    return (
        <div className="experiment-card">
            <div className="experiment-card__header">
                <h3 className="experiment-card__name">{experiment.name}</h3>
                <span className="experiment-card__platform">
                    {experiment.platform.toUpperCase()}
                </span>
            </div>

            <div className="experiment-card__id">ID: {experiment.id}</div>

            <div className="experiment-card__variation-control">
                <label
                    htmlFor={`variation-${experiment.id}`}
                    style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                    }}
                >
                    Current Variation:
                </label>

                <select
                    id={`variation-${experiment.id}`}
                    className="variation-selector"
                    value={currentVariation}
                    onChange={handleVariationChange}
                    disabled={isForcing}
                >
                    {variations.map((variation) => (
                        <option key={variation.id} value={variation.id}>
                            {variation.name}{' '}
                            {variation.id === currentVariation
                                ? '(Current)'
                                : ''}
                        </option>
                    ))}
                </select>

                {isForcing && (
                    <div
                        style={{
                            marginTop: '8px',
                            fontSize: '12px',
                            color: '#007bff',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <div
                            className="loading-spinner"
                            style={{
                                width: '12px',
                                height: '12px',
                                marginRight: '6px',
                            }}
                        ></div>
                        Applying variation...
                    </div>
                )}
            </div>

            {experiment.status && (
                <div
                    style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color:
                            experiment.status === 'active'
                                ? '#28a745'
                                : '#ffc107',
                    }}
                >
                    Status: {experiment.status}
                </div>
            )}
        </div>
    );
}

export default ExperimentCard;
