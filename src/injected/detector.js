// This file will be injected as a web accessible resource
(function() {
    // Listen for detection requests
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'AB_INSPECTOR_EXECUTE') {
            const messageId = event.data.messageId;

            try {
                // Execute the script
                const result = new Function(event.data.script)();

                // Send back the result
                window.postMessage({
                    type: `${messageId}_response`,
                    success: true,
                    result: result
                }, '*');
            } catch (error) {
                window.postMessage({
                    type: `${messageId}_response`,
                    success: false,
                    error: error.message
                }, '*');
            }
        }
    });

    // Notify that detector is ready
    window._abInspectorReady = true;
})();