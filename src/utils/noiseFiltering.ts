// Noise Filtering System for License Plate Detection
// This module filters out common false positive sources before main detection

import { recordRejection, updateCandidateCounts } from './debugVisualization';

declare var cv: any;

export interface NoiseFilterResult {
  isNoise: boolean;
  noiseType: string;
  confidence: number;
  reason: string;
}

/**
 * Pre-filter candidates to remove obvious noise sources
 */
export function preFilterNoiseRegions(
  img: HTMLImageElement, 
  candidates: any[]
): any[] {
  if (typeof cv === 'undefined' || candidates.length === 0) return candidates;
  
  console.log(`🔍 Pre-filtering ${candidates.length} candidates for noise...`);
  const filteredCandidates: any[] = [];
  
  let src: any;
  try {
    src = cv.imread(img);
    
    for (const candidate of candidates) {
      const rect = {
        x: candidate.x || candidate.rect?.x || 0,
        y: candidate.y || candidate.rect?.y || 0,
        width: candidate.width || candidate.rect?.width || 0,
        height: candidate.height || candidate.rect?.height || 0
      };
      
      // Skip invalid rectangles
      if (rect.width <= 0 || rect.height <= 0) continue;
      
      const noiseResult = analyzeRegionForNoise(src, rect, img);
      
      if (!noiseResult.isNoise) {
        filteredCandidates.push(candidate);
        console.log(`✅ Candidate [${rect.x},${rect.y},${rect.width},${rect.height}] passed noise filter`);
      } else {
        // Record rejection for debugging
        recordRejection(rect.x, rect.y, rect.width, rect.height, noiseResult.reason, noiseResult.noiseType);
        console.log(`❌ Rejected [${rect.x},${rect.y},${rect.width},${rect.height}] - ${noiseResult.noiseType}: ${noiseResult.reason}`);
      }
    }
    
  } catch (error) {
    console.error('Pre-filter error:', error);
    return candidates; // Return original if error
  } finally {
    src?.delete();
  }
  
  // Update debug info
  updateCandidateCounts(candidates.length, filteredCandidates.length);
  
  console.log(`🔍 Noise filtering: ${candidates.length} → ${filteredCandidates.length} candidates`);
  return filteredCandidates;
}

/**
 * Analyze a specific region to determine if it's likely noise
 */
function analyzeRegionForNoise(src: any, rect: any, img: HTMLImageElement): NoiseFilterResult {
  let roi: any, gray: any, hsv: any;
  
  try {
    // Extract region
    roi = src.roi(new cv.Rect(rect.x, rect.y, rect.width, rect.height));
    gray = new cv.Mat();
    hsv = new cv.Mat();
    
    cv.cvtColor(roi, gray, cv.COLOR_RGB2GRAY);
    cv.cvtColor(roi, hsv, cv.COLOR_RGB2HSV);
    
    // Test 1: Sky/Cloud Detection
    const skyResult = detectSkyRegion(hsv, gray);
    if (skyResult.isNoise) return skyResult;
    
    // Test 2: Ground/Pavement Detection  
    const groundResult = detectGroundTexture(gray, roi);
    if (groundResult.isNoise) return groundResult;
    
    // Test 3: Vegetation Detection
    const vegetationResult = detectVegetation(hsv);
    if (vegetationResult.isNoise) return vegetationResult;
    
    // Test 4: Lighting Artifacts
    const lightingResult = detectLightingArtifacts(gray, rect, img);
    if (lightingResult.isNoise) return lightingResult;
    
    // Test 5: Building/Architecture
    const buildingResult = detectBuildingStructure(gray, roi);
    if (buildingResult.isNoise) return buildingResult;
    
    // Test 6: Uniform Color Regions
    const uniformResult = detectUniformRegions(gray, hsv);
    if (uniformResult.isNoise) return uniformResult;
    
    // Test 7: Texture Complexity
    const textureResult = detectHighTextureNoise(gray);
    if (textureResult.isNoise) return textureResult;
    
    return { isNoise: false, noiseType: 'none', confidence: 0, reason: 'Passed all noise tests' };
    
  } catch (error) {
    console.warn('Noise analysis error:', error);
    return { isNoise: false, noiseType: 'error', confidence: 0, reason: 'Analysis failed' };
  } finally {
    roi?.delete();
    gray?.delete();
    hsv?.delete();
  }
}

/**
 * Detect sky and cloud regions
 */
