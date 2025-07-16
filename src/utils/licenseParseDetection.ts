// License Plate Detection Algorithms
// This module contains all the main detection methods

import { PlateDetection, Annotation } from '../types';

declare var cv: any;

// Main detection methods
export async function performPlateRecognizerDetection(
  img: HTMLImageElement,
  plateRecognizerApiKey: string
): Promise<PlateDetection[]> {
  if (!plateRecognizerApiKey) {
    console.error('Plate Recognizer API key is not set.');
    return [];
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  context.drawImage(img, 0, 0);

  try {
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(resolve as BlobCallback, 'image/jpeg', 0.8);
    });

    const formData = new FormData();
    formData.append('upload', blob!, 'image.jpg');
    formData.append('regions', 'au'); // Australian region
    formData.append('camera_id', 'webcam');

    const response = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${plateRecognizerApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Plate Recognizer response:', data);

    return data.results.map((result: any, index: number) => ({
      x: result.box.xmin,
      y: result.box.ymin,
      width: result.box.xmax - result.box.xmin,
      height: result.box.ymax - result.box.ymin,
      confidence: result.score,
      method: 'plateRecognizer-api',
      angle: 0,
      textScore: result.score,
      geometryScore: result.score
    }));

  } catch (error) {
    console.error('Plate Recognizer API error:', error);
    return [];
  }
}

export async function performRobustMultiMethodDetection(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🔥 Robust Multi-Method Detection Starting...');
  
  // Combine multiple detection methods
  const methods = [
    () => performSimpleEffectiveDetection(img, canvas),
    () => performColorBasedDetection(img, canvas),
    () => performEdgeDensityDetection(img, canvas),
    () => performContourAreaDetection(img, canvas)
  ];
  
  const allDetections: PlateDetection[] = [];
  
  // Run all methods and collect results
  for (const method of methods) {
    try {
      const detections = await method();
      allDetections.push(...detections);
    } catch (error) {
      console.warn('Detection method failed:', error);
    }
  }
  
  console.log(`Robust detection found ${allDetections.length} raw candidates`);
  
  // Remove duplicates and low-confidence detections
  return combineAndFilterDetections(allDetections);
}

export async function performSimpleEffectiveDetection(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🎯 Simple Effective Detection (Watermarkly-style)');
  const detections: PlateDetection[] = [];
  let src: any, gray: any, edges: any, contours: any, hierarchy: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    edges = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.Canny(gray, edges, 50, 150);
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      const aspectRatio = rect.width / rect.height;
      const area = rect.width * rect.height;
      const imageArea = img.naturalWidth * img.naturalHeight;
      const relativeArea = area / imageArea;
      
      // Watermarkly-style strict conditions
      const isPlateAspectRatio = aspectRatio >= 2.0 && aspectRatio <= 6.0;
      const isReasonableSize = relativeArea >= 0.0015 && relativeArea <= 0.03;
      const isMinimumDimensions = rect.width >= 80 && rect.height >= 20;
      const isMaximumDimensions = rect.width <= 500 && rect.height <= 200;
      const isNotAtTop = rect.y >= img.naturalHeight * 0.02;
      const isNotAtBottom = rect.y <= img.naturalHeight * 0.98;
      
      if (isPlateAspectRatio && isReasonableSize && isMinimumDimensions && 
          isMaximumDimensions && isNotAtTop && isNotAtBottom) {
        
        let confidence = 0.5; // Base confidence
        
        // Size score
        const idealRelativeArea = 0.008;
        const sizeScore = 1.0 - Math.abs(relativeArea - idealRelativeArea) / idealRelativeArea;
        confidence += Math.max(0, Math.min(sizeScore, 0.2));
        
        // Position score
        const verticalPos = (rect.y + rect.height / 2) / img.naturalHeight;
        const positionScore = verticalPos >= 0.05 && verticalPos <= 0.95 ? 0.1 : 0;
        confidence += positionScore;
        
        if (confidence >= 0.85) {
          detections.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            confidence: Math.min(confidence, 0.98),
            method: 'watermarkly-style-simple',
            angle: 0,
            textScore: 0.5,
            geometryScore: confidence
          });
        }
      }
      
      contour.delete();
    }
    
    console.log(`Watermarkly-style detection: ${detections.length} final plates`);
    
  } catch (err) {
    console.error('Watermarkly-style detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
    edges?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
  
  return removeOverlappingDetections(detections);
}

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
    
    // Multiple edge detection methods
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
            
            if (aspectRatio >= 2.0 && aspectRatio <= 6.0) confidence += 0.2;
            if (relativeArea >= 0.001 && relativeArea <= 0.05) confidence += 0.1;
            if (rect.y >= img.naturalHeight * 0.02) confidence += 0.1;
            
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
  
  return removeOverlappingDetections(detections);
}

// Helper functions for detection
export function combineAndFilterDetections(detections: PlateDetection[]): PlateDetection[] {
  if (detections.length === 0) return [];
  
  // Remove low confidence detections
  let filtered = detections.filter(d => d.confidence > 0.3);
  
  // Remove overlapping detections
  filtered = removeOverlappingDetections(filtered);
  
  // Sort by confidence
  filtered.sort((a, b) => b.confidence - a.confidence);
  
  // Limit to top 5 detections
  return filtered.slice(0, 5);
}

