// License Plate Validator - Advanced Validation System
// This module provides comprehensive validation to eliminate false positives

import { PlateDetection } from '../types';

declare var cv: any;

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reasons: string[];
  scores: {
    position: number;
    content: number;
    context: number;
    geometry: number;
  };
}

export async function validatePlateDetection(
  candidate: PlateDetection,
  img: HTMLImageElement
): Promise<ValidationResult> {
  console.log(`🔍 Validating candidate at [${candidate.x}, ${candidate.y}, ${candidate.width}, ${candidate.height}]`);
  
  const reasons: string[] = [];
  const scores = {
    position: 0,
    content: 0,
    context: 0,
    geometry: 0
  };
  
  try {
    // Test 1: Position Validation (车牌位置合理性)
    const positionResult = validatePosition(candidate, img);
    scores.position = positionResult.score;
    if (!positionResult.valid) {
      reasons.push(`Position invalid: ${positionResult.reason}`);
    }
    
    // Test 2: Geometry Validation (几何形状验证)
    const geometryResult = validateGeometry(candidate, img);
    scores.geometry = geometryResult.score;
    if (!geometryResult.valid) {
      reasons.push(`Geometry invalid: ${geometryResult.reason}`);
    }
    
    // Test 3: Content Validation (内容验证)
    const contentResult = await validateContent(candidate, img);
    scores.content = contentResult.score;
    if (!contentResult.valid) {
      reasons.push(`Content invalid: ${contentResult.reason}`);
    }
    
    // Test 4: Context Validation (上下文验证)
    const contextResult = await validateContext(candidate, img);
    scores.context = contextResult.score;
    if (!contextResult.valid) {
      reasons.push(`Context invalid: ${contextResult.reason}`);
    }
    
    // Calculate overall confidence
    const overallConfidence = (
      scores.position * 0.3 +
      scores.content * 0.3 +
      scores.context * 0.25 +
      scores.geometry * 0.15
    );
    
    // Determine if valid (需要通过多项测试)
    const isValid = 
      scores.position >= 0.6 &&
      scores.content >= 0.4 &&
      scores.context >= 0.3 &&
      scores.geometry >= 0.5 &&
      overallConfidence >= 0.5;
    
    console.log(`Validation result: ${isValid ? '✅ VALID' : '❌ INVALID'} (confidence: ${(overallConfidence * 100).toFixed(1)}%)`);
    if (!isValid) {
      console.log(`Rejection reasons: ${reasons.join(', ')}`);
    }
    
    return {
      isValid,
      confidence: overallConfidence,
      reasons,
      scores
    };
    
  } catch (err) {
    console.error('Validation error:', err);
    return {
      isValid: false,
      confidence: 0,
      reasons: ['Validation failed due to error'],
      scores
    };
  }
}

// 位置验证：车牌不应该在天空中
function validatePosition(candidate: PlateDetection, img: HTMLImageElement): { valid: boolean; score: number; reason: string } {
  const centerY = candidate.y + candidate.height / 2;
  const relativeY = centerY / img.naturalHeight;
  const centerX = candidate.x + candidate.width / 2;
  const relativeX = centerX / img.naturalWidth;
  
  // 车牌通常在图像的中下部分
  if (relativeY < 0.25) {
    return { valid: false, score: 0.1, reason: `Too high in image (${(relativeY * 100).toFixed(1)}% from top)` };
  }
  
  if (relativeY > 0.95) {
    return { valid: false, score: 0.2, reason: `Too low in image (${(relativeY * 100).toFixed(1)}% from top)` };
  }
  
  // 不应该在图像边缘
  if (relativeX < 0.05 || relativeX > 0.95) {
    return { valid: false, score: 0.3, reason: `Too close to image edge (${(relativeX * 100).toFixed(1)}% from left)` };
  }
  
  // 计算位置得分
  let score = 1.0;
  
  // 理想位置是图像的中下部分 (40%-80%)
  if (relativeY >= 0.4 && relativeY <= 0.8) {
    score = 1.0;
  } else if (relativeY >= 0.25 && relativeY <= 0.95) {
    score = 0.8;
  } else {
    score = 0.6;
  }
  
  return { valid: true, score, reason: 'Position acceptable' };
}

