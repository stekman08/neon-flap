/**
 * PWA functionality manager - handles service worker, install prompt, and standalone mode
 */
export class PWAManager {
    constructor(installBtn) {
        this.installBtn = installBtn;
        this.deferredPrompt = null;
    }

    /**
     * Initialize PWA functionality
     */
    init() {
        this.registerServiceWorker();
        this.setupInstallPrompt();
        this.handleStandaloneMode();
    }

    /**
     * Register the service worker
     */
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then((registration) => {
                        console.log('[PWA] Service Worker registered:', registration.scope);
                    })
                    .catch((error) => {
                        console.log('[PWA] Service Worker registration failed:', error);
                    });
            });
        }
    }

    /**
     * Setup PWA install prompt handling
     */
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;

            if (this.installBtn) {
                this.installBtn.style.display = 'block';
                console.log('[PWA] Install prompt available');
            }
        });

        if (this.installBtn) {
            this.installBtn.addEventListener('click', async () => {
                if (!this.deferredPrompt) {
                    console.log('[PWA] No install prompt available');
                    return;
                }

                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                console.log(`[PWA] User response: ${outcome}`);

                this.deferredPrompt = null;
                this.installBtn.style.display = 'none';
            });
        }

        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App successfully installed');
            if (this.installBtn) {
                this.installBtn.style.display = 'none';
            }
            this.deferredPrompt = null;
        });
    }

    /**
     * Handle standalone mode (already installed)
     */
    handleStandaloneMode() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                            window.navigator.standalone === true;

        if (isStandalone) {
            console.log('[PWA] Running in standalone mode');
            if (this.installBtn) {
                this.installBtn.style.display = 'none';
            }
        }
    }
}
