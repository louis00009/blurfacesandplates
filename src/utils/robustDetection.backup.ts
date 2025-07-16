// Robust Multi-Method Detection
// This module combines multiple detection approaches for better accuracy

import { PlateDetection } from '../types';
import { performAustralianPlateDetection } from './australianPlateDetection';
import { performSimpleEffectiveDetection, performColorBasedDetection } from './licenseParseDetection';
import { performMultiScaleDetection } from './fallbackDetectionMethods';
import { combineAndFilterDetections } from './helperFunctions';

declare var cv: any;

/**
 * Robust multi-method detection that combines several approaches
 */
export async function performRobustMultiMethodDetection(
  img: HTMLImageElement, 
  canvas: HTMLCanvasElement,
  debugMode: boolean = false
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('💪 ROBUST: Multi-method combined detection');
  let allDetections: PlateDetection[] = [];
  
  try {
    // Method 1: Simple effective detection
    const simpleResults = await performSimpleEffectiveDetection(img, canvas);
    allDetections = [...allDetections, ...simpleResults];
    debugMode && console.log(`Simple method: ${simpleResults.length} detections`);
    
    // Method 2: Australian specialized detection
    const australianResults = await performAustralianPlateDetection(img, canvas, []); // No ground truth for robust
    allDetections = [...allDetections, ...australianResults];
    debugMode && console.log(`Australian method: ${australianResults.length} detections`);
    
    // Method 3: Multi-scale detection
    const multiscaleResults = await performMultiScaleDetection(img, canvas);
    allDetections = [...allDetections, ...multiscaleResults];
    debugMode && console.log(`Multi-scale method: ${multiscaleResults.length} detections`);
    
    // Method 4: Color-based detection
    const colorResults = await performColorBasedDetection(img, canvas);
    allDetections = [...allDetections, ...colorResults];
    debugMode && console.log(`Color-based method: ${colorResults.length} detections`);
    
    // Combine and filter results
    const combinedResults = combineAndFilterDetections(allDetections, debugMode);
    debugMode && console.log(`Combined and filtered: ${combinedResults.length} final detections`);
    
    return combinedResults;
    
  } catch (err) {
    console.error('Robust detection error:', err);
    return [];
  }
}

/**
 * Aggressive detection method for difficult images
 */
export async function performAggressiveDetection(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🔥 Aggressive Detection for Difficult Images');
  const detections: PlateDetection[] = [];
  let src: any, gray: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Multiple edge detection methods with varying parameters
    const edgeMethods = [
      { blur: 3, low: 30, high: 100 },
      { blur: 5, low: 20, high: 80 },
      { blur: 7, low: 15, high: 60 },
    ];
    
    for (const method of edgeMethods) {
      const blurred = new cv.Mat();
      cv.GaussianBlur(gray, blurred, new cv.Size(method.blur, method.blur), 0);
      
      const currentEdges = new cv.Mat();
      cv.Canny(blurred, currentEdges, method.low, method.high);
      
      // Try different morphological kernels
      const kernels = [
        cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(15, 3)),
        cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(25, 5)),
      ];
      
      for (const kernel of kernels) {
        const morphed = new cv.Mat();
        cv.morphologyEx(currentEdges, morphed, cv.MORPH_CLOSE, kernel);
        
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(morphed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        
        for (let i = 0; i < contours.size(); i++) {
          const contour = contours.get(i);
          const rect = cv.boundingRect(contour);
          
          const aspectRatio = rect.width / rect.height;
          const area = rect.width * rect.height;
          const imageArea = img.naturalWidth * img.naturalHeight;
          const relativeArea = area / imageArea;
          
          if (aspectRatio >= 2.0 && aspectRatio <= 6.0 &&
              relativeArea >= 0.001 && relativeArea <= 0.05 &&
              rect.width >= 35 && rect.height >= 8) {
            
            let confidence = 0.4;
            
            // Boost confidence based on criteria
            if (aspectRatio >= 2.0 && aspectRatio <= 6.0) confidence += 0.2;
            if (relativeArea >= 0.001 && relativeArea <= 0.05) confidence += 0.1;
            if (rect.y >= img.naturalHeight * 0.02) confidence += 0.1; // Not at very top
            
            detections.push({
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              confidence: confidence,
              method: `aggressive-${method.blur}-${method.low}`,
              angle: 0,
              textScore: 0.5,
              geometryScore: confidence
            });
          }
          
          contour.delete();
        }
        
        morphed.delete();
        kernel.delete();
        contours.delete();
        hierarchy.delete();
      }
      
      currentEdges.delete();
      blurred.delete();
    }
    
    console.log(`Aggressive detection found ${detections.length} raw candidates`);
    
  } catch (err) {
    console.error('Aggressive detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
  }
  
  // Remove overlapping detections and return sorted by confidence
  return removeOverlappingDetections(detections);
}

/**
 * Removes overlapping detections using IoU threshold
 */
function removeOverlappingDetections(detections: PlateDetection[]): PlateDetection[] {
  if (detections.length <= 1) return detections;
  
  const result: PlateDetection[] = [];
  const used = new Set<number>();
  
  // Sort by confidence (highest first)
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  
  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    
    result.push(sorted[i]);
    used.add(i);
    
    // Mark overlapping detections as used
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      
      const iou = calculateIoU(
        [sorted[i].x, sorted[i].y, sorted[i].width, sorted[i].height],
        [sorted[j].x, sorted[j].y, sorted[j].width, sorted[j].height]
      );
      
      if (iou > 0.3) { // 30% overlap threshold
        used.add(j);
      }
    }
  }
  
  return result;
}

/**
 * Helper function to calculate Intersection over Union (IoU)
 */
function calculateIoU(
  box1: [number, number, number, number], 
  box2: [number, number, number, number]
): number {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;
  
  const xA = Math.max(x1, x2);
  const yA = Math.max(y1, y2);
  const xB = Math.min(x1 + w1, x2 + w2);
  const yB = Math.min(y1 + h1, y2 + h2);
  
  if (xB <= xA || yB <= yA) return 0;
  
  const intersectionArea = (xB - xA) * (yB - yA);
  const unionArea = w1 * h1 + w2 * h2 - intersectionArea;
  
  return intersectionArea / unionArea;
}