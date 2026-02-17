import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Medicine } from "../types";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
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
};

export const analyzePrescription = async (base64: string, language: string) => {
  const ai = getClient();
  const prompt = `Act as a senior pharmacist. Extract medication details from the prescription image.
  Identify: name, dosage, frequency, and time (Morning, Afternoon, Evening, Bedtime).
  Provide a professional but empathetic one-sentence summary in ${language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'}.
  Return valid JSON.`;

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
      medicines: (data.medicines || []).map((m: any) => ({ ...m, status: 'pending' })),
      summary: data.summary || ""
    };
  } catch (error) {
    console.error("OCR Analysis failed:", error);
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
    if (!audioBase64) return;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const decoded = decodeBase64(audioBase64);
    const buffer = await decodeAudioData(decoded, audioCtx, 24000, 1);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    if (onEnded) source.onended = onEnded;
    source.start();
    return source;
  } catch (error) {
    console.error("TTS failed:", error);
  }
};