import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import { join } from 'path'
import { searchWeChatArticles } from '@/lib/wechat-api'

// 数据库路径
const dbPath = join(process.cwd(), 'content-factory.db')

// 初始化数据库表
function initDatabase() {
  const db = new Database(dbPath)

  // 创建选题分析结果表
  db.exec(`
    CREATE TABLE IF NOT EXISTS topic_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_article_id INTEGER NOT NULL,
      keywords TEXT,
      article_count INTEGER DEFAULT 0,
      total_reads INTEGER DEFAULT 0,
      avg_reads INTEGER DEFAULT 0,
      max_reads INTEGER DEFAULT 0,
      last_month INTEGER DEFAULT 0,
      this_month INTEGER DEFAULT 0,
      last_week INTEGER DEFAULT 0,
      competition TEXT DEFAULT 'medium',
      opportunity TEXT DEFAULT 'average',
      suggestion TEXT,
      hot_articles TEXT,
      analysis_data TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (source_article_id) REFERENCES target_articles(id)
    )
  `)

  // 创建创作选题表
  db.exec(`
    CREATE TABLE IF NOT EXISTS creation_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source_type TEXT DEFAULT 'benchmark',
      source_article_id INTEGER,
      analysis_id INTEGER,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (source_article_id) REFERENCES target_articles(id),
      FOREIGN KEY (analysis_id) REFERENCES topic_analysis(id)
    )
  `)

  db.close()
}

// 提取标题关键词
function extractKeywords(title: string): string[] {
  // 简单的关键词提取逻辑
  const keywords: string[] = []

  // 移除常见的无意义词汇
  const stopWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']

  // 分词
  const words = title
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ') // 保留中文、英文、数字和空格
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.includes(word))

  // 去重并选择前5个关键词
  return Array.from(new Set(words)).slice(0, 5)
}

// 计算市场评估
function calculateMarketAssessment(
  articleCount: number,
  avgReads: number,
  recentActivity: { thisMonth: number; lastWeek: number; isActive: boolean }
): { competition: string; opportunity: string; suggestion: string } {
  // 竞争程度评估
  let competition = 'medium'
  if (articleCount < 10) competition = 'low'
  else if (articleCount > 30) competition = 'high'

  // 机会评估
  let opportunity = 'average'
  if (avgReads > 20000 && recentActivity.isActive) opportunity = 'good'
  else if (avgReads < 5000 || !recentActivity.isActive) opportunity = 'poor'

  // 生成建议
  let suggestion = ''
  if (opportunity === 'good') {
    suggestion = `该选题市场表现优秀，平均阅读量${avgReads}，近期活跃度高，建议优先创作。`
  } else if (opportunity === 'average') {
    if (competition === 'high') {
      suggestion = `该选题竞争激烈(${articleCount}篇文章)，但有一定市场空间，建议差异化创作。`
    } else {
      suggestion = `该选题市场表现一般，可以考虑创作，建议优化内容质量。`
    }
  } else {
    suggestion = `该选题市场表现较差，建议谨慎考虑或等待更好的时机。`
  }

  return { competition, opportunity, suggestion }
}

