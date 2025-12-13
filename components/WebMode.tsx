import React, { useState, useRef, useEffect } from 'react';
import { Search, Mic, MicOff, Sparkles, MoreVertical, Globe, Share2 } from 'lucide-react';
import { performWebSearch } from '../services/gemini';
import { SearchResult, SmartWidgetData } from '../types';
import ReactMarkdown from 'react-markdown';
import { SmartWidgets } from './SmartWidgets';

const QUICK_PROMPTS = [
  "Pixel 9 vs iPhone 15",
  "History of Artificial Intelligence",
  "Tesla Stock Performance",
  "How does Blockchain work"
];

export const WebMode: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ text: string; sources: SearchResult[]; widget?: SmartWidgetData } | null>(null);
  const [isMicListening, setIsMicListening] = useState(false);

  // Voice Search Refs
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        handleSearch(transcript);
        setIsMicListening(false);
      };
      
      recognitionRef.current.onerror = () => setIsMicListening(false);
      recognitionRef.current.onend = () => setIsMicListening(false);
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    
    if (isMicListening) {
      recognitionRef.current.stop();
      setIsMicListening(false);
    } else {
      recognitionRef.current.start();
      setIsMicListening(true);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setQuery(searchQuery);
    setIsLoading(true);
    setResults(null);
    
    const data = await performWebSearch(searchQuery);
    setResults(data);
    setIsLoading(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  // --- Initial Hero State ---
  if (!results && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[80vh] px-4">
        <div className="mb-10 text-center">
          <h2 className="text-6xl md:text-8xl font-bold mb-4 tracking-tighter text-white">
            Alexis
          </h2>
        </div>

        <form onSubmit={onSubmit} className="w-full max-w-3xl mx-auto group relative z-20">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="relative flex items-center bg-slate-800 rounded-full border border-slate-700 shadow-xl hover:shadow-2xl hover:border-slate-600 transition-all">
            <Search className="w-5 h-5 ml-6 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anything..."
              className="w-full bg-transparent px-4 py-4 text-lg text-white placeholder-slate-500 focus:outline-none"
            />
            
            <button
              type="button"
              onClick={toggleMic}
              className={`p-3 mr-2 rounded-full transition-all ${isMicListening ? 'text-red-400 bg-red-500/10' : 'text-slate-400 hover:text-white'}`}
            >
              {isMicListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
             {QUICK_PROMPTS.map((prompt) => (
               <button
                 key={prompt}
                 onClick={() => handleSearch(prompt)}
                 className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
               >
                 {prompt}
               </button>
             ))}
        </div>
      </div>
    );
  }

  // --- Results State ---
  return (
    <div className="flex flex-col w-full min-h-screen bg-slate-900">
      
      {/* Sticky Header - Full Width */}
      <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
        <div className="w-full px-6 lg:px-10 h-20 flex items-center gap-6">
           <div className="hidden md:flex items-center gap-2 cursor-pointer" onClick={() => { setResults(null); setQuery(''); }}>
              <span className="text-2xl font-bold text-white tracking-tight">Alexis</span>
           </div>
           
           <form onSubmit={onSubmit} className="flex-1 max-w-3xl relative">
              <div className="flex items-center bg-slate-800 rounded-full border border-slate-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent px-5 py-2.5 text-base text-white placeholder-slate-500 focus:outline-none"
                />
                <div className="flex items-center pr-2 border-l border-slate-700 pl-2">
                   <button type="submit" className="p-2 text-indigo-400 hover:text-white">
                     <Search className="w-5 h-5" />
                   </button>
                </div>
              </div>
           </form>

           {/* Placeholder for Profile/Settings */}
           <div className="w-8 h-8 rounded-full bg-indigo-600 hidden md:block"></div>
        </div>
        
        {/* Navigation Tabs - Full Width */}
        <div className="w-full px-6 lg:px-10 flex gap-6 text-sm text-slate-400">
            <div className="py-3 border-b-2 border-indigo-500 text-white font-medium cursor-pointer">All</div>
        </div>
      </div>

      {/* Main Content Area - Full Width with wide max constraint */}
      <div className="flex-1 w-full max-w-[2000px] mx-auto px-6 lg:px-10 py-6 flex gap-12 justify-center">
        
        {/* Left Column (Main Results) - Grows to fill but readable max width */}
        <div className="flex-1 max-w-4xl space-y-8">
           
           {isLoading && (
              <div className="space-y-4 animate-pulse">
                 <div className="h-40 bg-slate-800/50 rounded-2xl"></div>
                 <div className="h-20 bg-slate-800/30 rounded-xl"></div>
                 <div className="h-20 bg-slate-800/30 rounded-xl"></div>
              </div>
           )}

           {!isLoading && results && (
             <>
                {/* AI Overview Section */}
                <div className="rounded-2xl overflow-hidden border border-indigo-500/30 bg-slate-800/20 relative animate-in fade-in slide-in-from-bottom-2">
                    {/* Gradient Top Bar */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-indigo-400" />
                                <h3 className="text-xl font-bold text-white">AI Overview</h3>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-slate-700 rounded text-slate-400"><Share2 className="w-4 h-4"/></button>
                                <button className="p-2 hover:bg-slate-700 rounded text-slate-400"><MoreVertical className="w-4 h-4"/></button>
                            </div>
                        </div>

                        <div className="prose prose-invert prose-lg max-w-none text-slate-200">
                            <ReactMarkdown 
                            components={{
                                a: ({node, ...props}) => <span className="text-indigo-300 font-medium hover:underline cursor-pointer" {...props} />
                            }}
                            >
                                {results.text}
                            </ReactMarkdown>
                        </div>

                        {/* Smart Widget Injection inside AI Overview */}
                        {results.widget && (
                            <div className="mt-8 border-t border-slate-700/50 pt-6">
                                <SmartWidgets 
                                data={results.widget} 
                                onNodeClick={(label) => handleSearch(label)} 
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* STANDARD ORGANIC RESULTS */}
                <div className="space-y-6 mt-8">
                    {results.sources.map((result, idx) => (
                        <div key={idx} className="group animate-in fade-in slide-in-from-bottom-4 bg-slate-800/30 p-4 rounded-xl hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700" style={{ animationDelay: `${idx * 50}ms` }}>
                            <div className="flex flex-col gap-2">
                                {/* Favicon & Site Name */}
                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-slate-700">
                                      <img 
                                          src={`https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}&sz=32`} 
                                          alt="favicon"
                                          className="w-5 h-5 opacity-70"
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                  </div>
                                  <div className="flex flex-col leading-tight">
                                      <span className="font-medium text-slate-300">{result.siteName || new URL(result.url).hostname}</span>
                                      <span className="text-xs text-slate-500 truncate max-w-[300px]">{result.url}</span>
                                  </div>
                                </div>
                                
                                {/* Title */}
                                <a href={result.url} target="_blank" rel="noreferrer" className="block">
                                  <h3 className="text-xl text-blue-400 group-hover:underline visited:text-purple-400 font-medium tracking-tight">
                                      {result.title}
                                  </h3>
                                </a>
                                
                                {/* Snippet */}
                                <div className="text-base text-slate-400 leading-relaxed">
                                  {result.date && <span className="text-slate-500 text-xs mr-2">{result.date} —</span>}
                                  {result.snippet || "No description available for this result. Click to view the page."}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             </>
           )}
        </div>

        {/* Right Sidebar (Knowledge Panel) - Sticky */}
        {results && !isLoading && (
          <div className="hidden xl:block w-96 flex-shrink-0">
             <div className="sticky top-28 space-y-6">
                <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm">
                    <h4 className="font-bold text-white mb-3 text-lg">About this topic</h4>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="bg-slate-700 h-20 w-20 rounded-xl flex-shrink-0 flex items-center justify-center border border-slate-600">
                          <Globe className="w-10 h-10 text-slate-500" />
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">
                          Alexis has synthesized this information from {results.sources.length} sources found across the web.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="h-2 w-3/4 bg-slate-700/50 rounded animate-pulse"></div>
                      <div className="h-2 w-full bg-slate-700/50 rounded animate-pulse"></div>
                      <div className="h-2 w-5/6 bg-slate-700/50 rounded animate-pulse"></div>
                    </div>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};