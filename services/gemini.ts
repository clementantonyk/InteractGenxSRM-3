import { GoogleGenAI } from "@google/genai";
import { SearchResult } from "../types";

export const performWebSearch = async (query: string): Promise<{ text: string; sources: SearchResult[] }> => {
  try {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
        console.error("API Key missing for web search");
        return { text: "I cannot search without an API key.", sources: [] };
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Search the web for: ${query}. Provide a comprehensive summary (max 3 sentences) and list the sources.`,
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