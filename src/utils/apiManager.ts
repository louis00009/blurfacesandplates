// API Manager - 智能API管理和自动切换系统
import { APIConfig, APIManagerState, PlateDetection } from '../types';

export class APIManager {
  private static instance: APIManager;
  private state: APIManagerState;
  private storageKey = 'api-manager-state';

  private constructor() {
    this.state = this.loadState();
  }

  static getInstance(): APIManager {
    if (!APIManager.instance) {
      APIManager.instance = new APIManager();
    }
    return APIManager.instance;
  }

  // 初始化默认API配置
  private getDefaultAPIs(): APIConfig[] {
    return [
      {
        id: 'platerecognizer',
        name: 'Plate Recognizer',
        enabled: true,
        apiKey: '',
        freeLimit: 1000,
        usedCount: 0,
        priority: 1,
        lastUsed: null,
        status: 'active',
        errorCount: 0,
        maxErrors: 3,
        resetDate: this.getNextMonthDate()
      },
      {
        id: 'openalpr',
        name: 'OpenALPR',
        enabled: true,
        apiKey: '',
        freeLimit: 1000,
        usedCount: 0,
        priority: 2,
        lastUsed: null,
        status: 'active',
        errorCount: 0,
        maxErrors: 3,
        resetDate: this.getNextMonthDate()
      },
      {
        id: 'googlevision',
        name: 'Google Vision',
        enabled: true,
        apiKey: '',
        freeLimit: 1000,
        usedCount: 0,
        priority: 3,
        lastUsed: null,
        status: 'active',
        errorCount: 0,
        maxErrors: 3,
        resetDate: this.getNextMonthDate()
      },
      {
        id: 'azure',
        name: 'Azure Computer Vision',
        enabled: false,
        apiKey: '',
        freeLimit: 5000,
        usedCount: 0,
        priority: 4,
        lastUsed: null,
        status: 'disabled',
        errorCount: 0,
        maxErrors: 3,
        resetDate: this.getNextMonthDate()
      },
      {
        id: 'aws',
        name: 'AWS Rekognition',
        enabled: false,
        apiKey: '',
        freeLimit: 5000,
        usedCount: 0,
        priority: 5,
        lastUsed: null,
        status: 'disabled',
        errorCount: 0,
        maxErrors: 3,
        resetDate: this.getNextMonthDate()
      }
    ];
  }

