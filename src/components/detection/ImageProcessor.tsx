import React, { useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { ProcessedImage, DetectedRegion, ProcessingSettings, Annotation } from '../../types';
import { 
  performAustralianPlateDetection 
} from '../../utils/australianPlateDetection';
import { 
  performRobustMultiMethodDetection,
  performSimpleEffectiveDetection,
  performAggressiveDetection,
  performPlateRecognizerDetection,
  performOpenALPRDetection,
  performGoogleVisionDetection,
  performMultipleFallbackMethods
} from '../../utils/licenseParseDetection';
import { performIntelligentPlateDetection } from '../../utils/intelligentPlateDetection';
import { performPrecisionPlateDetection } from '../../utils/precisionPlateDetection';
import { performDeepLearningDetection } from '../../utils/deepLearningDetection';
import { performSmartAPIDetection } from '../../utils/smartAPIDetection';

declare var cv: any;

interface ImageProcessorProps {
  modelsLoaded: boolean;
  settings: ProcessingSettings;
  annotations: Annotation[];
  onImageUpdate: (imageId: string, updates: Partial<ProcessedImage>) => void;
  onError: (error: string) => void;
}

export const useImageProcessor = ({
  modelsLoaded,
  settings,
  annotations,
  onImageUpdate,
  onError
}: ImageProcessorProps) => {
  
  const processImage = useCallback(async (imageId: string, image: ProcessedImage) => {
    if (!modelsLoaded) {
      console.log('Models not loaded yet, skipping processing');
      return;
    }

    console.log(`processImage called for imageId: ${imageId}`);

    try {
      // Mark as processing
      onImageUpdate(imageId, { processing: true });

      // Add delay to prevent overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create temporary image and canvas for processing
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = image.originalUrl;
      });

      // Optimize image size for faster processing
      const maxDimension = 1920;
      let canvasWidth = img.naturalWidth;
      let canvasHeight = img.naturalHeight;
      
      if (canvasWidth > maxDimension || canvasHeight > maxDimension) {
        const scale = maxDimension / Math.max(canvasWidth, canvasHeight);
        canvasWidth = Math.floor(canvasWidth * scale);
        canvasHeight = Math.floor(canvasHeight * scale);
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      context.drawImage(img, 0, 0, canvasWidth, canvasHeight);

      let faceBoxes: any[] = [];
      let plateRects: any[] = [];

      // Face detection
      if (settings.enableFaceDetection) {
        try {
          const faceDetections = await faceapi.detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }));
          console.log('Raw face detections:', faceDetections);
          faceBoxes = Array.isArray(faceDetections) ? faceDetections.map(d => d.box) : [];
          console.log(`Face detection result for ${image.fileName}: ${faceBoxes.length} faces detected`);
        } catch (e) {
          console.error(`Face detection failed for ${image.fileName}:`, e);
        }
      }

      // License plate detection
      if (settings.enablePlateDetection) {
        try {
          console.log(`Starting license plate detection for ${image.fileName}...`);
          
          // Choose detection method based on settings
          console.log(`🎯 Using detection method: ${settings.detectionMethod}`);
          
          if (settings.detectionMethod === 'smartAPI') {
            // SMART API MANAGEMENT - Intelligent API selection and fallback
            console.log('🤖 Using SMART API MANAGEMENT - Intelligent API selection...');
            plateRects = await performSmartAPIDetection(img, canvas);
            console.log(`🤖 SMART API detection found ${plateRects.length} candidates`);
          } else if (settings.detectionMethod === 'deepLearning') {
            // REAL DEEP LEARNING detection method (YOLOv8n + OCR) - BEST ACCURACY!
            console.log('🤖 Using REAL DEEP LEARNING detection method - YOLOv8n + Tesseract OCR...');
            plateRects = await performDeepLearningDetection(img, canvas);
            console.log(`🤖 DEEP LEARNING detection found ${plateRects.length} candidates`);
            
            // If deep learning method fails, try intelligent as backup
            if (plateRects.length === 0) {
              console.log('🔄 Deep learning method found nothing, trying intelligent backup...');
              plateRects = await performIntelligentPlateDetection(img, canvas);
              console.log(`🧠 Intelligent backup found ${plateRects.length} candidates`);
              
              // If intelligent also fails, try simple as last resort
              if (plateRects.length === 0) {
                console.log('🔄 Intelligent backup failed, trying simple as last resort...');
                plateRects = await performSimpleEffectiveDetection(img, canvas);
                console.log(`🎯 Simple last resort found ${plateRects.length} candidates`);
              }
            }
          } else if (settings.detectionMethod === 'robust') {
            // NEW INTELLIGENT detection method (5 methods combined) - FAST!
            console.log('🧠 Using NEW INTELLIGENT detection method - 5 methods combined...');
            plateRects = await performIntelligentPlateDetection(img, canvas);
            console.log(`🧠 INTELLIGENT detection found ${plateRects.length} candidates`);
            
            // If intelligent method fails, try precision as backup
            if (plateRects.length === 0) {
              console.log('🔄 Intelligent method found nothing, trying precision backup...');
              plateRects = await performPrecisionPlateDetection(img, canvas);
              console.log(`🎯 Precision backup found ${plateRects.length} candidates`);
              
              // If precision also fails, try simple as last resort
              if (plateRects.length === 0) {
                console.log('🔄 Precision backup failed, trying simple as last resort...');
                plateRects = await performSimpleEffectiveDetection(img, canvas);
                console.log(`🎯 Simple last resort found ${plateRects.length} candidates`);
              }
            }
          } else if (settings.detectionMethod === 'aggressive') {
            plateRects = await performAggressiveDetection(img, canvas);
            console.log(`🔥 Aggressive detection found ${plateRects.length} candidates`);
          } else if (settings.detectionMethod === 'simple') {
            plateRects = await performSimpleEffectiveDetection(img, canvas);
            console.log(`🎯 Simple detection found ${plateRects.length} candidates`);
          } else if (settings.detectionMethod === 'plateRecognizer') {
            plateRects = await performPlateRecognizerDetection(img, settings.plateRecognizerApiKey);
            console.log(`📸 Plate Recognizer found ${plateRects.length} candidates`);
          } else if (settings.detectionMethod === 'openalpr') {
            console.log('🔓 Using OpenALPR API detection...');
            plateRects = await performOpenALPRDetection(img, settings.openalprApiKey);
            console.log(`🔓 OpenALPR API found ${plateRects.length} candidates`);
          } else if (settings.detectionMethod === 'googleVision') {
            console.log('🔍 Using Google Cloud Vision API detection...');
            plateRects = await performGoogleVisionDetection(img, settings.googleVisionApiKey);
            console.log(`🔍 Google Vision API found ${plateRects.length} candidates`);
          } else if (settings.detectionMethod === 'australian') {
            const relevantAnnotations = annotations.filter(ann => image.fileName.includes(ann.filename.split('.')[0]));
            plateRects = await performAustralianPlateDetection(img, canvas, relevantAnnotations);
            console.log(`🇦🇺 IMPROVED Australian detection found ${plateRects.length} candidates`);
          } else {
            // Fallback to simple detection
            console.log('🎯 Using fallback simple detection...');
            plateRects = await performSimpleEffectiveDetection(img, canvas);
            console.log(`🎯 Fallback simple detection found ${plateRects.length} candidates`);
          }
          
          // Log detection results for debugging
          if (plateRects.length > 0) {
            console.log('🎉 DETECTION SUCCESS! Found plates:');
            plateRects.forEach((plate, index) => {
              console.log(`  Plate ${index + 1}: [${plate.x}, ${plate.y}, ${plate.width}, ${plate.height}] confidence: ${(plate.confidence * 100).toFixed(1)}%`);
            });
          } else {
            console.log('⚠️ No license plates detected - this may indicate the algorithm needs further tuning');
          }
          
          // If no plates found by primary method, try one fallback method
          if (plateRects.length === 0) {
            console.log('🔄 No plates found by primary method. Trying one fallback method...');
            try {
              // Use simple effective detection as fallback
              plateRects = await performSimpleEffectiveDetection(img, canvas);
              console.log(`🆘 Fallback detection found ${plateRects.length} candidates`);
            } catch (fallbackError) {
              console.warn('Fallback detection also failed:', fallbackError);
            }
          }
          
        } catch (err) {
          console.error(`License plate detection failed for ${image.fileName}:`, err);
        }
      }

      // Create detected regions array
      const detectedRegions: DetectedRegion[] = [];
      
      // Add face detections
      faceBoxes.forEach((box, index) => {
        detectedRegions.push({
          id: `face-${imageId}-${index}`,
          type: 'face',
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          confidence: 0.8,
          enabled: true,
          method: 'face-api'
        });
      });
      
      // Add plate detections
      plateRects.forEach((detection, index) => {
        detectedRegions.push({
          id: `plate-${imageId}-${index}`,
          type: 'plate',
          x: detection.x,
          y: detection.y,
          width: detection.width,
          height: detection.height,
          confidence: detection.confidence,
          enabled: true,
          method: detection.method
        });
      });

      // Apply effects only to ENABLED regions
      detectedRegions.forEach(region => {
        if (!region.enabled) return;
        
        const { x, y, width, height, type } = region;
        const expansion = type === 'face' ? 0.15 : 0.1;
        
        const expandedX = Math.max(0, x - width * expansion);
        const expandedY = Math.max(0, y - height * expansion);
        const expandedWidth = Math.min(canvas.width - expandedX, width * (1 + 2 * expansion));
        const expandedHeight = Math.min(canvas.height - expandedY, height * (1 + 2 * expansion));
        
        if (type === 'face') {
          if (settings.highlightMode) {
            // Highlight mode: fill with selected color for testing/debugging
            context.save();
            context.fillStyle = settings.highlightColor;
            context.fillRect(expandedX, expandedY, expandedWidth, expandedHeight);
            context.restore();
          } else {
            // Normal processing mode
            if (settings.blur && expandedWidth > 0 && expandedHeight > 0) {
              context.save();
              const blurPixels = Math.round((settings.blurAmount / 100) * 30);
              context.filter = `blur(${blurPixels}px)`;
              context.drawImage(canvas, expandedX, expandedY, expandedWidth, expandedHeight, expandedX, expandedY, expandedWidth, expandedHeight);
              context.restore();
            }
            
            if (settings.mosaic) {
              const mosaicSize = Math.max(settings.mosaicAmount, 8);
              for (let i = 0; i < expandedWidth; i += mosaicSize) {
                for (let j = 0; j < expandedHeight; j += mosaicSize) {
                  const pixelX = expandedX + i + Math.floor(mosaicSize / 2);
                  const pixelY = expandedY + j + Math.floor(mosaicSize / 2);
                  if (pixelX < canvas.width && pixelY < canvas.height && pixelX >= 0 && pixelY >= 0) {
                    const pixel = context.getImageData(pixelX, pixelY, 1, 1).data;
                    context.fillStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
                    context.fillRect(
                      expandedX + i, 
                      expandedY + j, 
                      Math.min(mosaicSize, expandedWidth - i), 
                      Math.min(mosaicSize, expandedHeight - j)
                    );
                  }
                }
              }
            }
          }
        } else if (type === 'plate') {
          if (settings.highlightMode) {
            // Highlight mode: fill with selected color for testing/debugging
            context.save();
            context.fillStyle = settings.highlightColor;
            context.fillRect(expandedX, expandedY, expandedWidth, expandedHeight);
            context.restore();
          } else {
            // Normal processing mode
            if (settings.blur && expandedWidth > 0 && expandedHeight > 0) {
              context.save();
              const blurPixels = Math.round((settings.blurAmount / 100) * 30);
              context.filter = `blur(${blurPixels}px)`;
              context.drawImage(canvas, expandedX, expandedY, expandedWidth, expandedHeight, expandedX, expandedY, expandedWidth, expandedHeight);
              context.restore();
            }
            
            if (settings.mosaic) {
              const mosaicSize = Math.max(settings.mosaicAmount, 8);
              for (let i = 0; i < expandedWidth; i += mosaicSize) {
                for (let j = 0; j < expandedHeight; j += mosaicSize) {
                  const pixelX = expandedX + i + Math.floor(mosaicSize / 2);
                  const pixelY = expandedY + j + Math.floor(mosaicSize / 2);
                  if (pixelX < canvas.width && pixelY < canvas.height && pixelX >= 0 && pixelY >= 0) {
                    const pixel = context.getImageData(pixelX, pixelY, 1, 1).data;
                    context.fillStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
                    context.fillRect(
                      expandedX + i, 
                      expandedY + j, 
                      Math.min(mosaicSize, expandedWidth - i), 
                      Math.min(mosaicSize, expandedHeight - j)
                    );
                  }
                }
              }
            }
          }
        }
      });

      // Update the processed image
      const processedDataUrl = canvas.toDataURL('image/png');
      
      const infoMessage = `${faceBoxes.length} face(s), ${plateRects.length} plate(s) detected`;
      
      console.log(`Updating state for ${image.fileName}:`);
      console.log(`- Face count: ${faceBoxes.length}`);
      console.log(`- Plate count: ${plateRects.length}`);
      console.log(`- Info message: ${infoMessage}`);
      
      // Update image state
      onImageUpdate(imageId, {
        processing: false,
        processedDataUrl,
        faceCount: faceBoxes.length,
        plateCount: plateRects.length,
        detectionInfo: infoMessage,
        detectedRegions
      });
      
    } catch (err) {
      console.error(`Processing failed for ${image.fileName}:`, err);
      onImageUpdate(imageId, {
        processing: false,
        detectionInfo: 'Processing failed',
        detectedRegions: []
      });
      onError(err instanceof Error ? err.message : 'Processing failed');
    }
  }, [modelsLoaded, settings, annotations, onImageUpdate, onError]);

  return { processImage };
};

// This is just a hook, not a component, so we don't need a default export component
export default function ImageProcessor() {
  return null;
}