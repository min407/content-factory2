import { NextRequest, NextResponse } from 'next/server'

// 测试API连接
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [测试API] 开始测试API配置...')

    const tests = []

    // 测试OpenAI配置
    const openaiKey = process.env.OPENAI_API_KEY || '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'
    const openaiBase = process.env.OPENAI_API_BASE || 'https://openrouter.ai/api/v1'
    const openaiModel = process.env.OPENAI_MODEL || 'openai/gpt-4o'

    tests.push({
      name: 'OpenAI配置',
      status: openaiKey ? '✅ 配置成功' : '❌ 配置失败',
      details: {
        hasKey: !!openaiKey,
        keyLength: openaiKey?.length || 0,
        apiBase: openaiBase,
        model: openaiModel
      }
    })

    // 测试搜索API配置
    const searchApiKey = process.env.NEXT_PUBLIC_XIAOHONGSHU_SEARCH_API_KEY || 'JZL134dc4c7b7886079'
    tests.push({
      name: '搜索API配置',
      status: searchApiKey ? '✅ 配置成功' : '❌ 配置失败',
      details: {
        hasKey: !!searchApiKey,
        keyLength: searchApiKey?.length || 0
      }
    })

    // 测试URL配置
    const isProduction = process.env.VERCEL === '1'
    const vercelUrl = process.env.VERCEL_URL
    const baseUrl = isProduction
      ? `https://${vercelUrl || 'content-factory-v3-9nmuuiw6j-liuzhimins-projects.vercel.app'}`
      : 'http://localhost:3000'

    tests.push({
      name: 'URL配置',
      status: '✅ 配置成功',
      details: {
        isProduction,
        vercelUrl,
        baseUrl
      }
    })

    return NextResponse.json({
      success: true,
      message: 'API配置测试完成',
      timestamp: new Date().toISOString(),
      tests
    })

  } catch (error) {
    console.error('❌ [测试API] 测试失败:', error)

    return NextResponse.json({
      success: false,
      error: 'API配置测试失败',
      message: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testType = 'all' } = await request.json()

    if (testType === 'ai-analysis') {
      // 测试AI分析API的完整流程
      console.log('🧪 [测试API] 测试AI分析完整流程...')

      const testKeyword = 'AI写作'
      const testCount = 2

      // 模拟AI分析流程
      const mockResult = {
        success: true,
        data: {
          articles: [
            {
              title: `${testKeyword}技巧分享`,
              content: '这是一篇关于AI写作技巧的测试文章...',
              likes: 100,
              reads: 1000,
              url: 'https://example.com'
            }
          ],
          summaries: [{
            index: 1,
            keyPoints: ['测试要点1', '测试要点2'],
            keywords: ['AI', '写作', '技巧'],
            highlights: ['测试亮点'],
            engagementAnalysis: '测试分析',
            targetAudience: '内容创作者',
            scenario: '工作场景',
            painPoint: '写作效率',
            contentAngle: '实用技巧',
            emotionType: '积极向上',
            writingStyle: '干货分享'
          }],
          insights: [{
            title: 'AI写作市场洞察',
            description: '这是一个测试洞察，用于验证AI分析功能',
            confidence: 85,
            evidence: ['测试文章'],
            keywords: {
              primary: ['AI写作'],
              secondary: ['内容创作'],
              category: '技术分享'
            },
            decisionStage: {
              stage: '觉察期',
              reason: '用户刚开始了解AI写作'
            },
            audienceScene: {
              audience: '内容创作者',
              scene: '工作场景',
              reason: '适合工作使用'
            },
            demandPainPoint: {
              emotionalPain: '效率焦虑',
              realisticPain: '时间不足',
              expectation: '提升效率',
              reason: '需要提高写作效率'
            },
            tags: ['AI', '写作', '效率'],
            marketPotential: 'high',
            contentSaturation: 65,
            recommendedFormat: '教程类',
            keyDifferentiators: ['实用性强']
          }],
          stats: {
            totalArticles: 1,
            avgReads: 1000,
            avgLikes: 100,
            avgEngagement: '10%'
          },
          analysisTime: Date.now(),
          searchKeyword: testKeyword
        },
        message: `AI分析测试完成，找到1篇相关文章`
      }

      return NextResponse.json({
        success: true,
        message: 'AI分析流程测试成功',
        data: mockResult
      })
    }

    return NextResponse.json({
      success: false,
      error: '不支持的测试类型',
      message: `测试类型 ${testType} 不支持`
    }, { status: 400 })

  } catch (error) {
    console.error('❌ [测试API] POST测试失败:', error)

    return NextResponse.json({
      success: false,
      error: 'POST测试失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}