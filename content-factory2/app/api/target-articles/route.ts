import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import { join } from 'path'

// 数据库路径
const dbPath = join(process.cwd(), 'content-factory.db')

// 初始化数据库表
function initDatabase() {
  const db = new Database(dbPath)

  // 创建对标文章表
  db.exec(`
    CREATE TABLE IF NOT EXISTS target_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      content TEXT,
      html TEXT,
      reads INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      publish_time INTEGER,
      author_name TEXT,
      avatar TEXT,
      reason TEXT,
      key_points TEXT,  -- JSON数组
      tags TEXT,         -- JSON数组
      analysis_data TEXT, -- 分析数据JSON
      collected_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(url)
    )
  `)

  db.close()
}

// GET - 获取对标文章列表
export async function GET(request: NextRequest) {
  try {
    initDatabase()
    const db = new Database(dbPath)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const articles = db.prepare(`
      SELECT * FROM target_articles
      ORDER BY collected_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as any[]

    const total = db.prepare('SELECT COUNT(*) as count FROM target_articles').get() as { count: number }

    db.close()

    // 解析JSON字段
    const parsedArticles = articles.map(article => ({
      ...article,
      key_points: article.key_points ? JSON.parse(article.key_points) : [],
      tags: article.tags ? JSON.parse(article.tags) : [],
      analysis_data: article.analysis_data ? JSON.parse(article.analysis_data) : null
    }))

    return NextResponse.json({
      success: true,
      data: parsedArticles,
      pagination: {
        page,
        limit,
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    })

  } catch (error) {
    console.error('获取对标文章失败:', error)
    return NextResponse.json(
      { success: false, message: '获取对标文章失败' },
      { status: 500 }
    )
  }
}

// POST - 收藏对标文章
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证必填字段
    if (!body.title || !body.url) {
      return NextResponse.json(
        { success: false, message: '标题和链接不能为空' },
        { status: 400 }
      )
    }

    initDatabase()
    const db = new Database(dbPath)

    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM target_articles WHERE url = ?').get(body.url)
    if (existing) {
      db.close()
      return NextResponse.json(
        { success: false, message: '该文章已在对标库中' },
        { status: 409 }
      )
    }

    // 插入新记录
    const result = db.prepare(`
      INSERT INTO target_articles (
        title, url, content, html, reads, likes, publish_time,
        author_name, avatar, reason, key_points, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.title,
      body.url,
      body.content || null,
      body.html || null,
      body.reads || 0,
      body.likes || 0,
      body.publishTime || null,
      body.authorName || null,
      body.avatar || null,
      body.reason || '',
      JSON.stringify(body.keyPoints || []),
      JSON.stringify(body.tags || [])
    )

    db.close()

    return NextResponse.json({
      success: true,
      message: '文章已成功添加到对标库',
      data: {
        id: result.lastInsertRowid
      }
    })

  } catch (error) {
    console.error('收藏对标文章失败:', error)

    // 处理唯一约束错误
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { success: false, message: '该文章已在对标库中' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, message: '收藏失败，请重试' },
      { status: 500 }
    )
  }
}

// PUT - 更新对标文章
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { success: false, message: '文章ID不能为空' },
        { status: 400 }
      )
    }

    initDatabase()
    const db = new Database(dbPath)

    // 构建更新字段
    const updateFields = []
    const updateValues = []

    if (updateData.reason !== undefined) {
      updateFields.push('reason = ?')
      updateValues.push(updateData.reason)
    }

    if (updateData.keyPoints !== undefined) {
      updateFields.push('key_points = ?')
      updateValues.push(JSON.stringify(updateData.keyPoints))
    }

    if (updateData.tags !== undefined) {
      updateFields.push('tags = ?')
      updateValues.push(JSON.stringify(updateData.tags))
    }

    if (updateData.analysisData !== undefined) {
      updateFields.push('analysis_data = ?')
      updateValues.push(JSON.stringify(updateData.analysisData))
    }

    if (updateFields.length === 0) {
      db.close()
      return NextResponse.json(
        { success: false, message: '没有要更新的字段' },
        { status: 400 }
      )
    }

    updateValues.push(id)

    const result = db.prepare(`
      UPDATE target_articles
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...updateValues)

    db.close()

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, message: '文章不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '更新成功'
    })

  } catch (error) {
    console.error('更新对标文章失败:', error)
    return NextResponse.json(
      { success: false, message: '更新失败，请重试' },
      { status: 500 }
    )
  }
}

// DELETE - 删除对标文章
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: '文章ID不能为空' },
        { status: 400 }
      )
    }

    initDatabase()
    const db = new Database(dbPath)

    const result = db.prepare('DELETE FROM target_articles WHERE id = ?').run(parseInt(id))

    db.close()

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, message: '文章不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '删除成功'
    })

  } catch (error) {
    console.error('删除对标文章失败:', error)
    return NextResponse.json(
      { success: false, message: '删除失败，请重试' },
      { status: 500 }
    )
  }
}