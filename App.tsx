import { signInWithPhoneNumber } from "firebase/auth";
import { setupRecaptcha } from "./firebase";
import React, { useState } from 'react';
import { Language, Role, User, Medicine, Patient as PatientType, Translation } from './types';
import { TRANSLATIONS } from './constants';
import Logo from './components/Logo';
import { analyzePrescription } from './services/geminiService';
import { speakText } from './services/speechService';
// Import firebase services for future use
import { auth, db, storage } from './firebase';
import { doc, setDoc, collection, getDocs } from "firebase/firestore";


const App: React.FC = () => {
  const MAX_USERS = 4;
  const [step, setStep] = useState<'onboarding' | 'language' | 'role' | 'login' | 'dashboard' | 'settings'>('onboarding');
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [patients, setPatients] = useState<PatientType[]>([]);
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [recaptcha, setRecaptcha] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', hospital: '', relation: '', patientPhone: '' });

  const t = TRANSLATIONS[language];

  const handleLogout = () => {
    setUser(null);
    setRole(null);
    setMedicines([]);
    setPatients([]);
    setSummary('');
    setStep('onboarding');
  };

  const triggerAiCall = (pName: string) => {
    alert(`📞 MedRush AI: Initiating an automated voice call to ${pName} for medicine reminder.`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setSummary('');
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const result = await analyzePrescription(base64, language);
        setMedicines(result.medicines);
        setSummary(result.summary);
        await setDoc(doc(db, "prescriptions", user?.phone || "unknown"), {
          medicines: result.medicines,
          summary: result.summary,
          createdAt: new Date()
        });

      } catch (err) {
        alert("Failed to analyze prescription. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!role) return;

    try {
        if (!confirmationResult) {
        alert("Please send OTP first");
        return;
      }

      await confirmationResult.confirm(otp);

      // 🔹 Hackathon limit check
      const snapshot = await getDocs(collection(db, "users"));
      if (snapshot.size >= MAX_USERS) {
        alert("Hackathon demo supports only 4 users");
        return;
      }

      const userData = {
        name: formData.name,
        phone: formData.phone,
        hospitalName: formData.hospital || "",
        role: role,
        language: language,
        createdAt: new Date()
      };

      await setDoc(doc(db, "users", formData.phone), userData);

      setUser(userData);
      setStep('dashboard');

    } catch (err) {
      alert("Login failed");
    }
  };


  const renderMedicineItem = (med: Medicine, idx: number) => (
    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-all">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center font-bold text-xl">
          {med.name.charAt(0)}
        </div>
        <div>
          <h4 className="font-bold text-gray-800">{med.name}</h4>
          <p className="text-sm text-gray-500">{med.dosage} • {med.frequency}</p>
          <p className="text-xs text-blue-600 mt-1 font-semibold">🕒 {med.time}</p>
        </div>
      </div>
      <div className="text-right">
        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
          med.status === 'taken' ? 'bg-green-100 text-green-700' : 
          med.status === 'missed' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
        }`}>
          {t[med.status as keyof Translation] || med.status}
        </span>
      </div>
    </div>
  );

  const renderPatientDashboard = () => {
    const morningMeds = medicines.filter(m => /morning|breakfast|am|day/i.test(m.time.toLowerCase()));
    const afternoonMeds = medicines.filter(m => /afternoon|lunch|noon/i.test(m.time.toLowerCase()));
    const eveningMeds = medicines.filter(m => /evening|dinner|night|pm/i.test(m.time.toLowerCase()));
    const otherMeds = medicines.filter(m => 
      !morningMeds.includes(m) && 
      !afternoonMeds.includes(m) && 
      !eveningMeds.includes(m)
    );

    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">{t.uploadPrescription}</h2>
          <div className="relative group">
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center group-hover:border-blue-400 transition-all bg-gray-50/50">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Scan Prescription Now</p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="bg-blue-50 p-8 rounded-3xl flex flex-col items-center space-y-4 animate-pulse border border-blue-100">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-700 font-bold">{t.scanning}</span>
          </div>
        )}

        {summary && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-emerald-100 space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📝</span>
              <h3 className="text-emerald-800 font-bold text-lg">{t.summaryTitle}</h3>
            </div>
            
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-50">
              
               <p className="text-emerald-800 text-lg leading-relaxed italic">"{summary}"</p>
            </div>

            <div className="flex flex-col space-y-3 pt-2">
              <button 
                onClick={() => speakText(summary, language)}
                className="flex items-center justify-center space-x-3 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-md hover:bg-emerald-700 transition-colors"
              >
                <span>🔊</span>
                <span>{t.readAloud}</span>
              </button>
              <button 
                onClick={() => triggerAiCall(user?.name || 'Patient')}
                className="flex items-center justify-center space-x-3 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-md hover:bg-blue-700 transition-colors"
              >
                <span>📞</span>
                <span>{t.callReminder}</span>
              </button>
            </div>
          </div>
        )}

        {medicines.length > 0 && (
          <div className="space-y-8">
            {/* Morning Section */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 pl-2">
                <span className="text-xl">☀️</span>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t.morning}</h3>
              </div>
              {morningMeds.length > 0 ? (
                morningMeds.map((med, idx) => renderMedicineItem(med, idx))
              ) : (
                <p className="text-xs text-gray-400 italic pl-2">No medicines scheduled</p>
              )}
            </div>

            {/* Afternoon Section */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 pl-2">
                <span className="text-xl">🌤️</span>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t.afternoon}</h3>
              </div>
              {afternoonMeds.length > 0 ? (
                afternoonMeds.map((med, idx) => renderMedicineItem(med, idx))
              ) : (
                <p className="text-xs text-gray-400 italic pl-2">No medicines scheduled</p>
              )}
            </div>

            {/* Evening Section */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 pl-2">
                <span className="text-xl">🌙</span>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t.evening}</h3>
              </div>
              {eveningMeds.length > 0 ? (
                eveningMeds.map((med, idx) => renderMedicineItem(med, idx))
              ) : (
                <p className="text-xs text-gray-400 italic pl-2">No medicines scheduled</p>
              )}
            </div>

            {/* Others Section */}
            {otherMeds.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 pl-2">
                  <span className="text-xl">📅</span>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t.others}</h3>
                </div>
                {otherMeds.map((med, idx) => renderMedicineItem(med, idx))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderOnboarding = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <Logo />
      <p className="mt-4 text-gray-500 max-w-xs">AI-powered healthcare companion for your family.</p>
      <button 
        onClick={() => setStep('language')}
        className="mt-12 px-10 py-4 bg-blue-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95"
      >
        {t.startCare}
      </button>
    </div>
  );

  const renderLanguageSelection = (isSettings = false) => (
    <div className={`flex flex-col items-center justify-center ${isSettings ? '' : 'min-h-screen'} p-6`}>
      <h2 className="text-2xl font-bold text-gray-800 mb-8">{t.chooseLanguage}</h2>
      <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
        {[
          { label: 'English', val: Language.ENGLISH },
          { label: 'తెలుగు (Telugu)', val: Language.TELUGU },
          { label: 'हिन्दी (Hindi)', val: Language.HINDI }
        ].map(lang => (
          <button
            key={lang.val}
            onClick={() => { 
              setLanguage(lang.val); 
              if (!isSettings) setStep('role'); 
            }}
            className={`p-6 rounded-2xl border-2 transition-all flex justify-between items-center ${
              language === lang.val ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' : 'border-gray-100 bg-white text-gray-700 hover:border-blue-200'
            }`}
          >
            <span className="text-lg font-medium">{lang.label}</span>
            <div className={`w-6 h-6 rounded-full border-2 ${language === lang.val ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}></div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto p-6 pb-24 space-y-8">
      <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
      
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Preference</h3>
        {renderLanguageSelection(true)}
      </section>

      <section className="space-y-4">
        <button 
          onClick={handleLogout}
          className="w-full p-5 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center justify-center space-x-2 border border-red-100 hover:bg-red-100 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </section>
    </div>
  );

  const renderRoleSelection = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-8">{t.whoAreYou}</h2>
      <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
        {[
          { label: t.patient, role: Role.PATIENT, icon: '👤' },
          { label: t.caretaker, role: Role.CARETAKER, icon: '👨‍👩‍👧' },
          { label: t.nurse, role: Role.NURSE, icon: '🏥' }
        ].map(r => (
          <button
            key={r.role}
            onClick={() => { setRole(r.role); setStep('login'); }}
            className="p-6 rounded-2xl border-2 border-gray-100 bg-white flex items-center space-x-4 hover:border-blue-300 transition-all text-left group"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform">{r.icon}</span>
            <span className="text-xl font-semibold text-gray-800">{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.login}</h2>
        <p className="text-gray-500 mb-6 capitalize">{role}</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          {role === Role.NURSE && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.hospital}</label>
              <input 
                required 
                type="text" 
                value={formData.hospital}
                onChange={e => setFormData({...formData, hospital: e.target.value})}
                placeholder="City General Hospital" 
                className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.name}</label>
            <input 
              required 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Name" 
              className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone}</label>
            <input 
              required 
              type="tel" 
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              placeholder="Phone Number" 
              className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                onClick={async () => {
                  try {

                  let verifier = recaptcha;

                  if (!verifier) {
                    verifier = setupRecaptcha("recaptcha-container");
                    setRecaptcha(verifier);
                  }

                  const result = await signInWithPhoneNumber(
                  auth,
                  "+91" + formData.phone,
                  verifier
                );

                setConfirmationResult(result);
                alert("OTP Sent");

                } catch (err) {
                  alert("OTP Failed");
                }
            }}


                const result = await signInWithPhoneNumber(
                  auth,
                  "+91" + formData.phone,
                  recaptcha
                );

                setConfirmationResult(result);
                alert("OTP Sent");

              } catch (err) {
                alert("OTP Failed");
              }
            }}
            className="w-full py-3 bg-gray-100 rounded-xl font-bold"
          >
            Send OTP
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.otp}</label>
            <input 
              required 
              type="text" 
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value)}
              placeholder="123456" 
              className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center text-xl tracking-widest" 
            />
          </div>
          <div id="recaptcha-container"></div>
          <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all mt-4">
            {t.verify}
          </button>
        </form>
      </div>
    </div>
  );

  const renderCaretakerDashboard = () => (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4">{t.addRelative}</h2>
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder={t.relation} 
            value={formData.relation}
            onChange={e => setFormData({...formData, relation: e.target.value})}
            className="w-full p-4 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            type="tel" 
            placeholder={t.patientPhone} 
            value={formData.patientPhone}
            onChange={e => setFormData({...formData, patientPhone: e.target.value})}
            className="w-full p-4 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={async () => {
            if (!formData.relation || !formData.patientPhone) return;

            await setDoc(doc(db, "links", formData.patientPhone), {
              caretakerPhone: user?.phone,
              relation: formData.relation
            });

            alert("Patient Linked Successfully");

            setFormData({...formData, relation: '', patientPhone: ''});
          }}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          {t.add}
        </button>

        </div>
      </div>

      <div className="space-y-6">
        {patients.map(p => (
          <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                  AS
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{p.name}</h3>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{p.relation}</p>
                </div>
              </div>
              <button 
                onClick={() => triggerAiCall(p.name)}
                className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors"
                title={t.callReminder}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              {p.medicines.map((m, idx) => (
                <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${m.status === 'missed' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div>
                    <p className={`font-bold ${m.status === 'missed' ? 'text-red-700' : 'text-gray-800'}`}>{m.name}</p>
                    <p className="text-xs text-gray-500">{m.time}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                     {m.status === 'missed' && <span className="animate-bounce">⚠️</span>}
                     <span className={`text-[10px] font-black uppercase tracking-widest ${m.status === 'missed' ? 'text-red-600' : 'text-green-600'}`}>
                       {t[m.status as keyof Translation]}
                     </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNurseDashboard = () => (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
       <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{user?.hospitalName}</h2>
            <p className="text-sm text-gray-500 font-medium">Ward 4B • {patients.length} Patients</p>
          </div>
          <button 
            onClick={async () => {
              const phone = prompt("Enter patient phone number");
              if (!phone) return;

              await setDoc(doc(db, "patients", phone), {
                phone,
                addedBy: user?.phone,
                hasCaretaker: false
              });

              alert("Patient Added");
            }}

            className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
          >
            +
          </button>
       </div>

       <div className="space-y-4">
          {patients.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
              {!p.hasCaretaker && (
                <div className="absolute top-0 left-0 w-full bg-red-600 py-1 px-4 text-[9px] font-black text-white uppercase tracking-[0.2em] text-center shadow-sm">
                  {t.noCaretakerAlert}
                </div>
              )}
              <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center font-bold">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{p.name}</h3>
                    <p className="text-xs text-gray-500">{p.phone}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                   <button className="p-3 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100">✏️</button>
                   <button className="p-3 bg-red-50 rounded-xl text-red-600 hover:bg-red-100" onClick={() => setPatients(patients.filter(x => x.id !== p.id))}>🗑️</button>
                </div>
              </div>
              
              <div className="mt-6 flex flex-wrap gap-2">
                 <button className="text-[10px] font-black uppercase tracking-wider px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100">+ Add Medicine</button>
                 <button className="text-[10px] font-black uppercase tracking-wider px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100">History</button>
              </div>
            </div>
          ))}
       </div>
    </div>
  );

  return (
    <div className="min-h-screen medical-gradient text-gray-900 overflow-x-hidden font-sans">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <button 
          onClick={() => step !== 'onboarding' && setStep('dashboard')}
          className="flex items-center space-x-2"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tighter text-gray-800">{t.appName}</span>
        </button>
        {user && (
          <div className="flex items-center space-x-3">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-black text-gray-800 leading-none">{user.name}</p>
               <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">{role}</p>
             </div>
             <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                <span className="text-sm font-bold text-blue-600 uppercase">{user.name.substring(0, 2)}</span>
             </div>
          </div>
        )}
      </header>

      <main className="pb-10">
        {step === 'onboarding' && renderOnboarding()}
        {step === 'language' && renderLanguageSelection()}
        {step === 'role' && renderRoleSelection()}
        {step === 'login' && renderLogin()}
        {step === 'dashboard' && role === Role.PATIENT && renderPatientDashboard()}
        {step === 'dashboard' && role === Role.CARETAKER && renderCaretakerDashboard()}
        {step === 'dashboard' && role === Role.NURSE && renderNurseDashboard()}
        {step === 'settings' && renderSettings()}
      </main>

      {user && (
        <nav className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 px-8 py-4 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
           <button 
             onClick={() => setStep('dashboard')}
             className={`flex flex-col items-center space-y-1 ${step === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}
           >
             <svg className="w-6 h-6" fill={step === 'dashboard' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
             </svg>
             <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
           </button>
           
           <button 
             onClick={() => setStep('settings')}
             className={`flex flex-col items-center space-y-1 ${step === 'settings' ? 'text-blue-600' : 'text-gray-400'}`}
           >
             <svg className="w-6 h-6" fill={step === 'settings' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
             <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>
           </button>
        </nav>
      )}
    </div>
  );
};

export default App;
