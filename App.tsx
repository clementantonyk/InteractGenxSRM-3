import React, { useState, useEffect } from 'react';
import { AppMode, UserProfile } from './types';
import { Onboarding } from './components/Onboarding';
import { WebMode } from './components/WebMode';
import { CompanionMode } from './components/CompanionMode';
import { Search, Sparkles } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.ONBOARDING);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Load user from local storage
  useEffect(() => {
    const savedUser = localStorage.getItem('alexis_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setMode(AppMode.WEB);
    }
  }, []);

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('alexis_user', JSON.stringify(profile));
    setMode(AppMode.COMPANION); // Default to companion after sign up for wow factor
  };

  const toggleMode = (targetMode: AppMode) => {
    setMode(targetMode);
  };

  if (mode === AppMode.ONBOARDING) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white font-sans overflow-hidden">
      {/* Header / Mode Switcher */}
      <div className="flex-none z-50 px-6 py-4 flex items-center justify-between bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg">A</div>
           <span className="font-semibold text-lg tracking-tight">Alexis</span>
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-full border border-slate-700">
          <button
            onClick={() => toggleMode(AppMode.WEB)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              mode === AppMode.WEB 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            Web
          </button>
          <button
            onClick={() => toggleMode(AppMode.COMPANION)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              mode === AppMode.COMPANION 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Companion
          </button>
        </div>
        
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold border border-white/10">
          {user?.name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Main Viewport */}
      <main className="flex-1 relative overflow-y-auto">
        {mode === AppMode.WEB ? (
          <WebMode />
        ) : (
          user && <CompanionMode user={user} />
        )}
      </main>
    </div>
  );
}
