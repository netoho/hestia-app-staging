// lib/env-check.ts
export const isEmulator = (): boolean => {
  return process.env.FIREBASE_EMULATOR_HOST !== undefined;
};