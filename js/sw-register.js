if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Create the notification DOM element
        const notification = document.createElement('div');
        notification.id = 'update-notification';
        notification.style.cssText = `
            display: none;
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-left: 4px solid #3b82f6;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            z-index: 10000;
            max-width: 320px;
            font-family: 'Inter', sans-serif;
            animation: slideIn 0.3s ease-out;
        `;
        notification.innerHTML = `
            <div style="display: flex; gap: 12px; align-items: start;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Update Available</h4>
                    <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">A new version of the app is available. Refresh to update.</p>
                </div>
                <button id="refresh-btn" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: background 0.2s;
                ">Refresh</button>
            </div>
        `;
        document.body.appendChild(notification);

        // Add slide-in animation style
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);

                // Check for updates mechanism
                let refreshing;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (refreshing) return;
                    window.location.reload();
                    refreshing = true;
                });

                const showUpdateNotification = (worker) => {
                    notification.style.display = 'block';
                    document.getElementById('refresh-btn').addEventListener('click', () => {
                        worker.postMessage({ type: 'SKIP_WAITING' });
                    });
                };

                // Check if there's already a waiting worker
                if (registration.waiting) {
                    showUpdateNotification(registration.waiting);
                    return;
                }

                // Monitor installing worker
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateNotification(newWorker);
                        }
                    });
                });
            }, (err) => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
