import React, { useEffect, useRef, useState, useCallback } from 'react';
import { UserProfile, SearchResult } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { Visualizer } from './Visualizer';
import { HoloCard, HoloData } from './HoloCard';
import { Mic, MicOff, Video, VideoOff, LayoutGrid, X, RotateCcw, AlertCircle, Square, ScanEye, Globe, Sparkles, ExternalLink, ArrowRight, Hand, ThumbsDown, MousePointerClick, ChevronUp, ChevronDown, Command, HelpCircle, Eye, MessageSquare } from 'lucide-react';
import { createPcmBlob, decodeAudioData, blobToBase64, base64ToUint8Array } from '../utils/audio-utils';
import { performWebSearch } from '../services/gemini';
import { initializeGestureRecognizer, detectGesture } from '../services/gestureService';
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

const searchToolDeclaration: FunctionDeclaration = {
  name: 'search_web',
  parameters: {
    type: Type.OBJECT,
    description: 'Search the internet for real-time information, news, facts, recipes, or current events.',
    properties: {
      query: { type: Type.STRING, description: 'The search query string.' },
    },
    required: ['query'],
  },
};

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
  const [showHelp, setShowHelp] = useState(false);
  
  // HUD State
  const [holoData, setHoloData] = useState<HoloData | null>(null);
  
  // Default Mic to OFF
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [volume, setVolume] = useState(0);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  
  // Transcript & Live Text
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [liveInputText, setLiveInputText] = useState(''); // Realtime user speech
  
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [activeCommand, setActiveCommand] = useState<{ text: string; type: 'search' | 'scan' | 'think' } | null>(null);
  
  // Gesture State
  const [detectedGesture, setDetectedGesture] = useState<string | null>(null);
  const [gestureAction, setGestureAction] = useState<string | null>(null);

  // Refs for state access inside closures
  const isMicOnRef = useRef(isMicOn);
  const isVideoOnRef = useRef(isVideoOn);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureCooldownRef = useRef<number>(0);
  const gestureActionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Refs for audio/video elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  
  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  
  // Logic Refs
  const animationFrameRef = useRef<number | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null); 
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const gestureIntervalRef = useRef<number | null>(null);
  const gestureProcessingRef = useRef(false);
  const initializedRef = useRef(false);
  const isResponseStoppedRef = useRef(false);
  const isSocketOpenRef = useRef(false);

  // Sync refs with state
  useEffect(() => {
    isMicOnRef.current = isMicOn;
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMicOn;
      });
    }
    if (isMicOn && inputAudioContextRef.current?.state === 'suspended') {
      inputAudioContextRef.current.resume();
    }
  }, [isMicOn]);

  useEffect(() => {
    isVideoOnRef.current = isVideoOn;
  }, [isVideoOn]);

  // Initialize Gesture Recognizer
  useEffect(() => {
    initializeGestureRecognizer();
  }, []);

  const playAudioCue = useCallback(() => {
    try {
      const ctx = outputAudioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Futuristic 'confirm' blip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Ignore audio errors
    }
  }, []);

  const showCommandFeedback = useCallback((text: string, type: 'search' | 'scan' | 'think') => {
    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    playAudioCue();
    setActiveCommand({ text, type });
    commandTimeoutRef.current = setTimeout(() => setActiveCommand(null), 3000);
  }, [playAudioCue]);

  const toggleMic = async () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedbackMessage(newState ? "Microphone ON" : "Microphone OFF");
    feedbackTimeoutRef.current = setTimeout(() => setFeedbackMessage(null), 2000);
    
    // Resume context if user toggles mic, just in case
    if (newState && inputAudioContextRef.current?.state === 'suspended') {
        inputAudioContextRef.current.resume();
    }
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
    setFeedbackMessage("Playback Stopped");
    setTimeout(() => setFeedbackMessage(null), 2000);
  };

  const triggerScan = useCallback(() => {
     setFeedbackMessage("Analyzing Visual...");
     // In a real app, this would send a specific message to the model to analyze the current frame
     // For now, we simulate the 'Scan this' voice command effect
     if (sessionRef.current && isSocketOpenRef.current) {
        // We can't easily force the model to 'think' it heard text without sending audio,
        // but we can prompt the user visually.
     }
     if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
     feedbackTimeoutRef.current = setTimeout(() => setFeedbackMessage(null), 3000);
  }, []);

  const showGestureFeedback = (action: string) => {
      setGestureAction(action);
      if (gestureActionTimeoutRef.current) clearTimeout(gestureActionTimeoutRef.current);
      gestureActionTimeoutRef.current = setTimeout(() => setGestureAction(null), 1000);
  };

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
        const inputVol = (sum / dataArray.length) * 2; 
        setIsUserSpeaking(inputVol > 25);
        avgVolume = Math.max(avgVolume, inputVol);
      } else {
        setIsUserSpeaking(false);
      }

      setVolume(Math.min(avgVolume / 128, 1)); 
      animationFrameRef.current = requestAnimationFrame(update);
    };
    update();
  };
  
  const handleGesture = (gesture: string) => {
      const now = Date.now();
      if (now - gestureCooldownRef.current < 500) return; // Debounce

      if (gesture === "Pointing_Up") {
          if (transcriptRef.current) {
              transcriptRef.current.scrollBy({ top: -150, behavior: 'smooth' });
              showGestureFeedback("Scroll Up");
              gestureCooldownRef.current = now;
          }
      } else if (gesture === "Victory") {
          if (transcriptRef.current) {
              transcriptRef.current.scrollBy({ top: 150, behavior: 'smooth' });
              showGestureFeedback("Scroll Down");
              gestureCooldownRef.current = now;
          }
      } else if (gesture === "Thumb_Down") {
          if (holoData) {
              setHoloData(null);
              showGestureFeedback("Dismissed");
              gestureCooldownRef.current = now + 500;
          } else if (suggestedSites.length > 0) {
              setSuggestedSites([]);
              showGestureFeedback("Closed Suggestions");
              gestureCooldownRef.current = now + 500;
          }
      } else if (gesture === "Closed_Fist") {
          triggerScan();
          showGestureFeedback("Scan Triggered");
          gestureCooldownRef.current = now + 2000;
      }
  };

  const cleanupSession = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (gestureIntervalRef.current) clearInterval(gestureIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    isSocketOpenRef.current = false;
    if (sessionRef.current) {
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
      if (!apiKey) throw new Error("API Key not found.");
      
      const ai = new GoogleGenAI({ apiKey });
      
      // Setup Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // CRITICAL: Resume output context immediately to allow autoplay of greeting
      if (outputAudioContextRef.current.state === 'suspended') {
          await outputAudioContextRef.current.resume();
      }

      outputAnalyserRef.current = outputAudioContextRef.current.createAnalyser();
      outputAnalyserRef.current.fftSize = 512;
      outputAnalyserRef.current.connect(outputAudioContextRef.current.destination);

      inputAnalyserRef.current = inputAudioContextRef.current.createAnalyser();
      inputAnalyserRef.current.fftSize = 512;

      // Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
        video: {
           width: { ideal: 320 }, 
           height: { ideal: 240 }
        }
      });
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
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {}, 
          systemInstruction: `You are Alexis, an AI browser companion. User: ${user.name}.
          
          Role & Persona:
          - You are a high-performance technical assistant and browser co-pilot.
          - You have deep knowledge of technical jargon.
          
          Interaction Guidelines:
          - SPEAK AND LISTEN IN ENGLISH ONLY.
          - IMPORTANT: As soon as the session starts, you MUST verbally greet the user by their name (${user.name}) and enthusiastically ask what they would like to search for or explore today. Do not wait for user input.
          - Be conversational but concise.
          - Use 'search_web' for facts/news.
          - Use 'render_hud_overlay' for visual analysis commands.`,
          tools: [{ functionDeclarations: [searchToolDeclaration, hudToolDeclaration] }],
        },
      };

      let sessionPromise: Promise<any>;
      sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Session Connected");
            setIsSessionActive(true);
            isSocketOpenRef.current = true;
            startAudioAnalysis();

            // Trigger the initial greeting immediately with explicit instruction for audio
            sessionPromise.then(session => {
              session.send({ 
                  clientContent: { 
                      turns: [{ 
                          role: 'user', 
                          parts: [{ text: `Hello Alexis. My name is ${user.name}. Please greet me loudly.` }] 
                      }], 
                      turnComplete: true 
                  } 
              });
            });
            
            if (inputAudioContextRef.current && streamRef.current) {
              const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
              
              const highPassFilter = inputAudioContextRef.current.createBiquadFilter();
              highPassFilter.type = 'highpass';
              highPassFilter.frequency.value = 150; 
              
              const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                if (!isMicOnRef.current || !isSocketOpenRef.current) return;
                
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData, inputAudioContextRef.current?.sampleRate || 48000);
                
                sessionPromise.then(session => {
                    if (isSocketOpenRef.current) {
                        try {
                           session.sendRealtimeInput({ media: pcmBlob });
                        } catch (e) {
                           console.error("Audio send error", e);
                        }
                    }
                }).catch(err => console.error("Session not ready for audio", err));
              };
              
              source.connect(highPassFilter);
              highPassFilter.connect(inputAnalyserRef.current!);
              highPassFilter.connect(scriptProcessor);
              
              const silence = inputAudioContextRef.current.createGain();
              silence.gain.value = 0;
              scriptProcessor.connect(silence);
              silence.connect(inputAudioContextRef.current.destination);
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
              // Real-time Input Transcription (User Speech Stream)
              if (msg.serverContent?.inputTranscription) {
                const text = msg.serverContent.inputTranscription.text;
                setLiveInputText(prev => prev + text);
                updateTranscript('user', text, false);
              }
              
              // Output Transcription (Model Speech Stream)
              if (msg.serverContent?.outputTranscription) {
                updateTranscript('model', msg.serverContent.outputTranscription.text, false);
              }

              if (msg.serverContent?.turnComplete) {
                setTranscripts(prev => prev.map(t => ({ ...t, isComplete: true })));
                // Clear live text once turn is done
                setLiveInputText('');
              }

              // Interruption
              if (msg.serverContent?.interrupted) {
                isResponseStoppedRef.current = false;
                sourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
                sourcesRef.current.clear();
                if (outputAudioContextRef.current) {
                   nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
                }
                setLiveInputText('');
              }

              // Audio Output
              const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData && outputAudioContextRef.current && !isResponseStoppedRef.current) {
                const ctx = outputAudioContextRef.current;
                const audioBuffer = await decodeAudioData(base64ToUint8Array(audioData), ctx);
                
                const MIN_BUFFER_TIME = 0.02;
                if (nextStartTimeRef.current < ctx.currentTime) {
                   nextStartTimeRef.current = ctx.currentTime + MIN_BUFFER_TIME;
                }
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAnalyserRef.current || ctx.destination);
                source.start(nextStartTimeRef.current);
                
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => { sourcesRef.current.delete(source); };
              }

              // Tool Execution
              if (msg.toolCall) {
                if (sessionRef.current) {
                  const functionResponses = [];
                  for (const fc of msg.toolCall.functionCalls) {
                     if (fc.name === 'search_web') {
                       try {
                         const query = (fc.args as any).query;
                         showCommandFeedback(`Searching: ${query}`, 'search');
                         
                         const searchResult = await performWebSearch(query);
                         setSuggestedSites(searchResult.sources);
                         
                         functionResponses.push({
                           id: fc.id, 
                           name: fc.name,
                           response: { result: `Summary: ${searchResult.text}` }
                         });
                       } catch (e) {
                         console.error("Tool execution failed", e);
                         functionResponses.push({
                           id: fc.id,
                           name: fc.name,
                           response: { result: "Error performing search." }
                         });
                       }
                     } else if (fc.name === 'render_hud_overlay') {
                       try {
                         showCommandFeedback("Analyzing Target...", 'scan');
                         const data = fc.args as unknown as HoloData;
                         setHoloData(data);
                         setSuggestedSites([]); 
                         
                         functionResponses.push({
                           id: fc.id, 
                           name: fc.name,
                           response: { result: "HUD Rendered." }
                         });
                       } catch (e) {
                         console.error("HUD execution failed", e);
                         functionResponses.push({
                           id: fc.id,
                           name: fc.name,
                           response: { result: "Error rendering HUD." }
                         });
                       }
                     }
                  }
                  
                  if (functionResponses.length > 0) {
                      sessionRef.current.sendToolResponse({
                        functionResponses: functionResponses
                      });
                  }
                }
              }
          },
          onclose: () => { 
            console.log("Session Closed");
            isSocketOpenRef.current = false;
            setIsSessionActive(false); 
          },
          onerror: (err) => {
            console.error("Gemini Error:", err);
            if (isSocketOpenRef.current) {
              setError("Network error. Reconnecting...");
              cleanupSession();
              setTimeout(() => connectToGemini(), 2000);
            }
          }
        }
      });
      
      sessionRef.current = await sessionPromise;

      // Video Streaming & Gesture Loop
      if (canvasRef.current) {
         const ctx = canvasRef.current.getContext('2d');
         
         frameIntervalRef.current = window.setInterval(() => {
           if (videoRef.current && ctx && isVideoOnRef.current && isSocketOpenRef.current) {
              const MAX_WIDTH = 240;
              const ratio = videoRef.current.videoWidth / videoRef.current.videoHeight;
              canvasRef.current!.width = MAX_WIDTH;
              canvasRef.current!.height = MAX_WIDTH / ratio;
              
              ctx.drawImage(videoRef.current, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
              
              canvasRef.current!.toBlob(async (blob) => {
                if (blob) {
                  const base64 = await blobToBase64(blob);
                  sessionPromise.then(session => {
                      if (isSocketOpenRef.current) {
                        try {
                           session.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64 } });
                        } catch (e) {
                           console.error("Video send error", e);
                        }
                      }
                  }).catch(e => console.error("Session not ready for video", e));
                }
              }, 'image/jpeg', 0.4);
           }
         }, 1000);
         
         gestureIntervalRef.current = window.setInterval(async () => {
             if (videoRef.current && isVideoOnRef.current && !gestureProcessingRef.current) {
                 gestureProcessingRef.current = true;
                 try {
                     const gesture = detectGesture(videoRef.current);
                     if (gesture) {
                         setDetectedGesture(gesture);
                         handleGesture(gesture);
                     } else {
                         setDetectedGesture(null);
                     }
                 } catch (e) {
                 } finally {
                     gestureProcessingRef.current = false;
                 }
             }
         }, 500);
      }

    } catch (err: any) {
      setError(err.message || "Failed to initialize");
      setIsSessionActive(false);
      initializedRef.current = false;
    }
  }, [user.name, showCommandFeedback]);

  useEffect(() => {
    connectToGemini();
    return () => cleanupSession();
  }, [connectToGemini]);

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcripts]);

  // Helper to render gesture icon
  const getGestureIcon = (gesture: string | null) => {
      switch(gesture) {
          case 'Pointing_Up': return <ChevronUp className="w-5 h-5" />;
          case 'Victory': return <ChevronDown className="w-5 h-5" />;
          case 'Thumb_Down': return <ThumbsDown className="w-5 h-5" />;
          case 'Closed_Fist': return <MousePointerClick className="w-5 h-5" />;
          default: return <Hand className="w-5 h-5" />;
      }
  };

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
              {error ? error : isSessionActive ? 'Alexis Connected' : 'Connecting...'}
            </span>
          </div>
          
          <div className={`flex gap-4 transition-opacity ${!isSessionActive ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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
               className="p-3 rounded-full bg-slate-800 text-white hover:bg-red-500/20 hover:text-red-400 border border-slate-700 transition-colors"
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

             <button 
               onClick={() => setShowHelp(true)}
               className="p-3 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
               title="Help & Controls"
             >
               <HelpCircle className="w-5 h-5"/>
             </button>
          </div>
        </div>

        {/* HELP OVERLAY */}
        {showHelp && (
            <div className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowHelp(false)}>
               <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-4xl w-full shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                  {/* Decorative Glow */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between mb-8">
                     <div>
                       <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                         <Sparkles className="w-6 h-6 text-indigo-400"/> Neural Interface Guide
                       </h2>
                       <p className="text-slate-400 text-sm mt-1">Master your multimodal companion</p>
                     </div>
                     <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                     </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                      {/* Voice Section */}
                      <div className="space-y-6">
                         <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                           <Mic className="w-4 h-4" /> Voice Intelligence
                         </h3>
                         <div className="space-y-4">
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex gap-4 items-start">
                               <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 mt-1"><Globe className="w-5 h-5"/></div>
                               <div>
                                  <h4 className="font-semibold text-slate-200">Real-time Search</h4>
                                  <p className="text-sm text-slate-400 mt-1">Ask about news, facts, or weather.</p>
                                  <code className="block mt-2 text-xs bg-slate-950 px-2 py-1 rounded text-emerald-400 font-mono">"Search for the latest tech news"</code>
                               </div>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex gap-4 items-start">
                               <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400 mt-1"><Eye className="w-5 h-5"/></div>
                               <div>
                                  <h4 className="font-semibold text-slate-200">Visual Analysis</h4>
                                  <p className="text-sm text-slate-400 mt-1">Show objects to the camera for instant analysis.</p>
                                  <code className="block mt-2 text-xs bg-slate-950 px-2 py-1 rounded text-emerald-400 font-mono">"What is this?" or "Scan this"</code>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Gestures Section */}
                      <div className="space-y-6">
                         <h3 className="text-sm font-bold uppercase tracking-widest text-purple-400 flex items-center gap-2">
                           <Hand className="w-4 h-4" /> Gesture Control
                         </h3>
                         <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center text-center hover:bg-slate-800 transition-colors">
                               <div className="mb-2 p-2 bg-slate-900 rounded-full text-purple-400"><ChevronUp className="w-6 h-6"/></div>
                               <span className="text-xs font-bold text-slate-300">POINT UP</span>
                               <span className="text-[10px] text-slate-500 mt-1">Scroll Up</span>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center text-center hover:bg-slate-800 transition-colors">
                               <div className="mb-2 p-2 bg-slate-900 rounded-full text-purple-400"><ChevronDown className="w-6 h-6"/></div>
                               <span className="text-xs font-bold text-slate-300">VICTORY (PEACE)</span>
                               <span className="text-[10px] text-slate-500 mt-1">Scroll Down</span>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center text-center hover:bg-slate-800 transition-colors">
                               <div className="mb-2 p-2 bg-slate-900 rounded-full text-purple-400"><MousePointerClick className="w-6 h-6"/></div>
                               <span className="text-xs font-bold text-slate-300">CLOSED FIST</span>
                               <span className="text-[10px] text-slate-500 mt-1">Select / Scan</span>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center text-center hover:bg-slate-800 transition-colors">
                               <div className="mb-2 p-2 bg-slate-900 rounded-full text-purple-400"><ThumbsDown className="w-6 h-6"/></div>
                               <span className="text-xs font-bold text-slate-300">THUMB DOWN</span>
                               <span className="text-[10px] text-slate-500 mt-1">Dismiss</span>
                            </div>
                         </div>
                      </div>
                  </div>
               </div>
            </div>
        )}

        {/* Command Feedback Overlay */}
        {activeCommand && (
          <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none w-full max-w-md px-6">
             <div className="relative overflow-hidden flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-indigo-600/90 to-purple-600/90 backdrop-blur-xl border-t border-white/20 rounded-2xl shadow-[0_0_50px_rgba(79,70,229,0.4)] animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300">
                {/* Glowing border effect */}
                <div className="absolute inset-0 border-2 border-white/10 rounded-2xl"></div>
                
                {activeCommand.type === 'search' && (
                   <div className="p-2 bg-white/20 rounded-full animate-pulse">
                      <Globe className="w-6 h-6 text-white" />
                   </div>
                )}
                {activeCommand.type === 'scan' && (
                   <div className="p-2 bg-white/20 rounded-full animate-pulse">
                      <ScanEye className="w-6 h-6 text-white" />
                   </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100 flex items-center gap-1">
                    <Command className="w-3 h-3" /> Voice Command
                  </span>
                  <span className="font-bold text-white text-xl tracking-tight truncate shadow-black drop-shadow-sm leading-tight">
                    {activeCommand.text}
                  </span>
                </div>
             </div>
          </div>
        )}

        {/* Feedback Toast (Mic toggle etc) */}
        {feedbackMessage && !activeCommand && (
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
        
        {/* Gesture Action Toast */}
        {gestureAction && (
          <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-900/80 backdrop-blur rounded-lg border border-indigo-500/50 shadow-xl animate-in fade-in slide-in-from-bottom-2">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <span className="text-sm font-bold text-indigo-100 uppercase tracking-wider">{gestureAction}</span>
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
              {holoData ? (
                 <HoloCard data={holoData} onClose={() => setHoloData(null)} />
              ) : (
                 <div className="relative flex flex-col items-center">
                   
                   {/* Realtime "Live Input" HUD Text */}
                   <div className="absolute -top-32 w-[600px] text-center pointer-events-none z-20 min-h-[60px] flex items-end justify-center">
                      {liveInputText && (
                        <span className="text-3xl md:text-4xl font-light text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-cyan-200 animate-in fade-in zoom-in-95 duration-200 leading-tight drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
                          {liveInputText}
                        </span>
                      )}
                      {!liveInputText && isUserSpeaking && (
                         <div className="flex items-center gap-1.5 opacity-50">
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></div>
                         </div>
                      )}
                   </div>

                   {/* Visualizer */}
                   <Visualizer isActive={isSessionActive} isUserSpeaking={isUserSpeaking} volume={volume} />
                 </div>
              )}
            </div>
          )}

          {!isMicOn && isSessionActive && !error && (
            <div className="absolute mt-52 text-slate-500 text-sm font-light animate-pulse">
              Microphone muted. Tap the mic icon to speak.
            </div>
          )}
          
          <div className={`absolute bottom-8 right-8 w-48 h-36 bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl transition-all duration-500 ${isVideoOn && !error ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
             <video ref={videoRef} className="w-full h-full object-cover mirror-mode" muted playsInline />
             <div className="absolute top-2 left-2 bg-black/40 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-white/70">YOU</div>
             
             {/* Gesture Indicator Overlay */}
             {isVideoOn && detectedGesture && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-indigo-600/80 backdrop-blur rounded text-white animate-in zoom-in">
                    {getGestureIcon(detectedGesture)}
                    <span className="text-[9px] font-bold uppercase">{detectedGesture.replace('_', ' ')}</span>
                </div>
             )}
          </div>
        </div>

        {!holoData && (
          <div className="flex-1 max-h-[250px] w-full max-w-2xl mx-auto px-6 mb-4 overflow-y-auto mask-gradient relative z-10" ref={transcriptRef}>
             <div className="space-y-4 flex flex-col justify-end min-h-full pb-4">
               {transcripts.map((t, idx) => (
                  <div key={idx} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                     <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                       t.role === 'user' 
                       ? 'bg-slate-800 text-slate-200 rounded-tr-sm border border-slate-700 opacity-60' 
                       : 'bg-indigo-600/20 text-indigo-100 rounded-tl-sm border border-indigo-500/30 backdrop-blur-sm'
                     }`}>
                       <ReactMarkdown>{t.text}</ReactMarkdown>
                     </div>
                  </div>
               ))}
               {transcripts.length === 0 && isSessionActive && (
                 <div className="text-center text-slate-500 text-sm italic mt-auto opacity-0 animate-in fade-in duration-1000">
                   "Hey {user.name}, what are you looking forward to search today?"
                 </div>
               )}
             </div>
          </div>
        )}

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
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                   </div>
                   <div className="font-medium text-slate-200 line-clamp-2 group-hover:text-white transition-colors">
                     {site.title}
                   </div>
                   <div className="mt-3 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                     Tap to read more <ArrowRight className="w-3 h-3" />
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