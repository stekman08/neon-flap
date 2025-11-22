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
            // Target the center of the gap
            targetY = nextPipe.bottomY - (currentPipeGap / 2);


        } else {
            // No pipe, stay in middle
            targetY = canvas.height / 2;
        }    // Jump if we are below the target, or if we are about to fall below it
        if (bird.y + bird.velocity > targetY) {
            bird.jump();
        }
    }
}
