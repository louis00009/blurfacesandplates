// Fallback Detection Methods
// This module contains additional detection methods used as fallbacks when primary methods fail

import { PlateDetection } from '../types';
import { calculateIoU, removeOverlappingDetections, combineAndFilterDetections } from './licenseParseDetection';

declare var cv: any;

/**
 * Performs multiple fallback detection methods when primary detection fails
 */
export async function performMultipleFallbackMethods(
  img: HTMLImageElement, 
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  console.log('🔄 Trying multiple fallback methods...');
  let allResults: PlateDetection[] = [];
  
  try {
    // Fallback 1: Basic rectangle detection with very loose criteria
    const basic = await performBasicRectangleDetection(img, canvas);
    allResults = [...allResults, ...basic];
    
    // Fallback 2: Contour area detection
    const contour = await performContourAreaDetection(img, canvas);
    allResults = [...allResults, ...contour];
    
    // Fallback 3: Edge density detection
    const edge = await performEdgeDensityDetection(img, canvas);
    allResults = [...allResults, ...edge];
    
    console.log(`Fallback methods found ${allResults.length} total candidates`);
    
    // If still no results, try ultra-aggressive detection
    if (allResults.length === 0) {
      console.log('🚨 No results from fallback, trying ultra-aggressive...');
      const ultra = await performUltraAggressiveDetection(img, canvas);
      allResults = [...allResults, ...ultra];
    }
    
    return allResults.slice(0, 5); // Return top 5 candidates max
    
  } catch (err) {
    console.error('Fallback methods error:', err);
    return [];
  }
}

/**
 * Multi-scale detection with different image scales
 */
export async function performMultiScaleDetection(
  img: HTMLImageElement, 
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🔍 Multi-Scale Detection (Improved)');
  const detections: PlateDetection[] = [];
  let src: any = null, gray: any = null;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Multiple scales for robust detection
    const scales = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4]; // Broader range of scales
    
    for (const scale of scales) {
      console.log(`  Processing at scale: ${scale.toFixed(2)}`);
      const resized = new cv.Mat();
      const newSize = new cv.Size(Math.round(gray.cols * scale), Math.round(gray.rows * scale));
      cv.resize(gray, resized, newSize, 0, 0, cv.INTER_AREA);
      
      const edges = new cv.Mat();
      cv.Canny(resized, edges, 30, 100); // Adjusted Canny thresholds
      
      // Morphological operations to connect edges
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(18, 3)); // Adjusted kernel size
      cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);
      
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        
        // Scale coordinates back to original image size
        const scaledRect = {
          x: Math.round(rect.x / scale),
          y: Math.round(rect.y / scale),
          width: Math.round(rect.width / scale),
          height: Math.round(rect.height / scale)
        };
        
        const aspectRatio = scaledRect.width / scaledRect.height;
        const area = scaledRect.width * scaledRect.height;
        const imageArea = img.naturalWidth * img.naturalHeight;
        const relativeArea = area / imageArea;
        
        // License plate criteria
        if (aspectRatio >= 2.0 && aspectRatio <= 6.0 &&
            relativeArea >= 0.001 && relativeArea <= 0.04 &&
            scaledRect.width >= 60 && scaledRect.height >= 15) {
          
          let confidence = 0.5; // Base confidence
          
          // Boost confidence for optimal scales
          if (scale >= 0.8 && scale <= 1.2) confidence += 0.2;
          
          detections.push({
            x: scaledRect.x,
            y: scaledRect.y,
            width: scaledRect.width,
            height: scaledRect.height,
            confidence: confidence,
            method: `multi-scale-${scale.toFixed(1)}`,
            angle: 0,
            textScore: 0.5,
            geometryScore: confidence
          });
        }
        
        contour.delete();
      }
      
      // Cleanup for this scale
      resized.delete();
      edges.delete();
      kernel.delete();
      contours.delete();
      hierarchy.delete();
    }
    
  } catch (err) {
    console.error('Multi-scale detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
  }
  
  return detections.slice(0, 10); // Return top 10 candidates from multi-scale
}

/**
 * Basic rectangle detection with very loose criteria
 */
export async function performBasicRectangleDetection(
  img: HTMLImageElement, 
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🔍 Basic Rectangle Detection (Very Loose)');
  const detections: PlateDetection[] = [];
  let src: any, gray: any, edges: any, contours: any, hierarchy: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    edges = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.Canny(gray, edges, 10, 50); // Very loose Canny thresholds
    
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      const aspectRatio = rect.width / rect.height;
      const area = rect.width * rect.height;
      const imageArea = img.naturalWidth * img.naturalHeight;
      const relativeArea = area / imageArea;
      
      // Very loose criteria for rectangles
      if (aspectRatio >= 1.0 && aspectRatio <= 10.0 && // Very broad aspect ratio
          relativeArea >= 0.0001 && relativeArea <= 0.1 && // Very broad size
          rect.width >= 20 && rect.height >= 5) { // Very small minimum dimensions
        
        detections.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          confidence: 0.3, // Very low confidence
          method: 'basic-rectangle',
          angle: 0,
          textScore: 0.2,
          geometryScore: 0.3
        });
      }
      
      contour.delete();
    }
    
  } catch (err) {
    console.error('Basic rectangle detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
    edges?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
  
  return detections;
}

/**
 * Ultra-aggressive detection as last resort
 */
export async function performUltraAggressiveDetection(
  img: HTMLImageElement, 
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🚨 Ultra Aggressive Detection (Last Resort)');
  const detections: PlateDetection[] = [];
  let src: any, gray: any, blurred: any, thresh: any, contours: any, hierarchy: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    blurred = new cv.Mat();
    thresh = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blurred, new cv.Size(9, 9), 0); // Heavy blur
    cv.threshold(blurred, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU); // Aggressive threshold
    
    cv.findContours(thresh, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      
      const aspectRatio = rect.width / rect.height;
      const area = rect.width * rect.height;
      const imageArea = img.naturalWidth * img.naturalHeight;
      const relativeArea = area / imageArea;
      
      // Extremely loose criteria
      if (aspectRatio >= 0.5 && aspectRatio <= 15.0 && // Very, very broad aspect ratio
          relativeArea >= 0.00001 && relativeArea <= 0.2 && // Very, very broad size
          rect.width >= 10 && rect.height >= 3) { // Minimal dimensions
        
        detections.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          confidence: 0.1, // Minimal confidence
          method: 'ultra-aggressive',
          angle: 0,
          textScore: 0.1,
          geometryScore: 0.1
        });
      }
      
      contour.delete();
    }
    
  } catch (err) {
    console.error('Ultra aggressive detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
    blurred?.delete();
    thresh?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
  
  return detections.slice(0, 10); // Limit ultra-aggressive results
}

/**
 * Edge density detection method
 * (This is a duplicate from licenseParseDetection.ts but might have different parameters in App.old.tsx)
 */
export async function performEdgeDensityDetection(
  img: HTMLImageElement, 
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
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

/**
 * Contour area detection method
 * (This is a duplicate from licenseParseDetection.ts but might have different parameters in App.old.tsx)
 */
export async function performContourAreaDetection(
  img: HTMLImageElement, 
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
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