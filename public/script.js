const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const GRAVITY = 0.25;
const JUMP_STRENGTH = -5;
const PIPE_SPAWN_RATE = 120; // Frames

// Difficulty Constants
const INITIAL_PIPE_SPEED = 3;
const INITIAL_PIPE_GAP = 170;
const SPEED_INCREMENT = 0.5;
const MAX_SPEED = 30;
const MIN_GAP = 120;

// Game Variables
let currentPipeSpeed = INITIAL_PIPE_SPEED;
let currentPipeGap = INITIAL_PIPE_GAP;

// Set canvas size
canvas.width = 400;
canvas.height = 600;

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let frames = 0;
let score = 0;
let pipesPassed = 0;
let highScore = localStorage.getItem('neonFlapHighScore') || 0;
let gameHue = 0; // For rainbow effect

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreHud = document.getElementById('score-hud');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const startBtn = document.getElementById('start-btn');
const aiBtn = document.getElementById('ai-btn');
const restartBtn = document.getElementById('restart-btn');

// Audio (Optional - placeholders for now, or we can synthesize simple beeps)
// For a simple clone, we'll skip audio files to keep it self-contained,
// but we could add AudioContext beeps later if requested.// --- Classes ---

class Bird {
    constructor() {
        this.x = 50;
        this.y = canvas.height / 2;
        this.width = 30;
        this.height = 30;
        this.velocity = 0;
        this.exhaust = []; // Particle based exhaust instead of line trail
    }

    draw() {
        const currentColor = `hsl(${gameHue}, 100%, 50%)`;
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // Draw Exhaust Particles
        this.exhaust.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        ctx.save();
        ctx.translate(centerX, centerY);

        // Rotate based on velocity (tilt up/down)
        const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(rotation);

        // Engine Flame (Dynamic flicker)
        const flameLength = Math.random() * 20 + 10;
        const flameWidth = Math.random() * 6 + 4;

        // Outer flame
        ctx.fillStyle = '#ff4500';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, -flameWidth / 2);
        ctx.lineTo(-this.width / 2 - flameLength, 0);
        ctx.lineTo(-this.width / 2, flameWidth / 2);
        ctx.fill();

        // Inner flame
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, -flameWidth / 4);
        ctx.lineTo(-this.width / 2 - flameLength * 0.6, 0);
        ctx.lineTo(-this.width / 2, flameWidth / 4);
        ctx.fill();

        // Ship Body
        ctx.shadowBlur = 20;
        ctx.shadowColor = currentColor;
        ctx.fillStyle = currentColor;

        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0); // Nose
        ctx.lineTo(-this.width / 2, -this.height / 2); // Top rear
        ctx.lineTo(-this.width / 2 + 5, 0); // Engine indent
        ctx.lineTo(-this.width / 2, this.height / 2); // Bottom rear
        ctx.closePath();
        ctx.fill();

        // Cockpit / Detail
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.moveTo(this.width / 6, 0);
        ctx.lineTo(-this.width / 4, -5);
        ctx.lineTo(-this.width / 4, 5);
        ctx.fill();

        ctx.restore();
    }

    update() {
        this.velocity += GRAVITY;
        this.y += this.velocity;

        // Calculate Engine Position for Exhaust
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));

        // Engine is at local (-width/2, 0) rotated
        const engineX = centerX + (-this.width / 2) * Math.cos(rotation);
        const engineY = centerY + (-this.width / 2) * Math.sin(rotation);

        // Add Exhaust Particle
        this.exhaust.push({
            x: engineX,
            y: engineY,
            vx: -3 - Math.random(), // Move left faster
            vy: (Math.random() - 0.5) * 2, // Slight vertical spread
            life: 0.8,
            color: `hsla(${gameHue}, 100%, 80%, 0.6)`, // Brighter core
            size: Math.random() * 4 + 2
        });

        // Update Exhaust
        for (let i = 0; i < this.exhaust.length; i++) {
            let p = this.exhaust[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04; // Fade out
            p.size *= 0.95; // Shrink
            if (p.life <= 0) {
                this.exhaust.splice(i, 1);
                i--;
            }
        }

        // Floor collision
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            gameOver();
        }

        // Ceiling collision
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    }

    jump() {
        this.velocity = JUMP_STRENGTH;
        // Burst of particles on jump
        createParticles(this.x, this.y + this.height / 2, 5, '#fff');
    }
}

