export interface Alert {
  id: number;
  timestamp: string;
  type: string;
  confidence: number;
  image_data: string;
}

export interface ROI {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppSettings {
  threshold: number;
  cooldown: number;
  audioEnabled: boolean;
  debugMode: boolean;
}