// 几何验证：车牌的形状特征
function validateGeometry(candidate: PlateDetection, img: HTMLImageElement): { valid: boolean; score: number; reason: string } {
  const aspectRatio = candidate.width / candidate.height;
  const area = candidate.width * candidate.height;
  const imageArea = img.naturalWidth * img.naturalHeight;
  const relativeArea = area / imageArea;
  
  // 长宽比验证
  if (aspectRatio < 1.8 || aspectRatio > 6.5) {
    return { 
      valid: false, 
      score: 0.2, 
      reason: `Invalid aspect ratio: ${aspectRatio.toFixed(2)} (expected 1.8-6.5)` 
    };
  }
  
  // 相对面积验证
  if (relativeArea < 0.0003 || relativeArea > 0.03) {
    return { 
      valid: false, 
      score: 0.3, 
      reason: `Invalid relative area: ${(relativeArea * 100).toFixed(3)}% (expected 0.03%-3%)` 
    };
  }
  
  // 绝对尺寸验证
  if (candidate.width < 40 || candidate.height < 12) {
    return { 
      valid: false, 
      score: 0.1, 
      reason: `Too small: ${candidate.width}x${candidate.height} (min 40x12)` 
    };
  }
  
  if (candidate.width > 500 || candidate.height > 150) {
    return { 
      valid: false, 
      score: 0.2, 
      reason: `Too large: ${candidate.width}x${candidate.height} (max 500x150)` 
    };
  }
  
  // 计算几何得分
  let score = 0.5;
  
  // 理想长宽比 2.5-4.5
  if (aspectRatio >= 2.5 && aspectRatio <= 4.5) {
    score += 0.3;
  } else if (aspectRatio >= 2.0 && aspectRatio <= 5.5) {
    score += 0.2;
  } else {
    score += 0.1;
  }
  
  // 理想相对面积 0.001-0.015
  if (relativeArea >= 0.001 && relativeArea <= 0.015) {
    score += 0.2;
  } else if (relativeArea >= 0.0005 && relativeArea <= 0.025) {
    score += 0.1;
  }
  
  return { valid: true, score: Math.min(score, 1.0), reason: 'Geometry acceptable' };
}

// 内容验证：检查是否包含文本特征
async function validateContent(candidate: PlateDetection, img: HTMLImageElement): Promise<{ valid: boolean; score: number; reason: string }> {
  if (typeof cv === 'undefined') {
    return { valid: true, score: 0.5, reason: 'OpenCV not available, skipping content validation' };
  }
  
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    
    const src = cv.imread(canvas);
    const roi = src.roi(new cv.Rect(candidate.x, candidate.y, candidate.width, candidate.height));
    const gray = new cv.Mat();
    const binary = new cv.Mat();
    
    cv.cvtColor(roi, gray, cv.COLOR_RGB2GRAY);
    
    // 多种二值化方法
    const binaryMethods = [
      () => cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU),
      () => cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2)
    ];
    
    let bestCharacterCount = 0;
    let bestEdgeDensity = 0;
    
    for (const method of binaryMethods) {
      method();
      
      // 字符检测
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      let characterLikeShapes = 0;
      const roiArea = candidate.width * candidate.height;
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        const rect = cv.boundingRect(contour);
        
        const aspectRatio = rect.width / rect.height;
        const relativeArea = area / roiArea;
        
        // 字符特征检测
        if (aspectRatio >= 0.2 && aspectRatio <= 2.5 &&
            relativeArea >= 0.01 && relativeArea <= 0.4 &&
            rect.width >= 3 && rect.height >= 6) {
          characterLikeShapes++;
        }
        
        contour.delete();
      }
      
      bestCharacterCount = Math.max(bestCharacterCount, characterLikeShapes);
      contours.delete();
      hierarchy.delete();
      
      // 边缘密度检测
      const edges = new cv.Mat();
      cv.Canny(gray, edges, 50, 150);
      const edgePixels = cv.countNonZero(edges);
      const totalPixels = roi.rows * roi.cols;
      const edgeDensity = edgePixels / totalPixels;
      bestEdgeDensity = Math.max(bestEdgeDensity, edgeDensity);
      edges.delete();
    }
    
    // 清理
    src.delete();
    roi.delete();
    gray.delete();
    binary.delete();
    
    // 内容验证
    if (bestCharacterCount < 2) {
      return { 
        valid: false, 
        score: 0.2, 
        reason: `Too few character-like shapes: ${bestCharacterCount} (expected ≥2)` 
      };
    }
    
    if (bestCharacterCount > 10) {
      return { 
        valid: false, 
        score: 0.3, 
        reason: `Too many character-like shapes: ${bestCharacterCount} (expected ≤10)` 
      };
    }
    
    if (bestEdgeDensity < 0.08) {
      return { 
        valid: false, 
        score: 0.1, 
        reason: `Edge density too low: ${(bestEdgeDensity * 100).toFixed(1)}% (expected ≥8%)` 
      };
    }
    
    if (bestEdgeDensity > 0.6) {
      return { 
        valid: false, 
        score: 0.2, 
        reason: `Edge density too high: ${(bestEdgeDensity * 100).toFixed(1)}% (expected ≤60%)` 
      };
    }
    
    // 计算内容得分
    let score = 0.3;
    
    // 字符数量得分
    if (bestCharacterCount >= 3 && bestCharacterCount <= 8) {
      score += 0.4;
    } else if (bestCharacterCount >= 2 && bestCharacterCount <= 10) {
      score += 0.2;
    }
    
    // 边缘密度得分
    if (bestEdgeDensity >= 0.1 && bestEdgeDensity <= 0.4) {
      score += 0.3;
    } else if (bestEdgeDensity >= 0.08 && bestEdgeDensity <= 0.6) {
      score += 0.1;
    }
    
    return { valid: true, score: Math.min(score, 1.0), reason: 'Content validation passed' };
    
  } catch (err) {
    console.warn('Content validation error:', err);
    return { valid: true, score: 0.4, reason: 'Content validation failed, defaulting to pass' };
  }
}

