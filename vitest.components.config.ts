import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment for React components
    environment: 'jsdom',
    
    // Setup files (no database setup for components)
    setupFiles: ['./vitest.setup.ts'],
    
    // NO global setup/teardown for components (no database)
    // globalSetup: undefined,
    // globalTeardown: undefined,
    
    // Test patterns - only component tests
    include: [
      'src/components/**/__tests__/**/*.{js,jsx,ts,tsx}',
      'src/components/**/*.(test|spec).{js,jsx,ts,tsx}',
      'src/hooks/**/__tests__/**/*.{js,jsx,ts,tsx}',
      'src/hooks/**/*.(test|spec).{js,jsx,ts,tsx}',
    ],
    
    // Exclude API tests
    exclude: [
      'node_modules',
      '.next',
      'dist',
      'src/app/**/__tests__/**/*', // Exclude API tests
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      include: [
        'src/components/**/*.{js,jsx,ts,tsx}',
        'src/hooks/**/*.{js,jsx,ts,tsx}',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.{js,jsx,ts,tsx}',
        'src/**/__tests__/**',
        'src/**/*.(test|spec).{js,jsx,ts,tsx}',
      ],
    },
    
    // Test timeout
    testTimeout: 5000,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})