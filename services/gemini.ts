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

    // Enhanced prompt to extract structured data
    const systemPrompt = `
    You are an advanced search assistant. 
    1. Search for the query and provide a comprehensive summary.
    2. AFTER the summary, check if the query fits one of these categories:
       - COMPARISON (e.g., "A vs B"): Extract key features and generate a comparison table.
       - TIMELINE (e.g., "History of...", "Evolution of..."): Extract chronological events.
       - STATISTICS (e.g., "Stock price", "Population", "GDP"): Extract key numbers.
       - CONCEPT/COMPLEX TOPIC (e.g. "How does Blockchain work", "Ecosystem of AI"): Generate a knowledge graph.
    
    3. If it fits, append a JSON block at the very end of your response inside \`\`\`json ... \`\`\` tags.
    
    JSON Formats:
    
    For Comparison:
    {
      "type": "comparison",
      "title": "Comparison Title",
      "comparisonData": {
        "headers": ["Feature", "Item 1 Name", "Item 2 Name"],
        "rows": [
          { "feature": "Battery", "values": ["20h", "24h"] },
          { "feature": "Price", "values": ["$999", "$899"] }
        ]
      }
    }
    
    For Timeline:
    {
      "type": "timeline",
      "title": "Timeline Title",
      "timelineData": [
        { "year": "2020", "title": "Event Name", "description": "Short description" }
      ]
    }
    
    For Stats:
    {
      "type": "stats",
      "title": "Key Statistics",
      "statsData": [
        { "label": "Market Cap", "value": "$3T", "trend": "up" },
        { "label": "Employees", "value": "150,000", "trend": "neutral" }
      ]
    }

    For Knowledge Graph (Limit to max 6 sub-nodes):
    {
      "type": "graph",
      "title": "Topic Ecosystem",
      "graphData": {
         "nodes": [
            { "id": "1", "label": "Main Topic", "type": "main" },
            { "id": "2", "label": "Sub Concept A", "type": "sub" },
            { "id": "3", "label": "Sub Concept B", "type": "sub" }
         ],
         "links": [
            { "source": "1", "target": "2" },
            { "source": "1", "target": "3" }
         ]
      }
    }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `${systemPrompt}\n\nUser Query: ${query}`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let text = response.text || "No results found.";
    let widget: SmartWidgetData | undefined = undefined;

    // Extract JSON widget data if present
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        widget = JSON.parse(jsonMatch[1]);
        // Remove the JSON block from the display text to keep it clean
        text = text.replace(jsonMatch[0], '').trim();
      } catch (e) {
        console.error("Failed to parse widget JSON", e);
      }
    }

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

    return { text, sources, widget };
  } catch (error) {
    console.error("Search failed:", error);
    return { text: "Sorry, I encountered an error while searching.", sources: [] };
  }
};