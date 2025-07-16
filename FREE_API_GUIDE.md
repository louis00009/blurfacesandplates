# 🆓 免费车牌识别API完整指南

## 🎉 已集成的免费API服务

我已经为你集成了多个免费的车牌识别API，每个都有不同的优势和免费额度：

### 1. 📸 **Plate Recognizer API** (推荐)
- **免费额度**: 1000次/月
- **准确度**: ⭐⭐⭐⭐⭐ (最高)
- **网站**: https://platerecognizer.com/
- **特点**: 
  - 专业车牌识别服务
  - 支持澳洲车牌优化
  - 返回车牌文字和精确位置
  - 最佳检测准确度

**获取API密钥**:
1. 访问 https://platerecognizer.com/
2. 注册免费账户
3. 在Dashboard中复制API Token

### 2. 🔓 **OpenALPR Cloud API**
- **免费额度**: 1000次/月
- **准确度**: ⭐⭐⭐⭐
- **网站**: https://www.openalpr.com/cloud-api.html
- **特点**:
  - 开源项目的云服务
  - 支持多国车牌
  - 良好的澳洲车牌支持

**获取API密钥**:
1. 访问 https://www.openalpr.com/cloud-api.html
2. 注册账户
3. 获取Secret Key

### 3. 🔍 **Google Cloud Vision API**
- **免费额度**: 1000次/月
- **准确度**: ⭐⭐⭐
- **网站**: https://cloud.google.com/vision
- **特点**:
  - 通用OCR服务
  - 可以识别车牌文字
  - Google的强大AI技术

**获取API密钥**:
1. 访问 https://console.cloud.google.com/
2. 创建新项目或选择现有项目
3. 启用Vision API
4. 创建API密钥

## 🚀 如何使用

### 步骤 1: 选择API服务
在应用的"Detection Method"中选择你想使用的API：
- **📸 Plate Recognizer** - 最准确，推荐首选
- **🔓 OpenALPR** - 开源，稳定可靠
- **🔍 Google Vision** - 通用OCR，适合文字识别

### 步骤 2: 输入API密钥
选择API后，会出现相应的API密钥输入框，粘贴你的密钥。

### 步骤 3: 处理图片
上传图片并点击"PROCESS IMAGES"，API会自动检测车牌。

## 📊 API对比表

| API服务 | 免费额度 | 准确度 | 澳洲车牌支持 | 返回信息 | 推荐指数 |
|---------|----------|--------|--------------|----------|----------|
| Plate Recognizer | 1000/月 | 最高 | 优秀 | 位置+文字 | ⭐⭐⭐⭐⭐ |
| OpenALPR | 1000/月 | 很高 | 良好 | 位置+文字 | ⭐⭐⭐⭐ |
| Google Vision | 1000/月 | 中等 | 一般 | 位置+文字 | ⭐⭐⭐ |

## 💡 使用建议

### 1. **推荐使用顺序**:
1. **Plate Recognizer** - 最准确，优先使用
2. **OpenALPR** - 作为备用选择
3. **Google Vision** - 当前两个不可用时使用

### 2. **节省API调用次数**:
- 使用"Highlight Mode"先测试检测效果
- 确认检测准确后再进行实际处理
- 批量处理图片以提高效率

### 3. **最佳实践**:
- 上传清晰的图片以获得最佳效果
- 确保车牌在图片中清晰可见
- 避免过度模糊或角度过大的图片

## 🔧 技术特性

### Plate Recognizer API
```javascript
// 自动优化图片尺寸
// 澳洲地区设置: regions: 'au'
// 返回精确的边界框和车牌文字
// 支持置信度评分
```

### OpenALPR API
```javascript
// 支持多国车牌识别
// 返回多个候选结果
// 包含详细的坐标信息
// 专门的澳洲车牌优化
```

### Google Vision API
```javascript
// 通用文字识别
// 智能车牌文字过滤
// 澳洲车牌格式验证
// 自动几何形状分析
```

## 🆓 更多免费API选项

如果你需要更多选择，还可以考虑：

### 4. **Azure Computer Vision**
- **免费额度**: 5000次/月
- **网站**: https://azure.microsoft.com/cognitive-services/computer-vision/

### 5. **AWS Rekognition**
- **免费额度**: 5000次/月（首年）
- **网站**: https://aws.amazon.com/rekognition/

### 6. **RapidAPI Marketplace**
- **多种选择**: 不同的免费额度
- **网站**: https://rapidapi.com/
- **搜索**: "license plate recognition"

## 🎯 使用示例

当你使用API时，控制台会显示详细信息：

```
📸 PLATE RECOGNIZER API Detection Starting...
Image dimensions: 720x405
🔄 Converting image to blob...
📦 Image blob size: 245.3KB
🌐 Sending request to Plate Recognizer API...
⚡ API response received in 1247.2ms
🎉 Found 1 license plate(s)
  Plate 1: "ABC123" at [245, 387, 120, 35] confidence: 89.2%
✅ Plate Recognizer API detection complete in 1250.1ms
```

## 🔒 API密钥安全

- 不要在代码中硬编码API密钥
- 不要分享你的API密钥
- 定期检查API使用量
- 如果密钥泄露，立即重新生成

## 🎉 总结

现在你有了多个免费的专业车牌识别API选择！这些API比传统的计算机视觉方法准确得多，特别是Plate Recognizer API，应该能够准确检测到你图片中的所有澳洲车牌。

**立即开始使用**：
1. 选择一个API服务并获取密钥
2. 在应用中输入API密钥
3. 享受准确的车牌检测！

如果你需要帮助获取任何API密钥或遇到问题，请告诉我！