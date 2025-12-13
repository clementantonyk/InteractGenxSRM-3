import React from 'react';

interface VisualizerProps {
  isActive: boolean;
  isUserSpeaking: boolean;
  volume: number; // 0 to 1
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive, isUserSpeaking, volume }) => {
  // Calculate dynamic scale based on volume, clamped reasonably
  const scale = isActive ? 1 + Math.min(volume * 2.5, 0.6) : 1;
  const glowOpacity = isActive ? 0.6 + Math.min(volume, 0.4) : 0.6;

  // Determine colors based on who is talking
  // AI (Alexis) = Indigo/Purple
  // User (Listening) = Cyan/Emerald (Active Listening state)
  const coreColor = isUserSpeaking ? 'bg-cyan-400' : 'bg-indigo-400';
  const glowColor = isUserSpeaking ? 'bg-cyan-500' : 'bg-indigo-500';
  const innerGradient = isUserSpeaking 
    ? 'from-cyan-400 via-teal-500 to-emerald-500' 
    : 'from-indigo-600 via-purple-600 to-blue-600';

  return (
    <div className="relative w-64 h-64 flex items-center justify-center transition-all duration-75 ease-out">
      {/* Outer Glow Ring - Reacts heavily to volume */}
      <div 
        className={`absolute rounded-full blur-2xl transition-all duration-200 ${glowColor}`}
        style={{
          width: `${140 * scale}px`,
          height: `${140 * scale}px`,
          opacity: glowOpacity * 0.8
        }}
      />
      
      {/* Secondary Ripple (User Speaking Only) */}
      {isUserSpeaking && (
         <div 
            className="absolute border-2 border-cyan-400/30 rounded-full animate-ping"
            style={{ width: '120px', height: '120px', animationDuration: '2s' }}
         />
      )}
      
      {/* Core Ring */}
      <div 
        className={`absolute rounded-full blur-xl transition-all duration-200 ${coreColor}`}
        style={{
          width: `${100 * (scale * 0.9)}px`,
          height: `${100 * (scale * 0.9)}px`,
          opacity: glowOpacity
        }}
      />

      {/* Center Sphere */}
      <div className={`relative z-10 w-28 h-28 bg-white/10 backdrop-blur-md rounded-full border border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center overflow-hidden transition-all duration-300 ${isUserSpeaking ? 'scale-110 border-cyan-400/50' : ''}`}>
        <div 
          className={`absolute inset-0 bg-gradient-to-tr ${innerGradient} opacity-90 transition-all duration-500 ${isActive && !isUserSpeaking ? 'animate-spin-slow' : ''}`}
        />
        
        {/* Inner Highlight */}
        <div className="absolute top-2 left-4 w-8 h-4 bg-white/20 rounded-full blur-md transform -rotate-12" />
      </div>
      
      {/* Orbiting particles */}
      {isActive && !isUserSpeaking && (
        <>
          <div className="absolute w-full h-full animate-spin-slow pointer-events-none">
            <div className="absolute top-0 left-1/2 w-3 h-3 bg-cyan-400 rounded-full blur-[2px] shadow-[0_0_15px_rgba(34,211,238,1)]" />
          </div>
          <div className="absolute w-4/5 h-4/5 animate-spin-reverse-slow pointer-events-none">
            <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-fuchsia-400 rounded-full blur-[2px] shadow-[0_0_15px_rgba(232,121,249,1)]" />
          </div>
        </>
      )}
    </div>
  );
};