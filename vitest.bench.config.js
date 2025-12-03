import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/bench/**/*.bench.js'],
    environment: 'happy-dom',
    setupFiles: ['./tests/unit/setup.js'],
    benchmark: {
      include: ['tests/bench/**/*.bench.js'],
      reporters: ['default'],
    }
  }
});
