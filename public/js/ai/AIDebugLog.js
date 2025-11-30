/**
 * AI Debug Logger - tracks AI decisions and game state for debugging flaky tests
 */
export class AIDebugLog {
    constructor(maxEntries = 500) {
        this.maxEntries = maxEntries;
        this.entries = [];
        this.enabled = false;
        this.startTime = 0;
        this.summary = {
            totalFrames: 0,
            jumps: 0,
            pipesSpawned: 0,
            pipesPassed: 0,
            gameOverReason: null
        };
    }

    enable() {
        this.enabled = true;
        this.startTime = performance.now();
        this.entries = [];
        this.summary = {
            totalFrames: 0,
            jumps: 0,
            pipesSpawned: 0,
            pipesPassed: 0,
            gameOverReason: null
        };
    }

    disable() {
        this.enabled = false;
    }

    _timestamp() {
        return Math.round(performance.now() - this.startTime);
    }

    _addEntry(entry) {
        if (!this.enabled) return;

        entry.t = this._timestamp();
        this.entries.push(entry);

        // Keep log bounded
        if (this.entries.length > this.maxEntries) {
            this.entries.shift();
        }
    }

    logFrame(bird, pipes, fps) {
        if (!this.enabled) return;

        this.summary.totalFrames++;

        // Log every 10th frame to reduce noise
        if (this.summary.totalFrames % 10 !== 0) return;

        this._addEntry({
            type: 'frame',
            bird: { x: Math.round(bird.x), y: Math.round(bird.y), vy: Math.round(bird.velocity * 10) / 10 },
            pipes: pipes.slice(0, 2).map(p => ({ x: Math.round(p.x), gap: Math.round(p.bottomY - p.topHeight) })),
            fps: Math.round(fps)
        });
    }

    logAIDecision(bird, nextPipe, futurePipe, decision, reason) {
        if (!this.enabled) return;

        this._addEntry({
            type: 'ai',
            decision,
            reason,
            bird: { y: Math.round(bird.y), vy: Math.round(bird.velocity * 10) / 10 },
            nextPipe: nextPipe ? { x: Math.round(nextPipe.x), gapCenter: Math.round(nextPipe.bottomY - 75) } : null
        });

        if (decision === 'jump') {
            this.summary.jumps++;
        }
    }

    logJump(bird, source) {
        if (!this.enabled) return;

        this._addEntry({
            type: 'jump',
            source, // 'ai' or 'player'
            bird: { y: Math.round(bird.y), vy: Math.round(bird.velocity * 10) / 10 }
        });
    }

    logPipeSpawn(pipe) {
        if (!this.enabled) return;

        this.summary.pipesSpawned++;
        this._addEntry({
            type: 'pipe_spawn',
            pipe: { x: Math.round(pipe.x), topHeight: Math.round(pipe.topHeight), bottomY: Math.round(pipe.bottomY) }
        });
    }

    logPipePassed(pipe, score) {
        if (!this.enabled) return;

        this.summary.pipesPassed++;
        this._addEntry({
            type: 'pipe_passed',
            score
        });
    }

    logCollision(type, bird, pipe = null) {
        if (!this.enabled) return;

        this.summary.gameOverReason = type;
        this._addEntry({
            type: 'collision',
            collisionType: type, // 'floor', 'ceiling', 'pipe_top', 'pipe_bottom'
            bird: { x: Math.round(bird.x), y: Math.round(bird.y), vy: Math.round(bird.velocity * 10) / 10 },
            pipe: pipe ? { x: Math.round(pipe.x), topHeight: Math.round(pipe.topHeight), bottomY: Math.round(pipe.bottomY) } : null
        });
    }

    logGameStart(bird) {
        if (!this.enabled) return;

        this._addEntry({
            type: 'game_start',
            bird: { x: Math.round(bird.x), y: Math.round(bird.y) }
        });
    }

    logGameOver(score, reason) {
        if (!this.enabled) return;

        this.summary.gameOverReason = reason;
        this._addEntry({
            type: 'game_over',
            score,
            reason
        });
    }

    getLog() {
        return {
            summary: { ...this.summary },
            entries: [...this.entries]
        };
    }

    getFormattedLog() {
        const log = this.getLog();
        let output = '=== AI DEBUG LOG ===\n';
        output += `Summary: ${log.summary.totalFrames} frames, ${log.summary.jumps} jumps, `;
        output += `${log.summary.pipesSpawned} pipes spawned, ${log.summary.pipesPassed} passed\n`;
        output += `Game Over Reason: ${log.summary.gameOverReason || 'N/A'}\n`;
        output += '--- Events ---\n';

        for (const entry of log.entries) {
            output += `[${entry.t}ms] ${entry.type}`;

            switch (entry.type) {
                case 'game_start':
                    output += `: bird at (${entry.bird.x}, ${entry.bird.y})`;
                    break;
                case 'ai':
                    output += `: ${entry.decision} - ${entry.reason}`;
                    if (entry.bird) output += ` | bird y=${entry.bird.y} vy=${entry.bird.vy}`;
                    break;
                case 'jump':
                    output += `: ${entry.source} | bird y=${entry.bird.y}`;
                    break;
                case 'pipe_spawn':
                    output += `: x=${entry.pipe.x} gap=${entry.pipe.bottomY - entry.pipe.topHeight}`;
                    break;
                case 'pipe_passed':
                    output += `: score=${entry.score}`;
                    break;
                case 'collision':
                    output += `: ${entry.collisionType} | bird (${entry.bird.x}, ${entry.bird.y}) vy=${entry.bird.vy}`;
                    if (entry.pipe) output += ` | pipe x=${entry.pipe.x}`;
                    break;
                case 'game_over':
                    output += `: score=${entry.score} reason=${entry.reason}`;
                    break;
                case 'frame':
                    output += `: bird y=${entry.bird.y} vy=${entry.bird.vy} fps=${entry.fps}`;
                    break;
            }
            output += '\n';
        }

        return output;
    }
}

// Singleton instance for global access
export const aiDebugLog = new AIDebugLog();
