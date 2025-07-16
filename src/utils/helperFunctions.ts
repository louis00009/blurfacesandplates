// Helper Functions for License Plate Detection
// This module contains additional helper functions used throughout the detection pipeline

import { PlateDetection } from '../types';
import { calculateIoU } from './licenseParseDetection';

declare var cv: any;

/**
 * Groups overlapping candidate detections based on IoU threshold
 */
export function groupOverlappingCandidates(candidates: PlateDetection[]): PlateDetection[][] {
  if (candidates.length === 0) return [];
  
  const groups: PlateDetection[][] = [];
  const sortedCandidates = [...candidates].sort((a, b) => b.confidence - a.confidence);
  const visited = new Array(sortedCandidates.length).fill(false);
  
  for (let i = 0; i < sortedCandidates.length; i++) {
    if (visited[i]) continue;
    
    const group = [sortedCandidates[i]];
    visited[i] = true;
    
    // Find overlapping candidates
    for (let j = i + 1; j < sortedCandidates.length; j++) {
      if (visited[j]) continue;
      
      const iou = calculateIoU(
        [sortedCandidates[i].x, sortedCandidates[i].y, sortedCandidates[i].width, sortedCandidates[i].height],
        [sortedCandidates[j].x, sortedCandidates[j].y, sortedCandidates[j].width, sortedCandidates[j].height]
      );
      
      if (iou > 0.3) { // 30% overlap threshold
        group.push(sortedCandidates[j]);
        visited[j] = true;
      }
    }
    
    groups.push(group);
  }
  
  return groups;
}

/**
 * Fuses multiple overlapping candidates into a single detection
 */
export async function fuseMultipleCandidates(
  group: PlateDetection[], 
  img: HTMLImageElement
): Promise<PlateDetection | null> {
  if (group.length === 0) return null;
  
  console.log(`  Fusing ${group.length} candidates.`);
  
  // Sort by confidence to prioritize stronger detections
  group.sort((a, b) => b.confidence - a.confidence);
  
  // Initialize fused box with the highest confidence candidate
  let fusedX = group[0].x;
  let fusedY = group[0].y;
  let fusedWidth = group[0].width;
  let fusedHeight = group[0].height;
  let fusedConfidence = group[0].confidence;
  let fusedMethod = group[0].method;
  
  // Iteratively merge overlapping candidates
  for (let i = 1; i < group.length; i++) {
    const current = group[i];
    const currentBbox: [number, number, number, number] = [current.x, current.y, current.width, current.height];
    const fusedBbox: [number, number, number, number] = [fusedX, fusedY, fusedWidth, fusedHeight];
    const iou = calculateIoU(fusedBbox, currentBbox);
    
    if (iou > 0.2) { // If there's significant overlap, merge
      const minX = Math.min(fusedX, current.x);
      const minY = Math.min(fusedY, current.y);
      const maxX = Math.max(fusedX + fusedWidth, current.x + current.width);
      const maxY = Math.max(fusedY + fusedHeight, current.y + current.height);
      
      fusedX = minX;
      fusedY = minY;
      fusedWidth = maxX - minX;
      fusedHeight = maxY - minY;
      fusedConfidence = Math.max(fusedConfidence, current.confidence); // Keep highest confidence
      fusedMethod += `+${current.method}`; // Concatenate methods
      
      console.log(`    Merged candidate. New fused box: [${fusedX}, ${fusedY}, ${fusedWidth}, ${fusedHeight}], IoU: ${iou.toFixed(2)}`);
    } else {
      console.log(`    Skipping non-overlapping candidate. IoU: ${iou.toFixed(2)}`);
    }
  }
  
  const finalFusedCandidate: PlateDetection = {
    x: fusedX,
    y: fusedY,
    width: fusedWidth,
    height: fusedHeight,
    confidence: fusedConfidence,
    method: `fused_${fusedMethod}`,
    angle: 0,
    textScore: group.reduce((sum, c) => sum + (c.textScore || 0), 0) / group.length,
    geometryScore: group.reduce((sum, c) => sum + (c.geometryScore || 0), 0) / group.length
  };
  
  console.log(`  Final fused candidate: [${finalFusedCandidate.x}, ${finalFusedCandidate.y}, ${finalFusedCandidate.width}, ${finalFusedCandidate.height}], confidence: ${finalFusedCandidate.confidence.toFixed(2)}`);
  
  return finalFusedCandidate;
}

/**
 * Performs final validation on a candidate detection
 */
