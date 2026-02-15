import { uploadPrescription, storeMedicines } from './prescriptionService';
import { extractMedicinesFromPrescription, generateVoiceFromSummary } from './aiService';

export const processPrescription = async (file: File, patientPhone: string) => {
  try {

    // 1️⃣ Upload to Firebase
    const imageUrl = await uploadPrescription(file, patientPhone);

    // 2️⃣ Send to Affindo OCR
    const { medicines, summary } = await extractMedicinesFromPrescription(imageUrl);

    // 3️⃣ Store Medicines in Firestore
    await storeMedicines(patientPhone, medicines, imageUrl);

    // 4️⃣ Generate Voice Summary using Sarvam
    const audioUrl = await generateVoiceFromSummary(summary);

    return {
      medicines,
      summary,
      audioUrl
    };

  } catch (error) {
    console.error("Prescription Flow Error:", error);
    return null;
  }
};
