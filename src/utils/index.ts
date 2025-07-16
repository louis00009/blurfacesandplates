// License Plate Detection Utils - Main Export File
// This file exports all detection functions and utilities

// Main detection methods
export {
  performPlateRecognizerDetection,
  performRobustMultiMethodDetection,
  performSimpleEffectiveDetection,
  performAggressiveDetection,
  performColorBasedDetection,
  performEdgeDensityDetection,
  performContourAreaDetection,
  performMultipleFallbackMethods,
  combineAndFilterDetections,
  removeOverlappingDetections,
  calculateIoU
} from './licenseParseDetection';

// Australian specialized detection
export {
  performAustralianPlateDetection,
  performGeometricAnalysis,
  calculateGeometricMetrics,
  performAdvancedColorAnalysis,
  validateColorConsistency,
  performTextureAnalysis,
  detectTextPresence,
  performGradientAnalysis,
  performIntelligentFusion,
  performPracticalEdgeDetection,
  performSmartValidation,
  performFallbackDetection
} from './australianPlateDetection';

// Fallback detection methods
export {
  performMultiScaleDetection,
  performBasicRectangleDetection,
  performUltraAggressiveDetection
} from './fallbackDetectionMethods';

// Helper functions
export {
  groupOverlappingCandidates,
  fuseMultipleCandidates,
  performFinalValidation,
  combineAndFilterDetections as advancedCombineAndFilterDetections
} from './helperFunctions';

// OCR integration
export {
  initializeOCR,
  terminateOCR,
  enhanceDetectionsWithOCR,
  isOCRReady
} from './ocrIntegration';

// Image preprocessing
export {
  preprocessImageForDetection,
  analyzeImageQuality
} from './imagePreprocessing';

// Noise filtering
export {
  preFilterNoiseRegions,
  isLikelyNoise
} from './noiseFiltering';