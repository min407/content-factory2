import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/user-auth'
import { UserConfigStorage } from '@/lib/data-storage-hybrid'
import type { ApiTestResult } from '@/types/api-config'

/**
 * API连接测试路由
 * POST - 测试指定API提供商的连接
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider, config } = body

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少API提供商参数'
        },
        { status: 400 }
      )
    }

    console.log('🔗 [API测试] 开始测试API连接:', provider)

    // 获取用户信息
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '用户未认证'
        },
        { status: 401 }
      )
    }

    let testConfig = config

    // 如果没有提供配置，从用户存储中获取
    if (!testConfig) {
      const configs = await UserConfigStorage.getUserConfigs(user.userId)
      testConfig = configs.find(c => c.provider === provider)
    }

    if (!testConfig || !testConfig.apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: '未找到API配置或API密钥为空'
        },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    let testResult: ApiTestResult

    try {
      switch (provider) {
        case 'openrouter':
          testResult = await testOpenRouterAPI(testConfig)
          break
        case 'siliconflow':
          testResult = await testSiliconFlowAPI(testConfig)
          break
        case 'wechat_publish':
          testResult = await testWechatPublishAPI(testConfig)
          break
        case 'wechat_search':
          testResult = await testWechatSearchAPI(testConfig)
          break
        default:
          testResult = {
            success: false,
            message: `不支持的API提供商: ${provider}`,
            responseTime: 0,
            timestamp: new Date()
          }
      }
    } catch (error) {
      testResult = {
        success: false,
        message: error instanceof Error ? error.message : 'API测试失败',
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      }
    }

    console.log('🔗 [API测试] 测试结果:', {
      provider,
      success: testResult.success,
      responseTime: testResult.responseTime,
      message: testResult.message
    })

    return NextResponse.json(testResult)
  } catch (error) {
    console.error('❌ [API测试] 测试过程失败:', error)

    const errorResult: ApiTestResult = {
      success: false,
      message: error instanceof Error ? error.message : '连接测试失败',
      responseTime: 0,
      timestamp: new Date()
    }

    return NextResponse.json(errorResult, { status: 500 })
  }
}

/**
 * 测试OpenRouter API连接
 */
