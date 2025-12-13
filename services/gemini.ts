import { GoogleGenAI } from "@google/genai";
import { SearchResult, SmartWidgetData } from "../types";

export const performWebSearch = async (query: string): Promise<{ text: string; sources: SearchResult[]; widget?: SmartWidgetData }> => {
  try {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
        console.error("API Key missing for web search");
        return { text: "I cannot search without an API key.", sources: [] };
    }

    const ai = new GoogleGenAI({ apiKey });

    // Enhanced prompt to extract structured data AND organic results
    const systemPrompt = `
    You are an advanced search engine AI.
    
    TASK:
    1. Perform a search for the user's query.
    2. Generate an "AI Overview" summary of the answer.
    3. Construct a list of "Organic Search Results" based on the grounding info you found.
    4. Detect if a smart widget (Comparison, Timeline, etc.) is needed.

    OUTPUT FORMAT:
    You must return a JSON object wrapped in \`\`\`json ... \`\`\`. 
    
    The JSON structure must be:
    {
      "aiOverview": "The markdown formatted summary text...",
      "organicResults": [
        { 
          "title": "Page Title", 
          "url": "https://example.com", 
          "siteName": "Example.com", 
          "snippet": "A brief 2 sentence description...", 
          "date": "Oct 2023" (optional)
        }
      ],
      "widget": { ... } (Optional)
    }

    WIDGET FORMATS (populate "widget" field if applicable):
    - Comparison: { "type": "comparison", "title": "...", "comparisonData": { "headers": ["Feature", "A", "B"], "rows": [{ "feature": "Price", "values": ["$1", "$2"] }] } }
    - Timeline: { "type": "timeline", "title": "...", "timelineData": [{ "year": "2020", "title": "...", "description": "..." }] }
    - Stats: { "type": "stats", "title": "...", "statsData": [{ "label": "GDP", "value": "$1T", "trend": "up" }] }
    - Graph: { "type": "graph", "title": "...", "graphData": { "nodes": [{"id":"1", "label":"Main", "type":"main"}], "links": [] } }

    CRITICAL: 
    - Ensure 'organicResults' has at least 6 high quality items.
    - The 'aiOverview' should be concise but informative (Markdown supported).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}\n\nUser Query: ${query}`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = response.text || "";
    let parsedData: any = {};
    let text = rawText;
    let sources: SearchResult[] = [];
    let widget: SmartWidgetData | undefined = undefined;

    // Extract JSON widget data if present
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        parsedData = JSON.parse(jsonMatch[1]);
        
        text = parsedData.aiOverview || "Here is what I found.";
        widget = parsedData.widget;
        
        if (parsedData.organicResults && Array.isArray(parsedData.organicResults)) {
            sources = parsedData.organicResults;
        }

      } catch (e) {
        console.error("Failed to parse search JSON", e);
        // Fallback: use raw text if JSON parsing fails, but strip the code block
        text = rawText.replace(/```json\n[\s\S]*?\n```/, '').trim();
      }
    } else {
       // Fallback if model didn't output JSON
       const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
       sources = chunks
        .map((chunk): SearchResult | null => {
            if (chunk.web) {
            return {
                title: chunk.web.title || "Web Result",
                url: chunk.web.uri || "#",
                siteName: new URL(chunk.web.uri || "http://web").hostname,
                snippet: "Source found via Google Search grounding."
            };
            }
            return null;
        })
        .filter((s): s is SearchResult => s !== null);
    }

    return { text, sources, widget };
  } catch (error) {
    console.error("Search failed:", error);
    return { text: "Sorry, I encountered an error while searching.", sources: [] };
  }
};