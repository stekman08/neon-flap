import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    // Draw neon bird shape
    const scale = size / 192;
    const centerX = size / 2;
    const centerY = size / 2;

    // Bird body (circle)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffff';
    ctx.fill();

    // Neon glow effect
    ctx.shadowBlur = 20 * scale;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffff';
    ctx.fill();

    // Wing (triangle)
    ctx.beginPath();
    ctx.moveTo(centerX - 15 * scale, centerY);
    ctx.lineTo(centerX - 40 * scale, centerY - 10 * scale);
    ctx.lineTo(centerX - 40 * scale, centerY + 10 * scale);
    ctx.closePath();
    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.fill();

    // Eye
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(centerX + 15 * scale, centerY - 5 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Beak (triangle)
    ctx.beginPath();
    ctx.moveTo(centerX + 35 * scale, centerY);
    ctx.lineTo(centerX + 50 * scale, centerY - 5 * scale);
    ctx.lineTo(centerX + 50 * scale, centerY + 5 * scale);
    ctx.closePath();
    ctx.fillStyle = '#ffff00';
    ctx.shadowBlur = 10 * scale;
    ctx.shadowColor = '#ffff00';
    ctx.fill();

    return canvas;
}

// Generate icons
const sizes = [192, 512];
const iconsDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of sizes) {
    const canvas = generateIcon(size);
    const buffer = canvas.toBuffer('image/png');
    const filename = path.join(iconsDir, `icon-${size}.png`);
    fs.writeFileSync(filename, buffer);
    console.log(`Generated ${filename}`);
}

// Generate apple-touch-icon (180x180)
const appleIcon = generateIcon(180);
const appleBuffer = appleIcon.toBuffer('image/png');
const appleFilename = path.join(iconsDir, 'apple-touch-icon.png');
fs.writeFileSync(appleFilename, appleBuffer);
console.log(`Generated ${appleFilename}`);

console.log('All icons generated successfully!');
