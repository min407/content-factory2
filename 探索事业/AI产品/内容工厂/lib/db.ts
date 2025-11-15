import Database from 'better-sqlite3'
import path from 'path'

// 获取数据库路径
const DB_PATH = path.join(process.cwd(), 'data', 'app.db')

// 初始化数据库连接
let db: Database.Database | null = null

export function getDb() {
  if (!db) {
    // 确保数据目录存在
    const fs = require('fs')
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')

    // 初始化表结构
    initTables()
  }
  return db
}

// 初始化数据库表
function initTables() {
  if (!db) return

  // 创建搜索历史表
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      platform TEXT NOT NULL CHECK(platform IN ('wechat', 'xiaohongshu')),
      timestamp INTEGER NOT NULL,
      result_count INTEGER DEFAULT 0,
      articles_data TEXT,
      api_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 创建索引以提高查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_search_history_timestamp
    ON search_history(timestamp DESC)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_search_history_platform
    ON search_history(platform)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_search_history_keyword
    ON search_history(keyword)
  `)

  console.log('✅ 数据库表初始化完成')
}

// 关闭数据库连接
export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}
