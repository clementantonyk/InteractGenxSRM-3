import React from 'react';
import { SmartWidgetData } from '../types';
import { Check, X, TrendingUp, TrendingDown, Minus, Calendar, GitCommit, Network } from 'lucide-react';

interface SmartWidgetsProps {
  data: SmartWidgetData;
  onNodeClick?: (label: string) => void;
}

export const SmartWidgets: React.FC<SmartWidgetsProps> = ({ data, onNodeClick }) => {
  
  // --- Comparison Widget ---
  if (data.type === 'comparison' && data.comparisonData) {
    return (
      <div className="w-full my-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-lg text-indigo-300">{data.title || 'Comparison'}</h3>
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold bg-slate-800 px-2 py-1 rounded">Auto-Generated</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {data.comparisonData.headers.map((header, i) => (
                    <th key={i} className={`p-4 text-sm font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700 ${i === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'}`}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {data.comparisonData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/20 transition-colors">
                    <td className="p-4 font-medium text-indigo-200 bg-slate-800/20">{row.feature}</td>
                    {row.values.map((val, vIdx) => (
                      <td key={vIdx} className="p-4 text-slate-300">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- Timeline Widget ---
  if (data.type === 'timeline' && data.timelineData) {
    return (
      <div className="w-full my-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h3 className="font-bold text-lg text-indigo-300 mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5" /> {data.title || 'Timeline'}
        </h3>
        <div className="relative border-l-2 border-slate-700 ml-3 space-y-8 pb-4">
          {data.timelineData.map((event, idx) => (
            <div key={idx} className="relative pl-8 group">
              {/* Timeline Dot */}
              <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-indigo-500 group-hover:bg-indigo-500 transition-colors shadow-[0_0_10px_rgba(99,102,241,0.3)]"></div>
              
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 hover:border-indigo-500/30 transition-all hover:shadow-lg">
                <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
                  {event.year}
                </span>
                <h4 className="text-lg font-semibold text-white mb-1">{event.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Stats Widget ---
  if (data.type === 'stats' && data.statsData) {
    return (
      <div className="w-full my-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
         <h3 className="font-bold text-lg text-indigo-300 mb-4">{data.title || 'Key Insights'}</h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.statsData.map((stat, idx) => (
              <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 flex flex-col items-center text-center hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all">
                 <span className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">{stat.label}</span>
                 <span className="text-2xl md:text-3xl font-bold text-white mb-2">{stat.value}</span>
                 {stat.trend === 'up' && <div className="flex items-center gap-1 text-xs text-emerald-400"><TrendingUp className="w-3 h-3" /> Trending Up</div>}
                 {stat.trend === 'down' && <div className="flex items-center gap-1 text-xs text-red-400"><TrendingDown className="w-3 h-3" /> Trending Down</div>}
                 {stat.trend === 'neutral' && <div className="flex items-center gap-1 text-xs text-slate-400"><Minus className="w-3 h-3" /> Stable</div>}
              </div>
            ))}
         </div>
      </div>
    );
  }

  // --- Knowledge Graph Widget ---
  if (data.type === 'graph' && data.graphData) {
      const { nodes, links } = data.graphData;
      
      // Simple layout calculation: Central node in middle, others orbiting
      const width = 600;
      const height = 400;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = 140;

      const mainNode = nodes.find(n => n.type === 'main') || nodes[0];
      const subNodes = nodes.filter(n => n.id !== mainNode.id);

      const getNodePos = (index: number, total: number) => {
          const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
          return {
              x: centerX + radius * Math.cos(angle),
              y: centerY + radius * Math.sin(angle)
          };
      };

      return (
        <div className="w-full my-8 animate-in fade-in zoom-in duration-700">
           <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4 relative z-10">
                 <Network className="w-5 h-5 text-indigo-400" />
                 <h3 className="font-bold text-lg text-indigo-200">{data.title || 'Knowledge Graph'}</h3>
                 <span className="ml-auto text-xs text-slate-500">Click a node to explore</span>
              </div>

              <div className="relative w-full h-[400px] flex items-center justify-center">
                 <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 pointer-events-none">
                    {subNodes.map((node, i) => {
                        const pos = getNodePos(i, subNodes.length);
                        return (
                            <line 
                              key={i} 
                              x1={centerX} 
                              y1={centerY} 
                              x2={pos.x} 
                              y2={pos.y} 
                              stroke="rgba(99,102,241,0.3)" 
                              strokeWidth="2"
                              strokeDasharray="4 4"
                            />
                        );
                    })}
                 </svg>

                 {/* Main Node */}
                 <button 
                   onClick={() => onNodeClick && onNodeClick(mainNode.label)}
                   className="absolute z-20 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center justify-center p-2 text-center text-xs font-bold text-white hover:scale-110 transition-transform cursor-pointer animate-pulse"
                   style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                 >
                    {mainNode.label}
                 </button>

                 {/* Sub Nodes */}
                 {subNodes.map((node, i) => {
                    const pos = getNodePos(i, subNodes.length);
                    return (
                        <button
                           key={node.id}
                           onClick={() => onNodeClick && onNodeClick(node.label)}
                           className="absolute z-20 w-20 h-20 rounded-full bg-slate-800 border border-slate-600 hover:border-indigo-400 hover:bg-slate-700 shadow-xl flex items-center justify-center p-2 text-center text-[10px] font-medium text-slate-200 transition-all duration-300 hover:scale-110 cursor-pointer"
                           style={{ 
                               left: pos.x, 
                               top: pos.y, 
                               transform: 'translate(-50%, -50%)',
                               animation: `float 3s ease-in-out infinite ${i * 0.5}s`
                           }}
                        >
                           {node.label}
                        </button>
                    );
                 })}
              </div>
           </div>
           
           <style>{`
             @keyframes float {
               0%, 100% { transform: translate(-50%, -50%) translateY(0); }
               50% { transform: translate(-50%, -50%) translateY(-10px); }
             }
           `}</style>
        </div>
      );
  }

  return null;
};
