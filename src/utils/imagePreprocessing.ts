// Image Preprocessing System for License Plate Detection
// This module provides image enhancement and preprocessing utilities

declare var cv: any;

export interface ImageQualityAnalysis {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  brightness: number;
  contrast: number;
  sharpness: number;
  recommendations: string[];
}

export function analyzeImageQuality(img: HTMLImageElement): ImageQualityAnalysis {
  if (typeof cv === 'undefined') {
    return {
      quality: 'good',
      brightness: 128,
      contrast: 50,
      sharpness: 50,
      recommendations: []
    };
  }

  let src: any, gray: any;
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

    // Calculate brightness
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(gray, mean, stddev);
    
    const brightness = mean.data64F[0];
    const contrast = stddev.data64F[0];

    // Calculate sharpness using Laplacian variance
    const laplacian = new cv.Mat();
    cv.Laplacian(gray, laplacian, cv.CV_64F);
    
    const lapMean = new cv.Mat();
    const lapStddev = new cv.Mat();
    cv.meanStdDev(laplacian, lapMean, lapStddev);
    const sharpness = lapStddev.data64F[0];

    // Determine quality
    let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
    const recommendations: string[] = [];

    if (brightness < 80) {
      quality = 'poor';
      recommendations.push('Image is too dark');
    } else if (brightness > 200) {
      quality = 'fair';
      recommendations.push('Image is too bright');
    }

    if (contrast < 30) {
      quality = quality === 'good' ? 'fair' : 'poor';
      recommendations.push('Low contrast detected');
    }

    if (sharpness < 100) {
      quality = quality === 'good' ? 'fair' : 'poor';
      recommendations.push('Image appears blurry');
    }

    if (recommendations.length === 0) {
      quality = 'excellent';
    }

    // Cleanup
    mean.delete();
    stddev.delete();
    laplacian.delete();
    lapMean.delete();
    lapStddev.delete();

    return {
      quality,
      brightness,
      contrast,
      sharpness,
      recommendations
    };

  } catch (error) {
    console.warn('Image quality analysis failed:', error);
    return {
      quality: 'good',
      brightness: 128,
      contrast: 50,
      sharpness: 50,
      recommendations: []
    };
  } finally {
    src?.delete();
    gray?.delete();
  }
}

export function preprocessImageForDetection(img: HTMLImageElement): HTMLCanvasElement | null {
  if (typeof cv === 'undefined') return null;

  let src: any, enhanced: any;
  try {
    src = cv.imread(img);
    enhanced = new cv.Mat();

    // Convert to grayscale for processing
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

    // Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
    clahe.apply(gray, enhanced);

    // Convert back to color for display
    const colorEnhanced = new cv.Mat();
    cv.cvtColor(enhanced, colorEnhanced, cv.COLOR_GRAY2RGBA);

    // Create canvas and draw result
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    cv.imshow(canvas, colorEnhanced);

    // Cleanup
    gray.delete();
    enhanced.delete();
    colorEnhanced.delete();
    clahe.delete();

    return canvas;

  } catch (error) {
    console.warn('Image preprocessing failed:', error);
    return null;
  } finally {
    src?.delete();
    enhanced?.delete();
  }
}