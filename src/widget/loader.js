/**
 * PlayFlow Widget Loader
 * 
 * Lightweight (<1KB) async loader that fetches the main widget
 * Supports versioning for safe rollouts
 */
(function (window, document) {
    'use strict';

    // Configuration
    const PF_CDN = window.PLAYFLOW_CDN_URL || 'https://cdn.playflow.io';
    const PF_API = window.PLAYFLOW_API_URL || 'https://api.playflow.io';
    const PF_VERSION = window.PLAYFLOW_VERSION || 'latest';

    // Prevent double initialization
    if (window.PlayFlow && window.PlayFlow._loaded) {
        return;
    }

    // Create placeholder
    window.PlayFlow = {
        _loaded: false,
        _queue: [],
        run: function (campaignId, options) {
            this._queue.push({ type: 'run', campaignId, options });
        },
        on: function (event, callback) {
            this._queue.push({ type: 'on', event, callback });
        },
        config: {
            cdnUrl: PF_CDN,
            apiUrl: PF_API,
            version: PF_VERSION,
        }
    };

    // Load main script
    function loadScript() {
        const script = document.createElement('script');
        script.src = PF_CDN + '/widget/v/' + PF_VERSION + '/playflow.min.js';
        script.async = true;
        script.crossOrigin = 'anonymous';

        // Add SRI hash in production for security
        // script.integrity = 'sha384-...';

        script.onload = function () {
            window.PlayFlow._loaded = true;
            // Process queued commands
            if (window.PlayFlow._processQueue) {
                window.PlayFlow._processQueue();
            }
        };

        script.onerror = function () {
            console.error('[PlayFlow] Failed to load widget script');
            // Retry once after 2 seconds
            setTimeout(loadScript, 2000);
        };

        document.head.appendChild(script);
    }

    // Load when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadScript);
    } else {
        loadScript();
    }

    // Auto-run campaigns from data attributes
    document.addEventListener('DOMContentLoaded', function () {
        const elements = document.querySelectorAll('[data-playflow-campaign]');
        elements.forEach(function (el) {
            const campaignId = el.getAttribute('data-playflow-campaign');
            if (campaignId) {
                window.PlayFlow.run(campaignId, { container: el });
            }
        });
    });

})(window, document);
