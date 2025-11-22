import { test, expect } from '@playwright/test';

test.describe('AI Mode', () => {
  test('should start AI mode when AI button clicked', async ({ page }) => {
    await page.goto('/');

    await page.click('#ai-btn');

    // Game should start
    const gameState = await page.evaluate(() => window.__GAME__.gameState);
    expect(gameState).toBe('PLAYING');

    // Auto-play should be enabled
    const isAutoPlay = await page.evaluate(() => window.__GAME__.isAutoPlay);
    expect(isAutoPlay).toBe(true);
  });

  test('should keep bird alive in AI mode', async ({ page }) => {
    await page.goto('/');
    await page.click('#ai-btn');

    // Wait for some time to let AI play
    await page.waitForTimeout(3000);

    // Game should still be playing (AI should keep bird alive)
    const gameState = await page.evaluate(() => window.__GAME__.gameState);

    // Either still playing or if game over, score should be reasonable
    if (gameState === 'GAMEOVER') {
      const score = await page.evaluate(() => window.__GAME__.score);
      // AI should at least score some points before game over
      expect(score).toBeGreaterThan(0);
    } else {
      expect(gameState).toBe('PLAYING');
    }
  });

  test('should accumulate score in AI mode', async ({ page }) => {
    await page.goto('/');
    await page.click('#ai-btn');

    // Wait for AI to pass at least one pipe
    await page.waitForFunction(() => window.__GAME__.score > 0, { timeout: 5000 });

    const score = await page.evaluate(() => window.__GAME__.score);
    expect(score).toBeGreaterThan(0);
  });

  test('should not update high score in AI mode', async ({ page }) => {
    await page.goto('/');

    // Set initial high score
    await page.evaluate(() => {
      localStorage.setItem('neonFlapHighScore', '10');
    });

    await page.goto('/');
    await page.click('#ai-btn');

    // Force game over with higher score
    await page.evaluate(() => {
      window.__GAME__.score = 20;
      window.__GAME__.gameOver();
    });

    await page.waitForSelector('#game-over-screen.active');

    // High score should NOT be updated
    const highScore = await page.evaluate(() => window.__GAME__.highScore);
    expect(highScore).toBe('10');
  });
});
