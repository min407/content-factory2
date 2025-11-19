/**
 * API配置管理服务
 * 负责API密钥的存储、验证和管理
 */

import {
  ApiConfig,
  ApiProvider,
  ApiTestResult,
  API_CONFIG_TEMPLATES
} from '@/types/api-config'

/**
 * API配置管理器
 */
export class ApiConfigManager {
  private static readonly STORAGE_KEY = 'api-configs'

  /**
   * 获取所有API配置
   */
  static getConfigs(): ApiConfig[] {
    try {
      if (typeof window === 'undefined') {
        return []
      }

      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('获取API配置失败:', error)
      return []
    }
  }

  /**
   * 根据提供商获取配置
   */
  static getConfig(provider: ApiProvider): ApiConfig | null {
    try {
      const configs = this.getConfigs()
      return configs.find(config => config.provider === provider) || null
    } catch (error) {
      console.error('获取API配置失败:', error)
      return null
    }
  }

  /**
   * 标准化API配置，验证和纠正URL
   */
  private static normalizeApiConfig(config: ApiConfig): ApiConfig {
    const normalizedConfig = { ...config }

    if (config.provider === 'siliconflow' && config.apiBase) {
      // 如果用户配置了图片生成的URL，自动纠正为聊天API的基础URL
      if (config.apiBase.includes('/images/generations')) {
        normalizedConfig.apiBase = config.apiBase.replace('/images/generations', '')
        console.log('🔧 [API配置] 自动纠正SiliconFlow URL:', {
          原始: config.apiBase,
          纠正后: normalizedConfig.apiBase
        })
      }
      // 如果只有基础的URL，确保没有多余的路径
      else if (config.apiBase.endsWith('/v1')) {
        normalizedConfig.apiBase = config.apiBase
      } else if (config.apiBase.endsWith('/v1/')) {
        normalizedConfig.apiBase = config.apiBase.slice(0, -1)
      }
    }

    return normalizedConfig
  }

