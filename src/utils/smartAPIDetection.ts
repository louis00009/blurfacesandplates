// Smart API Detection - 智能API调用和管理
import { PlateDetection } from '../types';
import { apiManager } from './apiManager';
import { 
  performPlateRecognizerDetection,
  performOpenALPRDetection,
  performGoogleVisionDetection,
  performAzureVisionDetection,
  performAWSRekognitionDetection
} from './licenseParseDetection';

// API回调函数映射
const API_CALLBACKS: Record<string, (img: HTMLImageElement, apiKey: string) => Promise<PlateDetection[]>> = {
  platerecognizer: performPlateRecognizerDetection,
  openalpr: performOpenALPRDetection,
  googlevision: performGoogleVisionDetection,
  azure: (img: HTMLImageElement, apiKey: string) => 
    performAzureVisionDetection(img, apiKey, 'https://your-resource.cognitiveservices.azure.com'),
  aws: (img: HTMLImageElement, apiKey: string) => 
    performAWSRekognitionDetection(img, apiKey, 'your-secret-key', 'us-east-1')
};

// 智能API检测 - 主要入口点
export async function performSmartAPIDetection(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  console.log('🤖 Smart API Detection Starting...');
  console.log(`Image dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
  
  const startTime = performance.now();
  
  try {
    // 使用API管理器进行智能API调用
    const result = await apiManager.callAPI(img, API_CALLBACKS);
    
    const totalTime = performance.now() - startTime;
    
    if (result.apiUsed) {
      console.log(`✅ Smart API detection complete using ${result.apiUsed} in ${totalTime.toFixed(1)}ms`);
      console.log(`🎉 Found ${result.detections.length} license plates`);
      
      // 记录检测结果详情
      result.detections.forEach((detection, index) => {
        console.log(`  Plate ${index + 1}: "${detection.plateText || 'N/A'}" at [${detection.x}, ${detection.y}, ${detection.width}, ${detection.height}] confidence: ${(detection.confidence * 100).toFixed(1)}%`);
      });
      
      return result.detections;
    } else {
      // 所有API都失败，使用本地检测
      console.log('🔄 All APIs failed, falling back to local detection...');
      return await performLocalFallbackDetection(img, canvas);
    }
    
  } catch (error) {
    console.error('❌ Smart API detection error:', error);
    
    // 如果API管理器完全失败，使用本地检测
    console.log('🔄 API manager failed, using local detection...');
    return await performLocalFallbackDetection(img, canvas);
  }
}

// 本地回退检测
async function performLocalFallbackDetection(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): Promise<PlateDetection[]> {
  console.log('🏠 Starting local fallback detection...');
  
  try {
    // 尝试使用最好的本地检测方法
    const { performIntelligentPlateDetection } = await import('./intelligentPlateDetection');
    const detections = await performIntelligentPlateDetection(img, canvas);
    
    if (detections.length > 0) {
      console.log(`✅ Local intelligent detection found ${detections.length} plates`);
      return detections;
    }
    
    // 如果智能检测失败，尝试简单有效检测
    const { performSimpleEffectiveDetection } = await import('./licenseParseDetection');
    const simpleDetections = await performSimpleEffectiveDetection(img, canvas);
    
    console.log(`✅ Local simple detection found ${simpleDetections.length} plates`);
    return simpleDetections;
    
  } catch (error) {
    console.error('❌ Local fallback detection error:', error);
    return [];
  }
}

// 获取API统计信息
export function getAPIStats() {
  return apiManager.getAPIStats();
}

// 导出API管理器实例以供Admin页面使用
export { apiManager };