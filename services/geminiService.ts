
import { GoogleGenAI } from "@google/genai";

export const getSecurityInsight = async (context: string): Promise<string> => {
  try {
    // Initialize GoogleGenAI with process.env.API_KEY directly as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a very short (1 sentence) professional security status update for a login portal. Context: ${context}`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 50
      }
    });
    return response.text || "Portal connection encrypted and verified.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Standard encryption protocols in effect.";
  }
};
