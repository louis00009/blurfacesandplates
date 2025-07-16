// License Plate Detection Algorithms
// This module contains all the main detection methods

import { PlateDetection, Annotation } from '../types';

declare var cv: any;

// Main detection methods
// OpenALPR Cloud API Detection
// Google Cloud Vision API Detection
export async function performGoogleVisionDetection(
  img: HTMLImageElement,
  googleApiKey: string
): Promise<PlateDetection[]> {
  console.log('🔍 GOOGLE CLOUD VISION API Detection Starting...');
  console.log(`Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
  
  if (!googleApiKey || googleApiKey.trim() === '') {
    console.error('❌ Google Cloud Vision API key is not set.');
    return [];
  }

  const startTime = performance.now();

  try {
    // Create canvas and convert to base64
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    context.drawImage(img, 0, 0);

    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    console.log('🌐 Sending request to Google Cloud Vision API...');
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          image: {
            content: base64Image
          },
          features: [{
            type: 'TEXT_DETECTION',
            maxResults: 10
          }]
        }]
      })
    });

    const responseTime = performance.now() - startTime;
    console.log(`⚡ Google Vision API response received in ${responseTime.toFixed(1)}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Google Vision API request failed: ${response.status}`);
      throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📋 Google Vision API response:', data);

    if (!data.responses || !data.responses[0] || !data.responses[0].textAnnotations) {
      console.log('⚠️ No text found in Google Vision response');
      return [];
    }

    const textAnnotations = data.responses[0].textAnnotations;
    const detections: PlateDetection[] = [];

    // Filter text annotations that look like license plates
    for (let i = 1; i < textAnnotations.length; i++) { // Skip first (full text)
      const annotation = textAnnotations[i];
      const text = annotation.description;
      
      // Check if text looks like a license plate (Australian format)
      if (isLicensePlateText(text)) {
        const vertices = annotation.boundingPoly.vertices;
        const minX = Math.min(...vertices.map((v: any) => v.x || 0));
        const maxX = Math.max(...vertices.map((v: any) => v.x || 0));
        const minY = Math.min(...vertices.map((v: any) => v.y || 0));
        const maxY = Math.max(...vertices.map((v: any) => v.y || 0));

        const width = maxX - minX;
        const height = maxY - minY;
        const aspectRatio = width / height;

        // Check if dimensions are reasonable for a license plate
        if (aspectRatio >= 2.0 && aspectRatio <= 6.0 && width >= 50 && height >= 15) {
          detections.push({
            x: minX,
            y: minY,
            width: width,
            height: height,
            confidence: 0.8, // Google Vision doesn't provide confidence for text
            method: 'google-vision-api',
            angle: 0,
            textScore: 0.8,
            geometryScore: 0.8,
            plateText: text,
            ocrConfidence: 80
          });

          console.log(`  Plate found: "${text}" at [${minX}, ${minY}, ${width}, ${height}]`);
        }
      }
    }

    const totalTime = performance.now() - startTime;
    console.log(`✅ Google Vision API detection complete in ${totalTime.toFixed(1)}ms: ${detections.length} plates`);
    return detections;

  } catch (error) {
    console.error('❌ Google Vision API error:', error);
    return [];
  }
}

// Helper function to check if text looks like a license plate
function isLicensePlateText(text: string): boolean {
  if (!text || text.length < 3 || text.length > 8) return false;
  
  // Remove spaces and special characters
  const cleanText = text.replace(/[^A-Z0-9]/g, '');
  if (cleanText.length < 3 || cleanText.length > 8) return false;
  
  // Check for common Australian license plate patterns
  const australianPatterns = [
    /^[A-Z]{3}[0-9]{3}$/, // ABC123
    /^[0-9]{3}[A-Z]{3}$/, // 123ABC
    /^[A-Z]{2}[0-9]{2}[A-Z]{2}$/, // AB12CD
    /^[0-9]{1}[A-Z]{3}[0-9]{3}$/, // 1ABC123
    /^[A-Z]{1}[0-9]{2}[A-Z]{3}$/, // A12BCD
  ];
  
  return australianPatterns.some(pattern => pattern.test(cleanText));
}

// Azure Computer Vision API Detection
export async function performAzureVisionDetection(
  img: HTMLImageElement,
  azureApiKey: string,
  azureEndpoint: string = 'https://your-resource.cognitiveservices.azure.com'
): Promise<PlateDetection[]> {
  console.log('🔷 AZURE COMPUTER VISION API Detection Starting...');
  console.log(`Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
  
  if (!azureApiKey || azureApiKey.trim() === '') {
    console.error('❌ Azure Computer Vision API key is not set.');
    return [];
  }

  const startTime = performance.now();

  try {
    // Create canvas and convert to blob
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    context.drawImage(img, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      }, 'image/jpeg', 0.8);
    });

    console.log('🌐 Sending request to Azure Computer Vision API...');
    const response = await fetch(`${azureEndpoint}/vision/v3.2/read/analyze`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureApiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: blob
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Azure API request failed: ${response.status}`);
      throw new Error(`Azure API error: ${response.status} - ${errorText}`);
    }

    // Azure Read API returns operation location
    const operationLocation = response.headers.get('Operation-Location');
    if (!operationLocation) {
      throw new Error('No operation location returned from Azure API');
    }

    // Poll for results
    console.log('⏳ Polling Azure API for results...');
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const resultResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': azureApiKey,
        }
      });

      if (!resultResponse.ok) {
        throw new Error(`Failed to get Azure API results: ${resultResponse.status}`);
      }

      const resultData = await resultResponse.json();
      
      if (resultData.status === 'succeeded') {
        const responseTime = performance.now() - startTime;
        console.log(`⚡ Azure API response received in ${responseTime.toFixed(1)}ms`);

        const detections: PlateDetection[] = [];

        // Process text results
        if (resultData.analyzeResult && resultData.analyzeResult.readResults) {
          for (const page of resultData.analyzeResult.readResults) {
            for (const line of page.lines) {
              if (isLicensePlateText(line.text)) {
                const bbox = line.boundingBox;
                const minX = Math.min(bbox[0], bbox[2], bbox[4], bbox[6]);
                const maxX = Math.max(bbox[0], bbox[2], bbox[4], bbox[6]);
                const minY = Math.min(bbox[1], bbox[3], bbox[5], bbox[7]);
                const maxY = Math.max(bbox[1], bbox[3], bbox[5], bbox[7]);

                const width = maxX - minX;
                const height = maxY - minY;
                const aspectRatio = width / height;

                if (aspectRatio >= 2.0 && aspectRatio <= 6.0 && width >= 50 && height >= 15) {
                  detections.push({
                    x: minX,
                    y: minY,
                    width: width,
                    height: height,
                    confidence: 0.85, // Azure doesn't provide confidence for text
                    method: 'azure-vision-api',
                    angle: 0,
                    textScore: 0.85,
                    geometryScore: 0.85,
                    plateText: line.text,
                    ocrConfidence: 85
                  });

                  console.log(`  Plate found: "${line.text}" at [${minX}, ${minY}, ${width}, ${height}]`);
                }
              }
            }
          }
        }

        const totalTime = performance.now() - startTime;
        console.log(`✅ Azure Vision API detection complete in ${totalTime.toFixed(1)}ms: ${detections.length} plates`);
        return detections;
      }
      
      if (resultData.status === 'failed') {
        throw new Error('Azure API processing failed');
      }
      
      attempts++;
    }

    throw new Error('Azure API polling timeout');

  } catch (error) {
    console.error('❌ Azure Vision API error:', error);
    return [];
  }
}

// AWS Rekognition API Detection
export async function performAWSRekognitionDetection(
  img: HTMLImageElement,
  awsAccessKey: string,
  awsSecretKey: string,
  awsRegion: string = 'us-east-1'
): Promise<PlateDetection[]> {
  console.log('🟠 AWS REKOGNITION API Detection Starting...');
  console.log(`Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
  
  if (!awsAccessKey || !awsSecretKey) {
    console.error('❌ AWS credentials are not set.');
    return [];
  }

  const startTime = performance.now();

  try {
    // Create canvas and convert to base64
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    context.drawImage(img, 0, 0);

    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    // AWS Signature V4 signing (simplified for demo - in production use AWS SDK)
    const payload = {
      Image: {
        Bytes: base64Image
      },
      Features: ['TEXT']
    };

    console.log('🌐 Sending request to AWS Rekognition API...');
    
    // Note: This is a simplified implementation
    // In production, you should use AWS SDK for proper authentication
    const response = await fetch(`https://rekognition.${awsRegion}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'RekognitionService.DetectText',
        // AWS signature headers would go here
      },
      body: JSON.stringify(payload)
    });

    const responseTime = performance.now() - startTime;
    console.log(`⚡ AWS API response received in ${responseTime.toFixed(1)}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AWS API request failed: ${response.status}`);
      throw new Error(`AWS API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📋 AWS Rekognition API response:', data);

    const detections: PlateDetection[] = [];

    if (data.TextDetections) {
      for (const textDetection of data.TextDetections) {
        if (textDetection.Type === 'LINE' && isLicensePlateText(textDetection.DetectedText)) {
          const geometry = textDetection.Geometry.BoundingBox;
          
          const x = geometry.Left * img.naturalWidth;
          const y = geometry.Top * img.naturalHeight;
          const width = geometry.Width * img.naturalWidth;
          const height = geometry.Height * img.naturalHeight;
          const aspectRatio = width / height;

          if (aspectRatio >= 2.0 && aspectRatio <= 6.0 && width >= 50 && height >= 15) {
            detections.push({
              x: Math.round(x),
              y: Math.round(y),
              width: Math.round(width),
              height: Math.round(height),
              confidence: textDetection.Confidence / 100,
              method: 'aws-rekognition-api',
              angle: 0,
              textScore: textDetection.Confidence / 100,
              geometryScore: textDetection.Confidence / 100,
              plateText: textDetection.DetectedText,
              ocrConfidence: textDetection.Confidence
            });

            console.log(`  Plate found: "${textDetection.DetectedText}" confidence: ${textDetection.Confidence.toFixed(1)}%`);
          }
        }
      }
    }

    const totalTime = performance.now() - startTime;
    console.log(`✅ AWS Rekognition API detection complete in ${totalTime.toFixed(1)}ms: ${detections.length} plates`);
    return detections;

  } catch (error) {
    console.error('❌ AWS Rekognition API error:', error);
    return [];
  }
}

export async function performOpenALPRDetection(
  img: HTMLImageElement,
  openALPRApiKey: string
): Promise<PlateDetection[]> {
  console.log('🔓 OPENALPR API Detection Starting...');
  console.log(`Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
  
  if (!openALPRApiKey || openALPRApiKey.trim() === '') {
    console.error('❌ OpenALPR API key is not set.');
    return [];
  }

  const startTime = performance.now();

  try {
    // Create canvas and optimize image
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    context.drawImage(img, 0, 0);

    // Convert to base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    console.log('🌐 Sending request to OpenALPR API...');
    const response = await fetch('https://api.openalpr.com/v2/recognize_bytes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_bytes: base64Image,
        secret_key: openALPRApiKey,
        country: 'au',
        recognize_vehicle: 0,
        return_image: 0,
        topn: 10
      })
    });

    const responseTime = performance.now() - startTime;
    console.log(`⚡ OpenALPR API response received in ${responseTime.toFixed(1)}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenALPR API request failed: ${response.status}`);
      throw new Error(`OpenALPR API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📋 OpenALPR API response:', data);

    if (!data.results || !Array.isArray(data.results)) {
      console.log('⚠️ No results found in OpenALPR response');
      return [];
    }

    console.log(`🎉 OpenALPR found ${data.results.length} license plate(s)`);

    const detections = data.results.map((result: any, index: number) => {
      const coords = result.coordinates;
      const minX = Math.min(...coords.map((c: any) => c.x));
      const maxX = Math.max(...coords.map((c: any) => c.x));
      const minY = Math.min(...coords.map((c: any) => c.y));
      const maxY = Math.max(...coords.map((c: any) => c.y));

      const detection = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        confidence: result.confidence / 100,
        method: 'openalpr-api',
        angle: 0,
        textScore: result.confidence / 100,
        geometryScore: result.confidence / 100,
        plateText: result.plate,
        ocrConfidence: result.confidence
      };

      console.log(`  Plate ${index + 1}: "${result.plate}" confidence: ${result.confidence.toFixed(1)}%`);
      return detection;
    });

    const totalTime = performance.now() - startTime;
    console.log(`✅ OpenALPR API detection complete in ${totalTime.toFixed(1)}ms`);
    return detections;

  } catch (error) {
    console.error('❌ OpenALPR API error:', error);
    return [];
  }
}

