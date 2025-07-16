# Mosaic Blur App - 项目结构说明

## 📁 重构后的项目结构

```
src/
├── types/
│   └── index.ts                    # 类型定义
├── utils/
│   ├── licenseParseDetection.ts    # 通用车牌检测算法
│   └── australianPlateDetection.ts # 澳洲车牌专用检测算法
├── components/
│   ├── ui/
│   │   ├── ImagePreview.tsx        # 图片预览组件
│   │   ├── ImageGallery.tsx        # 图片画廊组件
│   │   └── SettingsPanel.tsx       # 设置面板组件
│   └── detection/
│       └── ImageProcessor.tsx      # 图像处理钩子
├── App.tsx                         # 主应用组件 (重构后)
├── App.old.tsx                     # 原始App组件 (备份)
└── ...

analysreport.txt                    # 算法问题分析报告
```

## 🔧 模块化说明

### 1. **类型定义 (`types/index.ts`)**
- `PlateDetection` - 车牌检测结果
- `DetectedRegion` - 检测区域
- `ProcessedImage` - 处理后的图片
- `ProcessingSettings` - 处理设置
- `AppState` - 应用状态

### 2. **车牌检测算法 (`utils/`)**

#### `licenseParseDetection.ts` - 通用检测算法
- `performPlateRecognizerDetection()` - 云端API检测
- `performRobustMultiMethodDetection()` - 多方法组合检测
- `performSimpleEffectiveDetection()` - 简单有效检测
- `performAggressiveDetection()` - 激进检测
- `combineAndFilterDetections()` - 结果合并过滤
- `removeOverlappingDetections()` - 重叠检测移除
- `calculateIoU()` - IoU计算

#### `australianPlateDetection.ts` - 澳洲专用算法
- `performAustralianPlateDetection()` - 澳洲车牌主检测 (5阶段)
- `performGeometricAnalysis()` - 几何分析
- `performAdvancedColorAnalysis()` - 颜色分析
- `performTextureAnalysis()` - 纹理分析
- `performGradientAnalysis()` - 梯度分析
- `performIntelligentFusion()` - 智能融合
- `calculateGeometricMetrics()` - 几何指标计算
- `validateColorConsistency()` - 颜色一致性验证
- `detectTextPresence()` - 文本存在检测

### 3. **UI组件 (`components/ui/`)**

#### `ImagePreview.tsx` - 图片预览
- 显示选中图片的原图/处理后对比
- 原图/处理图切换按钮
- 下载处理后图片功能
- 处理进度显示

#### `ImageGallery.tsx` - 图片画廊
- 图片缩略图网格显示
- 多选checkbox (右上角)
- 预览标识 (左上角)
- 单图处理/删除操作
- 选中状态视觉反馈

#### `SettingsPanel.tsx` - 设置面板
- 文件上传控件
- 批处理控制 (选择/清空/处理)
- 检测设置 (人脸/车牌/调试模式)
- **🎨 Highlight模式** (测试用颜色高亮)
- 检测方法选择
- 匿名化效果设置 (blur/mosaic)

### 4. **图像处理 (`components/detection/`)**

#### `ImageProcessor.tsx` - 处理钩子
- `useImageProcessor()` Hook提供处理能力
- 集成人脸检测 (face-api.js)
- 集成车牌检测算法
- 应用blur/mosaic/highlight效果
- 状态管理和错误处理

## 🎯 使用方式

### 引用算法模块
```typescript
// 引用澳洲车牌检测
import { performAustralianPlateDetection } from '../utils/australianPlateDetection';

// 引用通用检测
import { performRobustMultiMethodDetection } from '../utils/licenseParseDetection';
```

### 引用UI组件
```typescript
import ImagePreview from './components/ui/ImagePreview';
import ImageGallery from './components/ui/ImageGallery';
import SettingsPanel from './components/ui/SettingsPanel';
```

### 引用类型
```typescript
import { ProcessedImage, ProcessingSettings, PlateDetection } from './types';
```

## 🔍 问题定位

### 算法问题
- 查看 `analysreport.txt` 获取详细分析
- 澳洲车牌问题 → `utils/australianPlateDetection.ts`
- 通用检测问题 → `utils/licenseParseDetection.ts`

### UI问题
- 预览问题 → `components/ui/ImagePreview.tsx`
- 画廊问题 → `components/ui/ImageGallery.tsx`
- 设置问题 → `components/ui/SettingsPanel.tsx`

### 处理逻辑问题
- 图像处理 → `components/detection/ImageProcessor.tsx`
- 主逻辑 → `App.tsx`

## 📈 优势

1. **模块化清晰** - 每个功能独立文件
2. **职责分离** - UI/算法/类型分离
3. **易于维护** - 问题定位精确
4. **可复用性** - 组件可独立使用
5. **类型安全** - TypeScript类型定义
6. **便于测试** - 单元测试更容易

## 🚀 下一步

1. **算法优化** - 根据`analysreport.txt`改进澳洲检测
2. **性能优化** - 并行处理、缓存优化
3. **功能扩展** - 新检测方法、新UI功能
4. **测试完善** - 单元测试、集成测试

---

现在当你提及"算法"或"某个模块"时，我可以直接定位到相应文件，无需重复读取整个App.tsx文件。