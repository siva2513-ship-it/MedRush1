
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  arrayUnion, 
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Patient, Medicine } from './types';

/**
 * Finds a patient by phone number or creates a new record if not found.
 * @param patientPhone The patient's phone number.
 * @returns The ID of the patient document.
 */
async function getOrCreatePatient(patientPhone: string): Promise<string> {
  const patientsRef = collection(db, 'patients');
  const q = query(patientsRef, where('phone', '==', patientPhone));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].id;
  }

  // Create new patient record
  const newPatient = {
    name: 'New Patient', // Default name until updated
    phone: patientPhone,
    medicines: [],
    caretakerIds: [],
    nurseIds: [],
    hasCaretaker: false,
    createdAt: new Date().toISOString()
  };

  const docRef = await addDoc(patientsRef, newPatient);
  return docRef.id;
}

/**
 * Links a caretaker to a patient using the patient's phone number.
 * @param caretakerId The UID of the caretaker.
 * @param patientPhone The phone number of the patient.
 */
export const linkCaretakerToPatient = async (caretakerId: string, patientPhone: string): Promise<void> => {
  try {
    const patientId = await getOrCreatePatient(patientPhone);
    const patientDocRef = doc(db, 'patients', patientId);
    
    await updateDoc(patientDocRef, {
      caretakerIds: arrayUnion(caretakerId),
      hasCaretaker: true
    });
  } catch (error) {
    console.error("UserLinkService: Error linking caretaker to patient", error);
    throw error;
  }
};

/**
 * Links a nurse to a patient using the patient's phone number.
 * @param nurseId The UID of the nurse.
 * @param patientPhone The phone number of the patient.
 */
export const linkNurseToPatient = async (nurseId: string, patientPhone: string): Promise<void> => {
  try {
    const patientId = await getOrCreatePatient(patientPhone);
    const patientDocRef = doc(db, 'patients', patientId);
    
    await updateDoc(patientDocRef, {
      nurseIds: arrayUnion(nurseId)
    });
  } catch (error) {
    console.error("UserLinkService: Error linking nurse to patient", error);
    throw error;
  }
};

/**
 * Retrieves all patients linked to a specific caretaker.
 * @param caretakerId The UID of the caretaker.
 * @returns An array of Patient objects.
 */
export const getPatientsForCaretaker = async (caretakerId: string): Promise<Patient[]> => {
  try {
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, where('caretakerIds', 'array-contains', caretakerId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Patient));
  } catch (error) {
    console.error("UserLinkService: Error fetching patients for caretaker", error);
    throw error;
  }
};

/**
 * Retrieves all patients linked to a specific nurse.
 * @param nurseId The UID of the nurse.
 * @returns An array of Patient objects.
 */
export const getPatientsForNurse = async (nurseId: string): Promise<Patient[]> => {
  try {
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, where('nurseIds', 'array-contains', nurseId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Patient));
  } catch (error) {
    console.error("UserLinkService: Error fetching patients for nurse", error);
    throw error;
  }
};
