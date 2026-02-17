
import React, { useState, useEffect, useRef } from 'react';
import { Language, Role, Medicine } from './types';
import { TRANSLATIONS } from './constants';
import Logo from './components/Logo';
import { analyzePrescription, playAiVoice } from './services/geminiService';
import { speakText } from './services/speechService';

const App: React.FC = () => {
  const [step, setStep] = useState<'onboarding' | 'language' | 'role' | 'login' | 'dashboard' | 'settings'>('onboarding');
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState<{name: string; phone: string; role: Role} | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [formData, setFormData] = useState({ name: '', phone: '', otp: '' });
  const [preview, setPreview] = useState<string | null>(null);
  const [callState, setCallState] = useState<'idle' | 'incoming' | 'active'>('idle');
  const [timer, setTimer] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const t = TRANSLATIONS[language];

  useEffect(() => {
    if (callState === 'active') {
      intervalRef.current = window.setInterval(() => setTimer(prev => prev + 1), 1000);
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setTimer(0);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [callState]);

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setPreview(null);
    setSummary('');
    setMedicines([]);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      try {
        const base64Data = dataUrl.split(',')[1];
        const result = await analyzePrescription(base64Data, language);
        setMedicines(result.medicines);
        setSummary(result.summary);
        // Delay the "incoming call" for a natural feeling after scanning
        setTimeout(() => setCallState('incoming'), 1200);
      } catch (err) {
        console.error("Analysis Error:", err);
        alert("OCR failed. Please ensure the prescription is well-lit and clearly legible.");
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      alert("Failed to read image file.");
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return alert("Please fill all fields");
    // Standard dummy OTP for this environment
    if (formData.otp !== '123456' && formData.otp !== '') return alert("Verification Failed. Use 123456");
    
    if (role) {
      setUser({ name: formData.name, phone: formData.phone, role: role });
      setStep('dashboard');
    } else {
      setStep('role');
    }
  };

  const renderBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      taken: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      missed: 'bg-rose-100 text-rose-700 border-rose-200'
    };
    const label = t[status as keyof typeof t] || status;
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${styles[status as keyof typeof styles]}`}>
        {label}
      </span>
    );
  };

  const renderNurseDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="glass-card p-8 rounded-[2.5rem] bg-rose-50/50 border-rose-100">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl shadow-sm">🚨</div>
          <h3 className="text-xl font-black text-rose-900 uppercase tracking-tight">Priority Alerts</h3>
        </div>
        <p className="text-rose-800 font-bold bg-white/60 p-4 rounded-2xl border border-rose-200 shadow-sm">
          {t.noCaretakerAlert}
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="font-black text-xs uppercase tracking-[0.25em] text-slate-400 px-2">Assigned Patients (4)</h3>
        <div className="grid gap-4">
          {[
            { name: "Suresh Rao", status: "Critical", medicines: "3 Active", icon: "SR" },
            { name: "Lakshmi Devi", status: "Stable", medicines: "5 Active", icon: "LD" },
            { name: "Anil Kumar", status: "Stable", medicines: "2 Active", icon: "AK" },
            { name: "Priya V.", status: "Observation", medicines: "1 Active", icon: "PV" }
          ].map((patient, i) => (
            <div key={i} className="glass-card p-6 rounded-[2rem] flex items-center justify-between hover:border-blue-200 transition-all">
              <div className="flex items-center space-x-5">
                <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner uppercase">
                  {patient.icon}
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-lg leading-tight">{patient.name}</h4>
                  <p className="text-sm text-slate-500 font-bold">{patient.medicines}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`w-2 h-2 rounded-full ${patient.status === 'Critical' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">{patient.status}</span>
                  </div>
                </div>
              </div>
              <button className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPatientDashboard = () => (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden group">
        <h2 className="text-2xl font-black mb-6 text-slate-800">{t.uploadPrescription}</h2>
        <div className="relative h-64 rounded-[2rem] border-4 border-dashed border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center hover:border-blue-200 transition-all cursor-pointer">
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            onChange={handleScan} 
            className="absolute inset-0 opacity-0 cursor-pointer z-20" 
            disabled={loading} 
          />
          {preview ? (
            <div className="absolute inset-0 z-10 p-2">
              <img src={preview} alt="Preview" className={`w-full h-full object-cover rounded-[1.5rem] shadow-lg ${loading ? 'opacity-40 grayscale blur-sm' : ''}`} />
              {loading && <div className="scanner-line" />}
            </div>
          ) : (
            <div className="text-center p-8 pointer-events-none">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl text-4xl group-hover:scale-110 transition-transform">📸</div>
              <p className="font-extrabold text-slate-400 text-lg">Tap to Scan Medicines</p>
              <p className="text-sm text-slate-300 font-bold mt-1 tracking-tight">AI will auto-extract dosages</p>
            </div>
          )}
          {loading && (
            <div className="absolute z-30 flex flex-col items-center space-y-4">
               <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
               <div className="font-black text-sm uppercase tracking-widest text-blue-700 animate-pulse bg-white/90 px-6 py-2 rounded-full shadow-lg">{t.scanning}</div>
            </div>
          )}
        </div>
      </div>

      {summary && (
        <div className="bg-emerald-50/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-emerald-100 space-y-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-8 bg-emerald-500 rounded-full" />
            <h3 className="font-black text-emerald-900 text-xl uppercase tracking-tight">{t.summaryTitle}</h3>
          </div>
          <p className="text-emerald-800 font-semibold italic text-xl leading-relaxed">"{summary}"</p>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => speakText(summary, language)} 
              className="flex items-center justify-center space-x-2 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black shadow-lg shadow-emerald-600/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <span>🔊</span> <span>{t.readAloud}</span>
            </button>
            <button 
              onClick={() => setCallState('incoming')} 
              className="flex items-center justify-center space-x-2 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-lg shadow-blue-600/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <span>📞</span> <span>AI Call</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-8 pb-12">
        {medicines.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-xs uppercase tracking-[0.25em] text-slate-400">Medication Routine</h3>
              <span className="text-xs font-bold text-blue-500">{medicines.length} Found</span>
            </div>
            <div className="grid gap-4">
              {medicines.map((m, i) => (
                <div key={i} className="glass-card p-6 rounded-[2rem] flex items-center justify-between group hover:border-blue-200 transition-all">
                  <div className="flex items-center space-x-5">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-lg leading-tight">{m.name}</h4>
                      <p className="text-sm text-slate-500 font-bold">{m.dosage} • {m.frequency}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-blue-400 tracking-tighter">{m.time}</span>
                      </div>
                    </div>
                  </div>
                  {renderBadge(m.status)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          !loading && (
            <div className="text-center py-12 px-6 bg-slate-100/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-black text-lg">No Schedule Extracted Yet</p>
              <p className="text-slate-300 font-bold text-sm mt-1">Scan a physical prescription to start</p>
            </div>
          )
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen medical-gradient pb-24 relative overflow-hidden">
      <header className="sticky top-0 z-40 glass-card px-6 py-4 flex items-center justify-between mx-4 mt-4 rounded-3xl">
        <button onClick={() => user ? setStep('dashboard') : setStep('onboarding')} className="flex items-center space-x-2">
          <div className="w-9 h-9 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="text-xl font-extrabold tracking-tighter text-slate-800">MedRush</span>
        </button>
        {user && (
          <button onClick={() => setStep('settings')} className="w-10 h-10 bg-slate-100 rounded-2xl font-black text-blue-600 border-2 border-white shadow-sm hover:scale-105 transition-transform uppercase">
            {user.name.charAt(0)}
          </button>
        )}
      </header>

      <main className="max-w-xl mx-auto px-6 pt-8 pb-32">
        {step === 'onboarding' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12 animate-in fade-in zoom-in duration-500">
            <Logo />
            <button 
              onClick={() => setStep('language')} 
              className="w-full max-w-xs py-6 bg-blue-600 text-white rounded-[2.5rem] font-extrabold text-lg shadow-2xl shadow-blue-500/40 hover:brightness-110 active:scale-95 transition-all"
            >
              {t.startCare}
            </button>
          </div>
        )}

        {step === 'language' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-black text-center text-slate-800 tracking-tight">{t.chooseLanguage}</h2>
            <div className="grid gap-4">
              {[
                { l: 'English', v: Language.ENGLISH },
                { l: 'తెలుగు (Telugu)', v: Language.TELUGU },
                { l: 'हिन्दी (Hindi)', v: Language.HINDI }
              ].map(lang => (
                <button 
                  key={lang.v} 
                  onClick={() => { setLanguage(lang.v); setStep('role'); }}
                  className="p-6 glass-card rounded-3xl text-left hover:border-blue-500 transition-all group flex items-center justify-between"
                >
                  <span className="text-xl font-bold text-slate-700">{lang.l}</span>
                  <div className="w-8 h-8 rounded-full border-2 border-slate-200 group-hover:border-blue-500 group-hover:bg-blue-500/10 flex items-center justify-center transition-all">
                    <div className="w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100"></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'role' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-black text-center text-slate-800 tracking-tight">{t.whoAreYou}</h2>
            <div className="grid gap-4">
              {[
                { r: Role.PATIENT, l: t.patient, i: '👤', c: 'bg-indigo-50 text-indigo-600' },
                { r: Role.CARETAKER, l: t.caretaker, i: '👨‍👩‍👧', c: 'bg-emerald-50 text-emerald-600' },
                { r: Role.NURSE, l: t.nurse, i: '🏥', c: 'bg-rose-50 text-rose-600' }
              ].map(item => (
                <button 
                  key={item.r} 
                  onClick={() => { setRole(item.r); setStep('login'); }}
                  className="p-6 glass-card rounded-3xl flex items-center space-x-6 hover:border-blue-500 transition-all"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${item.c}`}>{item.i}</div>
                  <span className="text-2xl font-black text-slate-700">{item.l}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'login' && (
          <div className="glass-card p-8 rounded-[3rem] space-y-8 animate-in zoom-in-95 duration-500">
            <h2 className="text-3xl font-black text-slate-800">{t.login}</h2>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Identify Yourself</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={t.name} className="w-full p-5 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold transition-all shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Phone Number</label>
                <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91" className="w-full p-5 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold transition-all shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">OTP Verification</label>
                <input required type="text" maxLength={6} value={formData.otp} onChange={e => setFormData({...formData, otp: e.target.value})} placeholder="123456" className="w-full p-5 rounded-3xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-black text-center text-2xl tracking-[0.5em] transition-all shadow-inner" />
              </div>
              <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-xl hover:brightness-110 active:scale-95 transition-all mt-4">{t.verify}</button>
            </form>
          </div>
        )}

        {step === 'dashboard' && (
          user?.role === Role.NURSE ? renderNurseDashboard() : renderPatientDashboard()
        )}

        {step === 'settings' && (
          <div className="glass-card p-10 rounded-[3.5rem] space-y-8 text-center animate-in zoom-in-95 duration-500">
            <h2 className="text-3xl font-black text-slate-800">Account</h2>
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center text-4xl font-black border-4 border-white shadow-xl mx-auto uppercase">
                {user?.name.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white"></div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 leading-none">{user?.name}</p>
              <p className="text-slate-400 font-bold text-sm mt-2">{user?.phone}</p>
              <div className="mt-2 inline-block px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                {user?.role}
              </div>
            </div>
            <div className="pt-8 space-y-4">
              <button onClick={() => setStep('language')} className="w-full py-5 bg-slate-50 rounded-[1.5rem] font-black text-slate-600 hover:bg-slate-100 transition-colors">Change Preference</button>
              <button onClick={() => {setUser(null); setStep('onboarding');}} className="w-full py-5 bg-rose-50 text-rose-600 rounded-[1.5rem] font-black hover:bg-rose-100 transition-colors">Sign Out</button>
            </div>
          </div>
        )}
      </main>

      {callState !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-between py-24 text-white animate-in fade-in duration-700 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <div className="ripple-circle w-64 h-64" /><div className="ripple-circle w-64 h-64 [animation-delay:1s]" />
          </div>
          <div className="relative z-10 flex flex-col items-center text-center px-6">
            <div className={`w-40 h-40 bg-blue-600 rounded-full flex items-center justify-center border-8 border-white/10 shadow-[0_0_80px_rgba(37,99,235,0.4)] ${callState === 'incoming' ? 'animate-bounce' : 'animate-float'}`}>
              <svg className="w-20 h-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 8l2-2m0 0l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </div>
            <h2 className="mt-12 text-4xl font-black tracking-tight">MedRush AI Care</h2>
            {callState === 'active' ? (
              <div className="mt-6 flex flex-col items-center">
                <span className="text-6xl font-mono font-black text-blue-400 drop-shadow-lg tracking-tighter">
                  {Math.floor(timer/60)}:{(timer%60).toString().padStart(2,'0')}
                </span>
                <p className="mt-3 text-blue-500/60 font-black uppercase tracking-[0.4em] text-xs">Secure Healthcare Line</p>
                <div className="flex space-x-2 mt-12 items-end h-16">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="w-2 bg-blue-500 rounded-full animate-pulse" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s`, opacity: 0.5 + Math.random() * 0.5 }} />
                  ))}
                </div>
              </div>
            ) : <p className="mt-6 text-blue-400 font-black uppercase tracking-[0.5em] text-sm animate-pulse">Establishing Connection...</p>}
          </div>
          <div className="relative z-10 w-full px-12 max-w-sm flex gap-6">
            {callState === 'incoming' ? (
              <>
                <button onClick={() => setCallState('idle')} className="flex-1 py-7 bg-rose-500 rounded-[2.5rem] flex justify-center shadow-2xl active:scale-90 transition-all">
                  <svg className="w-10 h-10 rotate-[135deg] text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 005.505 5.505l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                </button>
                <button 
                  onClick={async () => {
                    setCallState('active');
                    if (summary) {
                      await playAiVoice(summary, () => {
                        // Keep call active for a moment after finishing speech
                        setTimeout(() => setCallState('idle'), 3000);
                      });
                    } else {
                      setTimeout(() => setCallState('idle'), 3000);
                    }
                  }} 
                  className="flex-1 py-7 bg-emerald-500 rounded-[2.5rem] flex justify-center shadow-2xl active:scale-90 transition-all animate-pulse"
                >
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 005.505 5.505l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                </button>
              </>
            ) : (
              <button onClick={() => setCallState('idle')} className="w-full py-7 bg-rose-600/20 border-2 border-rose-500/50 text-rose-500 rounded-[2.5rem] font-black uppercase tracking-[0.4em] active:scale-95 transition-all">
                End Session
              </button>
            )}
          </div>
        </div>
      )}

      {user && (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-40 bg-slate-900/95 backdrop-blur-3xl p-2.5 rounded-[3rem] flex items-center border border-white/10 shadow-2xl">
          <button 
            onClick={() => setStep('dashboard')} 
            className={`flex-1 flex flex-col items-center py-3 rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all ${step === 'dashboard' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Home
          </button>
          <button 
            onClick={() => setStep('settings')} 
            className={`flex-1 flex flex-col items-center py-3 rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all ${step === 'settings' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Profile
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
