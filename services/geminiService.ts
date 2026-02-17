
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Medicine } from "../types";

// Base64 decoding helper
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// PCM Audio decoding helper
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

// Analyze prescription using Gemini 3 Pro
export const analyzePrescription = async (base64Image: string, language: string): Promise<{ medicines: Medicine[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `You are a Medical Prescription Specialist. Your task is to extract medicine data from the provided image with 100% accuracy.
  
  Instructions:
  1. Identify every medicine listed in the prescription.
  2. For each medicine, extract:
     - 'name': The full name of the medicine.
     - 'dosage': The amount to take.
     - 'frequency': How often.
     - 'time': The specific time of day (Morning, Afternoon, Evening).
  3. Create a warm, empathetic one-line summary sentence in ${language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'} explaining the key routine.
  
  Format the output as a clean JSON object.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
          { text: prompt }
        ]
      },
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
                  time: { type: Type.STRING },
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

    const result = JSON.parse(response.text || "{}");
    return {
      medicines: (result.medicines || []).map((m: any) => ({ ...m, status: 'pending' })),
      summary: result.summary || ""
    };
  } catch (error) {
    console.error("Prescription Analysis Error:", error);
    throw error;
  }
};

// Generate AI voice using Gemini TTS
export const generateAiVoice = async (text: string, onEnded?: () => void) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak in a friendly, professional healthcare assistant voice: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned from Gemini TTS");

    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(
      decodeBase64(base64Audio),
      outputAudioContext,
      24000,
      1,
    );

    const source = outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputAudioContext.destination);
    
    if (onEnded) {
      source.onended = onEnded;
    }

    source.start();
    return source;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
};
