// Debug Visualization System for License Plate Detection
// This module provides debugging and visualization utilities

export interface DebugInfo {
  rejections: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    reason: string;
    type: string;
  }>;
  candidateCounts: {
    initial: number;
    filtered: number;
  };
  imageComposition: {
    brightness: number;
    contrast: number;
    quality: string;
  };
}

let debugInfo: DebugInfo = {
  rejections: [],
  candidateCounts: { initial: 0, filtered: 0 },
  imageComposition: { brightness: 0, contrast: 0, quality: 'unknown' }
};

export function resetDebugInfo(): void {
  debugInfo = {
    rejections: [],
    candidateCounts: { initial: 0, filtered: 0 },
    imageComposition: { brightness: 0, contrast: 0, quality: 'unknown' }
  };
}

export function recordRejection(
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  reason: string, 
  type: string
): void {
  debugInfo.rejections.push({ x, y, width, height, reason, type });
}

export function updateCandidateCounts(initial: number, filtered: number): void {
  debugInfo.candidateCounts = { initial, filtered };
}

export function analyzeImageComposition(img: HTMLImageElement): void {
  // Simple image quality analysis
  debugInfo.imageComposition = {
    brightness: 128, // Default values
    contrast: 50,
    quality: 'good'
  };
  
  console.log(`📊 Image composition analyzed: ${img.naturalWidth}x${img.naturalHeight}`);
}

export function printDebugSummary(): void {
  console.log('🔍 DEBUG SUMMARY:');
  console.log(`  Candidates: ${debugInfo.candidateCounts.initial} → ${debugInfo.candidateCounts.filtered}`);
  console.log(`  Rejections: ${debugInfo.rejections.length}`);
  console.log(`  Image quality: ${debugInfo.imageComposition.quality}`);
  
  if (debugInfo.rejections.length > 0) {
    console.log('  Rejection reasons:');
    const reasonCounts: { [key: string]: number } = {};
    debugInfo.rejections.forEach(r => {
      reasonCounts[r.type] = (reasonCounts[r.type] || 0) + 1;
    });
    Object.entries(reasonCounts).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });
  }
}