  /**
   * 保存API配置
   */
  static saveConfig(config: ApiConfig): boolean {
    try {
      if (typeof window === 'undefined') {
        return false // 服务器端无法保存到localStorage
      }

      // 验证和纠正API Base URL
      const normalizedConfig = this.normalizeApiConfig(config)

      const configs = this.getConfigs()
      const existingIndex = configs.findIndex(c => c.provider === config.provider)

      if (existingIndex >= 0) {
        configs[existingIndex] = { ...normalizedConfig, updatedAt: new Date() }
      } else {
        configs.push(normalizedConfig)
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs))
      console.log('API配置保存成功:', normalizedConfig.provider)
      return true
    } catch (error) {
      console.error('保存API配置失败:', error)
      return false
    }
  }

  /**
   * 删除API配置
   */
  static deleteConfig(provider: ApiProvider): boolean {
    try {
      if (typeof window === 'undefined') {
        return false // 服务器端无法操作localStorage
      }

      const configs = this.getConfigs()
      const filteredConfigs = configs.filter(config => config.provider !== provider)

      if (filteredConfigs.length < configs.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredConfigs))
        console.log('API配置删除成功:', provider)
        return true
      }
      return false
    } catch (error) {
      console.error('删除API配置失败:', error)
      return false
    }
  }

  /**
   * 获取已配置的提供商列表
   */
  static getConfiguredProviders(): ApiProvider[] {
    try {
      const configs = this.getConfigs()
      return configs
        .filter(config => config.isConfigured && config.isActive)
        .map(config => config.provider)
    } catch (error) {
      console.error('获取已配置提供商失败:', error)
      return []
    }
  }

  /**
   * 检查提供商是否已配置
   */
  static isConfigured(provider: ApiProvider): boolean {
    try {
      const config = this.getConfig(provider)
      return config?.isConfigured && config?.isActive || false
    } catch (error) {
      console.error('检查配置状态失败:', error)
      return false
    }
  }

  /**
   * 获取API密钥
   * 优先级：用户配置 > 环境变量 > 默认值
   */
  static getApiKey(provider: ApiProvider): string | null {
    try {
      // 1. 优先使用用户配置
      const config = this.getConfig(provider)
      if (config?.apiKey) {
        console.log(`🔑 [配置] 使用用户配置的API密钥 (${provider}): ${config.apiKey.substring(0, 8)}...`)
        return config.apiKey
      }

      // 2. 回退到环境变量
      const envKey = this.getEnvKey(provider)
      const envValue = process.env[envKey]
      if (envValue) {
        console.log(`🔑 [配置] 使用环境变量API密钥 (${provider}): ${envValue.substring(0, 8)}...`)
        return envValue
      }

      // 3. 没有找到配置
      console.log(`❌ [配置] 未找到API密钥配置 (${provider})`)
      return null
    } catch (error) {
      console.error('获取API密钥失败:', error)
      return null
    }
  }

  /**
   * 获取环境变量键名
   */
  private static getEnvKey(provider: ApiProvider): string {
    const envKeys = {
      [ApiProvider.OPENROUTER]: 'OPENAI_API_KEY',
      [ApiProvider.SILICONFLOW]: 'SILICONFLOW_API_KEY',
      [ApiProvider.WECHAT_SEARCH]: 'NEXT_PUBLIC_XIAOHONGSHU_SEARCH_API_KEY',
      [ApiProvider.XIAOHONGSHU_SEARCH]: 'NEXT_PUBLIC_XIAOHONGSHU_SEARCH_API_KEY',
      [ApiProvider.XIAOHONGSHU_DETAIL]: 'NEXT_PUBLIC_XIAOHONGSHU_DETAIL_API_KEY',
      [ApiProvider.WECHAT_PUBLISH]: 'WECHAT_API_KEY'
    }
    return envKeys[provider] || ''
  }

  /**
   * 获取API基础URL
   * 优先级：用户配置 > 服务商默认值 > 环境变量
   */
  static getApiBase(provider: ApiProvider): string | null {
    try {
      // 1. 优先使用用户配置
      const config = this.getConfig(provider)
      if (config?.apiBase) {
        console.log(`🌐 [配置] 使用用户配置的API地址 (${provider}): ${config.apiBase}`)
        return config.apiBase
      }

      // 2. 回退到默认值
      const defaultBase = this.getDefaultApiBase(provider)
      if (defaultBase) {
        console.log(`🌐 [配置] 使用默认API地址 (${provider}): ${defaultBase}`)
        return defaultBase
      }

      console.log(`❌ [配置] 未找到API地址配置 (${provider})`)
      return null
    } catch (error) {
      console.error('获取API基础URL失败:', error)
      return null
    }
  }

  /**
   * 获取默认API基础URL
   */
  private static getDefaultApiBase(provider: ApiProvider): string | null {
    const defaults = {
      [ApiProvider.OPENROUTER]: 'https://openrouter.ai/api/v1',
      [ApiProvider.SILICONFLOW]: 'https://api.siliconflow.cn/v1',
      [ApiProvider.WECHAT_SEARCH]: 'https://www.dajiala.com/fbmain/monitor/v3/kw_search',
      [ApiProvider.XIAOHONGSHU_SEARCH]: 'https://www.dajiala.com/fbmain/monitor/v3/xhs',
      [ApiProvider.XIAOHONGSHU_DETAIL]: 'https://api.meowload.net/openapi/extract/post',
      [ApiProvider.WECHAT_PUBLISH]: ''
    }
    return defaults[provider] || null
  }

  /**
   * 获取模型配置
   */
  static getModel(provider: ApiProvider): string | null {
    try {
      const config = this.getConfig(provider)
      return config?.model || null
    } catch (error) {
      console.error('获取模型配置失败:', error)
      return null
    }
  }

  /**
   * 批量更新配置
   */
  static updateConfigs(configs: ApiConfig[]): boolean {
    try {
      if (typeof window === 'undefined') {
        return false // 服务器端无法操作localStorage
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs))
      console.log('批量更新API配置成功')
      return true
    } catch (error) {
      console.error('批量更新API配置失败:', error)
      return false
    }
  }

  /**
   * 清空所有配置
   */
  static clearConfigs(): boolean {
    try {
      if (typeof window === 'undefined') {
        return false // 服务器端无法操作localStorage
      }

      localStorage.removeItem(this.STORAGE_KEY)
      console.log('清空API配置成功')
      return true
    } catch (error) {
      console.error('清空API配置失败:', error)
      return false
    }
  }

  /**
   * 从环境变量迁移配置
   */
  static migrateFromEnv(): void {
    try {
      console.log('开始从环境变量迁移API配置...')

      const migrations = [
        {
          provider: ApiProvider.OPENROUTER,
          apiKeyEnv: 'OPENAI_API_KEY',
          apiBaseEnv: 'OPENAI_API_BASE',
          modelEnv: 'OPENAI_MODEL',
          defaultBase: 'https://openrouter.ai/api/v1',
          defaultModel: 'openai/gpt-4o'
        },
        {
          provider: ApiProvider.SILICONFLOW,
          apiKeyEnv: 'SILICONFLOW_API_KEY',
          apiBaseEnv: 'SILICONFLOW_API_BASE',
          modelEnv: 'SILICONFLOW_MODEL',
          defaultBase: 'https://api.siliconflow.cn/v1',
          defaultModel: 'Kwai-Kolors/Kolors'
        },
        {
          provider: ApiProvider.WECHAT_SEARCH,
          apiKeyEnv: 'NEXT_PUBLIC_XIAOHONGSHU_SEARCH_API_KEY',
          apiBaseEnv: null,
          defaultBase: 'https://www.dajiala.com/fbmain/monitor/v3/kw_search'
        },
        {
          provider: ApiProvider.XIAOHONGSHU_SEARCH,
          apiKeyEnv: 'NEXT_PUBLIC_XIAOHONGSHU_SEARCH_API_KEY',
          apiBaseEnv: null,
          defaultBase: 'https://www.dajiala.com/fbmain/monitor/v3/xhs'
        },
        {
          provider: ApiProvider.XIAOHONGSHU_DETAIL,
          apiKeyEnv: 'NEXT_PUBLIC_XIAOHONGSHU_DETAIL_API_KEY',
          apiBaseEnv: null,
          defaultBase: 'https://api.meowload.net/openapi/extract/post'
        }
      ]

      let migratedCount = 0

      migrations.forEach(migration => {
        const apiKey = process.env[migration.apiKeyEnv as keyof typeof process.env]
        const apiBase = migration.apiBaseEnv ? process.env[migration.apiBaseEnv as keyof typeof process.env] : null
        const model = migration.modelEnv ? process.env[migration.modelEnv as keyof typeof process.env] : null

        if (apiKey && !this.getConfig(migration.provider)) {
          const template = API_CONFIG_TEMPLATES[migration.provider]
          const config: ApiConfig = {
            id: Date.now().toString() + Math.random().toString(36).substr(2),
            provider: migration.provider,
            name: template.name,
            description: template.description,
            apiKey: apiKey,
            apiBase: apiBase || migration.defaultBase || '',
            model: model || migration.defaultModel || null,
            isActive: true,
            isConfigured: !!apiKey,
            createdAt: new Date(),
            updatedAt: new Date()
          }

          this.saveConfig(config)
          migratedCount++
        }
      })

      if (migratedCount > 0) {
        console.log(`成功迁移 ${migratedCount} 个API配置`)
      } else {
        console.log('没有需要迁移的API配置')
      }
    } catch (error) {
      console.error('从环境变量迁移配置失败:', error)
    }
  }

  /**
   * 验证配置完整性
   */
  static validateConfig(provider: ApiProvider): { isValid: boolean; issues: string[] } {
    const issues: string[] = []

    const config = this.getConfig(provider)
    if (!config) {
      issues.push('未找到配置')
      return { isValid: false, issues }
    }

    if (!config.apiKey) {
      issues.push('API密钥未配置')
    }

    if (!config.apiBase) {
      issues.push('API地址未配置')
    }

    if (provider === ApiProvider.OPENROUTER && !config.model) {
      issues.push('模型未配置')
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  /**
   * 获取配置摘要
   */
  static getConfigSummary(provider: ApiProvider): string {
    const config = this.getConfig(provider)
    if (!config) {
      return '未配置'
    }

    const parts: string[] = []
    if (config.serviceProvider) {
      parts.push(`服务商: ${config.serviceProvider}`)
    }
    if (config.apiKey) {
      parts.push(`密钥: ${config.apiKey.substring(0, 8)}...`)
    }
    if (config.apiBase) {
      parts.push(`地址: ${config.apiBase}`)
    }
    if (config.model) {
      parts.push(`模型: ${config.model}`)
    }

    return parts.join(' | ')
  }

  /**
   * 验证API连接
   */
  static async testConnection(provider: ApiProvider): Promise<ApiTestResult> {
    const startTime = Date.now()

    try {
      const config = this.getConfig(provider)
      if (!config || !config.apiKey) {
        return {
          success: false,
          message: 'API配置不存在或API密钥为空',
          timestamp: new Date()
        }
      }

      switch (provider) {
        case ApiProvider.OPENROUTER:
          return await this.testOpenRouterConnection(config)
        case ApiProvider.SILICONFLOW:
          return await this.testSiliconFlowConnection(config)
        case ApiProvider.WECHAT_SEARCH:
          return await this.testWechatSearchConnection(config)
        case ApiProvider.XIAOHONGSHU_SEARCH:
          return await this.testXiaohongshuSearchConnection(config)
        case ApiProvider.XIAOHONGSHU_DETAIL:
          return await this.testXiaohongshuDetailConnection(config)
        case ApiProvider.WECHAT_PUBLISH:
          return await this.testWechatPublishConnection(config)
        default:
          return {
            success: false,
            message: '不支持的API提供商',
            timestamp: new Date()
          }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        success: false,
        message: error instanceof Error ? error.message : '连接测试失败',
        responseTime,
        timestamp: new Date()
      }
    }
  }

  /**
   * 测试OpenRouter连接
   */
  static async testOpenRouterConnection(config: ApiConfig): Promise<ApiTestResult> {
    const startTime = Date.now()

    try {
      // 调用后端API测试接口，避免CORS问题
      const response = await fetch('/api/config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'openrouter',
          config: {
            apiKey: config.apiKey,
            apiBase: config.apiBase,
            model: config.model
          }
        })
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        return {
          success: data.success,
          message: data.message,
          responseTime: data.responseTime || responseTime,
          details: data.details,
          timestamp: new Date(data.timestamp)
        }
      } else {
        const errorText = await response.text()
        return {
          success: false,
          message: `测试API错误 (${response.status}): ${response.statusText}`,
          responseTime,
          timestamp: new Date()
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络连接失败',
        responseTime,
        timestamp: new Date()
      }
    }
  }

  /**
   * 测试Silicon Flow连接
   */
  static async testSiliconFlowConnection(config: ApiConfig): Promise<ApiTestResult> {
    const startTime = Date.now()

    try {
      // 调用后端API测试接口，避免CORS问题
      const response = await fetch('/api/config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'siliconflow',
          config: {
            apiKey: config.apiKey,
            apiBase: config.apiBase,
            model: config.model
          }
        })
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        return {
          success: data.success,
          message: data.message,
          responseTime: data.responseTime || responseTime,
          details: data.details,
          timestamp: new Date(data.timestamp)
        }
      } else {
        const errorText = await response.text()
        return {
          success: false,
          message: `测试API错误 (${response.status}): ${response.statusText}`,
          responseTime,
          timestamp: new Date()
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络连接失败',
        responseTime,
        timestamp: new Date()
      }
    }
  }

  /**
   * 测试微信公众号搜索连接
   */
  static async testWechatSearchConnection(config: ApiConfig): Promise<ApiTestResult> {
    const startTime = Date.now()

    try {
      const response = await fetch(config.apiBase || 'https://www.dajiala.com/fbmain/monitor/v3/kw_search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: config.apiKey,
          kw: 'test',
          page: 1,
          sort_type: 1,
          mode: 1,
          period: 7
        })
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        if (data.code === 0) {
          return {
            success: true,
            message: '连接成功',
            responseTime,
            timestamp: new Date()
          }
        } else {
          return {
            success: false,
            message: `API错误: ${data.msg || '未知错误'}`,
            responseTime,
            timestamp: new Date()
          }
        }
      } else {
        return {
          success: false,
          message: `HTTP错误 (${response.status}): ${response.statusText}`,
          responseTime,
          timestamp: new Date()
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络连接失败',
        responseTime,
        timestamp: new Date()
      }
    }
  }

  /**
   * 测试小红书搜索连接
   */
  static async testXiaohongshuSearchConnection(config: ApiConfig): Promise<ApiTestResult> {
    const startTime = Date.now()

    try {
      const response = await fetch(config.apiBase || 'https://www.dajiala.com/fbmain/monitor/v3/xhs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: config.apiKey,
          keyword: 'test',
          page: 1,
          sort: 'general',
          note_type: 'image'
        })
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        if (data.code === 0) {
          return {
            success: true,
            message: '连接成功',
            responseTime,
            timestamp: new Date()
          }
        } else {
          return {
            success: false,
            message: `API错误: ${data.msg || '未知错误'}`,
            responseTime,
            timestamp: new Date()
          }
        }
      } else {
        return {
          success: false,
          message: `HTTP错误 (${response.status}): ${response.statusText}`,
          responseTime,
          timestamp: new Date()
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络连接失败',
        responseTime,
        timestamp: new Date()
      }
    }
  }

  /**
   * 测试小红书详情连接
   */
  static async testXiaohongshuDetailConnection(config: ApiConfig): Promise<ApiTestResult> {
    const startTime = Date.now()

    try {
      // 使用测试URL
      const testUrl = 'https://www.xiaohongshu.com/explore/1234567890'

      const response = await fetch(config.apiBase || 'https://api.meowload.net/openapi/extract/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
        },
        body: JSON.stringify({
          url: testUrl
        })
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        return {
          success: true,
          message: '连接成功',
          responseTime,
          timestamp: new Date()
        }
      } else {
        const error = await response.json().catch(() => ({}))
        return {
          success: false,
          message: `API错误 (${response.status}): ${error.message || response.statusText}`,
          responseTime,
          timestamp: new Date()
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络连接失败',
        responseTime,
        timestamp: new Date()
      }
    }
  }

  /**
   * 测试微信公众号发布连接
   */
  static async testWechatPublishConnection(config: ApiConfig): Promise<ApiTestResult> {
    const startTime = Date.now()

    try {
      console.log('🧪 [API配置] 开始测试微信公众号发布连接...')

      if (!config.apiKey?.trim()) {
        console.error('❌ [API配置] 微信公众号发布: API密钥为空')
        return {
          success: false,
          message: 'API密钥为空',
          responseTime: Date.now() - startTime,
          timestamp: new Date()
        }
      }

      console.log('🔍 [API配置] 微信公众号发布测试配置:', {
        hasApiKey: !!config.apiKey,
        apiKeyLength: config.apiKey.length,
        apiBase: config.apiBase
      })

      // 调用后端API测试接口，避免CORS问题
      const response = await fetch('/api/config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'wechat_publish',
          config: {
            apiKey: config.apiKey,
            apiBase: config.apiBase || 'https://wx.limyai.com/api/openapi'
          }
        })
      })

      const responseTime = Date.now() - startTime
      console.log('🌐 [API配置] 微信公众号发布测试API响应状态:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('📊 [API配置] 微信公众号发布测试API响应数据:', data)

        return {
          success: data.success,
          message: data.message,
          responseTime: data.responseTime || responseTime,
          details: data.details,
          timestamp: new Date(data.timestamp)
        }
      } else {
        const errorText = await response.text()
        console.error('❌ [API配置] 微信公众号发布测试API错误:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        return {
          success: false,
          message: `测试API错误 (${response.status}): ${response.statusText}`,
          responseTime,
          timestamp: new Date()
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      console.error('❌ [API配置] 微信公众号发布连接测试异常:', error)

      let errorMessage = error instanceof Error ? error.message : '网络连接失败'

      // 针对fetch错误提供更友好的错误信息
      if (error instanceof Error && error.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查网络连接或API服务状态'
      }

      return {
        success: false,
        message: errorMessage,
        responseTime,
        timestamp: new Date()
      }
    }
  }

  /**
   * 获取配置统计信息
   */
  static getStats() {
    const configs = this.getConfigs()
    const configured = configs.filter(c => c.isConfigured)
    const active = configured.filter(c => c.isActive)

    return {
      total: configs.length,
      configured: configured.length,
      active: active.length,
      needsAttention: configs.filter(c => !c.isConfigured || c.testStatus === 'error').length
    }
  }
}

/**
 * 自动迁移环境变量配置（仅在客户端运行）
 */
export function autoMigrateFromEnv() {
  if (typeof window !== 'undefined') {
    // 延迟执行，确保在其他组件加载后执行
    setTimeout(() => {
      ApiConfigManager.migrateFromEnv()
    }, 1000)
  }
}