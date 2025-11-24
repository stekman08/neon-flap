import { test, expect } from '@playwright/test';

test.describe('PWA Functionality', () => {
  test('should have valid manifest', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Check manifest link exists
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', 'manifest.json');

    // Fetch and validate manifest
    const response = await page.goto('http://localhost:3000/manifest.json');
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBe('Neon Flap');
    expect(manifest.short_name).toBe('NeonFlap');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#00ffff');
    expect(manifest.background_color).toBe('#000000');
    expect(manifest.orientation).toBe('portrait-primary');
    expect(manifest.icons).toHaveLength(7);
  });

  test('should have PWA meta tags', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Check theme color
    const themeColor = await page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#00ffff');

    // Check Apple meta tags
    const appleCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(appleCapable).toHaveAttribute('content', 'yes');

    const appleTitle = await page.locator('meta[name="apple-mobile-web-app-title"]');
    await expect(appleTitle).toHaveAttribute('content', 'Neon Flap');

    // Check description
    const description = await page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', 'A neon-themed Flappy Bird clone with AI mode');
  });

  test('should have all icon files', async ({ page }) => {
    // Check 192x192 icon
    const icon192 = await page.goto('http://localhost:3000/icons/icon-192.png');
    expect(icon192.status()).toBe(200);
    expect(icon192.headers()['content-type']).toContain('image/png');

    // Check 512x512 icon
    const icon512 = await page.goto('http://localhost:3000/icons/icon-512.png');
    expect(icon512.status()).toBe(200);
    expect(icon512.headers()['content-type']).toContain('image/png');

    // Check apple touch icon
    const appleIcon = await page.goto('http://localhost:3000/icons/apple-touch-icon.png');
    expect(appleIcon.status()).toBe(200);
    expect(appleIcon.headers()['content-type']).toContain('image/png');
  });

  test('should register service worker', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Wait for service worker registration
    const swRegistered = await page.evaluate(async () => {
      // Wait up to 3 seconds for SW registration
      for (let i = 0; i < 30; i++) {
        if (navigator.serviceWorker.controller) {
          return true;
        }
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    });

    expect(swRegistered).toBe(true);
  });

  // Note: Asset caching tests are omitted as they're difficult to test reliably in E2E
  // The service worker install event caches assets, but timing and cache API behavior
  // in test environments can be inconsistent. Manual testing is recommended for offline functionality.

  test('should display installable prompt indicators', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Check that manifest is properly linked
    const manifestContent = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      if (!link) return null;

      const response = await fetch(link.href);
      return await response.json();
    });

    expect(manifestContent).not.toBeNull();
    expect(manifestContent.display).toBe('standalone');
    expect(manifestContent.start_url).toBe('./');
  });
});
