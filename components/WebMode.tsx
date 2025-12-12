import React, { useState } from 'react';
import { Search, Globe, ExternalLink, Loader2, Sparkles, TrendingUp, History } from 'lucide-react';
import { performWebSearch } from '../services/gemini';
import { SearchResult } from '../types';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  "Latest Tech News",
  "Easy Dinner Recipes",
  "Stock Market Today",
  "Travel Destinations 2025"
];

export const WebMode: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ text: string; sources: SearchResult[] } | null>(null);

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

  return (
    <div className="flex flex-col items-center w-full min-h-full px-4 pt-10 pb-20 max-w-4xl mx-auto">
      
      {/* Hero Section */}
      <div className={`transition-all duration-700 ${results ? 'mt-0 mb-6 scale-90 origin-top' : 'mt-20 mb-12'}`}>
        <div className="mb-8 text-center">
          <h2 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 tracking-tight">
            Web Mode
          </h2>
          <p className="text-slate-400 text-lg">Search the knowledge of the world</p>
        </div>

        <form onSubmit={onSubmit} className="w-full relative max-w-2xl mx-auto group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-all duration-500"></div>
          <div className="relative flex items-center bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden transition-all focus-within:border-indigo-500/50">
            <Search className="w-6 h-6 ml-6 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="w-full bg-transparent px-6 py-5 text-xl text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="mr-2 bg-slate-700/50 hover:bg-indigo-600 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-slate-700/50"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
            </button>
          </div>
        </form>

        {/* Quick Prompts - Only show when no results */}
        {!results && !isLoading && (
           <div className="mt-8 flex flex-wrap justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
             {QUICK_PROMPTS.map((prompt) => (
               <button
                 key={prompt}
                 onClick={() => handleSearch(prompt)}
                 className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-slate-300 hover:bg-slate-800 hover:text-white hover:border-indigo-500/50 transition-all flex items-center gap-2"
               >
                 {prompt === "Latest Tech News" && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                 {prompt}
               </button>
             ))}
           </div>
        )}
      </div>

      {/* Results Area */}
      {results && (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Main Answer Card */}
          <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-50"></div>
            
            {/* We use prose-invert (for dark mode) and customize specific elements via components prop */}
            <div className="prose prose-invert prose-lg max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-blue-200 mb-6" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-2xl font-semibold text-indigo-300 mt-8 mb-4 pb-2 border-b border-slate-700" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-xl font-medium text-blue-300 mt-6 mb-3" {...props} />,
                  a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 space-y-2 text-slate-300 marker:text-indigo-500" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 space-y-2 text-slate-300 marker:text-indigo-500" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 italic text-slate-400 bg-slate-800/50 rounded-r-lg my-4" {...props} />,
                  code: ({node, ...props}) => <code className="bg-slate-900 text-emerald-400 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-700" {...props} />,
                }}
              >
                {results.text}
              </ReactMarkdown>
            </div>
          </div>

          {/* Source Grid */}
          {results.sources.length > 0 && (
            <div className="space-y-4">
               <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider pl-2 flex items-center gap-2">
                 <Globe className="w-4 h-4" /> Sources
               </h3>
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {results.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col group bg-slate-800/30 border border-slate-700/50 hover:border-blue-500/30 rounded-xl p-5 transition-all hover:bg-slate-800/60 hover:shadow-lg hover:shadow-blue-900/10 hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between w-full mb-2">
                       <div className="flex items-center gap-2">
                          <img 
                            src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=32`} 
                            alt="" 
                            className="w-5 h-5 rounded-sm opacity-70 group-hover:opacity-100 transition-opacity"
                          />
                          <span className="text-xs font-mono text-slate-500 group-hover:text-blue-400 transition-colors truncate">
                            {new URL(source.url).hostname}
                          </span>
                       </div>
                       <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100" />
                    </div>
                    <h3 className="font-medium text-slate-200 group-hover:text-white transition-colors line-clamp-2">
                      {source.title}
                    </h3>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};