function detectSkyRegion(hsv: any, gray: any): NoiseFilterResult {
  try {
    // Sky characteristics: high brightness, low saturation, often blue-ish
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(gray, mean, stddev);
    
    const brightness = mean.data64F[0];
    const contrast = stddev.data64F[0];
    
    // Check for sky-like HSV values
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
    
    const hue = hMean.data64F[0];
    const saturation = sMean.data64F[0];
    const value = vMean.data64F[0];
    
    // Sky detection criteria
    const isSky = (
      brightness > 160 &&           // High brightness
      contrast < 40 &&              // Low contrast (smooth)
      saturation < 80 &&            // Low saturation
      ((hue > 90 && hue < 130) ||   // Blue sky
       saturation < 20)             // Very desaturated (white/gray clouds)
    );
    
    // Cleanup
    mean.delete();
    stddev.delete();
    channels.delete();
    hMean.delete();
    sMean.delete();
    vMean.delete();
    
    if (isSky) {
      return {
        isNoise: true,
        noiseType: 'sky_cloud',
        confidence: 0.9,
        reason: `Sky/cloud region detected (brightness: ${brightness.toFixed(1)}, sat: ${saturation.toFixed(1)})`
      };
    }
    
  } catch (error) {
    console.warn('Sky detection error:', error);
  }
  
  return { isNoise: false, noiseType: 'none', confidence: 0, reason: '' };
}

/**
 * Detect ground/pavement textures
 */
function detectGroundTexture(gray: any, roi: any): NoiseFilterResult {
  try {
    // Calculate texture features
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(gray, mean, stddev);
    
    const brightness = mean.data64F[0];
    const texture = stddev.data64F[0];
    
    // Calculate edge density
    const edges = new cv.Mat();
    cv.Canny(gray, edges, 50, 150);
    const edgePixels = cv.countNonZero(edges);
    const totalPixels = gray.rows * gray.cols;
    const edgeDensity = edgePixels / totalPixels;
    
    // Ground characteristics: moderate brightness, high texture, high edge density
    const isGround = (
      brightness > 80 && brightness < 180 && // Moderate brightness
      texture > 25 &&                        // High texture variation
      edgeDensity > 0.15                     // High edge density
    );
    
    // Cleanup
    mean.delete();
    stddev.delete();
    edges.delete();
    
    if (isGround) {
      return {
        isNoise: true,
        noiseType: 'ground_pavement',
        confidence: 0.85,
        reason: `Ground texture detected (texture: ${texture.toFixed(1)}, edges: ${(edgeDensity*100).toFixed(1)}%)`
      };
    }
    
  } catch (error) {
    console.warn('Ground detection error:', error);
  }
  
  return { isNoise: false, noiseType: 'none', confidence: 0, reason: '' };
}

/**
 * Detect vegetation/grass
 */
function detectVegetation(hsv: any): NoiseFilterResult {
  try {
    // Green vegetation detection
    const greenMask = new cv.Mat();
    const lowerGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [35, 40, 40]);
    const upperGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [80, 255, 255]);
    
    cv.inRange(hsv, lowerGreen, upperGreen, greenMask);
    const greenPixels = cv.countNonZero(greenMask);
    const totalPixels = hsv.rows * hsv.cols;
    const greenRatio = greenPixels / totalPixels;
    
    // Cleanup
    greenMask.delete();
    lowerGreen.delete();
    upperGreen.delete();
    
    if (greenRatio > 0.6) {
      return {
        isNoise: true,
        noiseType: 'vegetation',
        confidence: 0.9,
        reason: `Vegetation detected (${(greenRatio*100).toFixed(1)}% green pixels)`
      };
    }
    
  } catch (error) {
    console.warn('Vegetation detection error:', error);
  }
  
  return { isNoise: false, noiseType: 'none', confidence: 0, reason: '' };
}

/**
 * Detect lighting artifacts and bright spots
 */
function detectLightingArtifacts(gray: any, rect: any, img: HTMLImageElement): NoiseFilterResult {
  try {
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(gray, mean, stddev);
    
    const brightness = mean.data64F[0];
    const contrast = stddev.data64F[0];
    
    // Very bright regions with low contrast are likely lighting artifacts
    const isLightingArtifact = (
      brightness > 220 &&  // Very bright
      contrast < 15        // Very low contrast (uniform bright spot)
    );
    
    // Small bright spots are often reflections
    const area = rect.width * rect.height;
    const imageArea = img.naturalWidth * img.naturalHeight;
    const relativeArea = area / imageArea;
    
    const isSmallBrightSpot = (
      brightness > 200 &&
      relativeArea < 0.001  // Very small area
    );
    
    // Cleanup
    mean.delete();
    stddev.delete();
    
    if (isLightingArtifact || isSmallBrightSpot) {
      return {
        isNoise: true,
        noiseType: 'lighting_artifact',
        confidence: 0.95,
        reason: `Lighting artifact detected (brightness: ${brightness.toFixed(1)}, contrast: ${contrast.toFixed(1)})`
      };
    }
    
  } catch (error) {
    console.warn('Lighting detection error:', error);
  }
  
  return { isNoise: false, noiseType: 'none', confidence: 0, reason: '' };
}