export function removeOverlappingDetections(detections: PlateDetection[]): PlateDetection[] {
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

export function calculateIoU(
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

// Color-based detection for license plates
export async function performColorBasedDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🌈 Color-Based Detection');
  let src: any, hsv: any, mask: any, contours: any, hierarchy: any;
  const candidates: PlateDetection[] = [];
  
  try {
    src = cv.imread(img);
    hsv = new cv.Mat();
    mask = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    
    cv.cvtColor(src, hsv, cv.COLOR_RGB2HSV);
    
    // Define a broader range for yellow/orange colors (common in some plates)
    const lowerYellow = new cv.Scalar(15, 100, 100);
    const upperYellow = new cv.Scalar(35, 255, 255);
    cv.inRange(hsv, lowerYellow, upperYellow, mask);
    
    // Morphological operations to clean up the mask
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);
    
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      const area = cv.contourArea(contour);
      
      const aspectRatio = rect.width / rect.height;
      const imageArea = img.naturalWidth * img.naturalHeight;
      const relativeArea = area / imageArea;

      if (aspectRatio >= 2.0 && aspectRatio <= 6.0 &&
          relativeArea >= 0.001 && relativeArea <= 0.05 &&
          rect.width >= 50 && rect.height >= 15) {
        
        candidates.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          confidence: 0.7, // Base confidence for color detection
          method: 'color-based',
          angle: 0,
          textScore: 0.5,
          geometryScore: 0.6
        });
      }
      contour.delete();
    }
    
    // Cleanup
    lowerYellow.delete();
    upperYellow.delete();
    kernel.delete();
    
  } catch (err) {
    console.error('Color-based detection error:', err);
  } finally {
    src?.delete();
    hsv?.delete();
    mask?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
  
  return candidates;
}

export async function performEdgeDensityDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('📏 Edge Density Detection');
  const detections: PlateDetection[] = [];
  let src: any, gray: any, edges: any, contours: any, hierarchy: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    edges = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.Canny(gray, edges, 50, 150);
    
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      const aspectRatio = rect.width / rect.height;
      const area = rect.width * rect.height;
      const imageArea = img.naturalWidth * img.naturalHeight;
      const relativeArea = area / imageArea;

      // Calculate edge density within the bounding box
      const roiEdges = edges.roi(new cv.Rect(rect.x, rect.y, rect.width, rect.height));
      const edgePixels = cv.countNonZero(roiEdges);
      const totalPixels = roiEdges.rows * roiEdges.cols;
      const edgeDensity = totalPixels > 0 ? edgePixels / totalPixels : 0;
      roiEdges.delete();

      // Filter based on aspect ratio, size, and edge density
      if (aspectRatio >= 2.0 && aspectRatio <= 6.0 &&
          relativeArea >= 0.001 && relativeArea <= 0.04 &&
          edgeDensity > 0.1 && edgeDensity < 0.5) { // Typical range for text-rich regions
        
        detections.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          confidence: 0.75, // Higher confidence for edge density
          method: 'edge-density',
          angle: 0,
          textScore: edgeDensity,
          geometryScore: 0.7
        });
      }
      contour.delete();
    }
    
  } catch (err) {
    console.error('Edge density detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
    edges?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
  
  return detections;
}

export async function performContourAreaDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('📐 Contour Area Detection');
  const detections: PlateDetection[] = [];
  let src: any, gray: any, thresh: any, contours: any, hierarchy: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    thresh = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(gray, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    
    cv.findContours(thresh, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      const rect = cv.boundingRect(contour);
      
      const aspectRatio = rect.width / rect.height;
      const imageArea = img.naturalWidth * img.naturalHeight;
      const relativeArea = area / imageArea;

      // Filter based on area and aspect ratio
      if (relativeArea > 0.0005 && relativeArea < 0.05 &&
          aspectRatio >= 1.5 && aspectRatio <= 7.0) {
        
        detections.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          confidence: 0.6, // Moderate confidence
          method: 'contour-area',
          angle: 0,
          textScore: 0.4,
          geometryScore: 0.5
        });
      }
      contour.delete();
    }
    
  } catch (err) {
    console.error('Contour area detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
    thresh?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
  
  return detections;
}

// Fallback methods for when primary detection fails
export async function performMultipleFallbackMethods(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  console.log('🔄 Performing multiple fallback methods...');
  
  const allDetections: PlateDetection[] = [];
  
  try {
    const methods = [
      () => performColorBasedDetection(img, canvas),
      () => performEdgeDensityDetection(img, canvas),
      () => performContourAreaDetection(img, canvas)
    ];
    
    for (const method of methods) {
      try {
        const detections = await method();
        allDetections.push(...detections);
      } catch (error) {
        console.warn('Fallback method failed:', error);
      }
    }
  } catch (error) {
    console.error('Fallback methods error:', error);
  }
  
  return combineAndFilterDetections(allDetections);
}