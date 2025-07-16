// Type definitions for the Mosaic Blur App

export interface PlateDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  method: string;
  angle?: number;
  textScore?: number;
  geometryScore?: number;
  plateText?: string;
  ocrConfidence?: number;
}

export interface DetectedRegion {
  id: string;
  type: 'face' | 'plate';
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  enabled: boolean;
  method: string;
}

export interface ProcessedImage {
  id: string;
  originalUrl: string;
  processedDataUrl: string | null;
  fileName: string;
  processing: boolean;
  detectionInfo: string;
  faceCount: number;
  plateCount: number;
  detectedRegions: DetectedRegion[];
}

export interface Annotation {
  filename: string;
  regions: Array<{
    shape_attributes: {
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
    };
    region_attributes: {
      label: string;
    };
  }>;
}

export type DetectionMethod = 'smartAPI' | 'deepLearning' | 'robust' | 'simple' | 'aggressive' | 'plateRecognizer' | 'openalpr' | 'googleVision' | 'azure' | 'aws' | 'australian';

export interface APIConfig {
  id: string;
  name: string;
  enabled: boolean;
  apiKey: string;
  freeLimit: number;
  usedCount: number;
  priority: number;
  lastUsed: Date | null;
  status: 'active' | 'disabled' | 'quota_exceeded' | 'error';
  errorCount: number;
  maxErrors: number;
  resetDate: Date | null;
}

export interface APIManagerState {
  apis: APIConfig[];
  autoFallback: boolean;
  fallbackToLocal: boolean;
  currentApiId: string | null;
}

export interface ProcessingSettings {
  enableFaceDetection: boolean;
  enablePlateDetection: boolean;
  blur: boolean;
  mosaic: boolean;
  blurAmount: number;
  mosaicAmount: number;
  highlightMode: boolean;
  highlightColor: string;
  plateOpacity: number;
  detectionMethod: DetectionMethod;
  plateRecognizerApiKey: string;
  openalprApiKey: string;
  googleVisionApiKey: string;
  debugMode: boolean;
  useApiManager: boolean;
}

export interface AppState {
  images: ProcessedImage[];
  modelsLoaded: boolean;
  error: string | null;
  selectedImage: ProcessedImage | null;
  selectedImages: string[];
  showOriginal: boolean;
  settingsOpen: boolean;
  annotations: Annotation[];
}