import { test as base } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coverageDir = path.join(__dirname, '../../../coverage/e2e-tmp');

// Ensure coverage directory exists
if (!fs.existsSync(coverageDir)) {
  fs.mkdirSync(coverageDir, { recursive: true });
}

let coverageCounter = 0;

/**
 * Extended test fixture that collects V8 coverage from browser
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Start collecting JS coverage
    await page.coverage.startJSCoverage({
      resetOnNavigation: false
    });

    // Run the test
    await use(page);

    // Stop and save coverage
    const coverage = await page.coverage.stopJSCoverage();

    // Filter to only include our source files (public/js/)
    const relevantCoverage = coverage.filter(entry => {
      return entry.url.includes('/js/') &&
             !entry.url.includes('node_modules') &&
             entry.url.startsWith('http://localhost:3000');
    });

    if (relevantCoverage.length > 0) {
      const coverageFile = path.join(coverageDir, `coverage-${process.pid}-${coverageCounter++}.json`);
      fs.writeFileSync(coverageFile, JSON.stringify(relevantCoverage, null, 2));
    }
  }
});

export { expect } from '@playwright/test';
