// Australian License Plate Detection Algorithm
// This module contains the specialized detection for Australian license plates

import { PlateDetection, Annotation } from '../types';
import { calculateIoU, removeOverlappingDetections } from './licenseParseDetection';
import { preprocessImageForDetection, analyzeImageQuality } from './imagePreprocessing';
import { preFilterNoiseRegions, isLikelyNoise } from './noiseFiltering';
import { resetDebugInfo, printDebugSummary, analyzeImageComposition } from './debugVisualization';

declare var cv: any;

export async function performAustralianPlateDetection(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  annotations: Annotation[] = []
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🇦🇺 Optimized Australian License Plate Detection Starting...');
  console.log(`Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
  
  // Reset debug info for this detection run
  resetDebugInfo();
  
  // Analyze image composition for debugging
  analyzeImageComposition(img);
  
  if (annotations.length > 0) {
    console.log(`Found ${annotations.length} annotation files for guidance`);
  }
  
  const detections: PlateDetection[] = [];
  let src: any, gray: any;
  
  try {
    // Analyze image quality and preprocess if needed
    const qualityAnalysis = analyzeImageQuality(img);
    console.log(`Image quality: ${qualityAnalysis.quality}`);
    
    let processedImg = img;
    if (qualityAnalysis.quality === 'poor' || qualityAnalysis.quality === 'fair') {
      console.log('Applying image preprocessing...');
      const preprocessedCanvas = preprocessImageForDetection(img);
      if (preprocessedCanvas) {
        // Create a new image element from the preprocessed canvas
        const preprocessedImg = new Image();
        preprocessedImg.src = preprocessedCanvas.toDataURL();
        await new Promise((resolve) => {
          preprocessedImg.onload = resolve;
        });
        processedImg = preprocessedImg;
        console.log('✅ Image preprocessing completed');
      }
    }
    
    src = cv.imread(processedImg);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Stage 1: Enhanced Edge Detection with relaxed constraints
    console.log('Stage 1: Performing enhanced edge detection...');
    const edgeCandidates = await performEnhancedEdgeDetection(processedImg, canvas);
    console.log(`Edge detection found ${edgeCandidates.length} candidates`);
    
    if (edgeCandidates.length === 0) {
      console.log('No edge candidates found, trying fallback detection');
      return await performFallbackDetection(img, canvas);
    }
    
    // Stage 2: Simplified Geometric Validation
    console.log('Stage 2: Performing simplified geometric validation...');
    const validatedCandidates = await performSimplifiedValidation(src, edgeCandidates, img);
    console.log(`Geometric validation found ${validatedCandidates.length} candidates`);
    
    // Stage 3: Noise Filtering
    console.log('Stage 3: Filtering noise regions...');
    const noiseFilteredCandidates = preFilterNoiseRegions(img, validatedCandidates);
    console.log(`Noise filtering: ${validatedCandidates.length} → ${noiseFilteredCandidates.length} candidates`);
    
    // Stage 4: Weighted Scoring and Final Selection
    console.log('Stage 4: Performing weighted scoring...');
    const finalDetections = await performWeightedScoring(noiseFilteredCandidates, annotations, img);
    console.log(`Final scoring produced ${finalDetections.length} detections`);
    
    // Print debug summary
    printDebugSummary();
    
    return finalDetections;
    
  } catch (err) {
    console.error('Australian plate detection error:', err);
    return [];
  } finally {
    src?.delete();
    gray?.delete();
  }
}

// New optimized detection functions
export async function performEnhancedEdgeDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('  Enhanced edge detection with relaxed constraints...');
  const detections: PlateDetection[] = [];
  let src: any, gray: any, edges: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    edges = new cv.Mat();
    
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Skip histogram equalization to reduce noise and false positives
    const equalized = gray.clone();
    
    // More conservative edge detection to reduce false positives
    const scales = [
      { blur: 3, low: 50, high: 150 },
      { blur: 5, low: 40, high: 120 }
    ];
    
    for (const scale of scales) {
      const blurred = new cv.Mat();
      cv.GaussianBlur(equalized, blurred, new cv.Size(scale.blur, scale.blur), 0);
      
      const currentEdges = new cv.Mat();
      cv.Canny(blurred, currentEdges, scale.low, scale.high);
      
      // Single morphological operation for efficiency
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(20, 4));
      const enhanced = new cv.Mat();
      cv.morphologyEx(currentEdges, enhanced, cv.MORPH_CLOSE, kernel);
      
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(enhanced, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        
        // Relaxed Australian plate constraints
        const aspectRatio = rect.width / rect.height;
        const area = rect.width * rect.height;
        
        // Balanced validation - not too strict, not too loose
        if (aspectRatio >= 2.0 && aspectRatio <= 5.0 &&
            rect.width >= 50 && rect.height >= 18 &&
            rect.width <= 500 && rect.height <= 180 &&
            area >= 900) { // Minimum area requirement
          
          // Quick noise check before expensive processing
          if (isLikelyNoise(img, rect.x, rect.y, rect.width, rect.height)) {
            console.log(`🗑️ Skipping noise region [${rect.x},${rect.y},${rect.width},${rect.height}]`);
            contour.delete();
            continue;
          }
          
          const geometricMetrics = calculateRelaxedGeometricMetrics(rect, aspectRatio, area, img, 0, contour);
          
          if (geometricMetrics.geometryScore > 0.3) { // Balanced threshold
            detections.push({
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              confidence: geometricMetrics.geometryScore,
              method: `enhanced_edge_${scale.blur}`,
              angle: 0,
              textScore: 0,
              geometryScore: geometricMetrics.geometryScore
            });
          }
        }
        
        contour.delete();
      }
      
      blurred.delete();
      currentEdges.delete();
      kernel.delete();
      enhanced.delete();
      contours.delete();
      hierarchy.delete();
    }
    
    equalized.delete();
    
  } catch (err) {
    console.error('Enhanced edge detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
    edges?.delete();
  }
  
  console.log(`  Enhanced edge detection completed: ${detections.length} candidates`);
  return removeOverlappingDetections(detections);
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
        
        // Relaxed Australian plate constraints
        const aspectRatio = rect.width / rect.height;
        const area = rect.width * rect.height;
        
        // Relaxed plate size validation
        if (aspectRatio >= 1.8 && aspectRatio <= 5.0 &&
            rect.width >= 40 && rect.height >= 15 &&
            rect.width <= 600 && rect.height <= 250) {
          
          const geometricMetrics = calculateGeometricMetrics(rect, aspectRatio, area, img, 0, contour);
          
          if (geometricMetrics.geometryScore > 0.25) {
            detections.push({
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              confidence: geometricMetrics.geometryScore,
              method: `enhanced_edge_${scale.blur}`,
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

export function calculateRelaxedGeometricMetrics(
  rect: any, 
  aspectRatio: number, 
  area: number, 
  img: HTMLImageElement, 
  angle: number, 
  contour: any
): any {
  // Balanced scoring for Australian plates
  const idealAspectRatio = 2.78;
  const aspectRatioScore = aspectRatio >= 2.0 && aspectRatio <= 5.0
    ? Math.max(0.2, 1.0 - Math.abs(aspectRatio - idealAspectRatio) / idealAspectRatio)
    : 0;

  const imageArea = img.naturalWidth * img.naturalHeight;
  const relativeArea = area / imageArea;
  const idealRelativeArea = 0.008;
  let sizeScore = relativeArea >= 0.001 && relativeArea <= 0.04
    ? Math.max(0.1, 1.0 - Math.abs(relativeArea - idealRelativeArea) / (idealRelativeArea * 3))
    : 0;
  sizeScore = Math.max(0, Math.min(1.0, sizeScore));

  const verticalPosition = (rect.y + rect.height / 2) / img.naturalHeight;
  // Penalize detections at the very bottom of the image (common false positive area)
  let positionScore = 0.8;
  if (verticalPosition > 0.85) {
    positionScore = 0.3; // Heavy penalty for bottom region
  } else if (verticalPosition < 0.05 || verticalPosition > 0.95) {
    positionScore = 0.5; // Moderate penalty for extreme edges
  }
  
  const angleScore = angle <= 60 ? Math.max(0.3, 1.0 - (angle / 60)) : 0.3;
  
  const perimeter = cv.arcLength(contour, true);
  const compactness = (4 * Math.PI * area) / (perimeter * perimeter);
  const compactnessScore = Math.min(compactness * 1.5, 1.0);
  
  const rectangularity = area / (rect.width * rect.height);
  const rectangularityScore = Math.max(0.3, rectangularity);
  
  // Simplified weighted scoring
  const geometryScore = Math.min(1.0,
    aspectRatioScore * 0.35 +
    sizeScore * 0.25 +
    rectangularityScore * 0.20 +
    compactnessScore * 0.10 +
    positionScore * 0.05 +
    angleScore * 0.05
  );
  
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

export function calculateGeometricMetrics(
  rect: any, 
  aspectRatio: number, 
  area: number, 
  img: HTMLImageElement, 
  angle: number, 
  contour: any
): any {
  // Relaxed aspect ratio score - broader range for Australian plates
  const idealAspectRatio = 2.78;
  const aspectRatioScore = aspectRatio >= 1.8 && aspectRatio <= 5.0
    ? 1.0 - Math.abs(aspectRatio - idealAspectRatio) / (idealAspectRatio * 1.5)
    : 0;

  // Relaxed size score - much broader range
  const imageArea = img.naturalWidth * img.naturalHeight;
  const relativeArea = area / imageArea;
  const idealRelativeArea = 0.008;
  let sizeScore = relativeArea >= 0.0005 && relativeArea <= 0.08
    ? 1.0 - Math.abs(relativeArea - idealRelativeArea) / (idealRelativeArea * 4)
    : 0;
  sizeScore = Math.max(0, Math.min(1.0, sizeScore));

  // More lenient position score
  const verticalPosition = (rect.y + rect.height / 2) / img.naturalHeight;
  const positionScore = verticalPosition >= 0.02 && verticalPosition <= 0.98 ? 0.9 : 0.6;
  
  // More tolerant angle score
  const angleScore = angle <= 60 ? 1.0 - (angle / 60) : 0.2;
  
  // Compactness score
  const perimeter = cv.arcLength(contour, true);
  const compactness = (4 * Math.PI * area) / (perimeter * perimeter);
  const compactnessScore = Math.min(compactness * 2, 1.0);
  
  // Rectangularity score
  const rectangularity = area / (rect.width * rect.height);
  const rectangularityScore = rectangularity;
  
  // Weighted scoring with emphasis on core geometric features
  const geometryScore = Math.min(1.0,
    aspectRatioScore * 0.30 +
    sizeScore * 0.25 +
    rectangularityScore * 0.20 +
    compactnessScore * 0.15 +
    positionScore * 0.05 +
    angleScore * 0.05
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

// New simplified validation and scoring functions
export async function performSimplifiedValidation(src: any, candidates: PlateDetection[], img: HTMLImageElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined' || candidates.length === 0) return candidates;
  
  console.log('  Starting simplified validation...');
  const validatedCandidates: PlateDetection[] = [];
  
  for (const candidate of candidates) {
    const rect = { x: candidate.x, y: candidate.y, width: candidate.width, height: candidate.height };
    
    // Quick color check with relaxed thresholds
    const colorScore = await validateBasicColorConsistency(src, rect);
    
    // Basic edge density check
    const edgeScore = await calculateEdgeDensity(src, rect);
    
    // Background complexity check to filter out textured surfaces
    const backgroundScore = await analyzeBackgroundComplexity(src, rect, img);
    
    // Combined score with higher threshold to reduce false positives
    const combinedScore = (candidate.confidence * 0.4) + (colorScore * 0.25) + (edgeScore * 0.2) + (backgroundScore * 0.15);
    
    if (combinedScore > 0.45) { // Balanced threshold
      const enhancedCandidate = {
        ...candidate,
        confidence: Math.min(combinedScore, 0.95),
        method: candidate.method + '_validated'
      };
      validatedCandidates.push(enhancedCandidate);
    }
  }
  
  console.log(`  Simplified validation: ${validatedCandidates.length}/${candidates.length} candidates passed`);
  return validatedCandidates;
}

export async function validateBasicColorConsistency(src: any, rect: any): Promise<number> {
  if (typeof cv === 'undefined') return 0.5; // Default neutral score
  
  let roi: any, hsv: any;
  try {
    roi = src.roi(new cv.Rect(rect.x, rect.y, rect.width, rect.height));
    hsv = new cv.Mat();
    
    cv.cvtColor(roi, hsv, cv.COLOR_RGB2HSV);
    
    // Very relaxed color ranges for Australian plates
    const whiteRange = {
      hsvLower: [0, 0, 160],
      hsvUpper: [180, 40, 255]
    };
    
    const greenRange = {
      hsvLower: [40, 30, 100],
      hsvUpper: [90, 255, 255]
    };
    
    const lowerWhite = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), whiteRange.hsvLower);
    const upperWhite = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), whiteRange.hsvUpper);
    const whiteMask = new cv.Mat();
    
    cv.inRange(hsv, lowerWhite, upperWhite, whiteMask);
    const whitePixels = cv.countNonZero(whiteMask);
    
    const lowerGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), greenRange.hsvLower);
    const upperGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), greenRange.hsvUpper);
    const greenMask = new cv.Mat();
    
    cv.inRange(hsv, lowerGreen, upperGreen, greenMask);
    const greenPixels = cv.countNonZero(greenMask);
    
    const totalPixels = roi.rows * roi.cols;
    const whiteRatio = whitePixels / totalPixels;
    const greenRatio = greenPixels / totalPixels;
    
    // Score based on presence of typical plate colors - stricter requirements
    const colorScore = Math.min(1.0, (whiteRatio * 1.2) + (greenRatio * 0.8));
    
    // Cleanup
    lowerWhite.delete();
    upperWhite.delete();
    whiteMask.delete();
    lowerGreen.delete();
    upperGreen.delete();
    greenMask.delete();
    
    // Require minimum color consistency for license plates
    return whiteRatio > 0.3 ? Math.max(0.1, colorScore) : 0.05;
    
  } catch (err) {
    console.warn('Basic color validation error:', err);
    return 0.5;
  } finally {
    roi?.delete();
    hsv?.delete();
  }
}

export async function calculateEdgeDensity(src: any, rect: any): Promise<number> {
  if (typeof cv === 'undefined') return 0.5;
  
  let roi: any, gray: any, edges: any;
  try {
    roi = src.roi(new cv.Rect(rect.x, rect.y, rect.width, rect.height));
    gray = new cv.Mat();
    edges = new cv.Mat();
    
    cv.cvtColor(roi, gray, cv.COLOR_RGB2GRAY);
    cv.Canny(gray, edges, 50, 150);
    
    const edgePixels = cv.countNonZero(edges);
    const totalPixels = roi.rows * roi.cols;
    const edgeDensity = edgePixels / totalPixels;
    
    // Normalize edge density to 0-1 range
    const normalizedScore = Math.min(1.0, edgeDensity * 10);
    
    return Math.max(0.1, normalizedScore);
    
  } catch (err) {
    console.warn('Edge density calculation error:', err);
    return 0.5;
  } finally {
    roi?.delete();
    gray?.delete();
    edges?.delete();
  }
}

export async function performWeightedScoring(
  candidates: PlateDetection[], 
  annotations: Annotation[], 
  img: HTMLImageElement
): Promise<PlateDetection[]> {
  if (candidates.length === 0) return [];
  
  console.log('  Starting weighted scoring...');
  const finalDetections: PlateDetection[] = [];
  
  // Group overlapping candidates
  const groups = groupOverlappingCandidates(candidates);
  console.log(`    Grouped ${candidates.length} candidates into ${groups.length} groups`);
  
  for (const group of groups) {
    if (group.length === 1) {
      // Single candidate - relaxed threshold
      const candidate = group[0];
      if (candidate.confidence >= 0.45) { // Balanced threshold
        finalDetections.push({
          ...candidate,
          method: candidate.method + '_final'
        });
      }
    } else {
      // Multiple candidates - fuse them
      const fusedCandidate = fuseMultipleCandidates(group);
      if (fusedCandidate && fusedCandidate.confidence >= 0.5) { // Balanced threshold
        finalDetections.push({
          ...fusedCandidate,
          method: 'optimized_fused'
        });
      }
    }
  }
  
  // Validate against annotations if available
  if (annotations.length > 0) {
    console.log('    Validating against annotations...');
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
            
            if (iou > 0.3) { // Lower IoU threshold
              detection.confidence = Math.min(detection.confidence * 1.3, 0.98);
              console.log(`      Enhanced confidence due to annotation match (IoU: ${iou.toFixed(2)})`);
            }
          }
        }
      }
    }
  }
  
  console.log(`  Weighted scoring completed: ${finalDetections.length} final detections`);
  return finalDetections;
}

export async function performFallbackDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('  Performing fallback detection with very relaxed constraints...');
  const detections: PlateDetection[] = [];
  let src: any, gray: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Very simple edge detection
    const edges = new cv.Mat();
    cv.Canny(gray, edges, 20, 60);
    
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(15, 3));
    const morphed = new cv.Mat();
    cv.morphologyEx(edges, morphed, cv.MORPH_CLOSE, kernel);
    
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
      
      // Very relaxed constraints for fallback
      if (aspectRatio >= 1.5 && aspectRatio <= 6.0 &&
          relativeArea >= 0.0003 && relativeArea <= 0.1 &&
          rect.width >= 30 && rect.height >= 10) {
        
        detections.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          confidence: 0.4, // Base confidence for fallback
          method: 'fallback_detection',
          angle: 0,
          textScore: 0.3,
          geometryScore: 0.4
        });
      }
      
      contour.delete();
    }
    
    edges.delete();
    kernel.delete();
    morphed.delete();
    contours.delete();
    hierarchy.delete();
    
  } catch (err) {
    console.error('Fallback detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
  }
  
  console.log(`  Fallback detection found ${detections.length} candidates`);
  return removeOverlappingDetections(detections);
}

export async function analyzeBackgroundComplexity(src: any, rect: any, img: HTMLImageElement): Promise<number> {
  if (typeof cv === 'undefined') return 0.5;
  
  let roi: any, gray: any, expanded: any;
  try {
    // Expand the region to include surrounding context
    const padding = Math.max(rect.width, rect.height) * 0.5;
    const expandedX = Math.max(0, rect.x - padding);
    const expandedY = Math.max(0, rect.y - padding);
    const expandedWidth = Math.min(img.naturalWidth - expandedX, rect.width + (padding * 2));
    const expandedHeight = Math.min(img.naturalHeight - expandedY, rect.height + (padding * 2));
    
    expanded = src.roi(new cv.Rect(expandedX, expandedY, expandedWidth, expandedHeight));
    gray = new cv.Mat();
    cv.cvtColor(expanded, gray, cv.COLOR_RGB2GRAY);
    
    // Calculate texture complexity using Local Binary Pattern approximation
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(gray, mean, stddev);
    
    const meanValue = mean.data64F[0];
    const stddevValue = stddev.data64F[0];
    
    // Calculate gradient magnitude variance
    const gradX = new cv.Mat();
    const gradY = new cv.Mat();
    const gradMag = new cv.Mat();
    
    cv.Sobel(gray, gradX, cv.CV_32F, 1, 0, 3);
    cv.Sobel(gray, gradY, cv.CV_32F, 0, 1, 3);
    cv.magnitude(gradX, gradY, gradMag);
    
    const gradMean = new cv.Mat();
    const gradStddev = new cv.Mat();
    cv.meanStdDev(gradMag, gradMean, gradStddev);
    
    const gradientVariance = gradStddev.data64F[0];
    
    // Score based on background characteristics
    let backgroundScore = 0;
    
    // Prefer uniform backgrounds (low texture complexity)
    if (stddevValue < 25 && gradientVariance < 15) {
      backgroundScore += 0.6; // Simple background
    } else if (stddevValue < 40 && gradientVariance < 25) {
      backgroundScore += 0.3; // Moderate complexity
    } else {
      backgroundScore = 0.1; // High complexity (likely false positive)
    }
    
    // Brightness consistency bonus
    if (meanValue > 100 && meanValue < 200) {
      backgroundScore += 0.2; // Good lighting conditions
    }
    
    // Edge density check in surrounding area
    const edges = new cv.Mat();
    cv.Canny(gray, edges, 50, 150);
    const edgePixels = cv.countNonZero(edges);
    const totalPixels = gray.rows * gray.cols;
    const edgeDensity = edgePixels / totalPixels;
    
    if (edgeDensity < 0.1) {
      backgroundScore += 0.2; // Clean background
    } else if (edgeDensity > 0.3) {
      backgroundScore = Math.max(0.05, backgroundScore - 0.3); // Very cluttered
    }
    
    // Cleanup
    mean.delete();
    stddev.delete();
    gradX.delete();
    gradY.delete();
    gradMag.delete();
    gradMean.delete();
    gradStddev.delete();
    edges.delete();
    
    console.log(`    Background analysis: Texture=${stddevValue.toFixed(1)}, Gradient=${gradientVariance.toFixed(1)}, Score=${backgroundScore.toFixed(2)}`);
    
    return Math.min(1.0, backgroundScore);
    
  } catch (error) {
    console.warn('Background complexity analysis error:', error);
    return 0.3; // Conservative fallback
  } finally {
    roi?.delete();
    gray?.delete();
    expanded?.delete();
  }
}