import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    environment: 'happy-dom',
    setupFiles: ['./tests/unit/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['public/js/**/*.js'],
      exclude: [
        'public/js/main.js',
        '**/node_modules/**',
        '**/tests/**'
      ],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  }
});
