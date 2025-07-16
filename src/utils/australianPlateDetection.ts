// Australian License Plate Detection Algorithm - SIMPLIFIED VERSION
// This module contains a practical, working detection for Australian license plates

import { PlateDetection, Annotation } from '../types';
import { calculateIoU, removeOverlappingDetections } from './licenseParseDetection';

declare var cv: any;

export async function performAustralianPlateDetection(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  annotations: Annotation[] = []
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🇦🇺 SIMPLIFIED Australian License Plate Detection Starting...');
  console.log(`Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
  
  try {
    // SIMPLIFIED 2-Stage Detection Pipeline
    console.log('🎯 Stage 1: Practical Edge Detection...');
    const edgeCandidates = await performPracticalEdgeDetection(img, canvas);
    console.log(`✅ Found ${edgeCandidates.length} edge candidates`);
    
    if (edgeCandidates.length === 0) {
      console.log('🔄 No edge candidates found, trying fallback detection...');
      return await performFallbackDetection(img, canvas);
    }
    
    console.log('🔍 Stage 2: Smart Validation...');
    const validatedCandidates = await performSmartValidation(edgeCandidates, img);
    console.log(`✅ Validated ${validatedCandidates.length} candidates`);
    
    // Final scoring with realistic thresholds
    const finalDetections = validatedCandidates.filter(candidate => candidate.confidence >= 0.4);
    console.log(`🎉 Final result: ${finalDetections.length} license plates detected`);
    
    // Sort by confidence and return top results
    finalDetections.sort((a, b) => b.confidence - a.confidence);
    return finalDetections.slice(0, 3); // Limit to top 3 detections
    
  } catch (err) {
    console.error('Australian plate detection error:', err);
    return await performFallbackDetection(img, canvas);
  }
}

// SIMPLIFIED PRACTICAL DETECTION FUNCTIONS
export async function performPracticalEdgeDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🎯 Practical edge detection - optimized for real-world plates...');
  const detections: PlateDetection[] = [];
  let src: any, gray: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Apply contrast enhancement for better edge detection
    const enhanced = new cv.Mat();
    cv.equalizeHist(gray, enhanced);
    
    // Multiple edge detection approaches
    const methods = [
      { blur: 3, low: 30, high: 100, name: 'fine' },
      { blur: 5, low: 20, high: 80, name: 'medium' },
      { blur: 7, low: 15, high: 60, name: 'coarse' }
    ];
    
    for (const method of methods) {
      const blurred = new cv.Mat();
      cv.GaussianBlur(enhanced, blurred, new cv.Size(method.blur, method.blur), 0);
      
      const edges = new cv.Mat();
      cv.Canny(blurred, edges, method.low, method.high);
      
      // Morphological operations to connect text elements
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(15, 3));
      const morphed = new cv.Mat();
      cv.morphologyEx(edges, morphed, cv.MORPH_CLOSE, kernel);
      
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(morphed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        
        // VERY RELAXED constraints for Australian plates
        const aspectRatio = rect.width / rect.height;
        const area = rect.width * rect.height;
        
        // Much more tolerant validation
        if (aspectRatio >= 1.5 && aspectRatio <= 8.0 &&  // Very wide range
            rect.width >= 30 && rect.height >= 10 &&      // Small minimum size
            rect.width <= 600 && rect.height <= 200 &&    // Large maximum size
            area >= 300) {                                 // Low area requirement
          
          // Basic confidence scoring
          let confidence = 0.5; // Start with decent base confidence
          
          // Aspect ratio bonus (Australian plates are typically 2.5-3.5)
          if (aspectRatio >= 2.0 && aspectRatio <= 4.0) {
            confidence += 0.2;
          }
          
          // Size bonus
          const imageArea = img.naturalWidth * img.naturalHeight;
          const relativeArea = area / imageArea;
          if (relativeArea >= 0.001 && relativeArea <= 0.05) {
            confidence += 0.1;
          }
          
          // Position bonus (not at very top or bottom)
          const verticalPos = (rect.y + rect.height / 2) / img.naturalHeight;
          if (verticalPos >= 0.1 && verticalPos <= 0.9) {
            confidence += 0.1;
          }
          
          detections.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            confidence: Math.min(confidence, 0.95),
            method: `practical_${method.name}`,
            angle: 0,
            textScore: 0.5,
            geometryScore: confidence
          });
        }
        
        contour.delete();
      }
      
      // Cleanup
      blurred.delete();
      edges.delete();
      kernel.delete();
      morphed.delete();
      contours.delete();
      hierarchy.delete();
    }
    
    enhanced.delete();
    
  } catch (err) {
    console.error('Practical edge detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
  }
  
  console.log(`Practical edge detection completed: ${detections.length} candidates`);
  return removeOverlappingDetections(detections);
}

export async function performSmartValidation(candidates: PlateDetection[], img: HTMLImageElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined' || candidates.length === 0) return candidates;
  
  console.log('🔍 Smart validation with practical scoring...');
  const validatedCandidates: PlateDetection[] = [];
  
  for (const candidate of candidates) {
    try {
      // Calculate enhanced confidence score
      let enhancedConfidence = candidate.confidence;
      
      // Geometry validation (very lenient)
      const aspectRatio = candidate.width / candidate.height;
      if (aspectRatio >= 2.0 && aspectRatio <= 5.0) {
        enhancedConfidence += 0.1; // Bonus for good aspect ratio
      }
      
      // Size validation (very lenient)
      const area = candidate.width * candidate.height;
      const imageArea = img.naturalWidth * img.naturalHeight;
      const relativeArea = area / imageArea;
      if (relativeArea >= 0.0005 && relativeArea <= 0.08) {
        enhancedConfidence += 0.1; // Bonus for reasonable size
      }
      
      // Position validation (avoid extreme edges)
      const centerY = candidate.y + candidate.height / 2;
      const relativeY = centerY / img.naturalHeight;
      if (relativeY >= 0.05 && relativeY <= 0.95) {
        enhancedConfidence += 0.05; // Small bonus for good position
      }
      
      // Edge density check (simplified)
      const edgeScore = await calculateSimpleEdgeScore(candidate, img);
      enhancedConfidence += edgeScore * 0.1;
      
      // Update candidate with enhanced confidence
      const validatedCandidate = {
        ...candidate,
        confidence: Math.min(enhancedConfidence, 0.98),
        method: candidate.method + '_validated'
      };
      
      validatedCandidates.push(validatedCandidate);
      
    } catch (err) {
      console.warn('Validation error for candidate:', err);
      // Keep original candidate if validation fails
      validatedCandidates.push(candidate);
    }
  }
  
  return validatedCandidates;
}

async function calculateSimpleEdgeScore(candidate: PlateDetection, img: HTMLImageElement): Promise<number> {
  if (typeof cv === 'undefined') return 0.5;
  
  try {
    // Create a simple edge density score
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    
    const src = cv.imread(canvas);
    const roi = src.roi(new cv.Rect(candidate.x, candidate.y, candidate.width, candidate.height));
    const gray = new cv.Mat();
    const edges = new cv.Mat();
    
    cv.cvtColor(roi, gray, cv.COLOR_RGB2GRAY);
    cv.Canny(gray, edges, 50, 150);
    
    const edgePixels = cv.countNonZero(edges);
    const totalPixels = roi.rows * roi.cols;
    const edgeDensity = edgePixels / totalPixels;
    
    // Edge density typical for text is around 0.1-0.3
    let score = 0.5; // Default score
    if (edgeDensity >= 0.05 && edgeDensity <= 0.4) {
      score = Math.min(edgeDensity * 3, 1.0);
    }
    
    // Cleanup
    src.delete();
    roi.delete();
    gray.delete();
    edges.delete();
    
    return score;
    
  } catch (err) {
    console.warn('Edge score calculation error:', err);
    return 0.5;
  }
}

export async function performFallbackDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🔄 Fallback detection - casting a wider net...');
  const detections: PlateDetection[] = [];
  let src: any, gray: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Very basic contour detection with minimal filtering
    const thresh = new cv.Mat();
    cv.threshold(gray, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      const area = cv.contourArea(contour);
      
      // EXTREMELY relaxed constraints as last resort
      const aspectRatio = rect.width / rect.height;
      if (aspectRatio >= 1.2 && aspectRatio <= 10.0 &&  // Very wide aspect ratio range
          rect.width >= 25 && rect.height >= 8 &&        // Very small minimum
          area >= 200) {                                  // Very low area requirement
        
        detections.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          confidence: 0.4, // Lower confidence for fallback
          method: 'fallback_basic',
          angle: 0,
          textScore: 0.3,
          geometryScore: 0.4
        });
      }
      
      contour.delete();
    }
    
    thresh.delete();
    contours.delete();
    hierarchy.delete();
    
  } catch (err) {
    console.error('Fallback detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
  }
  
  console.log(`Fallback detection found ${detections.length} candidates`);
  return removeOverlappingDetections(detections).slice(0, 5); // Limit results
}

// Keep some original functions for compatibility but simplified
export function calculateGeometricMetrics(
  rect: any, 
  aspectRatio: number, 
  area: number, 
  img: HTMLImageElement, 
  angle: number, 
  contour: any
): any {
  // Simplified geometric scoring
  let geometryScore = 0.5; // Base score
  
  // Aspect ratio scoring (very lenient)
  if (aspectRatio >= 1.5 && aspectRatio <= 8.0) {
    geometryScore += 0.2;
  }
  
  // Size scoring (very lenient)
  const imageArea = img.naturalWidth * img.naturalHeight;
  const relativeArea = area / imageArea;
  if (relativeArea >= 0.0003 && relativeArea <= 0.1) {
    geometryScore += 0.2;
  }
  
  // Position scoring
  const verticalPos = (rect.y + rect.height / 2) / img.naturalHeight;
  if (verticalPos >= 0.05 && verticalPos <= 0.95) {
    geometryScore += 0.1;
  }
  
  return {
    geometryScore: Math.min(geometryScore, 1.0),
    aspectRatioScore: geometryScore,
    positionScore: geometryScore,
    edgeQuality: 0.5,
    colorConsistency: 0.5,
    textureComplexity: 0.5,
    rectangularity: 0.5
  };
}

export async function validateColorConsistency(src: any, rect: any, colorType: string): Promise<number> {
  // Simplified color validation - just return a reasonable score
  return 0.6;
}

export async function detectTextPresence(src: any, rect: any): Promise<number> {
  // Simplified text detection - just return a reasonable score
  return 0.5;
}

// Export other functions for compatibility
export async function performGeometricAnalysis(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  return performPracticalEdgeDetection(img, canvas);
}

export async function performAdvancedColorAnalysis(src: any, candidates: PlateDetection[], img: HTMLImageElement): Promise<PlateDetection[]> {
  return candidates; // Just pass through
}

export async function performTextureAnalysis(src: any, candidates: PlateDetection[], img: HTMLImageElement): Promise<PlateDetection[]> {
  return candidates; // Just pass through
}

export async function performGradientAnalysis(src: any, candidates: PlateDetection[], img: HTMLImageElement): Promise<PlateDetection[]> {
  return candidates; // Just pass through
}

export async function performIntelligentFusion(
  candidates: PlateDetection[], 
  annotations: Annotation[], 
  img: HTMLImageElement
): Promise<PlateDetection[]> {
  return removeOverlappingDetections(candidates);
}