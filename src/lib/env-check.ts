// lib/env-check.ts

// Check if demo mode is enabled
export const isDemoMode = (): boolean => {
  return process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1';
};

// Legacy function for backward compatibility - will be removed
export const isMockEnabled = (): boolean => {
  return isDemoMode();
};

// Legacy function for backward compatibility - will be removed
export const isEmulator = (): boolean => {
  return isDemoMode();
};