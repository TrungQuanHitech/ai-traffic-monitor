import React from 'react';
import { X, AlertTriangle, Clock, Car, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Alert } from '../types';

interface AlertDetailModalProps {
  selectedAlert: Alert | null;
  onClose: () => void;
  onDeleteAlert: (id: number) => void;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  selectedAlert,
  onClose,
  onDeleteAlert,
}) => {
  return (
    <AnimatePresence>
      {selectedAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-5xl bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Image Section */}
              <div className="lg:col-span-8 aspect-video bg-black relative group">
                <img 
                  src={selectedAlert.image_data} 
                  alt="Alert Detail" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Info Section */}
              <div className="lg:col-span-4 p-8 flex flex-col justify-between bg-zinc-900">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                      <AlertTriangle className="w-6 h-6 text-emerald-400" />
                    </div>
                    <button 
                      onClick={onClose}
                      className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <h3 className="text-2xl font-semibold mb-2 capitalize">{selectedAlert.type} Detected</h3>
                  <p className="text-zinc-500 text-sm mb-8">Vehicle identified passing through the designated ROI monitoring zone.</p>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Timestamp</p>
                        <p className="text-sm font-medium">{new Date(selectedAlert.timestamp).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                        <Car className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Confidence Score</p>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium">{Math.round(selectedAlert.confidence * 100)}%</p>
                          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500" 
                              style={{ width: `${selectedAlert.confidence * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => onDeleteAlert(selectedAlert.id)}
                      className="w-full py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Alert Record
                    </button>
                  </div>
                </div>

                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-white text-black rounded-2xl font-semibold hover:scale-[1.02] transition-transform active:scale-[0.98] mt-8"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
