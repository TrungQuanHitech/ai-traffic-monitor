import { useState, useEffect, useRef } from 'react';
import * as ort from 'onnxruntime-web';
import { AppSettings, ROI } from '../types';

const YOLO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
  'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

const VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'person'];

export const useYOLO = (
  setStatus: (s: string) => void,
  setProcessingFps: (f: (prev: number) => number) => void
) => {
  const [model, setModel] = useState<ort.InferenceSession | null>(null);
  const isProcessing = useRef(false);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processingFrameCount = useRef(0);
  const lastFpsUpdate = useRef(Date.now());

  useEffect(() => {
    async function loadModel() {
      setStatus('Loading YOLOv8 Model...');
      try {
        ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/';
        const modelUrl = 'https://raw.githubusercontent.com/Hyuto/yolov8-onnxruntime-web/master/public/model/yolov8n.onnx';
        const session = await ort.InferenceSession.create(modelUrl, {
          executionProviders: ['webgl'],
          graphOptimizationLevel: 'all'
        });
        setModel(session);
        setStatus('System Ready (YOLOv8)');
      } catch (err) {
        console.error('Failed to load YOLOv8 model:', err);
        setStatus('Error loading YOLOv8');
      }
    }
    loadModel();
  }, [setStatus]);

  const detect = async (
    canvas: HTMLCanvasElement,
    appSettings: AppSettings,
    roi: ROI | null,
    onAlert: (type: string, score: number) => void,
    drawDetections: (nmsDetections: any[]) => void
  ) => {
    if (isProcessing.current || !model) return;

    isProcessing.current = true;
    processingFrameCount.current++;
    
    // Update processing FPS periodically
    const now = Date.now();
    if (now - lastFpsUpdate.current >= 1000) {
      setProcessingFps(() => processingFrameCount.current);
      processingFrameCount.current = 0;
      lastFpsUpdate.current = now;
    }

    try {
      const modelWidth = 640;
      const modelHeight = 640;
      
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
        offscreenCanvasRef.current.width = modelWidth;
        offscreenCanvasRef.current.height = modelHeight;
      }
      
      const offscreen = offscreenCanvasRef.current;
      const ctx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(canvas, 0, 0, modelWidth, modelHeight);
      
      const imageData = ctx.getImageData(0, 0, modelWidth, modelHeight);
      const { data } = imageData;
      
      const input = new Float32Array(modelWidth * modelHeight * 3);
      for (let i = 0; i < data.length; i += 4) {
        const pixelIdx = i / 4;
        input[pixelIdx] = data[i] / 255;
        input[pixelIdx + modelWidth * modelHeight] = data[i + 1] / 255;
        input[pixelIdx + modelWidth * modelHeight * 2] = data[i + 2] / 255;
      }
      
      const tensor = new ort.Tensor('float32', input, [1, 3, modelWidth, modelHeight]);
      const outputs = await model.run({ images: tensor });
      const output = outputs.output0.data as Float32Array;
      
      const numAnchors = 8400;
      const numClasses = 80;
      const detections: any[] = [];
      
      for (let i = 0; i < numAnchors; i++) {
        let maxScore = 0;
        let classId = -1;
        
        for (let j = 0; j < numClasses; j++) {
          const score = output[numAnchors * (j + 4) + i];
          if (score > maxScore) {
            maxScore = score;
            classId = j;
          }
        }
        
        if (maxScore > appSettings.threshold) {
          const cx = output[i];
          const cy = output[numAnchors + i];
          const w = output[2 * numAnchors + i];
          const h = output[3 * numAnchors + i];
          
          const x = (cx - w / 2) * (canvas.width / modelWidth);
          const y = (cy - h / 2) * (canvas.height / modelHeight);
          const width = w * (canvas.width / modelWidth);
          const height = h * (canvas.height / modelHeight);
          
          detections.push({
            bbox: [x, y, width, height],
            class: YOLO_CLASSES[classId],
            score: maxScore
          });
        }
      }
      
      const nmsDetections = detections.sort((a, b) => b.score - a.score).reduce((acc: any[], current) => {
        const isOverlapping = acc.some(item => {
          const [x1, y1, w1, h1] = item.bbox;
          const [x2, y2, w2, h2] = current.bbox;
          const intersectionX = Math.max(x1, x2);
          const intersectionY = Math.max(y1, y2);
          const intersectionW = Math.min(x1 + w1, x2 + w2) - intersectionX;
          const intersectionH = Math.min(y1 + h1, y2 + h2) - intersectionY;
          if (intersectionW <= 0 || intersectionH <= 0) return false;
          const intersectionArea = intersectionW * intersectionH;
          const unionArea = w1 * h1 + w2 * h2 - intersectionArea;
          return (intersectionArea / unionArea) > 0.45;
        });
        if (!isOverlapping) acc.push(current);
        return acc;
      }, []);

      drawDetections(nmsDetections);

      // Alert logic
      nmsDetections.forEach(prediction => {
        const isVehicle = VEHICLE_CLASSES.includes(prediction.class);
        if (isVehicle && prediction.score > appSettings.threshold && roi) {
          const [x, y, width, height] = prediction.bbox;
          const centerX = x + width / 2;
          const centerY = y + height / 2;

          if (
            centerX >= roi.x && 
            centerX <= roi.x + roi.width && 
            centerY >= roi.y && 
            centerY <= roi.y + roi.height
          ) {
            onAlert(prediction.class, prediction.score);
          }
        }
      });

    } catch (err) {
      console.error('Detection error:', err);
    } finally {
      isProcessing.current = false;
    }
  };

  return { model, detect };
};
