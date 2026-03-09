/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  Square, 
  Play, 
  Pause,
  X,
  Bell,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Modular Components
import { Header } from './components/Header';
import { StatsGrid } from './components/StatsGrid';
import { AlertHistory } from './components/AlertHistory';
import { SettingsModal } from './components/SettingsModal';
import { AlertDetailModal } from './components/AlertDetailModal';

// Hooks & Types
import { useYOLO } from './hooks/useYOLO';
import { Alert, ROI, AppSettings } from './types';

export default function App() {
  // Refs for Canvases
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const roiCanvasRef = useRef<HTMLCanvasElement>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContext = useRef<AudioContext | null>(null);

  // App State
  const [isStreaming, setIsStreaming] = useState(true);
  const [roi, setRoi] = useState<ROI | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [lastAlertTime, setLastAlertTime] = useState(0);
  const [status, setStatus] = useState('Connecting to stream...');
  const [fps, setFps] = useState(0);
  const [processingFps, setProcessingFps] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isAlerting, setIsAlerting] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  
  const [appSettings, setAppSettings] = useState<AppSettings>({
    threshold: 0.4,
    cooldown: 5000,
    audioEnabled: true,
    debugMode: false
  });

  const frameCount = useRef(0);
  const lastFpsUpdate = useRef(Date.now());
  const { detect } = useYOLO(setStatus, setProcessingFps);

  // Fetch initial data
  useEffect(() => {
    fetch('/api/alerts').then(res => res.json()).then(setAlerts).catch(console.error);
    fetch('/api/roi').then(res => res.json()).then(data => { if (data) { setRoi(data); drawROI(data); } }).catch(console.error);
    fetch('/api/settings').then(res => res.json()).then(setAppSettings).catch(console.error);
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (lastAlertTime === 0) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, appSettings.cooldown - (Date.now() - lastAlertTime));
      setCooldownRemaining(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [lastAlertTime, appSettings.cooldown]);

  // WebSocket for video stream
  useEffect(() => {
    if (!isStreaming) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    ws.binaryType = 'arraybuffer';
    ws.onmessage = (event) => {
      const url = URL.createObjectURL(new Blob([event.data], { type: 'image/jpeg' }));
      const img = new Image();
      img.onload = () => {
        if (videoCanvasRef.current) {
          const ctx = videoCanvasRef.current.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 1280, 720);
            detectFrame(videoCanvasRef.current);
          }
        }
        URL.revokeObjectURL(url);
        frameCount.current++;
        const now = Date.now();
        if (now - lastFpsUpdate.current >= 1000) {
          setFps(frameCount.current);
          frameCount.current = 0;
          lastFpsUpdate.current = now;
        }
      };
      img.src = url;
    };
    return () => ws.close();
  }, [isStreaming, detect]);

  const detectFrame = (canvas: HTMLCanvasElement) => {
    detect(canvas, appSettings, roi, handleAlert, drawDetections);
  };

  const handleAlert = (type: string, score: number) => {
    const now = Date.now();
    if (now - lastAlertTime > appSettings.cooldown) {
      setLastAlertTime(now);
      setIsAlerting(true);
      setTimeout(() => setIsAlerting(false), 1000);
      if (appSettings.audioEnabled) playAlertSound();
      if (videoCanvasRef.current) {
        triggerAlert(type, score, videoCanvasRef.current.toDataURL('image/jpeg', 0.5));
      }
    }
  };

  const triggerAlert = async (type: string, confidence: number, image_data: string) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, confidence, image_data })
      });
      const newAlert = await res.json();
      setAlerts(prev => [{ ...newAlert, timestamp: new Date().toISOString(), type, confidence, image_data }, ...prev].slice(0, 50));
    } catch (err) { console.error('Alert error:', err); }
  };

  const drawDetections = (nmsDetections: any[]) => {
    const detCtx = detectionCanvasRef.current?.getContext('2d');
    if (!detCtx) return;
    detCtx.clearRect(0, 0, 1280, 720);
    nmsDetections.forEach(pred => {
      const isVehicle = ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'person'].includes(pred.class);
      if (appSettings.debugMode || (isVehicle && pred.score > appSettings.threshold)) {
        const [x, y, w, h] = pred.bbox;
        detCtx.strokeStyle = isVehicle ? '#3b82f6' : '#a855f7';
        detCtx.lineWidth = 2;
        detCtx.strokeRect(x, y, w, h);
        detCtx.fillStyle = detCtx.strokeStyle;
        detCtx.fillRect(x, y - 20, 100, 20);
        detCtx.fillStyle = 'white';
        detCtx.font = '12px Inter';
        detCtx.fillText(`${pred.class} ${Math.round(pred.score * 100)}%`, x + 5, y - 5);
      }
    });
  };

  const playAlertSound = () => {
    if (!audioContext.current) audioContext.current = new AudioContext();
    const osc = audioContext.current.createOscillator();
    const gain = audioContext.current.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(880, audioContext.current.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, audioContext.current.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioContext.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 0.2);
    osc.connect(gain); gain.connect(audioContext.current.destination);
    osc.start(); osc.stop(audioContext.current.currentTime + 0.2);
  };

  // ROI Handlers
  const drawROI = (data: ROI) => {
    const ctx = roiCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 1280, 720);
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
    ctx.strokeRect(data.x, data.y, data.width, data.height);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)'; ctx.fillRect(data.x, data.y, data.width, data.height);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = roiCanvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const scaleX = 1280 / rect.width; const scaleY = 720 / rect.height;
    setIsDrawing(true); setStartPos({ x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const rect = roiCanvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const scaleX = 1280 / rect.width; const scaleY = 720 / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX; const currentY = (e.clientY - rect.top) * scaleY;
    const ctx = roiCanvasRef.current?.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, 1280, 720); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    ctx.strokeRect(startPos.x, startPos.y, currentX - startPos.x, currentY - startPos.y);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const rect = roiCanvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const scaleX = 1280 / rect.width; const scaleY = 720 / rect.height;
    const endX = (e.clientX - rect.left) * scaleX; const endY = (e.clientY - rect.top) * scaleY;
    const newRoi = { x: Math.min(startPos.x, endX), y: Math.min(startPos.y, endY), width: Math.abs(endX - startPos.x), height: Math.abs(endY - startPos.y) };
    if (newRoi.width > 10 && newRoi.height > 10) { setRoi(newRoi); drawROI(newRoi); fetch('/api/roi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRoi) }).catch(console.error); }
    setIsDrawing(false);
  };

  const handleDeepAnalysis = async () => {
    if (!videoCanvasRef.current || isAnalyzing) return;
    setIsAnalyzing(true); setAnalysisResult(null);
    try {
      const base64Image = videoCanvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: "Hãy phân tích hình ảnh giám sát này. Xác định mối đe dọa hoặc chi tiết quan trọng. Trả lời ngắn gọn." }, { inlineData: { mimeType: "image/jpeg", data: base64Image } }] }]
      });
      setAnalysisResult(response.text || "Không thể phân tích.");
    } catch (err) { console.error(err); setAnalysisResult("Lỗi kết nối AI."); } finally { setIsAnalyzing(false); }
  };

  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30 transition-colors duration-300 ${isAlerting ? 'ring-inset ring-4 ring-red-500/50' : ''}`}>
      <Header 
        status={status} fps={fps} processingFps={processingFps} isAnalyzing={isAnalyzing} 
        onDeepAnalysis={handleDeepAnalysis} onShowSettings={() => setShowSettings(true)} 
      />

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="relative aspect-video bg-zinc-900 rounded-3xl overflow-hidden border border-white/5 shadow-2xl group">
            <canvas ref={videoCanvasRef} width={1280} height={720} className="w-full h-full object-cover" />
            <canvas ref={detectionCanvasRef} width={1280} height={720} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
            <canvas 
              ref={roiCanvasRef} width={1280} height={720} 
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
              className="absolute inset-0 w-full h-full cursor-crosshair z-20" 
            />

            <AnimatePresence>
              {analysisResult && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-20 left-6 right-6 p-6 bg-zinc-900/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-2xl z-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[10px]"><Zap className="w-3 h-3 fill-current" />AI Intelligence Insight</div>
                    <button onClick={() => setAnalysisResult(null)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <p className="text-zinc-200 leading-relaxed text-sm italic">"{analysisResult}"</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {cooldownRemaining > 0 && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-6 right-6 px-4 py-2 bg-amber-500/20 backdrop-blur-md text-amber-400 rounded-2xl border border-amber-500/30 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 z-40 shadow-xl">
                  <div className="relative w-4 h-4">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={44} strokeDashoffset={44 - (44 * cooldownRemaining) / appSettings.cooldown} className="opacity-100 transition-all duration-100" />
                      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-20" />
                    </svg>
                  </div>
                  <span>Cooldown: {(cooldownRemaining / 1000).toFixed(1)}s</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isAlerting && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-500/10 pointer-events-none z-30 flex items-center justify-center">
                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-red-500 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl">
                    <Bell className="w-6 h-6 animate-bounce" /><span className="font-bold uppercase tracking-wider">Vehicle Alert!</span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsStreaming(!isStreaming)} className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center">
                  {isStreaming ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>
                <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-xs font-medium">RTSP Source: Channels/402</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setRoi(null); drawROI({x:0,y:0,width:0,height:0}); fetch('/api/roi', { method: 'POST', body: JSON.stringify(null) }); }} className="px-4 py-2 bg-zinc-900/80 backdrop-blur-md hover:bg-red-500/20 hover:text-red-400 rounded-2xl border border-white/10 text-xs font-medium transition-all flex items-center gap-2"><Trash2 className="w-4 h-4" /> Clear ROI</button>
                <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 text-xs font-medium flex items-center gap-2"><Square className="w-4 h-4" /> {roi ? 'ROI Active' : 'Draw ROI to Start'}</div>
              </div>
            </div>
          </div>

          <StatsGrid alerts={alerts} filterType={filterType} onFilterChange={setFilterType} />
        </div>

        <AlertHistory 
          alerts={alerts} roi={roi} filterType={filterType} 
          onClearAlerts={() => { if (confirm('Clear history?')) { fetch('/api/alerts', { method: 'DELETE' }).then(() => setAlerts([])); } }} 
          onDeleteAlert={(id, e) => { if (confirm('Delete alert?')) { fetch(`/api/alerts/${id}`, { method: 'DELETE' }).then(() => setAlerts(prev => prev.filter(a => a.id !== id))); } }} 
          onSelectAlert={setSelectedAlert} 
        />
      </main>

      <AlertDetailModal selectedAlert={selectedAlert} onClose={() => setSelectedAlert(null)} onDeleteAlert={(id) => { fetch(`/api/alerts/${id}`, { method: 'DELETE' }).then(() => { setAlerts(prev => prev.filter(a => a.id !== id)); setSelectedAlert(null); }); }} />
      <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} appSettings={appSettings} onSaveSettings={setAppSettings} />

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }`}</style>
    </div>
  );
}
