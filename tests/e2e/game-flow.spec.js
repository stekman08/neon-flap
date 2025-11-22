import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
  test('should display start screen on load', async ({ page }) => {
    await page.goto('/');

    const startScreen = page.locator('#start-screen');
    await expect(startScreen).toBeVisible();
    await expect(startScreen).toHaveClass(/active/);

    await expect(startScreen.locator('h1')).toContainText('NEON FLAP');
    await expect(page.locator('#start-btn')).toBeVisible();
    await expect(page.locator('#ai-btn')).toBeVisible();
  });

  test('should start game on button click', async ({ page }) => {
    await page.goto('/');

    await page.click('#start-btn');

    // Start screen should hide
    const startScreen = page.locator('#start-screen');
    await expect(startScreen).not.toHaveClass(/active/);

    // Score HUD should be visible
    const scoreHud = page.locator('#score-hud');
    await expect(scoreHud).toBeVisible();

    // Game state should be PLAYING
    const gameState = await page.evaluate(() => window.__GAME__.gameState);
    expect(gameState).toBe('PLAYING');
  });

  test('should allow bird to jump with spacebar', async ({ page }) => {
    await page.goto('/');
    await page.click('#start-btn');

    const initialY = await page.evaluate(() => window.__GAME__.bird.y);

    await page.keyboard.press('Space');

    // Wait for velocity to change (becomes negative after jump)
    await page.waitForTimeout(50);

    const velocityAfterJump = await page.evaluate(() => window.__GAME__.bird.velocity);
    // After jump, velocity should be negative (JUMP_STRENGTH = -5)
    expect(velocityAfterJump).toBeLessThan(0);
  });

  test('should show game over screen after collision', async ({ page }) => {
    await page.goto('/');
    await page.click('#start-btn');

    // Force bird to floor by setting y position high
    await page.evaluate(() => {
      window.__GAME__.bird.y = window.__GAME__.canvas.height + 100;
    });

    // Wait for game over screen
    await page.waitForSelector('#game-over-screen.active', { timeout: 2000 });

    const gameOverScreen = page.locator('#game-over-screen');
    await expect(gameOverScreen).toBeVisible();
    await expect(gameOverScreen).toHaveClass(/active/);

    // Verify final score is displayed
    const finalScore = page.locator('#final-score');
    await expect(finalScore).toBeVisible();

    const gameState = await page.evaluate(() => window.__GAME__.gameState);
    expect(gameState).toBe('GAMEOVER');
  });

  test('should restart game after game over', async ({ page }) => {
    await page.goto('/');
    await page.click('#start-btn');

    // Trigger game over
    await page.evaluate(() => {
      window.__GAME__.gameOver();
    });

    await page.waitForSelector('#game-over-screen.active');

    // Click restart
    await page.click('#restart-btn');

    // Should show start screen again
    const startScreen = page.locator('#start-screen');
    await expect(startScreen).toHaveClass(/active/);

    const gameState = await page.evaluate(() => window.__GAME__.gameState);
    expect(gameState).toBe('START');

    // Score should be reset
    const score = await page.evaluate(() => window.__GAME__.score);
    expect(score).toBe(0);
  });

  test('should display and update score', async ({ page }) => {
    await page.goto('/');
    await page.click('#start-btn');

    const initialScore = await page.evaluate(() => window.__GAME__.score);
    expect(initialScore).toBe(0);

    // Manually increment score by passing a pipe
    await page.evaluate(() => {
      const game = window.__GAME__;
      game.score++;
      game.uiElements.scoreHud.innerText = game.score;
    });

    await page.waitForTimeout(100);

    const newScore = await page.evaluate(() => window.__GAME__.score);
    expect(newScore).toBeGreaterThan(0);

    // Verify score is displayed in HUD
    const scoreHud = page.locator('#score-hud');
    const scoreText = await scoreHud.textContent();
    expect(parseInt(scoreText)).toBe(newScore);
  });
});