class Pipe {
    constructor() {
        this.x = canvas.width;
        this.width = 60;

        // Ensure gap is never impossible (absolute min MIN_GAP)
        const safeGap = Math.max(currentPipeGap, MIN_GAP);

        // Constrain vertical movement from last pipe
        // Max vertical move per frame is roughly (JUMP_STRENGTH + GRAVITY*t)
        // At speed 3, 200px horizontal is ~66 frames.
        // We want to be safe. Let's limit change to +/- 100px.
        const maxDiff = 100;
        let minCenter = lastPipeGapCenter - maxDiff;
        let maxCenter = lastPipeGapCenter + maxDiff;

        // Also clamp to screen bounds (padding 50px)
        const padding = 50;
        minCenter = Math.max(minCenter, padding + safeGap / 2);
        maxCenter = Math.min(maxCenter, canvas.height - padding - safeGap / 2);

        // Randomize within constraints
        const center = Math.random() * (maxCenter - minCenter) + minCenter;

        this.topHeight = center - safeGap / 2;
        this.bottomY = center + safeGap / 2;
        this.bottomHeight = canvas.height - this.bottomY;

        this.passed = false;

        // Update global tracker
        lastPipeGapCenter = center;

        // Store hue offset for variety
        this.hueOffset = Math.random() * 360;
    }

    draw() {
        ctx.save();
        // Make pipes complementary to the bird
        const pipeColor = `hsl(${gameHue + 180}, 100%, 50%)`;

        ctx.shadowBlur = 15;
        ctx.shadowColor = pipeColor;
        ctx.fillStyle = pipeColor;

        // Top Pipe
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        // Bottom Pipe
        ctx.fillRect(this.x, this.bottomY, this.width, this.bottomHeight);

        // Pipe details (stripes)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(this.x + 10, 0, 10, this.topHeight);
        ctx.fillRect(this.x + 10, this.bottomY, 10, this.bottomHeight);

        ctx.restore();
    }

