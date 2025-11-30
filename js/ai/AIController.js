import { aiDebugLog } from './AIDebugLog.js';
import { NeuralNetwork } from './NeuralNetwork.js';

export class AIController {
    // Cached trained brain (loaded once)
    static trainedBrain = null;
    static brainLoadAttempted = false;

    /**
     * Load trained brain from localStorage (once per session)
     */
    static loadTrainedBrain() {
        if (AIController.brainLoadAttempted) return AIController.trainedBrain;
        AIController.brainLoadAttempted = true;

        try {
            const data = localStorage.getItem('neonFlapTrainedBrain');
            if (data) {
                const parsed = JSON.parse(data);
                AIController.trainedBrain = NeuralNetwork.fromJSON(parsed.brain);
                console.log(`[AI] Loaded trained brain (score: ${parsed.score}, gen: ${parsed.generation})`);
            }
        } catch (e) {
            console.warn('[AI] Failed to load trained brain:', e);
        }
        return AIController.trainedBrain;
    }

    /**
     * Reset brain cache (call when new brain is trained)
     */
    static resetBrainCache() {
        AIController.trainedBrain = null;
        AIController.brainLoadAttempted = false;
    }

    static performAI(bird, pipes, currentPipeGap, canvas) {
        // Try to use trained neural network brain
        const brain = AIController.loadTrainedBrain();
        if (brain) {
            AIController.performNeuralAI(bird, pipes, canvas, brain);
            return;
        }

        // Fallback to hardcoded logic
        AIController.performHardcodedAI(bird, pipes, currentPipeGap, canvas);
    }

    /**
     * AI using trained neural network
     */
    static performNeuralAI(bird, pipes, canvas, brain) {
        // Find the closest pipe ahead of the bird
        let closest = null;
        let closestDist = Infinity;

        for (const pipe of pipes) {
            const dist = (pipe.x + pipe.width) - bird.x;
            if (dist > 0 && dist < closestDist) {
                closest = pipe;
                closestDist = dist;
            }
        }

        // Prepare inputs (normalized to 0-1)
        let inputs;

        if (closest) {
            inputs = [
                bird.y / canvas.height,
                (bird.velocity + 15) / 30,
                closestDist / canvas.width,
                closest.topHeight / canvas.height,
                closest.bottomY / canvas.height
            ];
        } else {
            // No pipe visible - use default center target
            const centerY = canvas.height / 2;
            inputs = [
                bird.y / canvas.height,
                (bird.velocity + 15) / 30,
                1.0,
                (centerY - 50) / canvas.height,
                (centerY + 50) / canvas.height
            ];
        }

        // Get prediction from neural network
        const output = brain.predict(inputs);

        if (output[0] > 0.5) {
            aiDebugLog.logAIDecision(bird, closest, null, 'jump', `neural: output=${output[0].toFixed(2)}`);
            bird.jump();
        } else {
            aiDebugLog.logAIDecision(bird, closest, null, 'wait', `neural: output=${output[0].toFixed(2)}`);
        }
    }

    /**
     * Original hardcoded AI logic (fallback)
     */
    static performHardcodedAI(bird, pipes, currentPipeGap, canvas) {
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
            const safeZone = canvas.height * 0.6;
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
