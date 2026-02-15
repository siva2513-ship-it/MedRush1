import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { Patient } from './types';

/**
 * Listens to real-time updates for a single patient's data.
 * @param patientId The unique ID of the patient.
 * @param callback Function to handle the updated patient data.
 * @returns An unsubscribe function to stop listening.
 */
export const listenToPatientData = (
  patientId: string, 
  callback: (data: Patient | null) => void
): Unsubscribe => {
  const docRef = doc(db, 'patients', patientId);
  return onSnapshot(
    docRef, 
    (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as Patient);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("RealtimeService: Error listening to patient data", error);
    }
  );
};

/**
 * Listens to real-time updates for all patients linked to a specific caretaker.
 * @param caretakerId The UID of the caretaker.
 * @param callback Function to handle the updated list of patients.
 * @returns An unsubscribe function to stop listening.
 */
export const listenToCaretakerPatients = (
  caretakerId: string, 
  callback: (patients: Patient[]) => void
): Unsubscribe => {
  const patientsRef = collection(db, 'patients');
  const q = query(patientsRef, where('caretakerIds', 'array-contains', caretakerId));

  return onSnapshot(
    q, 
    (snapshot) => {
      const patients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Patient));
      callback(patients);
    },
    (error) => {
      console.error("RealtimeService: Error listening to caretaker patients", error);
    }
  );
};

/**
 * Listens to real-time updates for all patients linked to a specific nurse.
 * @param nurseId The UID of the nurse.
 * @param callback Function to handle the updated list of patients.
 * @returns An unsubscribe function to stop listening.
 */
export const listenToNursePatients = (
  nurseId: string, 
  callback: (patients: Patient[]) => void
): Unsubscribe => {
  const patientsRef = collection(db, 'patients');
  const q = query(patientsRef, where('nurseIds', 'array-contains', nurseId));

  return onSnapshot(
    q, 
    (snapshot) => {
      const patients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Patient));
      callback(patients);
    },
    (error) => {
      console.error("RealtimeService: Error listening to nurse patients", error);
    }
  );
};