    update() {
        this.x -= currentPipeSpeed;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 4 - 2;
        this.color = color;
        this.life = 1.0; // Opacity
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.03;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Star {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2;
        this.speed = Math.random() * 0.5 + 0.1;
    }

    update() {
        this.x -= this.speed;
        if (this.x < 0) {
            this.x = canvas.width;
            this.y = Math.random() * canvas.height;
        }
    }

    draw() {
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

class CitySkyline {
    constructor() {
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

    update() {
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
        if (lastBuilding.x + lastBuilding.width < canvas.width + 100) {
            this.nextX = lastBuilding.x + lastBuilding.width;
            this.addBuilding();
        }
    }

    draw() {
        ctx.save();
        // Dark silhouette with a tint of the current game hue
        ctx.fillStyle = `hsl(${gameHue}, 60%, 15%)`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsl(${gameHue}, 60%, 10%)`;

        this.buildings.forEach(b => {
            // Draw building + 1px overlap to prevent gaps
            ctx.fillRect(b.x, canvas.height - b.height, b.width + 1, b.height);

            // Optional: Add some "windows"
            ctx.fillStyle = `hsl(${gameHue}, 100%, 50%, 0.1)`;
            if (Math.random() > 0.95) { // Flicker effect
                ctx.fillRect(b.x + 10, canvas.height - b.height + 10, 5, 5);
            }
            // Reset fill for next building body
            ctx.fillStyle = `hsl(${gameHue}, 60%, 15%)`;
        });
        ctx.restore();
    }
}

class SynthGrid {
    constructor() {
        this.horizonY = canvas.height * 0.8; // Horizon line
        this.speed = currentPipeSpeed;
        this.offset = 0;
        this.gridSize = 40;
    }

    update() {
        this.speed = currentPipeSpeed; // Update speed dynamically
        this.offset = (this.offset + this.speed) % this.gridSize;
    }

    draw() {
        ctx.save();
        ctx.beginPath();

        // Clip to bottom area
        ctx.rect(0, this.horizonY, canvas.width, canvas.height - this.horizonY);
        ctx.clip();

        // Gradient fade for the grid
        const gradient = ctx.createLinearGradient(0, this.horizonY, 0, canvas.height);
        gradient.addColorStop(0, `hsla(${gameHue}, 100%, 50%, 0.0)`);
        gradient.addColorStop(0.2, `hsla(${gameHue}, 100%, 50%, 0.1)`);
        gradient.addColorStop(1, `hsla(${gameHue}, 100%, 50%, 0.4)`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;

        // Vertical Perspective Lines
        const centerX = canvas.width / 2;
        // Draw more lines than needed to cover width
        for (let i = -10; i <= 10; i++) {
            const x = centerX + (i * this.gridSize * 4); // Spread them out

            ctx.beginPath();
            ctx.moveTo(centerX, this.horizonY - 50); // Vanishing point slightly above horizon
            ctx.lineTo(x, canvas.height + 100);
            ctx.stroke();
        }

        // Horizontal Moving Lines
        // We draw them with increasing spacing to simulate perspective
        for (let i = 0; i < 10; i++) {
            // Perspective math approximation
            const y = this.horizonY + (i * this.gridSize) + this.offset;
            // Scale spacing exponentially for 3D effect
            const perspectiveY = this.horizonY + Math.pow(i + (this.offset / this.gridSize), 2) * 5;

            if (perspectiveY > canvas.height) continue;

            ctx.beginPath();
            ctx.moveTo(0, perspectiveY);
            ctx.lineTo(canvas.width, perspectiveY);
            ctx.stroke();
        }

        ctx.restore();
    }
} class ScorePopup {
    constructor(x, y, text, color = '#fff') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.vy = -2; // Float up
    }
    update() {
        this.y += this.vy;
        this.life -= 0.02;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.font = 'bold 30px Orbitron';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class MatrixColumn {
    constructor(x) {
        this.x = x;
        this.y = Math.random() * canvas.height;
        this.speed = Math.random() * 3 + 1;
        this.len = Math.random() * 10 + 5;
        this.chars = [];
    }
    update() {
        this.y += this.speed;
        if (this.y - this.len * 20 > canvas.height) {
            this.y = -20;
            this.speed = Math.random() * 3 + 1;
        }
    }
    draw() {
        ctx.save();
        ctx.font = '14px monospace';
        for (let i = 0; i < this.len; i++) {
            const charY = this.y - i * 15;
            // Optimization: don't draw if off screen
            if (charY > canvas.height || charY < -20) continue;

            // Head is bright, tail is fading
            const alpha = 1 - (i / this.len);
            ctx.fillStyle = `hsla(${gameHue}, 100%, 50%, ${alpha * 0.3})`;

            // Random binary char
            const char = Math.random() > 0.5 ? '1' : '0';
            ctx.fillText(char, this.x, charY);
        }
        ctx.restore();
    }
}

// --- Global Variables ---
let bird;
let pipes = [];
let particles = [];
let stars = [];
let city;
let scorePopups = [];
let matrixRain = [];
let synthGrid;
let isAutoPlay = false;
let lastPipeGapCenter = 0;// --- Functions ---

function init() {
    bird = new Bird();
    pipes = [];
    particles = [];
    city = new CitySkyline();
    synthGrid = new SynthGrid();
    scorePopups = [];
    score = 0;
    pipesPassed = 0;
    frames = 0;
    gameHue = 0;
    isAutoPlay = false;
    lastPipeGapCenter = canvas.height / 2; // Init center
    scoreHud.innerText = score;

    // Reset difficulty
    currentPipeSpeed = INITIAL_PIPE_SPEED;
    currentPipeGap = INITIAL_PIPE_GAP;

    // Init stars if empty
    if (stars.length === 0) {
        for (let i = 0; i < 50; i++) {
            stars.push(new Star());
        }
    }

    // Init Matrix Rain
    matrixRain = [];
    const colCount = Math.floor(canvas.width / 15);
    for (let i = 0; i < colCount; i++) {
        matrixRain.push(new MatrixColumn(i * 15));
    }
}

function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function gameOver() {
    gameState = 'GAMEOVER';
    createParticles(bird.x + bird.width / 2, bird.y + bird.height / 2, 50, '#ff0000'); // Explosion

    if (!isAutoPlay && score > highScore) {
        highScore = score;
        localStorage.setItem('neonFlapHighScore', highScore);
    }

    finalScoreEl.innerText = score;
    bestScoreEl.innerText = highScore;

    scoreHud.style.display = 'none';
    gameOverScreen.classList.add('active');
}

function performAI() {
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

function update() {
    // Background
    gameHue += 0.5; // Cycle colors
    stars.forEach(star => star.update());
    city.update();
    synthGrid.update();
    matrixRain.forEach(col => col.update());

    if (gameState === 'PLAYING') {
        if (isAutoPlay) {
            performAI();
        }
        bird.update();

        // Pipe Spawning
        // Adjust spawn rate based on speed

        // Let's use a dynamic spawn rate
        const currentSpawnRate = Math.max(60, Math.floor(PIPE_SPAWN_RATE * (INITIAL_PIPE_SPEED / currentPipeSpeed)));

        if (frames % currentSpawnRate === 0) {
            pipes.push(new Pipe());
        }

        // Pipe Logic
        for (let i = 0; i < pipes.length; i++) {
            let p = pipes[i];
            p.update();

            // Collision Detection
            if (
                bird.x < p.x + p.width &&
                bird.x + bird.width > p.x &&
                (bird.y < p.topHeight || bird.y + bird.height > p.bottomY)
            ) {
                gameOver();
            }

            // Score
            if (p.x + p.width < bird.x && !p.passed) {
                p.passed = true;
                pipesPassed++;

                // Check for perfect pass
                const gapCenter = p.topHeight + (currentPipeGap / 2);
                const birdCenter = bird.y + (bird.height / 2);
                const diff = Math.abs(gapCenter - birdCenter);

                if (diff < 25) { // Threshold for perfect
                    score += 2;
                    scorePopups.push(new ScorePopup(bird.x, bird.y - 20, "+2", "#ffd700"));
                    createParticles(bird.x + bird.width / 2, bird.y + bird.height / 2, 40, "#ffd700");
                } else {
                    score++;
                    scorePopups.push(new ScorePopup(bird.x, bird.y - 20, "+1"));
                }

                scoreHud.innerText = score;

                // Difficulty Scaling
                if (pipesPassed % 3 === 0) {
                    currentPipeSpeed = Math.min(currentPipeSpeed + SPEED_INCREMENT, MAX_SPEED);
                }
            }

            // Remove off-screen pipes
            if (p.x + p.width < 0) {
                pipes.splice(i, 1);
                i--;
            }
        }
    }

    // Particles
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }

    // Score Popups
    for (let i = 0; i < scorePopups.length; i++) {
        scorePopups[i].update();
        if (scorePopups[i].life <= 0) {
            scorePopups.splice(i, 1);
            i--;
        }
    }

    frames++;
}

function draw() {
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Stars
    stars.forEach(star => star.draw());

    // Draw Matrix Rain (Behind city)
    matrixRain.forEach(col => col.draw());

    // Draw City
    city.draw();

    // Draw Synth Grid
    synthGrid.draw();

    // Draw Pipes
    pipes.forEach(p => p.draw());

    // Draw Bird (only if not game over, or draw explosion instead)
    if (gameState !== 'GAMEOVER') {
        bird.draw();
    }

    // Draw Particles
    particles.forEach(p => p.draw());

    // Draw Score Popups
    scorePopups.forEach(p => p.draw());
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// --- Input Handling ---

function jumpAction() {
    if (gameState === 'START') {
        gameState = 'PLAYING';
        startScreen.classList.remove('active');
        scoreHud.style.display = 'block';
        bird.jump();
    } else if (gameState === 'PLAYING') {
        bird.jump();
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        jumpAction();
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling
    jumpAction();
});

canvas.addEventListener('mousedown', (e) => {
    jumpAction();
});

startBtn.addEventListener('click', () => {
    isAutoPlay = false;
    jumpAction();
});

aiBtn.addEventListener('click', () => {
    isAutoPlay = true;
    jumpAction();
});

restartBtn.addEventListener('click', () => {
    init();
    gameState = 'START';
    gameOverScreen.classList.remove('active');
    startScreen.classList.add('active');
});

// --- Start ---
init();
loop();
