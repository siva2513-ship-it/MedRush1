import { RecaptchaVerifier } from "firebase/auth";
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration placeholder
const firebaseConfig = {
  apiKey: "AIzaSyAhrb093-U7RD-YCvuRrbYtKRigQjez12M",
  authDomain: "medrush-7a0ae.firebaseapp.com",
  projectId: "medrush-7a0ae",
  storageBucket: "medrush-7a0ae.firebasestorage.app",
  messagingSenderId: "185733581874",
  appId: "1:185733581874:web:c1cc30bd20ab867c55c02b"
};


// Initialize Firebase with the modular v9 SDK
const app = initializeApp(firebaseConfig);

// Initialize and export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const setupRecaptcha = (containerId: string) => {
  return new RecaptchaVerifier(
    containerId,
    { size: "invisible" },
    auth
  );
};

export default app;
