// Debug Visualization for Noise Filtering
// This module helps visualize what's being filtered out and why

declare var cv: any;

export interface DebugInfo {
  totalCandidates: number;
  filteredCandidates: number;
  noiseReasons: { [key: string]: number };
  rejectedRegions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    reason: string;
    noiseType: string;
  }>;
}

let debugInfo: DebugInfo = {
  totalCandidates: 0,
  filteredCandidates: 0,
  noiseReasons: {},
  rejectedRegions: []
};

/**
 * Reset debug info for new detection run
 */
export function resetDebugInfo(): void {
  debugInfo = {
    totalCandidates: 0,
    filteredCandidates: 0,
    noiseReasons: {},
    rejectedRegions: []
  };
}

/**
 * Record a rejected region for debugging
 */
export function recordRejection(
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  reason: string, 
  noiseType: string
): void {
  debugInfo.rejectedRegions.push({ x, y, width, height, reason, noiseType });
  
  if (!debugInfo.noiseReasons[noiseType]) {
    debugInfo.noiseReasons[noiseType] = 0;
  }
  debugInfo.noiseReasons[noiseType]++;
}

/**
 * Update candidate counts
 */
export function updateCandidateCounts(total: number, filtered: number): void {
  debugInfo.totalCandidates = total;
  debugInfo.filteredCandidates = filtered;
}

/**
 * Get current debug info
 */
export function getDebugInfo(): DebugInfo {
  return { ...debugInfo };
}

/**
 * Print debug summary to console
 */
export function printDebugSummary(): void {
  console.log('\n🔍 NOISE FILTERING DEBUG SUMMARY');
  console.log('================================');
  console.log(`📊 Total candidates: ${debugInfo.totalCandidates}`);
  console.log(`✅ Passed filtering: ${debugInfo.filteredCandidates}`);
  console.log(`❌ Rejected: ${debugInfo.totalCandidates - debugInfo.filteredCandidates}`);
  
  if (Object.keys(debugInfo.noiseReasons).length > 0) {
    console.log('\n🗑️ Rejection reasons:');
    Object.entries(debugInfo.noiseReasons)
      .sort(([,a], [,b]) => b - a)
      .forEach(([reason, count]) => {
        console.log(`   ${reason}: ${count} regions`);
      });
  }
  
  if (debugInfo.rejectedRegions.length > 0) {
    console.log('\n📍 Rejected regions:');
    debugInfo.rejectedRegions.slice(0, 10).forEach((region, i) => {
      console.log(`   ${i+1}. [${region.x},${region.y},${region.width},${region.height}] - ${region.noiseType}: ${region.reason}`);
    });
    if (debugInfo.rejectedRegions.length > 10) {
      console.log(`   ... and ${debugInfo.rejectedRegions.length - 10} more`);
    }
  }
  console.log('================================\n');
}

/**
 * Create a visualization canvas showing rejected regions
 */
export function createDebugVisualization(
  img: HTMLImageElement,
  rejectedRegions: Array<{ x: number, y: number, width: number, height: number, noiseType: string }>
): HTMLCanvasElement | null {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    // Draw original image
    ctx.drawImage(img, 0, 0);
    
    // Color map for different noise types
    const colorMap: { [key: string]: string } = {
      'sky_cloud': 'rgba(135, 206, 235, 0.6)',        // Sky blue
      'ground_pavement': 'rgba(139, 69, 19, 0.6)',    // Brown
      'vegetation': 'rgba(34, 139, 34, 0.6)',         // Green
      'lighting_artifact': 'rgba(255, 255, 0, 0.6)',  // Yellow
      'building_structure': 'rgba(128, 128, 128, 0.6)', // Gray
      'uniform_region': 'rgba(255, 0, 255, 0.6)',     // Magenta
      'high_texture': 'rgba(255, 165, 0, 0.6)'        // Orange
    };
    
    // Draw rejected regions
    rejectedRegions.forEach((region, index) => {
      const color = colorMap[region.noiseType] || 'rgba(255, 0, 0, 0.6)';
      
      ctx.fillStyle = color;
      ctx.fillRect(region.x, region.y, region.width, region.height);
      
      ctx.strokeStyle = color.replace('0.6', '1.0');
      ctx.lineWidth = 2;
      ctx.strokeRect(region.x, region.y, region.width, region.height);
      
      // Add label
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText(
        `${index + 1}: ${region.noiseType}`,
        region.x,
        region.y - 5
      );
    });
    
    return canvas;
    
  } catch (error) {
    console.error('Debug visualization error:', error);
    return null;
  }
}

/**
 * Analyze image composition for debugging
 */
export function analyzeImageComposition(img: HTMLImageElement): void {
  if (typeof cv === 'undefined') {
    console.log('OpenCV not available for image analysis');
    return;
  }
  
  let src: any, hsv: any, gray: any;
  
  try {
    src = cv.imread(img);
    hsv = new cv.Mat();
    gray = new cv.Mat();
    
    cv.cvtColor(src, hsv, cv.COLOR_RGB2HSV);
    cv.cvtColor(src, gray, cv.COLOR_RGB2GRAY);
    
    // Analyze overall image characteristics
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(gray, mean, stddev);
    
    const brightness = mean.data64F[0];
    const contrast = stddev.data64F[0];
    
    // Analyze color distribution
    const channels = new cv.MatVector();
    cv.split(hsv, channels);
    
    const hChannel = channels.get(0);
    const sChannel = channels.get(1);
    const vChannel = channels.get(2);
    
    const hMean = new cv.Mat();
    const sMean = new cv.Mat();
    const vMean = new cv.Mat();
    
    cv.meanStdDev(hChannel, hMean);
    cv.meanStdDev(sChannel, sMean);
    cv.meanStdDev(vChannel, vMean);
    
    console.log('\n🖼️ IMAGE COMPOSITION ANALYSIS');
    console.log('============================');
    console.log(`📏 Dimensions: ${img.naturalWidth} x ${img.naturalHeight}`);
    console.log(`💡 Brightness: ${brightness.toFixed(1)} (0-255)`);
    console.log(`🎨 Contrast: ${contrast.toFixed(1)}`);
    console.log(`🌈 Hue: ${hMean.data64F[0].toFixed(1)}`);
    console.log(`🎯 Saturation: ${sMean.data64F[0].toFixed(1)}`);
    console.log(`✨ Value: ${vMean.data64F[0].toFixed(1)}`);
    
    // Provide interpretation
    if (brightness > 180) {
      console.log('⚠️  High brightness detected - may contain sky/lighting artifacts');
    }
    if (contrast < 20) {
      console.log('⚠️  Low contrast detected - may contain uniform regions');
    }
    if (sMean.data64F[0] < 30) {
      console.log('⚠️  Low saturation detected - may be mostly grayscale/cloudy');
    }
    
    console.log('============================\n');
    
    // Cleanup
    mean.delete();
    stddev.delete();
    channels.delete();
    hMean.delete();
    sMean.delete();
    vMean.delete();
    
  } catch (error) {
    console.error('Image composition analysis error:', error);
  } finally {
    src?.delete();
    hsv?.delete();
    gray?.delete();
  }
}