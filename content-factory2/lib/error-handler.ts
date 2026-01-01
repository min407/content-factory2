/**
 * 错误处理工具类
 * 提供统一的错误识别、分类和处理机制
 */

import { identifyErrorType } from '@/components/error-dialog'

/**
 * 应用层错误类型
 */
export enum AppErrorCode {
  // OpenRouter相关
  OPENROUTER_TOKEN_INVALID = 'OPENROUTER_TOKEN_INVALID',
  OPENROUTER_INSUFFICIENT_BALANCE = 'OPENROUTER_INSUFFICIENT_BALANCE',
  OPENROUTER_API_ERROR = 'OPENROUTER_API_ERROR',

  // 极致了API相关
  JZL_INSUFFICIENT_BALANCE = 'JZL_INSUFFICIENT_BALANCE',
  JZL_API_ERROR = 'JZL_API_ERROR',
  JZL_NETWORK_ERROR = 'JZL_NETWORK_ERROR',

  // 图片生成相关
  IMAGE_GENERATION_ERROR = 'IMAGE_GENERATION_ERROR',
  IMAGE_API_KEY_INVALID = 'IMAGE_API_KEY_INVALID',
  IMAGE_TIMEOUT = 'IMAGE_TIMEOUT',

  // 网络相关
  NETWORK_ERROR = 'NETWORK_ERROR',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',

  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 增强的错误信息
 */
export interface EnhancedError extends Error {
  code: AppErrorCode
  userMessage: string
  technicalMessage: string
  originalError?: Error
  canRetry: boolean
  suggestedActions: string[]
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  /**
   * 捕获并增强错误
   */
  static capture(error: unknown, context?: string): EnhancedError {
    // 如果已经是增强错误，直接返回
    if (this.isEnhancedError(error)) {
      return error as EnhancedError
    }

    // 转换为标准Error对象
    const standardError = this.toStandardError(error)

    // 识别错误类型
    const errorType = identifyErrorType(standardError.message)
    const errorCode = this.mapToErrorCode(errorType, standardError)

    // 构建增强错误
    return {
      ...standardError,
      code: errorCode,
      userMessage: this.getUserMessage(errorCode),
      technicalMessage: this.getTechnicalMessage(standardError),
      originalError: standardError,
      canRetry: this.canRetry(errorCode),
      suggestedActions: this.getSuggestedActions(errorCode)
    }
  }

