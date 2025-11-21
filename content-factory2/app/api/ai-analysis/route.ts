import { NextRequest, NextResponse } from 'next/server'
import { deepAnalyzeArticles, generateSmartTopicInsights } from '@/lib/ai-service'
import { SessionStorage } from '@/lib/data-storage'
import { UserApiConfigManager } from '@/lib/user-api-config'
import { UserConfigStorage } from '@/lib/data-storage'
import { ApiProvider } from '@/types/api-config'

/**
 * 从请求中获取用户信息
 */
async function getUserFromRequest(request: NextRequest): Promise<{ userId: string; email: string } | null> {
  const sessionToken = request.cookies.get('session_token')?.value

  if (!sessionToken) {
    return null
  }

  const session = await SessionStorage.getSession(sessionToken)
  if (!session) {
    return null
  }

  return {
    userId: session.userId,
    email: session.email
  }
}

/**
 * 直接从数据库获取用户的API配置
 */
async function getUserApiConfig(userId: string, provider: ApiProvider): Promise<{
  apiKey: string | null
  apiBase: string | null
  model: string | null
}> {
  try {
    const configs = await UserConfigStorage.getUserConfigs(userId)
    const config = configs.find(c => c.provider === provider)

    if (config && config.apiKey) {
      console.log(`🔑 [AI分析API] 使用用户配置 (${provider}): ${config.apiKey.substring(0, 8)}...`)
      return {
        apiKey: config.apiKey,
        apiBase: config.apiBase || 'https://openrouter.ai/api/v1',
        model: config.model || 'openai/gpt-4o'
      }
    }

    // 回退到环境变量
    const envKey = process.env.OPENAI_API_KEY
    const envBase = process.env.OPENAI_API_BASE || 'https://openrouter.ai/api/v1'
    const envModel = process.env.OPENAI_MODEL || 'openai/gpt-4o'

    if (envKey) {
      console.log(`🔑 [AI分析API] 使用环境变量 (${provider}): ${envKey.substring(0, 8)}...`)
      return {
        apiKey: envKey,
        apiBase: envBase,
        model: envModel
      }
    }

    console.log(`❌ [AI分析API] 未找到API配置 (${provider})`)
    return {
      apiKey: null,
      apiBase: null,
      model: null
    }
  } catch (error) {
    console.error('❌ [AI分析API] 获取用户配置失败:', error)
    return {
      apiKey: null,
      apiBase: null,
      model: null
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // 获取用户信息
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: '用户未登录，请先登录' },
        { status: 401 }
      )
    }


    const { keyword, count = 5 } = await request.json()

    if (!keyword) {
      return NextResponse.json(
        { error: '关键词不能为空' },
        { status: 400 }
      )
    }

    // 获取用户的API配置
    const userApiConfig = await getUserApiConfig(user.userId, ApiProvider.OPENROUTER)
    if (!userApiConfig.apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API密钥未配置，请先在API设置中配置' },
        { status: 400 }
      )
    }

    // 模拟获取公众号文章数据（实际应该调用公众号API）
    const mockArticles = Array.from({ length: count }, (_, i) => ({
      title: `${keyword}相关文章${i + 1}`,
      content: `这是关于${keyword}的详细内容，包含了相关的分析和案例。`,
      likes: Math.floor(Math.random() * 1000) + 50,
      reads: Math.floor(Math.random() * 10000) + 500,
      url: `http://weixin.qq.com/article/${i + 1}`
    }))

    // 阶段1: 深度文章分析（使用用户配置）
    const summaries = await deepAnalyzeArticles(mockArticles, userApiConfig)

    // 计算统计数据
    const totalReads = mockArticles.reduce((sum, a) => sum + (a.reads || 0), 0)
    const totalLikes = mockArticles.reduce((sum, a) => sum + (a.likes || 0), 0)

    const stats = {
      totalArticles: mockArticles.length,
      avgReads: Math.round(totalReads / mockArticles.length),
      avgLikes: Math.round(totalLikes / mockArticles.length),
      avgEngagement: totalReads > 0
        ? ((totalLikes / totalReads * 100).toFixed(1) + '%')
        : '0%'
    }

    // 阶段2: 生成选题洞察（使用用户配置）
    const insights = await generateSmartTopicInsights(summaries, stats, userApiConfig)

    // 构建完整的分析结果，包含时间戳
    const analysisResult = {
      articles: mockArticles,
      summaries,
      insights,
      stats,
      analysisTime: Date.now()
    }

    // 保存到localStorage（通过客户端处理）
    return NextResponse.json({
      success: true,
      data: analysisResult,
      message: '分析完成，洞察已保存到本地'
    })

  } catch (error) {
    console.error('AI分析API错误:', error)
    return NextResponse.json(
      {
        error: '分析失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}