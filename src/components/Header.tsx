import React from 'react';
import { Camera, Settings, BrainCircuit, Loader2 } from 'lucide-react';

interface HeaderProps {
  status: string;
  fps: number;
  processingFps: number;
  isAnalyzing: boolean;
  onDeepAnalysis: () => void;
  onShowSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  fps,
  processingFps,
  isAnalyzing,
  onDeepAnalysis,
  onShowSettings,
}) => {
  return (
    <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <Camera className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-tight">AI Traffic Monitor</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Real-time Vehicle Detection</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-full border border-white/5`}>
            <div className={`w-2 h-2 rounded-full ${status.includes('Ready') || status.includes('Active') ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-xs font-medium text-zinc-400">{status}</span>
          </div>
          <div className="flex items-center gap-4 px-4 py-1.5 bg-zinc-900/50 rounded-full border border-white/5">
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-zinc-500 uppercase">Stream</span>
              <span className="text-emerald-400 font-bold">{fps}</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-zinc-500 uppercase">AI Proc</span>
              <span className={`${processingFps < fps * 0.8 ? 'text-amber-400' : 'text-emerald-400'} font-bold`}>{processingFps}</span>
            </div>
          </div>
          
          <button 
            onClick={onDeepAnalysis}
            disabled={isAnalyzing}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-medium text-xs transition-all duration-300 ${
              isAnalyzing 
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
            }`}
          >
            {isAnalyzing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <BrainCircuit className="w-3 h-3" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Deep Scan'}
          </button>

          <button 
            onClick={onShowSettings}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
