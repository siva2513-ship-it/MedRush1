
import { GoogleGenAI, Type } from "@google/genai";
import { Medicine } from "../types";

// Analyze prescription using Gemini 3 Pro for high-accuracy multimodal processing
export const analyzePrescription = async (base64Image: string, language: string): Promise<{ medicines: Medicine[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Analyze this prescription image and extract all medicines. 
  For each medicine, identify: name, dosage, frequency, and time of day. 
  Also provide a simple one-line summary sentence in ${language === 'en' ? 'English' : language === 'te' ? 'Telugu' : 'Hindi'} stating "This prescription includes what to take and when to take." or its translation.`;

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
                required: ["name", "dosage", "frequency", "time"],
                propertyOrdering: ["name", "dosage", "frequency", "time"]
              }
            },
            summary: { type: Type.STRING }
          },
          required: ["medicines", "summary"],
          propertyOrdering: ["medicines", "summary"]
        }
      }
    });

    // The .text property is a getter, not a method.
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
