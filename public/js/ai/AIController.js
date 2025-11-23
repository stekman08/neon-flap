export class AIController {
    static performAI(bird, pipes, currentPipeGap, canvas) {
        // Find the next pipe
        let nextPipe = null;
        for (let i = 0; i < pipes.length; i++) {
            // If pipe is ahead of bird (considering bird width to be safe)
            if (pipes[i].x + pipes[i].width > bird.x) {
                nextPipe = pipes[i];
                break;
            }
        }

        let targetY = canvas.height / 2;

        if (nextPipe) {
            // Target the "Safe Zone" - slightly below center to allow headroom for jump arc
            const gapCenter = nextPipe.bottomY - (currentPipeGap / 2);
            const safeZoneOffset = currentPipeGap * 0.15; // Target 15% lower than center
            targetY = gapCenter + safeZoneOffset;
        } else {
            // No pipe, stay in middle
            targetY = canvas.height / 2;
        }

        const isBelowTarget = (bird.y > targetY);
        const isFalling = (bird.velocity >= 0);
        const isCriticallyLow = (bird.y > canvas.height - 100);

        if (isBelowTarget && (isFalling || isCriticallyLow)) {
            bird.jump();
        }
    }
}