async function testOpenRouterAPI(config: any): Promise<ApiTestResult> {
  const startTime = Date.now()

  try {
    const response = await fetch(`${config.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://content-factory.vercel.app',
        'X-Title': 'Content Factory'
      },
      body: JSON.stringify({
        model: config.model || 'openai/gpt-4o',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a connection test. Please respond with "OK".'
          }
        ],
        max_tokens: 10,
        temperature: 0.1
      })
    })

    const responseTime = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [OpenRouter测试] API响应错误:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 200)
      })

      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.choices && data.choices.length > 0) {
      return {
        success: true,
        message: 'OpenRouter API连接成功',
        responseTime,
        timestamp: new Date(),
        details: {
          model: data.model,
          usage: data.usage
        }
      }
    } else {
      throw new Error('API响应格式异常')
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'OpenRouter连接失败',
      responseTime: Date.now() - startTime,
      timestamp: new Date()
    }
  }
}

/**
 * 测试SiliconFlow API连接
 */
async function testSiliconFlowAPI(config: any): Promise<ApiTestResult> {
  const startTime = Date.now()

  try {
    console.log('🔗 [SiliconFlow测试] 开始测试:', {
      apiBase: config.apiBase,
      hasApiKey: !!config.apiKey,
      model: config.model
    })

    // 智能构建API URL
    let apiUrl = config.apiBase

    // 如果apiBase已经包含了完整路径，直接使用
    if (apiUrl.includes('/chat/completions') || apiUrl.includes('/images/generations')) {
      // 如果是图片生成API，改为聊天API进行测试
      if (apiUrl.includes('/images/generations')) {
        apiUrl = apiUrl.replace('/images/generations', '/chat/completions')
      }
    } else {
      // 否则添加chat/completions路径
      apiUrl = `${config.apiBase}/chat/completions`
    }

    console.log('🔗 [SiliconFlow测试] 请求URL:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model || 'deepseek-ai/DeepSeek-V3',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a connection test. Please respond with "OK".'
          }
        ],
        max_tokens: 10,
        temperature: 0.1
      })
    })

    const responseTime = Date.now() - startTime

    console.log('🔗 [SiliconFlow测试] 响应状态:', {
      status: response.status,
      statusText: response.statusText,
      responseTime
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [SiliconFlow测试] API响应错误:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 200)
      })
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    console.log('🔗 [SiliconFlow测试] 响应数据:', {
      hasChoices: !!(data.choices && data.choices.length > 0),
      model: data.model,
      usage: data.usage
    })

    if (data.choices && data.choices.length > 0) {
      return {
        success: true,
        message: 'SiliconFlow API连接成功',
        responseTime,
        timestamp: new Date(),
        details: {
          model: data.model,
          usage: data.usage,
          testUrl: apiUrl
        }
      }
    } else {
      throw new Error('API响应格式异常')
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('❌ [SiliconFlow测试] 连接失败:', {
      error: error instanceof Error ? error.message : error,
      responseTime
    })

    let errorMessage = error instanceof Error ? error.message : 'SiliconFlow连接失败'

    // 针对不同类型的错误提供更友好的错误信息
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        errorMessage = 'API端点不存在，请检查API地址配置是否正确'
      } else if (error.message.includes('401')) {
        errorMessage = 'API密钥无效或已过期'
      } else if (error.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查网络或API服务状态'
      }
    }

    return {
      success: false,
      message: errorMessage,
      responseTime,
      timestamp: new Date(),
      details: {
        originalError: error instanceof Error ? error.message : 'Unknown error',
        apiBase: config.apiBase
      }
    }
  }
}

/**
 * 测试微信公众号发布API连接
 */
async function testWechatPublishAPI(config: any): Promise<ApiTestResult> {
  const startTime = Date.now()

  try {
    console.log('🔗 [微信发布测试] 开始测试:', {
      apiBase: config.apiBase,
      hasApiKey: !!config.apiKey
    })

    // 使用正确的API endpoint，支持多种可能的URL格式
    let apiUrl = config.apiBase
    if (!apiUrl.includes('wechat-accounts')) {
      // 如果URL不包含具体endpoint，构建完整的URL
      const baseUrl = config.apiBase?.replace('/api/openapi', '') || 'https://wx.limyai.com'
      apiUrl = `${baseUrl}/api/openapi/wechat-accounts`
    }

    console.log('🔗 [微信发布测试] 请求URL:', apiUrl)

    // 创建AbortController用于超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Content-Factory/1.0)'
      },
      body: JSON.stringify({}),
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime

    console.log('🔗 [微信发布测试] 响应状态:', {
      status: response.status,
      statusText: response.statusText,
      responseTime
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [微信发布测试] API响应错误:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 200)
      })
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('🔗 [微信发布测试] 响应数据:', {
      success: data.success,
      hasData: !!data.data,
      accountsCount: data.data?.accounts?.length || 0
    })

    if (data.success) {
      return {
        success: true,
        message: '微信公众号发布API连接成功',
        responseTime,
        timestamp: new Date(),
        details: {
          accountsCount: data.data?.accounts?.length || 0,
          apiUrl: apiUrl
        }
      }
    } else {
      throw new Error(data.error || 'API返回失败')
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('❌ [微信发布测试] 连接失败:', {
      error: error instanceof Error ? error.message : error,
      responseTime
    })

    let errorMessage = error instanceof Error ? error.message : '微信公众号发布API连接失败'

    // 针对不同类型的错误提供更友好的错误信息
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = '连接超时，请检查网络或API服务状态'
      } else if (error.message.includes('fetch')) {
        errorMessage = '网络连接失败，可能是CORS限制或API服务不可用'
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'API服务器连接被拒绝'
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'API服务器域名无法解析'
      }
    }

    return {
      success: false,
      message: errorMessage,
      responseTime,
      timestamp: new Date(),
      details: {
        originalError: error instanceof Error ? error.message : 'Unknown error',
        apiUrl: config.apiBase
      }
    }
  }
}

/**
 * 测试微信公众号搜索API连接
 */
async function testWechatSearchAPI(config: any): Promise<ApiTestResult> {
  const startTime = Date.now()

  try {
    const response = await fetch(`${config.apiBase}?kw=test&period=7&sort_type=1&mode=1&limit=1`, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    const responseTime = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.data && Array.isArray(data.data)) {
      return {
        success: true,
        message: '微信公众号搜索API连接成功',
        responseTime,
        timestamp: new Date(),
        details: {
          resultsCount: data.data.length
        }
      }
    } else {
      throw new Error('API响应格式异常')
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '微信公众号搜索API连接失败',
      responseTime: Date.now() - startTime,
      timestamp: new Date()
    }
  }
}

/**
 * 获取测试状态（预留接口）
 */
export async function GET() {
  return NextResponse.json({
    success: false,
    error: '方法不支持',
    message: '请使用POST方法测试API连接'
  }, { status: 405 })
}