  /**
   * 判断是否为增强错误
   */
  private static isEnhancedError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'userMessage' in error &&
      'canRetry' in error
    )
  }

  /**
   * 转换为标准Error对象
   */
  private static toStandardError(error: unknown): Error {
    if (error instanceof Error) {
      return error
    }

    if (typeof error === 'string') {
      return new Error(error)
    }

    return new Error('未知错误')
  }

  /**
   * 映射到错误代码
   */
  private static mapToErrorCode(errorType: string, error: Error): AppErrorCode {
    const message = error.message.toLowerCase()

    switch (errorType) {
      case 'openrouter_token':
        if (message.includes('401') || message.includes('unauthorized')) {
          return AppErrorCode.OPENROUTER_TOKEN_INVALID
        }
        if (message.includes('balance') || message.includes('insufficient')) {
          return AppErrorCode.OPENROUTER_INSUFFICIENT_BALANCE
        }
        return AppErrorCode.OPENROUTER_API_ERROR

      case 'jzl_balance':
        return AppErrorCode.JZL_INSUFFICIENT_BALANCE

      case 'jzl_api':
        if (message.includes('network') || message.includes('fetch')) {
          return AppErrorCode.JZL_NETWORK_ERROR
        }
        return AppErrorCode.JZL_API_ERROR

      case 'image_generation':
        if (message.includes('401') || message.includes('unauthorized') || message.includes('api key')) {
          return AppErrorCode.IMAGE_API_KEY_INVALID
        }
        if (message.includes('timeout') || message.includes('timed out')) {
          return AppErrorCode.IMAGE_TIMEOUT
        }
        return AppErrorCode.IMAGE_GENERATION_ERROR

      case 'network':
        return AppErrorCode.NETWORK_ERROR

      case 'timeout':
        return AppErrorCode.REQUEST_TIMEOUT

      default:
        return AppErrorCode.UNKNOWN_ERROR
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  private static getUserMessage(code: AppErrorCode): string {
    const messages: Record<AppErrorCode, string> = {
      [AppErrorCode.OPENROUTER_TOKEN_INVALID]: 'AI模型令牌无效或已过期，请检查配置',
      [AppErrorCode.OPENROUTER_INSUFFICIENT_BALANCE]: 'AI模型账户余额不足，请充值',
      [AppErrorCode.OPENROUTER_API_ERROR]: 'AI模型服务异常，请稍后重试',
      [AppErrorCode.JZL_INSUFFICIENT_BALANCE]: '极致了API余额不足，请充值',
      [AppErrorCode.JZL_API_ERROR]: '极致了API调用失败，请检查配置或稍后重试',
      [AppErrorCode.JZL_NETWORK_ERROR]: '极致了API网络连接失败，请检查网络',
      [AppErrorCode.IMAGE_GENERATION_ERROR]: '图片生成失败，请稍后重试',
      [AppErrorCode.IMAGE_API_KEY_INVALID]: '图片生成API密钥无效，请检查配置',
      [AppErrorCode.IMAGE_TIMEOUT]: '图片生成超时，请稍后重试',
      [AppErrorCode.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
      [AppErrorCode.REQUEST_TIMEOUT]: '请求超时，请稍后重试',
      [AppErrorCode.UNKNOWN_ERROR]: '发生未知错误，请稍后重试'
    }

    return messages[code] || messages[AppErrorCode.UNKNOWN_ERROR]
  }

  /**
   * 获取技术消息
   */
  private static getTechnicalMessage(error: Error): string {
    return error.message || error.stack || 'No technical details available'
  }

  /**
   * 判断是否可重试
   */
  private static canRetry(code: AppErrorCode): boolean {
    const retryableCodes = [
      AppErrorCode.OPENROUTER_API_ERROR,
      AppErrorCode.JZL_API_ERROR,
      AppErrorCode.JZL_NETWORK_ERROR,
      AppErrorCode.IMAGE_GENERATION_ERROR,
      AppErrorCode.IMAGE_TIMEOUT,
      AppErrorCode.NETWORK_ERROR,
      AppErrorCode.REQUEST_TIMEOUT
    ]

    return retryableCodes.includes(code)
  }

  /**
   * 获取建议操作
   */
  private static getSuggestedActions(code: AppErrorCode): string[] {
    const actions: Record<AppErrorCode, string[]> = {
      [AppErrorCode.OPENROUTER_TOKEN_INVALID]: [
        '检查"设置"→"API配置"中的OpenRouter密钥',
        '重新生成并配置新的API密钥',
        '点击"测试连接"验证配置'
      ],
      [AppErrorCode.OPENROUTER_INSUFFICIENT_BALANCE]: [
        '登录OpenRouter官网充值',
        '检查充值是否已到账',
        '考虑切换到其他AI模型提供商'
      ],
      [AppErrorCode.OPENROUTER_API_ERROR]: [
        '检查网络连接是否正常',
        '稍等片刻后重试',
        '如持续失败，请联系OpenRouter客服'
      ],
      [AppErrorCode.JZL_INSUFFICIENT_BALANCE]: [
        '登录极致了官网(https://dajiala.com)充值',
        '检查充值是否已到账',
        '如已充值，请等待5-10分钟后重试'
      ],
      [AppErrorCode.JZL_API_ERROR]: [
        '检查设置中的极致了API密钥是否正确',
        '检查网络连接是否正常',
        '稍后重试'
      ],
      [AppErrorCode.JZL_NETWORK_ERROR]: [
        '检查网络连接是否正常',
        '尝试刷新页面',
        '检查是否需要关闭VPN或代理'
      ],
      [AppErrorCode.IMAGE_GENERATION_ERROR]: [
        '检查"设置"→"API配置"中的硅基流动密钥',
        '尝试更换图片比例重新生成',
        '稍后重试'
      ],
      [AppErrorCode.IMAGE_API_KEY_INVALID]: [
        '检查"设置"→"API配置"中的硅基流动密钥',
        '重新配置正确的API密钥',
        '点击"测试连接"验证配置'
      ],
      [AppErrorCode.IMAGE_TIMEOUT]: [
        '检查网络连接速度',
        '稍后重试',
        '尝试减少生成内容数量'
      ],
      [AppErrorCode.NETWORK_ERROR]: [
        '检查网络连接是否正常',
        '尝试刷新页面',
        '切换网络(如WiFi→移动数据)'
      ],
      [AppErrorCode.REQUEST_TIMEOUT]: [
        '检查网络连接速度',
        '稍后重试',
        '尝试减少生成内容数量'
      ],
      [AppErrorCode.UNKNOWN_ERROR]: [
        '尝试刷新页面',
        '检查浏览器控制台获取详细错误信息',
        '联系技术支持'
      ]
    }

    return actions[code] || actions[AppErrorCode.UNKNOWN_ERROR]
  }

  /**
   * 从Fetch响应构建错误
   */
  static async fromFetchResponse(response: Response, context?: string): Promise<EnhancedError> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`

    try {
      const clonedResponse = response.clone()
      const data = await clonedResponse.json()

      if (data.error?.message) {
        errorMessage = data.error.message
      } else if (data.message) {
        errorMessage = data.message
      } else if (data.msg) {
        errorMessage = data.msg
      }
    } catch {
      // 如果无法解析JSON，使用默认错误消息
    }

    return this.capture(new Error(errorMessage), context)
  }

  /**
   * 包装异步函数以自动捕获错误
   */
  static async wrap<T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      throw this.capture(error, context)
    }
  }
}

/**
 * 创建错误日志记录器
 */
export class ErrorLogger {
  private static logs: Array<{
    timestamp: number
    error: EnhancedError
    context?: string
  }> = []

  /**
   * 记录错误
   */
  static log(error: EnhancedError, context?: string): void {
    const logEntry = {
      timestamp: Date.now(),
      error,
      context
    }

    this.logs.push(logEntry)

    // 只保留最近100条日志
    if (this.logs.length > 100) {
      this.logs.shift()
    }

    // 在开发环境打印到控制台
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ErrorLogger] ${context || 'Unknown context'}:`, {
        code: error.code,
        userMessage: error.userMessage,
        technicalMessage: error.technicalMessage,
        canRetry: error.canRetry
      })
    }
  }

  /**
   * 获取所有日志
   */
  static getAll(): Array<{
    timestamp: number
    error: EnhancedError
    context?: string
  }> {
    return [...this.logs]
  }

  /**
   * 清空日志
   */
  static clear(): void {
    this.logs = []
  }

  /**
   * 获取最近的错误
   */
  static getRecent(count: number = 10): Array<{
    timestamp: number
    error: EnhancedError
    context?: string
  }> {
    return this.logs.slice(-count)
  }
}
