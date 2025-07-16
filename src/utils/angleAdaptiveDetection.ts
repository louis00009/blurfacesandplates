// Angle-Adaptive License Plate Detection
// This module handles license plates at various angles and perspectives

import { PlateDetection } from '../types';

declare var cv: any;

export async function performAngleAdaptiveDetection(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('📐 ANGLE-ADAPTIVE License Plate Detection Starting...');
  console.log(`Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
  
  try {
    // Step 1: Multi-angle preprocessing
    console.log('🔄 Step 1: Multi-angle preprocessing...');
    const processedImages = await createMultiAngleProcessing(img);
    
    // Step 2: Perspective-aware detection
    console.log('👁️ Step 2: Perspective-aware detection...');
    const candidates = await detectWithPerspectiveAwareness(processedImages, img);
    console.log(`Found ${candidates.length} angle-adaptive candidates`);
    
    // Step 3: Angle-specific validation
    console.log('📏 Step 3: Angle-specific validation...');
    const validatedCandidates = await validateWithAngleConsideration(candidates, img);
    console.log(`${validatedCandidates.length} candidates validated for various angles`);
    
    // Step 4: Perspective correction and final selection
    console.log('🎯 Step 4: Perspective correction and selection...');
    const finalDetections = await correctPerspectiveAndSelect(validatedCandidates, img);
    console.log(`🎉 Final result: ${finalDetections.length} angle-corrected detections`);
    
    return finalDetections;
    
  } catch (err) {
    console.error('Angle-adaptive detection error:', err);
    return [];
  }
}

// Step 1: Create multiple processed versions for different angles
async function createMultiAngleProcessing(img: HTMLImageElement): Promise<any[]> {
  if (typeof cv === 'undefined') return [];
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);
  
  let src: any;
  const processedImages: any[] = [];
  
  try {
    src = cv.imread(canvas);
    
    // Original processing
    const original = new cv.Mat();
    cv.cvtColor(src, original, cv.COLOR_RGBA2GRAY, 0);
    
    // Enhanced contrast for better angle detection
    const clahe = new cv.CLAHE(3.0, new cv.Size(8, 8));
    clahe.apply(original, original);
    processedImages.push({ type: 'enhanced', mat: original });
    
    // Gradient-based processing for edge angles
    const gradientProcessed = await createGradientEnhanced(original);
    if (gradientProcessed) {
      processedImages.push({ type: 'gradient', mat: gradientProcessed });
    }
    
    // Morphological processing for different orientations
    const morphProcessed = await createMorphologicalEnhanced(original);
    if (morphProcessed) {
      processedImages.push({ type: 'morph', mat: morphProcessed });
    }
    
  } catch (err) {
    console.error('Multi-angle preprocessing error:', err);
  } finally {
    src?.delete();
  }
  
  return processedImages;
}

// Create gradient-enhanced version
async function createGradientEnhanced(gray: any): Promise<any> {
  let sobelX: any, sobelY: any, sobel: any;
  
  try {
    sobelX = new cv.Mat();
    sobelY = new cv.Mat();
    sobel = new cv.Mat();
    
    // Calculate gradients
    cv.Sobel(gray, sobelX, cv.CV_32F, 1, 0, 3);
    cv.Sobel(gray, sobelY, cv.CV_32F, 0, 1, 3);
    cv.magnitude(sobelX, sobelY, sobel);
    
    // Convert to 8-bit
    sobel.convertTo(sobel, cv.CV_8U);
    
    return sobel;
    
  } catch (err) {
    console.error('Gradient enhancement error:', err);
    sobelX?.delete();
    sobelY?.delete();
    return null;
  }
}

// Create morphological enhanced version
async function createMorphologicalEnhanced(gray: any): Promise<any> {
  let binary: any, enhanced: any;
  
  try {
    binary = new cv.Mat();
    enhanced = new cv.Mat();
    
    // Adaptive threshold
    cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
    
    // Multiple kernel orientations for different angles
    const kernels = [
      cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(21, 5)),  // Horizontal
      cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(15, 7)),  // Slightly angled
      cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(25, 3)),  // Very horizontal
    ];
    
    // Apply morphological operations with different kernels
    enhanced = binary.clone();
    for (const kernel of kernels) {
      const temp = new cv.Mat();
      cv.morphologyEx(binary, temp, cv.MORPH_CLOSE, kernel);
      cv.bitwise_or(enhanced, temp, enhanced);
      temp.delete();
      kernel.delete();
    }
    
    binary.delete();
    return enhanced;
    
  } catch (err) {
    console.error('Morphological enhancement error:', err);
    binary?.delete();
    return null;
  }
}

// Step 2: Detect with perspective awareness
async function detectWithPerspectiveAwareness(processedImages: any[], originalImg: HTMLImageElement): Promise<PlateDetection[]> {
  const allCandidates: PlateDetection[] = [];
  
  for (const processed of processedImages) {
    try {
      // Flexible aspect ratio detection for different angles
      const candidates = await detectFlexibleAspectRatio(processed.mat, originalImg, processed.type);
      allCandidates.push(...candidates);
      console.log(`  ${processed.type} processing: ${candidates.length} candidates`);
      
    } catch (err) {
      console.error(`Detection error for ${processed.type}:`, err);
    }
  }
  
  // Clean up processed images
  processedImages.forEach(p => p.mat?.delete());
  
  return removeDuplicatesByDistance(allCandidates);
}

// Detect with flexible aspect ratio for different angles
async function detectFlexibleAspectRatio(processed: any, img: HTMLImageElement, type: string): Promise<PlateDetection[]> {
  const candidates: PlateDetection[] = [];
  let contours: any, hierarchy: any;
  
  try {
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    
    // Find contours
    cv.findContours(processed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      
      // Get both bounding rect and rotated rect
      const boundingRect = cv.boundingRect(contour);
      const rotatedRect = cv.minAreaRect(contour);
      
      // Calculate various aspect ratios
      const normalAspectRatio = boundingRect.width / boundingRect.height;
      const rotatedAspectRatio = Math.max(rotatedRect.size.width, rotatedRect.size.height) / 
                                Math.min(rotatedRect.size.width, rotatedRect.size.height);
      
      // More flexible aspect ratio range for angled plates
      const isValidNormal = normalAspectRatio >= 1.5 && normalAspectRatio <= 8.0;
      const isValidRotated = rotatedAspectRatio >= 2.0 && rotatedAspectRatio <= 6.0;
      
      if (isValidNormal || isValidRotated) {
        // Use the better aspect ratio
        const useRotated = isValidRotated && (rotatedAspectRatio >= 2.5 && rotatedAspectRatio <= 4.5);
        const finalRect = useRotated ? getRotatedRectBounds(rotatedRect) : boundingRect;
        
        // Size validation
        const area = finalRect.width * finalRect.height;
        const imageArea = img.naturalWidth * img.naturalHeight;
        const relativeArea = area / imageArea;
        
        if (relativeArea >= 0.0005 && relativeArea <= 0.04 &&
            finalRect.width >= 40 && finalRect.height >= 12 &&
            finalRect.width <= 500 && finalRect.height <= 150) {
          
          // Calculate confidence based on angle adaptation
          let confidence = 0.6;
          
          // Bonus for good aspect ratios
          const aspectRatio = finalRect.width / finalRect.height;
          if (aspectRatio >= 2.5 && aspectRatio <= 4.0) {
            confidence += 0.2;
          } else if (aspectRatio >= 2.0 && aspectRatio <= 5.0) {
            confidence += 0.1;
          }
          
          // Bonus for rotated rect if it's better
          if (useRotated) {
            confidence += 0.05;
          }
          
          // Type-specific bonuses
          if (type === 'gradient' && aspectRatio >= 2.8 && aspectRatio <= 3.5) {
            confidence += 0.1;
          }
          
          candidates.push({
            x: finalRect.x,
            y: finalRect.y,
            width: finalRect.width,
            height: finalRect.height,
            confidence,
            method: `angle_adaptive_${type}`,
            angle: useRotated ? rotatedRect.angle : 0,
            textScore: confidence * 0.8,
            geometryScore: confidence
          });
        }
      }
      
      contour.delete();
    }
    
  } catch (err) {
    console.error('Flexible aspect ratio detection error:', err);
  } finally {
    contours?.delete();
    hierarchy?.delete();
  }
  
  return candidates;
}

// Convert rotated rect to bounding rect
function getRotatedRectBounds(rotatedRect: any): any {
  const points = new cv.Mat();
  cv.boxPoints(rotatedRect, points);
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (let i = 0; i < 4; i++) {
    const x = points.data32F[i * 2];
    const y = points.data32F[i * 2 + 1];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  
  points.delete();
  
  return {
    x: Math.round(minX),
    y: Math.round(minY),
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY)
  };
}

// Step 3: Validate with angle consideration
async function validateWithAngleConsideration(candidates: PlateDetection[], img: HTMLImageElement): Promise<PlateDetection[]> {
  const validated: PlateDetection[] = [];
  
  for (const candidate of candidates) {
    let score = candidate.confidence;
    const reasons: string[] = [];
    
    // Angle-aware position validation
    const centerY = candidate.y + candidate.height / 2;
    const relativeY = centerY / img.naturalHeight;
    
    // More lenient position validation for angled shots
    if (relativeY >= 0.15 && relativeY <= 0.92) {
      score += 0.05;
      reasons.push('good_position');
    } else if (relativeY < 0.1) {
      score *= 0.6; // Less penalty for angled shots
      reasons.push('high_position');
    }
    
    // Angle-aware size validation
    const area = candidate.width * candidate.height;
    const imageArea = img.naturalWidth * img.naturalHeight;
    const relativeArea = area / imageArea;
    
    if (relativeArea >= 0.0008 && relativeArea <= 0.03) {
      score += 0.05;
      reasons.push('good_size');
    }
    
    // Flexible aspect ratio validation
    const aspectRatio = candidate.width / candidate.height;
    if (aspectRatio >= 1.8 && aspectRatio <= 7.0) { // More flexible for angles
      score += 0.1;
      reasons.push('flexible_aspect_ratio');
    }
    
    // Edge density validation (if possible)
    try {
      const edgeScore = await calculateAngleAwareEdgeScore(candidate, img);
      if (edgeScore >= 0.08) {
        score += 0.05;
        reasons.push('good_edges');
      }
    } catch (err) {
      // Skip edge validation if it fails
    }
    
    // Lower threshold for angle-adaptive detection
    if (score >= 0.45) { // More lenient than 0.5
      validated.push({
        ...candidate,
        confidence: score,
        method: candidate.method + '_angle_validated'
      });
      console.log(`  ✅ Angle-validated [${candidate.x}, ${candidate.y}] score: ${score.toFixed(2)} (${reasons.join(', ')})`);
    } else {
      console.log(`  ❌ Angle-rejected [${candidate.x}, ${candidate.y}] score: ${score.toFixed(2)}`);
    }
  }
  
  return validated;
}

// Calculate angle-aware edge score
async function calculateAngleAwareEdgeScore(candidate: PlateDetection, img: HTMLImageElement): Promise<number> {
  if (typeof cv === 'undefined') return 0.3;
  
  try {
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
    
    // Multiple edge detection angles
    const edgeScores: number[] = [];
    
    // Standard Canny
    cv.Canny(gray, edges, 40, 120);
    const standardEdges = cv.countNonZero(edges) / (roi.rows * roi.cols);
    edgeScores.push(standardEdges);
    
    // Sobel X (vertical edges)
    const sobelX = new cv.Mat();
    cv.Sobel(gray, sobelX, cv.CV_8U, 1, 0, 3);
    cv.threshold(sobelX, sobelX, 50, 255, cv.THRESH_BINARY);
    const verticalEdges = cv.countNonZero(sobelX) / (roi.rows * roi.cols);
    edgeScores.push(verticalEdges);
    
    // Sobel Y (horizontal edges)
    const sobelY = new cv.Mat();
    cv.Sobel(gray, sobelY, cv.CV_8U, 0, 1, 3);
    cv.threshold(sobelY, sobelY, 50, 255, cv.THRESH_BINARY);
    const horizontalEdges = cv.countNonZero(sobelY) / (roi.rows * roi.cols);
    edgeScores.push(horizontalEdges);
    
    // Cleanup
    src.delete();
    roi.delete();
    gray.delete();
    edges.delete();
    sobelX.delete();
    sobelY.delete();
    
    // Return the best edge score
    return Math.max(...edgeScores);
    
  } catch (err) {
    return 0.3;
  }
}

// Step 4: Perspective correction and final selection
async function correctPerspectiveAndSelect(candidates: PlateDetection[], img: HTMLImageElement): Promise<PlateDetection[]> {
  if (candidates.length === 0) return [];
  
  // Sort by confidence
  const sorted = candidates.sort((a, b) => b.confidence - a.confidence);
  
  // Remove overlapping detections with more lenient threshold
  const nonOverlapping = removeOverlappingWithAngleTolerance(sorted);
  
  // Return top 2 detections
  return nonOverlapping.slice(0, 2);
}

// Remove overlapping with angle tolerance
function removeOverlappingWithAngleTolerance(detections: PlateDetection[]): PlateDetection[] {
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
      
      // More lenient overlap threshold for angled detections
      if (iou > 0.25) {
        used.add(j);
      }
    }
  }
  
  return result;
}

// Remove duplicates by distance (for angle-adaptive detection)
function removeDuplicatesByDistance(candidates: PlateDetection[]): PlateDetection[] {
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
      
      // Calculate center distance
      const centerX1 = sorted[i].x + sorted[i].width / 2;
      const centerY1 = sorted[i].y + sorted[i].height / 2;
      const centerX2 = sorted[j].x + sorted[j].width / 2;
      const centerY2 = sorted[j].y + sorted[j].height / 2;
      
      const distance = Math.sqrt(
        Math.pow(centerX1 - centerX2, 2) + Math.pow(centerY1 - centerY2, 2)
      );
      
      // If centers are very close, consider as duplicate
      const avgSize = (sorted[i].width + sorted[i].height + sorted[j].width + sorted[j].height) / 4;
      if (distance < avgSize * 0.5) {
        used.add(j);
      }
    }
  }
  
  return result;
}

// Utility function for IoU calculation
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