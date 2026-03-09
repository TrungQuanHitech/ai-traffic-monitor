import React from 'react';
import { History, Trash2, Clock, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Alert, ROI } from '../types';

interface AlertHistoryProps {
  alerts: Alert[];
  roi: ROI | null;
  filterType: string | null;
  onClearAlerts: () => void;
  onDeleteAlert: (id: number, e?: React.MouseEvent) => void;
  onSelectAlert: (alert: Alert) => void;
}

export const AlertHistory: React.FC<AlertHistoryProps> = ({
  alerts,
  roi,
  filterType,
  onClearAlerts,
  onDeleteAlert,
  onSelectAlert,
}) => {
  const filteredAlerts = alerts.filter(alert => {
    if (!filterType) return true;
    if (filterType === 'bike') return alert.type === 'motorcycle' || alert.type === 'bicycle';
    return alert.type === filterType;
  });

  return (
    <div className="lg:col-span-4 flex flex-col h-[calc(100vh-160px)]">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-500" />
          <h2 className="font-semibold text-sm">Alert History</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onClearAlerts}
            className="p-1.5 hover:bg-red-500/10 hover:text-red-400 text-zinc-500 rounded-lg transition-colors"
            title="Clear History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 font-mono">
            {alerts.length} Records
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {alerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-white/5 rounded-3xl">
              <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-zinc-700" />
              </div>
              <p className="text-zinc-500 text-sm">
                No alerts detected yet.
                {!roi && <><br/>Draw an ROI to begin monitoring.</>}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-3 bg-zinc-900/40 border border-white/5 rounded-2xl hover:bg-zinc-900/60 transition-all group cursor-pointer active:scale-[0.98]"
                onClick={() => onSelectAlert(alert)}
              >
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-black border border-white/10 flex-shrink-0 relative">
                    <img 
                      src={alert.image_data} 
                      alt="Alert" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Maximize2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        {alert.type}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                        <button 
                          onClick={(e) => onDeleteAlert(alert.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 text-zinc-500 rounded transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 mb-2 truncate">Detected in monitoring zone</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${alert.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {Math.round(alert.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
