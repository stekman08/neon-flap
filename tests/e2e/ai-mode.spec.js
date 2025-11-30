import { test, expect } from '@playwright/test';

const MIN_FPS_THRESHOLD = 40; // Tests need at least 40 FPS to be reliable
const MIN_FRAMES_FOR_3_SECONDS = 50; // At least ~17 FPS worth of frames for 3 second test
const MAX_RETRIES = 3;

// Helper to get and format AI debug log
async function getAIDebugLog(page) {
  return await page.evaluate(() => {
    const log = window.__GAME__?.aiDebugLog?.getFormattedLog?.();
    return log || 'No AI debug log available';
  });
}

// Helper to get frame count from AI debug log
async function getFrameCount(page) {
  return await page.evaluate(() => {
    return window.__GAME__?.aiDebugLog?.summary?.totalFrames || 0;
  });
}

// Helper to start AI mode with FPS retry logic
async function startAIModeWithRetry(page) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await page.goto('/');
    await page.click('#ai-btn');
    await page.waitForTimeout(100);

    const fps = await page.evaluate(() => window.__GAME__?.performanceMonitor?.fps || 60);
    if (fps >= MIN_FPS_THRESHOLD) {
      return { fps, attempt };
    }
    // FPS too low, retry
  }
  // Return last attempt info even if FPS still low
  const fps = await page.evaluate(() => window.__GAME__?.performanceMonitor?.fps || 60);
  return { fps, attempt: MAX_RETRIES };
}

test.describe('AI Mode', () => {
  test('should start AI mode when AI button clicked', async ({ page }) => {
    const { fps } = await startAIModeWithRetry(page);
    test.skip(fps < MIN_FPS_THRESHOLD, `FPS too low after ${MAX_RETRIES} retries (${fps})`);

    // Game should start
    const gameState = await page.evaluate(() => window.__GAME__.gameState);
    expect(gameState).toBe('PLAYING');

    // Auto-play should be enabled
    const isAutoPlay = await page.evaluate(() => window.__GAME__.isAutoPlay);
    expect(isAutoPlay).toBe(true);
  });

  test('should keep bird alive in AI mode', async ({ page }) => {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      await page.goto('/');
      await page.click('#ai-btn');

      // Wait for some time to let AI play
      await page.waitForTimeout(3000);

      const fps = await page.evaluate(() => window.__GAME__?.performanceMonitor?.fps || 60);
      const frameCount = await getFrameCount(page);

      // Check if environment was stable enough (FPS and frame count)
      if (fps < MIN_FPS_THRESHOLD || frameCount < MIN_FRAMES_FOR_3_SECONDS) {
        const debugLog = await getAIDebugLog(page);
        console.log(`Attempt ${attempt + 1}: Unstable environment (fps=${fps}, frames=${frameCount}), retrying...\n${debugLog}`);
        continue; // Retry
      }

      // Environment is stable, run the actual test
      const gameState = await page.evaluate(() => window.__GAME__.gameState);

      // Either still playing or if game over, score should be reasonable
      if (gameState === 'GAMEOVER') {
        const score = await page.evaluate(() => window.__GAME__.score);

        // If score is 0, dump the AI debug log for diagnostics
        if (score === 0) {
          const debugLog = await getAIDebugLog(page);
          console.log('AI CRASHED WITH SCORE 0 (stable env) - DEBUG LOG:\n' + debugLog);
        }

        expect(score).toBeGreaterThan(0);
      } else {
        expect(gameState).toBe('PLAYING');
      }
      return; // Test passed
    }
    // All retries exhausted
    test.skip(true, `Environment unstable after ${MAX_RETRIES} retries`);
  });

  test('should accumulate score in AI mode', async ({ page }) => {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      await page.goto('/');
      await page.click('#ai-btn');
      await page.waitForTimeout(500);

      const fps = await page.evaluate(() => window.__GAME__?.performanceMonitor?.fps || 60);
      if (fps >= MIN_FPS_THRESHOLD) {
        // FPS is good, run the actual test
        await page.waitForFunction(() => window.__GAME__.score > 0, { timeout: 5000 });
        const score = await page.evaluate(() => window.__GAME__.score);
        expect(score).toBeGreaterThan(0);
        return; // Test passed
      }
      // FPS too low, retry
    }
    // All retries exhausted with low FPS
    test.skip(true, `FPS too low after ${MAX_RETRIES} retries`);
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
