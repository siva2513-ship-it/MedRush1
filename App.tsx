
import React, { useState, useEffect, useRef } from 'react';
import { Language, Role, User, Medicine, Patient as PatientType, Translation } from './types';
import { TRANSLATIONS } from './constants';
import Logo from './components/Logo';
import { analyzePrescription, generateAiVoice } from './services/geminiService';
import { speakText } from './services/speechService';

const App: React.FC = () => {
  const [step, setStep] = useState<'onboarding' | 'language' | 'role' | 'login' | 'dashboard' | 'settings'>('onboarding');
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [patients, setPatients] = useState<PatientType[]>([]);
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({ name: '', phone: '', hospital: '', relation: '', patientPhone: '' });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Call States
  const [callState, setCallState] = useState<'idle' | 'incoming' | 'active'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const callIntervalRef = useRef<number | null>(null);

  const t = TRANSLATIONS[language];

  useEffect(() => {
    if (callState === 'active') {
      callIntervalRef.current = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
      setCallDuration(0);
    }
    return () => { if (callIntervalRef.current) clearInterval(callIntervalRef.current); };
  }, [callState]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogout = () => {
    setUser(null);
    setRole(null);
    setMedicines([]);
    setPatients([]);
    setSummary('');
    setPreviewImage(null);
    setStep('onboarding');
  };

  const initiateTestCall = () => {
    setCallState('incoming');
  };

  const answerCall = async () => {
    setCallState('active');
    // Start AI Voice using Gemini TTS
    if (summary) {
      await generateAiVoice(`Hello ${user?.name || 'Patient'}. This is your MedRush AI assistant. I have processed your prescription. ${summary}. Please ensure you take your medications on time as shown in the app. Have a healthy day!`, () => {
        setTimeout(() => setCallState('idle'), 2000);
      });
    }
  };

  const declineCall = () => {
    setCallState('idle');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setSummary('');
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      setPreviewImage(base64Data);
      const base64 = base64Data.split(',')[1];
      try {
        const result = await analyzePrescription(base64, language);
        setMedicines(result.medicines);
        setSummary(result.summary);
        // Automatically trigger test call after 1.5 seconds of successful analysis
        setTimeout(() => initiateTestCall(), 1500);
      } catch (err) {
        alert("Failed to analyze prescription. Please ensure the photo is clear and try again.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '123456') {
      alert("Verification failed. Please use dummy OTP: 123456");
      return;
    }
    setUser({
      name: formData.name,
      phone: formData.phone,
      hospitalName: formData.hospital,
      role: role!
    });
    setStep('dashboard');
  };

  const renderMedicineItem = (med: Medicine, idx: number, theme: 'morning' | 'afternoon' | 'evening' | 'default' = 'default') => {
    const themeClasses = {
      morning: 'bg-morning-light border-morning-accent/10 hover:border-morning-accent/30',
      afternoon: 'bg-afternoon-light border-afternoon-accent/10 hover:border-afternoon-accent/30',
      evening: 'bg-evening-light border-evening-accent/10 hover:border-evening-accent/30',
      default: 'bg-white border-gray-100 hover:border-blue-200'
    };

    const iconClasses = {
      morning: 'bg-morning-accent/10 text-morning-accent',
      afternoon: 'bg-afternoon-accent/10 text-afternoon-accent',
      evening: 'bg-evening-accent/10 text-evening-accent',
      default: 'bg-blue-50 text-blue-500'
    };

    return (
      <div key={idx} className={`${themeClasses[theme]} p-5 rounded-2xl shadow-medical-sm border flex items-center justify-between group transition-all duration-300`}>
        <div className="flex items-center space-x-4">
          <div className={`${iconClasses[theme]} w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl`}>
            {med.name.charAt(0)}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 leading-tight">{med.name}</h4>
            <p className="text-xs text-gray-500 font-medium">{med.dosage} • {med.frequency}</p>
            <div className="flex items-center space-x-1.5 mt-1.5">
               <span className="text-[10px] uppercase font-bold tracking-tighter opacity-40">Timing</span>
               <p className={`text-[11px] font-bold ${theme === 'default' ? 'text-blue-600' : ''}`} style={{ color: theme === 'default' ? '' : `var(--${theme}-text)` }}>{med.time}</p>
            </div>
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
  };

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
      <div className="max-w-2xl mx-auto p-4 space-y-8 pb-32">
        <div className="bg-white p-8 rounded-[32px] shadow-medical-lg border border-gray-100 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform group-hover:scale-110">
             <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-6">{t.uploadPrescription}</h2>
          
          <div className="relative group/input rounded-3xl overflow-hidden border-2 border-dashed border-medical-100 bg-gray-50/30 min-h-[240px] flex items-center justify-center transition-all duration-500 hover:border-medical-500">
            {previewImage && loading && (
              <div className="absolute inset-0 z-10">
                <img src={previewImage} className="w-full h-full object-cover opacity-40 grayscale" />
                <div className="scanner-beam"></div>
              </div>
            )}
            
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
              disabled={loading}
            />

            {!previewImage && !loading && (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-medical-500 text-white rounded-3xl flex items-center justify-center mb-5 shadow-lg shadow-medical-500/20 transform group-hover/input:rotate-3 transition-transform">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-gray-900 font-bold text-lg">Scan Prescription</p>
                <p className="text-gray-400 text-sm mt-1">AI Google OCR will extract real details</p>
              </div>
            )}

            {loading && (
              <div className="relative z-20 flex flex-col items-center space-y-4">
                 <div className="w-16 h-16 border-4 border-medical-500 border-t-transparent rounded-full animate-spin"></div>
                 <span className="text-medical-700 font-black uppercase tracking-[0.2em] text-xs">Analyzing Prescription...</span>
              </div>
            )}

            {previewImage && !loading && (
               <div className="absolute inset-0 group-hover:opacity-40 transition-opacity">
                  <img src={previewImage} className="w-full h-full object-cover" />
               </div>
            )}
          </div>
        </div>

        {summary && (
          <div className="bg-white p-8 rounded-[32px] shadow-medical-lg border-2 border-emerald-500/10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                </div>
                <h3 className="text-gray-900 font-extrabold text-xl">{t.summaryTitle}</h3>
              </div>
            </div>
            
            <div className="bg-emerald-50/30 p-6 rounded-2xl border border-emerald-50">
               <p className="text-emerald-900 text-lg font-medium leading-relaxed italic">"{summary}"</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button 
                onClick={() => speakText(summary, language)}
                className="flex items-center justify-center space-x-3 py-5 bg-emerald-600 text-white rounded-2xl font-extrabold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <span className="text-xl">🔊</span>
                <span>{t.readAloud}</span>
              </button>
              <button 
                onClick={() => initiateTestCall()}
                className="flex items-center justify-center space-x-3 py-5 bg-medical-600 text-white rounded-2xl font-extrabold shadow-lg shadow-medical-600/20 hover:bg-medical-700 active:scale-95 transition-all"
              >
                <span className="text-xl">📞</span>
                <span>{t.callReminder}</span>
              </button>
            </div>
          </div>
        )}

        {medicines.length > 0 && (
          <div className="space-y-10">
            {/* Morning Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pl-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-morning-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-morning-accent/20">
                    <span className="text-xl">☀️</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t.morning}</h3>
                    <p className="text-lg font-extrabold text-gray-800">Fresh Start</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-morning-light text-morning-accent text-[10px] font-black rounded-full uppercase">{morningMeds.length} Items</span>
              </div>
              <div className="space-y-3">
                {morningMeds.length > 0 ? (
                  morningMeds.map((med, idx) => renderMedicineItem(med, idx, 'morning'))
                ) : (
                  <div className="bg-gray-50/50 border border-dashed border-gray-100 p-8 rounded-3xl text-center">
                    <p className="text-sm text-gray-400 font-bold italic">No medicines scheduled for morning</p>
                  </div>
                )}
              </div>
            </div>

            {/* Afternoon Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pl-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-afternoon-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-afternoon-accent/20">
                    <span className="text-xl">🌤️</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t.afternoon}</h3>
                    <p className="text-lg font-extrabold text-gray-800">Mid-Day Care</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-afternoon-light text-afternoon-accent text-[10px] font-black rounded-full uppercase">{afternoonMeds.length} Items</span>
              </div>
              <div className="space-y-3">
                {afternoonMeds.length > 0 ? (
                  afternoonMeds.map((med, idx) => renderMedicineItem(med, idx, 'afternoon'))
                ) : (
                  <div className="bg-gray-50/50 border border-dashed border-gray-100 p-8 rounded-3xl text-center">
                    <p className="text-sm text-gray-400 font-bold italic">No medicines scheduled for afternoon</p>
                  </div>
                )}
              </div>
            </div>

            {/* Evening Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pl-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-evening-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-evening-accent/20">
                    <span className="text-xl">🌙</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t.evening}</h3>
                    <p className="text-lg font-extrabold text-gray-800">Night Routine</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-evening-light text-evening-accent text-[10px] font-black rounded-full uppercase">{eveningMeds.length} Items</span>
              </div>
              <div className="space-y-3">
                {eveningMeds.length > 0 ? (
                  eveningMeds.map((med, idx) => renderMedicineItem(med, idx, 'evening'))
                ) : (
                  <div className="bg-gray-50/50 border border-dashed border-gray-100 p-8 rounded-3xl text-center">
                    <p className="text-sm text-gray-400 font-bold italic">No medicines scheduled for evening</p>
                  </div>
                )}
              </div>
            </div>

            {/* Others Section */}
            {otherMeds.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pl-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-gray-500/20">
                      <span className="text-xl">📅</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t.others}</h3>
                      <p className="text-lg font-extrabold text-gray-800">Additional</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {otherMeds.map((med, idx) => renderMedicineItem(med, idx))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCallOverlay = () => {
    if (callState === 'idle') return null;

    return (
      <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-between py-24 text-white overflow-hidden transition-all duration-500">
        {/* Background Animation */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-b from-medical-500 to-transparent animate-pulse"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className={`w-32 h-32 rounded-full bg-medical-600 flex items-center justify-center text-4xl font-bold shadow-2xl border-4 border-white/10 ${callState === 'incoming' ? 'animate-bounce' : 'animate-float'}`}>
            <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="mt-8 text-3xl font-black tracking-tight">MedRush AI Assistant</h2>
          <p className="mt-2 text-medical-400 font-bold uppercase tracking-widest text-sm">
            {callState === 'incoming' ? 'Incoming Call...' : `Call in progress • ${formatDuration(callDuration)}`}
          </p>
        </div>

        {callState === 'active' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-2">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="w-2 bg-medical-500 rounded-full animate-pulse" style={{ height: `${Math.random() * 40 + 10}px`, animationDelay: `${i * 0.1}s` }}></div>
               ))}
            </div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest">AI is explaining your prescription</p>
          </div>
        )}

        <div className="relative z-10 w-full px-12 max-w-sm flex justify-around">
          {callState === 'incoming' ? (
            <>
              <button 
                onClick={declineCall}
                className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-xl shadow-red-500/30 hover:scale-110 active:scale-90 transition-transform"
              >
                <svg className="w-8 h-8 rotate-[135deg]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 005.505 5.505l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </button>
              <button 
                onClick={answerCall}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-500/30 hover:scale-110 active:scale-90 transition-transform animate-[pulse_1s_infinite]"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 005.505 5.505l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </button>
            </>
          ) : (
            <button 
              onClick={declineCall}
              className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-xl shadow-red-500/30 hover:scale-110 active:scale-90 transition-transform"
            >
              <svg className="w-8 h-8 rotate-[135deg]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 005.505 5.505l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderOnboarding = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <Logo />
      <p className="mt-6 text-gray-500 font-medium max-w-xs leading-relaxed">AI-powered healthcare companion for your family’s well-being.</p>
      <button 
        onClick={() => setStep('language')}
        className="mt-16 px-12 py-5 bg-medical-600 text-white rounded-3xl font-extrabold shadow-2xl shadow-medical-600/30 hover:bg-medical-700 transition-all transform hover:scale-105 active:scale-95 text-lg"
      >
        {t.startCare}
      </button>
    </div>
  );

  const renderLanguageSelection = (isSettings = false) => (
    <div className={`flex flex-col items-center justify-center ${isSettings ? '' : 'min-h-screen'} p-6`}>
      <h2 className="text-3xl font-black text-gray-900 mb-10 tracking-tight text-center">{t.chooseLanguage}</h2>
      <div className="grid grid-cols-1 gap-5 w-full max-w-sm">
        {[
          { label: 'English', val: Language.ENGLISH, desc: 'Global support' },
          { label: 'తెలుగు (Telugu)', val: Language.TELUGU, desc: 'ప్రాంతీయ మద్దతు' },
          { label: 'हिन्दी (Hindi)', val: Language.HINDI, desc: 'स्थानीय समर्थन' }
        ].map(lang => (
          <button
            key={lang.val}
            onClick={() => { 
              setLanguage(lang.val); 
              if (!isSettings) setStep('role'); 
            }}
            className={`p-6 rounded-[28px] border-2 transition-all duration-300 flex justify-between items-center ${
              language === lang.val 
              ? 'border-medical-500 bg-medical-50 text-medical-700 shadow-xl shadow-medical-500/10' 
              : 'border-gray-100 bg-white text-gray-700 hover:border-medical-200'
            }`}
          >
            <div className="text-left">
              <span className="text-xl font-extrabold block">{lang.label}</span>
              <span className="text-[11px] font-bold uppercase tracking-widest opacity-50">{lang.desc}</span>
            </div>
            <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${language === lang.val ? 'bg-medical-500 border-medical-500 shadow-lg shadow-medical-500/30' : 'border-gray-200'}`}>
               {language === lang.val && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderRoleSelection = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h2 className="text-3xl font-black text-gray-900 mb-10 tracking-tight text-center">{t.whoAreYou}</h2>
      <div className="grid grid-cols-1 gap-5 w-full max-w-sm">
        {[
          { label: t.patient, role: Role.PATIENT, icon: '👤', desc: 'Manage your medications' },
          { label: t.caretaker, role: Role.CARETAKER, icon: '👨‍👩‍👧', desc: 'Track family prescriptions' },
          { label: t.nurse, role: Role.NURSE, icon: '🏥', desc: 'Professional patient monitoring' }
        ].map(r => (
          <button
            key={r.role}
            onClick={() => { setRole(r.role); setStep('login'); }}
            className="p-6 rounded-[28px] border-2 border-gray-100 bg-white flex items-center space-x-5 hover:border-medical-400 hover:shadow-xl hover:shadow-medical-500/5 transition-all text-left group"
          >
            <div className="text-4xl p-4 bg-gray-50 rounded-3xl group-hover:bg-medical-50 group-hover:scale-110 transition-all duration-500">{r.icon}</div>
            <div>
              <span className="text-xl font-extrabold text-gray-900 block leading-none mb-1">{r.label}</span>
              <span className="text-xs font-medium text-gray-400">{r.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-sm bg-white p-10 rounded-[40px] shadow-medical-lg border border-gray-100">
        <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter">{t.login}</h2>
        <p className="text-medical-600 font-black uppercase text-[10px] tracking-widest mb-10 bg-medical-50 inline-block px-3 py-1 rounded-full">{role}</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <input 
            required 
            type="text" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="Name" 
            className="w-full p-5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-medical-500 focus:bg-white transition-all outline-none font-bold" 
          />
          <input 
            required 
            type="tel" 
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            placeholder="Phone Number" 
            className="w-full p-5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-medical-500 focus:bg-white transition-all outline-none font-bold" 
          />
          <input 
            required 
            type="text" 
            maxLength={6}
            value={otp}
            onChange={e => setOtp(e.target.value)}
            placeholder="OTP: 123456" 
            className="w-full p-5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-medical-500 focus:bg-white transition-all outline-none font-black text-center text-3xl tracking-[0.5em]" 
          />
          <button type="submit" className="w-full py-5 bg-medical-600 text-white rounded-[28px] font-black shadow-xl shadow-medical-500/20 hover:bg-medical-700 active:scale-95 transition-all mt-4 text-lg">
            {t.verify}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen medical-gradient text-gray-900 overflow-x-hidden font-sans">
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-gray-100 px-6 py-5 flex items-center justify-between shadow-sm">
        <button 
          onClick={() => step !== 'onboarding' && setStep('dashboard')}
          className="flex items-center space-x-3 transition-transform active:scale-95"
        >
          <div className="w-10 h-10 bg-medical-600 rounded-2xl flex items-center justify-center shadow-xl shadow-medical-500/30 transform -rotate-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tighter text-gray-900">{t.appName}</span>
        </button>
        {user && (
          <div className="flex items-center space-x-4">
             <button 
               onClick={() => setStep('settings')}
               className="w-12 h-12 bg-white rounded-[18px] flex items-center justify-center border-2 border-gray-50 shadow-medical-sm overflow-hidden group hover:border-medical-200 transition-all"
             >
                <span className="text-sm font-black text-medical-600 group-hover:scale-110 transition-transform uppercase">{user.name.substring(0, 2)}</span>
             </button>
          </div>
        )}
      </header>

      <main className="pt-6 pb-20 max-w-4xl mx-auto">
        {step === 'onboarding' && renderOnboarding()}
        {step === 'language' && renderLanguageSelection()}
        {step === 'role' && renderRoleSelection()}
        {step === 'login' && renderLogin()}
        {step === 'dashboard' && role === Role.PATIENT && renderPatientDashboard()}
        {step === 'settings' && (
          <div className="p-8 text-center">
            <button onClick={handleLogout} className="px-8 py-4 bg-red-100 text-red-600 font-black rounded-2xl">Logout Session</button>
          </div>
        )}
      </main>

      {renderCallOverlay()}

      {user && (
        <nav className="fixed bottom-0 left-0 w-full px-6 pb-8 pt-0 pointer-events-none z-50">
           <div className="max-w-md mx-auto bg-gray-900/90 backdrop-blur-xl border border-white/10 p-3 flex justify-around items-center rounded-[32px] pointer-events-auto shadow-2xl">
              <button 
                onClick={() => setStep('dashboard')}
                className={`flex flex-col items-center space-y-1.5 py-2 px-8 rounded-2xl transition-all ${step === 'dashboard' ? 'bg-medical-500 text-white shadow-xl shadow-medical-500/20 scale-105' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <svg className="w-6 h-6" fill={step === 'dashboard' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
              </button>
              
              <div className="w-px h-6 bg-white/10"></div>

              <button 
                onClick={() => setStep('settings')}
                className={`flex flex-col items-center space-y-1.5 py-2 px-8 rounded-2xl transition-all ${step === 'settings' ? 'bg-medical-500 text-white shadow-xl shadow-medical-500/20 scale-105' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <svg className="w-6 h-6" fill={step === 'settings' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[9px] font-black uppercase tracking-widest">Settings</span>
              </button>
           </div>
        </nav>
      )}
    </div>
  );
};

export default App;
