
/**
 * DEPRECATED: Use geminiService.ts for all AI operations.
 * Keeping for architectural reference only.
 */

export const triggerReminderCall = async (phoneNumber: string, message: string) => {
  console.warn("External VAPI call service is deprecated. Use playAiVoice from geminiService.ts for in-app assistance.");
  return { status: "not_implemented", message: "Use native Gemini Voice for audio feedback." };
};
