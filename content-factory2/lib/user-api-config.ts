/**
 * 用户API配置管理服务
 * 支持用户隔离和服务器端持久化
 */

import {
  ApiConfig,
  ApiProvider,
  ApiTestResult,
  API_CONFIG_TEMPLATES
} from '@/types/api-config'
import {
  UserApiConfig as UserApiConfigType,
  AuthResponse,
  AuthErrorCode
} from '@/types/user'

/**
 * 用户API配置管理器
 * 替代原有的基于localStorage的配置管理
 */
export class UserApiConfigManager {
  private static readonly API_BASE = '/api/user/configs'

  /**
   * 获取当前用户的所有API配置
   */
  static async getConfigs(): Promise<UserApiConfigType[]> {
    try {
      const response = await fetch(this.API_BASE, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔐 [用户配置] 用户未登录，返回空配置列表')
          return []
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: AuthResponse = await response.json()
      if (data.success && data.data?.configs) {
        console.log(`📋 [用户配置] 获取到 ${data.data.configs.length} 个配置`)
        return data.data.configs
      }

      return []
    } catch (error) {
      console.error('❌ [用户配置] 获取配置失败:', error)
      return []
    }
  }

  /**
   * 根据提供商获取用户配置
   */
  static async getConfig(provider: ApiProvider): Promise<UserApiConfigType | null> {
    try {
      const configs = await this.getConfigs()
      const config = configs.find(config => config.provider === provider)

      // 如果找到配置且有API密钥，就返回（即使没有设置isConfigured和isActive）
      if (config && config.apiKey) {
        return config
      }

      return null
    } catch (error) {
      console.error('❌ [用户配置] 获取单个配置失败:', error)
      return null
    }
  }

  /**
   * 保存API配置（创建或更新）
   */
  static async saveConfig(config: Partial<ApiConfig>): Promise<boolean> {
    try {
      console.log('💾 [用户配置] 保存配置:', config.provider)

      // 检查是否已存在相同provider的配置
      const existingConfigs = await this.getConfigs()
      const existingConfig = existingConfigs.find(c => c.provider === config.provider)

      if (existingConfig) {
        // 更新现有配置
        const updateData = {
          ...config,
          updatedAt: new Date()
        }
        const result = await this.updateConfig(existingConfig.id, updateData)
        return !!result
      } else {
        // 创建新配置
        const configData = {
          ...config,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        const result = await this.createConfig(configData)
        return !!result
      }
    } catch (error) {
      console.error('❌ [用户配置] 保存配置失败:', error)
      return false
    }
  }

  /**
   * 创建新的API配置
   */
  static async createConfig(configData: Partial<ApiConfig>): Promise<UserApiConfigType | null> {
    try {
      console.log('➕ [用户配置] 创建新配置:', configData.provider)

      const response = await fetch(this.API_BASE, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('用户未登录，请先登录')
        }
        const errorData: AuthResponse = await response.json()
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }

      const data: AuthResponse = await response.json()
      if (data.success && data.data?.config) {
        console.log('✅ [用户配置] 配置创建成功')
        return data.data.config
      }

      return null
    } catch (error) {
      console.error('❌ [用户配置] 创建配置失败:', error)
      throw error
    }
  }

  /**
   * 更新API配置
   */
  static async updateConfig(configId: string, updateData: Partial<ApiConfig>): Promise<UserApiConfigType | null> {
    try {
      console.log('🔄 [用户配置] 更新配置:', configId)

      const response = await fetch(`${this.API_BASE}/${configId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('用户未登录，请先登录')
        }
        if (response.status === 404) {
          throw new Error('配置不存在')
        }
        if (response.status === 403) {
          throw new Error('无权限访问此配置')
        }
        const errorData: AuthResponse = await response.json()
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }

      const data: AuthResponse = await response.json()
      if (data.success && data.data?.config) {
        console.log('✅ [用户配置] 配置更新成功')
        return data.data.config
      }

      return null
    } catch (error) {
      console.error('❌ [用户配置] 更新配置失败:', error)
      throw error
    }
  }

  /**
   * 删除API配置
   */
  static async deleteConfig(configId: string): Promise<boolean> {
    try {
      console.log('🗑️ [用户配置] 删除配置:', configId)

      const response = await fetch(`${this.API_BASE}/${configId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('用户未登录，请先登录')
        }
        if (response.status === 404) {
          throw new Error('配置不存在')
        }
        if (response.status === 403) {
          throw new Error('无权限删除此配置')
        }
        const errorData: AuthResponse = await response.json()
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }

      const data: AuthResponse = await response.json()
      if (data.success) {
        console.log('✅ [用户配置] 配置删除成功')
        return true
      }

      return false
    } catch (error) {
      console.error('❌ [用户配置] 删除配置失败:', error)
      throw error
    }
  }

  /**
   * 获取API密钥
   * 优先级：用户配置 > 环境变量 > 默认值
   */
  static async getApiKey(provider: ApiProvider): Promise<string | null> {
    try {
      // 1. 优先使用用户配置
      const config = await this.getConfig(provider)
      if (config?.apiKey) {
        console.log(`🔑 [用户配置] 使用用户API密钥 (${provider}): ${config.apiKey.substring(0, 8)}...`)
        return config.apiKey
      }

      // 2. 回退到环境变量
      const envKey = this.getEnvKey(provider)
      const envValue = process.env[envKey]
      if (envValue) {
        console.log(`🔑 [用户配置] 使用环境变量API密钥 (${provider}): ${envValue.substring(0, 8)}...`)
        return envValue
      }

      // 3. 没有找到配置
      console.log(`❌ [用户配置] 未找到API密钥配置 (${provider})`)
      return null
    } catch (error) {
      console.error('❌ [用户配置] 获取API密钥失败:', error)
      return null
    }
  }

  /**
   * 获取API基础URL
   * 优先级：用户配置 > 服务商默认值 > 环境变量
   */
  static async getApiBase(provider: ApiProvider): Promise<string | null> {
    try {
      // 1. 优先使用用户配置
      const config = await this.getConfig(provider)
      if (config?.apiBase) {
        console.log(`🌐 [用户配置] 使用用户API地址 (${provider}): ${config.apiBase}`)
        return config.apiBase
      }

      // 2. 回退到默认值
      const defaultBase = this.getDefaultApiBase(provider)
      if (defaultBase) {
        console.log(`🌐 [用户配置] 使用默认API地址 (${provider}): ${defaultBase}`)
        return defaultBase
      }

      console.log(`❌ [用户配置] 未找到API地址配置 (${provider})`)
      return null
    } catch (error) {
      console.error('❌ [用户配置] 获取API地址失败:', error)
      return null
    }
  }

  /**
   * 获取模型配置
   */
  static async getModel(provider: ApiProvider): Promise<string | null> {
    try {
      const config = await this.getConfig(provider)
      return config?.model || null
    } catch (error) {
      console.error('❌ [用户配置] 获取模型配置失败:', error)
      return null
    }
  }

  /**
   * 获取服务商配置
   */
  static async getServiceProvider(provider: ApiProvider): Promise<string | null> {
    try {
      const config = await this.getConfig(provider)
      return config?.serviceProvider || null
    } catch (error) {
      console.error('❌ [用户配置] 获取服务商配置失败:', error)
      return null
    }
  }

  /**
   * 检查提供商是否已配置
   */
  static async isConfigured(provider: ApiProvider): Promise<boolean> {
    try {
      const config = await this.getConfig(provider)
      return config?.isConfigured && config?.isActive || false
    } catch (error) {
      console.error('❌ [用户配置] 检查配置状态失败:', error)
      return false
    }
  }

  /**
   * 获取已配置的提供商列表
   */
  static async getConfiguredProviders(): Promise<ApiProvider[]> {
    try {
      const configs = await this.getConfigs()
      return configs
        .filter(config => config.isConfigured && config.isActive)
        .map(config => config.provider as ApiProvider)
    } catch (error) {
      console.error('❌ [用户配置] 获取已配置提供商失败:', error)
      return []
    }
  }

  /**
   * 验证配置完整性
   */
  static async validateConfig(provider: ApiProvider): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = []

    try {
      const config = await this.getConfig(provider)
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
    } catch (error) {
      console.error('❌ [用户配置] 验证配置失败:', error)
      issues.push('验证过程出错')
      return { isValid: false, issues }
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
   * 获取配置统计信息
   */
  static async getStats(): Promise<{
    total: number
    configured: number
    active: number
    needsAttention: number
  }> {
    try {
      const configs = await this.getConfigs()
      const configured = configs.filter(c => c.isConfigured)
      const active = configured.filter(c => c.isActive)

      return {
        total: configs.length,
        configured: configured.length,
        active: active.length,
        needsAttention: configs.filter(c => !c.isConfigured || c.testStatus === 'error').length
      }
    } catch (error) {
      console.error('❌ [用户配置] 获取统计信息失败:', error)
      return {
        total: 0,
        configured: 0,
        active: 0,
        needsAttention: 0
      }
    }
  }

  /**
   * 验证API连接
   */
  static async testConnection(provider: ApiProvider): Promise<ApiTestResult> {
    const startTime = Date.now()

    try {
      const config = await this.getConfig(provider)
      if (!config || !config.apiKey) {
        return {
          success: false,
          message: 'API配置不存在或API密钥为空',
          timestamp: new Date()
        }
      }

      // 转换为旧格式以复用现有的测试方法
      const oldConfig: ApiConfig = {
        id: config.id,
        provider: config.provider as ApiProvider,
        name: config.name,
        description: config.description,
        apiKey: config.apiKey,
        apiBase: config.apiBase,
        model: config.model,
        serviceProvider: config.serviceProvider,
        isActive: config.isActive,
        isConfigured: config.isConfigured,
        lastTested: config.lastTested,
        testStatus: config.testStatus,
        testMessage: config.testMessage,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }

        // 根据提供商调用相应的测试方法
      let testResult: ApiTestResult
      const { ApiConfigManager } = await import('./api-config')

      switch (provider) {
        case ApiProvider.OPENROUTER:
          testResult = await ApiConfigManager.testOpenRouterConnection(oldConfig)
          break
        case ApiProvider.SILICONFLOW:
          testResult = await ApiConfigManager.testSiliconFlowConnection(oldConfig)
          break
        case ApiProvider.WECHAT_SEARCH:
          testResult = await ApiConfigManager.testWechatSearchConnection(oldConfig)
          break
        case ApiProvider.XIAOHONGSHU_SEARCH:
          testResult = await ApiConfigManager.testXiaohongshuSearchConnection(oldConfig)
          break
        case ApiProvider.XIAOHONGSHU_DETAIL:
          testResult = await ApiConfigManager.testXiaohongshuDetailConnection(oldConfig)
          break
        case ApiProvider.WECHAT_PUBLISH:
          testResult = await ApiConfigManager.testWechatPublishConnection(oldConfig)
          break
        default:
          testResult = {
            success: false,
            message: '不支持的API提供商',
            timestamp: new Date()
          }
      }

      // 将测试结果保存到数据库
      if (config.id) {
        try {
          console.log('🔍 [用户配置] 准备保存测试状态的配置:', {
            id: config.id,
            provider: config.provider,
            name: config.name,
            hasApiKey: !!config.apiKey,
            hasApiBase: !!config.apiBase,
            hasModel: !!config.model
          })

          const updateData = {
            provider: config.provider,
            name: config.name || 'Unknown',
            apiKey: config.apiKey,
            apiBase: config.apiBase,
            model: config.model,
            lastTested: testResult.timestamp,
            testStatus: testResult.success ? 'success' : 'error',
            testMessage: testResult.message
          }

          console.log('📤 [用户配置] 发送更新数据:', {
            id: config.id,
            ...updateData,
            hasApiKey: !!updateData.apiKey,
            hasApiBase: !!updateData.apiBase,
            hasModel: !!updateData.model
          })

          const response = await fetch(`/api/user/configs/${config.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          })

          if (!response.ok) {
            console.log('⚠️ [用户配置] 保存测试状态失败，响应状态:', response.status)
            const errorText = await response.text()
            console.log('⚠️ [用户配置] 错误详情:', errorText)
          } else {
            console.log('✅ [用户配置] 测试状态保存成功')
          }
        } catch (saveError) {
          console.log('⚠️ [用户配置] 保存测试状态时出错:', saveError)
        }
      }

      return testResult
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
   * 批量导入配置（从localStorage迁移）
   */
  static async importFromLocalStorage(): Promise<number> {
    try {
      if (typeof window === 'undefined') {
        return 0
      }

      const data = localStorage.getItem('api-configs')
      if (!data) {
        console.log('📦 [用户配置] localStorage中没有找到配置数据')
        return 0
      }

      const oldConfigs: ApiConfig[] = JSON.parse(data)
      console.log(`📦 [用户配置] 从localStorage导入 ${oldConfigs.length} 个配置`)

      let importCount = 0

      for (const oldConfig of oldConfigs) {
        try {
          // 检查是否已存在相同provider的配置
          const existingConfig = await this.getConfig(oldConfig.provider)
          if (existingConfig) {
            console.log(`⚠️ [用户配置] ${oldConfig.provider} 配置已存在，跳过导入`)
            continue
          }

          // 转换为新格式
          const newConfig: Partial<ApiConfig> = {
            provider: oldConfig.provider,
            name: oldConfig.name,
            description: oldConfig.description,
            apiKey: oldConfig.apiKey,
            apiBase: oldConfig.apiBase,
            model: oldConfig.model,
            serviceProvider: oldConfig.serviceProvider,
            isActive: oldConfig.isActive,
            isConfigured: oldConfig.isConfigured
          }

          await this.createConfig(newConfig)
          importCount++

          console.log(`✅ [用户配置] 成功导入 ${oldConfig.provider} 配置`)
        } catch (error) {
          console.error(`❌ [用户配置] 导入 ${oldConfig.provider} 配置失败:`, error)
        }
      }

      console.log(`🎉 [用户配置] 导入完成，成功导入 ${importCount} 个配置`)
      return importCount
    } catch (error) {
      console.error('❌ [用户配置] 批量导入失败:', error)
      return 0
    }
  }

  /**
   * 检查用户登录状态
   */
  static async checkUserAuth(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data: AuthResponse = await response.json()
        return data.success
      }

      return false
    } catch (error) {
      console.error('❌ [用户配置] 检查登录状态失败:', error)
      return false
    }
  }
}

/**
 * 向后兼容的静态方法（用于逐步迁移）
 */
export class ApiConfigManager {
  /**
   * 检查用户是否已登录，如果登录则使用用户配置，否则使用localStorage
   */
  private static async useUserConfig(): Promise<boolean> {
    try {
      return await UserApiConfigManager.checkUserAuth()
    } catch (error) {
      return false
    }
  }

  static async getApiKey(provider: ApiProvider): Promise<string | null> {
    const useUserConfig = await this.useUserConfig()
    if (useUserConfig) {
      return await UserApiConfigManager.getApiKey(provider)
    }

    // 回退到localStorage
    const { ApiConfigManager: LocalApiConfigManager } = await import('./api-config')
    return LocalApiConfigManager.getApiKey(provider)
  }

  static async getApiBase(provider: ApiProvider): Promise<string | null> {
    const useUserConfig = await this.useUserConfig()
    if (useUserConfig) {
      return await UserApiConfigManager.getApiBase(provider)
    }

    // 回退到localStorage
    const { ApiConfigManager: LocalApiConfigManager } = await import('./api-config')
    return LocalApiConfigManager.getApiBase(provider)
  }

  static async getModel(provider: ApiProvider): Promise<string | null> {
    const useUserConfig = await this.useUserConfig()
    if (useUserConfig) {
      return await UserApiConfigManager.getModel(provider)
    }

    // 回退到localStorage
    const { ApiConfigManager: LocalApiConfigManager } = await import('./api-config')
    return LocalApiConfigManager.getModel(provider)
  }

  static async isConfigured(provider: ApiProvider): Promise<boolean> {
    const useUserConfig = await this.useUserConfig()
    if (useUserConfig) {
      return await UserApiConfigManager.isConfigured(provider)
    }

    // 回退到localStorage
    const { ApiConfigManager: LocalApiConfigManager } = await import('./api-config')
    return LocalApiConfigManager.isConfigured(provider)
  }
}