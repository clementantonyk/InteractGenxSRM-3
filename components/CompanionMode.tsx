import React, { useEffect, useRef, useState, useCallback } from 'react';
import { UserProfile, SearchResult } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { Visualizer } from './Visualizer';
import { HoloCard, HoloData } from './HoloCard';
import { Mic, MicOff, Video, VideoOff, LayoutGrid, X, RotateCcw, AlertCircle, Square, ScanEye } from 'lucide-react';
import { createPcmBlob, decodeAudioData, blobToBase64, base64ToUint8Array } from '../utils/audio-utils';
import { performWebSearch } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

interface CompanionModeProps {
  user: UserProfile;
}

interface TranscriptItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  isComplete: boolean;
}

// 1. Existing Search Tool
const searchToolDeclaration: FunctionDeclaration = {
  name: 'search_web',
  parameters: {
    type: Type.OBJECT,
    description: 'Search the internet for information, recipes, news, or specific websites.',
    properties: {
      query: { type: Type.STRING, description: 'The search query string.' },
    },
    required: ['query'],
  },
};

// 2. New HUD Scanner Tool
const hudToolDeclaration: FunctionDeclaration = {
  name: 'render_hud_overlay',
  parameters: {
    type: Type.OBJECT,
    description: 'Display a futuristic Heads-Up Display (HUD) overlay with structured analysis of the object visible in the camera.',
    properties: {
      title: { type: Type.STRING, description: 'Name of the object identified' },
      category: { type: Type.STRING, description: 'Category (e.g., Electronics, Food, Nature)' },
      confidence: { type: Type.NUMBER, description: 'Confidence score between 0 and 100' },
      attributes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            value: { type: Type.STRING },
            score: { type: Type.NUMBER, description: 'Optional relative score 0-100 for visual graph' }
          }
        }
      },
      summary: { type: Type.STRING, description: 'Short, dense technical summary of the object.' }
    },
    required: ['title', 'category', 'attributes', 'summary']
  },
};

