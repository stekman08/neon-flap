export class CitySkyline {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.buildings = [];
        this.nextX = 0;
        // Fill screen initially
        while (this.nextX < canvas.width + 100) {
            this.addBuilding();
        }
    }

    addBuilding() {
        const width = Math.random() * 60 + 40;
        const height = Math.random() * 150 + 50; // Height between 50 and 200
        this.buildings.push({ x: this.nextX, width, height });
        this.nextX += width;
    }

    update(currentPipeSpeed, gameHue) {
        // Move buildings slower than pipes for parallax (0.5x speed)
        const speed = currentPipeSpeed * 0.5;

        this.buildings.forEach(b => {
            b.x -= speed;
        });

        // Remove off-screen buildings
        if (this.buildings.length > 0 && this.buildings[0].x + this.buildings[0].width < 0) {
            this.buildings.shift();
        }

        // Add new buildings
        const lastBuilding = this.buildings[this.buildings.length - 1];
        if (lastBuilding.x + lastBuilding.width < this.canvas.width + 100) {
            this.nextX = lastBuilding.x + lastBuilding.width;
            this.addBuilding();
        }
    }

    draw(ctx, gameHue) {
        ctx.save();
        // Dark silhouette with a tint of the current game hue
        ctx.fillStyle = `hsl(${gameHue}, 60%, 15%)`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsl(${gameHue}, 60%, 10%)`;

        this.buildings.forEach(b => {
            // Draw building + 1px overlap to prevent gaps
            ctx.fillRect(b.x, this.canvas.height - b.height, b.width + 1, b.height);

            // Optional: Add some "windows"
            ctx.fillStyle = `hsl(${gameHue}, 100%, 50%, 0.1)`;
            if (Math.random() > 0.95) { // Flicker effect
                ctx.fillRect(b.x + 10, this.canvas.height - b.height + 10, 5, 5);
            }
            // Reset fill for next building body
            ctx.fillStyle = `hsl(${gameHue}, 60%, 15%)`;
        });
        ctx.restore();
    }
}
