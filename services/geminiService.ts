
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Medicine } from "../types";

// Standard decoding as per guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePrescription = async (base64: string, language: string) => {
  const ai = getClient();
  const prompt = `Act as a senior medical pharmacist. Analyze this prescription image.
  Extract ALL medications with these details: name, dosage (e.g. 500mg), frequency (e.g. twice daily), and specific time of day (Morning, Afternoon, Evening, Night).
  Also provide a warm, helpful summary of the treatment plan in ${language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'}.
  Ensure the summary is easy to understand for an elderly person.
  Return results in JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [{
        parts: [
          { inlineData: { data: base64, mimeType: "image/jpeg" } },
          { text: prompt }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            medicines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  frequency: { type: Type.STRING },
                  time: { type: Type.STRING }
                },
                required: ["name", "dosage", "frequency", "time"]
              }
            },
            summary: { type: Type.STRING }
          },
          required: ["medicines", "summary"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return {
      medicines: (data.medicines || []).map((m: any) => ({ 
        ...m, 
        status: 'pending' 
      })),
      summary: data.summary || ""
    };
  } catch (error) {
    console.error("Prescription Analysis failed:", error);
    throw error;
  }
};

export const playAiVoice = async (text: string, onEnded?: () => void) => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      if (onEnded) onEnded();
      return;
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const decoded = decode(audioBase64);
    const buffer = await decodeAudioData(decoded, audioCtx, 24000, 1);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    
    if (onEnded) {
      source.addEventListener('ended', onEnded);
    }
    
    source.start();
    return source;
  } catch (error) {
    console.error("TTS failed:", error);
    if (onEnded) onEnded();
  }
};
