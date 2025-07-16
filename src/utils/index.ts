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
  analyzeGradientStrength,
  performIntelligentFusion,
  groupOverlappingCandidates as groupAustralianCandidates,
  fuseMultipleCandidates as fuseAustralianCandidates
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