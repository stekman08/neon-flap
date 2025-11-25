import { test, expect } from '@playwright/test';

test.describe('Audio System', () => {
  test('should have music button available', async ({ page }) => {
    await page.goto('/');

    const musicBtn = page.locator('#music-btn');
    await expect(musicBtn).toBeVisible();

    const muteBtn = page.locator('#mute-btn');
    await expect(muteBtn).toBeVisible();
  });

  test('should auto-start music when SFX is not muted', async ({ page }) => {
    await page.goto('/');

    // Verify SFX is not muted by default
    const isSfxMuted = await page.evaluate(() => {
      const audioController = window.__GAME__.audioController;
      return audioController.isSfxMuted;
    });
    expect(isSfxMuted).toBe(false);

    // Start game
    await page.click('#start-btn');

    // Wait a bit for auto-start logic to run
    await page.waitForTimeout(100);

    // Verify music is playing
    const isMusicPlaying = await page.evaluate(() => {
      const audioController = window.__GAME__.audioController;
      return audioController.isPlayingMusic;
    });
    expect(isMusicPlaying).toBe(true);

    // Verify music button has 'playing' class
    const musicBtn = page.locator('#music-btn');
    await expect(musicBtn).toHaveClass(/playing/);
  });

  test('should NOT auto-start music when SFX is muted', async ({ page }) => {
    await page.goto('/');

    // Mute SFX before starting game
    await page.click('#mute-btn');

    // Verify SFX is muted
    const isSfxMuted = await page.evaluate(() => {
      const audioController = window.__GAME__.audioController;
      return audioController.isSfxMuted;
    });
    expect(isSfxMuted).toBe(true);

    // Start game
    await page.click('#start-btn');

    // Wait a bit to ensure auto-start logic doesn't run
    await page.waitForTimeout(100);

    // Verify music is NOT playing
    const isMusicPlaying = await page.evaluate(() => {
      const audioController = window.__GAME__.audioController;
      return audioController.isPlayingMusic;
    });
    expect(isMusicPlaying).toBe(false);

    // Verify music button does NOT have 'playing' class
    const musicBtn = page.locator('#music-btn');
    await expect(musicBtn).not.toHaveClass(/playing/);
  });

  test('should allow manual music start even when SFX is muted', async ({ page }) => {
    await page.goto('/');

    // Mute SFX
    await page.click('#mute-btn');

    // Verify SFX is muted
    const isSfxMuted = await page.evaluate(() => {
      const audioController = window.__GAME__.audioController;
      return audioController.isSfxMuted;
    });
    expect(isSfxMuted).toBe(true);

    // Manually start music by clicking music button
    await page.click('#music-btn');

    // Wait for music to start
    await page.waitForTimeout(100);

    // Verify music is playing
    const isMusicPlaying = await page.evaluate(() => {
      const audioController = window.__GAME__.audioController;
      return audioController.isPlayingMusic;
    });
    expect(isMusicPlaying).toBe(true);

    // Verify music button has 'playing' class
    const musicBtn = page.locator('#music-btn');
    await expect(musicBtn).toHaveClass(/playing/);
  });

  test('should respect user music interaction preference', async ({ page }) => {
    await page.goto('/');

    // Manually stop music by clicking music button (this sets userHasInteractedWithMusic)
    await page.click('#music-btn');
    await page.waitForTimeout(100);

    // Stop music
    await page.click('#music-btn');
    await page.waitForTimeout(100);

    // Verify user has interacted with music
    const userHasInteracted = await page.evaluate(() => {
      const audioController = window.__GAME__.audioController;
      return audioController.userHasInteractedWithMusic;
    });
    expect(userHasInteracted).toBe(true);

    // Start game
    await page.click('#start-btn');
    await page.waitForTimeout(100);

    // Music should NOT auto-start because user has already made a choice
    const isMusicPlaying = await page.evaluate(() => {
      const audioController = window.__GAME__.audioController;
      return audioController.isPlayingMusic;
    });
    expect(isMusicPlaying).toBe(false);
  });

  test('should toggle mute button icon', async ({ page }) => {
    await page.goto('/');

    const muteBtn = page.locator('#mute-btn');
    const muteSvg = muteBtn.locator('svg');

    // SVG icon should be present
    await expect(muteSvg).toBeVisible();

    // Default state: unmuted
    await expect(muteBtn).toHaveClass(/unmuted/);

    // Click to mute
    await page.click('#mute-btn');
    await expect(muteBtn).not.toHaveClass(/unmuted/);

    // SVG should still be present (content changes dynamically)
    await expect(muteSvg).toBeVisible();

    // Click to unmute
    await page.click('#mute-btn');
    await expect(muteBtn).toHaveClass(/unmuted/);
    await expect(muteSvg).toBeVisible();
  });
});
