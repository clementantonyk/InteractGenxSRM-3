import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ArrowRight, Sparkles, Command, Lock, Mail, AlertCircle } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic Validation
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    // Simulate Network Request
    setTimeout(() => {
      // Simulate simple authentication (accept any non-empty credentials for demo)
      if (password.length < 4) {
         setError('Password must be at least 4 characters.');
         setIsLoading(false);
         return;
      }

      const name = email.split('@')[0];
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
      
      onComplete({ 
        name: capitalizedName, 
        email: email, 
        age: '25' // Default for demo
      });
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-950 text-white relative overflow-hidden font-sans">
      {/* Abstract Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-indigo-900/20 via-slate-950/0 to-slate-950 pointer-events-none" />
      <div className="absolute -top-[20%] -left-[10%] w-[70vh] h-[70vh] rounded-full bg-indigo-600/10 blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute top-[20%] -right-[10%] w-[60vh] h-[60vh] rounded-full bg-purple-600/10 blur-[100px] animate-pulse delay-1000 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center">
        
        {/* Logo / Icon */}
        <div className="mb-8 relative group">
          <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 rounded-full"></div>
          <div className="relative w-20 h-20 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center backdrop-blur-xl">
             <Sparkles className="w-8 h-8 text-indigo-400" />
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl font-bold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-slate-400 text-center">
          Welcome Back
        </h1>
        <p className="text-slate-400 mb-8 text-center font-light">
          Sign in to access your neural workspace.
        </p>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full space-y-4 bg-slate-900/50 p-8 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-sm">
          
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent block w-full pl-11 p-3.5 placeholder-slate-600 transition-all focus:bg-slate-900"
                placeholder="explorer@alexis.ai"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent block w-full pl-11 p-3.5 placeholder-slate-600 transition-all focus:bg-slate-900"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 group relative px-6 py-4 bg-white text-slate-950 rounded-xl text-lg font-bold tracking-tight shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 active:scale-95 flex items-center justify-center gap-2 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            ) : (
               <>
                 <span className="relative z-10">Sign In</span>
                 <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
               </>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </form>

        {/* Footer Text */}
        <div className="mt-8 flex items-center gap-6 opacity-40">
           <div className="flex items-center gap-2">
             <Command className="w-4 h-4" />
             <span className="text-xs">Secure Access</span>
           </div>
           <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
           <div className="flex items-center gap-2">
             <span className="text-xs">v2.5.0</span>
           </div>
        </div>

      </div>
    </div>
  );
};