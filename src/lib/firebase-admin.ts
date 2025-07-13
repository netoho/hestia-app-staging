import * as admin from 'firebase-admin';

// Check if we are running in an emulated environment
const isEmulator = process.env.FIREBASE_EMULATOR_HOST !== undefined;

function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    return;
  }

  try {
    if (isEmulator) {
      // Emulator-specific initialization
      console.log('Firebase Admin: Initializing for emulator...');
      admin.initializeApp({
        projectId: 'demo-project-id', // Use a consistent dummy project ID for emulator
      });
    } else {
      // Production initialization from environment variables
      console.log('Firebase Admin: Initializing for production...');
      const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      
      if (!serviceAccountJson) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set for production.');
      }
      
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }
    console.log('Firebase Admin initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    if (!isEmulator) {
      console.warn('Firebase Admin could not be initialized. File-related features will not work.');
    }
  }
}

initializeFirebaseAdmin();

export const storage = admin.apps.length ? admin.storage() : null;
export default admin;
