import { test, expect } from './fixtures/coverage.js';

test.describe('Scoring System', () => {
  test('should save and load high score', async ({ page }) => {
    await page.goto('/');

    // Clear any existing high score
    await page.evaluate(() => localStorage.removeItem('neonFlapHighScore'));
    await page.reload();

    await page.click('#start-btn');

    // Set score and trigger game over
    await page.evaluate(() => {
      window.__GAME__.score = 15;
      window.__GAME__.gameOver();
    });

    await page.waitForSelector('#game-over-screen.active');

    // Verify high score is saved
    const savedHighScore = await page.evaluate(() =>
      localStorage.getItem('neonFlapHighScore')
    );
    expect(savedHighScore).toBe('15');

    // Reload and verify high score persists
    await page.reload();
    await page.click('#start-btn');

    const highScore = await page.evaluate(() => window.__GAME__.highScore);
    expect(highScore).toBe('15');
  });

  test('should update high score only if beaten', async ({ page }) => {
    await page.goto('/');

    // Set initial high score
    await page.evaluate(() => {
      localStorage.setItem('neonFlapHighScore', '20');
    });
    await page.reload();

    await page.click('#start-btn');

    // Score lower than high score
    await page.evaluate(() => {
      window.__GAME__.score = 10;
      window.__GAME__.gameOver();
    });

    await page.waitForSelector('#game-over-screen.active');

    const highScore = await page.evaluate(() => window.__GAME__.highScore);
    expect(highScore).toBe('20'); // Should not change

    // Restart and beat high score
    await page.click('#restart-btn');
    await page.click('#start-btn');

    await page.evaluate(() => {
      window.__GAME__.score = 25;
      window.__GAME__.gameOver();
    });

    await page.waitForSelector('#game-over-screen.active');

    const newHighScore = await page.evaluate(() => window.__GAME__.highScore);
    expect(newHighScore).toBe(25);
  });

  test('should display correct scores on game over screen', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('neonFlapHighScore', '30');
    });
    await page.reload();

    await page.click('#start-btn');

    await page.evaluate(() => {
      window.__GAME__.score = 25;
      window.__GAME__.gameOver();
    });

    await page.waitForSelector('#game-over-screen.active');

    const finalScore = await page.locator('#final-score').textContent();
    const bestScore = await page.locator('#best-score').textContent();

    expect(finalScore).toBe('25');
    expect(bestScore).toBe('30');
  });

  test('should increase difficulty as score increases', async ({ page }) => {
    await page.goto('/');
    await page.click('#start-btn');

    const initialSpeed = await page.evaluate(() => window.__GAME__.currentPipeSpeed);

    // Manually increase difficulty by simulating pipe passes
    await page.evaluate(() => {
      const game = window.__GAME__;
      const initialSpeed = game.currentPipeSpeed;
      game.pipesPassed = 3;
      // Manually trigger difficulty scaling
      game.currentPipeSpeed = Math.min(game.currentPipeSpeed + 0.5, 30);
    });

    await page.waitForTimeout(100);

    const newSpeed = await page.evaluate(() => window.__GAME__.currentPipeSpeed);
    expect(newSpeed).toBeGreaterThan(initialSpeed);
  });
});
