import * as admin from 'firebase-admin';
import { isEmulator } from './env-check';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    if (isEmulator()) {
      // For emulator
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: 'demo-project',
          clientEmail: 'firebase-adminsdk@demo-project.iam.gserviceaccount.com',
          privateKey: 'demo-key'
        }),
        storageBucket: 'demo-bucket'
      });
    } else {
      // For production/development, use environment variables
      if (!process.env.FIREBASE_PRIVATE_KEY) {
        throw new Error('FIREBASE_PRIVATE_KEY environment variable is not set');
      }
      
      const serviceAccountData = {
        projectId: process.env.FIREBASE_PROJECT_ID || 'hestiaguard',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@hestiaguard.iam.gserviceaccount.com',
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      };
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountData),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'hestiaguard.appspot.com'
      });


      console.log('Firebase Admin initialized with environment variables');
      console.log(process.env.FIREBASE_PRIVATE_KEY)
      console.log(process.env.FIREBASE_STORAGE_BUCKET)
      console.log(process.env.FIREBASE_PROJECT_ID)
      console.log(process.env.FIREBASE_CLIENT_EMAIL)
      console.log(process.env.FIREBASE_PRIVATE_KEY)

    }
    
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    // Instead of throwing, log the error and continue
    // This prevents build failures when env vars are not set
    console.warn('Firebase Admin could not be initialized. File uploads will not work.');
  }
}

export const storage = admin.storage();
export default admin;
