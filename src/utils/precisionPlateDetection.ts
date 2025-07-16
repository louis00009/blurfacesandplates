// Precision License Plate Detection - FEATURE-BASED APPROACH
// This algorithm focuses on actual license plate characteristics for accurate detection

import { PlateDetection } from '../types';
import { performAngleAdaptiveDetection } from './angleAdaptiveDetection';

declare var cv: any;

export async function performPrecisionPlateDetection(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🎯 PRECISION License Plate Detection Starting...');
  console.log(`Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
  
  try {
    // Step 1: Try angle-adaptive detection first (for angled shots)
    console.log('📐 Step 1: Angle-adaptive detection...');
    let angleDetections = await performAngleAdaptiveDetection(img, canvas);
    console.log(`Angle-adaptive found ${angleDetections.length} candidates`);
    
    // Step 2: Standard precision detection
    console.log('🔧 Step 2: Standard precision detection...');
    const processedImage = await preprocessForPlateDetection(img);
    const features = await extractPlateFeatures(processedImage, img);
    console.log(`Standard detection found ${features.length} potential plate regions`);
    
    // Step 3: Combine and validate all candidates
    console.log('✅ Step 3: Combined validation...');
    const allCandidates = [...angleDetections, ...features];
    const validatedPlates = await validatePlateCharacteristics(allCandidates, img);
    console.log(`${validatedPlates.length} regions validated as license plates`);
    
    // Step 4: Rank and select best detections
    console.log('🏆 Step 4: Final ranking...');
    const finalDetections = rankDetectionsByQuality(validatedPlates);
    console.log(`🎉 Final result: ${finalDetections.length} license plates detected`);
    
    return finalDetections;
    
  } catch (err) {
    console.error('Precision detection error:', err);
    return [];
  }
}

// Step 1: Advanced preprocessing for license plate detection
async function preprocessForPlateDetection(img: HTMLImageElement): Promise<any> {
  if (typeof cv === 'undefined') return null;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);
  
  let src: any, processed: any;
  
  try {
    src = cv.imread(canvas);
    processed = new cv.Mat();
    
    // Convert to grayscale
    cv.cvtColor(src, processed, cv.COLOR_RGBA2GRAY, 0);
    
    // Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
    clahe.apply(processed, processed);
    
    // Gaussian blur to reduce noise
    cv.GaussianBlur(processed, processed, new cv.Size(3, 3), 0);
    
    return processed;
    
  } catch (err) {
    console.error('Preprocessing error:', err);
    src?.delete();
    return null;
  } finally {
    src?.delete();
  }
}

// Step 2: Extract potential license plate regions based on features
async function extractPlateFeatures(processedImage: any, originalImg: HTMLImageElement): Promise<PlateDetection[]> {
  if (!processedImage) return [];
  
  const candidates: PlateDetection[] = [];
  
  try {
    // Method 1: Text-based detection using morphological operations
    const textCandidates = await detectTextRegions(processedImage, originalImg);
    candidates.push(...textCandidates);
    console.log(`  Text-based detection: ${textCandidates.length} candidates`);
    
    // Method 2: Rectangle detection with specific characteristics
    const rectCandidates = await detectPlateRectangles(processedImage, originalImg);
    candidates.push(...rectCandidates);
    console.log(`  Rectangle detection: ${rectCandidates.length} candidates`);
    
    // Method 3: Edge pattern detection
    const edgeCandidates = await detectEdgePatterns(processedImage, originalImg);
    candidates.push(...edgeCandidates);
    console.log(`  Edge pattern detection: ${edgeCandidates.length} candidates`);
    
  } catch (err) {
    console.error('Feature extraction error:', err);
  }
  
  // Remove duplicates and return
  return removeDuplicateRegions(candidates);
}

// Method 1: Detect text regions that could be license plates
async function detectTextRegions(processed: any, img: HTMLImageElement): Promise<PlateDetection[]> {
  const candidates: PlateDetection[] = [];
  let binary: any, contours: any, hierarchy: any;
  
  try {
    binary = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    
    // Create binary image using OTSU thresholding
    cv.threshold(processed, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    
    // Morphological operations to connect text characters
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(17, 3));
    cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, kernel);
    
    // Remove small noise
    const cleanKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.morphologyEx(binary, binary, cv.MORPH_OPEN, cleanKernel);
    
    cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      const area = cv.contourArea(contour);
      
      // Check if this could be a license plate text region
      if (isLikelyPlateTextRegion(rect, area, img)) {
        const confidence = calculateTextRegionConfidence(rect, area, img, contour);
        
        candidates.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          confidence,
          method: 'text_region',
          angle: 0,
          textScore: confidence,
          geometryScore: confidence * 0.8
        });
      }
      
      contour.delete();
    }
    
    kernel.delete();
    cleanKernel.delete();
    
  } catch (err) {
    console.error('Text region detection error:', err);
  } finally {
    binary?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
  
  return candidates;
}

// Method 2: Detect rectangular regions with plate characteristics
async function detectPlateRectangles(processed: any, img: HTMLImageElement): Promise<PlateDetection[]> {
  const candidates: PlateDetection[] = [];
  let edges: any, contours: any, hierarchy: any;
  
  try {
    edges = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    
    // Multi-scale edge detection
    const edgeParams = [
      { low: 50, high: 150 },
      { low: 30, high: 100 },
      { low: 70, high: 200 }
    ];
    
    for (const params of edgeParams) {
      const currentEdges = new cv.Mat();
      cv.Canny(processed, currentEdges, params.low, params.high);
      
      // Find rectangular contours
      const tempContours = new cv.MatVector();
      const tempHierarchy = new cv.Mat();
      cv.findContours(currentEdges, tempContours, tempHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      for (let i = 0; i < tempContours.size(); i++) {
        const contour = tempContours.get(i);
        
        // Approximate contour to polygon
        const approx = new cv.Mat();
        const epsilon = 0.02 * cv.arcLength(contour, true);
        cv.approxPolyDP(contour, approx, epsilon, true);
        
        // Check if it's roughly rectangular (4-8 vertices)
        if (approx.rows >= 4 && approx.rows <= 8) {
          const rect = cv.boundingRect(contour);
          
          if (isLikelyPlateRectangle(rect, img)) {
            const confidence = calculateRectangleConfidence(rect, img, contour);
            
            candidates.push({
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              confidence,
              method: 'rectangle_detection',
              angle: 0,
              textScore: confidence * 0.7,
              geometryScore: confidence
            });
          }
        }
        
        contour.delete();
        approx.delete();
      }
      
      currentEdges.delete();
      tempContours.delete();
      tempHierarchy.delete();
    }
    
  } catch (err) {
    console.error('Rectangle detection error:', err);
  } finally {
    edges?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
  
  return candidates;
}

// Method 3: Detect edge patterns characteristic of license plates
async function detectEdgePatterns(processed: any, img: HTMLImageElement): Promise<PlateDetection[]> {
  const candidates: PlateDetection[] = [];
  let sobelX: any, sobelY: any, sobel: any, contours: any, hierarchy: any;
  
  try {
    sobelX = new cv.Mat();
    sobelY = new cv.Mat();
    sobel = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    
    // Calculate gradients
    cv.Sobel(processed, sobelX, cv.CV_32F, 1, 0, 3);
    cv.Sobel(processed, sobelY, cv.CV_32F, 0, 1, 3);
    cv.magnitude(sobelX, sobelY, sobel);
    
    // Convert to 8-bit
    sobel.convertTo(sobel, cv.CV_8U);
    
    // Threshold to get strong edges
    const binary = new cv.Mat();
    cv.threshold(sobel, binary, 50, 255, cv.THRESH_BINARY);
    
    // Morphological operations to connect character edges
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(15, 3));
    cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, kernel);
    
    cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      if (isLikelyPlateEdgePattern(rect, img)) {
        const confidence = calculateEdgePatternConfidence(rect, img, processed);
        
        candidates.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          confidence,
          method: 'edge_pattern',
          angle: 0,
          textScore: confidence * 0.8,
          geometryScore: confidence * 0.9
        });
      }
      
      contour.delete();
    }
    
    binary.delete();
    kernel.delete();
    
  } catch (err) {
    console.error('Edge pattern detection error:', err);
  } finally {
    sobelX?.delete();
    sobelY?.delete();
    sobel?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
  
  return candidates;
}

// Validation functions
function isLikelyPlateTextRegion(rect: any, area: number, img: HTMLImageElement): boolean {
  const aspectRatio = rect.width / rect.height;
  const imageArea = img.naturalWidth * img.naturalHeight;
  const relativeArea = area / imageArea;
  
  return (
    aspectRatio >= 2.0 && aspectRatio <= 6.0 &&
    relativeArea >= 0.0008 && relativeArea <= 0.03 &&
    rect.width >= 60 && rect.height >= 15 &&
    rect.width <= 400 && rect.height <= 120
  );
}

function isLikelyPlateRectangle(rect: any, img: HTMLImageElement): boolean {
  const aspectRatio = rect.width / rect.height;
  const area = rect.width * rect.height;
  const imageArea = img.naturalWidth * img.naturalHeight;
  const relativeArea = area / imageArea;
  
  return (
    aspectRatio >= 2.2 && aspectRatio <= 5.5 &&
    relativeArea >= 0.001 && relativeArea <= 0.025 &&
    rect.width >= 70 && rect.height >= 18 &&
    rect.width <= 350 && rect.height <= 100
  );
}

function isLikelyPlateEdgePattern(rect: any, img: HTMLImageElement): boolean {
  const aspectRatio = rect.width / rect.height;
  const area = rect.width * rect.height;
  const imageArea = img.naturalWidth * img.naturalHeight;
  const relativeArea = area / imageArea;
  
  return (
    aspectRatio >= 2.5 && aspectRatio <= 5.0 &&
    relativeArea >= 0.0012 && relativeArea <= 0.02 &&
    rect.width >= 80 && rect.height >= 20 &&
    rect.width <= 300 && rect.height <= 90
  );
}

// Confidence calculation functions
function calculateTextRegionConfidence(rect: any, area: number, img: HTMLImageElement, contour: any): number {
  const aspectRatio = rect.width / rect.height;
  const imageArea = img.naturalWidth * img.naturalHeight;
  const relativeArea = area / imageArea;
  
  let confidence = 0.5;
  
  // Aspect ratio score
  if (aspectRatio >= 2.5 && aspectRatio <= 4.0) {
    confidence += 0.25;
  } else if (aspectRatio >= 2.0 && aspectRatio <= 5.0) {
    confidence += 0.15;
  }
  
  // Size score
  if (relativeArea >= 0.002 && relativeArea <= 0.015) {
    confidence += 0.2;
  } else if (relativeArea >= 0.001 && relativeArea <= 0.025) {
    confidence += 0.1;
  }
  
  // Rectangularity score
  const rectangularity = area / (rect.width * rect.height);
  if (rectangularity >= 0.7) {
    confidence += 0.05;
  }
  
  return Math.min(confidence, 0.95);
}

function calculateRectangleConfidence(rect: any, img: HTMLImageElement, contour: any): number {
  const aspectRatio = rect.width / rect.height;
  const area = rect.width * rect.height;
  const imageArea = img.naturalWidth * img.naturalHeight;
  const relativeArea = area / imageArea;
  
  let confidence = 0.6;
  
  // Ideal aspect ratio bonus
  if (aspectRatio >= 2.8 && aspectRatio <= 3.5) {
    confidence += 0.2;
  } else if (aspectRatio >= 2.2 && aspectRatio <= 4.5) {
    confidence += 0.1;
  }
  
  // Size bonus
  if (relativeArea >= 0.003 && relativeArea <= 0.012) {
    confidence += 0.15;
  }
  
  // Compactness
  const perimeter = cv.arcLength(contour, true);
  const compactness = (4 * Math.PI * area) / (perimeter * perimeter);
  if (compactness >= 0.5) {
    confidence += 0.05;
  }
  
  return Math.min(confidence, 0.9);
}

function calculateEdgePatternConfidence(rect: any, img: HTMLImageElement, processed: any): number {
  let confidence = 0.7;
  
  const aspectRatio = rect.width / rect.height;
  const area = rect.width * rect.height;
  const imageArea = img.naturalWidth * img.naturalHeight;
  const relativeArea = area / imageArea;
  
  // Perfect aspect ratio bonus
  if (aspectRatio >= 3.0 && aspectRatio <= 3.8) {
    confidence += 0.15;
  }
  
  // Ideal size bonus
  if (relativeArea >= 0.004 && relativeArea <= 0.01) {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 0.85);
}

// Step 3: Validate using multiple characteristics
async function validatePlateCharacteristics(candidates: PlateDetection[], img: HTMLImageElement): Promise<PlateDetection[]> {
  const validated: PlateDetection[] = [];
  
  for (const candidate of candidates) {
    let validationScore = candidate.confidence;
    let validationReasons: string[] = [];
    
    // Validation 1: Position reasonableness
    const centerY = candidate.y + candidate.height / 2;
    const relativeY = centerY / img.naturalHeight;
    
    if (relativeY >= 0.2 && relativeY <= 0.9) {
      validationScore += 0.05;
      validationReasons.push('good_position');
    } else if (relativeY < 0.15) {
      validationScore *= 0.5;
      validationReasons.push('too_high');
    }
    
    // Validation 2: Size consistency
    const area = candidate.width * candidate.height;
    const imageArea = img.naturalWidth * img.naturalHeight;
    const relativeArea = area / imageArea;
    
    if (relativeArea >= 0.001 && relativeArea <= 0.02) {
      validationScore += 0.05;
      validationReasons.push('good_size');
    }
    
    // Validation 3: Aspect ratio consistency
    const aspectRatio = candidate.width / candidate.height;
    if (aspectRatio >= 2.5 && aspectRatio <= 4.5) {
      validationScore += 0.1;
      validationReasons.push('ideal_aspect_ratio');
    }
    
    // Accept if validation score is reasonable
    if (validationScore >= 0.5) {
      validated.push({
        ...candidate,
        confidence: validationScore,
        method: candidate.method + '_validated'
      });
      console.log(`  ✅ Validated [${candidate.x}, ${candidate.y}] score: ${validationScore.toFixed(2)} (${validationReasons.join(', ')})`);
    } else {
      console.log(`  ❌ Rejected [${candidate.x}, ${candidate.y}] score: ${validationScore.toFixed(2)} (${validationReasons.join(', ')})`);
    }
  }
  
  return validated;
}

// Step 4: Rank detections by quality
function rankDetectionsByQuality(detections: PlateDetection[]): PlateDetection[] {
  if (detections.length === 0) return [];
  
  // Sort by confidence
  const sorted = detections.sort((a, b) => b.confidence - a.confidence);
  
  // Remove overlapping detections
  const nonOverlapping = removeOverlappingDetections(sorted);
  
  // Return top 2 detections
  return nonOverlapping.slice(0, 2);
}

// Utility functions
function removeDuplicateRegions(candidates: PlateDetection[]): PlateDetection[] {
  if (candidates.length <= 1) return candidates;
  
  const result: PlateDetection[] = [];
  const used = new Set<number>();
  
  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);
  
  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    
    result.push(sorted[i]);
    used.add(i);
    
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      
      const iou = calculateIoU(
        [sorted[i].x, sorted[i].y, sorted[i].width, sorted[i].height],
        [sorted[j].x, sorted[j].y, sorted[j].width, sorted[j].height]
      );
      
      if (iou > 0.4) {
        used.add(j);
      }
    }
  }
  
  return result;
}

function removeOverlappingDetections(detections: PlateDetection[]): PlateDetection[] {
  if (detections.length <= 1) return detections;
  
  const result: PlateDetection[] = [];
  const used = new Set<number>();
  
  for (let i = 0; i < detections.length; i++) {
    if (used.has(i)) continue;
    
    result.push(detections[i]);
    used.add(i);
    
    for (let j = i + 1; j < detections.length; j++) {
      if (used.has(j)) continue;
      
      const iou = calculateIoU(
        [detections[i].x, detections[i].y, detections[i].width, detections[i].height],
        [detections[j].x, detections[j].y, detections[j].width, detections[j].height]
      );
      
      if (iou > 0.3) {
        used.add(j);
      }
    }
  }
  
  return result;
}

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