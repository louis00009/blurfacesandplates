// Intelligent License Plate Detection - PRACTICAL WORKING VERSION
// This module implements the most effective combination of traditional CV methods

import { PlateDetection } from '../types';

declare var cv: any;

export async function performIntelligentPlateDetection(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🧠 INTELLIGENT License Plate Detection Starting...');
  console.log(`Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
  
  try {
    // Method 1: Enhanced multi-scale edge detection
    console.log('🔍 Method 1: Enhanced multi-scale edge detection...');
    const edgeDetections = await performEnhancedEdgeDetection(img, canvas);
    console.log(`Edge detection found ${edgeDetections.length} candidates`);
    
    // Method 2: Color-based detection with multiple color spaces
    console.log('🌈 Method 2: Multi-colorspace detection...');
    const colorDetections = await performMultiColorspaceDetection(img, canvas);
    console.log(`Color detection found ${colorDetections.length} candidates`);
    
    // Method 3: Texture-based sliding window detection
    console.log('📐 Method 3: Texture-based sliding window...');
    const textureDetections = await performTextureBasedDetection(img, canvas);
    console.log(`Texture detection found ${textureDetections.length} candidates`);
    
    // Method 4: Contour-based detection with shape analysis
    console.log('🔄 Method 4: Advanced contour analysis...');
    const contourDetections = await performAdvancedContourDetection(img, canvas);
    console.log(`Contour detection found ${contourDetections.length} candidates`);
    
    // Method 5: Morphological-based detection (NEW!)
    console.log('🔧 Method 5: Morphological-based detection...');
    const morphDetections = await performMorphologicalDetection(img, canvas);
    console.log(`Morphological detection found ${morphDetections.length} candidates`);
    
    // Combine all methods
    const allCandidates = [
      ...edgeDetections,
      ...colorDetections,
      ...textureDetections,
      ...contourDetections,
      ...morphDetections
    ];
    
    console.log(`Total candidates from all methods: ${allCandidates.length}`);
    
    // Intelligent filtering and ranking
    const filteredCandidates = await applyIntelligentFiltering(allCandidates, img);
    console.log(`After intelligent filtering: ${filteredCandidates.length} candidates`);
    
    // Final selection with confidence ranking
    const finalDetections = selectBestCandidates(filteredCandidates);
    console.log(`🎉 Final result: ${finalDetections.length} license plates detected`);
    
    return finalDetections;
    
  } catch (err) {
    console.error('Intelligent detection error:', err);
    return [];
  }
}

// Method 1: Enhanced multi-scale edge detection
async function performEnhancedEdgeDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  const candidates: PlateDetection[] = [];
  let src: any, gray: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Apply CLAHE for better contrast
    const clahe = new cv.CLAHE(3.0, new cv.Size(8, 8));
    const enhanced = new cv.Mat();
    clahe.apply(gray, enhanced);
    
    // More comprehensive edge detection scales - OPTIMIZED FOR BETTER COVERAGE
    const edgeConfigs = [
      { blur: 1, low: 30, high: 120, kernel: [18, 4] },  // Fine details
      { blur: 3, low: 25, high: 90, kernel: [22, 5] },   // Medium details
      { blur: 5, low: 35, high: 110, kernel: [15, 3] },  // Coarse details
      { blur: 3, low: 45, high: 140, kernel: [28, 6] },  // High contrast
      { blur: 1, low: 20, high: 80, kernel: [12, 3] },   // Very fine
      { blur: 7, low: 40, high: 130, kernel: [35, 7] }   // Very coarse
    ];
    
    for (const config of edgeConfigs) {
      let blurred: any;
      if (config.blur > 1) {
        blurred = new cv.Mat();
        cv.GaussianBlur(enhanced, blurred, new cv.Size(config.blur, config.blur), 0);
      } else {
        blurred = enhanced.clone();
      }
      
      const edges = new cv.Mat();
      cv.Canny(blurred, edges, config.low, config.high);
      
      // Morphological operations to connect characters
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(config.kernel[0], config.kernel[1]));
      const morphed = new cv.Mat();
      cv.morphologyEx(edges, morphed, cv.MORPH_CLOSE, kernel);
      
      // Find contours
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(morphed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        
        // Basic filtering
        const aspectRatio = rect.width / rect.height;
        const area = rect.width * rect.height;
        const imageArea = img.naturalWidth * img.naturalHeight;
        const relativeArea = area / imageArea;
        
        if (aspectRatio >= 1.2 && aspectRatio <= 10.0 &&
            relativeArea >= 0.0002 && relativeArea <= 0.08 &&
            rect.width >= 25 && rect.height >= 8) {
          
          // Calculate confidence based on multiple factors
          let confidence = 0.5;
          
          // Aspect ratio scoring
          if (aspectRatio >= 2.5 && aspectRatio <= 4.5) confidence += 0.2;
          else if (aspectRatio >= 2.0 && aspectRatio <= 6.0) confidence += 0.1;
          
          // Size scoring
          if (relativeArea >= 0.002 && relativeArea <= 0.02) confidence += 0.15;
          else if (relativeArea >= 0.001 && relativeArea <= 0.03) confidence += 0.1;
          
          // Position scoring
          const centerY = (rect.y + rect.height / 2) / img.naturalHeight;
          if (centerY >= 0.3 && centerY <= 0.8) confidence += 0.1;
          else if (centerY >= 0.2 && centerY <= 0.9) confidence += 0.05;
          
          candidates.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            confidence,
            method: `enhanced_edge_${config.blur}_${config.low}`,
            angle: 0,
            textScore: 0.6,
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
    console.error('Enhanced edge detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
  }
  
  return candidates;
}

// Method 2: Multi-colorspace detection
async function performMultiColorspaceDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  const candidates: PlateDetection[] = [];
  let src: any, hsv: any, lab: any, yuv: any;
  
  try {
    src = cv.imread(img);
    hsv = new cv.Mat();
    lab = new cv.Mat();
    yuv = new cv.Mat();
    
    cv.cvtColor(src, hsv, cv.COLOR_RGB2HSV);
    cv.cvtColor(src, lab, cv.COLOR_RGB2Lab);
    cv.cvtColor(src, yuv, cv.COLOR_RGB2YUV);
    
    // Define color ranges for different plate types
    const colorSpaces = [
      {
        name: 'hsv_white',
        mat: hsv,
        lower: [0, 0, 120],
        upper: [180, 60, 255]
      },
      {
        name: 'hsv_yellow',
        mat: hsv,
        lower: [15, 40, 100],
        upper: [35, 255, 255]
      },
      {
        name: 'lab_white',
        mat: lab,
        lower: [120, 110, 110],
        upper: [255, 145, 145]
      },
      {
        name: 'yuv_contrast',
        mat: yuv,
        lower: [100, 110, 110],
        upper: [255, 145, 145]
      }
    ];
    
    for (const colorSpace of colorSpaces) {
      const mask = new cv.Mat();
      const lowerBound = new cv.Mat(colorSpace.mat.rows, colorSpace.mat.cols, colorSpace.mat.type(), [colorSpace.lower[0], colorSpace.lower[1], colorSpace.lower[2], 0]);
      const upperBound = new cv.Mat(colorSpace.mat.rows, colorSpace.mat.cols, colorSpace.mat.type(), [colorSpace.upper[0], colorSpace.upper[1], colorSpace.upper[2], 255]);
      
      cv.inRange(colorSpace.mat, lowerBound, upperBound, mask);
      
      // Morphological operations
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
      cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);
      cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);
      
      // Find contours
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        const area = cv.contourArea(contour);
        
        const aspectRatio = rect.width / rect.height;
        const imageArea = img.naturalWidth * img.naturalHeight;
        const relativeArea = area / imageArea;
        
        if (aspectRatio >= 1.5 && aspectRatio <= 8.0 &&
            relativeArea >= 0.0005 && relativeArea <= 0.06 &&
            rect.width >= 30 && rect.height >= 12) {
          
          let confidence = 0.6;
          
          // Color-specific bonuses
          if (colorSpace.name.includes('white')) confidence += 0.1;
          if (colorSpace.name.includes('yellow')) confidence += 0.05;
          
          // Geometry bonuses
          if (aspectRatio >= 2.8 && aspectRatio <= 3.5) confidence += 0.15;
          if (relativeArea >= 0.003 && relativeArea <= 0.015) confidence += 0.1;
          
          candidates.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            confidence,
            method: `color_${colorSpace.name}`,
            angle: 0,
            textScore: 0.7,
            geometryScore: confidence
          });
        }
        
        contour.delete();
      }
      
      // Cleanup
      mask.delete();
      lowerBound.delete();
      upperBound.delete();
      kernel.delete();
      contours.delete();
      hierarchy.delete();
    }
    
  } catch (err) {
    console.error('Multi-colorspace detection error:', err);
  } finally {
    src?.delete();
    hsv?.delete();
    lab?.delete();
    yuv?.delete();
  }
  
  return candidates;
}

// Method 3: Texture-based sliding window detection
async function performTextureBasedDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  const candidates: PlateDetection[] = [];
  let src: any, gray: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Different window sizes for different plate sizes
    const windowSizes = [
      { width: 120, height: 30, step: 15 },
      { width: 150, height: 40, step: 20 },
      { width: 100, height: 25, step: 12 },
      { width: 180, height: 45, step: 25 },
      { width: 90, height: 22, step: 10 }
    ];
    
    for (const windowSize of windowSizes) {
      for (let y = 0; y <= img.naturalHeight - windowSize.height; y += windowSize.step) {
        for (let x = 0; x <= img.naturalWidth - windowSize.width; x += windowSize.step) {
          const roi = gray.roi(new cv.Rect(x, y, windowSize.width, windowSize.height));
          
          // Calculate multiple texture features
          const textureScore = await calculateAdvancedTextureScore(roi);
          
          if (textureScore > 0.4) {
            const aspectRatio = windowSize.width / windowSize.height;
            let confidence = 0.4 + textureScore * 0.4;
            
            // Aspect ratio bonus
            if (aspectRatio >= 2.5 && aspectRatio <= 4.5) confidence += 0.15;
            
            // Position bonus
            const centerY = (y + windowSize.height / 2) / img.naturalHeight;
            if (centerY >= 0.3 && centerY <= 0.8) confidence += 0.1;
            
            candidates.push({
              x: x,
              y: y,
              width: windowSize.width,
              height: windowSize.height,
              confidence,
              method: 'texture_sliding_window',
              angle: 0,
              textScore: textureScore,
              geometryScore: confidence
            });
          }
          
          roi.delete();
        }
      }
    }
    
  } catch (err) {
    console.error('Texture-based detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
  }
  
  return candidates;
}

// Calculate advanced texture score
async function calculateAdvancedTextureScore(roi: any): Promise<number> {
  try {
    // Feature 1: Standard deviation (texture measure)
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(roi, mean, stddev);
    const textureValue = stddev.data64F[0];
    
    // Feature 2: Edge density
    const edges = new cv.Mat();
    cv.Canny(roi, edges, 50, 150);
    const edgePixels = cv.countNonZero(edges);
    const totalPixels = roi.rows * roi.cols;
    const edgeDensity = edgePixels / totalPixels;
    
    // Feature 3: Gradient magnitude
    const sobelX = new cv.Mat();
    const sobelY = new cv.Mat();
    const sobel = new cv.Mat();
    cv.Sobel(roi, sobelX, cv.CV_32F, 1, 0, 3);
    cv.Sobel(roi, sobelY, cv.CV_32F, 0, 1, 3);
    cv.magnitude(sobelX, sobelY, sobel);
    
    const gradientMean = new cv.Mat();
    const gradientStddev = new cv.Mat();
    cv.meanStdDev(sobel, gradientMean, gradientStddev);
    const gradientStrength = gradientMean.data64F[0];
    
    // Cleanup
    mean.delete();
    stddev.delete();
    edges.delete();
    sobelX.delete();
    sobelY.delete();
    sobel.delete();
    gradientMean.delete();
    gradientStddev.delete();
    
    // Combine features
    const normalizedTexture = Math.min(textureValue / 50.0, 1.0);
    const normalizedEdgeDensity = Math.min(edgeDensity * 5, 1.0);
    const normalizedGradient = Math.min(gradientStrength / 100.0, 1.0);
    
    const combinedScore = (normalizedTexture * 0.4 + normalizedEdgeDensity * 0.4 + normalizedGradient * 0.2);
    
    // Text regions typically have moderate values
    if (combinedScore >= 0.2 && combinedScore <= 0.8) {
      return combinedScore;
    }
    
    return 0;
    
  } catch (err) {
    return 0;
  }
}

// Method 4: Advanced contour detection
async function performAdvancedContourDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  const candidates: PlateDetection[] = [];
  let src: any, gray: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Multiple thresholding approaches
    const thresholdMethods = [
      {
        name: 'otsu',
        apply: (g: any, binary: any) => cv.threshold(g, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)
      },
      {
        name: 'adaptive_gaussian',
        apply: (g: any, binary: any) => cv.adaptiveThreshold(g, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2)
      },
      {
        name: 'adaptive_mean',
        apply: (g: any, binary: any) => cv.adaptiveThreshold(g, binary, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 11, 2)
      }
    ];
    
    for (const method of thresholdMethods) {
      const binary = new cv.Mat();
      method.apply(gray, binary);
      
      // Find contours
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        const area = cv.contourArea(contour);
        
        const aspectRatio = rect.width / rect.height;
        const imageArea = img.naturalWidth * img.naturalHeight;
        const relativeArea = area / imageArea;
        
        if (aspectRatio >= 2.0 && aspectRatio <= 6.0 &&
            relativeArea >= 0.001 && relativeArea <= 0.03 &&
            rect.width >= 50 && rect.height >= 15) {
          
          // Calculate shape quality
          const perimeter = cv.arcLength(contour, true);
          const compactness = (4 * Math.PI * area) / (perimeter * perimeter);
          const rectangularity = area / (rect.width * rect.height);
          
          let confidence = 0.6;
          
          // Shape quality bonuses
          if (compactness > 0.5) confidence += 0.1;
          if (rectangularity > 0.7) confidence += 0.1;
          
          // Geometry bonuses
          if (aspectRatio >= 2.8 && aspectRatio <= 3.5) confidence += 0.1;
          if (relativeArea >= 0.003 && relativeArea <= 0.015) confidence += 0.1;
          
          candidates.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            confidence,
            method: `contour_${method.name}`,
            angle: 0,
            textScore: rectangularity,
            geometryScore: confidence
          });
        }
        
        contour.delete();
      }
      
      binary.delete();
      contours.delete();
      hierarchy.delete();
    }
    
  } catch (err) {
    console.error('Advanced contour detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
  }
  
  return candidates;
}

// Intelligent filtering
async function applyIntelligentFiltering(candidates: PlateDetection[], img: HTMLImageElement): Promise<PlateDetection[]> {
  const filtered: PlateDetection[] = [];
  
  for (const candidate of candidates) {
    let score = candidate.confidence;
    let shouldKeep = true;
    
    // Basic sanity checks
    const aspectRatio = candidate.width / candidate.height;
    const area = candidate.width * candidate.height;
    const imageArea = img.naturalWidth * img.naturalHeight;
    const relativeArea = area / imageArea;
    
    // Strict sanity filtering
    if (aspectRatio < 1.2 || aspectRatio > 10.0) shouldKeep = false;
    if (relativeArea < 0.0001 || relativeArea > 0.1) shouldKeep = false;
    if (candidate.width < 25 || candidate.height < 8) shouldKeep = false;
    
    // Position-based scoring
    const centerY = (candidate.y + candidate.height / 2) / img.naturalHeight;
    if (centerY < 0.05) score *= 0.3; // Very top
    else if (centerY < 0.15) score *= 0.7; // Top area
    else if (centerY > 0.95) score *= 0.5; // Very bottom
    
    // Size-based scoring
    if (aspectRatio >= 2.5 && aspectRatio <= 4.0) score += 0.1;
    if (relativeArea >= 0.002 && relativeArea <= 0.02) score += 0.1;
    
    // Method-based scoring
    if (candidate.method.includes('color')) score += 0.05;
    if (candidate.method.includes('texture')) score += 0.05;
    
    if (shouldKeep && score >= 0.3) { // LOWERED threshold for better recall
      filtered.push({
        ...candidate,
        confidence: Math.min(score, 0.95)
      });
    }
  }
  
  return filtered;
}

// Select best candidates
function selectBestCandidates(candidates: PlateDetection[]): PlateDetection[] {
  if (candidates.length === 0) return [];
  
  // Remove duplicates
  const deduplicated = removeDuplicatesByOverlap(candidates);
  
  // Sort by confidence
  const sorted = deduplicated.sort((a, b) => b.confidence - a.confidence);
  
  // Return top candidates
  return sorted.slice(0, 3);
}

// Remove duplicates by overlap
function removeDuplicatesByOverlap(candidates: PlateDetection[]): PlateDetection[] {
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
      
      if (iou > 0.3) {
        used.add(j);
      }
    }
  }
  
  return result;
}

// Method 5: Morphological-based detection (NEW!)
async function performMorphologicalDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  const candidates: PlateDetection[] = [];
  let src: any, gray: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Apply different morphological operations
    const morphConfigs = [
      { op: cv.MORPH_TOPHAT, kernel: [30, 6], name: 'tophat_30x6' },
      { op: cv.MORPH_BLACKHAT, kernel: [25, 5], name: 'blackhat_25x5' },
      { op: cv.MORPH_TOPHAT, kernel: [20, 4], name: 'tophat_20x4' },
      { op: cv.MORPH_GRADIENT, kernel: [15, 3], name: 'gradient_15x3' }
    ];
    
    for (const config of morphConfigs) {
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(config.kernel[0], config.kernel[1]));
      const morphed = new cv.Mat();
      cv.morphologyEx(gray, morphed, config.op, kernel);
      
      // Apply threshold to get binary image
      const binary = new cv.Mat();
      cv.threshold(morphed, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      
      // Find contours
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        const area = cv.contourArea(contour);
        
        const aspectRatio = rect.width / rect.height;
        const imageArea = img.naturalWidth * img.naturalHeight;
        const relativeArea = area / imageArea;
        
        if (aspectRatio >= 1.8 && aspectRatio <= 7.0 &&
            relativeArea >= 0.0004 && relativeArea <= 0.05 &&
            rect.width >= 35 && rect.height >= 10) {
          
          let confidence = 0.55;
          
          // Morphological operation specific bonuses
          if (config.name.includes('tophat')) confidence += 0.1;
          if (config.name.includes('gradient')) confidence += 0.05;
          
          // Geometry bonuses
          if (aspectRatio >= 2.5 && aspectRatio <= 4.0) confidence += 0.15;
          if (relativeArea >= 0.002 && relativeArea <= 0.02) confidence += 0.1;
          
          // Position bonus
          const centerY = (rect.y + rect.height / 2) / img.naturalHeight;
          if (centerY >= 0.25 && centerY <= 0.85) confidence += 0.1;
          
          candidates.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            confidence,
            method: `morph_${config.name}`,
            angle: 0,
            textScore: 0.65,
            geometryScore: confidence
          });
        }
        
        contour.delete();
      }
      
      // Cleanup
      kernel.delete();
      morphed.delete();
      binary.delete();
      contours.delete();
      hierarchy.delete();
    }
    
  } catch (err) {
    console.error('Morphological detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
  }
  
  return candidates;
}

// IoU calculation
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