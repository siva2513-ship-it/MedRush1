
export const speakText = (text: string, language: string) => {
  if (!window.speechSynthesis) {
    console.error("Speech synthesis not supported in this browser.");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Mapping language codes
  const langMap: Record<string, string> = {
    'en': 'en-US',
    'te': 'te-IN',
    'hi': 'hi-IN'
  };
  
  utterance.lang = langMap[language] || 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Webkit browsers sometimes need a kickstart
  // and voices might not be loaded immediately
  const speak = () => {
    // Some browsers need a short delay after cancel
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = speak;
  } else {
    speak();
  }

  utterance.onerror = (event) => {
    console.error("SpeechSynthesisUtterance error", event);
    // Attempt one retry if it's a 'not-allowed' error (user interaction usually required)
    if (event.error === 'not-allowed') {
       console.warn("Speech blocked. Ensure user interaction occurred.");
    }
  };
};
