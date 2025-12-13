import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import { join } from 'path'

// 数据库路径
const dbPath = join(process.cwd(), 'content-factory.db')

// 初始化数据库表
function initDatabase() {
  const db = new Database(dbPath)

  // 确保创作选题表存在
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

// POST - 同步对标选题到内容创作
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { articleIds, analysisIds } = body

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json(
        { success: false, message: '请提供要同步的文章ID' },
        { status: 400 }
      )
    }

    initDatabase()
    const db = new Database(dbPath)

    const syncedTopics = []

    for (let i = 0; i < articleIds.length; i++) {
      const articleId = articleIds[i]
      const analysisId = analysisIds?.[i]

      try {
        // 获取文章信息
        const article = db.prepare('SELECT id, title, reads, author_name FROM target_articles WHERE id = ?').get(articleId) as any
        if (!article) {
          console.warn(`文章 ${articleId} 不存在，跳过同步`)
          continue
        }

        // 检查是否已经同步过
        const existingTopic = db.prepare('SELECT id FROM creation_topics WHERE source_article_id = ?').get(articleId) as any
        if (existingTopic) {
          // 更新已存在的记录
          db.prepare(`
            UPDATE creation_topics
            SET status = 'pending', created_at = strftime('%s', 'now')
            WHERE source_article_id = ?
          `).run(articleId)

          syncedTopics.push({
            id: existingTopic.id,
            title: article.title,
            action: 'updated'
          })
        } else {
          // 插入新记录
          const result = db.prepare(`
            INSERT INTO creation_topics (title, source_type, source_article_id, analysis_id, status)
            VALUES (?, 'benchmark', ?, ?, 'pending')
          `).run(article.title, articleId, analysisId || null)

          syncedTopics.push({
            id: result.lastInsertRowid,
            title: article.title,
            action: 'created'
          })
        }
      } catch (error) {
        console.error(`同步文章 ${articleId} 失败:`, error)
        continue
      }
    }

    db.close()

    return NextResponse.json({
      success: true,
      message: `成功同步 ${syncedTopics.length} 个选题到内容创作`,
      data: syncedTopics
    })

  } catch (error) {
    console.error('同步选题失败:', error)
    return NextResponse.json(
      { success: false, message: '同步选题失败，请重试' },
      { status: 500 }
    )
  }
}

// GET - 获取创作选题列表
export async function GET(request: NextRequest) {
  try {
    initDatabase()
    const db = new Database(dbPath)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sourceType = searchParams.get('sourceType')
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    let query = `
      SELECT ct.*, ta.title as source_title, ta.reads as source_reads,
             ta.author_name as source_author, ta.content, ta.tags
      FROM creation_topics ct
      LEFT JOIN target_articles ta ON ct.source_article_id = ta.id
      LEFT JOIN topic_analysis tta ON ct.analysis_id = tta.id
    `

    let countQuery = 'SELECT COUNT(*) as count FROM creation_topics ct'

    const params = []
    const countParams = []
    const conditions = []

    if (sourceType) {
      conditions.push('ct.source_type = ?')
      params.push(sourceType)
      countParams.push(sourceType)
    }

    if (status) {
      conditions.push('ct.status = ?')
      params.push(status)
      countParams.push(status)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
      countQuery += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY ct.created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const topics = db.prepare(query).all(...params) as any[]
    const total = db.prepare(countQuery).get(...countParams) as { count: number }

    db.close()

    // 解析JSON字段
    const parsedTopics = topics.map(topic => {
      try {
        return {
          ...topic,
          keywords: topic.tags ? JSON.parse(topic.tags) : []
        }
      } catch (error) {
        console.error('解析JSON失败:', error, topic)
        return {
          ...topic,
          keywords: []
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: parsedTopics,
      pagination: {
        page,
        limit,
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    })

  } catch (error) {
    console.error('获取创作选题失败:', error)
    return NextResponse.json(
      { success: false, message: '获取创作选题失败' },
      { status: 500 }
    )
  }
}

// PUT - 更新选题状态
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: '选题ID和状态不能为空' },
        { status: 400 }
      )
    }

    initDatabase()
    const db = new Database(dbPath)

    const result = db.prepare('UPDATE creation_topics SET status = ? WHERE id = ?').run(status, id)

    db.close()

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, message: '选题不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '状态更新成功'
    })

  } catch (error) {
    console.error('更新选题状态失败:', error)
    return NextResponse.json(
      { success: false, message: '更新状态失败，请重试' },
      { status: 500 }
    )
  }
}

// DELETE - 删除选题
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: '选题ID不能为空' },
        { status: 400 }
      )
    }

    initDatabase()
    const db = new Database(dbPath)

    const result = db.prepare('DELETE FROM creation_topics WHERE id = ?').run(parseInt(id))

    db.close()

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, message: '选题不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '删除成功'
    })

  } catch (error) {
    console.error('删除选题失败:', error)
    return NextResponse.json(
      { success: false, message: '删除失败，请重试' },
      { status: 500 }
    )
  }
}