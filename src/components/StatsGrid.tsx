import React from 'react';
import { Car, Truck, AlertTriangle } from 'lucide-react';
import { Alert } from '../types';

interface StatsGridProps {
  alerts: Alert[];
  filterType: string | null;
  onFilterChange: (type: string | null) => void;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  alerts,
  filterType,
  onFilterChange,
}) => {
  const getCount = (type: string) => {
    if (type === 'bike') {
      return alerts.filter(a => a.type === 'motorcycle' || a.type === 'bicycle').length;
    }
    return alerts.filter(a => a.type === type).length;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button 
        onClick={() => onFilterChange(filterType === 'car' ? null : 'car')}
        className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
          filterType === 'car' 
          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
          : 'bg-zinc-900/50 border-white/5 hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-2 text-zinc-500 mb-1">
          <Car className={`w-4 h-4 ${filterType === 'car' ? 'text-emerald-400' : ''}`} />
          <span className={`text-[10px] uppercase tracking-wider font-semibold ${filterType === 'car' ? 'text-emerald-400' : ''}`}>Cars</span>
        </div>
        <div className="text-2xl font-semibold">{getCount('car')}</div>
      </button>

      <button 
        onClick={() => onFilterChange(filterType === 'truck' ? null : 'truck')}
        className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
          filterType === 'truck' 
          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
          : 'bg-zinc-900/50 border-white/5 hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-2 text-zinc-500 mb-1">
          <Truck className={`w-4 h-4 ${filterType === 'truck' ? 'text-emerald-400' : ''}`} />
          <span className={`text-[10px] uppercase tracking-wider font-semibold ${filterType === 'truck' ? 'text-emerald-400' : ''}`}>Trucks</span>
        </div>
        <div className="text-2xl font-semibold">{getCount('truck')}</div>
      </button>

      <button 
        onClick={() => onFilterChange(filterType === 'bike' ? null : 'bike')}
        className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
          filterType === 'bike' 
          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
          : 'bg-zinc-900/50 border-white/5 hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-2 text-zinc-500 mb-1">
          <div className={`w-4 h-4 flex items-center justify-center ${filterType === 'bike' ? 'grayscale-0' : 'grayscale'}`}>🏍️</div>
          <span className={`text-[10px] uppercase tracking-wider font-semibold ${filterType === 'bike' ? 'text-emerald-400' : ''}`}>Bikes</span>
        </div>
        <div className="text-2xl font-semibold">{getCount('bike')}</div>
      </button>

      <button 
        onClick={() => onFilterChange(null)}
        className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
          filterType === null 
          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
          : 'bg-zinc-900/50 border-white/5 hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-2 text-zinc-500 mb-1">
          <AlertTriangle className={`w-4 h-4 ${filterType === null ? 'text-emerald-400' : ''}`} />
          <span className={`text-[10px] uppercase tracking-wider font-semibold ${filterType === null ? 'text-emerald-400' : ''}`}>Total</span>
        </div>
        <div className="text-2xl font-semibold text-emerald-400">{alerts.length}</div>
      </button>
    </div>
  );
};
