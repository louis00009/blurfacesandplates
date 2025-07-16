// Script to download YOLOv8n ONNX model for license plate detection
// This script can be run to download the actual YOLO model

const MODEL_URLS = {
  // YOLOv8n general object detection model (can detect vehicles)
  yolov8n: 'https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx',
  
  // Alternative sources
  yolov8n_alt: 'https://huggingface.co/Ultralytics/YOLOv8/resolve/main/yolov8n.onnx',
  
  // Custom license plate model (if available)
  yolov8n_plates: 'https://github.com/RizwanMunawar/yolov8-object-tracking/releases/download/v8.0.0/yolov8n.onnx'
};

async function downloadModel(url, filename) {
  console.log(`Downloading ${filename} from ${url}...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    
    // In a real implementation, you would save this to the file system
    // For now, we'll just log the success
    console.log(`✅ Successfully downloaded ${filename} (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
    
    return arrayBuffer;
    
  } catch (error) {
    console.error(`❌ Failed to download ${filename}:`, error);
    throw error;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { downloadModel, MODEL_URLS };
}

// If running in browser, attach to window
if (typeof window !== 'undefined') {
  window.YOLODownloader = { downloadModel, MODEL_URLS };
}

console.log('YOLO Model Downloader initialized');
console.log('Available models:', Object.keys(MODEL_URLS));