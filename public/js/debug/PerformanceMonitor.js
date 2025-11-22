/**
 * PerformanceMonitor - Tracks FPS and performance metrics in debug mode
 */
export class PerformanceMonitor {
    constructor() {
        this.enabled = false;
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.lastFpsUpdate = performance.now();

        // Performance metrics
        this.updateTime = 0;
        this.drawTime = 0;
        this.frameTime = 0;

        // Pool stats
        this.poolStats = null;

        // Frame time history for smoothing
        this.frameTimes = [];
        this.maxFrameHistory = 60; // 1 second at 60fps

        // UI element
        this.container = null;

        // Check if debug mode is enabled
        this.checkDebugMode();
    }

    checkDebugMode() {
        // Enable if localhost or ?debug=true
        const isLocalhost = window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';
        const hasDebugParam = new URLSearchParams(window.location.search).has('debug');

        this.enabled = isLocalhost || hasDebugParam;

        if (this.enabled) {
            this.createUI();
        }
    }

    createUI() {
        this.container = document.createElement('div');
        this.container.id = 'performance-monitor';
        this.container.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 5px;
            z-index: 9999;
            pointer-events: none;
            min-width: 180px;
        `;
        document.body.appendChild(this.container);
    }

    startFrame() {
        if (!this.enabled) return;
        this.frameStartTime = performance.now();
    }

    endFrame() {
        if (!this.enabled) return;

        const now = performance.now();
        const frameTime = now - this.frameStartTime;

        // Track frame time
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > this.maxFrameHistory) {
            this.frameTimes.shift();
        }

        this.frameCount++;

        // Update FPS every second
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;

            // Calculate average frame time
            const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
            this.frameTime = avgFrameTime;

            this.updateUI();
        }
    }

    markUpdateStart() {
        if (!this.enabled) return;
        this.updateStartTime = performance.now();
    }

    markUpdateEnd() {
        if (!this.enabled) return;
        this.updateTime = performance.now() - this.updateStartTime;
    }

    markDrawStart() {
        if (!this.enabled) return;
        this.drawStartTime = performance.now();
    }

    markDrawEnd() {
        if (!this.enabled) return;
        this.drawTime = performance.now() - this.drawStartTime;
    }

    setPoolStats(stats) {
        this.poolStats = stats;
    }

    updateUI() {
        if (!this.container) return;

        // Color code FPS
        let fpsColor = '#0f0'; // green
        if (this.fps < 50) fpsColor = '#ff0'; // yellow
        if (this.fps < 30) fpsColor = '#f00'; // red

        let poolInfo = '';
        if (this.poolStats) {
            poolInfo = `
                <div style="margin-top: 5px; color: #0ff;">
                    Particles: ${this.poolStats.active}/${this.poolStats.total}
                </div>
                <div style="color: #888; font-size: 10px;">
                    Pool: ${this.poolStats.pooled} cached
                </div>
            `;
        }

        this.container.innerHTML = `
            <div style="color: ${fpsColor}; font-weight: bold; font-size: 14px;">
                FPS: ${this.fps}
            </div>
            <div style="margin-top: 5px;">
                Frame: ${this.frameTime.toFixed(2)}ms
            </div>
            <div>
                Update: ${this.updateTime.toFixed(2)}ms
            </div>
            <div>
                Draw: ${this.drawTime.toFixed(2)}ms
            </div>
            ${poolInfo}
            <div style="margin-top: 5px; color: #888;">
                Target: 16.67ms (60fps)
            </div>
        `;
    }

    getMetrics() {
        return {
            fps: this.fps,
            frameTime: this.frameTime,
            updateTime: this.updateTime,
            drawTime: this.drawTime,
            isLowPerformance: this.fps < 50
        };
    }
}
