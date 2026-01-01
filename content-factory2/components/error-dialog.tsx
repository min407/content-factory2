'use client'

import { useState, useCallback } from 'react'
import { AlertCircle, X, ExternalLink, Settings } from 'lucide-react'

/**
 * 错误类型定义
 */
export type ErrorType =
  | 'openrouter_token'     // OpenRouter令牌问题
  | 'jzl_balance'          // 极致了API余额不足
  | 'jzl_api'              // 极致了API错误
  | 'image_generation'     // 图片生成错误
  | 'network'              // 网络连接错误
  | 'timeout'              // 请求超时
  | 'unknown'              // 未知错误

/**
 * 错误信息结构
 */
export interface ErrorInfo {
  type: ErrorType
  title: string
  causes: string[]
  solutions: string[]
  showSettingsButton?: boolean
  showLogButton?: boolean
}

/**
 * 错误类型映射表
 */
const ERROR_TYPE_MAP: Record<ErrorType, ErrorInfo> = {
  openrouter_token: {
    type: 'openrouter_token',
    title: 'AI模型服务异常',
    causes: [
      'OpenRouter API令牌未配置或已失效',
      'OpenRouter账户余额不足',
      'API密钥被禁用或过期'
    ],
    solutions: [
      '前往"设置"→"API配置"检查OpenRouter密钥',
      '登录OpenRouter官网检查账户余额',
      '重新生成并配置新的API密钥',
      '点击"测试连接"验证配置是否正确'
    ],
    showSettingsButton: true,
    showLogButton: true
  },

  jzl_balance: {
    type: 'jzl_balance',
    title: '极致了API余额不足',
    causes: [
      '极致了API账户余额已用完',
      '未充值或充值未到账'
    ],
    solutions: [
      '登录极致了官网(https://dajiala.com)充值',
      '检查充值是否已到账',
      '如已充值，请等待5-10分钟后重试'
    ],
    showSettingsButton: true,
    showLogButton: true
  },

  jzl_api: {
    type: 'jzl_api',
    title: '极致了API调用失败',
    causes: [
      'API密钥配置错误',
      '网络连接不稳定',
      'API服务暂时不可用',
      '请求频率过高被限流'
    ],
    solutions: [
      '检查设置中的极致了API密钥是否正确',
      '检查网络连接是否正常',
      '稍等片刻后重试',
      '如持续失败，请联系极致了客服'
    ],
    showSettingsButton: true,
    showLogButton: true
  },

  image_generation: {
    type: 'image_generation',
    title: 'AI图片生成失败',
    causes: [
      '硅基流动API密钥未配置或已失效',
      '图片生成服务暂时不可用',
      '请求的图片尺寸或格式不支持',
      '生成内容触发了内容安全过滤'
    ],
    solutions: [
      '前往"设置"→"API配置"检查硅基流动密钥',
      '尝试更换图片比例重新生成',
      '简化提示词内容后重试',
      '稍后重试或联系技术支持'
    ],
    showSettingsButton: true,
    showLogButton: true
  },

  network: {
    type: 'network',
    title: '网络连接失败',
    causes: [
      '网络连接已断开',
      '无法访问外部API服务',
      '防火墙或代理设置阻止了请求'
    ],
    solutions: [
      '检查网络连接是否正常',
      '尝试刷新页面重新加载',
      '检查是否需要关闭VPN或代理',
      '尝试切换网络(如WiFi→移动数据)'
    ],
    showSettingsButton: false,
    showLogButton: true
  },

  timeout: {
    type: 'timeout',
    title: '请求超时',
    causes: [
      '网络响应速度过慢',
      'API服务器处理时间过长',
      '请求的数据量过大'
    ],
    solutions: [
      '检查网络连接速度',
      '稍后重试',
      '尝试减少生成内容数量',
      '如持续超时，可能是API服务问题，请稍后再试'
    ],
    showSettingsButton: false,
    showLogButton: true
  },

  unknown: {
    type: 'unknown',
    title: '未知错误',
    causes: [
      '发生了未预期的错误',
      'API返回了异常响应'
    ],
    solutions: [
      '尝试刷新页面',
      '检查浏览器控制台获取详细错误信息',
      '联系技术支持并提供错误详情'
    ],
    showSettingsButton: false,
    showLogButton: true
  }
}

