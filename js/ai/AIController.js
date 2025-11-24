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
            if (bird.y > canvas.height / 2 && bird.velocity >= 0) {
                bird.jump();
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
            bird.jump();
        }
    }
}
