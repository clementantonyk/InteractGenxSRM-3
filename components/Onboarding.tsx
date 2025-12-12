import React from 'react';
import { UserProfile } from '../types';
import { ArrowRight, Sparkles, Command } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const handleStart = () => {
    // Provide default profile data since we removed the form
    onComplete({ name: 'Explorer', email: '', age: '' });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-950 text-white relative overflow-hidden font-sans">
      {/* Abstract Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-indigo-900/20 via-slate-950/0 to-slate-950 pointer-events-none" />
      <div className="absolute -top-[20%] -left-[10%] w-[70vh] h-[70vh] rounded-full bg-indigo-600/10 blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute top-[20%] -right-[10%] w-[60vh] h-[60vh] rounded-full bg-purple-600/10 blur-[100px] animate-pulse delay-1000 pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        
        {/* Logo / Icon */}
        <div className="mb-12 relative group">
          <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 rounded-full"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center backdrop-blur-xl">
             <Sparkles className="w-10 h-10 text-indigo-400" />
          </div>
          {/* Floating badge */}
          <div className="absolute -top-3 -right-3 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-lg transform rotate-12 border border-white/20">
            AI Native
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-slate-400">
          Effortless <br/> AI Browser
        </h1>

        {/* Subtitle / Value Prop */}
        <p className="text-xl md:text-2xl text-slate-400 max-w-2xl leading-relaxed mb-12 font-light">
          Browse the web with <span className="text-indigo-400 font-normal">Alexis</span>. <br/>
          A multimodal companion that sees, hears, and helps you navigate the digital world.
        </p>

        {/* Call to Action */}
        <button
          onClick={handleStart}
          className="group relative px-10 py-5 bg-white text-slate-950 rounded-full text-lg font-bold tracking-tight shadow-[0_0_50px_rgba(255,255,255,0.15)] hover:shadow-[0_0_80px_rgba(255,255,255,0.3)] transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 active:scale-95 flex items-center gap-4 overflow-hidden"
        >
          <span className="relative z-10">Get Started</span>
          <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
          
          {/* Button Hover Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>

        {/* Features / Footer Text */}
        <div className="mt-20 grid grid-cols-3 gap-8 md:gap-16 opacity-60">
           <div className="flex flex-col items-center gap-2">
             <Command className="w-5 h-5 text-slate-500" />
             <span className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Multimodal</span>
           </div>
           <div className="flex flex-col items-center gap-2">
             <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex items-center justify-center text-[10px] font-mono">AI</div>
             <span className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Real-time</span>
           </div>
           <div className="flex flex-col items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
             <span className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Live Web</span>
           </div>
        </div>

      </div>
    </div>
  );
};