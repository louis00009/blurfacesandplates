// Image Preprocessing for Enhanced License Plate Detection
// This module provides various image enhancement techniques to improve detection accuracy

declare var cv: any;

/**
 * Enhanced image preprocessing pipeline
 */
export function preprocessImageForDetection(img: HTMLImageElement): HTMLCanvasElement | null {
  if (typeof cv === 'undefined') {
    console.warn('OpenCV not available for preprocessing');
    return null;
  }
  
  console.log('🖼️ Starting image preprocessing pipeline...');
  
  let src: any, enhanced: any;
  
  try {
    src = cv.imread(img);
    enhanced = new cv.Mat();
    
    // Step 1: Contrast enhancement using CLAHE
    const claheEnhanced = enhanceContrast(src);
    
    // Step 2: Noise reduction with bilateral filtering
    const denoised = reduceNoise(claheEnhanced);
    
    // Step 3: Sharpening filter
    const sharpened = sharpenImage(denoised);
    
    // Step 4: Color space optimization
    const colorOptimized = optimizeColorSpace(sharpened);
    
    // Convert back to canvas for further processing
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    cv.imshow(canvas, colorOptimized);
    
    // Cleanup
    claheEnhanced.delete();
    denoised.delete();
    sharpened.delete();
    colorOptimized.delete();
    
    console.log('✅ Image preprocessing completed');
    return canvas;
    
  } catch (error) {
    console.error('Image preprocessing error:', error);
    return null;
  } finally {
    src?.delete();
    enhanced?.delete();
  }
}

/**
 * Enhance contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
 */
function enhanceContrast(src: any): any {
  const gray = new cv.Mat();
  const enhanced = new cv.Mat();
  
  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Apply CLAHE
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
    clahe.apply(gray, enhanced);
    
    // Convert back to color
    const colorEnhanced = new cv.Mat();
    cv.cvtColor(enhanced, colorEnhanced, cv.COLOR_GRAY2RGBA);
    
    clahe.delete();
    gray.delete();
    enhanced.delete();
    
    return colorEnhanced;
    
  } catch (error) {
    console.warn('CLAHE enhancement failed, using simple histogram equalization:', error);
    
    // Fallback to simple histogram equalization
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.equalizeHist(gray, enhanced);
    
    const colorEnhanced = new cv.Mat();
    cv.cvtColor(enhanced, colorEnhanced, cv.COLOR_GRAY2RGBA);
    
    gray.delete();
    enhanced.delete();
    
    return colorEnhanced;
  }
}

/**
 * Reduce noise using bilateral filtering
 */
function reduceNoise(src: any): any {
  const denoised = new cv.Mat();
  
  try {
    // Bilateral filter preserves edges while reducing noise
    cv.bilateralFilter(src, denoised, 9, 75, 75);
    return denoised;
    
  } catch (error) {
    console.warn('Bilateral filtering failed, using Gaussian blur:', error);
    
    // Fallback to gentle Gaussian blur
    cv.GaussianBlur(src, denoised, new cv.Size(3, 3), 0);
    return denoised;
  }
}

/**
 * Sharpen image using unsharp masking
 */
function sharpenImage(src: any): any {
  const sharpened = new cv.Mat();
  
  try {
    // Create sharpening kernel
    const kernel = cv.matFromArray(3, 3, cv.CV_32FC1, [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ]);
    
    cv.filter2D(src, sharpened, cv.CV_8U, kernel);
    
    kernel.delete();
    return sharpened;
    
  } catch (error) {
    console.warn('Sharpening failed, returning original:', error);
    return src.clone();
  }
}

/**
 * Optimize color space for license plate detection
 */
