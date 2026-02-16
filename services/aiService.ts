/**
 * aiService.ts
 * Integrates external AI services for OCR, Text-to-Speech, and Automated Voice Calls.
 */

// Fix: Replace import.meta.env with process.env as ImportMeta.env is not supported in this environment
const AFFINDO_API_KEY = process.env.VITE_AFFINDO_API_KEY;
const SARVAM_API_KEY = process.env.VITE_SARVAM_API_KEY;
const VAPI_API_KEY = process.env.VITE_VAPI_API_KEY;
const VAPI_ASSISTANT_ID = process.env.VITE_VAPI_ASSISTANT_ID;


/**
 * Extracts medicine details from a prescription image using Affindo OCR API.
 * @param imageUrl The URL of the prescription image stored in Firebase Storage.
 */
export const extractMedicinesFromPrescription = async (imageUrl: string) => {
  try {
    const response = await fetch("https://api.affindo.ai/v1/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AFFINDO_API_KEY}`
      },
      body: JSON.stringify({ image_url: imageUrl })
    });

    if (!response.ok) throw new Error(`Affindo API error: ${response.statusText}`);

    const data = await response.json();
    
    return {
      medicines: (data.medicines || []).map((m: any) => ({
        name: m.name || "Unknown",
        dosage: m.dosage || "As directed",
        timing: m.timing || "N/A"
      })),
      summary: data.summary || "This prescription includes what to take and when to take."
    };
  } catch (error) {
    console.error("aiService: Error extracting medicines:", error);
    return { medicines: [], summary: "Failed to parse prescription automatically." };
  }
};

/**
 * Generates an audio URL from text summary using Sarvam AI's Text-to-Speech API.
 * @param text The text to convert to speech.
 */
export const generateVoiceFromSummary = async (text: string): Promise<string | null> => {
  try {
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SARVAM_API_KEY}`
      },
      body: JSON.stringify({
        input: text,
        voice: "en-IN-Wavenet-A",
        responseType: "url"
      })
    });

    if (!response.ok) throw new Error(`Sarvam API error: ${response.statusText}`);

    const data = await response.json();
    return data.audio_url || null;
  } catch (error) {
    console.error("aiService: Error generating voice:", error);
    return null;
  }
};

/**
 * Triggers an AI voice reminder call via VAPI.
 * @param phoneNumber The recipient's phone number in E.164 format.
 * @param message The message the AI agent should speak to the recipient.
 */
export const triggerReminderCall = async (phoneNumber: string, message: string) => {
  try {
    const response = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VAPI_API_KEY}`
      },
      body: JSON.stringify({
        customer: {
          number: phoneNumber
        },
        assistantId: VAPI_ASSISTANT_ID,
        assistant: {
          firstMessage: message
        }
      })
    });

    if (!response.ok) throw new Error(`VAPI API error: ${response.statusText}`);

    const data = await response.json();
    return {
      status: data.status,
      callId: data.id
    };
  } catch (error) {
    console.error("aiService: Error triggering VAPI call:", error);
    return { status: "failed", error: (error as Error).message };
  }
};