/**
 * Detect building/architectural structures
 */
function detectBuildingStructure(gray: any, roi: any): NoiseFilterResult {
  try {
    // Detect strong horizontal and vertical lines (building features)
    const horizontalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(25, 1));
    const verticalKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 25));
    
    const horizontal = new cv.Mat();
    const vertical = new cv.Mat();
    
    cv.morphologyEx(gray, horizontal, cv.MORPH_OPEN, horizontalKernel);
    cv.morphologyEx(gray, vertical, cv.MORPH_OPEN, verticalKernel);
    
    const hSum = cv.sumElems(horizontal);
    const vSum = cv.sumElems(vertical);
    const totalPixels = gray.rows * gray.cols;
    
    const horizontalStrength = hSum[0] / (totalPixels * 255);
    const verticalStrength = vSum[0] / (totalPixels * 255);
    
    // Strong linear structures suggest buildings
    const isBuilding = (horizontalStrength > 0.15 || verticalStrength > 0.15);
    
    // Cleanup
    horizontalKernel.delete();
    verticalKernel.delete();
    horizontal.delete();
    vertical.delete();
    
    if (isBuilding) {
      return {
        isNoise: true,
        noiseType: 'building_structure',
        confidence: 0.8,
        reason: `Building structure detected (H: ${(horizontalStrength*100).toFixed(1)}%, V: ${(verticalStrength*100).toFixed(1)}%)`
      };
    }
    
  } catch (error) {
    console.warn('Building detection error:', error);
  }
  
  return { isNoise: false, noiseType: 'none', confidence: 0, reason: '' };
}

/**
 * Detect uniform color regions
 */
function detectUniformRegions(gray: any, hsv: any): NoiseFilterResult {
  try {
    const stddev = new cv.Mat();
    const mean = new cv.Mat();
    cv.meanStdDev(gray, mean, stddev);
    
    const uniformity = stddev.data64F[0];
    const brightness = mean.data64F[0];
    
    // Very uniform regions are unlikely to be license plates
    const isUniform = (
      uniformity < 8 &&              // Very low variation
      (brightness < 50 ||            // Very dark
       brightness > 200)             // Very bright
    );
    
    // Cleanup
    stddev.delete();
    mean.delete();
    
    if (isUniform) {
      return {
        isNoise: true,
        noiseType: 'uniform_region',
        confidence: 0.85,
        reason: `Uniform region detected (variation: ${uniformity.toFixed(1)}, brightness: ${brightness.toFixed(1)})`
      };
    }
    
  } catch (error) {
    console.warn('Uniform detection error:', error);
  }
  
  return { isNoise: false, noiseType: 'none', confidence: 0, reason: '' };
}

/**
 * Detect overly complex textures
 */
function detectHighTextureNoise(gray: any): NoiseFilterResult {
  try {
    // Calculate texture complexity using Laplacian variance
    const laplacian = new cv.Mat();
    const kernel = cv.matFromArray(3, 3, cv.CV_32FC1, [
      0, 1, 0,
      1, -4, 1,
      0, 1, 0
    ]);
    
    cv.filter2D(gray, laplacian, cv.CV_32F, kernel);
    
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(laplacian, mean, stddev);
    
    const textureComplexity = stddev.data64F[0];
    
    // Very high texture complexity suggests natural textures (grass, gravel, etc.)
    const isHighTexture = textureComplexity > 60;
    
    // Cleanup
    laplacian.delete();
    kernel.delete();
    mean.delete();
    stddev.delete();
    
    if (isHighTexture) {
      return {
        isNoise: true,
        noiseType: 'high_texture',
        confidence: 0.8,
        reason: `High texture complexity detected (${textureComplexity.toFixed(1)})`
      };
    }
    
  } catch (error) {
    console.warn('Texture detection error:', error);
  }
  
  return { isNoise: false, noiseType: 'none', confidence: 0, reason: '' };
}

/**
 * Quick noise check for a single rectangle before processing
 */
export function isLikelyNoise(
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  if (typeof cv === 'undefined') return false;
  
  let src: any;
  try {
    src = cv.imread(img);
    const rect = { x, y, width, height };
    const result = analyzeRegionForNoise(src, rect, img);
    return result.isNoise;
  } catch (error) {
    return false;
  } finally {
    src?.delete();
  }
}