// POST - 分析选题市场热度
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { articleIds, refresh = false } = body

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json(
        { success: false, message: '请提供要分析的文章ID' },
        { status: 400 }
      )
    }

    initDatabase()
    const db = new Database(dbPath)

    const results = []

    for (const articleId of articleIds) {
      try {
        // 获取文章信息
        const article = db.prepare('SELECT id, title, reads FROM target_articles WHERE id = ?').get(articleId) as any
        if (!article) continue

        // 检查是否已有分析记录（除非强制刷新）
        if (!refresh) {
          const existingAnalysis = db.prepare('SELECT id FROM topic_analysis WHERE source_article_id = ?').get(articleId)
          if (existingAnalysis) {
            // 获取已有分析结果
            const analysis = db.prepare(`
              SELECT * FROM topic_analysis WHERE source_article_id = ?
            `).get(articleId) as any

            results.push({
              sourceArticle: {
                id: article.id,
                title: article.title,
                reads: article.reads
              },
              analysis: {
                keywords: JSON.parse(analysis.keywords || '[]'),
                sixMonthsData: {
                  articleCount: analysis.article_count,
                  totalReads: analysis.total_reads,
                  avgReads: analysis.avg_reads,
                  maxReads: analysis.max_reads
                },
                recentActivity: {
                  lastMonth: analysis.last_month,
                  thisMonth: analysis.this_month,
                  lastWeek: analysis.last_week,
                  isActive: analysis.last_week > 0
                },
                marketAssessment: {
                  competition: analysis.competition,
                  opportunity: analysis.opportunity,
                  suggestion: analysis.suggestion
                },
                hotArticles: JSON.parse(analysis.hot_articles || '[]')
              }
            })
            continue
          }
        }

        // 提取关键词
        const keywords = extractKeywords(article.title)
        const allArticles: any[] = []

        // 基于关键词搜索相关文章
        for (const keyword of keywords) {
          try {
            const response = await searchWeChatArticles({
              kw: keyword,
              period: 180, // 近6个月
              page: 1
            })

            if (response.data && response.data.length > 0) {
              // 去重并添加到结果中
              response.data.forEach(article => {
                if (!allArticles.find(a => a.title === article.title)) {
                  allArticles.push(article)
                }
              })
            }

            // 延迟避免API限制
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (error) {
            console.error(`搜索关键词 "${keyword}" 失败:`, error)
          }
        }

        // 计算统计数据
        const totalReads = allArticles.reduce((sum, article) => sum + (article.read || 0), 0)
        const avgReads = allArticles.length > 0 ? Math.round(totalReads / allArticles.length) : 0
        const maxReads = allArticles.length > 0 ? Math.max(...allArticles.map(a => a.read || 0)) : 0

        // 计算时间分布
        const now = Date.now()
        const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

        const lastMonth = allArticles.filter(a => a.publish_time * 1000 >= oneMonthAgo).length
        const thisMonth = allArticles.filter(a => a.publish_time * 1000 >= now - 30 * 24 * 60 * 60 * 1000 && a.publish_time * 1000 <= now).length
        const lastWeek = allArticles.filter(a => a.publish_time * 1000 >= oneWeekAgo).length
        const isActive = lastWeek > 0

        // 市场评估
        const marketAssessment = calculateMarketAssessment(allArticles.length, avgReads, {
          thisMonth,
          lastWeek,
          isActive
        })

        // 获取热门文章（按阅读量排序）
        const hotArticles = allArticles
          .sort((a, b) => (b.read || 0) - (a.read || 0))
          .slice(0, 5)
          .map(article => ({
            id: article.id,
            title: article.title,
            reads: article.read,
            publishTime: article.publish_time,
            author: article.wx_name
          }))

        // 保存分析结果
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO topic_analysis (
            source_article_id, keywords, article_count, total_reads, avg_reads, max_reads,
            last_month, this_month, last_week, competition, opportunity, suggestion,
            hot_articles, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        stmt.run(
          articleId,
          JSON.stringify(keywords),
          allArticles.length,
          totalReads,
          avgReads,
          maxReads,
          lastMonth,
          thisMonth,
          lastWeek,
          marketAssessment.competition,
          marketAssessment.opportunity,
          marketAssessment.suggestion,
          JSON.stringify(hotArticles),
          Math.floor(Date.now() / 1000)
        )

        results.push({
          sourceArticle: {
            id: article.id,
            title: article.title,
            reads: article.reads
          },
          analysis: {
            keywords,
            sixMonthsData: {
              articleCount: allArticles.length,
              totalReads,
              avgReads,
              maxReads
            },
            recentActivity: {
              lastMonth,
              thisMonth,
              lastWeek,
              isActive
            },
            marketAssessment,
            hotArticles
          }
        })

      } catch (error) {
        console.error(`分析文章 ${articleId} 失败:`, error)
        continue
      }
    }

    db.close()

    return NextResponse.json({
      success: true,
      message: `成功分析 ${results.length} 篇文章`,
      data: results
    })

  } catch (error) {
    console.error('选题分析失败:', error)
    return NextResponse.json(
      { success: false, message: '选题分析失败，请重试' },
      { status: 500 }
    )
  }
}

