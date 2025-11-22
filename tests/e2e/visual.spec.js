import { test, expect } from '@playwright/test';

test.describe('Visual Tests', () => {
  test('should render start screen correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for canvas to be ready
    await page.waitForSelector('#gameCanvas');

    // Take screenshot
    await expect(page).toHaveScreenshot('start-screen.png', {
      maxDiffPixels: 100 // Allow small rendering differences
    });
  });

  test('should render game in playing state', async ({ page }) => {
    await page.goto('/');
    await page.click('#start-btn');

    // Wait a bit for game to render
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('playing-state.png', {
      maxDiffPixels: 500 // More tolerance for animated content
    });
  });

  test('should render game over screen', async ({ page }) => {
    await page.goto('/');
    await page.click('#start-btn');

    await page.evaluate(() => {
      window.__GAME__.score = 10;
      window.__GAME__.gameOver();
    });

    await page.waitForSelector('#game-over-screen.active');

    await expect(page).toHaveScreenshot('game-over-screen.png', {
      maxDiffPixels: 100
    });
  });

  test('should render canvas with correct dimensions', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('#gameCanvas');
    const box = await canvas.boundingBox();

    expect(box.width).toBe(400);
    expect(box.height).toBe(600);
  });

  test('should show score HUD during gameplay', async ({ page }) => {
    await page.goto('/');
    await page.click('#start-btn');

    const scoreHud = page.locator('#score-hud');
    await expect(scoreHud).toBeVisible();

    // Score should be displayed
    const scoreText = await scoreHud.textContent();
    expect(parseInt(scoreText)).toBeGreaterThanOrEqual(0);
  });
});
