import { GoogleGenAI } from "@google/genai";
import { SearchResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const performWebSearch = async (query: string): Promise<{ text: string; sources: SearchResult[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Search the web for: ${query}. Provide a comprehensive summary and list the sources.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "No results found.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources: SearchResult[] = chunks
      .map((chunk) => {
        if (chunk.web) {
          return {
            title: chunk.web.title || "Web Result",
            url: chunk.web.uri || "#",
          };
        }
        return null;
      })
      .filter((s): s is SearchResult => s !== null);

    return { text, sources };
  } catch (error) {
    console.error("Search failed:", error);
    return { text: "Sorry, I encountered an error while searching.", sources: [] };
  }
};
