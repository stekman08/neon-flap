import { aiDebugLog } from './AIDebugLog.js';

export class AIController {
    static performAI(bird, pipes, currentPipeGap, canvas) {
        let nextPipe = null;
        let futurePipe = null;

        for (let i = 0; i < pipes.length; i++) {
            if (pipes[i].x + pipes[i].width > bird.x) {
                if (!nextPipe) {
                    nextPipe = pipes[i];
                } else {
                    futurePipe = pipes[i];
                    break;
                }
            }
        }

        if (!nextPipe) {
            // No pipes yet - keep bird near center, but be more aggressive
            // to avoid hitting the floor before first pipe spawns
            const safeZone = canvas.height * 0.6; // Jump if below 60% of screen
            if (bird.y >= safeZone || (bird.y >= canvas.height / 2 && bird.velocity >= 0)) {
                aiDebugLog.logAIDecision(bird, null, null, 'jump', `no pipes, y=${Math.round(bird.y)} >= safeZone=${Math.round(safeZone)}`);
                bird.jump();
            } else {
                aiDebugLog.logAIDecision(bird, null, null, 'wait', `no pipes, y=${Math.round(bird.y)} < safeZone=${Math.round(safeZone)}`);
            }
            return;
        }

        const hasClearedPipe = bird.x > nextPipe.x + nextPipe.width;

        let targetY;

        if (hasClearedPipe && futurePipe) {
            targetY = futurePipe.bottomY - (currentPipeGap / 2);
        } else {
            targetY = nextPipe.bottomY - (currentPipeGap / 2);
        }

        if (bird.y > targetY && bird.velocity >= 0) {
            aiDebugLog.logAIDecision(bird, nextPipe, futurePipe, 'jump', `bird.y=${Math.round(bird.y)} > target=${Math.round(targetY)}`);
            bird.jump();
        }
    }
}