function optimizeColorSpace(src: any): any {
  const optimized = new cv.Mat();
  
  try {
    // Convert to LAB color space for better color separation
    const lab = new cv.Mat();
    cv.cvtColor(src, lab, cv.COLOR_RGBA2Lab);
    
    // Split channels
    const channels = new cv.MatVector();
    cv.split(lab, channels);
    
    // Enhance L channel (lightness)
    const lChannel = channels.get(0);
    const enhancedL = new cv.Mat();
    cv.equalizeHist(lChannel, enhancedL);
    
    // Replace L channel
    const newChannels = new cv.MatVector();
    newChannels.push_back(enhancedL);
    newChannels.push_back(channels.get(1));
    newChannels.push_back(channels.get(2));
    
    // Merge channels back
    const mergedLab = new cv.Mat();
    cv.merge(newChannels, mergedLab);
    
    // Convert back to RGBA
    cv.cvtColor(mergedLab, optimized, cv.COLOR_Lab2RGBA);
    
    // Cleanup
    lab.delete();
    channels.delete();
    enhancedL.delete();
    newChannels.delete();
    mergedLab.delete();
    
    return optimized;
    
  } catch (error) {
    console.warn('Color space optimization failed, returning original:', error);
    return src.clone();
  }
}

/**
 * Check if image needs preprocessing
 */
export function analyzeImageQuality(img: HTMLImageElement): {
  needsContrast: boolean;
  needsBrightness: boolean;
  needsSharpening: boolean;
  quality: 'good' | 'fair' | 'poor';
} {
  if (typeof cv === 'undefined') {
    return {
      needsContrast: false,
      needsBrightness: false,
      needsSharpening: false,
      quality: 'fair'
    };
  }
  
  let src: any, gray: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Calculate image statistics
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(gray, mean, stddev);
    
    const meanValue = mean.data64F[0];
    const stddevValue = stddev.data64F[0];
    
    // Analyze contrast (standard deviation)
    const needsContrast = stddevValue < 30; // Low contrast
    
    // Analyze brightness (mean)
    const needsBrightness = meanValue < 80 || meanValue > 200; // Too dark or too bright
    
    // Simple sharpness estimation using Laplacian variance
    const laplacian = new cv.Mat();
    const kernel = cv.matFromArray(3, 3, cv.CV_32FC1, [
      0, 1, 0,
      1, -4, 1,
      0, 1, 0
    ]);
    
    cv.filter2D(gray, laplacian, cv.CV_32F, kernel);
    
    const lapMean = new cv.Mat();
    const lapStddev = new cv.Mat();
    cv.meanStdDev(laplacian, lapMean, lapStddev);
    
    const sharpness = lapStddev.data64F[0];
    const needsSharpening = sharpness < 15; // Low sharpness
    
    // Overall quality assessment
    let quality: 'good' | 'fair' | 'poor';
    if (needsContrast && needsBrightness && needsSharpening) {
      quality = 'poor';
    } else if (needsContrast || needsBrightness || needsSharpening) {
      quality = 'fair';
    } else {
      quality = 'good';
    }
    
    // Cleanup
    mean.delete();
    stddev.delete();
    laplacian.delete();
    kernel.delete();
    lapMean.delete();
    lapStddev.delete();
    
    console.log(`📊 Image quality analysis: Quality=${quality}, Contrast=${stddevValue.toFixed(1)}, Brightness=${meanValue.toFixed(1)}, Sharpness=${sharpness.toFixed(1)}`);
    
    return {
      needsContrast,
      needsBrightness,
      needsSharpening,
      quality
    };
    
  } catch (error) {
    console.error('Image quality analysis failed:', error);
    return {
      needsContrast: false,
      needsBrightness: false,
      needsSharpening: false,
      quality: 'fair'
    };
  } finally {
    src?.delete();
    gray?.delete();
  }
}

/**
 * Simple brightness and contrast adjustment
 */