// 上下文验证：检查周围环境
async function validateContext(candidate: PlateDetection, img: HTMLImageElement): Promise<{ valid: boolean; score: number; reason: string }> {
  if (typeof cv === 'undefined') {
    return { valid: true, score: 0.5, reason: 'OpenCV not available, skipping context validation' };
  }
  
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    
    const src = cv.imread(canvas);
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGB2GRAY);
    
    // 检查候选区域周围的环境
    const expandFactor = 2.0;
    const expandedX = Math.max(0, candidate.x - candidate.width * expandFactor);
    const expandedY = Math.max(0, candidate.y - candidate.height * expandFactor);
    const expandedWidth = Math.min(img.naturalWidth - expandedX, candidate.width * (1 + 2 * expandFactor));
    const expandedHeight = Math.min(img.naturalHeight - expandedY, candidate.height * (1 + 2 * expandFactor));
    
    const contextRoi = gray.roi(new cv.Rect(expandedX, expandedY, expandedWidth, expandedHeight));
    
    // 检查上下文的边缘密度
    const edges = new cv.Mat();
    cv.Canny(contextRoi, edges, 30, 90);
    
    const edgePixels = cv.countNonZero(edges);
    const totalPixels = contextRoi.rows * contextRoi.cols;
    const contextEdgeDensity = edgePixels / totalPixels;
    
    // 检查颜色变化
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    cv.meanStdDev(contextRoi, mean, stddev);
    const colorVariation = stddev.data64F[0];
    
    // 清理
    src.delete();
    gray.delete();
    contextRoi.delete();
    edges.delete();
    mean.delete();
    stddev.delete();
    
    // 上下文验证
    if (contextEdgeDensity < 0.02) {
      return { 
        valid: false, 
        score: 0.1, 
        reason: `Context too uniform: ${(contextEdgeDensity * 100).toFixed(2)}% edge density (expected ≥2%)` 
      };
    }
    
    if (colorVariation < 10) {
      return { 
        valid: false, 
        score: 0.2, 
        reason: `Context too monotone: ${colorVariation.toFixed(1)} color variation (expected ≥10)` 
      };
    }
    
    // 计算上下文得分
    let score = 0.4;
    
    // 边缘密度得分
    if (contextEdgeDensity >= 0.03 && contextEdgeDensity <= 0.15) {
      score += 0.3;
    } else if (contextEdgeDensity >= 0.02 && contextEdgeDensity <= 0.25) {
      score += 0.2;
    }
    
    // 颜色变化得分
    if (colorVariation >= 15 && colorVariation <= 60) {
      score += 0.3;
    } else if (colorVariation >= 10 && colorVariation <= 80) {
      score += 0.2;
    }
    
    return { valid: true, score: Math.min(score, 1.0), reason: 'Context validation passed' };
    
  } catch (err) {
    console.warn('Context validation error:', err);
    return { valid: true, score: 0.4, reason: 'Context validation failed, defaulting to pass' };
  }
}

// 批量验证多个候选
export async function validateMultiplePlates(
  candidates: PlateDetection[],
  img: HTMLImageElement
): Promise<PlateDetection[]> {
  console.log(`🔍 Validating ${candidates.length} plate candidates...`);
  
  const validatedPlates: PlateDetection[] = [];
  
  for (const candidate of candidates) {
    const validation = await validatePlateDetection(candidate, img);
    
    if (validation.isValid) {
      // 更新置信度
      const enhancedCandidate = {
        ...candidate,
        confidence: validation.confidence,
        method: candidate.method + '_validated'
      };
      validatedPlates.push(enhancedCandidate);
      console.log(`✅ Candidate PASSED validation with ${(validation.confidence * 100).toFixed(1)}% confidence`);
    } else {
      console.log(`❌ Candidate FAILED validation: ${validation.reasons.join(', ')}`);
    }
  }
  
  console.log(`🎯 Validation complete: ${validatedPlates.length}/${candidates.length} candidates passed`);
  return validatedPlates;
}