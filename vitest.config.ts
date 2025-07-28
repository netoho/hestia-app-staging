import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Setup files
    setupFiles: ['./vitest.setup.ts'],
    
    // Global setup and teardown for database tests
    globalSetup: './tests/setup/globalSetup.ts',
    globalTeardown: './tests/setup/globalTeardown.ts',
    
    // Test patterns
    include: [
      'src/**/__tests__/**/*.{js,jsx,ts,tsx}',
      'src/**/*.(test|spec).{js,jsx,ts,tsx}',
    ],
    
    // Files to ignore
    exclude: [
      'node_modules',
      '.next',
      'dist',
      'src/**/*-utils.ts',
      'src/**/*-utils.js',
      'src/**/test-utils.*',
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      include: [
        'src/**/*.{js,jsx,ts,tsx}',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.{js,jsx,ts,tsx}',
        'src/**/__tests__/**',
        'src/**/*.(test|spec).{js,jsx,ts,tsx}',
      ],
    },
    
    // Test timeout (increased for database operations)
    testTimeout: 10000,
    
    // Run tests sequentially for database tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})