export function adjustBrightnessContrast(img: HTMLImageElement, brightness: number = 10, contrast: number = 1.2): HTMLCanvasElement | null {
  if (typeof cv === 'undefined') return null;
  
  let src: any, adjusted: any;
  
  try {
    src = cv.imread(img);
    adjusted = new cv.Mat();
    
    // Apply brightness and contrast: new_pixel = contrast * old_pixel + brightness
    src.convertTo(adjusted, -1, contrast, brightness);
    
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    cv.imshow(canvas, adjusted);
    
    return canvas;
    
  } catch (error) {
    console.error('Brightness/contrast adjustment failed:', error);
    return null;
  } finally {
    src?.delete();
    adjusted?.delete();
  }
}

/**
 * Gamma correction for lighting normalization
 */
export function gammaCorrection(img: HTMLImageElement, gamma: number = 1.2): HTMLCanvasElement | null {
  if (typeof cv === 'undefined') return null;
  
  let src: any, corrected: any;
  
  try {
    src = cv.imread(img);
    corrected = new cv.Mat();
    
    // Create gamma lookup table
    const lookupTable = new cv.Mat(1, 256, cv.CV_8U);
    const data = lookupTable.data;
    
    for (let i = 0; i < 256; i++) {
      data[i] = Math.min(255, Math.pow(i / 255.0, 1.0 / gamma) * 255);
    }
    
    cv.LUT(src, lookupTable, corrected);
    
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    cv.imshow(canvas, corrected);
    
    lookupTable.delete();
    
    return canvas;
    
  } catch (error) {
    console.error('Gamma correction failed:', error);
    return null;
  } finally {
    src?.delete();
    corrected?.delete();
  }
}

/**
 * Auto white balance correction
 */
export function autoWhiteBalance(img: HTMLImageElement): HTMLCanvasElement | null {
  if (typeof cv === 'undefined') return null;
  
  let src: any, balanced: any;
  
  try {
    src = cv.imread(img);
    balanced = new cv.Mat();
    
    // Simple gray world assumption white balance
    const channels = new cv.MatVector();
    cv.split(src, channels);
    
    let rMean = 0, gMean = 0, bMean = 0;
    
    // Calculate mean values for each channel
    const rChannel = channels.get(0);
    const gChannel = channels.get(1);
    const bChannel = channels.get(2);
    
    const rMeanMat = new cv.Mat();
    const gMeanMat = new cv.Mat();
    const bMeanMat = new cv.Mat();
    
    cv.meanStdDev(rChannel, rMeanMat);
    cv.meanStdDev(gChannel, gMeanMat);
    cv.meanStdDev(bChannel, bMeanMat);
    
    rMean = rMeanMat.data64F[0];
    gMean = gMeanMat.data64F[0];
    bMean = bMeanMat.data64F[0];
    
    const avgMean = (rMean + gMean + bMean) / 3;
    
    // Calculate scaling factors
    const rScale = avgMean / rMean;
    const gScale = avgMean / gMean;
    const bScale = avgMean / bMean;
    
    // Apply scaling
    const rScaled = new cv.Mat();
    const gScaled = new cv.Mat();
    const bScaled = new cv.Mat();
    
    rChannel.convertTo(rScaled, -1, rScale, 0);
    gChannel.convertTo(gScaled, -1, gScale, 0);
    bChannel.convertTo(bScaled, -1, bScale, 0);
    
    // Merge channels back
    const balancedChannels = new cv.MatVector();
    balancedChannels.push_back(rScaled);
    balancedChannels.push_back(gScaled);
    balancedChannels.push_back(bScaled);
    balancedChannels.push_back(channels.get(3)); // Alpha channel
    
    cv.merge(balancedChannels, balanced);
    
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    cv.imshow(canvas, balanced);
    
    // Cleanup
    channels.delete();
    rMeanMat.delete();
    gMeanMat.delete();
    bMeanMat.delete();
    rScaled.delete();
    gScaled.delete();
    bScaled.delete();
    balancedChannels.delete();
    
    return canvas;
    
  } catch (error) {
    console.error('Auto white balance failed:', error);
    return null;
  } finally {
    src?.delete();
    balanced?.delete();
  }
}