import { NextRequest, NextResponse } from 'next/server'
import { deepAnalyzeArticles, generateSmartTopicInsights } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    const { keyword, count = 5 } = await request.json()

    if (!keyword) {
      return NextResponse.json(
        { error: '关键词不能为空' },
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

    // 阶段1: 深度文章分析
    const summaries = await deepAnalyzeArticles(mockArticles)

    // 计算统计数据
    const totalReads = mockArticles.reduce((sum, a) => sum + (a.read || 0), 0)
    const totalLikes = mockArticles.reduce((sum, a) => sum + (a.praise || 0), 0)

    const stats = {
      totalArticles: mockArticles.length,
      avgReads: Math.round(totalReads / mockArticles.length),
      avgLikes: Math.round(totalLikes / mockArticles.length),
      avgEngagement: totalReads > 0
        ? ((totalLikes / totalReads * 100).toFixed(1) + '%')
        : '0%'
    }

    // 阶段2: 生成选题洞察
    const insights = await generateSmartTopicInsights(summaries, stats)

    return NextResponse.json({
      success: true,
      data: {
        articles: mockArticles,
        summaries,
        insights,
        stats
      }
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