export async function performFinalValidation(
  candidate: PlateDetection, 
  img: HTMLImageElement
): Promise<number> {
  if (typeof cv === 'undefined') return 0;
  
  console.log(`  Performing final validation for candidate: [${candidate.x}, ${candidate.y}, ${candidate.width}, ${candidate.height}]`);
  
  let src: any, gray: any, roi: any, hsv: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Re-evaluate key metrics for the candidate region
    const rect = new cv.Rect(candidate.x, candidate.y, candidate.width, candidate.height);
    roi = src.roi(rect);
    
    // Geometric validation
    const aspectRatio = candidate.width / candidate.height;
    const area = candidate.width * candidate.height;
    const imageArea = img.naturalWidth * img.naturalHeight;
    const relativeArea = area / imageArea;
    
    let geometricScore = 0;
    
    // Aspect ratio score (ideal for license plates is ~2.5-3.5)
    if (aspectRatio >= 2.0 && aspectRatio <= 6.0) {
      const idealRatio = 3.0;
      geometricScore += Math.max(0, 1.0 - Math.abs(aspectRatio - idealRatio) / idealRatio) * 0.3;
    }
    
    // Size score
    if (relativeArea >= 0.001 && relativeArea <= 0.05) {
      const idealSize = 0.008;
      geometricScore += Math.max(0, 1.0 - Math.abs(relativeArea - idealSize) / idealSize) * 0.2;
    }
    
    // Position score (avoid extreme edges)
    const centerY = candidate.y + candidate.height / 2;
    const relativeY = centerY / img.naturalHeight;
    if (relativeY >= 0.05 && relativeY <= 0.95) {
      geometricScore += 0.1;
    }
    
    // Color validation for typical license plate colors
    hsv = new cv.Mat();
    cv.cvtColor(roi, hsv, cv.COLOR_RGB2HSV);
    
    // Check for white/light background (common in license plates)
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(hsv, mean, stddev);
    
    const brightness = mean.data64F[2]; // V channel in HSV
    const saturation = mean.data64F[1]; // S channel in HSV
    
    let colorScore = 0;
    if (brightness > 150 && saturation < 50) { // Light background
      colorScore += 0.2;
    }
    
    // Edge density validation
    const grayRoi = gray.roi(rect);
    const edges = new cv.Mat();
    cv.Canny(grayRoi, edges, 50, 150);
    
    const edgePixels = cv.countNonZero(edges);
    const totalPixels = edges.rows * edges.cols;
    const edgeDensity = totalPixels > 0 ? edgePixels / totalPixels : 0;
    
    let edgeScore = 0;
    if (edgeDensity > 0.05 && edgeDensity < 0.4) { // Typical range for text regions
      edgeScore += Math.min(edgeDensity * 2, 0.2);
    }
    
    // Combine scores
    const finalScore = Math.min(1.0, geometricScore + colorScore + edgeScore + (candidate.confidence * 0.1));
    
    console.log(`    Validation scores - Geometric: ${geometricScore.toFixed(2)}, Color: ${colorScore.toFixed(2)}, Edge: ${edgeScore.toFixed(2)}, Final: ${finalScore.toFixed(2)}`);
    
    // Cleanup
    mean.delete();
    stddev.delete();
    edges.delete();
    grayRoi.delete();
    
    return finalScore;
    
  } catch (err) {
    console.error('Final validation error:', err);
    return 0;
  } finally {
    src?.delete();
    gray?.delete();
    roi?.delete();
    hsv?.delete();
  }
}

/**
 * Advanced combination and filtering of detections with debug support
 */
export function combineAndFilterDetections(
  allDetections: PlateDetection[], 
  debugMode: boolean = false
): PlateDetection[] {
  const finalDetections: PlateDetection[] = [];
  
  // In debug mode, apply less strict filtering
  const minConfidence = debugMode ? 0.3 : 0.6;
  const maxResults = debugMode ? 15 : 5;
  const iouThreshold = debugMode ? 0.7 : 0.5; // Less overlap filtering in debug mode
  
  const filteredDetections = allDetections.filter(d => d.confidence >= minConfidence);
  const sortedDetections = [...filteredDetections].sort((a, b) => b.confidence - a.confidence);
  
  if (debugMode) {
    console.log(`🔍 Combining ${allDetections.length} total detections, ${filteredDetections.length} above ${minConfidence} confidence`);
  }
  
  for (const newDetection of sortedDetections) {
    let isDuplicate = false;
    for (const existingDetection of finalDetections) {
      const iou = calculateIoU(
        [newDetection.x, newDetection.y, newDetection.width, newDetection.height],
        [existingDetection.x, existingDetection.y, existingDetection.width, existingDetection.height]
      );
      if (iou > iouThreshold) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate && finalDetections.length < maxResults) {
      finalDetections.push(newDetection);
    }
  }
  
  if (debugMode) {
    console.log(`🎯 Final combined results: ${finalDetections.length} unique detections`);
    finalDetections.forEach((d, i) => {
      console.log(`  ${i+1}. [${d.x}, ${d.y}, ${d.width}, ${d.height}] confidence: ${d.confidence.toFixed(2)} method: ${d.method}`);
    });
  }
  
  return finalDetections;
}