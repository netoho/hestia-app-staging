import * as admin from 'firebase-admin';

// Check if we're using Firebase storage
const isUsingFirebaseStorage = process.env.STORAGE_PROVIDER === 'firebase';

function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    return;
  }

  // Only initialize if we're actually using Firebase storage
  if (!isUsingFirebaseStorage) {
    console.log('Firebase Admin: Skipping initialization (not using Firebase storage)');
    return;
  }

  try {
    if (isUsingFirebaseStorage) {
      // Production initialization from environment variables
      console.log('Firebase Admin: Initializing for production...');
      
      // Check for service account JSON first
      const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      
      if (serviceAccountJson) {
        // Use JSON from environment variable
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
      } else {
        // Fall back to individual environment variables
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
    }
    console.log('Firebase Admin initialized successfully.');

  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    if (isUsingFirebaseStorage) {
      console.warn('Firebase Admin could not be initialized. Firebase storage features will not work.');
    }
  }
}

initializeFirebaseAdmin();

export const storage = admin.apps.length ? admin.storage() : null;
export default admin;
