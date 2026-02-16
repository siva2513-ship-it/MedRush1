export enum Language {
  ENGLISH = 'en',
  TELUGU = 'te',
  HINDI = 'hi'
}

export enum Role {
  PATIENT = 'patient',
  CARETAKER = 'caretaker',
  NURSE = 'nurse'
}

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  status: 'taken' | 'missed' | 'pending';
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  relation?: string;
  medicines: Medicine[];
  hasCaretaker: boolean;
}

export interface User {
  name: string;
  phone: string;
  hospitalName?: string;
  role: Role;
}

export interface Translation {
  appName: string;
  startCare: string;
  chooseLanguage: string;
  whoAreYou: string;
  patient: string;
  caretaker: string;
  nurse: string;
  login: string;
  name: string;
  phone: string;
  otp: string;
  verify: string;
  hospital: string;
  uploadPrescription: string;
  scanning: string;
  readAloud: string;
  callReminder: string;
  addRelative: string;
  relation: string;
  patientPhone: string;
  add: string;
  dashboard: string;
  status: string;
  missed: string;
  taken: string;
  pending: string;
  summaryTitle: string;
  noCaretakerAlert: string;
  morning: string;
  afternoon: string;
  evening: string;
  others: string;
}