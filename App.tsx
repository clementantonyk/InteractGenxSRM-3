import React, { useState, useEffect } from 'react';
import { AppMode, UserProfile } from './types';
import { Onboarding } from './components/Onboarding';
import { WebMode } from './components/WebMode';
import { CompanionMode } from './components/CompanionMode';
import { Search, Sparkles, LogOut, Maximize, Minimize } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.ONBOARDING);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load user from local storage
  useEffect(() => {
    const savedUser = localStorage.getItem('alexis_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setMode(AppMode.WEB);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('alexis_user', JSON.stringify(profile));
    setMode(AppMode.COMPANION); // Default to companion after sign in for wow factor
  };

  const handleLogout = () => {
    localStorage.removeItem('alexis_user');
    setUser(null);
    setMode(AppMode.ONBOARDING);
  };

  const toggleMode = (targetMode: AppMode) => {
    setMode(targetMode);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error("Failed to enter fullscreen", e);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  if (mode === AppMode.ONBOARDING) {
    return <Onboarding onComplete={handleLoginSuccess} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white font-sans overflow-hidden">
      {/* Header / Mode Switcher */}
      <div className="flex-none z-50 px-6 py-4 flex items-center justify-between bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg">A</div>
           <span className="font-semibold text-lg tracking-tight">Alexis</span>
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-full border border-slate-700 overflow-x-auto max-w-[60vw] scrollbar-hide">
          <button
            onClick={() => toggleMode(AppMode.WEB)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
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
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              mode === AppMode.COMPANION 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Companion
          </button>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Fullscreen Toggle */}
           <button 
             onClick={toggleFullscreen}
             className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors hidden sm:block"
             title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
           >
             {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
           </button>

          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
                <div className="text-xs text-slate-400">Signed in as</div>
                <div className="text-sm font-medium text-white">{user?.name}</div>
             </div>
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold border border-white/10 shrink-0 shadow-lg">
               {user?.name.charAt(0).toUpperCase()}
             </div>
          </div>
          
          <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>
          
          <button 
             onClick={handleLogout}
             className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
             title="Log Out"
          >
             <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <main className="flex-1 relative overflow-y-auto">
        {mode === AppMode.WEB && <WebMode />}
        {mode === AppMode.COMPANION && user && <CompanionMode user={user} />}
      </main>
    </div>
  );
}