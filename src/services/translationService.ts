import { GoogleGenAI } from "@google/genai";

/**
 * Service for translating text using Gemini API (Free).
 */

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const translationService = {
  translate: async (text: string, targetLanguage: string = 'Hindi'): Promise<string> => {
    if (!text || text.trim() === '') return '';

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