// GET - 获取分析历史
export async function GET(request: NextRequest) {
  try {
    initDatabase()
    const db = new Database(dbPath)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sourceArticleId = searchParams.get('sourceArticleId')
    const offset = (page - 1) * limit

    let query = 'SELECT * FROM topic_analysis'
    let countQuery = 'SELECT COUNT(*) as count FROM topic_analysis'
    const params = []

    if (sourceArticleId) {
      query += ' WHERE source_article_id = ?'
      countQuery += ' WHERE source_article_id = ?'
      params.push(sourceArticleId)
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const analyses = db.prepare(query).all(...params) as any[]
    const total = db.prepare(countQuery).get(...params) as { count: number }

    db.close()

    // 解析JSON字段
    const parsedAnalyses = analyses.map(analysis => ({
      ...analysis,
      keywords: analysis.keywords ? JSON.parse(analysis.keywords) : [],
      hotArticles: analysis.hot_articles ? JSON.parse(analysis.hot_articles) : [],
      analysis_data: analysis.analysis_data ? JSON.parse(analysis.analysis_data) : null
    }))

    return NextResponse.json({
      success: true,
      data: parsedAnalyses,
      pagination: {
        page,
        limit,
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    })

  } catch (error) {
    console.error('获取分析历史失败:', error)
    return NextResponse.json(
      { success: false, message: '获取分析历史失败' },
      { status: 500 }
    )
  }
}

// PUT - 更新分析结果
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { success: false, message: '分析ID不能为空' },
        { status: 400 }
      )
    }

    initDatabase()
    const db = new Database(dbPath)

    const updateFields = []
    const updateValues = []

    if (updateData.keywords !== undefined) {
      updateFields.push('keywords = ?')
      updateValues.push(JSON.stringify(updateData.keywords))
    }

    if (updateData.competition !== undefined) {
      updateFields.push('competition = ?')
      updateValues.push(updateData.competition)
    }

    if (updateData.opportunity !== undefined) {
      updateFields.push('opportunity = ?')
      updateValues.push(updateData.opportunity)
    }

    if (updateData.suggestion !== undefined) {
      updateFields.push('suggestion = ?')
      updateValues.push(updateData.suggestion)
    }

    if (updateFields.length === 0) {
      db.close()
      return NextResponse.json(
        { success: false, message: '没有要更新的字段' },
        { status: 400 }
      )
    }

    updateFields.push('updated_at = ?')
    updateValues.push(Math.floor(Date.now() / 1000))
    updateValues.push(id)

    const result = db.prepare(`
      UPDATE topic_analysis
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...updateValues)

    db.close()

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, message: '分析记录不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '更新成功'
    })

  } catch (error) {
    console.error('更新分析结果失败:', error)
    return NextResponse.json(
      { success: false, message: '更新失败，请重试' },
      { status: 500 }
    )
  }
}

// DELETE - 删除分析结果
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: '分析ID不能为空' },
        { status: 400 }
      )
    }

    initDatabase()
    const db = new Database(dbPath)

    const result = db.prepare('DELETE FROM topic_analysis WHERE id = ?').run(parseInt(id))

    db.close()

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, message: '分析记录不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '删除成功'
    })

  } catch (error) {
    console.error('删除分析结果失败:', error)
    return NextResponse.json(
      { success: false, message: '删除失败，请重试' },
      { status: 500 }
    )
  }
}