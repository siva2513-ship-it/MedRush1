
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration placeholder - ensure it's not totally empty to avoid SDK errors
const firebaseConfig = {
  apiKey: "AIza-placeholder",
  authDomain: "medrush-placeholder.firebaseapp.com",
  projectId: "medrush-placeholder",
  storageBucket: "medrush-placeholder.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

// Initialize Firebase only if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize and export services with potential null checks in usage
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