  // 加载状态
  private loadState(): APIManagerState {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 确保日期对象正确反序列化
        parsed.apis = parsed.apis.map((api: any) => ({
          ...api,
          lastUsed: api.lastUsed ? new Date(api.lastUsed) : null,
          resetDate: api.resetDate ? new Date(api.resetDate) : null
        }));
        return parsed;
      }
    } catch (error) {
      console.error('Failed to load API manager state:', error);
    }

    return {
      apis: this.getDefaultAPIs(),
      autoFallback: true,
      fallbackToLocal: true,
      currentApiId: null
    };
  }

  // 保存状态
  private saveState(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save API manager state:', error);
    }
  }

  // 获取下个月的日期
  private getNextMonthDate(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // 获取当前状态
  getState(): APIManagerState {
    return { ...this.state };
  }

  // 获取所有API配置
  getAPIs(): APIConfig[] {
    return [...this.state.apis];
  }

  // 获取可用的API（按优先级排序）
  getAvailableAPIs(): APIConfig[] {
    return this.state.apis
      .filter(api => 
        api.enabled && 
        api.status === 'active' && 
        api.apiKey.trim() !== '' &&
        api.usedCount < api.freeLimit &&
        api.errorCount < api.maxErrors
      )
      .sort((a, b) => a.priority - b.priority);
  }

  // 获取下一个可用的API
  getNextAvailableAPI(): APIConfig | null {
    const available = this.getAvailableAPIs();
    return available.length > 0 ? available[0] : null;
  }

  // 更新API配置
  updateAPI(apiId: string, updates: Partial<APIConfig>): void {
    const index = this.state.apis.findIndex(api => api.id === apiId);
    if (index !== -1) {
      this.state.apis[index] = { ...this.state.apis[index], ...updates };
      this.saveState();
    }
  }

  // 更新API密钥
  updateAPIKey(apiId: string, apiKey: string): void {
    this.updateAPI(apiId, { 
      apiKey, 
      status: apiKey.trim() ? 'active' : 'disabled',
      errorCount: 0 // 重置错误计数
    });
  }

  // 启用/禁用API
  toggleAPI(apiId: string, enabled: boolean): void {
    this.updateAPI(apiId, { 
      enabled, 
      status: enabled ? 'active' : 'disabled',
      errorCount: enabled ? 0 : this.state.apis.find(api => api.id === apiId)?.errorCount || 0
    });
  }

  // 设置API优先级
  setAPIPriority(apiId: string, priority: number): void {
    this.updateAPI(apiId, { priority });
  }

  // 设置免费限额
  setFreeLimit(apiId: string, freeLimit: number): void {
    this.updateAPI(apiId, { freeLimit });
  }

  // 重置使用计数
  resetUsageCount(apiId: string): void {
    this.updateAPI(apiId, { 
      usedCount: 0, 
      status: 'active',
      errorCount: 0,
      resetDate: this.getNextMonthDate()
    });
  }

  // 记录API使用
  recordAPIUsage(apiId: string, success: boolean): void {
    const api = this.state.apis.find(api => api.id === apiId);
    if (!api) return;

    const updates: Partial<APIConfig> = {
      lastUsed: new Date()
    };

    if (success) {
      updates.usedCount = api.usedCount + 1;
      updates.errorCount = 0; // 成功时重置错误计数
      
      // 检查是否达到免费限额
      if (updates.usedCount >= api.freeLimit) {
        updates.status = 'quota_exceeded';
      }
    } else {
      updates.errorCount = api.errorCount + 1;
      
      // 检查是否达到最大错误次数
      if (updates.errorCount >= api.maxErrors) {
        updates.status = 'error';
      }
    }

    this.updateAPI(apiId, updates);
  }

  // 设置自动切换
  setAutoFallback(autoFallback: boolean): void {
    this.state.autoFallback = autoFallback;
    this.saveState();
  }

  // 设置本地回退
  setFallbackToLocal(fallbackToLocal: boolean): void {
    this.state.fallbackToLocal = fallbackToLocal;
    this.saveState();
  }

  // 智能API调用 - 核心方法
  async callAPI(
    imageElement: HTMLImageElement,
    apiCallbacks: Record<string, (img: HTMLImageElement, apiKey: string) => Promise<PlateDetection[]>>
  ): Promise<{ detections: PlateDetection[], apiUsed: string | null }> {
    console.log('🤖 API Manager: Starting intelligent API selection...');
    
    const availableAPIs = this.getAvailableAPIs();
    console.log(`📊 Available APIs: ${availableAPIs.length}`);
    
    if (availableAPIs.length === 0) {
      console.log('⚠️ No available APIs, checking fallback options...');
      
      if (this.state.fallbackToLocal) {
        console.log('🔄 Falling back to local detection...');
        return { detections: [], apiUsed: null };
      } else {
        throw new Error('No available APIs and local fallback is disabled');
      }
    }

    // 尝试每个可用的API
    for (const api of availableAPIs) {
      console.log(`🔄 Trying API: ${api.name} (Priority: ${api.priority})`);
      
      if (!apiCallbacks[api.id]) {
        console.log(`❌ No callback found for API: ${api.id}`);
        continue;
      }

      try {
        const startTime = performance.now();
        const detections = await apiCallbacks[api.id](imageElement, api.apiKey);
        const endTime = performance.now();
        
        console.log(`✅ ${api.name} succeeded in ${(endTime - startTime).toFixed(1)}ms`);
        console.log(`📊 Found ${detections.length} detections`);
        
        // 记录成功使用
        this.recordAPIUsage(api.id, true);
        this.state.currentApiId = api.id;
        this.saveState();
        
        return { detections, apiUsed: api.name };
        
      } catch (error) {
        console.error(`❌ ${api.name} failed:`, error);
        
        // 记录失败使用
        this.recordAPIUsage(api.id, false);
        
        // 如果不是自动切换，直接抛出错误
        if (!this.state.autoFallback) {
          throw error;
        }
        
        // 继续尝试下一个API
        continue;
      }
    }

    // 所有API都失败了
    console.log('❌ All APIs failed');
    
    if (this.state.fallbackToLocal) {
      console.log('🔄 All APIs failed, falling back to local detection...');
      return { detections: [], apiUsed: null };
    } else {
      throw new Error('All APIs failed and local fallback is disabled');
    }
  }

  // 获取API统计信息
  getAPIStats(): Record<string, any> {
    const stats = {
      totalAPIs: this.state.apis.length,
      enabledAPIs: this.state.apis.filter(api => api.enabled).length,
      activeAPIs: this.state.apis.filter(api => api.status === 'active').length,
      totalUsage: this.state.apis.reduce((sum, api) => sum + api.usedCount, 0),
      totalLimit: this.state.apis.reduce((sum, api) => sum + api.freeLimit, 0),
      apiDetails: this.state.apis.map(api => ({
        name: api.name,
        status: api.status,
        usage: `${api.usedCount}/${api.freeLimit}`,
        usagePercent: Math.round((api.usedCount / api.freeLimit) * 100),
        errors: api.errorCount,
        lastUsed: api.lastUsed
      }))
    };

    return stats;
  }

  // 导出配置
  exportConfig(): string {
    return JSON.stringify(this.state, null, 2);
  }

  // 导入配置
  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      
      // 验证配置格式
      if (!config.apis || !Array.isArray(config.apis)) {
        throw new Error('Invalid configuration format');
      }

      // 恢复日期对象
      config.apis = config.apis.map((api: any) => ({
        ...api,
        lastUsed: api.lastUsed ? new Date(api.lastUsed) : null,
        resetDate: api.resetDate ? new Date(api.resetDate) : null
      }));

      this.state = config;
      this.saveState();
      
      console.log('✅ API configuration imported successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to import configuration:', error);
      return false;
    }
  }

  // 重置所有配置
  resetToDefaults(): void {
    this.state = {
      apis: this.getDefaultAPIs(),
      autoFallback: true,
      fallbackToLocal: true,
      currentApiId: null
    };
    this.saveState();
    console.log('✅ API configuration reset to defaults');
  }
}

// 导出单例实例
export const apiManager = APIManager.getInstance();