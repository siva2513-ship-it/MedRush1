
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { storage, db } from './firebase';
import { Medicine } from './types';

/**
 * Uploads a prescription image to Firebase Storage.
 * Path: prescriptions/{patientId}/{timestamp}_{filename}
 * @param file The file object from an input element.
 * @param patientId The unique ID of the patient.
 * @returns The download URL of the uploaded image.
 */
export const uploadPrescription = async (file: File, patientId: string): Promise<string> => {
  try {
    const storageRef = ref(storage, `prescriptions/${patientId}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error("PrescriptionService: Error uploading file", error);
    throw error;
  }
};

/**
 * Stores extracted medicine data in Firestore.
 * Collection: prescriptions
 * @param patientId The unique ID of the patient.
 * @param medicinesList Array of extracted Medicine objects.
 * @param imageUrl Optional URL to the prescription image in Storage.
 */
export const storeMedicines = async (
  patientId: string, 
  medicinesList: Medicine[],
  imageUrl?: string
): Promise<string> => {
  try {
    const prescriptionsRef = collection(db, 'prescriptions');
    const docRef = await addDoc(prescriptionsRef, {
      patientId,
      medicines: medicinesList,
      imageUrl: imageUrl || null,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("PrescriptionService: Error storing medicines", error);
    throw error;
  }
};

/**
 * Retrieves all prescription records for a specific patient, ordered by date.
 * @param patientId The unique ID of the patient.
 * @returns An array of prescription records.
 */
export const getPatientPrescriptions = async (patientId: string): Promise<any[]> => {
  try {
    const prescriptionsRef = collection(db, 'prescriptions');
    const q = query(
      prescriptionsRef, 
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("PrescriptionService: Error fetching patient prescriptions", error);
    throw error;
  }
};
