import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import { join } from 'path'

// 数据库路径
const dbPath = join(process.cwd(), 'content-factory.db')

// 初始化数据库表
function initDatabase() {
  const db = new Database(dbPath)

  // 创建对标账号表
  db.exec(`
    CREATE TABLE IF NOT EXISTS target_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      wxid TEXT,
      ghid TEXT,
      avatar TEXT,
      fans INTEGER DEFAULT 0,
      jzl_index INTEGER DEFAULT 0,
      avg_top_read INTEGER DEFAULT 0,
      avg_top_zan INTEGER DEFAULT 0,
      week_articles INTEGER DEFAULT 0,
      suitability_score INTEGER DEFAULT 0,
      activity_level TEXT DEFAULT 'medium',
      tags TEXT,  -- JSON数组
      collected_at INTEGER DEFAULT (strftime('%s', 'now')),
      last_updated INTEGER DEFAULT (strftime('%s', 'now')),
      is_tracking BOOLEAN DEFAULT 1,
      UNIQUE(name)
    )
  `)

  db.close()
}

// GET - 获取对标账号列表
export async function GET(request: NextRequest) {
  try {
    initDatabase()
    const db = new Database(dbPath)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    const isTracking = searchParams.get('isTracking')

    let whereClause = ''
    const params: any[] = []

    if (isTracking !== null) {
      whereClause = 'WHERE is_tracking = ?'
      params.push(isTracking === 'true' ? 1 : 0)
    }

    const accounts = db.prepare(`
      SELECT * FROM target_accounts
      ${whereClause}
      ORDER BY suitability_score DESC, collected_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[]

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM target_accounts ${whereClause}
    `).get(...params) as { count: number }

    db.close()

    // 解析JSON字段
    const parsedAccounts = accounts.map(account => ({
      ...account,
      tags: account.tags ? JSON.parse(account.tags) : [],
      is_tracking: Boolean(account.is_tracking)
    }))

    return NextResponse.json({
      success: true,
      data: parsedAccounts,
      pagination: {
        page,
        limit,
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    })

  } catch (error) {
    console.error('获取对标账号失败:', error)
    return NextResponse.json(
      { success: false, message: '获取对标账号失败' },
      { status: 500 }
    )
  }
}

// POST - 收藏对标账号
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证必填字段
    if (!body.name) {
      return NextResponse.json(
        { success: false, message: '账号名称不能为空' },
        { status: 400 }
      )
    }

    initDatabase()
    const db = new Database(dbPath)

    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM target_accounts WHERE name = ?').get(body.name)
    if (existing) {
      db.close()
      return NextResponse.json(
        { success: false, message: '该账号已在对标库中' },
        { status: 409 }
      )
    }

    // 插入新记录
    const result = db.prepare(`
      INSERT INTO target_accounts (
        name, wxid, ghid, avatar, fans, jzl_index, avg_top_read,
        avg_top_zan, week_articles, suitability_score, activity_level, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.name,
      body.wxid || null,
      body.ghid || null,
      body.avatar || null,
      body.fans || 0,
      body.jzlIndex || 0,
      body.avgTopRead || 0,
      body.avgTopZan || 0,
      body.weekArticles || 0,
      body.suitabilityScore || 0,
      body.activityLevel || 'medium',
      JSON.stringify(body.tags || [])
    )

    db.close()

    return NextResponse.json({
      success: true,
      message: '账号已成功添加到对标库',
      data: {
        id: result.lastInsertRowid
      }
    })

  } catch (error) {
    console.error('收藏对标账号失败:', error)

    // 处理唯一约束错误
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { success: false, message: '该账号已在对标库中' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, message: '收藏失败，请重试' },
      { status: 500 }
    )
  }
}

// PUT - 更新对标账号
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { success: false, message: '账号ID不能为空' },
        { status: 400 }
      )
    }

    initDatabase()
    const db = new Database(dbPath)

    // 构建更新字段
    const updateFields = ['last_updated = strftime(\'%s\', \'now\')']
    const updateValues = []

    if (updateData.fans !== undefined) {
      updateFields.push('fans = ?')
      updateValues.push(updateData.fans)
    }

    if (updateData.avgTopRead !== undefined) {
      updateFields.push('avg_top_read = ?')
      updateValues.push(updateData.avgTopRead)
    }

    if (updateData.avgTopZan !== undefined) {
      updateFields.push('avg_top_zan = ?')
      updateValues.push(updateData.avgTopZan)
    }

    if (updateData.weekArticles !== undefined) {
      updateFields.push('week_articles = ?')
      updateValues.push(updateData.weekArticles)
    }

    if (updateData.suitabilityScore !== undefined) {
      updateFields.push('suitability_score = ?')
      updateValues.push(updateData.suitabilityScore)
    }

    if (updateData.activityLevel !== undefined) {
      updateFields.push('activity_level = ?')
      updateValues.push(updateData.activityLevel)
    }

    if (updateData.tags !== undefined) {
      updateFields.push('tags = ?')
      updateValues.push(JSON.stringify(updateData.tags))
    }

    if (updateData.isTracking !== undefined) {
      updateFields.push('is_tracking = ?')
      updateValues.push(updateData.isTracking ? 1 : 0)
    }

    if (updateFields.length === 1) { // 只有last_updated
      db.close()
      return NextResponse.json(
        { success: false, message: '没有要更新的字段' },
        { status: 400 }
      )
    }

    updateValues.push(id)

    const result = db.prepare(`
      UPDATE target_accounts
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...updateValues)

    db.close()

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, message: '账号不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '更新成功'
    })

  } catch (error) {
    console.error('更新对标账号失败:', error)
    return NextResponse.json(
      { success: false, message: '更新失败，请重试' },
      { status: 500 }
    )
  }
}

// DELETE - 删除对标账号
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: '账号ID不能为空' },
        { status: 400 }
      )
    }

    initDatabase()
    const db = new Database(dbPath)

    const result = db.prepare('DELETE FROM target_accounts WHERE id = ?').run(parseInt(id))

    db.close()

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, message: '账号不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '删除成功'
    })

  } catch (error) {
    console.error('删除对标账号失败:', error)
    return NextResponse.json(
      { success: false, message: '删除失败，请重试' },
      { status: 500 }
    )
  }
}