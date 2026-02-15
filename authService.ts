
import { auth, db } from './firebase';
import { 
  signInWithPhoneNumber, 
  ConfirmationResult,
  UserCredential,
  ApplicationVerifier
} from 'firebase/auth';
import { 
  doc, 
  setDoc 
} from 'firebase/firestore';
import { Role } from './types';

/**
 * Sends a verification code to the provided phone number.
 * @param phoneNumber The user's phone number in E.164 format (e.g., +919876543210).
 * @param appVerifier A Firebase ApplicationVerifier (usually RecaptchaVerifier).
 * @returns A promise that resolves to a ConfirmationResult object.
 */
export const sendOtp = async (
  phoneNumber: string, 
  appVerifier: ApplicationVerifier
): Promise<ConfirmationResult> => {
  try {
    // In a production environment, ensure the phone number is properly formatted.
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    return confirmationResult;
  } catch (error) {
    console.error("AuthService: Error sending OTP", error);
    throw error;
  }
};

/**
 * Verifies the OTP code entered by the user.
 * @param confirmationResult The result object returned from sendOtp.
 * @param otp The 6-digit verification code entered by the user.
 * @returns A promise that resolves to the UserCredential.
 */
export const verifyOtp = async (
  confirmationResult: ConfirmationResult, 
  otp: string
): Promise<UserCredential> => {
  try {
    const userCredential = await confirmationResult.confirm(otp);
    return userCredential;
  } catch (error) {
    console.error("AuthService: Error verifying OTP", error);
    throw error;
  }
};

/**
 * Creates or updates a user document in Firestore with their unique role.
 * Document path: users/{uid}
 * @param userId The unique Firebase UID of the user.
 * @param phoneNumber The verified phone number.
 * @param role The user's role (patient, caretaker, or nurse).
 */
export const createOrUpdateUser = async (
  userId: string, 
  phoneNumber: string, 
  role: Role
): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      uid: userId,
      phone: phoneNumber,
      role: role,
      createdAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("AuthService: Error storing user data in Firestore", error);
    throw error;
  }
};
