import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Global test setup
    globals: true,

    // Setup files (run before each test file)
    setupFiles: ['./vitest.setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.next/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        'app/**', // API routes (will be tested in integration tests)
      ],
      include: [
        'src/**/*.ts',
        'src/**/*.tsx',
      ],
      all: true,
    },

    // Test file patterns
    include: [
      '**/__tests__/**/*.test.ts',
      '**/__tests__/**/*.test.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],

    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'coverage/**',
    ],

    // Test timeout
    testTimeout: 10000,
    hookTimeout: 10000,

    // Test isolation
    isolate: true,

    // Reporter
    reporters: ['verbose'],

    // Mock reset
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
