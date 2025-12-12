import React from 'react';
import { Scan, Activity, Zap, Info } from 'lucide-react';

export interface HoloData {
  title: string;
  category: string;
  confidence: number;
  attributes: { label: string; value: string; score?: number }[]; // score 0-100 for progress bars
  summary: string;
}

interface HoloCardProps {
  data: HoloData;
  onClose: () => void;
}

export const HoloCard: React.FC<HoloCardProps> = ({ data, onClose }) => {
  return (
    <div className="relative w-full max-w-sm mx-auto animate-in zoom-in-95 duration-500">
      {/* Sci-Fi Border Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-2xl blur opacity-30 animate-pulse"></div>
      
      <div className="relative bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <Scan className="w-4 h-4" />
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase">Target Analyzed</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{data.title}</h2>
            <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {data.category}
            </span>
          </div>
          <div className="text-right">
             <div className="text-3xl font-mono font-bold text-cyan-400">{data.confidence}%</div>
             <div className="text-[9px] text-cyan-500/70 uppercase tracking-wider">Match Probability</div>
          </div>
        </div>

        {/* Divider with animated scanner line */}
        <div className="h-px w-full bg-slate-700 relative mb-4 overflow-hidden">
          <div className="absolute inset-0 bg-cyan-400/50 w-1/2 blur-sm animate-[shimmer_2s_infinite_linear]"></div>
        </div>

        {/* Attributes Grid */}
        <div className="space-y-3 mb-5 relative z-10">
          {data.attributes.map((attr, idx) => (
            <div key={idx} className="group">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-slate-600" /> {attr.label}
                </span>
                <span className="text-slate-200 font-mono">{attr.value}</span>
              </div>
              {/* Fake progress bar for visual flair if score exists, else random visual */}
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" 
                  style={{ width: `${attr.score || Math.random() * 60 + 40}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary Box */}
        <div className="bg-cyan-950/30 border border-cyan-900/50 rounded-lg p-3 relative z-10">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-cyan-100 leading-relaxed font-light">
              {data.summary}
            </p>
          </div>
        </div>

        {/* Close Interaction */}
        <button 
          onClick={onClose}
          className="mt-4 w-full py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-400 hover:bg-cyan-950/50 rounded border border-transparent hover:border-cyan-500/30 transition-all"
        >
          <Zap className="w-3 h-3" /> Dismiss HUD
        </button>
      </div>
    </div>
  );
};