export const CompanionMode: React.FC<CompanionModeProps> = ({ user }) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedSites, setSuggestedSites] = useState<SearchResult[]>([]);
  
  // HUD State
  const [holoData, setHoloData] = useState<HoloData | null>(null);
  
  // Default Mic to OFF
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [volume, setVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Refs for state access inside closures
  const isMicOnRef = useRef(isMicOn);
  const isVideoOnRef = useRef(isVideoOn);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Refs for audio/video elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null); 
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const isResponseStoppedRef = useRef(false);

  // Sync refs with state
  useEffect(() => {
    isMicOnRef.current = isMicOn;
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMicOn;
      });
    }
  }, [isMicOn]);

  useEffect(() => {
    isVideoOnRef.current = isVideoOn;
  }, [isVideoOn]);

  const toggleMic = async () => {
    try {
      const newState = !isMicOn;
      setIsMicOn(newState);
      isMicOnRef.current = newState;

      // Show visual feedback
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      setFeedbackMessage(newState ? "Microphone ON" : "Microphone OFF");
      feedbackTimeoutRef.current = setTimeout(() => setFeedbackMessage(null), 2000);

      // Resume AudioContext if it was suspended (browser autoplay policy)
      if (newState) {
        if (inputAudioContextRef.current?.state === 'suspended') {
          await inputAudioContextRef.current.resume();
        }
        if (outputAudioContextRef.current?.state === 'suspended') {
          await outputAudioContextRef.current.resume();
        }
      }
    } catch (e) {
      console.error("Error toggling mic:", e);
    }
  };

  const triggerScan = () => {
     // We can just ask the model via audio/text injection, or assume the user asks verbally.
     // To make the button functional without speaking, we can technically inject a text prompt
     // if the Live API supported direct text injection easily, but usually it's audio-driven.
     // For this UX, we'll let the user know they are in 'Scan Mode' or provide a visual cue.
     // However, a simpler way to force a scan via button is simulating a user message.
     // Since Live API is primarily audio/realtime, we'll use the button to provide Visual Feedback
     // and maybe play a sound, but rely on the user saying "Scan this" OR
     // if possible, send a text control message (experimental). 
     
     // Workaround: We will just flash a message "Listening for 'Scan this'..." 
     // A cooler implementation is to just prompt the user to Speak.
     setFeedbackMessage("Say 'Scan this' to analyze");
     if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
     feedbackTimeoutRef.current = setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const stopSpeaking = () => {
    isResponseStoppedRef.current = true;
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    if (outputAudioContextRef.current) {
      nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
    }
  };

  // Transcript helper
  const updateTranscript = (role: 'user' | 'model', text: string, isComplete: boolean) => {
    setTranscripts(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && !last.isComplete) {
        const newText = last.text + text;
        return [...prev.slice(0, -1), { ...last, text: newText, isComplete }];
      } else {
        return [...prev, { id: Date.now().toString(), role, text, isComplete }];
      }
    });
  };

  const startAudioAnalysis = () => {
    const dataArray = new Uint8Array(256);
    const update = () => {
      let avgVolume = 0;
      if (outputAnalyserRef.current) {
        outputAnalyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        avgVolume = Math.max(avgVolume, sum / dataArray.length);
      }
      if (inputAnalyserRef.current && isMicOnRef.current) {
        inputAnalyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        avgVolume = Math.max(avgVolume, (sum / dataArray.length) * 2.5);
      }
      setVolume(Math.min(avgVolume / 128, 1)); 
      animationFrameRef.current = requestAnimationFrame(update);
    };
    update();
  };

  const cleanupSession = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (sessionRef.current) {
       try { sessionRef.current.close(); } catch (e) { console.warn("Error closing session", e); }
       sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    setIsSessionActive(false);
    initializedRef.current = false;
  };

  const connectToGemini = useCallback(async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    setError(null);
    setIsSessionActive(false);

    try {
      const apiKey = process.env.API_KEY || '';
      if (!apiKey) throw new Error("API Key not found in environment.");
      
      const ai = new GoogleGenAI({ apiKey });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      outputAnalyserRef.current = outputAudioContextRef.current.createAnalyser();
      outputAnalyserRef.current.fftSize = 512;
      outputAnalyserRef.current.connect(outputAudioContextRef.current.destination);

      inputAnalyserRef.current = inputAudioContextRef.current.createAnalyser();
      inputAnalyserRef.current.fftSize = 512;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      stream.getAudioTracks().forEach(track => { track.enabled = isMicOnRef.current; });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are Alexis, a warm and helpful AI companion.
          Greet the user: ${user.name}.
          
          You have two main modes of help:
          1. WEB SEARCH: If asked to search, use 'search_web'.
          2. HUD SCANNER: If the user asks to "Scan this", "What is this", "Analyze this", or "Show me specs", you MUST use the 'render_hud_overlay' tool.
             - Look at the video input.
             - Extract structured data: Title, Category, 3-4 Key Attributes (like Calories for food, Resolution for screens, Author for books), and a Summary.
             - Call 'render_hud_overlay' with this data.
             - Keep your verbal response extremely brief (e.g., "Scanning target... Here is the analysis.") so the user focuses on the UI.
          
          Otherwise, be conversational.`,
          tools: [{ functionDeclarations: [searchToolDeclaration, hudToolDeclaration] }],
        },
      };

      let sessionPromise: Promise<any>;
      sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Live Session Connected");
            setIsSessionActive(true);
            startAudioAnalysis();
            
            if (inputAudioContextRef.current && streamRef.current) {
              const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
              const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                if (!isMicOnRef.current) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                sessionPromise.then((session) => {
                  try { session.sendRealtimeInput({ media: pcmBlob }); } catch (e) { console.warn("Error sending audio", e); }
                });
              };
              source.connect(inputAnalyserRef.current!);
              source.connect(scriptProcessor);
              const silence = inputAudioContextRef.current.createGain();
              silence.gain.value = 0;
              scriptProcessor.connect(silence);
              silence.connect(inputAudioContextRef.current.destination);
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
              if (msg.serverContent?.inputTranscription) {
                isResponseStoppedRef.current = false;
                updateTranscript('user', msg.serverContent.inputTranscription.text, false);
              }
              if (msg.serverContent?.outputTranscription) {
                updateTranscript('model', msg.serverContent.outputTranscription.text, false);
              }
              if (msg.serverContent?.turnComplete) {
                setTranscripts(prev => prev.map(t => ({ ...t, isComplete: true })));
                isResponseStoppedRef.current = false;
              }
              if (msg.serverContent?.interrupted) {
                isResponseStoppedRef.current = false;
                sourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
                sourcesRef.current.clear();
                if (outputAudioContextRef.current) {
                  nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
                }
              }

              const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData && outputAudioContextRef.current && !isResponseStoppedRef.current) {
                const ctx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const audioBuffer = await decodeAudioData(base64ToUint8Array(audioData), ctx);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                if (outputAnalyserRef.current) source.connect(outputAnalyserRef.current);
                else source.connect(ctx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => { sourcesRef.current.delete(source); };
              }

              if (msg.toolCall) {
                sessionPromise.then(async (session) => {
                  for (const fc of msg.toolCall!.functionCalls) {
                     if (fc.name === 'search_web') {
                       const query = (fc.args as any).query;
                       const searchResult = await performWebSearch(query);
                       setSuggestedSites(searchResult.sources);
                       session.sendToolResponse({
                         functionResponses: {
                           id: fc.id, name: fc.name,
                           response: { result: `Summary: ${searchResult.text}. Sources: ${searchResult.sources.map(s => s.title).join(', ')}` }
                         }
                       });
                     } else if (fc.name === 'render_hud_overlay') {
                       // Direct UI Rendering
                       const data = fc.args as unknown as HoloData;
                       setHoloData(data);
                       setSuggestedSites([]); // Clear old suggestions to focus on HUD
                       
                       // Send simple success back so model knows it worked
                       session.sendToolResponse({
                         functionResponses: {
                           id: fc.id, name: fc.name,
                           response: { result: "HUD Rendered Successfully." }
                         }
                       });
                     }
                  }
                });
              }
          },
          onclose: () => { setIsSessionActive(false); },
          onerror: (err) => {
            setError(err instanceof Error ? err.message : "Connection Error");
            setIsSessionActive(false);
          }
        }
      });
      
      sessionRef.current = await sessionPromise;

      if (canvasRef.current) {
         const ctx = canvasRef.current.getContext('2d');
         frameIntervalRef.current = window.setInterval(() => {
           if (videoRef.current && ctx && isVideoOnRef.current) {
              canvasRef.current!.width = videoRef.current.videoWidth;
              canvasRef.current!.height = videoRef.current.videoHeight;
              ctx.drawImage(videoRef.current, 0, 0);
              canvasRef.current!.toBlob(async (blob) => {
                if (blob) {
                  const base64 = await blobToBase64(blob);
                  sessionPromise.then(session => {
                    try { session.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64 } }); } catch (e) {}
                  });
                }
              }, 'image/jpeg', 0.5);
           }
         }, 1000); 
      }

    } catch (err: any) {
      setError(err.message || "Failed to initialize session");
      setIsSessionActive(false);
      initializedRef.current = false;
    }
  }, [user.name]);

  useEffect(() => {
    connectToGemini();
    return () => cleanupSession();
  }, [connectToGemini]);

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcripts]);

  const transcriptRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-slate-950">
      
      {/* Background Ambient Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_40%,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-950 to-slate-950"></div>
         {isSessionActive && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-3xl animate-pulse"></div>
         )}
      </div>

      <div className="relative z-10 flex flex-col h-full">
        
        {/* Top Bar */}
        <div className="flex justify-between items-center p-6 bg-gradient-to-b from-slate-950/80 to-transparent relative z-50">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isSessionActive ? 'bg-emerald-500 animate-pulse' : error ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></div>
            <span className="text-sm font-medium text-slate-400 uppercase tracking-widest text-[10px]">
              {error ? 'Connection Failed' : isSessionActive ? 'Alexis Connected' : 'Connecting...'}
            </span>
          </div>
          
          <div className={`flex gap-4 transition-opacity ${!isSessionActive ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
             {/* HUD Scanner Button */}
             <button 
               onClick={triggerScan}
               className={`p-3 rounded-full transition-all duration-300 ${holoData ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
               title="Scan Object (Say 'Scan this')"
             >
               <ScanEye className="w-5 h-5"/>
             </button>

             <button 
               onClick={toggleMic}
               className={`p-3 rounded-full transition-all duration-300 ${isMicOn ? 'bg-slate-800 text-white hover:bg-slate-700 hover:shadow-lg hover:shadow-indigo-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
               title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
             >
               {isMicOn ? <Mic className="w-5 h-5"/> : <MicOff className="w-5 h-5"/>}
             </button>

             <button 
               onClick={stopSpeaking}
               className="p-3 rounded-full bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
               title="Stop Speaking"
             >
               <Square className="w-5 h-5 fill-current"/>
             </button>

             <button 
               onClick={() => setIsVideoOn(!isVideoOn)}
               className={`p-3 rounded-full transition-all duration-300 ${isVideoOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
               title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
             >
               {isVideoOn ? <Video className="w-5 h-5"/> : <VideoOff className="w-5 h-5"/>}
             </button>
          </div>
        </div>

        {/* Feedback Toast */}
        {feedbackMessage && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
             <div className="flex items-center gap-3 px-6 py-3 bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                {isMicOn ? (
                  <div className="p-1.5 bg-emerald-500/20 rounded-full">
                    <Mic className="w-5 h-5 text-emerald-400" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-red-500/20 rounded-full">
                    <MicOff className="w-5 h-5 text-red-400" />
                  </div>
                )}
                <span className="font-semibold text-white tracking-wide">{feedbackMessage}</span>
             </div>
          </div>
        )}

        {/* Center Stage */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-20 relative z-0">
          
          {error ? (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900/50 rounded-2xl border border-red-500/20 backdrop-blur">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Connection Issue</h3>
              <p className="text-slate-400 max-w-xs mb-6 text-sm">{error}</p>
              <button 
                onClick={() => { cleanupSession(); connectToGemini(); }}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Retry Connection
              </button>
            </div>
          ) : (
            <div className="relative flex flex-col items-center">
              {/* If HoloData is present, show Card, else Visualizer */}
              {holoData ? (
                 <HoloCard data={holoData} onClose={() => setHoloData(null)} />
              ) : (
                 <Visualizer isActive={isSessionActive} volume={volume} />
              )}
            </div>
          )}

          {!isMicOn && isSessionActive && !error && (
            <div className="absolute mt-52 text-slate-500 text-sm font-light animate-pulse">
              Microphone muted. Tap the mic icon to speak.
            </div>
          )}
          
          {/* Camera View */}
          <div className={`absolute bottom-8 right-8 w-48 h-36 bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl transition-all duration-500 ${isVideoOn && !error ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
             <video ref={videoRef} className="w-full h-full object-cover mirror-mode" muted playsInline />
             <div className="absolute top-2 left-2 bg-black/40 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-white/70">YOU</div>
          </div>
        </div>

        {/* Chat / Transcript Overlay (Hide when Holo is active to reduce clutter) */}
        {!holoData && (
          <div className="flex-1 max-h-[250px] w-full max-w-2xl mx-auto px-6 mb-4 overflow-y-auto mask-gradient relative z-10" ref={transcriptRef}>
             <div className="space-y-4 flex flex-col justify-end min-h-full pb-4">
               {transcripts.map((t, idx) => (
                  <div key={idx} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                     <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                       t.role === 'user' 
                       ? 'bg-slate-800 text-slate-200 rounded-tr-sm border border-slate-700' 
                       : 'bg-indigo-600/20 text-indigo-100 rounded-tl-sm border border-indigo-500/30 backdrop-blur-sm'
                     }`}>
                       <ReactMarkdown>{t.text}</ReactMarkdown>
                       {!t.isComplete && <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-current opacity-50 animate-blink">|</span>}
                     </div>
                  </div>
               ))}
               {transcripts.length === 0 && isSessionActive && (
                 <div className="text-center text-slate-500 text-sm italic mt-auto">
                   "Hey {user.name}, what are you looking forward to search today?"
                 </div>
               )}
             </div>
          </div>
        )}

        {/* Bottom: Dynamic Suggestions (Only show if no HoloData) */}
        {suggestedSites.length > 0 && !holoData && (
          <div className="w-full bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 p-6 transition-all duration-500 ease-out animate-in slide-in-from-bottom-10 z-20">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 text-indigo-400">
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Suggested Content</span>
               </div>
               <button onClick={() => setSuggestedSites([])} className="text-slate-500 hover:text-white transition-colors">
                 <X className="w-4 h-4" />
               </button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
               {suggestedSites.map((site, i) => (
                 <a 
                   key={i} 
                   href={site.url} 
                   target="_blank" 
                   rel="noreferrer"
                   className="snap-start flex-shrink-0 w-72 p-4 bg-slate-800/40 border border-slate-700 rounded-xl hover:bg-slate-800 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all group cursor-pointer"
                 >
                   <div className="flex items-start justify-between mb-2">
                      <div className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded truncate max-w-[180px]">
                        {new URL(site.url).hostname}
                      </div>
                      <ExternalLinkIcon />
                   </div>
                   <div className="font-medium text-slate-200 line-clamp-2 group-hover:text-white transition-colors">
                     {site.title}
                   </div>
                   <div className="mt-3 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                     Tap to read more <ArrowRightIcon />
                   </div>
                 </a>
               ))}
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

const ExternalLinkIcon = () => (
  <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);