import { NextRequest, NextResponse } from 'next/server'
import { deepAnalyzeArticles, generateSmartTopicInsights } from '@/lib/ai-service'
import { getUserFromRequest } from '@/lib/user-auth'

export async function POST(request: NextRequest) {
  try {
    const { keyword, count = 5 } = await request.json()

    if (!keyword) {
      return NextResponse.json(
        { error: '关键词不能为空' },
        { status: 400 }
      )
    }

    console.log('🔍 [AI分析API] 开始分析关键词:', keyword)

    // 获取用户信息
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: '用户未登录，请先登录' },
        { status: 401 }
      )
    }

    console.log('👤 [AI分析API] 用户信息:', { userId: user.userId, email: user.email })

    try {
      // 调用我们的搜索API获取文章数据
      console.log('📡 [AI分析API] 开始搜索微信文章...')

      const baseUrl = process.env.VERCEL === '1'
        ? 'https://content-factory-v3-g6axra5we-liuzhimins-projects.vercel.app'
        : 'http://localhost:3000'

      console.log('📡 [AI分析API] 请求基础URL:', baseUrl)
      console.log('📡 [AI分析API] 请求参数:', { keyword, count, period: 7 })

      const searchUrl = `${baseUrl}/api/search-articles?keyword=${encodeURIComponent(keyword)}&limit=${count}&period=7`
      console.log('📡 [AI分析API] 完整请求URL:', searchUrl)

      const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 [AI分析API] 搜索响应状态:', {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        ok: searchResponse.ok
      })

      if (!searchResponse.ok) {
        console.error('❌ [AI分析API] 搜索请求失败:', {
          status: searchResponse.status,
          statusText: searchResponse.statusText,
          url: searchUrl
        })
        throw new Error(`搜索请求失败: ${searchResponse.status} ${searchResponse.statusText}`)
      }

      const searchResult = await searchResponse.json()
      console.log('📊 [AI分析API] 搜索结果结构:', {
        success: searchResult.success,
        hasData: !!searchResult.data,
        dataKeys: searchResult.data ? Object.keys(searchResult.data) : [],
        total: searchResult.data?.total || 0,
        count: searchResult.data?.articles?.length || 0,
        articlesKeys: searchResult.data?.articles?.[0] ? Object.keys(searchResult.data.articles[0]) : []
      })

      if (!searchResult.success) {
        throw new Error(searchResult.error || '搜索失败')
      }

      // 转换搜索API返回的数据格式为我们需要的格式
      const articles = searchResult.data.articles?.slice(0, count).map((article: any, index: number) => {
        console.log(`🔄 [AI分析API] 处理文章 ${index + 1}:`, {
          title: article.title,
          hasContent: !!article.content,
          hasDigest: !!article.digest,
          likeCount: article.likeCount,
          readCount: article.readCount
        })

        return {
          title: article.title || '无标题',
          content: article.content || article.digest || '无内容',
          likes: parseInt(article.likeCount || article.like_num || '0'),
          reads: parseInt(article.readCount || article.read_num || article.visit_num || '0'),
          url: article.url || article.link || '#',
          publishTime: article.publishTime || article.publish_time || article.update_time || article.create_time || Date.now(),
          author: article.author || article.source || article.nickname || '未知作者',
          cover: article.coverImage || article.cover || '',
          summary: article.digest || article.summary || (article.content ? article.content.substring(0, 200) + '...' : '')
        }
      }) || []

      if (articles.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            articles: [],
            summaries: [],
            insights: ['未找到相关文章，请尝试其他关键词'],
            stats: {
              totalArticles: 0,
              avgReads: 0,
              avgLikes: 0,
              avgEngagement: '0%'
            },
            analysisTime: Date.now(),
            message: '未找到相关文章'
          },
          message: '未找到相关文章'
        })
      }

      console.log('📝 [AI分析API] 开始深度分析文章...')

      // 阶段1: 深度文章分析
      const summaries = await deepAnalyzeArticles(articles)

      // 计算统计数据
      const totalReads = articles.reduce((sum: number, a: any) => sum + (a.reads || 0), 0)
      const totalLikes = articles.reduce((sum: number, a: any) => sum + (a.likes || 0), 0)

      const stats = {
        totalArticles: articles.length,
        avgReads: totalReads > 0 ? Math.round(totalReads / articles.length) : 0,
        avgLikes: totalLikes > 0 ? Math.round(totalLikes / articles.length) : 0,
        avgEngagement: totalReads > 0
          ? ((totalLikes / totalReads * 100).toFixed(1) + '%')
          : '0%'
      }

      console.log('🧠 [AI分析API] 生成智能洞察...')

      // 阶段2: 生成选题洞察
      const insights = await generateSmartTopicInsights(summaries, stats)

      // 构建完整的分析结果，包含时间戳
      const analysisResult = {
        articles,
        summaries,
        insights,
        stats,
        analysisTime: Date.now(),
        searchKeyword: keyword,
        searchTotal: searchResult.data?.total || 0
      }

      console.log('✅ [AI分析API] 分析完成')

      return NextResponse.json({
        success: true,
        data: analysisResult,
        message: `分析完成，找到${articles.length}篇相关文章`
      })

    } catch (searchError) {
      console.error('❌ [AI分析API] 搜索微信文章失败:', searchError)

      // 如果搜索失败，返回错误信息
      const errorMessage = searchError instanceof Error ? searchError.message : '搜索文章失败'

      return NextResponse.json({
        success: false,
        error: '搜索失败',
        message: errorMessage,
        details: '请检查微信搜索API配置是否正确'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ [AI分析API] 分析失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '分析失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}