/**
 * 根据错误消息识别错误类型
 */
export function identifyErrorType(errorMessage: string): ErrorType {
  const lowerMessage = errorMessage.toLowerCase()

  // OpenRouter令牌相关
  if (lowerMessage.includes('openrouter') ||
      lowerMessage.includes('401') ||
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('invalid api key') ||
      lowerMessage.includes('token') && lowerMessage.includes('invalid')) {
    return 'openrouter_token'
  }

  // 极致了余额不足
  if (lowerMessage.includes('金额不足') ||
      lowerMessage.includes('余额不足') ||
      lowerMessage.includes('insufficient') ||
      lowerMessage.includes('balance')) {
    return 'jzl_balance'
  }

  // 极致了API错误
  if (lowerMessage.includes('极致了') ||
      lowerMessage.includes('dajiala') ||
      lowerMessage.includes('jzl')) {
    return 'jzl_api'
  }

  // 图片生成错误
  if (lowerMessage.includes('图片生成') ||
      lowerMessage.includes('siliconflow') ||
      lowerMessage.includes('硅基流动') ||
      lowerMessage.includes('405') ||
      lowerMessage.includes('image')) {
    return 'image_generation'
  }

  // 网络错误
  if (lowerMessage.includes('network') ||
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('connection') ||
      lowerMessage.includes('econnrefused')) {
    return 'network'
  }

  // 超时错误
  if (lowerMessage.includes('timeout') ||
      lowerMessage.includes('timed out')) {
    return 'timeout'
  }

  return 'unknown'
}

/**
 * 错误弹窗组件属性
 */
interface ErrorDialogProps {
  isOpen: boolean
  errorType: ErrorType
  customMessage?: string
  technicalDetails?: string
  onClose: () => void
  onOpenSettings?: () => void
  onShowLog?: () => void
}

/**
 * 错误提示弹窗组件
 * 提供用户友好的错误信息和解决方案
 */
export function ErrorDialog({
  isOpen,
  errorType,
  customMessage,
  technicalDetails,
  onClose,
  onOpenSettings,
  onShowLog
}: ErrorDialogProps) {
  if (!isOpen) return null

  const errorInfo = ERROR_TYPE_MAP[errorType] || ERROR_TYPE_MAP.unknown

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {errorInfo.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 自定义消息 */}
          {customMessage && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                {customMessage}
              </p>
            </div>
          )}

          /* 可能的原因 */
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm">
                ?
              </span>
              可能的原因
            </h3>
            <ul className="space-y-2 ml-8">
              {errorInfo.causes.map((cause, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{cause}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 解决方案 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm">
                ✓
              </span>
              解决方案
            </h3>
            <ul className="space-y-2 ml-8">
              {errorInfo.solutions.map((solution, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-green-500 mt-1">→</span>
                  <span>{solution}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 技术详情（可折叠） */}
          {technicalDetails && (
            <details className="bg-gray-50 dark:bg-gray-900 rounded-lg">
              <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                查看技术详情
              </summary>
              <pre className="px-4 pb-4 text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                {technicalDetails}
              </pre>
            </details>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {errorInfo.showSettingsButton && onOpenSettings && (
            <button
              onClick={() => {
                onClose()
                onOpenSettings()
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              前往设置
            </button>
          )}

          {errorInfo.showLogButton && onShowLog && (
            <button
              onClick={() => {
                onClose()
                onShowLog()
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              查看详细日志
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook: 使用错误弹窗
 */
export function useErrorDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [errorType, setErrorType] = useState<ErrorType>('unknown')
  const [customMessage, setCustomMessage] = useState<string>()
  const [technicalDetails, setTechnicalDetails] = useState<string>()

  const showError = useCallback((
    type: ErrorType | string,
    message?: string,
    details?: string
  ) => {
    const identifiedType = typeof type === 'string'
      ? identifyErrorType(type)
      : type

    setErrorType(identifiedType)
    setCustomMessage(message)
    setTechnicalDetails(details)
    setIsOpen(true)
  }, [])

  const hideError = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    errorType,
    customMessage,
    technicalDetails,
    showError,
    hideError,
    setIsOpen
  }
}
