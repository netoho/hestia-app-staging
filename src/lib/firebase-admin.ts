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
      const {
        FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY,
      } = process.env;
      
      if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
        throw new Error('Missing Firebase environment variables');
      }
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
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
