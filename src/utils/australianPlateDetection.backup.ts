// Australian License Plate Detection Algorithm
// This module contains the specialized detection for Australian license plates

import { PlateDetection, Annotation } from '../types';
import { calculateIoU, removeOverlappingDetections } from './licenseParseDetection';

declare var cv: any;

export async function performAustralianPlateDetection(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  annotations: Annotation[] = []
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🇦🇺 Australian License Plate Detection Starting...');
  console.log(`Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
  
  if (annotations.length > 0) {
    console.log(`Found ${annotations.length} annotation files for guidance`);
  }
  
  const detections: PlateDetection[] = [];
  let src: any, gray: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Stage 1: Geometric Analysis with Australian plate dimensions (372×134mm)
    console.log('Stage 1: Performing geometric analysis...');
    const geometricCandidates = await performGeometricAnalysis(img, canvas);
    console.log(`Geometric analysis found ${geometricCandidates.length} candidates`);
    
    if (geometricCandidates.length === 0) {
      console.log('No geometric candidates found, skipping further analysis');
      return [];
    }
    
    // Stage 2: Advanced Color Analysis for Australian plates
    console.log('Stage 2: Performing advanced color analysis...');
    const colorCandidates = await performAdvancedColorAnalysis(src, geometricCandidates, img);
    console.log(`Color analysis found ${colorCandidates.length} candidates`);
    
    // Stage 3: Texture and Pattern Recognition
    console.log('Stage 3: Performing texture analysis...');
    const textureCandidates = await performTextureAnalysis(src, colorCandidates, img);
    console.log(`Texture analysis found ${textureCandidates.length} candidates`);
    
    // Stage 4: Gradient-based Edge Enhancement
    console.log('Stage 4: Performing gradient analysis...');
    const gradientCandidates = await performGradientAnalysis(src, textureCandidates, img);
    console.log(`Gradient analysis found ${gradientCandidates.length} candidates`);
    
    // Stage 5: Intelligent Fusion and Validation
    console.log('Stage 5: Performing intelligent fusion...');
    const finalDetections = await performIntelligentFusion(gradientCandidates, annotations, img);
    console.log(`Final fusion produced ${finalDetections.length} detections`);
    
    return finalDetections;
    
  } catch (err) {
    console.error('Australian plate detection error:', err);
    return [];
  } finally {
    src?.delete();
    gray?.delete();
  }
}

export async function performGeometricAnalysis(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('  Starting geometric analysis for Australian plates...');
  const detections: PlateDetection[] = [];
  let src: any, gray: any, edges: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    edges = new cv.Mat();
    
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Multi-scale edge detection with optimal parameters for Australian plates
    const scales = [
      { blur: 3, low: 40, high: 120 },
      { blur: 5, low: 20, high: 100 },
      { blur: 7, low: 10, high: 80 }
    ];
    
    for (const scale of scales) {
      console.log(`  Applying blur: ${scale.blur}, Canny: ${scale.low}-${scale.high}`);
      const blurred = new cv.Mat();
      cv.GaussianBlur(gray, blurred, new cv.Size(scale.blur, scale.blur), 0);
      
      const currentEdges = new cv.Mat();
      cv.Canny(blurred, currentEdges, scale.low, scale.high);
      
      // Morphological operations for plate shape enhancement
      const horizontalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(25, 3));
      const verticalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 25));
      
      const enhanced = new cv.Mat();
      cv.morphologyEx(currentEdges, enhanced, cv.MORPH_CLOSE, horizontalKernel);
      
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(enhanced, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        
        // Australian plate aspect ratio: 372/134 ≈ 2.78
        const aspectRatio = rect.width / rect.height;
        const area = rect.width * rect.height;
        
        // Australian plate size validation
        if (aspectRatio >= 2.2 && aspectRatio <= 3.5 &&
            rect.width >= 80 && rect.height >= 25 &&
            rect.width <= 500 && rect.height <= 200) {
          
          const geometricMetrics = calculateGeometricMetrics(rect, aspectRatio, area, img, 0, contour);
          
          if (geometricMetrics.geometryScore > 0.4) {
            detections.push({
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              confidence: geometricMetrics.geometryScore,
              method: `geometric_australian_${scale.blur}`,
              angle: 0,
              textScore: 0,
              geometryScore: geometricMetrics.geometryScore
            });
          }
        }
        
        contour.delete();
      }
      
      // Cleanup
      blurred.delete();
      currentEdges.delete();
      horizontalKernel.delete();
      verticalKernel.delete();
      enhanced.delete();
      contours.delete();
      hierarchy.delete();
    }
    
  } catch (err) {
    console.error('Geometric analysis error:', err);
  } finally {
    src?.delete();
    gray?.delete();
    edges?.delete();
  }
  
  console.log(`  Geometric analysis completed: ${detections.length} candidates`);
  return removeOverlappingDetections(detections);
}

export function calculateGeometricMetrics(
  rect: any, 
  aspectRatio: number, 
  area: number, 
  img: HTMLImageElement, 
  angle: number, 
  contour: any
): any {
  // Aspect ratio score - Australian plates are ~2.78 ratio
  const idealAspectRatio = 2.78;
  const aspectRatioScore = aspectRatio >= 2.2 && aspectRatio <= 3.5
    ? 1.0 - Math.abs(aspectRatio - idealAspectRatio) / idealAspectRatio
    : 0;

  // Size score - relative to image size
  const imageArea = img.naturalWidth * img.naturalHeight;
  const relativeArea = area / imageArea;
  const idealRelativeArea = 0.008;
  let sizeScore = relativeArea >= 0.002 && relativeArea <= 0.04
    ? 1.0 - Math.abs(relativeArea - idealRelativeArea) / (idealRelativeArea * 2)
    : 0;
  sizeScore = Math.max(0, sizeScore);

  // Position score - license plates can be anywhere in image
  const verticalPosition = (rect.y + rect.height / 2) / img.naturalHeight;
  const positionScore = verticalPosition >= 0.05 && verticalPosition <= 0.95 ? 0.8 : 0.3;
  
  // Angle score
  const angleScore = angle <= 25 ? 1.0 - (angle / 25) : 0.1;
  
  // Compactness score
  const perimeter = cv.arcLength(contour, true);
  const compactness = (4 * Math.PI * area) / (perimeter * perimeter);
  const compactnessScore = Math.min(compactness * 2, 1.0);
  
  // Rectangularity score
  const rectangularity = area / (rect.width * rect.height);
  const rectangularityScore = rectangularity;
  
  const geometryScore = Math.min(1.0,
    aspectRatioScore * 0.25 +
    sizeScore * 0.20 +
    positionScore * 0.15 +
    angleScore * 0.15 +
    compactnessScore * 0.15 +
    rectangularityScore * 0.10
  );
  
  console.log(`    Geometric Metrics for [${rect.x}, ${rect.y}, ${rect.width}, ${rect.height}]:`);
  console.log(`      Aspect Ratio: ${aspectRatio.toFixed(2)} (Score: ${aspectRatioScore.toFixed(2)})`);
  console.log(`      Relative Area: ${relativeArea.toFixed(4)} (Score: ${sizeScore.toFixed(2)})`);
  console.log(`      Final Geometry Score: ${geometryScore.toFixed(2)}`);

  return {
    edgeQuality: compactnessScore,
    colorConsistency: 0,
    textureComplexity: 0,
    rectangularity: rectangularityScore,
    aspectRatioScore,
    positionScore,
    geometryScore
  };
}

export async function performAdvancedColorAnalysis(src: any, candidates: PlateDetection[], img: HTMLImageElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined' || candidates.length === 0) return candidates;
  
  console.log('  Starting advanced color analysis...');
  const colorValidatedCandidates: PlateDetection[] = [];
  
  for (const candidate of candidates) {
    const rect = { x: candidate.x, y: candidate.y, width: candidate.width, height: candidate.height };
    const colorConsistencyScore = await validateColorConsistency(src, rect, 'australian');
    
    if (colorConsistencyScore > 0.3) {
      const enhancedCandidate = {
        ...candidate,
        confidence: candidate.confidence * 0.7 + colorConsistencyScore * 0.3,
        method: candidate.method + '_color_validated'
      };
      colorValidatedCandidates.push(enhancedCandidate);
    }
  }
  
  console.log(`  Color analysis validated ${colorValidatedCandidates.length}/${candidates.length} candidates`);
  return colorValidatedCandidates;
}

export async function validateColorConsistency(src: any, rect: any, colorType: string): Promise<number> {
  if (typeof cv === 'undefined') return 0;
  
  let roi: any, hsv: any, lab: any;
  try {
    roi = src.roi(new cv.Rect(rect.x, rect.y, rect.width, rect.height));
    hsv = new cv.Mat();
    lab = new cv.Mat();
    
    cv.cvtColor(roi, hsv, cv.COLOR_RGB2HSV);
    cv.cvtColor(roi, lab, cv.COLOR_RGB2Lab);
    
    // Australian plate color ranges (expanded for better tolerance)
    const australianColors = [
      {
        name: 'white_background',
        hsvLower: [0, 0, 180],    // Expanded from 170
        hsvUpper: [180, 30, 255], // Expanded from 25
        weight: 0.8
      },
      {
        name: 'green_text',
        hsvLower: [45, 40, 120],  // Expanded from [50, 50, 150]
        hsvUpper: [85, 255, 255], // Expanded from [80, 255, 255]
        weight: 0.6
      }
    ];
    
    let maxColorScore = 0;
    
    for (const color of australianColors) {
      const lowerBound = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), color.hsvLower);
      const upperBound = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), color.hsvUpper);
      const mask = new cv.Mat();
      
      cv.inRange(hsv, lowerBound, upperBound, mask);
      const matchingPixels = cv.countNonZero(mask);
      const totalPixels = roi.rows * roi.cols;
      const colorRatio = matchingPixels / totalPixels;
      
      const colorScore = Math.min(colorRatio * 2, 1.0) * color.weight;
      maxColorScore = Math.max(maxColorScore, colorScore);
      
      lowerBound.delete();
      upperBound.delete();
      mask.delete();
    }
    
    return maxColorScore;
    
  } catch (err) {
    console.warn('Color consistency validation error:', err);
    return 0;
  } finally {
    roi?.delete();
    hsv?.delete();
    lab?.delete();
  }
}

export async function performTextureAnalysis(src: any, candidates: PlateDetection[], img: HTMLImageElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined' || candidates.length === 0) return candidates;
  
  console.log('  Starting texture analysis...');
  const textureValidatedCandidates: PlateDetection[] = [];
  
  for (const candidate of candidates) {
    const rect = { x: candidate.x, y: candidate.y, width: candidate.width, height: candidate.height };
    const textPresence = await detectTextPresence(src, rect);
    
    if (textPresence > 0.2) { // Lowered threshold from 0.4
      const enhancedCandidate = {
        ...candidate,
        confidence: candidate.confidence * 0.8 + textPresence * 0.2,
        textScore: textPresence,
        method: candidate.method + '_texture_validated'
      };
      textureValidatedCandidates.push(enhancedCandidate);
    }
  }
  
  console.log(`  Texture analysis validated ${textureValidatedCandidates.length}/${candidates.length} candidates`);
  return textureValidatedCandidates;
}

export async function detectTextPresence(src: any, rect: any): Promise<number> {
  if (typeof cv === 'undefined') return 0;
  
  let roi: any, gray: any, binary: any, contours: any, hierarchy: any;
  try {
    roi = src.roi(new cv.Rect(rect.x, rect.y, rect.width, rect.height));
    gray = new cv.Mat();
    binary = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    
    cv.cvtColor(roi, gray, cv.COLOR_RGB2GRAY);
    
    // Multiple binarization approaches for different lighting conditions
    const binaryMethods = [
      () => cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU),
      () => cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2),
      () => cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 11, 2)
    ];
    
    let bestTextScore = 0;
    
    for (const method of binaryMethods) {
      method();
      cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      let characterLikeShapes = 0;
      const roiArea = rect.width * rect.height;
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        const contourRect = cv.boundingRect(contour);
        
        // Character-like shape criteria (relaxed)
        const aspectRatio = contourRect.width / contourRect.height;
        const relativeArea = area / roiArea;
        
        if (aspectRatio >= 0.2 && aspectRatio <= 3.0 &&
            relativeArea >= 0.01 && relativeArea <= 0.4 &&
            contourRect.width >= 3 && contourRect.height >= 5) {
          characterLikeShapes++;
        }
        
        contour.delete();
      }
      
      // Text presence score based on character density
      const textScore = Math.min(characterLikeShapes / 10, 1.0); // Expecting up to 10 characters
      bestTextScore = Math.max(bestTextScore, textScore);
    }
    
    console.log(`    Text presence analysis for region [${rect.x}, ${rect.y}, ${rect.width}, ${rect.height}]: Score: ${bestTextScore.toFixed(2)}`);
    
    return bestTextScore;
    
  } catch (err) {
    console.warn('Text presence detection error:', err);
    return 0;
  } finally {
    roi?.delete();
    gray?.delete();
    binary?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
}

export async function performGradientAnalysis(src: any, candidates: PlateDetection[], img: HTMLImageElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined' || candidates.length === 0) return candidates;
  
  console.log('  Starting gradient analysis...');
  const gradientValidatedCandidates: PlateDetection[] = [];
  
  for (const candidate of candidates) {
    const rect = { x: candidate.x, y: candidate.y, width: candidate.width, height: candidate.height };
    const gradientStrength = await analyzeGradientStrength(src, rect);
    
    if (gradientStrength > 0.3) { // Lowered threshold from 0.6
      const enhancedCandidate = {
        ...candidate,
        confidence: candidate.confidence * 0.85 + gradientStrength * 0.15,
        method: candidate.method + '_gradient_validated'
      };
      gradientValidatedCandidates.push(enhancedCandidate);
    }
  }
  
  console.log(`  Gradient analysis validated ${gradientValidatedCandidates.length}/${candidates.length} candidates`);
  return gradientValidatedCandidates;
}

export async function analyzeGradientStrength(src: any, rect: any): Promise<number> {
  if (typeof cv === 'undefined') return 0;
  
  let roi: any, gray: any, gradX: any, gradY: any, grad: any;
  try {
    roi = src.roi(new cv.Rect(rect.x, rect.y, rect.width, rect.height));
    gray = new cv.Mat();
    gradX = new cv.Mat();
    gradY = new cv.Mat();
    grad = new cv.Mat();
    
    cv.cvtColor(roi, gray, cv.COLOR_RGB2GRAY);
    cv.Sobel(gray, gradX, cv.CV_32F, 1, 0, 3);
    cv.Sobel(gray, gradY, cv.CV_32F, 0, 1, 3);
    cv.magnitude(gradX, gradY, grad);
    
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(grad, mean, stddev);
    
    const meanGradient = mean.data64F[0];
    const stddevGradient = stddev.data64F[0];
    
    let score = 0;
    if (meanGradient > 5 && meanGradient < 50) {
      score += Math.min(meanGradient / 100, 0.6);
    }
    if (stddevGradient > 10 && stddevGradient < 60) {
      score += Math.min(stddevGradient / 100, 0.4);
    }
    
    console.log(`    Gradient analysis for region [${rect.x}, ${rect.y}, ${rect.width}, ${rect.height}]: Mean: ${meanGradient.toFixed(2)}, StdDev: ${stddevGradient.toFixed(2)}, Score: ${score.toFixed(2)}`);
    
    mean.delete();
    stddev.delete();
    return Math.min(score, 1.0);
    
  } catch (err) {
    console.warn('Gradient strength analysis error:', err);
    return 0;
  } finally {
    roi?.delete();
    gray?.delete();
    gradX?.delete();
    gradY?.delete();
    grad?.delete();
  }
}

export async function performIntelligentFusion(
  candidates: PlateDetection[], 
  annotations: Annotation[], 
  img: HTMLImageElement
): Promise<PlateDetection[]> {
  if (candidates.length === 0) return [];
  
  console.log('  Starting intelligent fusion...');
  const finalDetections: PlateDetection[] = [];
  
  // Group overlapping candidates
  const groups = groupOverlappingCandidates(candidates);
  console.log(`    Grouped ${candidates.length} candidates into ${groups.length} groups`);
  
  for (const group of groups) {
    if (group.length === 1) {
      // Single candidate - must meet high standards
      const candidate = group[0];
      if (candidate.confidence >= 0.6) { // Lowered from 0.85
        finalDetections.push({
          ...candidate,
          method: candidate.method + '_single_validated'
        });
      }
    } else {
      // Multiple candidates - fuse them
      const fusedCandidate = fuseMultipleCandidates(group);
      if (fusedCandidate && fusedCandidate.confidence >= 0.7) { // Lowered from 0.9
        finalDetections.push({
          ...fusedCandidate,
          method: 'australian_fused_validated'
        });
      }
    }
  }
  
  // Validate against annotations if available
  if (annotations.length > 0) {
    console.log('    Validating against ground truth annotations...');
    for (const detection of finalDetections) {
      for (const annotation of annotations) {
        for (const region of annotation.regions) {
          if (region.region_attributes.label === 'license_plate') {
            const annotationBox: [number, number, number, number] = [
              region.shape_attributes.x,
              region.shape_attributes.y,
              region.shape_attributes.width,
              region.shape_attributes.height
            ];
            const detectionBox: [number, number, number, number] = [
              detection.x, detection.y, detection.width, detection.height
            ];
            
            const iou = calculateIoU(detectionBox, annotationBox);
            console.log(`      IoU with annotation: ${iou.toFixed(2)}`);
            
            if (iou > 0.5) {
              detection.confidence = Math.min(detection.confidence * 1.2, 0.98);
              console.log(`      Enhanced confidence to ${detection.confidence.toFixed(2)} due to annotation match`);
            }
          }
        }
      }
    }
  }
  
  console.log(`  Intelligent fusion completed: ${finalDetections.length} final detections`);
  return finalDetections;
}

export function groupOverlappingCandidates(candidates: PlateDetection[]): PlateDetection[][] {
  const groups: PlateDetection[][] = [];
  const used = new Set<number>();
  
  for (let i = 0; i < candidates.length; i++) {
    if (used.has(i)) continue;
    
    const group = [candidates[i]];
    used.add(i);
    
    for (let j = i + 1; j < candidates.length; j++) {
      if (used.has(j)) continue;
      
      const iou = calculateIoU(
        [candidates[i].x, candidates[i].y, candidates[i].width, candidates[i].height],
        [candidates[j].x, candidates[j].y, candidates[j].width, candidates[j].height]
      );
      
      if (iou > 0.3) {
        group.push(candidates[j]);
        used.add(j);
      }
    }
    
    groups.push(group);
  }
  
  return groups;
}

export function fuseMultipleCandidates(candidates: PlateDetection[]): PlateDetection | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  
  // Weighted average based on confidence
  let totalWeight = 0;
  let weightedX = 0, weightedY = 0, weightedWidth = 0, weightedHeight = 0;
  let totalConfidence = 0;
  
  for (const candidate of candidates) {
    const weight = candidate.confidence;
    totalWeight += weight;
    weightedX += candidate.x * weight;
    weightedY += candidate.y * weight;
    weightedWidth += candidate.width * weight;
    weightedHeight += candidate.height * weight;
    totalConfidence += candidate.confidence;
  }
  
  if (totalWeight === 0) return null;
  
  return {
    x: Math.round(weightedX / totalWeight),
    y: Math.round(weightedY / totalWeight),
    width: Math.round(weightedWidth / totalWeight),
    height: Math.round(weightedHeight / totalWeight),
    confidence: totalConfidence / candidates.length,
    method: 'fused_australian',
    angle: 0,
    textScore: candidates.reduce((sum, c) => sum + (c.textScore || 0), 0) / candidates.length,
    geometryScore: candidates.reduce((sum, c) => sum + (c.geometryScore || 0), 0) / candidates.length
  };
}