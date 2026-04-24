import { GoogleGenAI } from "@google/genai";

/**
 * Service for translating text using Gemini API (Free).
 */

let ai: any = null;
try {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    ai = new GoogleGenAI({ apiKey: key });
  }
} catch (e) {
  console.warn('Failed to initialize Gemini AI:', e);
}

export const translationService = {
  translate: async (text: string, targetLanguage: string = 'Hindi'): Promise<string> => {
    if (!text || text.trim() === '') return '';
    if (!ai) return text;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following text to ${targetLanguage}. Return ONLY the translated text, nothing else: "${text}"`,
      });

      const translatedText = response.text?.trim() || text;
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Fallback to original text on error
    }
  }
};