export async function performPlateRecognizerDetection(
  img: HTMLImageElement,
  plateRecognizerApiKey: string
): Promise<PlateDetection[]> {
  console.log('📸 PLATE RECOGNIZER API Detection Starting...');
  console.log(`Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
  
  if (!plateRecognizerApiKey || plateRecognizerApiKey.trim() === '') {
    console.error('❌ Plate Recognizer API key is not set.');
    console.log('💡 Please enter your API key in the settings panel.');
    return [];
  }

  const startTime = performance.now();

  try {
    // Create canvas and optimize image for API
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    // Optimize image size for API (max 1920px on longest side)
    const maxSize = 1920;
    let canvasWidth = img.naturalWidth;
    let canvasHeight = img.naturalHeight;
    
    if (canvasWidth > maxSize || canvasHeight > maxSize) {
      const scale = maxSize / Math.max(canvasWidth, canvasHeight);
      canvasWidth = Math.floor(canvasWidth * scale);
      canvasHeight = Math.floor(canvasHeight * scale);
      console.log(`📏 Resizing image from ${img.naturalWidth}x${img.naturalHeight} to ${canvasWidth}x${canvasHeight}`);
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    context.drawImage(img, 0, 0, canvasWidth, canvasHeight);

    // Convert to blob with optimized quality
    console.log('🔄 Converting image to blob...');
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.85);
    });

    console.log(`📦 Image blob size: ${(blob.size / 1024).toFixed(1)}KB`);

    // Prepare form data with Australian-specific settings
    const formData = new FormData();
    formData.append('upload', blob, 'image.jpg');
    formData.append('regions', 'au'); // Australian region
    formData.append('camera_id', 'web-app');
    formData.append('config', JSON.stringify({
      region: 'strict',
      mode: 'fast'
    }));

    console.log('🌐 Sending request to Plate Recognizer API...');
    const response = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${plateRecognizerApiKey}`,
      },
      body: formData,
    });

    const responseTime = performance.now() - startTime;
    console.log(`⚡ API response received in ${responseTime.toFixed(1)}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      console.error('Error details:', errorText);
      
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your Plate Recognizer API key.');
      } else if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    console.log('📋 Plate Recognizer API response:', data);

    if (!data.results || !Array.isArray(data.results)) {
      console.log('⚠️ No results found in API response');
      return [];
    }

    console.log(`🎉 Found ${data.results.length} license plate(s)`);

    // Scale coordinates back to original image size if we resized
    const scaleX = img.naturalWidth / canvasWidth;
    const scaleY = img.naturalHeight / canvasHeight;

    const detections = data.results.map((result: any, index: number) => {
      const detection = {
        x: Math.round(result.box.xmin * scaleX),
        y: Math.round(result.box.ymin * scaleY),
        width: Math.round((result.box.xmax - result.box.xmin) * scaleX),
        height: Math.round((result.box.ymax - result.box.ymin) * scaleY),
        confidence: result.score,
        method: 'plate-recognizer-api',
        angle: 0,
        textScore: result.score,
        geometryScore: result.score,
        plateText: result.plate,
        ocrConfidence: result.score * 100
      };

      console.log(`  Plate ${index + 1}: "${result.plate}" at [${detection.x}, ${detection.y}, ${detection.width}, ${detection.height}] confidence: ${(result.score * 100).toFixed(1)}%`);
      
      return detection;
    });

    const totalTime = performance.now() - startTime;
    console.log(`✅ Plate Recognizer API detection complete in ${totalTime.toFixed(1)}ms`);

    return detections;

  } catch (error) {
    const totalTime = performance.now() - startTime;
    console.error(`❌ Plate Recognizer API error after ${totalTime.toFixed(1)}ms:`, error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    
    return [];
  }
}

export async function performRobustMultiMethodDetection(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('💪 IMPROVED Robust Multi-Method Detection Starting...');
  
  // Use only the most effective methods to avoid noise
  const methods = [
    () => performSimpleEffectiveDetection(img, canvas),
    () => performPracticalColorDetection(img, canvas),
    () => performEnhancedEdgeDetection(img, canvas)
  ];
  
  const allDetections: PlateDetection[] = [];
  
  // Run methods sequentially and collect results
  for (let i = 0; i < methods.length; i++) {
    try {
      console.log(`🔍 Running detection method ${i + 1}/${methods.length}...`);
      const detections = await methods[i]();
      console.log(`✅ Method ${i + 1} found ${detections.length} candidates`);
      allDetections.push(...detections);
      
      // If we found good candidates early, we can be less aggressive with later methods
      if (allDetections.filter(d => d.confidence > 0.7).length >= 2) {
        console.log('🎯 Found high-confidence candidates, stopping early to avoid false positives');
        break;
      }
    } catch (error) {
      console.warn(`⚠️ Detection method ${i + 1} failed:`, error);
    }
  }
  
  console.log(`📊 Robust detection collected ${allDetections.length} raw candidates`);
  
  // Improved filtering and combination
  return improvedCombineAndFilter(allDetections);
}

// New practical color detection specifically for license plates
export async function performPracticalColorDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🎨 Practical Color Detection for License Plates');
  let src: any, hsv: any, lab: any;
  const candidates: PlateDetection[] = [];
  
  try {
    src = cv.imread(img);
    hsv = new cv.Mat();
    lab = new cv.Mat();
    
    cv.cvtColor(src, hsv, cv.COLOR_RGB2HSV);
    cv.cvtColor(src, lab, cv.COLOR_RGB2Lab);
    
    // Australian license plate color profiles (much broader ranges)
    const colorProfiles = [
      {
        name: 'white_background',
        hsvLower: [0, 0, 160],
        hsvUpper: [180, 40, 255],
        weight: 0.8
      },
      {
        name: 'green_on_white',
        hsvLower: [35, 30, 100],
        hsvUpper: [95, 255, 255],
        weight: 0.7
      },
      {
        name: 'bright_colors',
        hsvLower: [0, 0, 180],
        hsvUpper: [180, 80, 255],
        weight: 0.6
      }
    ];
    
    for (const profile of colorProfiles) {
      const lowerBound = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), profile.hsvLower);
      const upperBound = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), profile.hsvUpper);
      const mask = new cv.Mat();
      
      cv.inRange(hsv, lowerBound, upperBound, mask);
      
      // Clean up the mask
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);
      cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);
      
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        const area = cv.contourArea(contour);
        
        const aspectRatio = rect.width / rect.height;
        const imageArea = img.naturalWidth * img.naturalHeight;
        const relativeArea = area / imageArea;

        // Relaxed criteria for color-based detection
        if (aspectRatio >= 1.8 && aspectRatio <= 6.5 &&
            relativeArea >= 0.0005 && relativeArea <= 0.06 &&
            rect.width >= 40 && rect.height >= 12) {
          
          let confidence = 0.4 * profile.weight;
          
          // Bonus for good aspect ratio
          if (aspectRatio >= 2.0 && aspectRatio <= 5.0) confidence += 0.2;
          
          // Bonus for reasonable size
          if (relativeArea >= 0.001 && relativeArea <= 0.03) confidence += 0.15;
          
          candidates.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            confidence: Math.min(confidence, 0.9),
            method: `color-${profile.name}`,
            angle: 0,
            textScore: 0.5,
            geometryScore: confidence
          });
        }
        contour.delete();
      }
      
      // Cleanup
      lowerBound.delete();
      upperBound.delete();
      mask.delete();
      kernel.delete();
      contours.delete();
      hierarchy.delete();
    }
    
  } catch (err) {
    console.error('Practical color detection error:', err);
  } finally {
    src?.delete();
    hsv?.delete();
    lab?.delete();
  }
  
  console.log(`✅ Practical color detection found ${candidates.length} candidates`);
  return candidates;
}

// Enhanced edge detection with better parameters
export async function performEnhancedEdgeDetection(img: HTMLImageElement, canvas: HTMLCanvasElement): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('⚡ Enhanced Edge Detection');
  const detections: PlateDetection[] = [];
  let src: any, gray: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Apply adaptive histogram equalization for better contrast
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
    const enhanced = new cv.Mat();
    clahe.apply(gray, enhanced);
    
    // Multiple edge detection approaches
    const edgeParams = [
      { blur: 3, low: 40, high: 120, name: 'sharp' },
      { blur: 5, low: 25, high: 100, name: 'balanced' }
    ];
    
    for (const params of edgeParams) {
      const blurred = new cv.Mat();
      cv.GaussianBlur(enhanced, blurred, new cv.Size(params.blur, params.blur), 0);
      
      const edges = new cv.Mat();
      cv.Canny(blurred, edges, params.low, params.high);
      
      // Morphological operations to connect text elements
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(10, 2));
      const morphed = new cv.Mat();
      cv.morphologyEx(edges, morphed, cv.MORPH_CLOSE, kernel);
      
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
        
        // Balanced criteria
        if (aspectRatio >= 1.9 && aspectRatio <= 6.0 &&
            relativeArea >= 0.0008 && relativeArea <= 0.05 &&
            rect.width >= 45 && rect.height >= 15 &&
            rect.width <= 500 && rect.height <= 200) {
          
          let confidence = 0.45;
          
          // Aspect ratio scoring
          if (aspectRatio >= 2.2 && aspectRatio <= 4.5) confidence += 0.2;
          
          // Size scoring
          if (relativeArea >= 0.002 && relativeArea <= 0.025) confidence += 0.15;
          
          // Edge density check
          const roiEdges = edges.roi(new cv.Rect(rect.x, rect.y, rect.width, rect.height));
          const edgePixels = cv.countNonZero(roiEdges);
          const totalPixels = rect.width * rect.height;
          const edgeDensity = edgePixels / totalPixels;
          
          if (edgeDensity > 0.08 && edgeDensity < 0.4) confidence += 0.1;
          
          roiEdges.delete();
          
          if (confidence >= 0.5) {
            detections.push({
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              confidence: Math.min(confidence, 0.9),
              method: `enhanced-edge-${params.name}`,
              angle: 0,
              textScore: edgeDensity,
              geometryScore: confidence
            });
          }
        }
        
        contour.delete();
      }
      
      // Cleanup
      blurred.delete();
      edges.delete();
      kernel.delete();
      morphed.delete();
      contours.delete();
      hierarchy.delete();
    }
    
    enhanced.delete();
    clahe.delete();
    
  } catch (err) {
    console.error('Enhanced edge detection error:', err);
  } finally {
    src?.delete();
    gray?.delete();
  }
  
  console.log(`✅ Enhanced edge detection found ${detections.length} candidates`);
  return detections;
}

// Improved combination and filtering
export function improvedCombineAndFilter(detections: PlateDetection[]): PlateDetection[] {
  if (detections.length === 0) return [];
  
  console.log('🔧 Improved combination and filtering...');
  
  // Step 1: Remove very low confidence detections
  let filtered = detections.filter(d => d.confidence >= 0.35);
  console.log(`📊 After confidence filter: ${filtered.length}/${detections.length} candidates`);
  
  // Step 2: Remove overlapping detections with improved logic
  filtered = improvedOverlapRemoval(filtered);
  console.log(`📊 After overlap removal: ${filtered.length} candidates`);
  
  // Step 3: Sort by confidence and limit results
  filtered.sort((a, b) => b.confidence - a.confidence);
  const finalResults = filtered.slice(0, 3); // Limit to top 3 to avoid false positives
  
  console.log(`✅ Final results: ${finalResults.length} license plates detected`);
  return finalResults;
}

// Improved overlap removal with better IoU handling
export function improvedOverlapRemoval(detections: PlateDetection[]): PlateDetection[] {
  if (detections.length <= 1) return detections;
  
  const result: PlateDetection[] = [];
  const used = new Set<number>();
  
  // Sort by confidence (highest first)
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  
  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    
    const current = sorted[i];
    result.push(current);
    used.add(i);
    
    // Mark overlapping detections as used
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      
      const candidate = sorted[j];
      const iou = calculateIoU(
        [current.x, current.y, current.width, current.height],
        [candidate.x, candidate.y, candidate.width, candidate.height]
      );
      
      // More sophisticated overlap handling
      if (iou > 0.25) { // Lower threshold for more aggressive removal
        // If the overlapping detection has significantly higher confidence, keep it instead
        if (candidate.confidence > current.confidence * 1.3) {
          // Remove current from result and add candidate
          result.pop();
          result.push(candidate);
          used.delete(i);
          used.add(j);
          break;
        } else {
          used.add(j);
        }
      }
    }
  }
  
  return result;
}

export async function performSimpleEffectiveDetection(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  if (typeof cv === 'undefined') return [];
  
  console.log('🎯 IMPROVED Simple Effective Detection');
  const detections: PlateDetection[] = [];
  let src: any, gray: any, edges: any, contours: any, hierarchy: any;
  
  try {
    src = cv.imread(img);
    gray = new cv.Mat();
    edges = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    
    // Apply histogram equalization for better contrast
    const enhanced = new cv.Mat();
    cv.equalizeHist(gray, enhanced);
    
    // Use multiple Canny thresholds for better detection
    const cannyParams = [
      { low: 30, high: 100 },
      { low: 50, high: 150 },
      { low: 20, high: 80 }
    ];
    
    for (const params of cannyParams) {
      const currentEdges = new cv.Mat();
      cv.Canny(enhanced, currentEdges, params.low, params.high);
      
      // Morphological operations to connect text elements
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(12, 3));
      const morphed = new cv.Mat();
      cv.morphologyEx(currentEdges, morphed, cv.MORPH_CLOSE, kernel);
      
      const currentContours = new cv.MatVector();
      const currentHierarchy = new cv.Mat();
      cv.findContours(morphed, currentContours, currentHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      for (let i = 0; i < currentContours.size(); i++) {
        const contour = currentContours.get(i);
        const rect = cv.boundingRect(contour);
        
        const aspectRatio = rect.width / rect.height;
        const area = rect.width * rect.height;
        const imageArea = img.naturalWidth * img.naturalHeight;
        const relativeArea = area / imageArea;
        
        // RELAXED conditions for better detection
        const isPlateAspectRatio = aspectRatio >= 1.8 && aspectRatio <= 6.5;
        const isReasonableSize = relativeArea >= 0.0005 && relativeArea <= 0.06;
        const isMinimumDimensions = rect.width >= 50 && rect.height >= 15;
        const isMaximumDimensions = rect.width <= 600 && rect.height <= 250;
        const isNotAtEdges = rect.y >= img.naturalHeight * 0.01 && 
                            rect.y <= img.naturalHeight * 0.99 &&
                            rect.x >= img.naturalWidth * 0.01 &&
                            rect.x <= img.naturalWidth * 0.99;
        
        if (isPlateAspectRatio && isReasonableSize && isMinimumDimensions && 
            isMaximumDimensions && isNotAtEdges) {
          
          let confidence = 0.4; // Lower base confidence
          
          // Aspect ratio bonus
          if (aspectRatio >= 2.0 && aspectRatio <= 5.0) confidence += 0.2;
          if (aspectRatio >= 2.5 && aspectRatio <= 4.0) confidence += 0.1;
          
          // Size bonus
          if (relativeArea >= 0.001 && relativeArea <= 0.03) confidence += 0.15;
          
          // Position bonus
          const verticalPos = (rect.y + rect.height / 2) / img.naturalHeight;
          if (verticalPos >= 0.1 && verticalPos <= 0.9) confidence += 0.1;
          
          // Edge density check
          const roiEdges = currentEdges.roi(new cv.Rect(rect.x, rect.y, rect.width, rect.height));
          const edgePixels = cv.countNonZero(roiEdges);
          const totalPixels = rect.width * rect.height;
          const edgeDensity = edgePixels / totalPixels;
          
          if (edgeDensity > 0.05 && edgeDensity < 0.5) confidence += 0.1;
          
          roiEdges.delete();
          
          // MUCH LOWER threshold for acceptance
          if (confidence >= 0.5) {
            detections.push({
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              confidence: Math.min(confidence, 0.95),
              method: `simple-effective-${params.low}`,
              angle: 0,
              textScore: edgeDensity,
              geometryScore: confidence
            });
          }
        }
        
        contour.delete();
      }
      
      // Cleanup
      currentEdges.delete();
      kernel.delete();
      morphed.delete();
      currentContours.delete();
      currentHierarchy.delete();
    }
    
    enhanced.delete();
    console.log(`✅ Simple effective detection: ${detections.length} candidates found`);
    
  } catch (err) {
    console.error('Simple effective detection error:', err);
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
  
  console.log('🔧 Combining and filtering detections...');
  
  // Remove very low confidence detections
  let filtered = detections.filter(d => d.confidence >= 0.3);
  console.log(`📊 After confidence filter (≥0.3): ${filtered.length}/${detections.length}`);
  
  // Remove overlapping detections
  filtered = removeOverlappingDetections(filtered);
  console.log(`📊 After overlap removal: ${filtered.length} detections`);
  
  // Sort by confidence
  filtered.sort((a, b) => b.confidence - a.confidence);
  
  // Limit to top 3 detections to avoid false positives
  const finalResults = filtered.slice(0, 3);
  console.log(`✅ Final filtered results: ${finalResults.length} detections`);
  
  return finalResults;
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