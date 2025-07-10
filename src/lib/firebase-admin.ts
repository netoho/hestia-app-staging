import * as admin from 'firebase-admin';
import { isEmulator } from './env-check';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // In production, use service account credentials
    if (!isEmulator() && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    } else {
      // For emulator or local development
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk@demo-project.iam.gserviceaccount.com',
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || 'demo-key'
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'demo-bucket'
      });
    }
    
    console.log('Firebase Admin initialized');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export const storage = admin.storage();
export default admin;