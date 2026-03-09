import React from 'react';
import { X, Volume2, VolumeX, Settings, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
  appSettings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  onClose,
  appSettings,
  onSaveSettings,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-semibold">System Settings</h2>
              <button onClick={onClose} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8">
              {/* Threshold */}
              <div>
                <div className="flex justify-between mb-4">
                  <label className="text-sm font-medium text-zinc-400">Detection Threshold</label>
                  <span className="text-sm font-mono text-emerald-400">{Math.round(appSettings.threshold * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="0.95" 
                  step="0.05"
                  value={appSettings.threshold}
                  onChange={(e) => onSaveSettings({ ...appSettings, threshold: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-[10px] text-zinc-500 mt-2 italic">Higher values reduce false positives but might miss some vehicles.</p>
              </div>

              {/* Cooldown */}
              <div>
                <div className="flex justify-between mb-4">
                  <label className="text-sm font-medium text-zinc-400">Alert Cooldown</label>
                  <span className="text-sm font-mono text-emerald-400">{appSettings.cooldown / 1000}s</span>
                </div>
                <input 
                  type="range" 
                  min="1000" 
                  max="30000" 
                  step="1000"
                  value={appSettings.cooldown}
                  onChange={(e) => onSaveSettings({ ...appSettings, cooldown: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-[10px] text-zinc-500 mt-2 italic">Minimum time between consecutive alerts for the same zone.</p>
              </div>

              {/* Audio Toggle */}
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  {appSettings.audioEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
                  <span className="text-sm font-medium">Audio Alerts</span>
                </div>
                <button 
                  onClick={() => onSaveSettings({ ...appSettings, audioEnabled: !appSettings.audioEnabled })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${appSettings.audioEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${appSettings.audioEnabled ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              {/* Debug Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <Settings className={`w-5 h-5 ${appSettings.debugMode ? 'text-purple-400' : 'text-zinc-500'}`} />
                  <span className="text-sm font-medium">Debug Mode</span>
                </div>
                <button 
                  onClick={() => onSaveSettings({ ...appSettings, debugMode: !appSettings.debugMode })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${appSettings.debugMode ? 'bg-purple-500' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${appSettings.debugMode ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-semibold hover:bg-emerald-600 transition-colors mt-8 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" /> Save & Close
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
