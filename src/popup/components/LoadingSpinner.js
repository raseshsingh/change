import React from 'react';

/**
 * Loading Spinner Component
 *
 * Shows a loading state with optional message
 */
function LoadingSpinner({ message = 'Loading...' }) {
    return (
        <div
            style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#6c757d',
            }}
        >
            <div
                className="loading-spinner"
                style={{ marginBottom: '16px' }}
            ></div>
            <div style={{ fontSize: '14px' }}>{message}</div>
        </div>
    );
}

export default LoadingSpinner;
