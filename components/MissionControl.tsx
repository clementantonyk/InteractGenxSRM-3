import React from 'react';
import { CheckCircle2, Circle, ListTodo, Play, ArrowRight } from 'lucide-react';

export interface MissionStep {
  id: string;
  text: string;
  status: 'pending' | 'active' | 'completed';
}

export interface MissionPlan {
  title: string;
  steps: MissionStep[];
}

interface MissionControlProps {
  plan: MissionPlan;
  onStepClick: (stepIndex: number) => void;
  onClose: () => void;
}

export const MissionControl: React.FC<MissionControlProps> = ({ plan, onStepClick, onClose }) => {
  const progress = Math.round((plan.steps.filter(s => s.status === 'completed').length / plan.steps.length) * 100);

  return (
    <div className="absolute top-24 left-6 z-40 w-80 animate-in slide-in-from-left-4 duration-500">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.15)] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-900/50 to-slate-900">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-indigo-400">
              <ListTodo className="w-4 h-4" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Active Mission</span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white text-xs">Close</button>
          </div>
          <h3 className="text-white font-bold leading-tight">{plan.title}</h3>
          
          {/* Progress Bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-indigo-300">{progress}%</span>
          </div>
        </div>

        {/* Steps List */}
        <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
          {plan.steps.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => onStepClick(idx)}
              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group relative overflow-hidden ${
                step.status === 'active' 
                  ? 'bg-indigo-600/20 border-indigo-500/50 shadow-inner' 
                  : 'bg-transparent border-transparent hover:bg-slate-800'
              }`}
            >
              {/* Active Indicator */}
              {step.status === 'active' && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
              )}

              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${
                  step.status === 'completed' ? 'text-emerald-400' : 
                  step.status === 'active' ? 'text-indigo-400' : 'text-slate-600'
                }`}>
                  {step.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : 
                   step.status === 'active' ? <Play className="w-4 h-4 fill-current" /> : 
                   <Circle className="w-4 h-4" />}
                </div>
                
                <div className="flex-1">
                  <p className={`text-xs font-medium leading-relaxed ${
                    step.status === 'completed' ? 'text-slate-500 line-through' : 
                    step.status === 'active' ? 'text-white' : 'text-slate-300'
                  }`}>
                    {step.text}
                  </p>
                </div>

                {step.status !== 'active' && step.status !== 'completed' && (
                  <ArrowRight className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};
