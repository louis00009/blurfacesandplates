// OCR Integration with Tesseract.js
// This module provides OCR functionality for license plate text recognition

import { createWorker } from 'tesseract.js';
import { PlateDetection } from '../types';

declare var cv: any;

// Global worker instance for reuse
let ocrWorker: any = null;

/**
 * Initialize OCR worker
 */
export async function initializeOCR(): Promise<void> {
  if (ocrWorker) return;
  
  try {
    console.log('🔤 Initializing Tesseract.js OCR worker...');
    ocrWorker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${(m.progress * 100).toFixed(1)}%`);
        }
      }
    });
    
    // Configure for license plate recognition
    await ocrWorker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      tessedit_pageseg_mode: '8', // Single word
      tessedit_ocr_engine_mode: '2' // LSTM only
    });
    
    console.log('✅ OCR worker initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize OCR worker:', error);
    ocrWorker = null;
  }
}

/**
 * Terminate OCR worker
 */
export async function terminateOCR(): Promise<void> {
  if (ocrWorker) {
    try {
      await ocrWorker.terminate();
      ocrWorker = null;
      console.log('OCR worker terminated');
    } catch (error) {
      console.error('Error terminating OCR worker:', error);
    }
  }
}

/**
 * Enhanced plate detection with OCR validation
 */
export async function enhanceDetectionsWithOCR(
  img: HTMLImageElement,
  detections: PlateDetection[]
): Promise<PlateDetection[]> {
  if (!ocrWorker || detections.length === 0) {
    console.log('OCR not available or no detections to enhance');
    return detections;
  }
  
  console.log(`🔤 Enhancing ${detections.length} detections with OCR validation...`);
  const enhancedDetections: PlateDetection[] = [];
  
  for (let i = 0; i < detections.length; i++) {
    const detection = detections[i];
    console.log(`Processing detection ${i + 1}/${detections.length}...`);
    
    try {
      // Extract plate region
      const plateCanvas = extractPlateRegion(img, detection);
      if (!plateCanvas) continue;
      
      // Preprocess for OCR
      const preprocessedCanvas = preprocessForOCR(plateCanvas);
      
      // Perform OCR
      const ocrResult = await performOCR(preprocessedCanvas);
      
      // Validate OCR result with stricter requirements
      const validation = validateOCRResult(ocrResult.text);
      
      // Only accept high-confidence OCR results to reduce false positives
      if (validation.isValid && ocrResult.confidence > 0.7 && validation.score > 0.6) {
        const enhancedDetection: PlateDetection = {
          ...detection,
          confidence: Math.min(detection.confidence + (validation.score * 0.3), 0.98),
          method: detection.method + '_ocr_validated',
          textScore: validation.score,
          plateText: validation.cleanText,
          ocrConfidence: ocrResult.confidence
        };
        
        enhancedDetections.push(enhancedDetection);
        console.log(`✅ OCR validated: "${validation.cleanText}" (confidence: ${validation.score.toFixed(2)})`);
      } else if (validation.score > 0.3 && ocrResult.confidence > 0.5) {
        // Keep detection but mark it as low confidence if it has some merit
        const reducedDetection: PlateDetection = {
          ...detection,
          confidence: Math.max(detection.confidence * 0.5, 0.1),
          method: detection.method + '_ocr_uncertain',
          plateText: ocrResult.text || '',
          ocrConfidence: ocrResult.confidence
        };
        
        enhancedDetections.push(reducedDetection);
        console.log(`⚠️ OCR uncertain: "${ocrResult.text}" (keeping with reduced confidence)`);
      } else {
        // Reject detections with poor OCR results
        console.log(`❌ OCR rejected: "${ocrResult.text}" (confidence: ${ocrResult.confidence.toFixed(2)}, score: ${validation.score.toFixed(2)})`);
      }
      
    } catch (error) {
      console.error(`OCR processing error for detection ${i + 1}:`, error);
      // Keep original detection
      enhancedDetections.push(detection);
    }
  }
  
  console.log(`🔤 OCR enhancement completed: ${enhancedDetections.length} detections processed`);
  return enhancedDetections;
}

/**
 * Extract plate region from image
 */
function extractPlateRegion(img: HTMLImageElement, detection: PlateDetection): HTMLCanvasElement | null {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Add padding around detection
    const padding = 5;
    const x = Math.max(0, detection.x - padding);
    const y = Math.max(0, detection.y - padding);
    const width = Math.min(img.naturalWidth - x, detection.width + (padding * 2));
    const height = Math.min(img.naturalHeight - y, detection.height + (padding * 2));
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
    
    return canvas;
  } catch (error) {
    console.error('Error extracting plate region:', error);
    return null;
  }
}

/**
 * Preprocess image for better OCR results
 */
function preprocessForOCR(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const processedCanvas = document.createElement('canvas');
  const ctx = processedCanvas.getContext('2d')!;
  
  // Scale up for better OCR
  const scale = 3;
  processedCanvas.width = canvas.width * scale;
  processedCanvas.height = canvas.height * scale;
  
  // Smooth scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, processedCanvas.width, processedCanvas.height);
  
  // Get image data for processing
  const imageData = ctx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
  const data = imageData.data;
  
  // Convert to grayscale and enhance contrast
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    
    // Enhance contrast
    const enhanced = gray > 128 ? Math.min(255, gray * 1.2) : Math.max(0, gray * 0.8);
    
    data[i] = enhanced;     // R
    data[i + 1] = enhanced; // G
    data[i + 2] = enhanced; // B
    // Alpha stays the same
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  return processedCanvas;
}

/**
 * Perform OCR on preprocessed image
 */
async function performOCR(canvas: HTMLCanvasElement): Promise<{ text: string; confidence: number }> {
  try {
    const result = await ocrWorker.recognize(canvas);
    
    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence / 100 // Convert to 0-1 range
    };
  } catch (error) {
    console.error('OCR recognition error:', error);
    return { text: '', confidence: 0 };
  }
}

/**
 * Validate OCR result against Australian license plate patterns
 */
function validateOCRResult(text: string): { isValid: boolean; score: number; cleanText: string } {
  if (!text || text.length < 3) {
    return { isValid: false, score: 0, cleanText: '' };
  }
  
  // Clean the text
  const cleanText = text.replace(/[^A-Z0-9]/g, '').toUpperCase();
  
  if (cleanText.length < 3 || cleanText.length > 8) {
    return { isValid: false, score: 0, cleanText };
  }
  
  let score = 0;
  
  // Australian plate patterns (simplified)
  const patterns = [
    /^[A-Z]{3}[0-9]{3}$/, // ABC123
    /^[0-9]{3}[A-Z]{3}$/, // 123ABC
    /^[A-Z]{2}[0-9]{2}[A-Z]{2}$/, // AB12CD
    /^[0-9]{3}[A-Z]{2}[0-9]$/, // 123AB1
    /^[A-Z][0-9]{3}[A-Z]{2}$/, // A123BC
    /^[A-Z]{4}[0-9]{2}$/, // ABCD12
    /^[0-9]{4}[A-Z]{2}$/, // 1234AB
  ];
  
  // Check against known patterns
  const matchesPattern = patterns.some(pattern => pattern.test(cleanText));
  if (matchesPattern) {
    score += 0.6;
  }
  
  // Length bonus
  if (cleanText.length >= 5 && cleanText.length <= 7) {
    score += 0.2;
  }
  
  // Character distribution bonus
  const letters = cleanText.replace(/[0-9]/g, '').length;
  const numbers = cleanText.replace(/[A-Z]/g, '').length;
  if (letters >= 2 && numbers >= 2) {
    score += 0.2;
  }
  
  // Avoid common OCR errors
  if (!/[IL0O]/.test(cleanText)) { // Avoid confusing characters
    score += 0.1;
  }
  
  const isValid = score >= 0.5;
  
  return { isValid, score: Math.min(score, 1.0), cleanText };
}

/**
 * Get OCR worker status
 */
export function isOCRReady(): boolean {
  return ocrWorker !== null;
}